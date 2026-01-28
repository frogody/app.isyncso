import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Milestone,
  Receipt,
  File,
  Calendar,
} from 'lucide-react';

const typeIcons = {
  deliverable: FileText,
  milestone: Milestone,
  invoice: Receipt,
  document: File,
  design: FileText,
  content: FileText,
};

const statusConfig = {
  pending: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: Clock,
    label: 'Pending',
  },
  approved: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle2,
    label: 'Approved',
  },
  rejected: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: XCircle,
    label: 'Rejected',
  },
  revision_requested: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    icon: AlertCircle,
    label: 'Revision Requested',
  },
  cancelled: {
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20',
    icon: XCircle,
    label: 'Cancelled',
  },
};

export default function ApprovalCard({ approval, projectId, showProject = false }) {
  const TypeIcon = typeIcons[approval.approval_type] || FileText;
  const status = statusConfig[approval.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const isPending = approval.status === 'pending';
  const isOverdue = isPending && approval.due_date && new Date(approval.due_date) < new Date();

  return (
    <Link
      to={`/portal/project/${projectId}?tab=approvals&approval=${approval.id}`}
      className={`block p-4 bg-zinc-900/50 border rounded-xl hover:bg-zinc-900 transition-colors ${
        isPending ? 'border-amber-500/30' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg ${status.bgColor} flex items-center justify-center shrink-0`}>
          <TypeIcon className={`w-5 h-5 ${status.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-white line-clamp-1">{approval.title}</h4>
              {showProject && approval.project?.name && (
                <p className="text-sm text-zinc-500 mt-0.5">{approval.project.name}</p>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${status.bgColor} ${status.color} ${status.borderColor}`}>
              {status.label}
            </span>
          </div>

          {approval.description && (
            <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{approval.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            {/* Type */}
            <span className="text-xs text-zinc-500 capitalize">
              {approval.approval_type}
            </span>

            {/* Due Date */}
            {approval.due_date && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
                <Calendar className="w-3 h-3" />
                {isOverdue ? 'Overdue: ' : 'Due: '}
                {new Date(approval.due_date).toLocaleDateString()}
              </span>
            )}

            {/* Revision count */}
            {approval.revision_count > 0 && (
              <span className="text-xs text-purple-400">
                {approval.revision_count} revision{approval.revision_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
