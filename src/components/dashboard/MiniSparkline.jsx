import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const colorMap = {
  cyan: { stroke: '#06b6d4', fill: '#06b6d4' },
  indigo: { stroke: '#6366f1', fill: '#6366f1' },
  emerald: { stroke: '#10b981', fill: '#10b981' },
  blue: { stroke: '#3b82f6', fill: '#3b82f6' },
  red: { stroke: '#ef4444', fill: '#ef4444' },
  amber: { stroke: '#f59e0b', fill: '#f59e0b' },
  purple: { stroke: '#a855f7', fill: '#a855f7' },
  sage: { stroke: '#86EFAC', fill: '#86EFAC' },
  orange: { stroke: '#f97316', fill: '#f97316' },
};

export function MiniSparkline({ data = [], color = 'cyan', width = 60, height = 24 }) {
  if (!data.length) return null;

  const chartData = data.map((v, i) => ({ v, i }));
  const c = colorMap[color] || colorMap.cyan;
  const gradientId = `spark-${color}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.fill} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={c.stroke}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
