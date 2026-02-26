import React from "react";
import { User as UserIcon } from "lucide-react";

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-900 border border-gray-800 flex items-center justify-center ${className}`}>
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user?.full_name || 'User'}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <UserIcon className="w-1/2 h-1/2 text-gray-600" />
      )}
    </div>
  );
}
