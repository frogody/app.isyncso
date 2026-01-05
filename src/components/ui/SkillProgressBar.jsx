import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LEVEL_THRESHOLDS = [
  { level: 1, min: 0, label: 'Novice' },
  { level: 2, min: 20, label: 'Beginner' },
  { level: 3, min: 40, label: 'Intermediate' },
  { level: 4, min: 60, label: 'Advanced' },
  { level: 5, min: 80, label: 'Expert' },
];

export function SkillProgressBar({ 
  name, 
  progress = 0, 
  color = 'cyan',
  showLevel = true,
  delay = 0,
  clickable = false,
  skillId
}) {
  const colorClasses = {
    cyan: 'from-cyan-500 to-cyan-400',
    sage: 'from-[#86EFAC] to-[#6EE7B7]',
    indigo: 'from-indigo-500 to-indigo-400',
    orange: 'from-orange-500 to-orange-400',
    purple: 'from-purple-500 to-purple-400',
    yellow: 'from-yellow-500 to-yellow-400',
  };

  const currentLevel = LEVEL_THRESHOLDS.filter(l => progress >= l.min).pop();

  const content = (
    <div className={cn(
      "space-y-2 p-2 -m-2 rounded-lg transition-colors",
      clickable && "hover:bg-zinc-800/50 cursor-pointer group"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{name}</span>
          {showLevel && (
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Lv.{currentLevel?.level} {currentLevel?.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{progress}%</span>
          {clickable && (
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          )}
        </div>
      </div>
      
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        {/* Level markers */}
        {LEVEL_THRESHOLDS.slice(1).map((level) => (
          <div
            key={level.level}
            className="absolute top-0 bottom-0 w-px bg-zinc-700"
            style={{ left: `${level.min}%` }}
          />
        ))}
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', colorClasses[color])}
        />
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link to={createPageUrl(`SkillMap?skill=${encodeURIComponent(name)}`)}>
        {content}
      </Link>
    );
  }

  return content;
}

export function SkillProgressList({ skills = [], color = 'cyan', clickable = false }) {
  return (
    <div className="space-y-4">
      {skills.map((skill, i) => (
        <SkillProgressBar
          key={skill.id || skill.name}
          name={skill.name}
          progress={skill.progress || skill.proficiency_score || 0}
          color={color}
          delay={i * 0.1}
          clickable={clickable}
          skillId={skill.id}
        />
      ))}
    </div>
  );
}