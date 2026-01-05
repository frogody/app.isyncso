import React from "react";
import { User as UserIcon } from "lucide-react";
import { AvatarIcon, PRESET_AVATARS } from "./AvatarSelector";

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  const iconSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 64,
    xl: 96,
    '2xl': 128
  };

  // Check if user has a preset avatar
  const presetAvatar = user?.avatar_url 
    ? PRESET_AVATARS.find(a => user.avatar_url.includes(a.id))
    : null;

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-900 border border-gray-800 flex items-center justify-center ${className}`}>
      {presetAvatar ? (
        <AvatarIcon avatar={presetAvatar} size={iconSizes[size]} />
      ) : user?.avatar_url ? (
        <img 
          src={user.avatar_url} 
          alt={user?.full_name || 'User'}
          className="w-full h-full object-cover"
        />
      ) : (
        <UserIcon className="w-1/2 h-1/2 text-gray-600" />
      )}
    </div>
  );
}