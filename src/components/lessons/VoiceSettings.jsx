import { useState, useEffect } from 'react';
import { Volume2, Check, Play, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { db } from '@/api/supabaseClient';

// PREMIUM VOICES - Upgraded selection
const AVAILABLE_VOICES = [
  { id: 'adam', name: 'Adam', description: '🎙️ Deep & Professional', gender: 'male' },
  { id: 'antoni', name: 'Antoni', description: '✨ Trustworthy & Clear', gender: 'male' },
  { id: 'bella', name: 'Bella', description: '🌸 Soft & Soothing', gender: 'female' },
  { id: 'elli', name: 'Elli', description: '⚡ Energetic & Youthful', gender: 'female' },
  { id: 'rachel', name: 'Rachel', description: '💼 Warm & Professional', gender: 'female' },
  { id: 'callum', name: 'Callum', description: '🇬🇧 British & Articulate', gender: 'male' },
  { id: 'emily', name: 'Emily', description: '📚 Clear & Professional', gender: 'female' },
  { id: 'josh', name: 'Josh', description: '💪 Strong & Confident', gender: 'male' },
  { id: 'grace', name: 'Grace', description: '🎵 Smooth & Elegant', gender: 'female' },
  { id: 'charlie', name: 'Charlie', description: '😊 Casual & Friendly', gender: 'male' },
];

export function useVoicePreference() {
  const [voiceId, setVoiceId] = useState(() => {
    return localStorage.getItem('preferred_voice') || 'rachel';
  });

  const updateVoice = (newVoiceId) => {
    setVoiceId(newVoiceId);
    localStorage.setItem('preferred_voice', newVoiceId);
  };

  return { voiceId, updateVoice, voices: AVAILABLE_VOICES };
}

export function VoiceSelector({ voiceId, onVoiceChange }) {
  const currentVoice = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [previewAudio, setPreviewAudio] = useState(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
    };
  }, [previewAudio]);

  const playPreview = async (voice, e) => {
    e.stopPropagation();
    
    // Stop any playing preview
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
    }
    
    setPreviewingVoice(voice.id);
    
    try {
      const previewText = voice.gender === 'male' 
        ? "Hi! I'm here to help you learn. This is what I sound like."
        : "Hi! I'm here to help you learn. This is what I sound like.";
      
      const { data } = await db.functions.invoke('generateVoice', {
        text: previewText,
        voice_id: voice.id
      });
      
      if (data.success && data.audio_base64) {
        const audioData = atob(data.audio_base64);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        setPreviewAudio(audio);
        
        audio.onended = () => {
          setPreviewingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setPreviewingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('[Voice Preview] Failed:', error);
      setPreviewingVoice(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-2">
          <Volume2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">{currentVoice.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 w-64 max-h-[400px] overflow-y-auto">
        <div className="px-2 py-1.5 text-xs text-gray-500 font-semibold">PREMIUM VOICES</div>
        {AVAILABLE_VOICES.map(voice => (
          <DropdownMenuItem
            key={voice.id}
            onClick={() => onVoiceChange(voice.id)}
            className="flex items-center justify-between cursor-pointer py-2"
          >
            <div className="flex-1">
              <div className="text-white text-sm font-medium">{voice.name}</div>
              <div className="text-gray-500 text-xs">{voice.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => playPreview(voice, e)}
                className="p-1 hover:bg-gray-800 rounded transition-colors"
                disabled={previewingVoice === voice.id}
              >
                {previewingVoice === voice.id ? (
                  <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 text-gray-400 hover:text-yellow-400" />
                )}
              </button>
              {voiceId === voice.id && <Check className="w-4 h-4 text-yellow-400" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}