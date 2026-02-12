import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import PostChip from './PostChip';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getStartDayOfMonth(year, month) {
  // 0=Sunday, convert to Mon=0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export default function CalendarGrid({ posts = [], currentDate, onDayClick, onPostClick }) {
  const { ct } = useTheme();
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getStartDayOfMonth(year, month);

  // Build a map of date -> posts
  const postsByDay = useMemo(() => {
    const map = {};
    posts.forEach((post) => {
      if (!post.scheduled_at) return;
      const d = new Date(post.scheduled_at);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const key = d.getDate();
        if (!map[key]) map[key] = [];
        map[key].push(post);
      }
    });
    return map;
  }, [posts, month, year]);

  // Build grid cells
  const cells = useMemo(() => {
    const result = [];
    // Empty cells before start of month
    for (let i = 0; i < startDay; i++) {
      result.push({ type: 'empty', key: `empty-${i}` });
    }
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push({
        type: 'day',
        key: `day-${day}`,
        day,
        date,
        isToday: isSameDay(date, today),
        isPast: isPast(date),
        posts: postsByDay[day] || [],
      });
    }
    return result;
  }, [startDay, daysInMonth, year, month, today, postsByDay]);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className={`text-center text-[11px] font-medium py-2 ${ct('text-slate-500', 'text-zinc-500')}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell) => {
          if (cell.type === 'empty') {
            return (
              <div
                key={cell.key}
                className={`min-h-[100px] ${ct('bg-slate-50/50', 'bg-zinc-950/30')} rounded-lg`}
              />
            );
          }

          const { day, date, isToday, posts: dayPosts } = cell;
          const past = cell.isPast && !isToday;

          return (
            <motion.div
              key={cell.key}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: day * 0.008 }}
              onClick={() => onDayClick?.(date)}
              className={`
                group relative min-h-[100px] p-1.5 rounded-lg border cursor-pointer
                transition-all duration-150
                ${isToday
                  ? ct(
                      'bg-yellow-50/50 border-yellow-300',
                      'bg-yellow-500/5 border-yellow-500/30'
                    )
                  : ct(
                      'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50',
                      'bg-zinc-900/30 border-zinc-800/30 hover:border-zinc-700/50 hover:bg-zinc-900/50'
                    )
                }
                ${past ? 'opacity-60' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday
                      ? 'bg-yellow-400 text-black'
                      : ct('text-slate-700', 'text-zinc-400')
                    }
                  `}
                >
                  {day}
                </span>

                {/* Add button on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className={`w-3.5 h-3.5 ${ct('text-slate-400', 'text-zinc-600')}`} />
                </div>
              </div>

              {/* Post chips */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostChip key={post.id} post={post} onClick={onPostClick} />
                ))}
                {dayPosts.length > 3 && (
                  <span className={`text-[10px] font-medium ${ct('text-slate-400', 'text-zinc-500')} pl-1`}>
                    +{dayPosts.length - 3} more
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
