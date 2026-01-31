import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentinelInput } from './SentinelInput';

describe('SentinelInput', () => {
  it('renders an input element', () => {
    render(<SentinelInput placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<SentinelInput label="Name" id="name-input" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor', () => {
    render(<SentinelInput label="Name" id="name-input" />);
    const label = screen.getByText('Name');
    expect(label).toHaveAttribute('for', 'name-input');
  });

  it('shows error message', () => {
    render(<SentinelInput error="Required field" id="test" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('error message has role="alert"', () => {
    render(<SentinelInput error="Required field" id="test" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('sets aria-invalid when error is present', () => {
    render(<SentinelInput error="Bad input" placeholder="input" />);
    expect(screen.getByPlaceholderText('input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby pointing to error id', () => {
    render(<SentinelInput error="Bad input" id="myfield" placeholder="input" />);
    const input = screen.getByPlaceholderText('input');
    expect(input).toHaveAttribute('aria-describedby', 'myfield-error');
  });

  it('does not set aria-describedby when no error', () => {
    render(<SentinelInput id="myfield" placeholder="input" />);
    const input = screen.getByPlaceholderText('input');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('applies error border style when error is present', () => {
    render(<SentinelInput error="Err" placeholder="input" />);
    expect(screen.getByPlaceholderText('input')).toHaveClass('border-red-500/50');
  });

  it('handles onChange events', () => {
    const onChange = vi.fn();
    render(<SentinelInput placeholder="type" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('type'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders search icon for search variant', () => {
    const { container } = render(<SentinelInput variant="search" placeholder="Search" />);
    // Search icon is an SVG from lucide
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies pl-10 for search variant', () => {
    render(<SentinelInput variant="search" placeholder="Search" />);
    expect(screen.getByPlaceholderText('Search')).toHaveClass('pl-10');
  });
});
