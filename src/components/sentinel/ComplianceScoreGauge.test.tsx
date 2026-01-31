import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComplianceScoreGauge } from './ComplianceScoreGauge';

describe('ComplianceScoreGauge', () => {
  it('displays the score value', () => {
    render(<ComplianceScoreGauge score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('displays "Compliance Score" label', () => {
    render(<ComplianceScoreGauge score={50} />);
    expect(screen.getByText('Compliance Score')).toBeInTheDocument();
  });

  it('displays scale labels 0, 50, 100', () => {
    render(<ComplianceScoreGauge score={75} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows "Low Risk" for score >= 80', () => {
    render(<ComplianceScoreGauge score={85} />);
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('shows "Medium Risk" for score 50-79', () => {
    render(<ComplianceScoreGauge score={65} />);
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('shows "High Risk" for score 25-49', () => {
    render(<ComplianceScoreGauge score={30} />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('shows "Critical" for score < 25', () => {
    render(<ComplianceScoreGauge score={10} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('shows "Critical" for score 0', () => {
    render(<ComplianceScoreGauge score={0} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders an SVG element', () => {
    const { container } = render(<ComplianceScoreGauge score={50} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('accepts sm size', () => {
    const { container } = render(<ComplianceScoreGauge score={50} size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '140');
  });

  it('accepts lg size', () => {
    const { container } = render(<ComplianceScoreGauge score={50} size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '260');
  });

  it('defaults to md size (200px)', () => {
    const { container } = render(<ComplianceScoreGauge score={50} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
  });
});
