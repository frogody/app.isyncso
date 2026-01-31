import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface ComplianceScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 140, strokeWidth: 10, fontSize: 'text-3xl', label: 'text-xs' },
  md: { width: 200, strokeWidth: 16, fontSize: 'text-5xl', label: 'text-sm' },
  lg: { width: 260, strokeWidth: 18, fontSize: 'text-6xl', label: 'text-base' },
} as const;

function getRiskLevel(score: number, isLight: boolean) {
  if (score >= 80) return {
    label: 'Low Risk',
    color: isLight ? '#16A34A' : '#22C55E',
    textClass: isLight ? 'text-emerald-700 bg-emerald-50 border-transparent' : 'text-green-400 bg-green-500/10 border-green-500/30',
    Icon: CheckCircle,
  };
  if (score >= 50) return {
    label: 'Medium Risk',
    color: isLight ? '#CA8A04' : '#EAB308',
    textClass: isLight ? 'text-amber-700 bg-amber-50 border-transparent' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    Icon: AlertTriangle,
  };
  if (score >= 25) return {
    label: 'High Risk',
    color: isLight ? '#EA580C' : '#F97316',
    textClass: isLight ? 'text-orange-700 bg-orange-50 border-transparent' : 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Icon: AlertTriangle,
  };
  return {
    label: 'Critical',
    color: isLight ? '#DC2626' : '#EF4444',
    textClass: isLight ? 'text-red-700 bg-red-50 border-transparent' : 'text-red-400 bg-red-500/10 border-red-500/30',
    Icon: AlertTriangle,
  };
}

export function ComplianceScoreGauge({ score = 0, size = 'md' }: ComplianceScoreGaugeProps) {
  const { st, theme } = useSentinelTheme();
  const config = SIZE_CONFIG[size];
  const svgWidth = config.width;
  const strokeWidth = config.strokeWidth;
  const radius = (svgWidth - strokeWidth) / 2;
  const circumference = radius * Math.PI; // half-circle
  const offset = circumference - (score / 100) * circumference;

  const risk = getRiskLevel(score, theme === 'light');
  const Icon = risk.Icon;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: svgWidth, height: svgWidth / 2 + 40 }}>
        <svg
          width={svgWidth}
          height={svgWidth / 2 + strokeWidth}
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${svgWidth / 2} A ${radius} ${radius} 0 0 1 ${svgWidth - strokeWidth / 2} ${svgWidth / 2}`}
            fill="none"
            stroke={st('rgba(226, 232, 240, 0.8)', 'rgba(39, 39, 42, 0.6)')}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${svgWidth / 2} A ${radius} ${radius} 0 0 1 ${svgWidth - strokeWidth / 2} ${svgWidth / 2}`}
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
            className={cn(config.fontSize, 'font-bold', st('text-slate-900', 'text-white'))}
          >
            {score}
          </motion.div>
          <div className={cn(st('text-slate-500', 'text-zinc-400'), config.label)}>Compliance Score</div>
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
