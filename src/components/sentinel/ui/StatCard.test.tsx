import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';
import { Shield } from 'lucide-react';

describe('StatCard', () => {
  it('renders label text', () => {
    render(<StatCard icon={Shield} label="Total Systems" value={42} />);
    expect(screen.getByText('Total Systems')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(<StatCard icon={Shield} label="Count" value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard icon={Shield} label="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard icon={Shield} label="Count" value={5} subtitle="50% of total" />);
    expect(screen.getByText('50% of total')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<StatCard icon={Shield} label="Count" value={5} />);
    expect(container.querySelector('.text-zinc-500')).toBeNull();
  });

  it('renders positive trend', () => {
    render(<StatCard icon={Shield} label="Growth" value={10} trend={{ value: 15, positive: true }} />);
    expect(screen.getByText(/↑.*15%/)).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(<StatCard icon={Shield} label="Decline" value={3} trend={{ value: 8, positive: false }} />);
    expect(screen.getByText(/↓.*8%/)).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    const { container } = render(<StatCard icon={Shield} label="Loading" value={0} loading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('renders the icon', () => {
    const { container } = render(<StatCard icon={Shield} label="Test" value={1} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
