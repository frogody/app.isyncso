/**
 * QuickRunModal - Modal to quickly run a flow on a prospect
 * Supports both database prospects and Google Sheets triggered flows
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Building2,
  Mail,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Table2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/context/UserContext';
import { useToast } from '@/components/ui/use-toast';
import { getProspectsForRun } from '@/services/flowService';
import { startFlowExecution, startFlowExecutionFromSheet } from '@/services/flowExecutionEngine';
import { supabase, functions } from '@/api/supabaseClient';

// Prospect item component
function ProspectItem({ prospect, selected, onSelect }) {
  const displayName = prospect.full_name || prospect.name || prospect.email || 'Unknown';
  const displayCompany = prospect.company_name || prospect.company || '';

  return (
    <button
      onClick={() => onSelect(prospect)}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
        ${selected
          ? 'bg-cyan-500/20 border-cyan-500/50 border'
          : 'bg-zinc-800/50 border-transparent border hover:bg-zinc-800'
        }
      `}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${selected ? 'bg-cyan-500/30' : 'bg-zinc-700'}
      `}>
        <User className={`w-5 h-5 ${selected ? 'text-cyan-400' : 'text-zinc-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-white' : 'text-zinc-200'}`}>
          {displayName}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {displayCompany && (
            <span className="flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3" />
              {displayCompany}
            </span>
          )}
          {prospect.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />
              {prospect.email}
            </span>
          )}
        </div>
      </div>
      {selected && (
        <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
      )}
    </button>
  );
}

export default function QuickRunModal({ open, onOpenChange, flow, onSuccess }) {
  const { user } = useUser();
  const { toast } = useToast();

  // State
  const [search, setSearch] = useState('');
  const [prospects, setProspects] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  // Detect if flow has a Google Sheets trigger node
  const googleSheetsNode = useMemo(() => {
    if (!flow?.nodes) return null;
    // Find the first Google Sheets node with 'get_values' action
    return flow.nodes.find(node =>
      (node.type === 'googleSheets' || node.type === 'google_sheets') &&
      node.data?.action === 'get_values' &&
      node.data?.spreadsheet_id
    );
  }, [flow?.nodes]);

  const isGoogleSheetsTriggered = !!googleSheetsNode;

  // Fetch Google Sheets data for preview
  const fetchSheetData = useCallback(async () => {
    if (!googleSheetsNode || !user?.id) return;

    setSheetLoading(true);
    setSheetError(null);
    setSheetData(null);

    try {
      // Get user's Google Sheets connection
      const { data: connection, error: connError } = await supabase
        .from('user_integrations')
        .select('composio_connected_account_id')
        .eq('user_id', user.id)
        .eq('toolkit_slug', 'googlesheets')
        .ilike('status', 'active')
        .single();

      if (connError || !connection?.composio_connected_account_id) {
        setSheetError('No Google Sheets connection found. Connect Google Sheets in Settings > Integrations.');
        return;
      }

      // Fetch sheet values via Composio
      // Note: functions.invoke serializes the entire params object as the body,
      // so pass the payload directly (not wrapped in { body: ... })
      // Build the A1-notation range, prepending sheet name if provided
      const baseRange = googleSheetsNode.data.range || 'A1:Z100';
      const sheetName = googleSheetsNode.data.sheet_name;
      const fullRange = sheetName ? `${sheetName}!${baseRange}` : baseRange;

      const { data: result, error: fetchError } = await functions.invoke('composio-connect', {
        action: 'executeTool',
        toolSlug: 'GOOGLESHEETS_BATCH_GET',
        connectedAccountId: connection.composio_connected_account_id,
        arguments: {
          spreadsheet_id: googleSheetsNode.data.spreadsheet_id,
          ranges: [fullRange]
        }
      });

      // Debug: Log the full response to understand the structure
      console.log('[QuickRunModal] Composio response:', JSON.stringify(result, null, 2));
      console.log('[QuickRunModal] Fetch error:', fetchError);

      if (fetchError) {
        const msg = typeof fetchError === 'string' ? fetchError
          : typeof fetchError.message === 'string' ? fetchError.message
          : typeof fetchError.error === 'string' ? fetchError.error
          : JSON.stringify(fetchError);
        throw new Error(msg || 'Failed to fetch sheet data');
      }

      // Check if the Composio tool execution itself failed (e.g. auth scope issues)
      if (result?.data?.successful === false || result?.successful === false) {
        const errData = result?.data?.data || result?.data;
        const errMsg = typeof errData?.message === 'string' ? errData.message
          : typeof errData === 'string' ? errData
          : 'Composio tool execution failed';
        throw new Error(errMsg);
      }

      // Parse the sheet data - v3 BATCH_GET returns:
      // { success, data: { successful, data: { spreadsheet_data: { valueRanges: [{ values }] } }, executionTime } }
      const valueRanges = result?.data?.data?.spreadsheet_data?.valueRanges
        || result?.data?.spreadsheet_data?.valueRanges
        || [];
      const values = valueRanges[0]?.values
        || result?.data?.data?.values
        || result?.data?.values
        || result?.values
        || [];
      if (values.length > 0) {
        const headers = values[0];
        const rows = values.slice(1).map((row, index) => {
          const obj = { _row_index: index + 2 }; // +2 because index 0 is header, and sheets are 1-indexed
          headers.forEach((header, colIndex) => {
            obj[header.toLowerCase().replace(/\s+/g, '_')] = row[colIndex] || '';
          });
          return obj;
        });
        setSheetData({ headers, rows, totalRows: rows.length });
      } else {
        setSheetError('No data found in the spreadsheet');
      }
    } catch (error) {
      console.error('Failed to fetch sheet data:', error);
      const errMsg = typeof error?.message === 'string' ? error.message
        : typeof error === 'string' ? error
        : 'Failed to load spreadsheet data';
      setSheetError(errMsg);
    } finally {
      setSheetLoading(false);
    }
  }, [googleSheetsNode, user?.id]);

  // Search prospects (for non-Google Sheets flows)
  const searchProspects = useCallback(async (searchTerm = '') => {
    if (isGoogleSheetsTriggered) return; // Skip for Google Sheets flows

    setLoading(true);
    try {
      const workspaceId = user?.company_id || user?.organization_id;
      const result = await getProspectsForRun(workspaceId, searchTerm, 20);

      if (result.success) {
        setProspects(result.prospects || []);
      } else {
        console.error('Failed to load prospects:', result.error);
      }
    } catch (error) {
      console.error('Failed to search prospects:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isGoogleSheetsTriggered]);

  // Load data on open
  useEffect(() => {
    if (open) {
      setSelectedProspect(null);
      setSearch('');
      setSheetData(null);
      setSheetError(null);

      if (isGoogleSheetsTriggered) {
        fetchSheetData();
      } else {
        searchProspects();
      }
    }
  }, [open, isGoogleSheetsTriggered, fetchSheetData, searchProspects]);

  // Debounced search (only for non-Google Sheets flows)
  useEffect(() => {
    if (isGoogleSheetsTriggered) return;

    const timer = setTimeout(() => {
      if (open) {
        searchProspects(search);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, searchProspects, isGoogleSheetsTriggered]);

  // Run flow - handles both regular prospects and Google Sheets triggered flows
  const handleRunFlow = async () => {
    if (!flow) return;

    // For Google Sheets flows, we don't need a selected prospect
    if (isGoogleSheetsTriggered) {
      if (!sheetData?.rows?.length) {
        toast({
          title: 'Error',
          description: 'No data available from the spreadsheet',
          variant: 'destructive'
        });
        return;
      }
    } else if (!selectedProspect) {
      return;
    }

    setRunning(true);
    try {
      const workspaceId = user?.company_id || user?.organization_id;

      if (isGoogleSheetsTriggered) {
        // For Google Sheets flows, create execution with sheet data context
        const { data: execData, error: execError } = await supabase
          .from('flow_executions')
          .insert({
            flow_id: flow.id,
            prospect_id: null, // No specific prospect - using sheet data
            workspace_id: workspaceId,
            started_by: user?.id,
            status: 'pending',
            current_node_id: googleSheetsNode?.id,
            execution_context: {
              source: 'google_sheets',
              spreadsheet_id: googleSheetsNode.data.spreadsheet_id,
              sheet_name: googleSheetsNode.data.sheet_name,
              range: googleSheetsNode.data.range,
              rows_to_process: sheetData.rows.length,
              sheet_headers: sheetData.headers,
              sheet_data: sheetData.rows
            }
          })
          .select()
          .single();

        if (execError) throw execError;

        // Start flow execution with sheet data
        // The flow execution engine will process each row
        const result = await startFlowExecutionFromSheet(
          flow.id,
          execData.id,
          sheetData.rows,
          sheetData.headers,
          workspaceId,
          user?.id
        );

        if (result.success) {
          toast({
            title: 'Flow Started',
            description: `Running "${flow.name}" on ${sheetData.rows.length} row(s) from Google Sheets`
          });
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error(result.error || 'Failed to start flow');
        }
      } else {
        // Standard prospect-based flow
        const { error: execError } = await supabase
          .from('flow_executions')
          .insert({
            flow_id: flow.id,
            prospect_id: selectedProspect.id,
            workspace_id: workspaceId,
            started_by: user?.id,
            status: 'pending',
            current_node_id: null,
            execution_context: {
              prospect: {
                id: selectedProspect.id,
                name: selectedProspect.full_name || selectedProspect.name,
                email: selectedProspect.email,
                company: selectedProspect.company_name || selectedProspect.company
              }
            }
          })
          .select()
          .single();

        if (execError) throw execError;

        // Start execution
        const result = await startFlowExecution(
          flow.id,
          selectedProspect.id,
          workspaceId,
          user?.id
        );

        if (result.success) {
          toast({
            title: 'Flow Started',
            description: `Running "${flow.name}" for ${selectedProspect.full_name || selectedProspect.name || 'prospect'}`
          });
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error(result.error || 'Failed to start flow');
        }
      }
    } catch (error) {
      console.error('Failed to run flow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start flow execution',
        variant: 'destructive'
      });
    } finally {
      setRunning(false);
    }
  };

  // Determine if Run button should be enabled
  const canRun = isGoogleSheetsTriggered
    ? !sheetLoading && !sheetError && sheetData?.rows?.length > 0
    : !!selectedProspect;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isGoogleSheetsTriggered ? (
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
            ) : (
              <Play className="w-5 h-5 text-cyan-400" />
            )}
            Quick Run: {flow?.name || 'Flow'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isGoogleSheetsTriggered
              ? 'Run this flow using data from Google Sheets'
              : 'Select a prospect to run this flow on'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isGoogleSheetsTriggered ? (
            /* Google Sheets Data View */
            <>
              {/* Sheet Info */}
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-300">
                  <Table2 className="w-4 h-4" />
                  <span className="text-sm">
                    Data source: <strong>Google Sheets</strong>
                  </span>
                </div>
                {googleSheetsNode?.data?.spreadsheet_id && (
                  <p className="text-xs text-zinc-400 mt-1 truncate">
                    Sheet ID: {googleSheetsNode.data.spreadsheet_id}
                  </p>
                )}
              </div>

              {/* Sheet Data Preview */}
              <div className="max-h-64 overflow-y-auto">
                {sheetLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                    <span className="ml-2 text-sm text-zinc-400">Loading spreadsheet data...</span>
                  </div>
                ) : sheetError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                    <p className="text-sm text-red-400">{sheetError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchSheetData}
                      className="mt-2 text-zinc-400 hover:text-white"
                    >
                      Retry
                    </Button>
                  </div>
                ) : sheetData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>Preview ({Math.min(5, sheetData.rows.length)} of {sheetData.rows.length} rows)</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-zinc-700">
                      <table className="w-full text-xs">
                        <thead className="bg-zinc-800">
                          <tr>
                            {sheetData.headers.slice(0, 4).map((header, idx) => (
                              <th key={idx} className="px-3 py-2 text-left text-zinc-300 font-medium">
                                {header}
                              </th>
                            ))}
                            {sheetData.headers.length > 4 && (
                              <th className="px-3 py-2 text-zinc-500">+{sheetData.headers.length - 4}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetData.rows.slice(0, 5).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t border-zinc-800">
                              {sheetData.headers.slice(0, 4).map((header, colIdx) => (
                                <td key={colIdx} className="px-3 py-2 text-zinc-400 truncate max-w-[120px]">
                                  {row[header.toLowerCase().replace(/\s+/g, '_')] || '-'}
                                </td>
                              ))}
                              {sheetData.headers.length > 4 && (
                                <td className="px-3 py-2 text-zinc-600">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Ready to run info */}
              {sheetData?.rows?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300">
                      Ready to process <strong>{sheetData.rows.length} row(s)</strong> from the spreadsheet
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            /* Standard Prospect Selection View */
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search prospects by name, company, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 focus:border-cyan-500"
                />
              </div>

              {/* Prospect List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : prospects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-400">
                      {search ? 'No prospects found matching your search' : 'No prospects available'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {prospects.map((prospect) => (
                      <motion.div
                        key={prospect.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ProspectItem
                          prospect={prospect}
                          selected={selectedProspect?.id === prospect.id}
                          onSelect={setSelectedProspect}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Selected Info */}
              {selectedProspect && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-cyan-300">
                        Ready to run on: <strong>{selectedProspect.full_name || selectedProspect.name}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedProspect(null)}
                      className="p-1 hover:bg-zinc-800 rounded"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRunFlow}
            disabled={!canRun || running}
            className={isGoogleSheetsTriggered
              ? "bg-green-500 hover:bg-green-600 text-black"
              : "bg-cyan-500 hover:bg-cyan-600 text-black"
            }
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {isGoogleSheetsTriggered
                  ? `Run on ${sheetData?.rows?.length || 0} Row(s)`
                  : 'Run Flow'
                }
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
