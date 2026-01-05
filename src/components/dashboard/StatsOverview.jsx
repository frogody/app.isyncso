import React from "react";
import { Card } from "@/components/ui/card";
import { BookOpen, Clock, TrendingUp, Award } from "lucide-react";

const StatsOverview = React.memo(({ courses = [], userProgress = [] }) => {
  const totalCourses = courses.length;
  const enrolledCourses = [...new Set(userProgress.map(p => p.course_id))].length;
  const completedCourses = userProgress.filter(p => p.status === 'completed').length;
  const totalTimeSpent = userProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);

  const stats = [
    {
      title: "Available Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "cyan",
      subtitle: "Ready to explore"
    },
    {
      title: "Courses Started",
      value: enrolledCourses,
      icon: TrendingUp,
      color: "cyan-light",
      subtitle: "Learning in progress"
    },
    {
      title: "Courses Completed",
      value: completedCourses,
      icon: Award,
      color: "cyan-dark",
      subtitle: "Achievements unlocked"
    },
    {
      title: "Time Learning",
      value: `${Math.round(totalTimeSpent / 60)}h`,
      icon: Clock,
      color: "cyan-accent",
      subtitle: "Knowledge gained"
    }
  ];

  const colorClasses = {
    cyan: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400",
    "cyan-light": "from-cyan-400/20 to-cyan-500/20 border-cyan-400/30 text-cyan-300",
    "cyan-dark": "from-cyan-600/20 to-cyan-600/20 border-cyan-600/30 text-cyan-500",
    "cyan-accent": "from-cyan-400/20 to-cyan-500/20 border-cyan-400/30 text-cyan-300"
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className={`glass-card hover-glow p-4 border-0 bg-gradient-to-br ${colorClasses[stat.color]} flex items-center gap-4`}>
          <div className="p-2.5 rounded-lg bg-black/20 border border-white/10 shrink-0">
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white leading-tight">
              {stat.value}
            </div>
            <h3 className="text-xs font-medium text-white/80">{stat.title}</h3>
          </div>
        </Card>
      ))}
    </div>
  );
});

export default StatsOverview;