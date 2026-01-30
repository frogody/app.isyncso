import { X, Download, AlertCircle, CheckCircle, Film, RotateCcw, Info, Play } from 'lucide-react';

const STATUS_TEXT = {
  pending: 'Preparing render...',
  rendering: 'Rendering video...',
  completed: 'Render complete!',
  failed: 'Render failed',
};

const PROGRESS_TEXT = (progress) => {
  if (progress < 15) return 'Preparing assets...';
  if (progress < 30) return 'Bundling composition...';
  if (progress < 60) return 'Rendering frames...';
  if (progress < 80) return 'Encoding video...';
  if (progress < 100) return 'Finalizing...';
  return 'Complete!';
};

export default function RenderProgressModal({ isOpen, onClose, job, onRetry }) {
  if (!isOpen) return null;

  const status = job?.status || 'pending';
  const progress = job?.progress || 0;
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isActive = status === 'pending' || status === 'rendering';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Video Render</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          {/* Status icon */}
          <div className="flex justify-center mb-4">
            {isComplete && <CheckCircle className="w-12 h-12 text-green-400" />}
            {isFailed && <AlertCircle className="w-12 h-12 text-red-400" />}
            {isActive && (
              <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Status text */}
          <p className="text-center text-sm text-zinc-300 mb-4">
            {isFailed ? (job?.error_message || 'An error occurred during rendering') : (isActive ? PROGRESS_TEXT(progress) : (isComplete && !job?.output_url ? 'Simulation complete!' : STATUS_TEXT[status]))}
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFailed ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-500">{STATUS_TEXT[status]}</span>
            <span className="text-xs text-zinc-500">{progress}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isComplete && job?.output_url && (
            <a
              href={job.output_url}
              download
              className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
          )}
          {isComplete && !job?.output_url && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">Real video export requires server setup. Preview your video in the live player above.</p>
              </div>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Preview in Player
              </button>
            </div>
          )}
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            {isActive ? 'Close (continues in background)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
