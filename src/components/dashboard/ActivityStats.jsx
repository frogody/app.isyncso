import React from "react";
import { Card } from "@/components/ui/card";
import { Clock, Target, TrendingUp, Award } from "lucide-react";

export default function ActivityStats({ stats = [] }) {
  const iconMap = {
    Clock,
    Target,
    TrendingUp,
    Award
  };

  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = iconMap[stat.icon] || Target;
        
        return (
          <Card 
            key={index} 
            className="glass-card border-0 p-6 bg-gradient-to-br from-cyan-900/10 to-black/50 border-cyan-500/20 hover:border-cyan-500/40 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}