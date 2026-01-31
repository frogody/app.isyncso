import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentinelButton } from './SentinelButton';

describe('SentinelButton', () => {
  it('renders children text', () => {
    render(<SentinelButton>Click Me</SentinelButton>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<SentinelButton onClick={onClick}>Click</SentinelButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<SentinelButton disabled>Disabled</SentinelButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<SentinelButton loading>Loading</SentinelButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    const { container } = render(<SentinelButton loading>Loading</SentinelButton>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<SentinelButton icon={<span data-testid="icon">★</span>}>With Icon</SentinelButton>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon when loading (shows spinner instead)', () => {
    render(<SentinelButton loading icon={<span data-testid="icon">★</span>}>Loading</SentinelButton>);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('applies size classes for sm', () => {
    const { container } = render(<SentinelButton size="sm">Small</SentinelButton>);
    expect(container.firstChild).toHaveClass('h-8');
  });

  it('applies size classes for lg', () => {
    const { container } = render(<SentinelButton size="lg">Large</SentinelButton>);
    expect(container.firstChild).toHaveClass('h-12');
  });

  it('applies primary variant by default', () => {
    const { container } = render(<SentinelButton>Primary</SentinelButton>);
    expect(container.firstChild).toHaveClass('bg-emerald-400');
  });

  it('applies secondary variant', () => {
    const { container } = render(<SentinelButton variant="secondary">Secondary</SentinelButton>);
    expect(container.firstChild).toHaveClass('border-zinc-700');
  });

  it('applies danger variant', () => {
    const { container } = render(<SentinelButton variant="danger">Danger</SentinelButton>);
    expect(container.firstChild).toHaveClass('text-red-400');
  });

  it('has rounded-full class (pill shape)', () => {
    const { container } = render(<SentinelButton>Pill</SentinelButton>);
    expect(container.firstChild).toHaveClass('rounded-full');
  });
});
