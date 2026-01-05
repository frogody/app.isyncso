import React from "react";
import { Badge } from "@/components/ui/badge";
import HelpTip from "@/components/shared/HelpTip";

const RISK_EXPLANATIONS = {
  'prohibited': 'AI systems banned in the EU due to unacceptable risk (e.g., social scoring, real-time public surveillance).',
  'high-risk': 'AI that could significantly impact lives and requires compliance documentation (e.g., hiring tools, credit scoring, medical diagnosis).',
  'gpai': 'General Purpose AI models like ChatGPT that can be used for many tasks.',
  'limited-risk': 'AI with transparency obligations (e.g., chatbots must disclose they are AI).',
  'minimal-risk': 'AI with minimal regulation (e.g., spam filters, video games).',
  'unclassified': 'Not yet assessed under EU AI Act categories.'
};

const RISK_COLORS = {
  'prohibited': 'bg-red-500/20 text-red-400 border-red-500/30',
  'high-risk': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'gpai': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'limited-risk': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'minimal-risk': 'bg-green-500/20 text-green-400 border-green-500/30',
  'unclassified': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

export default function RiskClassificationBadge({ classification, showHelp = true }) {
  const badgeContent = (
    <Badge className={`${RISK_COLORS[classification]} border`}>
      {classification.replace('-', ' ').toUpperCase()}
    </Badge>
  );

  if (!showHelp) return badgeContent;

  return (
    <span className="inline-flex items-center gap-1">
      {badgeContent}
      <HelpTip
        term=""
        explanation={RISK_EXPLANATIONS[classification]}
      />
    </span>
  );
}