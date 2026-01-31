import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentGenerator from './DocumentGenerator';

// Mock the hooks
const mockSetSelectedSystem = vi.fn();
const mockSetDocType = vi.fn();
const mockSetSearchTerm = vi.fn();
const mockGoBack = vi.fn();

const MOCK_SYSTEMS = [
  { id: '1', name: 'HR AI System', purpose: 'Employee screening', risk_classification: 'high-risk', compliance_status: 'not-started' },
  { id: '2', name: 'Credit Scorer', purpose: 'Credit assessment', risk_classification: 'high-risk', compliance_status: 'in-progress' },
];

vi.mock('@/hooks/sentinel', () => ({
  useDocumentGenerator: () => ({
    systems: MOCK_SYSTEMS,
    filtered: MOCK_SYSTEMS,
    selectedSystem: null,
    docType: null,
    searchTerm: '',
    loading: false,
    error: null,
    setSelectedSystem: mockSetSelectedSystem,
    setDocType: mockSetDocType,
    setSearchTerm: mockSetSearchTerm,
    goBack: mockGoBack,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/utils', () => ({
  createPageUrl: (page: string) => `/${page.toLowerCase()}`,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DocumentGenerator />
    </MemoryRouter>
  );
}

describe('DocumentGenerator - Step 1: System Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Document Generator')).toBeInTheDocument();
  });

  it('shows system count', () => {
    renderPage();
    expect(screen.getByText(/2 high-risk systems/)).toBeInTheDocument();
  });

  it('renders all systems', () => {
    renderPage();
    expect(screen.getByText('HR AI System')).toBeInTheDocument();
    expect(screen.getByText('Credit Scorer')).toBeInTheDocument();
  });

  it('calls setSelectedSystem when system card is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('HR AI System'));
    expect(mockSetSelectedSystem).toHaveBeenCalledWith(MOCK_SYSTEMS[0]);
  });

  it('renders search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search systems...')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    renderPage();
    expect(screen.getByText('High-Risk Systems')).toBeInTheDocument();
    expect(screen.getByText('Docs Required')).toBeInTheDocument();
  });

  it('renders Dashboard link', () => {
    renderPage();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
