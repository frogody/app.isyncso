import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AISystemModal from './AISystemModal';

// Mock supabase
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockMe = vi.fn();
const mockList = vi.fn();
const mockFilter = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  db: {
    entities: {
      AISystem: {
        create: (...args: any[]) => mockCreate(...args),
        update: (...args: any[]) => mockUpdate(...args),
      },
      Prospect: { list: () => mockList() },
      Company: {
        list: () => mockList(),
        filter: (...args: any[]) => mockFilter(...args),
        create: (...args: any[]) => mockCreate(...args),
      },
    },
    auth: { me: () => mockMe() },
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

describe('AISystemModal', () => {
  const defaultProps = {
    system: null,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onCreateAndAssess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockMe.mockResolvedValue({ id: 'u1', company_id: 'c1', email: 'test@acme.com' });
    mockCreate.mockResolvedValue({ id: 'new-sys-1' });
  });

  it('shows "Register New AI System" title for new system', () => {
    render(<AISystemModal {...defaultProps} />);
    expect(screen.getByText('Register New AI System')).toBeInTheDocument();
  });

  it('shows "Edit AI System" title when editing', () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Test' }} />);
    expect(screen.getByText('Edit AI System')).toBeInTheDocument();
  });

  it('starts on research step for new system', () => {
    render(<AISystemModal {...defaultProps} />);
    expect(screen.getByText('Research with CIDE')).toBeInTheDocument();
  });

  it('starts on form step when editing existing system', () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Existing System' }} />);
    expect(screen.getByText('System Name *')).toBeInTheDocument();
  });

  it('navigates from research to form via "skip to manual entry"', async () => {
    render(<AISystemModal {...defaultProps} />);
    const skipLink = screen.getByText('skip to manual entry');
    await userEvent.click(skipLink);
    expect(screen.getByText('System Name *')).toBeInTheDocument();
  });

  it('pre-populates form fields when editing', () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'AI Bot', purpose: 'Customer support', description: 'A chatbot' }} />);
    expect(screen.getByDisplayValue('AI Bot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Customer support')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A chatbot')).toBeInTheDocument();
  });

  it('shows validation error when no AI techniques and name+purpose filled', async () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot', purpose: 'Test purpose' }} />);
    const submitButton = screen.getByText('Update System');
    await userEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please select at least one AI technique')).toBeInTheDocument();
    });
  });

  it('shows validation error when no AI techniques selected', async () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot', purpose: 'Test' }} />);
    const submitButton = screen.getByText('Update System');
    await userEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Please select at least one AI technique')).toBeInTheDocument();
    });
  });

  it('renders AI technique options', async () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot' }} />);
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByText('Generative AI')).toBeInTheDocument();
    expect(screen.getByText('Natural Language Processing')).toBeInTheDocument();
  });

  it('toggles AI technique selection (class changes on click)', async () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot' }} />);
    const mlButton = screen.getByText('Machine Learning').closest('button')!;
    const classBefore = mlButton.className;
    await userEvent.click(mlButton);
    const classAfter = mlButton.className;
    // Class should change after clicking (selected state differs from unselected)
    expect(classAfter).not.toBe(classBefore);
    // Click again to deselect — should return to original
    await userEvent.click(mlButton);
    expect(mlButton.className).toBe(classBefore);
  });

  it('calls onClose when Cancel is clicked', async () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot' }} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave after successful edit', async () => {
    mockUpdate.mockResolvedValueOnce({});
    render(
      <AISystemModal
        {...defaultProps}
        system={{ id: '1', name: 'Bot', purpose: 'Test', ai_techniques: ['machine-learning'] }}
      />
    );
    await userEvent.click(screen.getByText('Update System'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Bot' }));
      expect(defaultProps.onSave).toHaveBeenCalled();
    });
  });

  it('calls onCreateAndAssess after successful create', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'new-123' });
    render(<AISystemModal {...defaultProps} />);

    // Skip to form
    await userEvent.click(screen.getByText('skip to manual entry'));

    // Fill required fields
    const nameInput = screen.getByPlaceholderText('e.g., Customer Support Chatbot');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New AI System');

    const purposeInput = screen.getByPlaceholderText('What does this AI system do?');
    await userEvent.type(purposeInput, 'Automated decisions');

    // Select a technique
    await userEvent.click(screen.getByText('Machine Learning'));

    // Submit
    await userEvent.click(screen.getByText('Save & Continue to Assessment'));

    await waitFor(() => {
      expect(defaultProps.onCreateAndAssess).toHaveBeenCalledWith('new-123');
    });
  });

  it('shows "Back to AI Research" button on form step for new system', async () => {
    render(<AISystemModal {...defaultProps} />);
    await userEvent.click(screen.getByText('skip to manual entry'));
    expect(screen.getByText('Back to AI Research')).toBeInTheDocument();
  });

  it('does not show "Back to AI Research" when editing', () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot' }} />);
    expect(screen.queryByText('Back to AI Research')).not.toBeInTheDocument();
  });

  it('shows CIDE research button', () => {
    render(<AISystemModal {...defaultProps} />);
    expect(screen.getByText('Start CIDE Research')).toBeInTheDocument();
  });

  it('disables CIDE research when product name is empty', () => {
    render(<AISystemModal {...defaultProps} />);
    const cideButton = screen.getByText('Start CIDE Research').closest('button');
    expect(cideButton).toBeDisabled();
  });

  it('shows deployment context dropdown', () => {
    render(<AISystemModal {...defaultProps} system={{ id: '1', name: 'Bot' }} />);
    expect(screen.getByText('Internal Use')).toBeInTheDocument();
  });
});
