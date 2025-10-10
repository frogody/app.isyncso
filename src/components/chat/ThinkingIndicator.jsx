import React from 'react';
import { Brain, FileText, Search, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import SyncAvatar from '../ui/SyncAvatar';
import IconWrapper from '../ui/IconWrapper';

const steps = {
  thinking: { 
    label: 'SYNC aan het denken...', 
    icon: Brain,
    color: 'text-purple-400',
    description: 'Analyseren van je vraag'
  },
  docs: { 
    label: 'Documenten verwerken...', 
    icon: FileText,
    color: 'text-blue-400',
    description: 'Uploaden en analyseren'
  },
  search: { 
    label: 'Kandidaten zoeken...', 
    icon: Search,
    color: 'text-green-400',
    description: 'Database doorzoeken'
  },
  compose: { 
    label: 'Antwoord opstellen...', 
    icon: Sparkles,
    color: 'text-yellow-400',
    description: 'Response genereren'
  },
  done: { 
    label: 'Klaar!', 
    icon: CheckCircle2,
    color: 'text-green-500',
    description: 'Voltooid'
  },
  error: { 
    label: 'Er ging iets mis', 
    icon: AlertCircle,
    color: 'text-red-500',
    description: 'Error'
  }
};

export default function ThinkingIndicator({ active, stepKey = 'thinking', percent = 0 }) {
  if (!active) return null;

  const step = steps[stepKey] || steps.thinking;

  return (
    <div className="mb-4 p-4 rounded-xl border" style={{
      background: 'rgba(15,20,24,0.6)',
      borderColor: 'rgba(255,255,255,0.06)'
    }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0">
          <SyncAvatar size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{color: 'var(--txt)'}}>
              {step.label}
            </span>
            <span className="text-xs" style={{color: 'var(--muted)'}}>
              {Math.round(percent)}%
            </span>
          </div>
          <p className="text-xs" style={{color: 'var(--muted)'}}>
            {step.description}
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.05)'}}>
        <div 
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #EF4444, #DC2626)'
          }}
        />
      </div>

      {/* ISYNCSO attribution */}
      <div className="mt-2 flex items-center gap-2 text-xs" style={{color: 'var(--muted)'}}>
        <IconWrapper icon={Sparkles} size={12} variant="muted" />
        <span>Powered by ISYNCSO</span>
      </div>
    </div>
  );
}