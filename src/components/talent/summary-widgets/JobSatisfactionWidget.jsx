import React from "react";
import { TrendingDown, TrendingUp, Minus, AlertCircle, Building2 } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

// Parse the job satisfaction text to extract key metrics
const parseJobSatisfaction = (text) => {
  if (!text) return null;
  
  const metrics = [];
  
  // Company Stability
  if (text.toLowerCase().includes('declining')) {
    metrics.push({ label: 'Company Stability', value: 'Declining', icon: TrendingDown, color: 'red' });
  } else if (text.toLowerCase().includes('stable') || text.toLowerCase().includes('growing')) {
    metrics.push({ label: 'Company Stability', value: 'Stable', icon: TrendingUp, color: 'green' });
  }
  
  // Employee Sentiment
  if (text.toLowerCase().includes('mixed')) {
    metrics.push({ label: 'Employee Sentiment', value: 'Mixed', icon: Minus, color: 'amber' });
  } else if (text.toLowerCase().includes('positive')) {
    metrics.push({ label: 'Employee Sentiment', value: 'Positive', icon: TrendingUp, color: 'green' });
  } else if (text.toLowerCase().includes('negative')) {
    metrics.push({ label: 'Employee Sentiment', value: 'Negative', icon: TrendingDown, color: 'red' });
  }
  
  // Switching Likelihood
  if (text.toLowerCase().includes('high') && (text.toLowerCase().includes('switching') || text.toLowerCase().includes('likelihood'))) {
    metrics.push({ label: 'Switching Likelihood', value: 'High', icon: AlertCircle, color: 'green' });
  } else if (text.toLowerCase().includes('medium')) {
    metrics.push({ label: 'Switching Likelihood', value: 'Medium', icon: Minus, color: 'amber' });
  } else if (text.toLowerCase().includes('low')) {
    metrics.push({ label: 'Switching Likelihood', value: 'Low', icon: TrendingDown, color: 'red' });
  }
  
  return metrics;
};

const JobSatisfactionWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const analysis = candidate?.job_satisfaction_analysis;
  const metrics = parseJobSatisfaction(analysis);
  
  const hasData = analysis && analysis.length > 0;
  
  return (
    <WidgetWrapper
      title="Job Satisfaction"
      icon={Building2}
      iconColor="text-orange-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-4">
        {/* Quick Metrics */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric, i) => {
              const bgClass = metric.color === 'red' ? 'bg-red-500/10 border-red-500/20' :
                              metric.color === 'green' ? 'bg-green-500/10 border-green-500/20' :
                              'bg-amber-500/10 border-amber-500/20';
              const textClass = metric.color === 'red' ? 'text-red-400' :
                                metric.color === 'green' ? 'text-green-400' :
                                'text-amber-400';
              return (
                <div key={i} className={`p-2.5 rounded-lg border ${bgClass}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <metric.icon className={`w-3.5 h-3.5 ${textClass}`} />
                    <span className={`text-xs font-medium ${textClass}`}>{metric.value}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase">{metric.label}</p>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Full Analysis */}
        {analysis && (
          <div className="pt-3 border-t border-zinc-700/30">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Analysis</p>
            <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4">{analysis}</p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
};

export default JobSatisfactionWidget;
