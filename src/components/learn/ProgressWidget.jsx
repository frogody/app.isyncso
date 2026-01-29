import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Flame, TrendingUp, Zap, Star } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';

/**
 * ProgressWidget - Persistent gamification display during lessons
 * Shows XP, level, streak without being intrusive
 */
export function ProgressWidget({ userId, compact = false }) {
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadGamification = React.useCallback(async () => {
    try {
      // UserGamification table may not exist - handle gracefully
      if (!db.entities.UserGamification?.list) {
        setLoading(false);
        return;
      }
      const data = await db.entities.UserGamification.list({ limit: 1 }).catch(() => []);
      if (data.length > 0) {
        setGamification(data[0]);
      }
    } catch (error) {
      console.warn('[ProgressWidget] Load failed:', error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;
    if (!userId) return;

    const doLoad = async () => {
      await loadGamification();
    };
    doLoad();

    // Refresh every 30s to catch updates
    const interval = setInterval(() => {
      if (isMounted) loadGamification();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId, loadGamification]);

  if (loading || !gamification) return null;

  const levelProgress = getLevelProgress(gamification.total_points);

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-gray-400">Lvl {gamification.level}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-gray-400">{gamification.total_points}</span>
        </div>
        {gamification.current_streak > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">{gamification.current_streak}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-800">
      <CardContent className="p-4 space-y-3">
        {/* Level & XP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Level {gamification.level}</div>
              <div className="text-sm font-bold text-white">{gamification.level_title}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total XP</div>
            <div className="text-sm font-bold text-yellow-400">{gamification.total_points.toLocaleString()}</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{levelProgress.current} / {levelProgress.required} XP</span>
            <span>{levelProgress.percentage}%</span>
          </div>
          <Progress value={levelProgress.percentage} className="h-2" />
        </div>

        {/* Streak & Weekly */}
        <div className="flex gap-2">
          {gamification.current_streak > 0 && (
            <motion.div 
              className="flex-1 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20"
            >
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-400" />
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-400">{gamification.current_streak}</div>
                  <div className="text-[10px] text-gray-500">Day Streak</div>
                </div>
              </div>
            </motion.div>
          )}
          <motion.div 
            className="flex-1 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          >
            <div className="flex items-center justify-between">
              <Star className="w-4 h-4 text-yellow-400" />
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-400">{gamification.weekly_points}</div>
                <div className="text-[10px] text-gray-500">This Week</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Badges (if any) */}
        {gamification.badges && gamification.badges.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <Trophy className="w-4 h-4 text-purple-400" />
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {gamification.badges.slice(-5).reverse().map((badge, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0"
                  title={badge.badge_name}
                >
                  <span className="text-sm">{badge.badge_icon || '🏆'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getLevelProgress(totalPoints) {
  const LEVEL_THRESHOLDS = [
    { level: 1, points: 0 },
    { level: 2, points: 100 },
    { level: 3, points: 300 },
    { level: 4, points: 600 },
    { level: 5, points: 1000 },
    { level: 6, points: 1500 },
    { level: 7, points: 2500 },
    { level: 8, points: 4000 },
    { level: 9, points: 6000 },
    { level: 10, points: 10000 }
  ];

  let currentLevel = 1;
  let nextThreshold = LEVEL_THRESHOLDS[1].points;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalPoints >= LEVEL_THRESHOLDS[i].points) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      if (i + 1 < LEVEL_THRESHOLDS.length) {
        nextThreshold = LEVEL_THRESHOLDS[i + 1].points;
      }
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1].points;
  const pointsInLevel = totalPoints - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;
  const percentage = Math.min(Math.round((pointsInLevel / pointsNeeded) * 100), 100);

  return {
    current: pointsInLevel,
    required: pointsNeeded,
    percentage,
    nextLevel: currentLevel + 1
  };
}