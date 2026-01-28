import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  FileJson,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileBarChart,
  Clock,
} from 'lucide-react';
import { useReportGenerator } from '@/hooks/useReportGenerator';

export default function ExportModal({ isOpen, onClose, projectId, projectName, settings }) {
  const { generating, progress, generatePDF, generateTasksCSV, generateJSON, generateActivityCSV } =
    useReportGenerator();
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleExport = async (type) => {
    setResult(null);
    let response;

    switch (type) {
      case 'pdf':
        response = await generatePDF(projectId, settings);
        break;
      case 'tasks_csv':
        response = await generateTasksCSV(projectId);
        break;
      case 'json':
        response = await generateJSON(projectId);
        break;
      case 'activity_csv':
        response = await generateActivityCSV(projectId);
        break;
      default:
        return;
    }

    setResult(response);
  };

  const exportOptions = [
    {
      id: 'pdf',
      title: 'Project Report (PDF)',
      description: 'Comprehensive report with overview, tasks, milestones, and approvals',
      icon: FileBarChart,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      id: 'tasks_csv',
      title: 'Tasks Export (CSV)',
      description: 'All project tasks in spreadsheet format',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'activity_csv',
      title: 'Activity Log (CSV)',
      description: 'Timeline of all project activity',
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'json',
      title: 'Full Export (JSON)',
      description: 'Complete project data including all entities',
      icon: FileJson,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Export Report</h2>
            <p className="text-sm text-zinc-400">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Export Options */}
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleExport(option.id)}
              disabled={generating}
              className="w-full flex items-start gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`p-3 rounded-xl ${option.bgColor}`}>
                <option.icon className={`w-5 h-5 ${option.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white">{option.title}</h3>
                <p className="text-sm text-zinc-400">{option.description}</p>
              </div>
              <Download className="w-5 h-5 text-zinc-500 shrink-0 mt-1" />
            </button>
          ))}

          {/* Progress */}
          {generating && (
            <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-sm text-cyan-400">{progress || 'Generating...'}</span>
            </div>
          )}

          {/* Result */}
          {result && !generating && (
            <div
              className={`flex items-center gap-3 p-4 rounded-xl ${
                result.success
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {result.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-emerald-400">Export completed successfully!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">{result.error || 'Export failed'}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
