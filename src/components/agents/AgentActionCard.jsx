import React from "react";
import { motion } from "framer-motion";
import { 
  Play, Shield, CheckCircle, AlertTriangle, 
  Zap, Eye, MousePointer, FileText, Users, 
  BookOpen, TrendingUp, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTION_ICONS = {
  navigate: MousePointer,
  create: Zap,
  update: Zap,
  delete: AlertTriangle,
  read: Eye,
  enroll: BookOpen,
  research: TrendingUp,
  generate: FileText,
  assess: Shield,
  default: Zap
};

const ACTION_COLORS = {
  navigate: "cyan",
  create: "green",
  update: "yellow",
  delete: "red",
  read: "blue",
  enroll: "cyan",
  research: "indigo",
  generate: "purple",
  assess: "sage"
};

export default function AgentActionCard({ 
  action, 
  onApprove, 
  onReject, 
  isExecuting = false,
  color = "cyan" 
}) {
  const Icon = ACTION_ICONS[action.type] || ACTION_ICONS.default;
  const actionColor = ACTION_COLORS[action.type] || color;

  const colorClasses = {
    cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/30", text: "text-cyan-400" },
    green: { bg: "bg-green-500/20", border: "border-green-500/30", text: "text-green-400" },
    yellow: { bg: "bg-yellow-500/20", border: "border-yellow-500/30", text: "text-yellow-400" },
    red: { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400" },
    blue: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400" },
    indigo: { bg: "bg-indigo-500/20", border: "border-indigo-500/30", text: "text-indigo-400" },
    purple: { bg: "bg-purple-500/20", border: "border-purple-500/30", text: "text-purple-400" },
    sage: { bg: "bg-[#86EFAC]/20", border: "border-[#86EFAC]/30", text: "text-[#86EFAC]" }
  };

  const colors = colorClasses[actionColor] || colorClasses.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`p-4 rounded-xl ${colors.bg} border ${colors.border} my-3`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${colors.text}`}>
              Suggested Action
            </span>
            {action.confidence && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                {Math.round(action.confidence * 100)}% confident
              </span>
            )}
          </div>
          <h4 className="text-white font-medium mt-1">{action.title}</h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-3 leading-relaxed">
        {action.description}
      </p>

      {/* Details */}
      {action.details && (
        <div className="mb-3 p-2 rounded-lg bg-black/20 text-xs text-gray-400 font-mono">
          {typeof action.details === 'object' 
            ? JSON.stringify(action.details, null, 2)
            : action.details
          }
        </div>
      )}

      {/* Impact warning */}
      {action.impact && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-yellow-300">{action.impact}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onApprove}
          disabled={isExecuting}
          size="sm"
          className={`flex-1 ${colors.bg} ${colors.text} hover:opacity-90 border ${colors.border}`}
        >
          {isExecuting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full"
              />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-2" />
              Let AI do this
            </>
          )}
        </Button>
        <Button
          onClick={onReject}
          disabled={isExecuting}
          size="sm"
          variant="outline"
          className="border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
        >
          Skip
        </Button>
      </div>
    </motion.div>
  );
}