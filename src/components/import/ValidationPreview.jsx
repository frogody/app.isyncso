import React, { useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Transform functions
const transformers = {
  // Parse European price format "€ 53,64" → 53.64
  // Handles: "€ 53,64", "â ¬53,64" (encoding issue), "53.64", 53.64 (number)
  parsePrice: (value) => {
    if (value === null || value === undefined || value === '') return null;

    // If already a number, return it directly
    if (typeof value === 'number') {
      return value > 0 ? value : null;
    }

    let str = String(value).trim();

    // Remove common currency symbols and encoding variations
    // â ¬ is UTF-8 encoded € displayed in wrong encoding
    str = str
      .replace(/â\s*¬/g, '')  // UTF-8 encoding issue for €
      .replace(/[€$£¤]/g, '') // Currency symbols
      .replace(/EUR|USD|GBP/gi, '') // Currency codes
      .trim();

    // If empty after cleaning, return null
    if (!str) return null;

    // Detect format: European (1.234,56) vs US (1,234.56)
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    let cleaned;
    if (hasComma && hasDot) {
      // Both present - determine which is decimal separator
      const lastComma = str.lastIndexOf(',');
      const lastDot = str.lastIndexOf('.');

      if (lastComma > lastDot) {
        // European: 1.234,56 - comma is decimal
        cleaned = str.replace(/\./g, '').replace(',', '.');
      } else {
        // US: 1,234.56 - dot is decimal
        cleaned = str.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Only comma - likely European decimal: 53,64
      cleaned = str.replace(',', '.');
    } else {
      // Only dot or no separator - treat as standard decimal
      cleaned = str;
    }

    // Remove any remaining non-numeric chars except dot
    cleaned = cleaned.replace(/[^\d.]/g, '');

    const result = parseFloat(cleaned);
    return isNaN(result) ? null : (result > 0 ? result : null);
  },

  // Parse quantity - allows 0 as valid
  parseQuantity: (value) => {
    if (value === null || value === undefined || value === '') return null;

    // If already a number
    if (typeof value === 'number') {
      return Math.max(0, Math.round(value));
    }

    const str = String(value).trim();
    // Remove any non-numeric characters
    const cleaned = str.replace(/[^\d.-]/g, '');
    const num = parseInt(cleaned, 10);

    return isNaN(num) ? null : Math.max(0, num);
  },

  // Extract EAN from mixed data (order numbers, etc.)
  extractEAN: (value) => {
    if (!value || value === 'X' || value === 'x') return null;
    const str = String(value).trim();

    // EAN-13: exactly 13 digits
    if (/^\d{13}$/.test(str)) return str;

    // EAN-8: exactly 8 digits
    if (/^\d{8}$/.test(str)) return str;

    // Could also be 12 digits (UPC-A)
    if (/^\d{12}$/.test(str)) return str;

    // Try to extract EAN from mixed string (e.g., "SO11012418" has no EAN)
    // Only extract if it's clearly a standalone number
    const match13 = str.match(/^(\d{13})$/);
    if (match13) return match13[1];

    const match12 = str.match(/^(\d{12})$/);
    if (match12) return match12[1];

    const match8 = str.match(/^(\d{8})$/);
    if (match8) return match8[1];

    return null;
  },

  // Parse date (multiple formats)
  parseDate: (value) => {
    if (!value) return null;

    // If it's a number, treat as Excel serial date
    if (typeof value === 'number') {
      if (value > 25000 && value < 60000) {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      return null;
    }

    const str = String(value).trim();

    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return str;

    // Try to parse as Excel date number (string)
    if (/^\d+$/.test(str)) {
      const excelDate = parseInt(str, 10);
      if (excelDate > 25000 && excelDate < 60000) {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
    }

    return null;
  },

  // Clean string value
  cleanString: (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }
};

// Validate a transformed row
const validateRow = (row) => {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!row.name?.trim()) {
    errors.push('Product name is required');
  }

  // Price must be present and positive
  if (row.purchase_price === null || row.purchase_price === undefined) {
    errors.push('Price is required');
  } else if (row.purchase_price <= 0) {
    errors.push('Price must be greater than 0');
  }

  // Quantity must be present (0 is valid for "not yet received")
  if (row.quantity === null || row.quantity === undefined) {
    errors.push('Quantity is required');
  }

  // Warnings
  if (!row.ean) {
    warnings.push('No EAN - limited enrichment');
  }

  if (!row.supplier) {
    warnings.push('No supplier specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export function ValidationPreview({
  sourceColumns = [],
  rows = [],
  mappings = {},
  onValidationComplete,
  onDeleteRows
}) {
  const [filter, setFilter] = useState('all'); // all, valid, warnings, errors
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedIndices, setDeletedIndices] = useState(new Set());

  // Handle row deletion
  const handleDeleteRow = (rowIndex) => {
    setDeletedIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(rowIndex);
      return newSet;
    });
  };

  // Transform all rows based on mappings
  const transformedData = useMemo(() => {
    // Debug: log mappings on first run
    console.log('Current mappings:', mappings);
    console.log('Source columns:', sourceColumns.map(c => c.name));

    return rows.map((row, index) => {
      const transformed = { _rowIndex: index + 2 }; // +2 for 1-based index + header row

      // Apply mappings and transformations
      Object.entries(mappings).forEach(([sourceCol, targetField]) => {
        // Try exact match first, then try trimmed match (handles trailing spaces in column names)
        let colIndex = sourceColumns.findIndex(c => c.name === sourceCol);
        if (colIndex === -1) {
          // Try trimmed match - CSV columns often have trailing spaces
          colIndex = sourceColumns.findIndex(c => c.name.trim() === sourceCol.trim());
        }
        if (colIndex === -1) {
          console.warn(`Column not found: "${sourceCol}" (available: ${sourceColumns.map(c => `"${c.name}"`).join(', ')})`);
          return;
        }

        const rawValue = row[colIndex];

        // Debug first few rows
        if (index < 3) {
          console.log(`Row ${index}, ${sourceCol} -> ${targetField}:`, rawValue, typeof rawValue);
        }

        switch (targetField) {
          case 'purchase_price':
            transformed.purchase_price = transformers.parsePrice(rawValue);
            transformed._raw_price = rawValue;
            break;
          case 'quantity':
            transformed.quantity = transformers.parseQuantity(rawValue);
            transformed._raw_quantity = rawValue;
            break;
          case 'ean':
            transformed.ean = transformers.extractEAN(rawValue);
            transformed._raw_ean = rawValue;
            break;
          case 'purchase_date':
            transformed.purchase_date = transformers.parseDate(rawValue);
            transformed._raw_date = rawValue;
            break;
          default:
            transformed[targetField] = transformers.cleanString(rawValue);
        }
      });

      // Debug: log transformed row for first few
      if (index < 3) {
        console.log(`Transformed row ${index}:`, transformed);
      }

      // Validate
      const validation = validateRow(transformed);

      return {
        ...transformed,
        _validation: validation
      };
    });
  }, [rows, mappings, sourceColumns]);

  // Get non-deleted data
  const activeData = useMemo(() => {
    return transformedData.filter(r => !deletedIndices.has(r._rowIndex));
  }, [transformedData, deletedIndices]);

  // Filter data
  const filteredData = useMemo(() => {
    let data = activeData;

    // Apply status filter
    if (filter === 'valid') {
      data = data.filter(r => r._validation.isValid && r._validation.warnings.length === 0);
    } else if (filter === 'warnings') {
      data = data.filter(r => r._validation.isValid && r._validation.warnings.length > 0);
    } else if (filter === 'errors') {
      data = data.filter(r => !r._validation.isValid);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.ean?.includes(q) ||
        r.supplier?.toLowerCase().includes(q)
      );
    }

    return data;
  }, [activeData, filter, searchQuery]);

  // Calculate stats (excluding deleted rows)
  const stats = useMemo(() => {
    const valid = activeData.filter(r => r._validation.isValid && r._validation.warnings.length === 0).length;
    const warnings = activeData.filter(r => r._validation.isValid && r._validation.warnings.length > 0).length;
    const errors = activeData.filter(r => !r._validation.isValid).length;
    const deleted = deletedIndices.size;

    return { total: activeData.length, valid, warnings, errors, deleted };
  }, [activeData, deletedIndices]);

  // Notify parent of validation results (only non-deleted rows)
  React.useEffect(() => {
    onValidationComplete?.({
      transformedData: activeData,
      stats,
      canImport: stats.errors === 0 && stats.total > 0
    });
  }, [activeData, stats, onValidationComplete]);

  return (
    <div className="space-y-6">
      {/* Debug: Current Mappings */}
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/10 text-xs">
        <div className="font-medium text-zinc-400 mb-2">Current Column Mappings:</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(mappings).map(([source, target]) => (
            <span key={source} className="px-2 py-1 rounded bg-zinc-700 text-zinc-300">
              {source} → <span className="text-cyan-400">{target}</span>
            </span>
          ))}
          {Object.keys(mappings).length === 0 && (
            <span className="text-red-400">No mappings defined!</span>
          )}
        </div>
        <div className="mt-2 text-zinc-500">
          Required: name, purchase_price, quantity |
          Mapped: {Object.values(mappings).includes('name') ? '✓' : '✗'} name,
          {Object.values(mappings).includes('purchase_price') ? '✓' : '✗'} price,
          {Object.values(mappings).includes('quantity') ? '✓' : '✗'} qty
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-colors",
            filter === 'all' ? "bg-white/10 border-white/20" : "bg-zinc-900/50 border-white/5 hover:border-white/10"
          )}
          onClick={() => setFilter('all')}
        >
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-zinc-500">Total Rows</div>
        </div>

        <div
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-colors",
            filter === 'valid' ? "bg-cyan-500/20 border-cyan-500/30" : "bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/30"
          )}
          onClick={() => setFilter('valid')}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            <div className="text-2xl font-bold text-cyan-400">{stats.valid}</div>
          </div>
          <div className="text-sm text-cyan-400/70">Valid</div>
        </div>

        <div
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-colors",
            filter === 'warnings' ? "bg-amber-500/20 border-amber-500/30" : "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/30"
          )}
          onClick={() => setFilter('warnings')}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div className="text-2xl font-bold text-amber-400">{stats.warnings}</div>
          </div>
          <div className="text-sm text-amber-400/70">Warnings</div>
        </div>

        <div
          className={cn(
            "p-4 rounded-lg border cursor-pointer transition-colors",
            filter === 'errors' ? "bg-red-500/20 border-red-500/30" : "bg-red-500/10 border-red-500/20 hover:border-red-500/30"
          )}
          onClick={() => setFilter('errors')}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
          </div>
          <div className="text-sm text-red-400/70">Errors</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-zinc-900/50 border-white/10 text-white"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400 w-12">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400 w-12">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">EAN</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Supplier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Issues</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.slice(0, 100).map((row) => (
                <tr
                  key={row._rowIndex}
                  className={cn(
                    "transition-colors",
                    !row._validation.isValid
                      ? "bg-red-500/5"
                      : row._validation.warnings.length > 0
                      ? "bg-amber-500/5"
                      : "hover:bg-white/5"
                  )}
                >
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {row._rowIndex}
                  </td>
                  <td className="px-4 py-3">
                    {!row._validation.isValid ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : row._validation.warnings.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-medium",
                      row.name ? "text-white" : "text-red-400"
                    )}>
                      {row.name || '(missing)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "font-mono text-sm",
                      row.purchase_price > 0 ? "text-white" : "text-red-400"
                    )}
                    title={row._raw_price !== undefined ? `Raw: ${JSON.stringify(row._raw_price)}` : 'No mapping'}
                    >
                      {row.purchase_price > 0 ? `€${row.purchase_price.toFixed(2)}` : (
                        <span>
                          (missing)
                          {row._raw_price !== undefined && (
                            <span className="block text-xs text-zinc-500 mt-0.5">
                              raw: {String(row._raw_price).substring(0, 20)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "font-mono text-sm",
                      row.quantity !== null && row.quantity !== undefined ? "text-white" : "text-red-400"
                    )}
                    title={row._raw_quantity !== undefined ? `Raw: ${JSON.stringify(row._raw_quantity)}` : 'No mapping'}
                    >
                      {row.quantity !== null && row.quantity !== undefined ? row.quantity : (
                        <span>
                          (missing)
                          {row._raw_quantity !== undefined && (
                            <span className="block text-xs text-zinc-500 mt-0.5">
                              raw: {String(row._raw_quantity).substring(0, 20)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.ean ? (
                      <span className="font-mono text-sm text-cyan-400">{row.ean}</span>
                    ) : (
                      <span className="text-sm text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-400">
                      {row.supplier || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row._validation.errors.map((err, i) => (
                        <Badge key={i} className="bg-red-500/20 text-red-400 text-xs">
                          {err}
                        </Badge>
                      ))}
                      {row._validation.warnings.map((warn, i) => (
                        <Badge key={i} className="bg-amber-500/20 text-amber-400 text-xs">
                          {warn}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRow(row._rowIndex)}
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length > 100 && (
          <div className="p-4 text-center text-sm text-zinc-500 border-t border-white/5">
            Showing first 100 of {filteredData.length} rows
          </div>
        )}
      </div>

      {filteredData.length === 0 && (
        <div className="p-12 text-center text-zinc-500">
          No rows match the current filter
        </div>
      )}
    </div>
  );
}

export default ValidationPreview;
