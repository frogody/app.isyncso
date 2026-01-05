import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Users, Mail, Target, Calendar } from 'lucide-react';

const mockMetrics = [
  { label: 'Total Revenue', value: '$248,592', change: '+12.5%', trend: 'up', icon: DollarSign },
  { label: 'Deals Closed', value: '48', change: '+8.2%', trend: 'up', icon: Target },
  { label: 'Email Open Rate', value: '67%', change: '-3.1%', trend: 'down', icon: Mail },
  { label: 'New Contacts', value: '156', change: '+24.5%', trend: 'up', icon: Users }
];

const revenueData = [
  { month: 'Jan', value: 45000 },
  { month: 'Feb', value: 52000 },
  { month: 'Mar', value: 48000 },
  { month: 'Apr', value: 61000 },
  { month: 'May', value: 72000 },
  { month: 'Jun', value: 68000 }
];

const funnelData = [
  { stage: 'Leads', value: 1200, color: 'orange' },
  { stage: 'Qualified', value: 480, color: 'amber' },
  { stage: 'Proposals', value: 240, color: 'yellow' },
  { stage: 'Negotiation', value: 120, color: 'lime' },
  { stage: 'Closed', value: 48, color: 'green' }
];

const teamData = [
  { name: 'Sarah Chen', revenue: 120000, deals: 12 },
  { name: 'Mike Johnson', revenue: 98000, deals: 10 },
  { name: 'Emma Davis', revenue: 85000, deals: 9 },
  { name: 'Alex Kim', revenue: 72000, deals: 8 }
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('6m');
  const maxRevenue = Math.max(...revenueData.map(d => d.value));

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="w-full px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
            <p className="text-zinc-400 text-sm">Track your performance metrics</p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
            {['7d', '30d', '6m', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  dateRange === range ? 'bg-[#2596be] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mockMetrics.map((metric, i) => {
            const Icon = metric.icon;
            const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-[#2596be]/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#2596be]/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#2596be]" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${metric.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    <TrendIcon className="w-4 h-4" />
                    {metric.change}
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-sm text-zinc-400">{metric.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart (Bar) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Revenue Trend</h3>
            <div className="h-64 flex items-end gap-4">
              {revenueData.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.value / maxRevenue) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div className="w-full bg-gradient-to-t from-[#2596be] to-[#3db0e0] rounded-t-lg relative group cursor-pointer">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${(item.value / 1000).toFixed(0)}K
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              {revenueData.map((item, i) => (
                <span key={i} className="text-xs text-zinc-500">{item.month}</span>
              ))}
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Deal Distribution</h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" fill="none" stroke="#27272a" strokeWidth="24" />
                  <circle cx="96" cy="96" r="80" fill="none" stroke="#2596be" strokeWidth="24" strokeDasharray="502" strokeDashoffset="125" className="transition-all duration-1000" />
                  <circle cx="96" cy="96" r="80" fill="none" stroke="#3db0e0" strokeWidth="24" strokeDasharray="502" strokeDashoffset="350" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">75%</div>
                    <div className="text-xs text-zinc-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2596be]" />
                <span className="text-sm text-zinc-400">Won</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3db0e0]" />
                <span className="text-sm text-zinc-400">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <span className="text-sm text-zinc-400">Lost</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Conversion Funnel</h3>
            <div className="space-y-3">
              {funnelData.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-400">{item.stage}</span>
                    <span className="text-sm text-white font-medium">{item.value}</span>
                  </div>
                  <div className="h-8 bg-zinc-800 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / 1200) * 100}%` }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-[#2596be] to-[#3db0e0]"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Team Performance</h3>
            <div className="space-y-4">
              {teamData.map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2596be]/20 flex items-center justify-center">
                    <span className="text-[#2596be] font-medium">{member.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{member.name}</span>
                      <span className="text-sm text-[#2596be]">${(member.revenue / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(member.revenue / 120000) * 100}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        className="h-full bg-[#2596be]"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}