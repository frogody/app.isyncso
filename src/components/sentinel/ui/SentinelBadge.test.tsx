import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentinelBadge } from './SentinelBadge';

describe('SentinelBadge', () => {
  it('renders children text', () => {
    render(<SentinelBadge>HIGH-RISK</SentinelBadge>);
    expect(screen.getByText('HIGH-RISK')).toBeInTheDocument();
  });

  it('defaults to neutral variant', () => {
    const { container } = render(<SentinelBadge>Default</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-zinc-400');
  });

  it('applies primary variant', () => {
    const { container } = render(<SentinelBadge variant="primary">Primary</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-sky-400');
  });

  it('applies success variant', () => {
    const { container } = render(<SentinelBadge variant="success">OK</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-green-400');
  });

  it('applies warning variant', () => {
    const { container } = render(<SentinelBadge variant="warning">Warn</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-yellow-400');
  });

  it('applies error variant', () => {
    const { container } = render(<SentinelBadge variant="error">Error</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-red-400');
  });

  it('applies highRisk variant', () => {
    const { container } = render(<SentinelBadge variant="highRisk">High</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-orange-400');
  });

  it('applies prohibited variant', () => {
    const { container } = render(<SentinelBadge variant="prohibited">Banned</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-red-400');
  });

  it('applies gpai variant', () => {
    const { container } = render(<SentinelBadge variant="gpai">GPAI</SentinelBadge>);
    expect(container.firstChild).toHaveClass('text-purple-400');
  });

  it('applies sm size', () => {
    const { container } = render(<SentinelBadge size="sm">Small</SentinelBadge>);
    expect(container.firstChild).toHaveClass('px-2');
  });

  it('applies md size by default', () => {
    const { container } = render(<SentinelBadge>Medium</SentinelBadge>);
    expect(container.firstChild).toHaveClass('px-2.5');
  });

  it('has rounded-full class', () => {
    const { container } = render(<SentinelBadge>Badge</SentinelBadge>);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('applies custom className', () => {
    const { container } = render(<SentinelBadge className="ml-2">Custom</SentinelBadge>);
    expect(container.firstChild).toHaveClass('ml-2');
  });
});
