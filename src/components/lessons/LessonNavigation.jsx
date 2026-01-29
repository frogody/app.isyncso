import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, ChevronDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LessonNavigation({
  currentIndex,
  totalLessons,
  sortedLessons,
  completedLessons,
  onNavigate,
  onComplete,
  isCurrentCompleted
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalLessons - 1;
  const currentLesson = sortedLessons[currentIndex] || sortedLessons[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll current lesson dot into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const dotWidth = 12; // Approximate width of each dot
      const scrollPosition = currentIndex * dotWidth - container.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  }, [currentIndex]);

  const completedCount = Array.from(completedLessons).filter(id =>
    sortedLessons.some(l => l.id === id)
  ).length;

  return (
    <div className="h-16 border-t border-zinc-800/50 flex items-center justify-between px-4 lg:px-6 bg-black/80 backdrop-blur-sm">
      {/* Previous Button */}
      <Button
        variant="ghost"
        onClick={() => onNavigate(-1)}
        disabled={!canGoPrev}
        className={cn(
          "flex items-center gap-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-all",
          canGoPrev && "hover:bg-zinc-800/50"
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* Progress Section */}
      <div className="flex items-center gap-3 flex-1 justify-center max-w-md mx-4">
        {/* Scrollable Progress Dots */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-[200px] sm:max-w-[300px]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sortedLessons.map((lesson, i) => {
            const isCompleted = completedLessons.has(lesson.id);
            const isCurrent = i === currentIndex;

            return (
              <motion.button
                key={lesson.id}
                onClick={() => onNavigate(i - currentIndex)}

                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex-shrink-0 rounded-full transition-all duration-200",
                  isCurrent
                    ? "w-6 h-2 bg-cyan-500"
                    : isCompleted
                    ? "w-2 h-2 bg-green-500/70 hover:bg-green-400"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-600"
                )}
                title={`${i + 1}. ${lesson.title}`}
              />
            );
          })}
        </div>

        {/* Lesson Dropdown for Quick Navigation */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
          >
            <span className="hidden sm:inline">{currentIndex + 1}/{totalLessons}</span>
            <span className="sm:hidden">{currentIndex + 1}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showDropdown && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl z-50"
              >
                <div className="p-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500 px-2">
                    {completedCount} of {totalLessons} completed
                  </p>
                </div>
                <div className="p-1">
                  {sortedLessons.map((lesson, i) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    const isCurrent = i === currentIndex;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          onNavigate(i - currentIndex);
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                          isCurrent
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
                          isCompleted
                            ? "bg-green-500/20 text-green-400"
                            : isCurrent
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-zinc-800 text-zinc-500"
                        )}>
                          {isCompleted ? <CheckCircle className="w-3 h-3" /> : i + 1}
                        </div>
                        <span className="truncate flex-1">{lesson.title}</span>
                        {lesson.duration_minutes && (
                          <span className="text-xs text-zinc-600">{lesson.duration_minutes}m</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Next/Complete Button */}
      {canGoNext ? (
        <Button
          onClick={() => onNavigate(1)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          onClick={onComplete}
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Finish Course</span>
        </Button>
      )}
    </div>
  );
}