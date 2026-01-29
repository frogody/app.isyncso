import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { Calendar, Clock, BookOpen, Zap, ArrowRight, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ActivityHeatmap({ userId, color = 'cyan' }) {
  const [activityData, setActivityData] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  const colorClasses = {
    cyan: ['bg-zinc-800/60', 'bg-cyan-950/50', 'bg-cyan-900/50', 'bg-cyan-800/60', 'bg-cyan-700/70'],
    sage: ['bg-zinc-800/60', 'bg-[#86EFAC]/10', 'bg-[#86EFAC]/20', 'bg-[#86EFAC]/30', 'bg-[#86EFAC]/40'],
    indigo: ['bg-zinc-800/60', 'bg-indigo-950/50', 'bg-indigo-900/50', 'bg-indigo-800/60', 'bg-indigo-700/70'],
    orange: ['bg-zinc-800/60', 'bg-orange-950/50', 'bg-orange-900/50', 'bg-orange-800/60', 'bg-orange-700/70'],
  };

  const colors = colorClasses[color];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = 7;

  useEffect(() => {
    loadActivityData();
  }, [userId]);

  const loadActivityData = async () => {
    try {
      const user = userId ? { id: userId } : await db.auth.me();
      if (!user) return;

      // Get activity sessions for the last 7 weeks
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));
      
      const [sessions, progressData] = await Promise.all([
        db.entities.ActivitySession.filter({ user_id: user.id }),
        db.entities.UserProgress.filter({ user_id: user.id })
      ]);

      // Group by date
      const dataByDate = {};
      
      sessions.forEach(session => {
        const date = new Date(session.session_start).toDateString();
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date: new Date(session.session_start),
            minutes: 0,
            lessons: 0,
            xp: 0,
            sessions: []
          };
        }
        dataByDate[date].minutes += session.total_active_minutes || 0;
        dataByDate[date].xp += Math.round((session.total_active_minutes || 0) * 2);
        dataByDate[date].sessions.push(session);
      });

      // Count lessons completed per day from progress updates
      progressData.forEach(progress => {
        if (progress.completed_lessons?.length > 0) {
          const date = new Date(progress.updated_date).toDateString();
          if (!dataByDate[date]) {
            dataByDate[date] = {
              date: new Date(progress.updated_date),
              minutes: 0,
              lessons: 0,
              xp: 0,
              sessions: []
            };
          }
          dataByDate[date].lessons += progress.completed_lessons.length;
        }
      });

      setActivityData(dataByDate);
    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateForCell = (weekIndex, dayIndex) => {
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
    const daysAgo = (weeks - 1 - weekIndex) * 7 + (currentDayOfWeek - dayIndex);
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return date;
  };

  const getActivityForDate = (date) => {
    return activityData[date.toDateString()] || null;
  };

  const getIntensityLevel = (activity) => {
    if (!activity) return 0;
    const minutes = activity.minutes || 0;
    if (minutes === 0) return 0;
    if (minutes < 15) return 1;
    if (minutes < 30) return 2;
    if (minutes < 60) return 3;
    return 4;
  };

  const getIntensityClass = (level) => colors[level];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleCellClick = (date, activity) => {
    setSelectedDay({
      date,
      activity: activity || { minutes: 0, lessons: 0, xp: 0 }
    });
  };

  return (
    <div className="space-y-2">
      {/* Week headers */}
      <div className="flex gap-1">
        <div className="w-8" />
        {Array.from({ length: weeks }).map((_, i) => (
          <div key={i} className="flex-1 text-center text-xs text-zinc-500">
            W{i + 1}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <TooltipProvider delayDuration={200}>
        {days.map((day, dayIndex) => (
          <div key={day} className="flex gap-1 items-center">
            <div className="w-8 text-xs text-zinc-500">{day}</div>
            {Array.from({ length: weeks }).map((_, weekIndex) => {
              const date = getDateForCell(weekIndex, dayIndex);
              const activity = getActivityForDate(date);
              const level = getIntensityLevel(activity);
              const isToday = date.toDateString() === new Date().toDateString();
              const isFuture = date > new Date();

              return (
                <Tooltip key={weekIndex}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                      onClick={() => !isFuture && handleCellClick(date, activity)}
                      className={cn(
                        'flex-1 aspect-square rounded-sm transition-all cursor-pointer',
                        getIntensityClass(isFuture ? 0 : level),
                        !isFuture && 'hover:ring-2 hover:ring-cyan-400',
                        isToday && 'ring-1 ring-white/30',
                        isFuture && 'opacity-30 cursor-not-allowed'
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-zinc-900 border-zinc-800">
                  <div className="text-xs">
                  <div className="font-medium text-zinc-200">{formatDate(date)}</div>
                  {isFuture ? (
                    <div className="text-zinc-500">Future date</div>
                  ) : activity ? (
                    <div className="text-zinc-500">
                      {activity.minutes}m · {activity.lessons} lessons · {activity.xp} XP
                    </div>
                  ) : (
                    <div className="text-zinc-500">No activity</div>
                  )}
                  </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <Link 
          to={createPageUrl('ActivityTimeline')} 
          className="text-xs text-cyan-400/70 hover:text-cyan-300/80 flex items-center gap-1"
        >
          View All Activity <ArrowRight className="w-3 h-3" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">Less</span>
          {colors.map((c, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', c)} />
          ))}
          <span className="text-xs text-zinc-600">More</span>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400/70" />
              {selectedDay && formatDate(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-4 mt-4">
              {selectedDay.activity.minutes > 0 || selectedDay.activity.lessons > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 text-center">
                      <Clock className="w-5 h-5 text-cyan-400/70 mx-auto mb-2" />
                      <div className="text-xl font-bold text-zinc-100">
                        {selectedDay.activity.minutes}m
                      </div>
                      <div className="text-xs text-zinc-500">Time Studied</div>
                    </div>
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 text-center">
                      <BookOpen className="w-5 h-5 text-cyan-400/70 mx-auto mb-2" />
                      <div className="text-xl font-bold text-zinc-100">
                        {selectedDay.activity.lessons}
                      </div>
                      <div className="text-xs text-zinc-500">Lessons</div>
                    </div>
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 text-center">
                      <Zap className="w-5 h-5 text-cyan-400/70 mx-auto mb-2" />
                      <div className="text-xl font-bold text-zinc-100">
                        {selectedDay.activity.xp}
                      </div>
                      <div className="text-xs text-zinc-500">XP Earned</div>
                    </div>
                  </div>

                  {selectedDay.activity.sessions?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-400">Sessions</h4>
                      {selectedDay.activity.sessions.slice(0, 3).map((session, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                          <div className="text-sm text-zinc-200">
                            {session.primary_activity_type || 'Learning Session'}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {session.total_active_minutes}m
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 mb-4">No activity on this day</p>
                  <Link to={createPageUrl('Learn')}>
                    <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                      <Play className="w-4 h-4 mr-2" />
                      Start Learning
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDay(null)}
                  className="border-zinc-700 text-zinc-400"
                >
                  Close
                </Button>
                <Link to={createPageUrl('ActivityTimeline')}>
                  <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                    View Full Activity
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}