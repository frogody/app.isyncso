import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

interface ComplianceScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 140, strokeWidth: 10, fontSize: 'text-3xl', label: 'text-xs' },
  md: { width: 200, strokeWidth: 16, fontSize: 'text-5xl', label: 'text-sm' },
  lg: { width: 260, strokeWidth: 18, fontSize: 'text-6xl', label: 'text-base' },
} as const;

function getRiskLevel(score: number) {
  if (score >= 80) return { label: 'Low Risk', color: '#86EFAC', textClass: 'text-green-400 bg-green-500/10 border-green-500/30', Icon: CheckCircle };
  if (score >= 50) return { label: 'Medium Risk', color: '#EAB308', textClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', Icon: AlertTriangle };
  if (score >= 25) return { label: 'High Risk', color: '#F97316', textClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30', Icon: AlertTriangle };
  return { label: 'Critical', color: '#EF4444', textClass: 'text-red-400 bg-red-500/10 border-red-500/30', Icon: AlertTriangle };
}

// Tick mark colors for gauge zones
const TICK_COLORS = ['#EF4444','#EF4444','#F97316','#F97316','#EAB308','#EAB308','#86EFAC','#86EFAC','#86EFAC','#86EFAC'];

export function ComplianceScoreGauge({ score = 0, size = 'md' }: ComplianceScoreGaugeProps) {
  const { st } = useTheme();
  const config = SIZE_CONFIG[size];
  const svgWidth = config.width;
  const strokeWidth = config.strokeWidth;
  const radius = (svgWidth - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const cx = svgWidth / 2;
  const cy = svgWidth / 2;

  const risk = getRiskLevel(score);
  const Icon = risk.Icon;

  // Generate tick mark positions around the arc
  const ticks = TICK_COLORS.map((color, i) => {
    const angle = Math.PI + (i / (TICK_COLORS.length - 1)) * Math.PI;
    const innerR = radius - strokeWidth / 2 - 6;
    const outerR = radius - strokeWidth / 2 - 2;
    return {
      x1: cx + Math.cos(angle) * innerR,
      y1: cy + Math.sin(angle) * innerR,
      x2: cx + Math.cos(angle) * outerR,
      y2: cy + Math.sin(angle) * outerR,
      color,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgWidth, height: svgWidth / 2 + 40 }}>
        {/* Glow effect behind arc */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 100%, ${risk.color}33, transparent 70%)`,
          }}
        />

        <svg width={svgWidth} height={svgWidth / 2 + strokeWidth}>
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${svgWidth - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={st('rgba(226, 232, 240, 0.8)', 'rgba(39, 39, 42, 0.6)')}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <motion.line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            />
          ))}

          {/* Progress arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${svgWidth - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={risk.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="relative"
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 20px ${risk.color}40` }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className={cn(config.fontSize, 'font-bold relative z-10', st('text-slate-900', 'text-white'))}>
              {score}
            </span>
          </motion.div>
          <div className={cn(st('text-slate-500', 'text-zinc-400'), config.label, 'mt-1')}>Compliance Score</div>
        </div>

        {/* Scale labels */}
        <div className={cn('absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs', st('text-slate-400', 'text-zinc-500'))}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Risk Level Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border mt-4',
          risk.textClass
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium text-sm">{risk.label}</span>
      </motion.div>
    </div>
  );
}
