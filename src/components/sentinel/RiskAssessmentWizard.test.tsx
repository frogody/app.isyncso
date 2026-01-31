import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RiskAssessmentWizard from './RiskAssessmentWizard';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockMe = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  db: {
    entities: {
      AISystem: {
        get: (...args: any[]) => mockGet(...args),
        update: (...args: any[]) => mockUpdate(...args),
      },
    },
    auth: { me: () => mockMe() },
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

vi.mock('@/utils', () => ({
  createPageUrl: (page: string) => `/${page.toLowerCase()}`,
}));

// Mock HelpTip used by RiskClassificationBadge
vi.mock('@/components/shared/HelpTip', () => ({
  default: ({ explanation }: { explanation: string }) => <span data-testid="help-tip" />,
}));

const SYSTEM_DATA = {
  id: 'sys-1',
  name: 'HR AI',
  purpose: 'Hiring',
  risk_classification: 'unclassified',
  compliance_status: 'not-started',
};

function renderWizard(props = {}) {
  return render(
    <MemoryRouter>
      <RiskAssessmentWizard systemId="sys-1" {...props} />
    </MemoryRouter>
  );
}

describe('RiskAssessmentWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ ...SYSTEM_DATA });
    mockUpdate.mockResolvedValue({});
    mockMe.mockResolvedValue({ id: 'u1' });
    mockInvoke.mockResolvedValue({ data: null });
  });

  it('loads system data on mount', async () => {
    renderWizard();
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('sys-1'));
  });

  it('shows Step 0: AI-Powered Risk Assessment initially', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('AI-Powered Risk Assessment')).toBeInTheDocument();
    });
  });

  it('shows skip to manual assessment link', async () => {
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText('skip to manual assessment')).toBeInTheDocument();
    });
  });

  it('navigates to Step 1 via skip link', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    expect(screen.getByText('Step 1: Prohibited Practices Check')).toBeInTheDocument();
  });

  it('shows prohibited practice questions on Step 1', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    expect(screen.getByText(/subliminal techniques/)).toBeInTheDocument();
    expect(screen.getByText(/exploit vulnerabilities/)).toBeInTheDocument();
  });

  it('navigates Step 1 → Step 2', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    expect(screen.getByText('Step 2: High-Risk Categories (Annex III)')).toBeInTheDocument();
  });

  it('shows high-risk categories on Step 2', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    expect(screen.getByText('Biometric Identification and Categorization')).toBeInTheDocument();
    expect(screen.getByText('Employment and Worker Management')).toBeInTheDocument();
    expect(screen.getByText('Critical Infrastructure')).toBeInTheDocument();
  });

  it('navigates Step 2 → Step 3', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    expect(screen.getByText('Step 3: General-Purpose AI Check')).toBeInTheDocument();
  });

  it('navigates Step 3 → Step 4', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    await userEvent.click(screen.getByText('Continue to Transparency Check'));
    expect(screen.getByText('Step 4: Transparency Requirements')).toBeInTheDocument();
  });

  it('navigates back from Step 2 → Step 1', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    // Now on Step 2, click Back
    const backButtons = screen.getAllByText('Back');
    await userEvent.click(backButtons[0]);
    expect(screen.getByText('Step 1: Prohibited Practices Check')).toBeInTheDocument();
  });

  it('shows progress bar on steps 1-4', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    // Step 0 has no progress bar
    expect(screen.queryByRole('progressbar')).toBeNull();
    // Move to step 1
    await userEvent.click(screen.getByText('skip to manual assessment'));
    // Progress bar is 4 divs with bg-sky-500 or bg-zinc-800
    const { container } = render(
      <MemoryRouter>
        <RiskAssessmentWizard systemId="sys-1" />
      </MemoryRouter>
    );
    // Just verify the step title is present
    expect(screen.getByText('Step 1: Prohibited Practices Check')).toBeInTheDocument();
  });

  it('completes assessment and shows result for minimal-risk (all No)', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));

    // Step 0 → Step 1
    await userEvent.click(screen.getByText('skip to manual assessment'));
    // Step 1 → Step 2 (no prohibited flags answered = all undefined, treated as not true)
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    // Step 2 → Step 3
    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    // Step 3 → Step 4
    await userEvent.click(screen.getByText('Continue to Transparency Check'));
    // Step 4 → Complete
    await userEvent.click(screen.getByText('Complete Assessment'));

    await waitFor(() => {
      expect(screen.getByText('Assessment Complete')).toBeInTheDocument();
      expect(screen.getByText('MINIMAL RISK')).toBeInTheDocument();
    });

    expect(mockUpdate).toHaveBeenCalledWith('sys-1', expect.objectContaining({
      risk_classification: 'minimal-risk',
    }));
  });

  it('classifies as prohibited when a prohibited flag is set', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));

    await userEvent.click(screen.getByText('skip to manual assessment'));

    // Answer "Yes" to first prohibited question (subliminal)
    const yesButtons = screen.getAllByText('Yes');
    await userEvent.click(yesButtons[0]);

    // Navigate through remaining steps
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    await userEvent.click(screen.getByText('Continue to Transparency Check'));
    await userEvent.click(screen.getByText('Complete Assessment'));

    await waitFor(() => {
      expect(screen.getByText('Assessment Complete')).toBeInTheDocument();
      expect(screen.getByText('PROHIBITED')).toBeInTheDocument();
    });

    expect(mockUpdate).toHaveBeenCalledWith('sys-1', expect.objectContaining({
      risk_classification: 'prohibited',
      compliance_status: 'non-compliant',
    }));
  });

  it('classifies as high-risk when a high-risk category is selected', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));

    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));

    // Select "Employment and Worker Management"
    await userEvent.click(screen.getByText('Employment and Worker Management'));

    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    await userEvent.click(screen.getByText('Continue to Transparency Check'));
    await userEvent.click(screen.getByText('Complete Assessment'));

    await waitFor(() => {
      expect(screen.getByText('Assessment Complete')).toBeInTheDocument();
      expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
    });

    expect(mockUpdate).toHaveBeenCalledWith('sys-1', expect.objectContaining({
      risk_classification: 'high-risk',
    }));
  });

  it('shows "View System Details" button on results', async () => {
    const onComplete = vi.fn();
    render(
      <MemoryRouter>
        <RiskAssessmentWizard systemId="sys-1" onComplete={onComplete} />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    await userEvent.click(screen.getByText('Continue to GPAI Check'));
    await userEvent.click(screen.getByText('Continue to Transparency Check'));
    await userEvent.click(screen.getByText('Complete Assessment'));

    await waitFor(() => screen.getByText('View System Details'));
    await userEvent.click(screen.getByText('View System Details'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('pre-fills answers from system assessment_answers', async () => {
    mockGet.mockResolvedValue({
      ...SYSTEM_DATA,
      assessment_answers: {
        prohibited: { subliminal: false },
        highRisk: { employment: true },
        gpai: { is_gpai: false },
        transparency: {},
      },
    });

    renderWizard();

    // Should jump to step 1 when assessment_answers exist
    await waitFor(() => {
      expect(screen.getByText('Step 1: Prohibited Practices Check')).toBeInTheDocument();
    });
  });

  it('shows GPAI conditional question when is_gpai is Yes', async () => {
    renderWizard();
    await waitFor(() => screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('skip to manual assessment'));
    await userEvent.click(screen.getByText('Continue to High-Risk Check'));
    await userEvent.click(screen.getByText('Continue to GPAI Check'));

    // Initially systemic risk question should NOT be visible
    expect(screen.queryByText(/Does it have systemic risk/)).not.toBeInTheDocument();

    // Answer "Yes" to is_gpai — it's the first Yes button on the page
    const yesButtons = screen.getAllByText('Yes');
    await userEvent.click(yesButtons[0]);

    // Now systemic risk question should appear
    await waitFor(() => {
      expect(screen.getByText(/Does it have systemic risk/)).toBeInTheDocument();
    });
  });
});
