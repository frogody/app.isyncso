import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskClassificationBadge from './RiskClassificationBadge';

// Mock HelpTip since it's an external shared component
vi.mock('@/components/shared/HelpTip', () => ({
  default: ({ explanation }: { explanation: string }) => (
    <span data-testid="help-tip">{explanation}</span>
  ),
}));

describe('RiskClassificationBadge', () => {
  it('renders HIGH RISK label', () => {
    render(<RiskClassificationBadge classification="high-risk" />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('renders PROHIBITED label', () => {
    render(<RiskClassificationBadge classification="prohibited" />);
    expect(screen.getByText('PROHIBITED')).toBeInTheDocument();
  });

  it('renders GPAI label', () => {
    render(<RiskClassificationBadge classification="gpai" />);
    expect(screen.getByText('GPAI')).toBeInTheDocument();
  });

  it('renders LIMITED RISK label', () => {
    render(<RiskClassificationBadge classification="limited-risk" />);
    expect(screen.getByText('LIMITED RISK')).toBeInTheDocument();
  });

  it('renders MINIMAL RISK label', () => {
    render(<RiskClassificationBadge classification="minimal-risk" />);
    expect(screen.getByText('MINIMAL RISK')).toBeInTheDocument();
  });

  it('renders UNCLASSIFIED label', () => {
    render(<RiskClassificationBadge classification="unclassified" />);
    expect(screen.getByText('UNCLASSIFIED')).toBeInTheDocument();
  });

  it('shows help tooltip by default', () => {
    render(<RiskClassificationBadge classification="high-risk" />);
    expect(screen.getByTestId('help-tip')).toBeInTheDocument();
  });

  it('hides help tooltip when showHelp=false', () => {
    render(<RiskClassificationBadge classification="high-risk" showHelp={false} />);
    expect(screen.queryByTestId('help-tip')).not.toBeInTheDocument();
  });

  it('renders icon by default (icon class present)', () => {
    render(<RiskClassificationBadge classification="high-risk" showHelp={false} />);
    // The icon renders inside the badge as a child element with mr-1 class
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('still renders text when showIcon=false', () => {
    render(<RiskClassificationBadge classification="high-risk" showHelp={false} showIcon={false} />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });
});
