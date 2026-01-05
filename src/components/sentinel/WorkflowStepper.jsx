import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";

export default function WorkflowStepper({ systems = [] }) {
  // Calculate completion states
  const hasRegisteredSystems = systems.length > 0;
  const allSystemsClassified = systems.length > 0 && systems.every(s => s.risk_classification !== 'unclassified');
  const hasHighRiskSystems = systems.filter(s => s.risk_classification === 'high-risk').length > 0;
  
  const unclassifiedCount = systems.filter(s => s.risk_classification === 'unclassified').length;
  const highRiskCount = systems.filter(s => s.risk_classification === 'high-risk').length;
  
  // Rough task count estimate
  const taskCount = highRiskCount * 22; // Avg obligations per high-risk system

  const steps = [
    {
      id: 1,
      title: "Register",
      subtitle: "AI Systems",
      path: createPageUrl("AISystemInventory"),
      count: `${systems.length} systems`,
      isComplete: hasRegisteredSystems,
      isCurrent: !hasRegisteredSystems,
      icon: hasRegisteredSystems ? CheckCircle : Circle
    },
    {
      id: 2,
      title: "Classify",
      subtitle: "Risk Level",
      path: unclassifiedCount > 0 
        ? createPageUrl("AISystemInventory") 
        : createPageUrl("AISystemInventory"),
      count: allSystemsClassified ? "All classified" : `${unclassifiedCount} pending`,
      isComplete: allSystemsClassified,
      isCurrent: hasRegisteredSystems && !allSystemsClassified,
      icon: allSystemsClassified ? CheckCircle : Circle
    },
    {
      id: 3,
      title: "Plan",
      subtitle: "Roadmap",
      path: createPageUrl("ComplianceRoadmap"),
      count: `${taskCount} tasks`,
      isComplete: false, // Always available once systems classified
      isCurrent: allSystemsClassified && !hasHighRiskSystems,
      icon: Circle
    },
    {
      id: 4,
      title: "Document",
      subtitle: "Compliance",
      path: createPageUrl("DocumentGenerator"),
      count: "0 generated",
      isComplete: false,
      isCurrent: hasHighRiskSystems,
      icon: Circle
    }
  ];

  return (
    <div className="glass-card border-0 p-6">
      <div className="flex items-center justify-between gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <Link
                to={step.path}
                className={`flex-1 group relative ${
                  step.isCurrent 
                    ? 'scale-105' 
                    : step.isComplete 
                    ? 'opacity-80 hover:opacity-100' 
                    : 'opacity-60 hover:opacity-80'
                } transition-all duration-200`}
              >
                <div className={`
                  relative p-4 rounded-lg border transition-all
                  ${step.isCurrent 
                    ? 'bg-[#86EFAC]/10 border-[#86EFAC]/50 shadow-lg shadow-[#86EFAC]/20' 
                    : step.isComplete
                    ? 'bg-[#86EFAC]/5 border-[#86EFAC]/30'
                    : 'bg-white/5 border-white/10'
                  }
                `}>
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                      ${step.isCurrent 
                        ? 'bg-[#86EFAC]/20 text-[#86EFAC]' 
                        : step.isComplete 
                        ? 'bg-[#86EFAC]/20 text-[#86EFAC]'
                        : 'bg-gray-500/20 text-gray-400'
                      }
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`
                          font-bold text-sm
                          ${step.isCurrent ? 'text-[#86EFAC]' : step.isComplete ? 'text-[#86EFAC]' : 'text-gray-400'}
                        `}>
                          {step.title}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">{step.subtitle}</div>
                      <div className={`
                        text-xs font-medium
                        ${step.isCurrent ? 'text-[#6EE7B7]' : step.isComplete ? 'text-[#6EE7B7]' : 'text-gray-500'}
                      `}>
                        {step.count}
                      </div>
                    </div>
                  </div>

                  {step.isCurrent && systems.length === 0 && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#86EFAC] text-black text-[10px] font-bold rounded-full whitespace-nowrap">
                      START HERE
                    </div>
                  )}
                </div>
              </Link>

              {!isLast && (
                <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}