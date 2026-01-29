import React from 'react';

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  color = 'cyan'
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
