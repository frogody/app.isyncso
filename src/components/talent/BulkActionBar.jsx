import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Send, FolderPlus, Download, Trash2, Brain, Loader2 } from "lucide-react";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

const BulkActionButton = ({ icon: Icon, label, onClick, variant = "default", disabled = false, loading = false }) => {
  const variants = {
    default: "hover:bg-zinc-700 text-zinc-300 hover:text-white",
    cyan: "hover:bg-red-500/20 text-red-400",
    danger: "hover:bg-red-500/20 text-red-400",
    primary: "hover:bg-red-500/20 text-red-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span className="text-sm whitespace-nowrap">{label}</span>
    </button>
  );
};

export default function BulkActionBar({
  selectedCount,
  onClear,
  onAddToCampaign,
  onGenerateOutreach,
  onRunIntel,
  onExport,
  onRemove,
  context = "candidates", // "candidates" | "campaign_matches" | "nest_candidates"
  loading = {},
}) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 backdrop-blur-sm">
            {/* Selection count */}
            <div className="flex items-center gap-2 pr-3 border-r border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-white font-medium">{selectedCount} selected</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Add to Campaign - Available in candidates and nest views */}
              {(context === "candidates" || context === "nest_candidates") && onAddToCampaign && (
                <BulkActionButton
                  icon={FolderPlus}
                  label="Add to Campaign"
                  onClick={onAddToCampaign}
                  loading={loading.addToCampaign}
                />
              )}

              {/* Generate Outreach - Available in campaign context */}
              {onGenerateOutreach && (
                <BulkActionButton
                  icon={Send}
                  label={<>Generate Outreach <CreditCostBadge credits={1} /></>}
                  onClick={onGenerateOutreach}
                  variant="primary"
                  loading={loading.generateOutreach}
                />
              )}

              {/* Run Intel - Available when candidates can be analyzed */}
              {onRunIntel && (
                <BulkActionButton
                  icon={Brain}
                  label="Run Intel"
                  onClick={onRunIntel}
                  variant="cyan"
                  loading={loading.runIntel}
                />
              )}

              {/* Export */}
              {onExport && (
                <BulkActionButton
                  icon={Download}
                  label="Export"
                  onClick={onExport}
                  loading={loading.export}
                />
              )}

              {/* Remove/Delete */}
              {onRemove && (
                <BulkActionButton
                  icon={Trash2}
                  label="Remove"
                  onClick={onRemove}
                  variant="danger"
                  loading={loading.remove}
                />
              )}
            </div>

            {/* Clear button */}
            <button
              onClick={onClear}
              className="ml-2 p-2 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
