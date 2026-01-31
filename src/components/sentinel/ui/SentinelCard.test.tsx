import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentinelCard, SentinelCardSkeleton } from './SentinelCard';

describe('SentinelCard', () => {
  it('renders children', () => {
    render(<SentinelCard>Hello Card</SentinelCard>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('applies default padding (md = p-6)', () => {
    const { container } = render(<SentinelCard>Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('applies sm padding', () => {
    const { container } = render(<SentinelCard padding="sm">Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('applies lg padding', () => {
    const { container } = render(<SentinelCard padding="lg">Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('p-8');
  });

  it('applies none padding', () => {
    const { container } = render(<SentinelCard padding="none">Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('p-0');
  });

  it('has role="button" when interactive', () => {
    render(<SentinelCard variant="interactive" onClick={() => {}}>Click me</SentinelCard>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not have role="button" when default', () => {
    const { container } = render(<SentinelCard>Content</SentinelCard>);
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('is focusable when interactive', () => {
    render(<SentinelCard variant="interactive" onClick={() => {}}>Content</SentinelCard>);
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });

  it('calls onClick when Enter key is pressed on interactive card', () => {
    const onClick = vi.fn();
    render(<SentinelCard variant="interactive" onClick={onClick}>Content</SentinelCard>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed on interactive card', () => {
    const onClick = vi.fn();
    render(<SentinelCard variant="interactive" onClick={onClick}>Content</SentinelCard>);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick on other keys', () => {
    const onClick = vi.fn();
    render(<SentinelCard variant="interactive" onClick={onClick}>Content</SentinelCard>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(<SentinelCard className="custom-class">Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies elevated variant styles', () => {
    const { container } = render(<SentinelCard variant="elevated">Content</SentinelCard>);
    expect(container.firstChild).toHaveClass('shadow-lg');
  });
});

describe('SentinelCardSkeleton', () => {
  it('renders with animate-pulse', () => {
    const { container } = render(<SentinelCardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<SentinelCardSkeleton className="h-32" />);
    expect(container.firstChild).toHaveClass('h-32');
  });
});
