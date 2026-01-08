import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FileUploader({ onFileProcessed, isProcessing }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [parseStatus, setParseStatus] = useState(null);

  const parseFile = async (file) => {
    setParseStatus('parsing');
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Read with options to preserve raw values and handle encoding
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        raw: false,         // Get formatted values (includes currency symbols)
        cellDates: true,    // Parse dates as JS Date objects
        codepage: 65001     // UTF-8 encoding
      });

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON with headers - preserve types
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,         // Get formatted strings to preserve currency symbols
        dateNF: 'yyyy-mm-dd' // Standardize date format
      });

      if (rawData.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = rawData[0].map((h, i) => {
        // Trim whitespace from column names - CSV often has trailing spaces
        const name = String(h || `Column ${i + 1}`).trim();
        return {
          index: i,
          name: name,
          originalName: name
        };
      });

      const rows = rawData.slice(1).filter(row =>
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      // Get sample data for each column (first 5 non-empty values)
      // Preserve both raw and display values for better AI analysis
      const sampleData = headers.map((header, colIndex) => {
        const samples = [];
        const rawSamples = [];
        for (let i = 0; i < rows.length && samples.length < 5; i++) {
          const value = rows[i][colIndex];
          if (value !== null && value !== undefined && value !== '') {
            // Keep original value for display and type detection
            samples.push(String(value));
            rawSamples.push(value);
          }
        }
        return {
          ...header,
          samples,
          rawSamples, // Preserve original types (number, Date, etc.)
          // Detect likely data type from samples
          detectedType: detectDataType(rawSamples)
        };
      });

      // Helper function to detect data type
      function detectDataType(values) {
        if (!values.length) return 'unknown';

        const types = values.map(v => {
          if (typeof v === 'number') return 'number';
          if (v instanceof Date) return 'date';
          const str = String(v);
          if (/^[\d.,\s€$£¥]+$/i.test(str) && str.match(/[€$£¥]|eur|usd/i)) return 'currency';
          if (/^\d{8,13}$/.test(str)) return 'barcode';
          if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(str)) return 'date';
          return 'text';
        });

        // Return most common type
        const counts = {};
        types.forEach(t => counts[t] = (counts[t] || 0) + 1);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      }

      setParseStatus('success');

      onFileProcessed({
        fileName: file.name,
        fileSize: file.size,
        sheetName,
        headers: sampleData,
        rows,
        totalRows: rows.length
      });

    } catch (err) {
      console.error('File parse error:', err);
      setError(err.message || 'Failed to parse file');
      setParseStatus('error');
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    await parseFile(uploadedFile);
  }, [onFileProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
    setParseStatus(null);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
            isDragActive
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-white/10 hover:border-cyan-500/50 hover:bg-white/5",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Upload className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your inventory file'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                Supports .xlsx, .xls, and .csv files
              </p>
            </div>
            <Button variant="outline" className="mt-2">
              Browse Files
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(
          "rounded-xl border p-6",
          parseStatus === 'success' ? "border-green-500/30 bg-green-500/5" :
          parseStatus === 'error' ? "border-red-500/30 bg-red-500/5" :
          "border-white/10 bg-zinc-900/50"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                parseStatus === 'success' ? "bg-green-500/20" :
                parseStatus === 'error' ? "bg-red-500/20" :
                "bg-cyan-500/20"
              )}>
                <FileSpreadsheet className={cn(
                  "w-6 h-6",
                  parseStatus === 'success' ? "text-green-400" :
                  parseStatus === 'error' ? "text-red-400" :
                  "text-cyan-400"
                )} />
              </div>
              <div>
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-sm text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {parseStatus === 'parsing' && (
                <span className="text-sm text-cyan-400 animate-pulse">
                  Parsing...
                </span>
              )}
              {parseStatus === 'success' && (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Parsed
                </span>
              )}
              {parseStatus === 'error' && (
                <span className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FileUploader;
