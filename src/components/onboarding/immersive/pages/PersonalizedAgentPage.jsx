import React from 'react';
import { getPersonalizedVariant } from '../personalizationEngine';
import CodeIntelligence from '../variants/CodeIntelligence';
import CommsPrep from '../variants/CommsPrep';
import CreativeFlow from '../variants/CreativeFlow';
import DeepWorkGuardian from '../variants/DeepWorkGuardian';
import SkillGrowth from '../variants/SkillGrowth';
import MeetingIntelligence from '../variants/MeetingIntelligence';

const VARIANT_MAP = {
  CodeIntelligence,
  CommsPrep,
  CreativeFlow,
  DeepWorkGuardian,
  SkillGrowth,
  MeetingIntelligence,
};

export default function PersonalizedAgentPage({ formData, onNext, onBack }) {
  const variantName = getPersonalizedVariant(formData.dailyTools, formData.selectedGoals);
  const VariantComponent = VARIANT_MAP[variantName] || DeepWorkGuardian;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <VariantComponent userName={formData.fullName} />
      <div className="flex items-center gap-4 mt-10">
        <button
          onClick={onBack}
          className="px-6 py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-full transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
