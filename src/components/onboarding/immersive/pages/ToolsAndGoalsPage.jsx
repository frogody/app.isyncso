import React from 'react';
import { DAILY_TOOLS, GOALS } from '../personalizationEngine';

const GOAL_APP_MAP = {
  'learn-ai': ['sync', 'learn'],
  'grow-sales': ['sync', 'growth', 'finance', 'products', 'create'],
  'manage-work': ['sync', 'finance', 'products'],
  'creative-work': ['sync', 'learn', 'create'],
  'compliance-ethics': ['sync', 'sentinel'],
  'personal-assistant': ['sync', 'learn'],
  'ai-strategy': ['sync', 'growth', 'sentinel', 'raise'],
};

function deriveSelectedApps(goals) {
  const recommended = new Set();
  goals.forEach((goalId) => {
    const apps = GOAL_APP_MAP[goalId];
    if (apps) {
      apps.forEach((app) => recommended.add(app));
    }
  });
  // Always include sync first, then up to 5 additional
  const additional = [...recommended].filter((id) => id !== 'sync').slice(0, 5);
  return ['sync', ...additional];
}

export default function ToolsAndGoalsPage({ formData, updateFormData, onNext, onBack }) {
  const selectedTools = formData.dailyTools || [];
  const selectedGoals = formData.selectedGoals || [];

  const isValid = selectedGoals.length >= 1;

  const toggleTool = (toolId) => {
    const newTools = selectedTools.includes(toolId)
      ? selectedTools.filter((t) => t !== toolId)
      : [...selectedTools, toolId];
    updateFormData({ dailyTools: newTools });
  };

  const toggleGoal = (goalId) => {
    const newGoals = selectedGoals.includes(goalId)
      ? selectedGoals.filter((g) => g !== goalId)
      : [...selectedGoals, goalId];
    const apps = deriveSelectedApps(newGoals);
    updateFormData({ selectedGoals: newGoals, selectedApps: apps });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Section 1: Daily Tools */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-2">What tools do you use daily?</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Select the tools you already use so we can integrate seamlessly.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DAILY_TOOLS.map((tool) => {
            const isSelected = selectedTools.includes(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all ${
                  isSelected
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <span className="text-lg flex-shrink-0">{tool.icon}</span>
                <span className="truncate">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Goals */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">What are your goals?</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Pick at least one goal so we can recommend the right apps for you.
        </p>

        <div className="flex flex-wrap gap-3">
          {GOALS.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`px-5 py-2.5 rounded-full border text-sm transition-all ${
                  isSelected
                    ? 'border-cyan-500/60 bg-cyan-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {goal.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-medium rounded-full transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
