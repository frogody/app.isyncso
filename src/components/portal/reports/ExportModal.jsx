import React, { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, projectId, projectName, settings }) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('pdf');

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'csv') {
        const csvContent = `Project,${projectName}
ID,${projectId}
Exported,${new Date().toISOString()}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'project'}-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.print();
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Export Project</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Export <span className="text-white font-medium">{projectName}</span> data
        </p>

        <div className="space-y-2 mb-6">
          {[
            { id: 'pdf', label: 'PDF Report', icon: FileText, desc: 'Formatted project summary' },
            { id: 'csv', label: 'CSV Data', icon: FileSpreadsheet, desc: 'Raw data for spreadsheets' },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setFormat(opt.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                  format === opt.id
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${format === opt.id ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-zinc-500">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
            style={{
              background: `linear-gradient(135deg, ${settings?.primary_color || '#06b6d4'}, ${settings?.accent_color || '#10b981'})`,
            }}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
