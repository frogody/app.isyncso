import React from 'react';
import { motion } from 'framer-motion';
import {
  UserCircle, FileText, Users, Package, ListTodo,
  Building2, DollarSign, Briefcase, Star, Calendar, Clock,
  ExternalLink
} from 'lucide-react';

const ENTITY_CONFIG = {
  prospect: {
    icon: UserCircle,
    borderColor: 'border-l-cyan-400',
    label: 'Prospect',
  },
  invoice: {
    icon: FileText,
    borderColor: 'border-l-blue-400',
    label: 'Invoice',
  },
  candidate: {
    icon: Users,
    borderColor: 'border-l-purple-400',
    label: 'Candidate',
  },
  product: {
    icon: Package,
    borderColor: 'border-l-amber-400',
    label: 'Product',
  },
  task: {
    icon: ListTodo,
    borderColor: 'border-l-green-400',
    label: 'Task',
  },
};

const STATUS_COLORS = {
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  sent: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  qualified: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function StatusBadge({ status }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.draft;
  return (
    <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors}`}>
      {status}
    </span>
  );
}

function ProspectCard({ data }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{data.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {data.company && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Building2 className="w-3 h-3" />
              {data.company}
            </span>
          )}
          {data.pipeline_stage && <StatusBadge status={data.pipeline_stage} />}
        </div>
        {data.last_contact && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
            <Clock className="w-2.5 h-2.5" />
            Last contact: {new Date(data.last_contact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

function InvoiceCard({ data }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{data.number || `INV-${data.id?.slice(0, 6)}`}</p>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {data.client && (
            <span className="text-xs text-zinc-400 truncate">{data.client}</span>
          )}
          {data.amount != null && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-white">
              <DollarSign className="w-3 h-3 text-zinc-500" />
              {typeof data.amount === 'number' ? data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : data.amount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ data }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{data.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {data.title && (
            <span className="text-xs text-zinc-400 truncate">{data.title}</span>
          )}
          {data.company && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Building2 className="w-2.5 h-2.5" />
              {data.company}
            </span>
          )}
        </div>
        {data.match_score != null && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">{data.match_score}% match</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ data }) {
  return (
    <div className="flex items-center gap-3">
      {data.image && (
        <img
          src={data.image}
          alt={data.name}
          className="w-10 h-10 rounded-lg object-cover border border-zinc-700/50 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{data.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {data.price != null && (
            <span className="text-xs font-medium text-zinc-300">
              ${typeof data.price === 'number' ? data.price.toFixed(2) : data.price}
            </span>
          )}
          {data.stock != null && (
            <span className={`text-xs ${data.stock <= 0 ? 'text-red-400' : data.stock < 10 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {data.stock} in stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ data }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{data.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {data.assignee && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Briefcase className="w-2.5 h-2.5" />
              {data.assignee}
            </span>
          )}
          {data.priority && <StatusBadge status={data.priority} />}
          {data.due_date && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const CARD_RENDERERS = {
  prospect: ProspectCard,
  invoice: InvoiceCard,
  candidate: CandidateCard,
  product: ProductCard,
  task: TaskCard,
};

export default function EntityCard({ entityType, entityId, entityData }) {
  const config = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.task;
  const Icon = config.icon;
  const CardContent = CARD_RENDERERS[entityType] || TaskCard;

  const handleClick = () => {
    const routes = {
      prospect: `/prospects?id=${entityId}`,
      invoice: `/invoices?id=${entityId}`,
      candidate: `/talentcandidateprofile?id=${entityId}`,
      product: `/productdetail?id=${entityId}`,
      task: `/tasks?id=${entityId}`,
    };
    const url = routes[entityType];
    if (url) window.open(url, '_blank');
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={handleClick}
      className={`rounded-xl bg-zinc-800/60 border border-zinc-700/50 border-l-2 ${config.borderColor} p-3 max-w-sm cursor-pointer hover:bg-zinc-800/80 transition-colors group`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{config.label}</span>
        <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <CardContent data={entityData || {}} />
    </motion.div>
  );
}
