import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, FileText, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', label: 'Pending', icon: Clock },
  approved: { color: '#10b981', label: 'Approved', icon: CheckCircle2 },
  rejected: { color: '#ef4444', label: 'Rejected', icon: XCircle },
};

export default function ClientApprovals() {
  const { client, getAccessibleProjects } = usePortalClientContext();
  const settings = usePortalSettings();
  const { org: orgSlug } = useParams();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

  useEffect(() => {
    const fetchApprovals = async () => {
      if (!client) return;
      try {
        const projects = await getAccessibleProjects();
        const projectIds = projects.map((p) => p.id);
        if (projectIds.length === 0) {
          setApprovals([]);
          setLoading(false);
          return;
        }
        const { data } = await supabase
          .from('portal_approvals')
          .select('*, project:projects(id, title)')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });
        setApprovals(data || []);
      } catch (err) {
        console.error('Error fetching approvals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, [client, getAccessibleProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.primary_color }} />
          <p className="text-zinc-500 text-sm">Loading approvals...</p>
        </div>
      </div>
    );
  }

  const filtered = filter === 'all' ? approvals : approvals.filter((a) => a.status === filter);

  const counts = {
    all: approvals.length,
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link to={basePath} className="hover:text-zinc-300 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-300">Approvals</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Approvals</h1>
        <p className="text-zinc-400 mt-2">Review and manage approval requests across your projects.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-zinc-800/60 rounded-xl mb-8 w-fit">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === opt.value
                ? 'bg-white/[0.08] text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {opt.label}
            <span className="ml-1.5 text-xs text-zinc-600">{counts[opt.value]}</span>
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-white font-medium">No approvals found</p>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs">
            {filter !== 'all'
              ? `No ${filter} approvals at the moment.`
              : 'Approval requests will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ approval, basePath }) {
  const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Link
      to={`${basePath}/project/${approval.project_id}?tab=approvals&approval=${approval.id}`}
      className="group flex items-center gap-4 p-5 bg-white/[0.02] hover:bg-white/[0.05] border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl transition-all"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h3 className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
            {approval.title}
          </h3>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full shrink-0"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {approval.project?.title && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {approval.project.title}
            </span>
          )}
          <span className="text-xs text-zinc-600">
            {new Date(approval.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
    </Link>
  );
}
