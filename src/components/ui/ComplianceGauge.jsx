import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export function ComplianceGauge({ score = 0, size = 200 }) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const offset = circumference - (score / 100) * circumference;

  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'Low Risk', color: '#86EFAC', icon: CheckCircle };
    if (score >= 50) return { label: 'Medium Risk', color: '#FBBF24', icon: AlertTriangle };
    return { label: 'High Risk', color: '#EF4444', icon: AlertTriangle };
  };

  const risk = getRiskLevel(score);
  const Icon = risk.icon;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
        <svg 
          width={size} 
          height={size / 2 + strokeWidth}
          className="transform"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <motion.path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={risk.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-5xl font-bold text-white"
          >
            {score}
          </motion.div>
          <div className="text-zinc-400 text-sm">Compliance Score</div>
        </div>

        {/* Risk indicator labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-zinc-500">
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
          score >= 80 ? 'bg-[#86EFAC]/20 text-[#86EFAC] border-[#86EFAC]/30' :
          score >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
          'bg-red-500/20 text-red-400 border-red-500/30'
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{risk.label}</span>
      </motion.div>
    </div>
  );
}