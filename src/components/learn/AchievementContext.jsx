import React, { createContext, useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Zap, TrendingUp, Flame, Award, Target } from "lucide-react";

const AchievementContext = createContext();

export function useAchievement() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error("useAchievement must be used within AchievementProvider");
  }
  return context;
}

function AchievementToast({ achievement, onDismiss }) {
  const { type, value, badge, level, streak, skill, certificate } = achievement;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getToastContent = () => {
    switch (type) {
      case 'points':
        return (
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-yellow-300">+{value} points</div>
            </div>
          </div>
        );

      case 'badge':
        return (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border-2 border-purple-500/50">
                <span className="text-2xl">{badge.icon || '🏆'}</span>
              </div>
              <div>
                <div className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Badge Earned!</div>
                <div className="text-base font-bold text-white">{badge.name}</div>
              </div>
            </div>
            {badge.description && (
              <div className="text-xs text-gray-400 ml-15">{badge.description}</div>
            )}
            {badge.points && (
              <div className="text-xs text-yellow-400 font-semibold ml-15 mt-1">+{badge.points} bonus points</div>
            )}
          </div>
        );

      case 'level_up':
        return (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border-2 border-cyan-500/50">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">Level Up!</div>
                <div className="text-base font-bold text-white">You're now a {level.title}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 ml-15">Level {level.new_level} reached</div>
          </div>
        );

      case 'streak':
        return (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center border-2 border-orange-500/50">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-orange-300 font-semibold uppercase tracking-wider">Streak Milestone!</div>
                <div className="text-base font-bold text-white">{streak} Day Streak! 🔥</div>
              </div>
            </div>
          </div>
        );

      case 'skill_level_up':
        return (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border-2 border-green-500/50">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-xs text-green-300 font-semibold uppercase tracking-wider">Skill Level Up!</div>
                <div className="text-base font-bold text-white">{skill.name} → {skill.new_level}</div>
              </div>
            </div>
          </div>
        );

      case 'certificate':
        return (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/30 to-amber-500/30 flex items-center justify-center border-2 border-yellow-500/50">
                <Award className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-yellow-300 font-semibold uppercase tracking-wider">Certificate Earned!</div>
                <div className="text-base font-bold text-white">📜 {certificate.course_title}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getToastSize = () => {
    if (type === 'points') return 'w-64';
    return 'w-80';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`${getToastSize()} bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-transform`}
      onClick={onDismiss}
    >
      {getToastContent()}
    </motion.div>
  );
}

function AchievementToastContainer({ queue }) {
  return (
    <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {queue.map((achievement) => (
          <div key={achievement.id} className="pointer-events-auto">
            <AchievementToast
              achievement={achievement}
              onDismiss={() => {}}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AchievementProvider({ children }) {
  const [queue, setQueue] = useState([]);

  const showAchievement = (achievement) => {
    setQueue(prev => [...prev, { ...achievement, id: Date.now() + Math.random() }]);
  };

  useEffect(() => {
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        setQueue(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [queue]);

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}
      <AchievementToastContainer queue={queue} />
    </AchievementContext.Provider>
  );
}