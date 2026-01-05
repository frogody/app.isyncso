import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, FileText, AlertTriangle } from "lucide-react";

export default function QuickActions({ systems = [], taskCount = 0 }) {
  const highRiskCount = systems.filter(s => s.risk_classification === 'high-risk').length;
  const urgentTasksCount = Math.min(taskCount, 3); // Mock urgent count

  const actions = [
    {
      id: 1,
      title: "Register New System",
      subtitle: "Add AI system to inventory",
      icon: Plus,
      path: createPageUrl("AISystemInventory"),
      color: "cyan",
      highlight: systems.length === 0
    },
    {
      id: 2,
      title: "View Roadmap",
      subtitle: taskCount > 0 
        ? `${taskCount} tasks • ${urgentTasksCount} due soon`
        : "No tasks yet",
      icon: Calendar,
      path: createPageUrl("ComplianceRoadmap"),
      color: "orange",
      highlight: taskCount > 0 && urgentTasksCount > 0
    },
    {
      id: 3,
      title: "Generate Documents",
      subtitle: highRiskCount > 0 
        ? "Select system to start"
        : "Requires high-risk system",
      icon: FileText,
      path: createPageUrl("DocumentGenerator"),
      color: "purple",
      highlight: false
    }
  ];

  const colorClasses = {
    cyan: {
      bg: "bg-[#86EFAC]/10",
      border: "border-[#86EFAC]/30",
      icon: "text-[#86EFAC]",
      hover: "hover:bg-[#86EFAC]/20 hover:border-[#86EFAC]/50"
    },
    orange: {
      bg: "bg-[#6EE7B7]/10",
      border: "border-[#6EE7B7]/30",
      icon: "text-[#6EE7B7]",
      hover: "hover:bg-[#6EE7B7]/20 hover:border-[#6EE7B7]/50"
    },
    purple: {
      bg: "bg-[#6EE7B7]/10",
      border: "border-[#6EE7B7]/30",
      icon: "text-[#6EE7B7]",
      hover: "hover:bg-[#6EE7B7]/20 hover:border-[#6EE7B7]/50"
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {actions.map(action => {
        const Icon = action.icon;
        const colors = colorClasses[action.color];

        return (
          <Link key={action.id} to={action.path}>
            <Card className={`
              glass-card border-0 border ${colors.border} ${colors.bg} 
              ${colors.hover} transition-all duration-200 cursor-pointer group relative
              ${action.highlight ? 'ring-2 ring-offset-2 ring-offset-black' : ''}
            `}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                    ${colors.bg} border ${colors.border}
                  `}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-opacity-90 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {action.subtitle}
                    </p>
                  </div>
                </div>

                {action.highlight && (
                  <div className="absolute -top-2 -right-2">
                    <div className="w-6 h-6 bg-[#86EFAC] rounded-full flex items-center justify-center animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-black" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}