/**
 * AdminAuditLogs Page
 * View and filter platform audit logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import {
  ScrollText,
  Search,
  RefreshCw,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACTION_COLORS = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  insert: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  login: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  logout: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  enabled: 'bg-green-500/20 text-green-400 border-green-500/30',
  disabled: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  default: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const RESOURCE_TYPES = [
  { value: 'all', label: 'All Resources' },
  { value: 'platform_settings', label: 'Settings' },
  { value: 'feature_flags', label: 'Feature Flags' },
  { value: 'platform_admins', label: 'Platform Admins' },
  { value: 'users', label: 'Users' },
  { value: 'companies', label: 'Organizations' },
];

const PAGE_SIZE = 25;

function getActionColor(action) {
  const lowerAction = action.toLowerCase();
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (lowerAction.includes(key)) return value;
  }
  return ACTION_COLORS.default;
}

function LogRow({ log, onViewDetails }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors h-9"
    >
      <td className="px-2 py-1.5">
        <span className="text-xs text-zinc-400">
          {new Date(log.created_at).toLocaleString()}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-zinc-500" />
          <span className="text-xs text-white">
            {log.admin_email || log.admin_id?.slice(0, 8) || 'System'}
          </span>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <Badge className={cn('text-[10px] px-1.5 py-px', getActionColor(log.action))}>
          {log.action.replace(/_/g, ' ')}
        </Badge>
      </td>
      <td className="px-2 py-1.5">
        <span className="text-xs text-zinc-400">
          {log.resource_type?.replace(/_/g, ' ') || '-'}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <span className="text-xs text-zinc-500 font-mono">
          {log.resource_id?.slice(0, 8) || '-'}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(log)}
          className="text-zinc-400 hover:text-white h-6 w-6 p-0"
        >
          <Eye className="w-3 h-3" />
        </Button>
      </td>
    </motion.tr>
  );
}

function LogDetailsModal({ log, isOpen, onClose }) {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent compact className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader compact>
          <DialogTitle compact className="text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-red-400" />
            Audit Log Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Timestamp</label>
              <p className="text-white text-xs">{new Date(log.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Admin</label>
              <p className="text-white text-xs">{log.admin_email || log.admin_id || 'System'}</p>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Action</label>
              <Badge className={cn('mt-0.5 text-[10px] px-1.5 py-px', getActionColor(log.action))}>
                {log.action.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Resource Type</label>
              <p className="text-white text-xs">{log.resource_type?.replace(/_/g, ' ') || '-'}</p>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">Resource ID</label>
              <p className="text-white font-mono text-xs">{log.resource_id || '-'}</p>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase">IP Address</label>
              <p className="text-white font-mono text-xs">{log.ip_address || '-'}</p>
            </div>
          </div>

          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">Details</label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-auto max-h-48">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}

          {log.previous_value && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">Previous Value</label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-red-400/70 overflow-auto max-h-32">
                {JSON.stringify(log.previous_value, null, 2)}
              </pre>
            </div>
          )}

          {log.new_value && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">New Value</label>
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-green-400/70 overflow-auto max-h-32">
                {JSON.stringify(log.new_value, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      if (searchQuery) {
        query = query.or(
          `action.ilike.%${searchQuery}%,admin_email.ilike.%${searchQuery}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('[AdminAuditLogs] Error fetching logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, resourceFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const csv = [
        ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'Details'],
        ...(data || []).map((log) => [
          new Date(log.created_at).toISOString(),
          log.admin_email || log.admin_id || 'System',
          log.action,
          log.resource_type || '',
          log.resource_id || '',
          JSON.stringify(log.details || {}),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Audit logs exported');
    } catch (error) {
      console.error('[AdminAuditLogs] Export error:', error);
      toast.error('Failed to export logs');
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-red-400" />
              Audit Logs
            </h1>
            <p className="text-zinc-400 text-xs mt-0.5">
              Track all administrative actions on the platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchLogs}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 h-7 text-xs"
            >
              <RefreshCw className={cn('w-3 h-3 mr-1.5', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-300 h-7 text-xs"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by action or admin..."
                className="pl-8 bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
              />
            </div>
            <Select
              value={resourceFilter}
              onValueChange={(value) => {
                setResourceFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px] bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                <Filter className="w-3 h-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-white hover:bg-zinc-800 text-xs"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  Timestamp
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  Admin
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  Action
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  Resource
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  ID
                </th>
                <th className="px-2 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center">
                    <RefreshCw className="w-4 h-4 text-zinc-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-zinc-500 text-xs">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onViewDetails={setSelectedLog}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">
              Showing {page * PAGE_SIZE + 1} -{' '}
              {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-zinc-700 text-zinc-300 h-6 w-6 p-0"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs text-zinc-400 px-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="border-zinc-700 text-zinc-300 h-6 w-6 p-0"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
