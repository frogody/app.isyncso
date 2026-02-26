import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';

export default function WizardTopBar({ projectName, saveStatus, onNameChange }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(projectName || '');
  }, [projectName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== projectName) {
      onNameChange(trimmed);
    } else {
      setEditValue(projectName || '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      setEditValue(projectName || '');
      setIsEditing(false);
    }
  };

  return (
    <div className="h-14 shrink-0 bg-zinc-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-sm font-semibold text-white outline-none border-b border-yellow-400/40 pb-0.5 min-w-[200px]"
            maxLength={100}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-white hover:text-yellow-400 transition-colors truncate"
          >
            {projectName || 'Untitled Brand'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <SaveIndicator status={saveStatus} />
        <button
          onClick={() => navigate('/CreateBranding')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({ status }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-zinc-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Saving...</span>
      </div>
    );
  }
  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <Check className="w-3.5 h-3.5" />
        <span className="text-xs">Saved</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-xs">Save failed</span>
      </div>
    );
  }
  return null;
}
