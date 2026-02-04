/**
 * QuickRunModal - Modal to quickly run a flow on a prospect
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  X
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
import { startFlowExecution } from '@/services/flowExecutionEngine';
import { supabase } from '@/api/supabaseClient';

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

  // Search prospects
  const searchProspects = useCallback(async (searchTerm = '') => {
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
  }, [user]);

  // Load prospects on open
  useEffect(() => {
    if (open) {
      searchProspects();
      setSelectedProspect(null);
      setSearch('');
    }
  }, [open, searchProspects]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        searchProspects(search);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open, searchProspects]);

  // Run flow
  const handleRunFlow = async () => {
    if (!selectedProspect || !flow) return;

    setRunning(true);
    try {
      // Create execution record
      const { error: execError } = await supabase
        .from('flow_executions')
        .insert({
          flow_id: flow.id,
          prospect_id: selectedProspect.id,
          workspace_id: user?.company_id || user?.organization_id,
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
        user?.company_id || user?.organization_id,
        user?.id
      );

      if (result.success) {
        toast({
          title: 'Flow Started',
          description: `Running "${flow.name}" for ${selectedProspect.full_name || selectedProspect.name || 'prospect'}`
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Failed to start flow');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-cyan-400" />
            Quick Run: {flow?.name || 'Flow'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Select a prospect to run this flow on
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            disabled={!selectedProspect || running}
            className="bg-cyan-500 hover:bg-cyan-600 text-black"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Flow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
