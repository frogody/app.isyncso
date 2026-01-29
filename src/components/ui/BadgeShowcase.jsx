import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Award, Star, Zap, Trophy, Target, Flame, BookOpen, Clock, Lock, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const BADGE_ICONS = {
  first_lesson: BookOpen,
  first_course: Trophy,
  streak_7: Flame,
  streak_30: Flame,
  perfect_score: Star,
  fast_learner: Zap,
  time_invested: Clock,
  skill_master: Target,
  default: Award,
};

const BADGE_COLORS = {
  bronze: 'from-zinc-700 to-zinc-800 border-zinc-600/50',
  silver: 'from-zinc-600 to-zinc-700 border-zinc-500/50',
  gold: 'from-zinc-500 to-zinc-600 border-zinc-400/50',
  platinum: 'from-cyan-700/50 to-cyan-800/50 border-cyan-600/40',
  default: 'from-zinc-700 to-zinc-800 border-zinc-600/50',
};

export function BadgeShowcase({ badges = [], maxDisplay = 6, size = 'md', showLocked = false }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  // All possible achievements for showing locked ones
  const ALL_ACHIEVEMENTS = [
    { type: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson', tier: 'bronze' },
    { type: 'first_course', name: 'Course Champion', description: 'Complete your first course', tier: 'silver' },
    { type: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', tier: 'bronze' },
    { type: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', tier: 'gold' },
    { type: 'perfect_score', name: 'Perfect Score', description: 'Get 100% on a quiz', tier: 'silver' },
    { type: 'fast_learner', name: 'Fast Learner', description: 'Complete 5 lessons in one day', tier: 'bronze' },
    { type: 'time_invested', name: 'Time Investor', description: 'Study for 10 hours total', tier: 'silver' },
    { type: 'skill_master', name: 'Skill Master', description: 'Master any skill to 100%', tier: 'gold' },
  ];

  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  // Get locked badges if showLocked is true
  const earnedTypes = new Set(badges.map(b => b.type));
  const lockedBadges = showLocked ? ALL_ACHIEVEMENTS.filter(a => !earnedTypes.has(a.type)) : [];

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {displayBadges.map((badge, i) => {
          const Icon = BADGE_ICONS[badge.type] || BADGE_ICONS.default;
          const colorClass = BADGE_COLORS[badge.tier] || BADGE_COLORS.default;

          return (
            <motion.div
              key={badge.id || i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.1, type: 'spring' }}
              className="group relative cursor-pointer"
              onClick={() => setSelectedBadge({ ...badge, earned: true })}
            >
              <div
                className={cn(
                  'rounded-full bg-gradient-to-br border-2 flex items-center justify-center',
                  'shadow-lg transition-transform',
                  sizeClasses[size],
                  colorClass
                )}
              >
                <Icon className={cn('text-white drop-shadow-lg', iconSizes[size])} />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="text-sm font-medium text-white">{badge.name}</div>
                {badge.description && (
                  <div className="text-xs text-zinc-400">{badge.description}</div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Locked badges */}
        {lockedBadges.slice(0, 3).map((badge, i) => (
          <motion.div
            key={`locked-${badge.type}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: (displayBadges.length + i) * 0.1 }}
            className="group relative cursor-pointer"
            onClick={() => setSelectedBadge({ ...badge, earned: false })}
          >
            <div
              className={cn(
                'rounded-full bg-zinc-800/50 border-2 border-zinc-700/50 flex items-center justify-center',
                'transition-transform opacity-50',
                sizeClasses[size]
              )}
            >
              <Lock className={cn('text-zinc-500', iconSizes[size])} />
            </div>
            
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              <div className="text-sm font-medium text-zinc-400">{badge.name}</div>
              <div className="text-xs text-zinc-500">Locked</div>
            </div>
          </motion.div>
        ))}
        
        {remaining > 0 && (
          <div className={cn(
            'rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 text-sm font-medium cursor-pointer hover:bg-zinc-700 transition-colors',
            sizeClasses[size]
          )}>
            +{remaining}
          </div>
        )}
      </div>

      {/* Badge Detail Modal */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400/70" />
              Achievement Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBadge && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-col items-center text-center">
                {(() => {
                  const Icon = BADGE_ICONS[selectedBadge.type] || BADGE_ICONS.default;
                  const colorClass = selectedBadge.earned 
                    ? (BADGE_COLORS[selectedBadge.tier] || BADGE_COLORS.default)
                    : 'from-zinc-700 to-zinc-800 border-zinc-600/50';
                  
                  return (
                    <div
                      className={cn(
                        'w-24 h-24 rounded-full bg-gradient-to-br border-2 flex items-center justify-center shadow-lg mb-4',
                        colorClass,
                        !selectedBadge.earned && 'opacity-50'
                      )}
                    >
                      {selectedBadge.earned ? (
                        <Icon className="w-12 h-12 text-white drop-shadow-lg" />
                      ) : (
                        <Lock className="w-12 h-12 text-zinc-500" />
                      )}
                    </div>
                  );
                })()}
                
                <h3 className="text-xl font-bold text-zinc-100">{selectedBadge.name}</h3>
                <p className="text-sm text-zinc-500">{selectedBadge.description}</p>
                
                {selectedBadge.earned ? (
                  <div className="flex items-center gap-2 mt-2 text-cyan-400/80">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Earned!</span>
                  </div>
                ) : (
                  <div className="w-full mt-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-xs text-zinc-600 mb-2">Progress</div>
                    <Progress value={selectedBadge.progress || 0} className="h-2" />
                    <div className="text-xs text-zinc-500 mt-2">
                      {selectedBadge.progressText || 'Keep learning to unlock!'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}