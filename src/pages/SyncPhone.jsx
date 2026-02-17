import React from 'react';
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
          'shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b',
          syt('border-slate-200 bg-white', 'border-zinc-800/60 bg-black')
        )}>
          <h1 className={cn('text-lg font-semibold', syt('text-slate-900', 'text-white'))}>
            Sync Phone
          </h1>
          <SyncViewSelector />
        </div>

        {/* Phone Dashboard */}
        <PhoneDashboard
          phoneNumber={syncPhone.phoneNumber}
          loading={syncPhone.loading}
          provisioning={syncPhone.provisioning}
          callHistory={syncPhone.callHistory}
          smsHistory={syncPhone.smsHistory}
          callsLoading={syncPhone.callsLoading}
          smsLoading={syncPhone.smsLoading}
          requestPhoneNumber={syncPhone.requestPhoneNumber}
          updateSettings={syncPhone.updateSettings}
          refetch={syncPhone.refetch}
        />
      </div>
    </SyncPageTransition>
  );
}
