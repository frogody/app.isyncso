import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, Square, AlertTriangle, CheckCircle, 
  Loader2, Eye, MousePointer, Zap, Shield 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const ACTION_ICONS = {
  navigate: MousePointer,
  create: Zap,
  update: Zap,
  delete: AlertTriangle,
  read: Eye,
  default: Zap
};

export default function AgentControlOverlay({ 
  isActive, 
  currentAction, 
  progress, 
  onPause, 
  onStop, 
  onResume,
  isPaused,
  color = "cyan",
  agentName = "AI Agent"
}) {
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    if (isActive && !isPaused) {
      const interval = setInterval(() => {
        setPulseCount(prev => prev + 1);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isActive, isPaused]);

  const colorClasses = {
    cyan: {
      bg: "bg-cyan-500",
      bgLight: "bg-cyan-500/10",
      border: "border-cyan-500/50",
      text: "text-cyan-400",
      glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]"
    },
    indigo: {
      bg: "bg-indigo-500",
      bgLight: "bg-indigo-500/10",
      border: "border-indigo-500/50",
      text: "text-indigo-400",
      glow: "shadow-[0_0_30px_rgba(99,102,241,0.3)]"
    },
    sage: {
      bg: "bg-[#86EFAC]",
      bgLight: "bg-[#86EFAC]/10",
      border: "border-[#86EFAC]/50",
      text: "text-[#86EFAC]",
      glow: "shadow-[0_0_30px_rgba(134,239,172,0.3)]"
    }
  };

  const colors = colorClasses[color] || colorClasses.cyan;
  const ActionIcon = ACTION_ICONS[currentAction?.type] || ACTION_ICONS.default;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        {/* Scanning border effect */}
        <div className={`absolute inset-0 border-4 ${colors.border} rounded-none`}>
          {/* Top scanning line */}
          <motion.div
            className={`absolute top-0 left-0 h-1 ${colors.bg}`}
            initial={{ width: "0%" }}
            animate={{ 
              width: ["0%", "100%", "100%", "0%"],
              left: ["0%", "0%", "0%", "100%"]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          {/* Right scanning line */}
          <motion.div
            className={`absolute top-0 right-0 w-1 ${colors.bg}`}
            initial={{ height: "0%" }}
            animate={{ 
              height: ["0%", "100%", "100%", "0%"],
              top: ["0%", "0%", "0%", "100%"]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear",
              delay: 0.75
            }}
          />
          {/* Bottom scanning line */}
          <motion.div
            className={`absolute bottom-0 right-0 h-1 ${colors.bg}`}
            initial={{ width: "0%" }}
            animate={{ 
              width: ["0%", "100%", "100%", "0%"],
              right: ["0%", "0%", "0%", "100%"]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear",
              delay: 1.5
            }}
          />
          {/* Left scanning line */}
          <motion.div
            className={`absolute bottom-0 left-0 w-1 ${colors.bg}`}
            initial={{ height: "0%" }}
            animate={{ 
              height: ["0%", "100%", "100%", "0%"],
              bottom: ["0%", "0%", "0%", "100%"]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear",
              delay: 2.25
            }}
          />
        </div>

        {/* Corner indicators */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <motion.div
            key={corner}
            className={`absolute w-8 h-8 ${colors.border} border-2 ${
              corner.includes('top') ? 'border-b-0' : 'border-t-0'
            } ${
              corner.includes('left') ? 'border-r-0' : 'border-l-0'
            } ${
              corner === 'top-left' ? 'top-2 left-2 rounded-tl-lg' :
              corner === 'top-right' ? 'top-2 right-2 rounded-tr-lg' :
              corner === 'bottom-left' ? 'bottom-2 left-2 rounded-bl-lg' :
              'bottom-2 right-2 rounded-br-lg'
            }`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        ))}

        {/* Control Panel - pointer-events-auto for interaction */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto ${colors.glow}`}
        >
          <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl ${colors.bgLight} border ${colors.border} backdrop-blur-xl`}>
            {/* Agent indicator */}
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-3 h-3 rounded-full ${colors.bg}`}
                animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
              />
              <div>
                <div className="text-sm font-medium text-white">{agentName} Control</div>
                <div className={`text-xs ${colors.text}`}>
                  {isPaused ? "Paused" : currentAction?.description || "Executing..."}
                </div>
              </div>
            </div>

            {/* Progress */}
            {progress !== undefined && (
              <div className="w-32">
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {/* Action indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bgLight}`}>
              {isPaused ? (
                <Pause className={`w-4 h-4 ${colors.text}`} />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className={`w-4 h-4 ${colors.text}`} />
                </motion.div>
              )}
              <span className={`text-xs font-medium ${colors.text}`}>
                {currentAction?.type || "Working"}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {isPaused ? (
                <Button
                  size="sm"
                  onClick={onResume}
                  className={`${colors.bg} text-white hover:opacity-90 h-8`}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPause}
                  className="border-white/20 text-white hover:bg-white/10 h-8"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={onStop}
                className="h-8"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Current action spotlight */}
        {currentAction?.target && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: currentAction.target.y || '50%',
              left: currentAction.target.x || '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.div
              className={`w-24 h-24 rounded-full border-2 ${colors.border}`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className={`absolute inset-0 flex items-center justify-center`}>
              <ActionIcon className={`w-8 h-8 ${colors.text}`} />
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}