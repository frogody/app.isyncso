import React, { useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Transform functions
const transformers = {
  // Parse European price format "€ 53,64" → 53.64
  parsePrice: (value) => {
    if (!value) return 0;
    const str = String(value);
    const cleaned = str
      .replace(/[€$£]/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.'); // Convert decimal separator
    return parseFloat(cleaned) || 0;
  },

  // Parse quantity
  parseQuantity: (value) => {
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  },

  // Extract EAN from mixed data (order numbers, etc.)
  extractEAN: (value) => {
    if (!value || value === 'X') return null;
    const str = String(value).trim();

    // EAN-13: exactly 13 digits
    if (/^\d{13}$/.test(str)) return str;

    // EAN-8: exactly 8 digits
    if (/^\d{8}$/.test(str)) return str;

    // Try to extract EAN from mixed string
    const match13 = str.match(/\b(\d{13})\b/);
    if (match13) return match13[1];

    const match8 = str.match(/\b(\d{8})\b/);
    if (match8) return match8[1];

    return null;
  },

  // Parse date (multiple formats)
  parseDate: (value) => {
    if (!value) return null;
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

    // Try to parse as Excel date number
    if (/^\d+$/.test(str)) {
      const excelDate = parseInt(str, 10);
      if (excelDate > 25000 && excelDate < 50000) {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
    }

    return null;
  },

  // Clean string value
  cleanString: (value) => {
    return value ? String(value).trim() : '';
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

  if (row.purchase_price === undefined || row.purchase_price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (row.quantity === undefined || row.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
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
    return rows.map((row, index) => {
      const transformed = { _rowIndex: index + 2 }; // +2 for 1-based index + header row

      // Apply mappings and transformations
      Object.entries(mappings).forEach(([sourceCol, targetField]) => {
        const colIndex = sourceColumns.findIndex(c => c.name === sourceCol);
        if (colIndex === -1) return;

        const rawValue = row[colIndex];

        switch (targetField) {
          case 'purchase_price':
            transformed.purchase_price = transformers.parsePrice(rawValue);
            transformed._raw_price = rawValue;
            break;
          case 'quantity':
            transformed.quantity = transformers.parseQuantity(rawValue);
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
                    )}>
                      {row.purchase_price > 0 ? `€${row.purchase_price.toFixed(2)}` : '(missing)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      "font-mono text-sm",
                      row.quantity > 0 ? "text-white" : "text-red-400"
                    )}>
                      {row.quantity > 0 ? row.quantity : '(missing)'}
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
