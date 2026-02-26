import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export function CourseCarousel({ courses = [], title, color = 'teal' }) {
  const scrollRef = useRef(null);

  const colorClasses = {
    teal: { badge: 'bg-zinc-800/80 text-teal-400/70 border-zinc-700/50', button: 'bg-teal-600/80 hover:bg-teal-600' },
    sage: { badge: 'bg-zinc-800/80 text-[#86EFAC]/70 border-zinc-700/50', button: 'bg-[#86EFAC]/80 hover:bg-[#6EE7B7] text-black' },
    indigo: { badge: 'bg-zinc-800/80 text-indigo-400/70 border-zinc-700/50', button: 'bg-indigo-600/80 hover:bg-indigo-600' },
    orange: { badge: 'bg-zinc-800/80 text-orange-400/70 border-zinc-700/50', button: 'bg-orange-600/80 hover:bg-orange-600' },
  };

  const colors = colorClasses[color];

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const difficultyColors = {
    beginner: 'bg-zinc-800/80 text-teal-400/70',
    intermediate: 'bg-zinc-800/80 text-teal-300/70',
    advanced: 'bg-zinc-800/80 text-teal-200/70',
  };

  if (courses.length === 0) return null;

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2"
      >
        {courses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-shrink-0 w-[300px]"
          >
            <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-teal-800/50 transition-all group">
                {/* Thumbnail */}
                <div className="h-40 bg-zinc-800/50 relative overflow-hidden">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium border border-zinc-700/50', difficultyColors[course.difficulty])}>
                      {course.difficulty}
                    </span>
                    {course.rating && (
                      <span className="flex items-center gap-1 text-teal-400/70 text-sm">
                        <Star className="w-4 h-4 fill-teal-400/70" />
                        {course.rating}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="font-semibold text-zinc-100 mb-2 line-clamp-2 group-hover:text-teal-300/90 transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration_hours}h
                    </span>
                    <span className={cn('px-2 py-1 rounded border', colors.badge)}>
                      {course.category}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}