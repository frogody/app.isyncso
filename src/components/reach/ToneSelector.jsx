import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TONE_OPTIONS } from '@/lib/reach-constants';

export default function ToneSelector({ value, onChange, brandVoiceProfile, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="bg-zinc-900/60 border-zinc-800 text-sm">
          <SelectValue placeholder="Select tone of voice" />
        </SelectTrigger>
        <SelectContent>
          {brandVoiceProfile && (
            <SelectItem value="brand_voice">
              {brandVoiceProfile} (Brand Voice)
            </SelectItem>
          )}
          {TONE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {brandVoiceProfile && (
        <div className="flex items-center gap-1.5 px-1">
          <Volume2 className="w-3 h-3 text-cyan-400" />
          <span className="text-[11px] text-cyan-400/80">
            Active: {brandVoiceProfile}
          </span>
        </div>
      )}
    </div>
  );
}
