import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight, Trophy, Flame } from "lucide-react";
import confetti from "canvas-confetti";
import { SmartSequencer } from "@/components/learn/SmartSequencer";

export default function CompletionCelebration({ 
  xpGained, 
  nextLesson, 
  streak, 
  currentLesson,
  userId,
  courseId,
  onNext, 
  onClose 
}) {
  const [showXP, setShowXP] = useState(false);
  const [showSequencer, setShowSequencer] = useState(false);

  useEffect(() => {
    // Fire confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 3;
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.random() - 0.2
        },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309']
      });
    }, 250);

    // Show XP gain after delay
    setTimeout(() => setShowXP(true), 400);
    setTimeout(() => setShowSequencer(true), 1200);

    return () => {
      clearInterval(interval);
      setShowSequencer(false);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="glass-card border-0 max-w-lg w-full bg-gradient-to-br from-yellow-900/20 to-black/80 backdrop-blur-xl border border-yellow-500/20">
          <CardContent className="p-8 text-center space-y-6">
            {/* Checkmark with glow */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="relative inline-flex"
            >
              <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/50">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Lesson Complete! 🎉
              </h2>
              <p className="text-gray-400">Great work on finishing this lesson</p>
            </div>

            {/* XP Gain Animation */}
            <AnimatePresence>
              {showXP && xpGained && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="text-2xl font-bold text-yellow-400">+{xpGained} XP</span>
                  <motion.div
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: -50, opacity: 0 }}
                    transition={{ duration: 2, delay: 0.5 }}
                    className="absolute text-yellow-400 font-bold text-xl"
                  >
                    +{xpGained}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Streak Notification */}
            {streak && streak > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20"
              >
                <div className="flex items-center justify-center gap-2 text-orange-400">
                  <Flame className="w-5 h-5" />
                  <span className="font-bold">{streak} Day Streak!</span>
                  <Flame className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Keep the momentum going!</p>
              </motion.div>
            )}

            {/* Smart Sequencer - Adaptive Next Step */}
            {nextLesson && showSequencer && currentLesson && userId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <SmartSequencer
                  lesson={currentLesson}
                  nextLesson={nextLesson}
                  userId={userId}
                  courseId={courseId}
                  onProceed={onNext}
                  onSkip={() => onNext(true)}
                />
              </motion.div>
            )}

            {/* Fallback: Simple Next Lesson Preview */}
            {nextLesson && !showSequencer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Up Next</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{nextLesson.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {nextLesson.duration_minutes && `${nextLesson.duration_minutes} min • `}
                    Continue your learning journey
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Stay Here
                  </Button>
                  <Button
                    onClick={onNext}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white border-0"
                  >
                    Next Lesson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}