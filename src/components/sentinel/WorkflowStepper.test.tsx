import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkflowStepper from './WorkflowStepper';

function renderStepper(systems: any[] = []) {
  return render(
    <MemoryRouter>
      <WorkflowStepper systems={systems} />
    </MemoryRouter>
  );
}

describe('WorkflowStepper', () => {
  it('renders all 4 steps', () => {
    renderStepper();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Classify')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
  });

  it('shows "START HERE" when no systems registered', () => {
    renderStepper([]);
    expect(screen.getByText('START HERE')).toBeInTheDocument();
  });

  it('does not show "START HERE" when systems exist', () => {
    renderStepper([{ id: '1', risk_classification: 'unclassified', compliance_status: 'not-started' }]);
    expect(screen.queryByText('START HERE')).not.toBeInTheDocument();
  });

  it('shows system count', () => {
    renderStepper([
      { id: '1', risk_classification: 'high-risk', compliance_status: 'compliant' },
      { id: '2', risk_classification: 'minimal-risk', compliance_status: 'not-started' },
    ]);
    expect(screen.getByText('2 systems')).toBeInTheDocument();
  });

  it('shows pending classification count', () => {
    renderStepper([
      { id: '1', risk_classification: 'unclassified', compliance_status: 'not-started' },
      { id: '2', risk_classification: 'high-risk', compliance_status: 'not-started' },
    ]);
    expect(screen.getByText('1 pending')).toBeInTheDocument();
  });

  it('shows "All classified" when no unclassified systems', () => {
    renderStepper([
      { id: '1', risk_classification: 'high-risk', compliance_status: 'not-started' },
      { id: '2', risk_classification: 'minimal-risk', compliance_status: 'not-started' },
    ]);
    expect(screen.getByText('All classified')).toBeInTheDocument();
  });

  it('calculates task count from high-risk systems (22 per system)', () => {
    renderStepper([
      { id: '1', risk_classification: 'high-risk', compliance_status: 'not-started' },
      { id: '2', risk_classification: 'high-risk', compliance_status: 'not-started' },
    ]);
    expect(screen.getByText('44 tasks')).toBeInTheDocument();
  });

  it('renders step links', () => {
    renderStepper();
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(4);
  });
});
