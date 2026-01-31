import { SentinelBadge, type BadgeVariant } from './ui/SentinelBadge';
import { Ban, AlertTriangle, Brain, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import HelpTip from '@/components/shared/HelpTip';
import type { RiskClassification } from '@/tokens/sentinel';

interface RiskConfig {
  label: string;
  variant: BadgeVariant;
  icon: React.ComponentType<{ className?: string }>;
  explanation: string;
}

const riskConfig: Record<RiskClassification, RiskConfig> = {
  'prohibited': {
    label: 'PROHIBITED',
    variant: 'prohibited',
    icon: Ban,
    explanation: 'AI systems banned in the EU due to unacceptable risk (e.g., social scoring, real-time public surveillance).',
  },
  'high-risk': {
    label: 'HIGH RISK',
    variant: 'highRisk',
    icon: AlertTriangle,
    explanation: 'AI that could significantly impact lives and requires compliance documentation (e.g., hiring tools, credit scoring, medical diagnosis).',
  },
  'gpai': {
    label: 'GPAI',
    variant: 'gpai',
    icon: Brain,
    explanation: 'General Purpose AI models like ChatGPT that can be used for many tasks.',
  },
  'limited-risk': {
    label: 'LIMITED RISK',
    variant: 'limitedRisk',
    icon: AlertCircle,
    explanation: 'AI with transparency obligations (e.g., chatbots must disclose they are AI).',
  },
  'minimal-risk': {
    label: 'MINIMAL RISK',
    variant: 'minimalRisk',
    icon: CheckCircle,
    explanation: 'AI with minimal regulation (e.g., spam filters, video games).',
  },
  'unclassified': {
    label: 'UNCLASSIFIED',
    variant: 'neutral',
    icon: HelpCircle,
    explanation: 'Not yet assessed under EU AI Act categories.',
  },
};

interface RiskClassificationBadgeProps {
  classification: RiskClassification;
  showHelp?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export default function RiskClassificationBadge({
  classification,
  showHelp = true,
  showIcon = true,
  size = 'md',
}: RiskClassificationBadgeProps) {
  const config = riskConfig[classification] || riskConfig['unclassified'];
  const Icon = config.icon;

  const badge = (
    <SentinelBadge variant={config.variant} size={size}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </SentinelBadge>
  );

  if (!showHelp) return badge;

  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <HelpTip term="" explanation={config.explanation} />
    </span>
  );
}
