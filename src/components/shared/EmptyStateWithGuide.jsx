import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function EmptyStateWithGuide({
  icon: Icon,
  title,
  description,
  whatItDoes,
  examples,
  actionLabel,
  onAction,
  className = "",
  accentColor = "orange" // orange for Growth, indigo for CIDE, sage for Sentinel, yellow for Learn
}) {
  const colorClasses = {
    orange: {
      iconBg: "bg-orange-500/10 border-orange-500/20",
      iconText: "text-orange-400",
      sectionBg: "bg-orange-500/5 border-orange-500/10",
      sectionTitle: "text-orange-400",
      checkIcon: "text-orange-400",
      button: "bg-gradient-to-b from-orange-500/10 to-orange-500/5 border border-orange-500/30 text-orange-400 hover:border-orange-500/50 hover:text-orange-300"
    },
    indigo: {
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
      iconText: "text-indigo-400",
      sectionBg: "bg-indigo-500/5 border-indigo-500/10",
      sectionTitle: "text-indigo-400",
      checkIcon: "text-indigo-400",
      button: "bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/50 hover:text-indigo-300"
    },
    sage: {
      iconBg: "bg-[#86EFAC]/10 border-[#86EFAC]/20",
      iconText: "text-[#86EFAC]",
      sectionBg: "bg-[#86EFAC]/5 border-[#86EFAC]/10",
      sectionTitle: "text-[#86EFAC]",
      checkIcon: "text-[#86EFAC]",
      button: "bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
    },
    yellow: {
      iconBg: "bg-yellow-500/10 border-yellow-500/20",
      iconText: "text-yellow-400",
      sectionBg: "bg-yellow-500/5 border-yellow-500/10",
      sectionTitle: "text-yellow-400",
      checkIcon: "text-yellow-400",
      button: "bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 text-yellow-400 hover:border-yellow-500/50 hover:text-yellow-300"
    },
    cyan: {
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      iconText: "text-cyan-400",
      sectionBg: "bg-cyan-500/5 border-cyan-500/10",
      sectionTitle: "text-cyan-400",
      checkIcon: "text-cyan-400",
      button: "bg-cyan-600 hover:bg-cyan-500 text-white"
    }
  };

  const colors = colorClasses[accentColor] || colorClasses.orange;

  return (
    <Card className={`glass-card border-0 bg-gradient-to-br from-gray-900 to-black ${className}`}>
      <CardContent className="p-8 sm:p-12 text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center ${colors.iconBg}`}>
            <Icon className={`w-10 h-10 ${colors.iconText}`} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-gray-400">{description}</p>
        </div>

        {/* What It Does Section */}
        {whatItDoes && (
          <div className={`rounded-lg p-6 max-w-xl mx-auto text-left border ${colors.sectionBg}`}>
            <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wide ${colors.sectionTitle}`}>
              How It Works
            </h3>
            <div className="space-y-2">
              {whatItDoes.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.checkIcon}`} />
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {examples && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 max-w-xl mx-auto text-left">
            <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Examples
            </h4>
            <ul className="space-y-1">
              {examples.map((example, index) => (
                <li key={index} className="text-sm text-gray-400">
                  • {example}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        {onAction && (
          <Button
            onClick={onAction}
            size="lg"
            className={`px-8 ${colors.button}`}
          >
            {actionLabel || "Get Started"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}