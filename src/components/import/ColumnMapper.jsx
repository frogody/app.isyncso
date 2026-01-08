import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Target fields for product import
const TARGET_FIELDS = [
  { id: 'name', label: 'Product Name', required: true, description: 'The product title/name' },
  { id: 'purchase_price', label: 'Purchase Price', required: true, description: 'Unit cost/price (will be parsed from currency format)' },
  { id: 'quantity', label: 'Quantity', required: true, description: 'Stock quantity to import' },
  { id: 'ean', label: 'EAN / Barcode', required: false, description: '13-digit EAN code for product enrichment' },
  { id: 'sku', label: 'SKU', required: false, description: 'Internal product code' },
  { id: 'supplier', label: 'Supplier', required: false, description: 'Supplier/vendor name' },
  { id: 'purchase_date', label: 'Purchase Date', required: false, description: 'Date of purchase (various formats supported)' },
  { id: 'order_number', label: 'Order Number', required: false, description: 'Order or invoice reference' },
  { id: 'category', label: 'Category', required: false, description: 'Product category' },
];

export function ColumnMapper({
  sourceColumns = [],
  aiSuggestions = {},
  aiConfidence = 0,
  isLoadingAI = false,
  onMappingChange,
  onRequestAISuggestions
}) {
  const [mappings, setMappings] = useState({});

  // Apply AI suggestions when they arrive
  useEffect(() => {
    if (aiSuggestions && Object.keys(aiSuggestions).length > 0) {
      setMappings(prev => ({
        ...prev,
        ...aiSuggestions
      }));
    }
  }, [aiSuggestions]);

  // Notify parent of mapping changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  const handleMappingChange = (sourceColumn, targetField) => {
    setMappings(prev => {
      const newMappings = { ...prev };

      // If selecting "skip", remove the mapping
      if (targetField === 'skip') {
        delete newMappings[sourceColumn];
      } else {
        // Remove any existing mapping to this target field
        Object.keys(newMappings).forEach(key => {
          if (newMappings[key] === targetField) {
            delete newMappings[key];
          }
        });
        newMappings[sourceColumn] = targetField;
      }

      return newMappings;
    });
  };

  const getMappedFields = () => {
    return new Set(Object.values(mappings));
  };

  const getUnmappedRequiredFields = () => {
    const mapped = getMappedFields();
    return TARGET_FIELDS.filter(f => f.required && !mapped.has(f.id));
  };

  const isFieldMapped = (fieldId) => {
    return getMappedFields().has(fieldId);
  };

  const getSourceColumnForTarget = (targetId) => {
    return Object.entries(mappings).find(([_, target]) => target === targetId)?.[0];
  };

  const unmappedRequired = getUnmappedRequiredFields();

  return (
    <div className="space-y-6">
      {/* AI Suggestions Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Map Your Columns</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Match your spreadsheet columns to our product fields
          </p>
        </div>
        {onRequestAISuggestions && (
          <Button
            variant="outline"
            onClick={onRequestAISuggestions}
            disabled={isLoadingAI}
            className="gap-2"
          >
            <Sparkles className={cn("w-4 h-4", isLoadingAI && "animate-spin")} />
            {isLoadingAI ? 'Analyzing...' : 'Auto-Map with AI'}
          </Button>
        )}
      </div>

      {/* AI Confidence Banner */}
      {aiConfidence > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-400">
            AI mapped {Object.keys(aiSuggestions).length} columns with {Math.round(aiConfidence * 100)}% confidence
          </span>
        </div>
      )}

      {/* Required Fields Status */}
      {unmappedRequired.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-400">
            Required fields not mapped: {unmappedRequired.map(f => f.label).join(', ')}
          </span>
        </div>
      )}

      {/* Mapping Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-white/10">
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                Your Column
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                Sample Data
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400 w-12">
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                Maps To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sourceColumns.map((column) => {
              const currentMapping = mappings[column.name];
              const targetField = TARGET_FIELDS.find(f => f.id === currentMapping);
              const isAISuggested = aiSuggestions[column.name] === currentMapping;

              return (
                <tr
                  key={column.index}
                  className={cn(
                    "transition-colors",
                    currentMapping && targetField?.required
                      ? "bg-green-500/5"
                      : currentMapping
                      ? "bg-cyan-500/5"
                      : "hover:bg-white/5"
                  )}
                >
                  {/* Source Column Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{column.name}</span>
                      {isAISuggested && currentMapping && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                          AI
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Sample Data */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {column.samples?.slice(0, 3).map((sample, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400 max-w-[150px] truncate"
                        >
                          {sample}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className={cn(
                      "w-4 h-4 mx-auto",
                      currentMapping ? "text-cyan-400" : "text-zinc-600"
                    )} />
                  </td>

                  {/* Target Field Selector */}
                  <td className="px-4 py-3">
                    <Select
                      value={currentMapping || 'skip'}
                      onValueChange={(value) => handleMappingChange(column.name, value)}
                    >
                      <SelectTrigger className={cn(
                        "w-[200px] bg-zinc-900/50 border-white/10",
                        currentMapping && targetField?.required
                          ? "border-green-500/30 text-green-400"
                          : currentMapping
                          ? "border-cyan-500/30 text-cyan-400"
                          : "text-zinc-400"
                      )}>
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="skip" className="text-zinc-400">
                          Skip this column
                        </SelectItem>
                        {TARGET_FIELDS.map((field) => {
                          const alreadyMapped = isFieldMapped(field.id) && mappings[column.name] !== field.id;
                          return (
                            <SelectItem
                              key={field.id}
                              value={field.id}
                              disabled={alreadyMapped}
                              className={cn(
                                alreadyMapped && "opacity-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span>{field.label}</span>
                                {field.required && (
                                  <span className="text-xs text-amber-400">*</span>
                                )}
                                {alreadyMapped && (
                                  <Check className="w-3 h-3 text-green-400 ml-auto" />
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Target Fields Legend */}
      <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
        <h4 className="text-sm font-medium text-white mb-3">Target Fields</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TARGET_FIELDS.map((field) => {
            const sourceColumn = getSourceColumnForTarget(field.id);
            return (
              <TooltipProvider key={field.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-sm",
                      sourceColumn
                        ? "bg-green-500/10 border border-green-500/20"
                        : field.required
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-zinc-800/50 border border-white/5"
                    )}>
                      {sourceColumn ? (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : field.required ? (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      )}
                      <span className={cn(
                        sourceColumn ? "text-green-400" :
                        field.required ? "text-red-400" : "text-zinc-400"
                      )}>
                        {field.label}
                        {field.required && <span className="text-amber-400">*</span>}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{field.description}</p>
                    {sourceColumn && (
                      <p className="text-green-400 mt-1">Mapped from: {sourceColumn}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ColumnMapper;
