/**
 * NestUploadWizard - Multi-step wizard for uploading nest data with AI field mapping
 *
 * Steps:
 * 1. Upload - Select and parse CSV/XLSX file
 * 2. Map Columns - AI-powered field mapping with manual override
 * 3. Review - Preview and validate mapped data
 * 4. Import - Execute import with progress tracking
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Columns3,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUploader } from '@/components/import/FileUploader';
import { ColumnMapper } from '@/components/import/ColumnMapper';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Translate technical database errors to user-friendly messages
function formatErrorMessage(error) {
  // Extract row number
  const rowMatch = error.match(/^(Row \d+):/);
  const rowPrefix = rowMatch ? rowMatch[1] + ': ' : '';

  // Common error patterns and their user-friendly translations
  const translations = [
    { pattern: /Could not find.*column.*in the schema cache/i, message: 'Database schema issue - please contact support' },
    { pattern: /duplicate key value violates unique constraint/i, message: 'This record already exists (duplicate email or ID)' },
    { pattern: /violates foreign key constraint/i, message: 'Referenced data not found' },
    { pattern: /null value in column.*violates not-null constraint/i, message: 'Missing required field' },
    { pattern: /value too long for type/i, message: 'Text is too long for one of the fields' },
    { pattern: /invalid input syntax for type/i, message: 'Invalid data format (check numbers and dates)' },
    { pattern: /permission denied/i, message: 'Permission denied - contact admin' },
    { pattern: /connection.*refused|timeout/i, message: 'Connection issue - please try again' },
    { pattern: /Failed to update existing candidate/i, message: 'Could not update existing record' },
    { pattern: /Failed to create candidate/i, message: 'Could not create new record' },
    { pattern: /Failed to link to nest/i, message: 'Could not add to this nest' },
    { pattern: /no data returned/i, message: 'Record was not saved properly' },
  ];

  for (const { pattern, message } of translations) {
    if (pattern.test(error)) {
      return rowPrefix + message;
    }
  }

  // If no pattern matches, clean up the error a bit
  let cleanError = error
    .replace(/Row \d+:\s*/i, '')
    .replace(/Failed to \w+ existing candidate\s*-\s*/i, '')
    .replace(/Failed to create candidate\s*-\s*/i, '')
    .replace(/Failed to link to nest\s*-\s*/i, '');

  // Truncate very long errors
  if (cleanError.length > 80) {
    cleanError = cleanError.substring(0, 77) + '...';
  }

  return rowPrefix + cleanError;
}

// Target fields for each nest type - must match map-nest-columns edge function
const NEST_TARGET_FIELDS = {
  candidates: [
    // Person basic info
    { id: 'first_name', label: 'First Name', required: false, description: 'Person\'s first name' },
    { id: 'last_name', label: 'Last Name', required: false, description: 'Person\'s last name' },
    { id: 'email', label: 'Email', required: false, description: 'Person\'s email address' },
    { id: 'phone', label: 'Phone', required: false, description: 'Phone number' },
    { id: 'linkedin_profile', label: 'LinkedIn Profile', required: false, description: 'Person\'s LinkedIn profile URL' },
    { id: 'profile_image_url', label: 'Profile Image', required: false, description: 'Profile photo URL' },

    // Person professional info
    { id: 'job_title', label: 'Job Title', required: false, description: 'Current job title/position' },
    { id: 'skills', label: 'Skills', required: false, description: 'Technical or professional skills' },
    { id: 'years_experience', label: 'Years Experience', required: false, description: 'Years of experience' },
    { id: 'education', label: 'Education', required: false, description: 'Educational background' },
    { id: 'salary_range', label: 'Salary Range', required: false, description: 'Expected or current salary' },

    // Person location
    { id: 'person_home_location', label: 'Person Location', required: false, description: 'Home location/city' },
    { id: 'work_address', label: 'Work Address', required: false, description: 'Work/office address' },

    // Company info
    { id: 'company_name', label: 'Company Name', required: false, description: 'Current employer' },
    { id: 'company_domain', label: 'Company Domain', required: false, description: 'Company website domain' },
    { id: 'company_hq', label: 'Company HQ', required: false, description: 'Company headquarters' },
    { id: 'company_linkedin', label: 'Company LinkedIn', required: false, description: 'Company LinkedIn page' },
    { id: 'company_description', label: 'Company Description', required: false, description: 'Description of company' },
    { id: 'company_type', label: 'Company Type', required: false, description: 'Private, Public, etc' },
    { id: 'industry', label: 'Industry', required: false, description: 'Industry sector' },
    { id: 'company_size', label: 'Company Size', required: false, description: 'Size category (51-200)' },
    { id: 'employee_count', label: 'Employee Count', required: false, description: 'Number of employees' },

    // Enrichment data (field names match TalentCandidateProfile.jsx)
    { id: 'times_promoted', label: 'Times Promoted', required: false, description: 'Promotions at current company' },
    { id: 'times_company_hopped', label: 'Company Changes', required: false, description: 'Number of job changes/company hops' },
    { id: 'years_at_company', label: 'Years at Company', required: false, description: 'Years at current company' },
    { id: 'job_satisfaction', label: 'Job Satisfaction', required: false, description: 'Satisfaction level' },
    { id: 'estimated_age_range', label: 'Estimated Age', required: false, description: 'Estimated age range' },
    { id: 'market_position', label: 'Market Position', required: false, description: 'Market position analysis' },
    { id: 'employee_growth_rate', label: 'Employee Growth', required: false, description: 'Company growth rate' },
    { id: 'recruitment_urgency', label: 'Recruitment Urgency', required: false, description: 'Urgency level' },

    // Analysis/Report fields (displayed on profile)
    { id: 'experience_report', label: 'Experience Report', required: false, description: 'Career experience analysis' },
    { id: 'experience_analysis', label: 'Experience Analysis', required: false, description: 'Professional experience analysis' },
    { id: 'job_satisfaction_analysis', label: 'Job Satisfaction Analysis', required: false, description: 'Detailed satisfaction analysis' },
    { id: 'avg_promotion_threshold', label: 'Avg Promotion Time', required: false, description: 'Average years between promotions' },
    { id: 'outreach_urgency_reasoning', label: 'Outreach Urgency Reasoning', required: false, description: 'Reasoning for urgency level' },
    { id: 'recent_ma_news', label: 'Recent M&A News', required: false, description: 'Recent merger/acquisition news' },
  ],
  prospects: [
    { id: 'first_name', label: 'First Name', required: false, description: 'Person\'s first name' },
    { id: 'last_name', label: 'Last Name', required: false, description: 'Person\'s last name' },
    { id: 'email', label: 'Email', required: false, description: 'Email address' },
    { id: 'phone', label: 'Phone', required: false, description: 'Phone number' },
    { id: 'company', label: 'Company', required: false, description: 'Company name' },
    { id: 'job_title', label: 'Job Title', required: false, description: 'Job title/position' },
    { id: 'linkedin_url', label: 'LinkedIn URL', required: false, description: 'LinkedIn profile' },
    { id: 'industry', label: 'Industry', required: false, description: 'Industry sector' },
    { id: 'deal_value', label: 'Deal Value', required: false, description: 'Potential deal value' },
    { id: 'website', label: 'Website', required: false, description: 'Company website' },
    { id: 'company_size', label: 'Company Size', required: false, description: 'Company size' },
    { id: 'location', label: 'Location', required: false, description: 'Location/city' },
  ],
  investors: [
    { id: 'name', label: 'Name', required: false, description: 'Investor name' },
    { id: 'firm', label: 'Firm', required: false, description: 'Investment firm' },
    { id: 'email', label: 'Email', required: false, description: 'Email address' },
    { id: 'investor_type', label: 'Investor Type', required: false, description: 'Type (VC, Angel, etc)' },
    { id: 'check_size_min', label: 'Min Check Size', required: false, description: 'Minimum investment' },
    { id: 'check_size_max', label: 'Max Check Size', required: false, description: 'Maximum investment' },
    { id: 'focus_areas', label: 'Focus Areas', required: false, description: 'Investment focus areas' },
    { id: 'linkedin', label: 'LinkedIn URL', required: false, description: 'LinkedIn profile' },
    { id: 'website', label: 'Website', required: false, description: 'Firm website' },
  ],
};

const STEPS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'map', label: 'Map Columns', icon: Columns3 },
  { id: 'review', label: 'Review', icon: Eye },
  { id: 'import', label: 'Import', icon: CheckCircle },
];

export function NestUploadWizard({
  open,
  onOpenChange,
  nestId,
  nestType,
  nestName,
  onImportComplete,
}) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // File state
  const [fileData, setFileData] = useState(null);

  // Mapping state
  const [mappings, setMappings] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [aiConfidence, setAiConfidence] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState(null);

  // Get target fields for current nest type
  const targetFields = NEST_TARGET_FIELDS[nestType] || NEST_TARGET_FIELDS.candidates;

  // Handle file processed
  const handleFileProcessed = useCallback((data) => {
    setFileData(data);
    // Auto-advance to mapping step
    setCurrentStep(1);
    // Auto-request AI suggestions
    requestAISuggestions(data.headers);
  }, []);

  // Request AI suggestions for column mapping
  const requestAISuggestions = async (headers) => {
    setIsLoadingAI(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/map-nest-columns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            headers: headers.map(h => h.name),
            sampleData: headers.map(h => h.samples?.slice(0, 3).join(' | ') || ''),
            detectedTypes: headers.map(h => h.detectedType || 'unknown'),
            nestType: nestType
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.mappings) {
          setAiSuggestions(result.mappings);
          setAiConfidence(result.confidence || 0.8);
          setMappings(result.mappings);
        }
      } else {
        console.error('AI mapping failed:', await response.text());
      }
    } catch (error) {
      console.error('AI mapping error:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle mapping changes
  const handleMappingChange = useCallback((newMappings) => {
    setMappings(newMappings);
  }, []);

  // Validate data before import
  const validateData = useCallback(() => {
    if (!fileData?.rows || !mappings) return { validRows: [], invalidRows: [] };

    const validRows = [];
    const invalidRows = [];

    fileData.rows.forEach((row, index) => {
      const mappedData = {};
      const errors = [];

      // Map row data according to mappings
      Object.entries(mappings).forEach(([sourceCol, targetField]) => {
        if (targetField && targetField !== 'skip') {
          const colIndex = fileData.headers.findIndex(h => h.name === sourceCol);
          if (colIndex !== -1) {
            mappedData[targetField] = row[colIndex]?.toString()?.trim() || '';
          }
        }
      });

      // Check for at least some identifying data
      const hasIdentifier = nestType === 'investors'
        ? (mappedData.name || mappedData.firm || mappedData.email)
        : (mappedData.first_name || mappedData.last_name || mappedData.email || mappedData.company || mappedData.company_name);

      if (!hasIdentifier) {
        errors.push('Row must have at least a name, email, or company');
      }

      if (errors.length > 0) {
        invalidRows.push({ index, data: mappedData, errors });
      } else {
        validRows.push({ index, data: mappedData });
      }
    });

    return { validRows, invalidRows, total: fileData.rows.length };
  }, [fileData, mappings, nestType]);

  // Execute import
  const executeImport = async () => {
    const validation = validateData();
    if (!validation || validation.validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validation.validRows.length });
    setCurrentStep(3);

    try {
      // Send all rows to the edge function for batch processing
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/upload-nest-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            nest_id: nestId,
            nest_type: nestType,
            mappings: mappings,
            rows: validation.validRows.map(r => r.data)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults({
        created: result.created_count || 0,
        updated: result.updated_count || 0,
        linked: result.linked_count || 0,
        failed: result.error_count || 0,
        total: validation.validRows.length,
        errors: result.errors || [], // Capture error details
        itemCount: result.item_count || 0
      });

      // Build descriptive toast message
      const parts = [];
      if (result.created_count > 0) parts.push(`${result.created_count} new`);
      if (result.updated_count > 0) parts.push(`${result.updated_count} updated`);
      if (result.linked_count > 0) parts.push(`${result.linked_count} linked`);
      toast.success(`Import complete: ${parts.join(', ') || '0 items'}`);

      if (onImportComplete) {
        onImportComplete(result);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Import failed');
      setImportResults({
        created: 0,
        failed: validation.validRows.length,
        total: validation.validRows.length,
        error: error.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Reset wizard
  const resetWizard = () => {
    setCurrentStep(0);
    setFileData(null);
    setMappings({});
    setAiSuggestions({});
    setAiConfidence(0);
    setImportResults(null);
  };

  // Handle close
  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!fileData;
      case 1: return Object.keys(mappings).length > 0;
      case 2: return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (currentStep === 2) {
      executeImport();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-white">Upload {nestType} data</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Upload a CSV or Excel file with your {nestType} data
              </p>
            </div>
            <FileUploader
              onFileProcessed={handleFileProcessed}
              isProcessing={false}
            />
          </div>
        );

      case 1: // Map Columns
        return (
          <div className="space-y-6">
            {fileData && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">{fileData.fileName}</p>
                  <p className="text-xs text-zinc-500">{fileData.totalRows} rows, {fileData.headers.length} columns</p>
                </div>
              </div>
            )}
            <ColumnMapper
              sourceColumns={fileData?.headers || []}
              targetFields={targetFields}
              aiSuggestions={aiSuggestions}
              aiConfidence={aiConfidence}
              isLoadingAI={isLoadingAI}
              onMappingChange={handleMappingChange}
              onRequestAISuggestions={() => requestAISuggestions(fileData?.headers || [])}
            />
          </div>
        );

      case 2: // Review
        const validation = validateData();
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-white">Review Import</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Verify the data before importing
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-white/5 text-center">
                <p className="text-2xl font-bold text-white">{validation.total}</p>
                <p className="text-sm text-zinc-500">Total Rows</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl font-bold text-green-400">{validation.validRows.length}</p>
                <p className="text-sm text-zinc-500">Valid</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-2xl font-bold text-red-400">{validation.invalidRows.length}</p>
                <p className="text-sm text-zinc-500">Invalid</p>
              </div>
            </div>

            {/* Mapped Fields Summary */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-white/5">
              <h4 className="text-sm font-medium text-white mb-3">Mapped Fields</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(mappings).map(([source, target]) => {
                  if (target === 'skip') return null;
                  const field = targetFields.find(f => f.id === target);
                  return (
                    <Badge key={source} variant="outline" className="text-xs">
                      {source} → {field?.label || target}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Preview Table */}
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="bg-zinc-900/50 px-4 py-2 border-b border-white/10">
                <span className="text-sm font-medium text-white">Preview (first 5 rows)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-800/50">
                      {Object.entries(mappings).slice(0, 6).map(([source, target]) => {
                        if (target === 'skip') return null;
                        const field = targetFields.find(f => f.id === target);
                        return (
                          <th key={source} className="px-3 py-2 text-left text-xs font-medium text-zinc-400">
                            {field?.label || target}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {validation.validRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        {Object.entries(mappings).slice(0, 6).map(([source, target]) => {
                          if (target === 'skip') return null;
                          return (
                            <td key={source} className="px-3 py-2 text-sm text-zinc-300 max-w-[150px] truncate">
                              {row.data[target] || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invalid Rows Warning */}
            {validation.invalidRows.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    {validation.invalidRows.length} rows will be skipped
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  These rows don't have enough identifying information (name, email, or company)
                </p>
              </div>
            )}
          </div>
        );

      case 3: // Import
        return (
          <div className="space-y-6">
            <div className="text-center">
              {isImporting ? (
                <>
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white">Importing...</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Please wait while we import your data
                  </p>
                </>
              ) : importResults ? (
                <>
                  {importResults.error ? (
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  ) : (
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  )}
                  <h3 className="text-lg font-medium text-white">
                    {importResults.error ? 'Import Failed' : 'Import Complete'}
                  </h3>
                </>
              ) : null}
            </div>

            {importResults && (
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-2xl font-bold text-green-400">{importResults.created}</p>
                  <p className="text-xs text-zinc-500">New</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-2xl font-bold text-blue-400">{importResults.updated || 0}</p>
                  <p className="text-xs text-zinc-500">Updated</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                  <p className="text-2xl font-bold text-purple-400">{importResults.linked || 0}</p>
                  <p className="text-xs text-zinc-500">Linked</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-2xl font-bold text-red-400">{importResults.failed}</p>
                  <p className="text-xs text-zinc-500">Failed</p>
                </div>
              </div>
            )}

            {/* Summary info */}
            {importResults && (importResults.updated > 0 || importResults.linked > 0 || importResults.itemCount > 0) && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5">
                <p className="text-xs text-zinc-400 space-y-1">
                  {importResults.updated > 0 && (
                    <span className="block">• <span className="text-blue-400">{importResults.updated}</span> existing candidates in this nest were updated with new data</span>
                  )}
                  {importResults.linked > 0 && (
                    <span className="block">• <span className="text-purple-400">{importResults.linked}</span> existing candidates from other nests were linked to this nest</span>
                  )}
                  {importResults.itemCount > 0 && (
                    <span className="block mt-2 text-zinc-500">Total items in nest: <span className="text-white">{importResults.itemCount}</span></span>
                  )}
                </p>
              </div>
            )}

            {/* Error details */}
            {importResults?.errors?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">
                    {importResults.failed} row{importResults.failed !== 1 ? 's' : ''} failed to import
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResults.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-300/80">
                      {formatErrorMessage(error)}
                    </p>
                  ))}
                </div>
                {importResults.failed > importResults.errors.length && (
                  <p className="text-xs text-zinc-500 mt-2">
                    ...and {importResults.failed - importResults.errors.length} more errors
                  </p>
                )}
              </div>
            )}

            {importResults && !importResults.error && (
              <div className="text-center">
                <Button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700">
                  Done
                </Button>
              </div>
            )}

            {importResults?.error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{importResults.error}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            Upload Data to "{nestName}"
          </DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
                  isActive && "bg-cyan-500/20 text-cyan-400",
                  isCompleted && "bg-green-500/20 text-green-400",
                  !isActive && !isCompleted && "text-zinc-500"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-12 h-px mx-2",
                    isCompleted ? "bg-green-500/50" : "bg-white/10"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        {currentStep < 3 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentStep === 0}
              className="text-zinc-400"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canGoNext() || isLoadingAI}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {currentStep === 2 ? (
                <>
                  Import {validateData().validRows.length} items
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default NestUploadWizard;
