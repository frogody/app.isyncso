import React from 'react';
import { Phone } from 'lucide-react';
import { SyncPageTransition, SyncViewSelector } from '@/components/sync/ui';
import { useSyncPhone, PhoneDashboard } from '@/components/inbox/phone';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

export default function SyncPhone() {
  const { isDark } = useTheme();
  const syt = (light, dark) => (isDark ? dark : light);
  const syncPhone = useSyncPhone();

  return (
    <SyncPageTransition>
      <div className={cn('flex flex-col h-screen', syt('bg-white', 'bg-black'))}>
        {/* Header with view selector */}
        <div className={cn(
          'shrink-0 flex items-center justify-between px-4 lg:px-6 py-3',
          syt('bg-white', 'bg-black')
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', syt('bg-slate-100 border-slate-200', 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/20'))}>
              <Phone className={cn('w-4 h-4', syt('text-slate-600', 'text-cyan-400'))} />
            </div>
            <div>
              <h1 className={cn('text-base font-bold', syt('text-slate-900', 'text-white'))}>SYNC Phone</h1>
              <p className={cn('text-xs', syt('text-slate-500', 'text-zinc-500'))}>Call and SMS management</p>
            </div>
          </div>
          <SyncViewSelector />
        </div>

        {/* Phone Dashboard */}
        <PhoneDashboard {...syncPhone} />
      </div>
    </SyncPageTransition>
  );
}
