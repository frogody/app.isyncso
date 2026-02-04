/**
 * GoogleSheetsNode - Read/write Google Sheets (Composio)
 * Glass morphism card with Sheets green accent
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table, Plus, Search, Edit3 } from 'lucide-react';

const ACTION_LABELS = {
  add_row: 'Add Row',
  get_values: 'Read Data',
  update_cell: 'Update Cell',
  search: 'Search',
};

const ACTION_ICONS = {
  add_row: Plus,
  get_values: Search,
  update_cell: Edit3,
  search: Search,
};

function GoogleSheetsNode({ data, selected }) {
  const action = data?.action || 'add_row';
  const ActionIcon = ACTION_ICONS[action] || Table;
  const isConfigured = !!data?.action && !!data?.spreadsheet_id;

  return (
    <div
      className={`
        relative w-[260px] rounded-2xl transition-all duration-200
        bg-zinc-900/80 backdrop-blur-xl
        ${selected
          ? 'border border-[#0F9D58]/50 shadow-[0_0_24px_rgba(15,157,88,0.12)] ring-1 ring-[#0F9D58]/20'
          : 'border border-white/[0.08] hover:border-white/[0.15]'
        }
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#0F9D58] !border-[1.5px] !border-zinc-900"
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-[#0F9D58]/15 flex items-center justify-center">
          <Table className="w-4 h-4 text-[#0F9D58]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-white tracking-tight">Google Sheets</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
      </div>

      {/* Divider */}
      <div className="border-b border-white/[0.06]" />

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">Read or write spreadsheet data</p>

        {isConfigured ? (
          <>
            {data?.name && (
              <p className="text-xs font-medium text-white/90 truncate">{data.name}</p>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0F9D58]/15 text-green-300 font-medium flex items-center gap-1">
                <ActionIcon className="w-3 h-3" />
                {ACTION_LABELS[action] || action}
              </span>
              {data?.sheet_name && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 font-medium truncate max-w-[100px]">
                  {data.sheet_name}
                </span>
              )}
            </div>
            {data?.range && (
              <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">{data.range}</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2.5 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02]">
            <p className="text-[11px] text-zinc-400 font-medium">Configure Sheets</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Add rows, read, or update cells</p>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#0F9D58] !border-[1.5px] !border-zinc-900"
      />
    </div>
  );
}

export default memo(GoogleSheetsNode);
