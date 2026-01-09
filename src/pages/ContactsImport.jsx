import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Upload, Columns, CheckCircle, Download, Sparkles, Users,
  ArrowLeft, ArrowRight, FileSpreadsheet, Building2, Target,
  TrendingUp, UserCheck, Handshake, UserPlus, Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

import { FileUploader } from '@/components/import/FileUploader';
import { ColumnMapper } from '@/components/import/ColumnMapper';

const STEPS = [
  { id: 'upload', title: 'Upload File', icon: Upload, description: 'Upload your contacts spreadsheet' },
  { id: 'type', title: 'Contact Type', icon: Users, description: 'Select contact type for import' },
  { id: 'map', title: 'Map Columns', icon: Columns, description: 'Match columns to contact fields' },
  { id: 'validate', title: 'Review Data', icon: CheckCircle, description: 'Review and validate data' },
  { id: 'import', title: 'Import', icon: Download, description: 'Import contacts to CRM' }
];

// Contact types for selection
const CONTACT_TYPES = [
  { id: 'lead', label: 'Leads', icon: Target, description: 'Unqualified contacts for initial outreach', color: 'zinc' },
  { id: 'prospect', label: 'Prospects', icon: TrendingUp, description: 'Qualified leads in sales pipeline', color: 'blue' },
  { id: 'customer', label: 'Customers', icon: UserCheck, description: 'Paying customers with active relationships', color: 'green' },
  { id: 'partner', label: 'Partners', icon: Handshake, description: 'Business partners and affiliates', color: 'purple' },
  { id: 'candidate', label: 'Candidates', icon: UserPlus, description: 'Job applicants and HR contacts', color: 'rose' },
  { id: 'target', label: 'Targets', icon: Crosshair, description: 'Target accounts for outbound', color: 'amber' },
];

// Target fields for contact mapping
const CONTACT_TARGET_FIELDS = [
  { id: 'first_name', label: 'First Name', required: false, description: 'Contact first name' },
  { id: 'last_name', label: 'Last Name', required: false, description: 'Contact last name' },
  { id: 'full_name', label: 'Full Name', required: false, description: 'Full name (will split into first/last)' },
  { id: 'email', label: 'Email', required: false, description: 'Email address' },
  { id: 'phone', label: 'Phone', required: false, description: 'Phone number' },
  { id: 'company', label: 'Company', required: false, description: 'Company name' },
  { id: 'job_title', label: 'Job Title', required: false, description: 'Job title or position' },
  { id: 'location', label: 'Location', required: false, description: 'City, country, or full address' },
  { id: 'website', label: 'Website', required: false, description: 'Company or personal website' },
  { id: 'linkedin_url', label: 'LinkedIn URL', required: false, description: 'LinkedIn profile URL' },
  { id: 'source', label: 'Source', required: false, description: 'How the contact was acquired' },
  { id: 'notes', label: 'Notes', required: false, description: 'Additional notes' },
  { id: 'deal_value', label: 'Deal Value', required: false, description: 'Potential deal value' },
  { id: 'tags', label: 'Tags', required: false, description: 'Tags or labels (comma-separated)' },
  { id: 'industry', label: 'Industry', required: false, description: 'Industry sector' },
  { id: 'company_size', label: 'Company Size', required: false, description: 'Number of employees' },
  { id: 'skip', label: 'Skip this column', required: false, description: 'Do not import this column' },
];

export default function ContactsImport() {
  const { user } = useUser();
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // File upload state
  const [fileData, setFileData] = useState(null);

  // Contact type state
  const [selectedContactType, setSelectedContactType] = useState('lead');

  // Column mapping state
  const [mappings, setMappings] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [aiConfidence, setAiConfidence] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  // Handle file processed
  const handleFileProcessed = useCallback((data) => {
    setFileData(data);
    // Auto-advance to type selection step
    setCurrentStep(1);
  }, []);

  // Handle type selection and request AI suggestions
  const handleTypeSelected = async () => {
    setCurrentStep(2);
    // Request AI suggestions for column mapping
    if (fileData?.headers) {
      requestAISuggestions(fileData.headers);
    }
  };

  // Request AI column mapping suggestions
  const requestAISuggestions = async (headers) => {
    setIsLoadingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/map-contact-columns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            headers: headers.map(h => h.name),
            sampleData: headers.map(h => h.samples?.slice(0, 3).join(' | ') || ''),
            detectedTypes: headers.map(h => h.detectedType || 'unknown'),
            contactType: selectedContactType
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
      }
    } catch (error) {
      console.error('AI mapping error:', error);
      // Fallback to manual mapping
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle mapping changes
  const handleMappingChange = useCallback((newMappings) => {
    setMappings(newMappings);
  }, []);

  // Handle validation complete
  const handleValidationComplete = useCallback((result) => {
    setValidationResult(result);
  }, []);

  // Validate data before import
  const validateData = () => {
    if (!fileData || !fileData.rows) return null;

    const validRows = [];
    const invalidRows = [];

    fileData.rows.forEach((row, index) => {
      const errors = [];
      const mappedData = {};

      // Map row data according to mappings
      Object.entries(mappings).forEach(([sourceCol, targetField]) => {
        if (targetField && targetField !== 'skip') {
          const colIndex = fileData.headers.findIndex(h => h.name === sourceCol);
          if (colIndex !== -1) {
            mappedData[targetField] = row[colIndex]?.toString()?.trim() || '';
          }
        }
      });

      // Check for at least some identifying info
      const hasName = mappedData.first_name || mappedData.last_name || mappedData.full_name;
      const hasEmail = mappedData.email;
      const hasCompany = mappedData.company;

      if (!hasName && !hasEmail && !hasCompany) {
        errors.push('Row must have at least a name, email, or company');
      }

      // Validate email format if provided
      if (mappedData.email && !isValidEmail(mappedData.email)) {
        errors.push('Invalid email format');
      }

      if (errors.length > 0) {
        invalidRows.push({ index, data: mappedData, errors });
      } else {
        validRows.push({ index, data: mappedData });
      }
    });

    return {
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows,
      total: fileData.rows.length
    };
  };

  // Simple email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Execute import
  const executeImport = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to import contacts');
      return;
    }

    const validation = validateData();
    if (!validation || validation.validCount === 0) {
      toast.error('No valid contacts to import');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validation.validCount });
    setImportErrors([]);

    const results = {
      created: 0,
      duplicates: 0,
      failed: 0,
    };

    try {
      for (let i = 0; i < validation.validRows.length; i++) {
        const { data } = validation.validRows[i];
        setImportProgress({ current: i + 1, total: validation.validCount });

        try {
          // Parse name
          let firstName = data.first_name || '';
          let lastName = data.last_name || '';

          if (!firstName && !lastName && data.full_name) {
            const nameParts = data.full_name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }

          // Check for duplicate by email
          if (data.email) {
            const { data: existing } = await supabase
              .from('prospects')
              .select('id')
              .eq('owner_id', user.id)
              .eq('email', data.email)
              .single();

            if (existing) {
              results.duplicates++;
              continue;
            }
          }

          // Create contact
          const contactData = {
            owner_id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            job_title: data.job_title || null,
            location: data.location || null,
            website: data.website || null,
            linkedin_url: data.linkedin_url || null,
            source: data.source || 'import',
            notes: data.notes || null,
            deal_value: data.deal_value ? parseFloat(data.deal_value) : null,
            industry: data.industry || null,
            company_size: data.company_size || null,
            contact_type: selectedContactType,
            stage: 'new',
            probability: 50,
            created_date: new Date().toISOString(),
          };

          // Parse tags if provided
          if (data.tags) {
            contactData.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
          }

          const { error } = await supabase
            .from('prospects')
            .insert(contactData);

          if (error) {
            throw error;
          }

          results.created++;
        } catch (error) {
          console.error('Failed to import contact:', error);
          results.failed++;
          setImportErrors(prev => [...prev, {
            row: i + 1,
            data,
            error: error.message
          }]);
        }
      }

      setImportResults(results);
      toast.success(`Imported ${results.created} contacts`);

    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Navigate back to CRM
  const goToCRM = () => {
    navigate('/crmcontacts');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload
        return (
          <GlassCard className="p-6">
            <div className="text-center mb-6">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white mb-2">Upload Contacts File</h2>
              <p className="text-zinc-400 text-sm">
                Upload a CSV or Excel file containing your contacts
              </p>
            </div>
            <FileUploader
              onFileProcessed={handleFileProcessed}
              isProcessing={false}
            />
            {fileData && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  Found {fileData.totalRows} contacts with {fileData.headers.length} columns
                </p>
              </div>
            )}
          </GlassCard>
        );

      case 1: // Type Selection
        return (
          <GlassCard className="p-6">
            <div className="text-center mb-6">
              <Users className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white mb-2">Select Contact Type</h2>
              <p className="text-zinc-400 text-sm">
                What type of contacts are you importing?
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CONTACT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedContactType === type.id;
                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedContactType(type.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    )}
                  >
                    <Icon className={cn(
                      "w-8 h-8 mb-3",
                      isSelected ? "text-cyan-400" : "text-zinc-400"
                    )} />
                    <h3 className={cn(
                      "font-medium mb-1",
                      isSelected ? "text-white" : "text-zinc-300"
                    )}>
                      {type.label}
                    </h3>
                    <p className="text-xs text-zinc-500">{type.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        );

      case 2: // Map Columns
        return (
          <GlassCard className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Map Columns</h2>
              <p className="text-zinc-400 text-sm">
                Match your spreadsheet columns to contact fields
              </p>
              {aiConfidence > 0 && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-cyan-400">
                    AI suggested mappings ({Math.round(aiConfidence * 100)}% confidence)
                  </span>
                </div>
              )}
            </div>
            <ColumnMapper
              sourceColumns={fileData?.headers || []}
              targetFields={CONTACT_TARGET_FIELDS}
              aiSuggestions={aiSuggestions}
              aiConfidence={aiConfidence}
              isLoadingAI={isLoadingAI}
              onMappingChange={handleMappingChange}
              onRequestAISuggestions={requestAISuggestions}
            />
          </GlassCard>
        );

      case 3: // Validate
        const previewData = validateData();
        return (
          <GlassCard className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Review Data</h2>
              <p className="text-zinc-400 text-sm">
                Review the data before importing ({previewData?.validRows?.length || 0} valid contacts found)
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{previewData?.validRows?.length || 0}</div>
                <div className="text-xs text-zinc-400">Valid contacts</div>
              </div>
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{previewData?.invalidRows?.length || 0}</div>
                <div className="text-xs text-zinc-400">Invalid rows</div>
              </div>
            </div>

            {/* Preview Table */}
            {previewData?.validRows?.length > 0 && (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-900/50 border-b border-white/10">
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Company</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewData.validRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white">
                            {row.data.first_name || row.data.full_name || '-'} {row.data.last_name || ''}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{row.data.email || '-'}</td>
                          <td className="px-4 py-3 text-zinc-400">{row.data.company || '-'}</td>
                          <td className="px-4 py-3 text-zinc-400">{row.data.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.validRows.length > 10 && (
                  <div className="p-3 text-center text-sm text-zinc-500 border-t border-white/10">
                    Showing first 10 of {previewData.validRows.length} contacts
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {previewData?.invalidRows?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-red-400 mb-2">Rows with errors:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {previewData.invalidRows.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                      <span className="text-red-400">Row {item.index + 2}:</span>
                      <span className="text-zinc-400 ml-2">{item.errors.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        );

      case 4: // Import
        return (
          <GlassCard className="p-6">
            <div className="text-center">
              {isImporting ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                  <h2 className="text-xl font-semibold text-white mb-2">Importing Contacts...</h2>
                  <p className="text-zinc-400 text-sm mb-4">
                    {importProgress.current} of {importProgress.total} contacts
                  </p>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : importResults ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <h2 className="text-xl font-semibold text-white mb-2">Import Complete!</h2>
                  <div className="grid grid-cols-3 gap-4 my-6">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{importResults.created}</div>
                      <div className="text-xs text-zinc-400">Created</div>
                    </div>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">{importResults.duplicates}</div>
                      <div className="text-xs text-zinc-400">Duplicates</div>
                    </div>
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">{importResults.failed}</div>
                      <div className="text-xs text-zinc-400">Failed</div>
                    </div>
                  </div>
                  <Button onClick={goToCRM} className="bg-cyan-600 hover:bg-cyan-500">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Contacts in CRM
                  </Button>
                </>
              ) : (
                <>
                  <Download className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                  <h2 className="text-xl font-semibold text-white mb-2">Ready to Import</h2>
                  <p className="text-zinc-400 text-sm mb-6">
                    {validationResult?.validCount || 0} contacts will be imported as {
                      CONTACT_TYPES.find(t => t.id === selectedContactType)?.label || 'contacts'
                    }
                  </p>
                  <Button onClick={executeImport} className="bg-cyan-600 hover:bg-cyan-500">
                    <Download className="w-4 h-4 mr-2" />
                    Start Import
                  </Button>
                </>
              )}
            </div>
          </GlassCard>
        );

      default:
        return null;
    }
  };

  // Can proceed to next step?
  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!fileData;
      case 1: return !!selectedContactType;
      case 2: return Object.keys(mappings).length > 0;
      case 3: {
        // Check if we have valid data
        const result = validateData();
        return result && result.validRows && result.validRows.length > 0;
      }
      case 4: return !!importResults;
      default: return false;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === 1) {
      handleTypeSelected();
    } else if (currentStep === 3) {
      // Validate and store result before advancing to import
      const result = validateData();
      setValidationResult(result);
      setCurrentStep(currentStep + 1);
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToCRM}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Import Contacts</h1>
            <p className="text-sm text-zinc-400">Import contacts from CSV or Excel files</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
                    isActive && "bg-cyan-500 text-white",
                    isComplete && "bg-green-500 text-white",
                    !isActive && !isComplete && "bg-zinc-800 text-zinc-500"
                  )}>
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:block",
                    isActive && "text-white",
                    !isActive && "text-zinc-500"
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStep ? "bg-green-500" : "bg-zinc-700"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || isImporting}
            className="border-zinc-700 text-zinc-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isImporting}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
