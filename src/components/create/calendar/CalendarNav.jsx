import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarNav({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  view,
  onViewChange,
}) {
  const { ct } = useTheme();
  const month = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() &&
    today.getFullYear() === currentDate.getFullYear();

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevMonth}
          className={`p-1.5 rounded-lg ${ct(
            'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          )} transition-colors`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h2 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')} min-w-[160px] text-center`}>
          {month} {year}
        </h2>

        <button
          onClick={onNextMonth}
          className={`p-1.5 rounded-lg ${ct(
            'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          )} transition-colors`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {!isCurrentMonth && (
          <button
            onClick={onToday}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${ct(
              'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
              'bg-zinc-900/50 border-zinc-800/60 text-zinc-300 hover:border-zinc-700'
            )}`}
          >
            <CalendarDays className="w-3 h-3" />
            Today
          </button>
        )}
      </div>

      {/* View toggle */}
      <div className={`flex border ${ct('border-slate-200', 'border-zinc-800/60')} rounded-full overflow-hidden`}>
        <button
          onClick={() => onViewChange('month')}
          className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
            view === 'month'
              ? 'bg-yellow-500 text-black'
              : ct(
                  'bg-white text-slate-500 hover:text-slate-600',
                  'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300'
                )
          }`}
        >
          Month
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
            view === 'week'
              ? 'bg-yellow-500 text-black'
              : ct(
                  'bg-white text-slate-500 hover:text-slate-600',
                  'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300'
                )
          }`}
        >
          Week
        </button>
      </div>
    </div>
  );
}
