import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  Users,
  FileSpreadsheet
} from 'lucide-react';

// CSV column to database column mapping
const COLUMN_MAPPING = {
  'first_Name': 'first_name',
  'first_name': 'first_name',
  'First Name': 'first_name',
  'last_name': 'last_name',
  'Last Name': 'last_name',
  'Job_Title': 'job_title',
  'Job Title': 'job_title',
  'Person Home Location': 'person_home_location',
  'Location': 'person_home_location',
  'Company Name': 'company_name',
  'Company': 'company_name',
  'Company HQ': 'company_hq',
  'Company Domain': 'company_domain',
  'Domain': 'company_domain',
  'Industry': 'industry',
  'Company Size': 'company_size',
  'Employee Count': 'company_employee_count',
  'Company LinkedIn': 'company_linkedin_url',
  'Description': 'company_description',
  'Company Description': 'company_description',
  'Type': 'company_type',
  'Company Type': 'company_type',
  'linkedIn_profile': 'linkedin_profile',
  'LinkedIn Profile': 'linkedin_profile',
  'LinkedIn': 'linkedin_profile',
  'Email': 'email',
  'email': 'email',
  'Phone': 'phone',
  'phone': 'phone',
  'Recent M&A News': 'recent_ma_news',
  'M&A News': 'recent_ma_news',
  'Work Address': 'work_address',
  'Accounting Experience Analysis': 'experience_analysis',
  'Experience Analysis': 'experience_analysis',
  'Experience report': 'experience_report',
  'Experience Report': 'experience_report',
  'Salary Intelligence': 'salary_intelligence',
  'Salary_Range': 'salary_range',
  'Salary Range': 'salary_range',
  'Market_Position': 'market_position',
  'Market Position': 'market_position',
  'Find Company Headcount Growth': 'company_headcount_growth',
  'Company Headcount Growth': 'company_headcount_growth',
  'Headcount Growth': 'company_headcount_growth',
  'Percent Employee Growth Over Last_12Months': 'company_growth_percentage',
  'Employee Growth %': 'company_growth_percentage',
  'Growth Percentage': 'company_growth_percentage',
  'Job Satisfaction Analysis': 'job_satisfaction_analysis',
  'Job Satisfaction': 'job_satisfaction',
  'Reasoning - Job Satisfaction': 'job_satisfaction_reasoning',
  'Job Satisfaction Reasoning': 'job_satisfaction_reasoning',
  'Job Changes & Promotions': 'career_changes',
  'Career Changes': 'career_changes',
  'Times_Promoted Current Company': 'times_promoted',
  'Times Promoted': 'times_promoted',
  'Average Threshold Towards Promotion In Years': 'avg_promotion_threshold',
  'Avg Promotion Threshold': 'avg_promotion_threshold',
  'Years With Current Company': 'years_at_company',
  'Years at Company': 'years_at_company',
  'Times_Hopped Company': 'times_company_hopped',
  'Times Company Hopped': 'times_company_hopped',
  'Estimated Age Range': 'estimated_age_range',
  'Age Range': 'estimated_age_range',
  'Recruitment Urgency': 'recruitment_urgency',
  'Reasoning Outreach Urgency': 'outreach_urgency_reasoning',
  'Outreach Urgency Reasoning': 'outreach_urgency_reasoning',
};

// Numeric fields that need type conversion
const NUMERIC_FIELDS = [
  'company_employee_count',
  'salary_range',
  'company_growth_percentage',
  'times_promoted',
  'avg_promotion_threshold',
  'years_at_company',
  'times_company_hopped',
];

export function CandidateImportModal({ isOpen, onClose, onImportComplete }) {
  const { user } = useUser();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [mappedColumns, setMappedColumns] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [step, setStep] = useState('upload'); // upload, preview, importing, results

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setPreviewData([]);
    setMappedColumns([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResults(null);
    setStep('upload');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const mapCsvRow = (row) => {
    const mapped = {};
    Object.entries(row).forEach(([csvColumn, value]) => {
      const dbColumn = COLUMN_MAPPING[csvColumn] || COLUMN_MAPPING[csvColumn.trim()];
      if (dbColumn && value !== undefined && value !== null && value !== '') {
        // Convert numeric fields
        if (NUMERIC_FIELDS.includes(dbColumn)) {
          const numValue = parseFloat(value);
          mapped[dbColumn] = isNaN(numValue) ? null : numValue;
        } else {
          mapped[dbColumn] = String(value).trim();
        }
      }
    });
    return mapped;
  };

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        const data = results.data;
        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        // Get mapped columns for display
        const csvColumns = Object.keys(data[0]);
        const mapped = csvColumns
          .map(col => ({ csv: col, db: COLUMN_MAPPING[col] || COLUMN_MAPPING[col.trim()] }))
          .filter(m => m.db);

        setMappedColumns(mapped);
        setParsedData(data);
        setPreviewData(data.slice(0, 5).map(mapCsvRow));
        setStep('preview');
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      }
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    handleFileSelect(selectedFile);
  }, [handleFileSelect]);

  const findDuplicatesInCsv = (rows) => {
    const seen = new Map();
    const duplicates = [];
    const unique = [];

    rows.forEach((row, index) => {
      const key = `${(row.first_name || '').toLowerCase()}_${(row.last_name || '').toLowerCase()}`;
      if (key === '_') {
        // Skip rows without names
        return;
      }
      if (seen.has(key)) {
        duplicates.push({ row, index, reason: 'Duplicate in CSV' });
      } else {
        seen.set(key, true);
        unique.push(row);
      }
    });

    return { unique, duplicates };
  };

  const checkDatabaseDuplicates = async (rows) => {
    if (!user?.organization_id || rows.length === 0) return { newRows: rows, dbDuplicates: [] };

    // Get all first_name + last_name combinations to check
    const namesToCheck = rows
      .filter(r => r.first_name && r.last_name)
      .map(r => ({ first: r.first_name.toLowerCase(), last: r.last_name.toLowerCase() }));

    if (namesToCheck.length === 0) return { newRows: rows, dbDuplicates: [] };

    // Query existing candidates
    const { data: existingCandidates, error } = await supabase
      .from('candidates')
      .select('first_name, last_name')
      .eq('organization_id', user.organization_id);

    if (error) {
      console.error('Error checking duplicates:', error);
      return { newRows: rows, dbDuplicates: [] };
    }

    // Create a set of existing name combinations
    const existingSet = new Set(
      (existingCandidates || []).map(c =>
        `${(c.first_name || '').toLowerCase()}_${(c.last_name || '').toLowerCase()}`
      )
    );

    const newRows = [];
    const dbDuplicates = [];

    rows.forEach((row, index) => {
      const key = `${(row.first_name || '').toLowerCase()}_${(row.last_name || '').toLowerCase()}`;
      if (existingSet.has(key)) {
        dbDuplicates.push({ row, index, reason: 'Already exists in database' });
      } else {
        newRows.push(row);
      }
    });

    return { newRows, dbDuplicates };
  };

  const importCandidates = async () => {
    if (!user?.organization_id) {
      toast.error('No organization found');
      return;
    }

    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    try {
      // Map all CSV rows
      const allMapped = parsedData.map(mapCsvRow).filter(r => r.first_name || r.last_name);

      if (allMapped.length === 0) {
        toast.error('No valid candidates found in CSV');
        setStep('preview');
        setIsImporting(false);
        return;
      }

      // Check for duplicates in CSV
      const { unique: csvUnique, duplicates: csvDuplicates } = findDuplicatesInCsv(allMapped);
      setImportProgress(10);

      // Check for duplicates in database
      const { newRows, dbDuplicates } = await checkDatabaseDuplicates(csvUnique);
      setImportProgress(20);

      const allDuplicates = [...csvDuplicates, ...dbDuplicates];

      if (newRows.length === 0) {
        setImportResults({
          total: allMapped.length,
          imported: 0,
          duplicates: allDuplicates.length,
          errors: 0,
          duplicateDetails: allDuplicates,
        });
        setStep('results');
        setIsImporting(false);
        return;
      }

      // Import in batches of 50
      const BATCH_SIZE = 50;
      let imported = 0;
      let errors = 0;
      const progressPerBatch = 70 / Math.ceil(newRows.length / BATCH_SIZE);

      for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batch = newRows.slice(i, i + BATCH_SIZE).map(row => ({
          ...row,
          organization_id: user.organization_id,
          import_source: file.name,
          imported_at: new Date().toISOString(),
          created_date: new Date().toISOString(),
          contact_status: 'new',
        }));

        const { error } = await supabase.from('candidates').insert(batch);

        if (error) {
          console.error('Batch insert error:', error);
          errors += batch.length;
        } else {
          imported += batch.length;
        }

        setImportProgress(20 + ((i + BATCH_SIZE) / newRows.length) * 70);
      }

      setImportProgress(100);

      setImportResults({
        total: allMapped.length,
        imported,
        duplicates: allDuplicates.length,
        errors,
        duplicateDetails: allDuplicates,
      });

      setStep('results');

      if (imported > 0) {
        toast.success(`Successfully imported ${imported} candidates`);
        onImportComplete?.();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import candidates');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-400" />
            Import Candidates from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 mt-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-red-400 bg-red-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-red-400' : 'text-zinc-500'}`} />
              <p className="text-white font-medium mb-2">
                Drag & drop your CSV file here
              </p>
              <p className="text-zinc-500 text-sm">
                or click to browse
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Supported columns:</h4>
              <div className="flex flex-wrap gap-1">
                {['first_Name', 'last_name', 'Job_Title', 'Company Name', 'LinkedIn', 'Email', 'Industry', 'Recruitment Urgency'].map(col => (
                  <Badge key={col} variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-400 text-xs">
                    {col}
                  </Badge>
                ))}
                <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-500 text-xs">
                  +30 more
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-400" />
                <span className="text-white font-medium">{file?.name}</span>
              </div>
              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">
                {parsedData.length} candidates found
              </Badge>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">Mapped columns ({mappedColumns.length}):</h4>
              <div className="flex flex-wrap gap-1">
                {mappedColumns.slice(0, 15).map(({ csv, db }) => (
                  <Badge key={csv} variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-xs">
                    {csv} → {db}
                  </Badge>
                ))}
                {mappedColumns.length > 15 && (
                  <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-500 text-xs">
                    +{mappedColumns.length - 15} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Preview (first 5 rows):</h4>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-800">
                      <th className="p-2 text-left text-zinc-400 font-medium">Name</th>
                      <th className="p-2 text-left text-zinc-400 font-medium">Title</th>
                      <th className="p-2 text-left text-zinc-400 font-medium">Company</th>
                      <th className="p-2 text-left text-zinc-400 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t border-zinc-800">
                        <td className="p-2 text-white">
                          {row.first_name} {row.last_name}
                        </td>
                        <td className="p-2 text-zinc-400">{row.job_title || '-'}</td>
                        <td className="p-2 text-zinc-400">{row.company_name || '-'}</td>
                        <td className="p-2 text-zinc-400">{row.person_home_location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">Duplicate Detection Enabled</p>
                <p className="text-amber-400/70">
                  Candidates with matching first + last names will be skipped (both within CSV and existing database records).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetState}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Choose Different File
              </Button>
              <Button
                onClick={importCandidates}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Import {parsedData.length} Candidates
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-6 mt-4 py-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-red-400 animate-spin" />
              <p className="text-white font-medium mb-2">Importing candidates...</p>
              <p className="text-zinc-500 text-sm">This may take a moment</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progress</span>
                <span className="text-white">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="h-2 bg-zinc-800" />
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && importResults && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{importResults.total}</p>
                <p className="text-zinc-500 text-sm">Total in CSV</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="text-3xl font-bold text-green-400">{importResults.imported}</p>
                </div>
                <p className="text-green-400/70 text-sm">Imported</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <p className="text-3xl font-bold text-amber-400">{importResults.duplicates}</p>
                </div>
                <p className="text-amber-400/70 text-sm">Skipped (Duplicates)</p>
              </div>
            </div>

            {importResults.errors > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm">
                  {importResults.errors} candidates failed to import due to errors
                </p>
              </div>
            )}

            {importResults.duplicateDetails.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">Skipped duplicates:</h4>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-zinc-800">
                        <th className="p-2 text-left text-zinc-400 font-medium">Name</th>
                        <th className="p-2 text-left text-zinc-400 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResults.duplicateDetails.slice(0, 20).map((dup, index) => (
                        <tr key={index} className="border-t border-zinc-800">
                          <td className="p-2 text-zinc-300">
                            {dup.row.first_name} {dup.row.last_name}
                          </td>
                          <td className="p-2 text-amber-400 text-xs">{dup.reason}</td>
                        </tr>
                      ))}
                      {importResults.duplicateDetails.length > 20 && (
                        <tr className="border-t border-zinc-800">
                          <td colSpan={2} className="p-2 text-zinc-500 text-center">
                            +{importResults.duplicateDetails.length - 20} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleClose}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CandidateImportModal;
