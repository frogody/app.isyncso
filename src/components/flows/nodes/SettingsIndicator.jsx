/**
 * SettingsIndicator - Gear icon shown on flow nodes to indicate configurability
 * Rendered in each node's header row
 */

import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsIndicator() {
  return (
    <div
      className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center cursor-pointer transition-colors"
      title="Click to configure"
    >
      <Settings className="w-3 h-3 text-zinc-400" />
    </div>
  );
}
