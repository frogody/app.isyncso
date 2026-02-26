import React from 'react';
import UserAvatar from './UserAvatar';
import { DEFAULT_COLOR } from '@/hooks/useTeamMembers';

const SIZE_CONFIG = {
  xs: { avatar: 'xs', ring: 24, ringWidth: 2, textSize: 'text-[9px]', nameSize: 'text-[10px]' },
  sm: { avatar: 'sm', ring: 32, ringWidth: 2, textSize: 'text-xs', nameSize: 'text-xs' },
  md: { avatar: 'md', ring: 40, ringWidth: 3, textSize: 'text-sm', nameSize: 'text-sm' },
  lg: { avatar: 'lg', ring: 64, ringWidth: 3, textSize: 'text-xl', nameSize: 'text-base' },
};

export default function TeamMemberBadge({
  member,
  size = 'sm',
  showName = false,
  showColor = true,
  nameOverride,
  className = '',
}) {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.sm;
  const color = member?.user_color || DEFAULT_COLOR;
  const name = nameOverride || member?.full_name || member?.email || 'Unknown';
  const initial = (name[0] || '?').toUpperCase();

  const hasAvatar = member?.avatar_url;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          width: config.ring,
          height: config.ring,
          boxShadow: showColor ? `0 0 0 ${config.ringWidth}px ${color}` : undefined,
        }}
      >
        {hasAvatar ? (
          <UserAvatar user={member} size={config.avatar} />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            <span className={config.textSize}>{initial}</span>
          </div>
        )}
      </div>
      {showName && (
        <span className={`${config.nameSize} text-zinc-300 truncate`}>{name}</span>
      )}
    </div>
  );
}
