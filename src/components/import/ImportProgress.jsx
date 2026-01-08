import React from 'react';
import { CheckCircle, XCircle, Loader2, Package, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ImportProgress({
  isImporting = false,
  progress = { current: 0, total: 0 },
  results = null,
  errors = [],
  totalToImport = 0  // Total products ready to import (from validation)
}) {
  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const isComplete = !isImporting && results !== null;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center">
        {isImporting ? (
          <>
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <h3 className="text-xl font-medium text-white">Importing Products</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Processing {progress.current} of {progress.total} items...
            </p>
          </>
        ) : isComplete ? (
          <>
            <div className={cn(
              "w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4",
              results.failed > 0
                ? "bg-amber-500/20 border-amber-500/30"
                : "bg-green-500/20 border-green-500/30"
            )}>
              {results.failed > 0 ? (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-400" />
              )}
            </div>
            <h3 className="text-xl font-medium text-white">
              {results.failed > 0 ? 'Import Completed with Issues' : 'Import Complete!'}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Successfully imported {results.created} products
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-medium text-white">Ready to Import</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {totalToImport || progress.total} products will be imported
            </p>
          </>
        )}
      </div>

      {/* Progress Bar */}
      {(isImporting || isComplete) && (
        <div className="space-y-2">
          <Progress
            value={percentage}
            className={cn(
              "h-3",
              isComplete && results?.failed > 0 && "bg-amber-500/20"
            )}
          />
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{progress.current} / {progress.total} items</span>
            <span>{percentage}%</span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {isComplete && results && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{results.created}</span>
            </div>
            <p className="text-sm text-green-400/70 mt-1">Created</p>
          </div>

          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
            <div className="flex items-center justify-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">{results.updated || 0}</span>
            </div>
            <p className="text-sm text-cyan-400/70 mt-1">Updated</p>
          </div>

          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{results.failed}</span>
            </div>
            <p className="text-sm text-red-400/70 mt-1">Failed</p>
          </div>
        </div>
      )}

      {/* Products to Enrich */}
      {isComplete && results?.toEnrich > 0 && (
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-purple-400">
                {results.toEnrich} products queued for enrichment
              </p>
              <p className="text-sm text-purple-400/70">
                Products with EAN codes will be auto-enriched with images and details
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error List */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-400">Import Errors</h4>
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {errors.map((error, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-400 text-xs">
                    Row {error.row}
                  </Badge>
                  <span className="text-sm text-red-400">{error.error}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Log (during import) */}
      {isImporting && progress.current > 0 && (
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Importing: {progress.currentName || 'Processing...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportProgress;
