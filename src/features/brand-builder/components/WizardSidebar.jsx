import { motion } from 'framer-motion';
import {
  Dna, Palette, Type, Hexagon, MessageSquare, Eye, Layout, BookOpen, Check
} from 'lucide-react';

const ICON_MAP = {
  Dna, Palette, Type, Hexagon, MessageSquare, Eye, Layout, BookOpen,
};

export default function WizardSidebar({ stages, currentStage, completedStages = [], onStageClick }) {
  return (
    <div className="w-64 shrink-0 bg-zinc-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col py-6 px-3">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-3 mb-4">
        Stages
      </div>
      <nav className="flex flex-col gap-1">
        {stages.map((stage) => {
          const isActive = stage.id === currentStage;
          const isCompleted = completedStages.includes(stage.id);
          const Icon = ICON_MAP[stage.icon] || Dna;

          return (
            <motion.button
              key={stage.id}
              onClick={() => onStageClick(stage.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
                ${isActive
                  ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                  : isCompleted
                    ? 'text-zinc-300 hover:bg-white/5'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-400'
                }
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${isActive
                  ? 'bg-yellow-400/15'
                  : isCompleted
                    ? 'bg-emerald-500/10'
                    : 'bg-white/5'
                }
              `}>
                {isCompleted && !isActive ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : ''}`} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-[11px] font-medium ${isActive ? 'text-yellow-400/60' : 'text-zinc-600'}`}>
                  Stage {stage.id}
                </span>
                <span className="text-sm font-medium truncate">
                  {stage.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
