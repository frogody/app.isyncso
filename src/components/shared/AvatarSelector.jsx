import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const PRESET_AVATARS = [
  { id: 'avatar-1', url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/b0c51c921_GeneratedImageDecember112025-7_04PM.jpg' },
  { id: 'avatar-2', url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/8830c8609_GeneratedImageDecember112025-7_04PM1.jpg' },
  { id: 'avatar-3', url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/39ca6df61_GeneratedImageDecember112025-7_03PM.jpeg' },
  { id: 'avatar-4', url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/8ac2bb9ca_GeneratedImageDecember112025-7_01PM.jpeg' },
];

function AvatarIcon({ avatar, size = 64 }) {
  const renderContent = () => {
    switch (avatar.category) {
      case 'geometric':
        return renderGeometric(avatar, size);
      case 'orb':
        return renderOrb(avatar, size);
      case 'character':
        return renderCharacter(avatar, size);
      case 'cosmic':
        return renderCosmic(avatar, size);
      default:
        return null;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#0A0A0A" rx="50" />
      {renderContent()}
    </svg>
  );
}

function renderGeometric(avatar, size) {
  const gradientId = `grad-${avatar.id}`;
  
  switch (avatar.id) {
    case 'geo-hex':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={avatar.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <polygon points="50,15 80,30 80,60 50,75 20,60 20,30" fill={`url(#${gradientId})`} stroke={avatar.color} strokeWidth="2" />
        </>
      );
    case 'geo-circles':
      return (
        <>
          <circle cx="50" cy="50" r="30" fill="none" stroke={avatar.color} strokeWidth="3" opacity="0.4" />
          <circle cx="50" cy="50" r="20" fill="none" stroke={avatar.color} strokeWidth="2" opacity="0.6" />
          <circle cx="50" cy="50" r="10" fill={avatar.color} opacity="0.8" />
        </>
      );
    case 'geo-cube':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={avatar.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M50,20 L75,35 L75,65 L50,80 L25,65 L25,35 Z" fill={`url(#${gradientId})`} stroke={avatar.color} strokeWidth="2" />
          <path d="M50,20 L50,50 M75,35 L50,50 M25,35 L50,50" stroke={avatar.color} strokeWidth="1.5" opacity="0.5" />
        </>
      );
    case 'geo-triangle':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={avatar.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <polygon points="50,15 85,75 15,75" fill={`url(#${gradientId})`} stroke={avatar.color} strokeWidth="2" />
        </>
      );
    case 'geo-diamond':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={avatar.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.color} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <polygon points="50,15 85,50 50,85 15,50" fill={`url(#${gradientId})`} stroke={avatar.color} strokeWidth="2" />
          <line x1="50" y1="15" x2="50" y2="85" stroke={avatar.color} strokeWidth="1" opacity="0.4" />
          <line x1="15" y1="50" x2="85" y2="50" stroke={avatar.color} strokeWidth="1" opacity="0.4" />
        </>
      );
    case 'geo-circuit':
      return (
        <>
          <circle cx="50" cy="50" r="8" fill={avatar.color} opacity="0.8" />
          <line x1="50" y1="50" x2="50" y2="25" stroke={avatar.color} strokeWidth="2" />
          <line x1="50" y1="50" x2="75" y2="50" stroke={avatar.color} strokeWidth="2" />
          <line x1="50" y1="50" x2="50" y2="75" stroke={avatar.color} strokeWidth="2" />
          <line x1="50" y1="50" x2="25" y2="50" stroke={avatar.color} strokeWidth="2" />
          <circle cx="50" cy="25" r="4" fill={avatar.color} />
          <circle cx="75" cy="50" r="4" fill={avatar.color} />
          <circle cx="50" cy="75" r="4" fill={avatar.color} />
          <circle cx="25" cy="50" r="4" fill={avatar.color} />
        </>
      );
    default:
      return null;
  }
}

function renderOrb(avatar, size) {
  const gradientId = `grad-${avatar.id}`;
  
  return (
    <>
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={avatar.gradient[0]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={avatar.gradient[1]} stopOpacity="0.3" />
        </radialGradient>
        <filter id={`glow-${avatar.id}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="35" fill={`url(#${gradientId})`} filter={`url(#glow-${avatar.id})`} />
      <circle cx="40" cy="40" r="10" fill="white" opacity="0.2" />
    </>
  );
}

function renderCharacter(avatar, size) {
  switch (avatar.id) {
    case 'char-face':
      return (
        <>
          <circle cx="50" cy="50" r="30" fill="none" stroke={avatar.color} strokeWidth="2" />
          <circle cx="42" cy="45" r="3" fill={avatar.color} />
          <circle cx="58" cy="45" r="3" fill={avatar.color} />
          <path d="M 40 60 Q 50 65 60 60" stroke={avatar.color} strokeWidth="2" fill="none" />
        </>
      );
    case 'char-robot':
      return (
        <>
          <rect x="30" y="35" width="40" height="35" rx="5" fill={avatar.color} opacity="0.3" stroke={avatar.color} strokeWidth="2" />
          <rect x="40" y="25" width="20" height="15" rx="3" fill={avatar.color} opacity="0.5" />
          <circle cx="42" cy="50" r="4" fill={avatar.color} />
          <circle cx="58" cy="50" r="4" fill={avatar.color} />
          <rect x="45" y="60" width="10" height="5" fill={avatar.color} />
        </>
      );
    case 'char-astronaut':
      return (
        <>
          <circle cx="50" cy="50" r="25" fill="none" stroke={avatar.color} strokeWidth="2" />
          <ellipse cx="50" cy="50" rx="18" ry="12" fill={avatar.color} opacity="0.3" />
          <circle cx="44" cy="48" r="2" fill={avatar.color} />
          <circle cx="56" cy="48" r="2" fill={avatar.color} />
        </>
      );
    case 'char-profile':
      return (
        <>
          <path d="M 35 50 Q 35 30 50 25 Q 65 30 65 50" stroke={avatar.color} strokeWidth="2" fill="none" />
          <circle cx="50" cy="65" r="15" fill={avatar.color} opacity="0.3" />
        </>
      );
    case 'char-tech':
      return (
        <>
          <polygon points="50,25 65,40 65,60 50,75 35,60 35,40" fill={avatar.color} opacity="0.3" stroke={avatar.color} strokeWidth="2" />
          <circle cx="45" cy="48" r="3" fill={avatar.color} />
          <circle cx="55" cy="48" r="3" fill={avatar.color} />
          <line x1="45" y1="60" x2="55" y2="60" stroke={avatar.color} strokeWidth="2" />
        </>
      );
    case 'char-geo-face':
      return (
        <>
          <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill={avatar.color} opacity="0.2" stroke={avatar.color} strokeWidth="2" />
          <circle cx="42" cy="48" r="3" fill={avatar.color} />
          <circle cx="58" cy="48" r="3" fill={avatar.color} />
          <path d="M 40 62 L 50 65 L 60 62" stroke={avatar.color} strokeWidth="2" fill="none" />
        </>
      );
    default:
      return null;
  }
}

function renderCosmic(avatar, size) {
  const gradientId = `grad-${avatar.id}`;
  
  switch (avatar.id) {
    case 'cosmic-galaxy':
      return (
        <>
          <defs>
            <radialGradient id={gradientId}>
              <stop offset="0%" stopColor={avatar.gradient[0]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.gradient[1]} stopOpacity="0.2" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="50" rx="35" ry="15" fill={`url(#${gradientId})`} />
          <circle cx="45" cy="48" r="2" fill="white" opacity="0.8" />
          <circle cx="55" cy="52" r="2" fill="white" opacity="0.8" />
          <circle cx="50" cy="50" r="1" fill="white" />
        </>
      );
    case 'cosmic-star':
      return (
        <>
          <polygon points="50,20 55,40 75,45 58,58 62,78 50,68 38,78 42,58 25,45 45,40" fill={avatar.color} opacity="0.8" />
          <circle cx="50" cy="50" r="8" fill={avatar.color} />
        </>
      );
    case 'cosmic-moon':
      return (
        <>
          <circle cx="50" cy="50" r="25" fill={avatar.color} opacity="0.6" />
          <circle cx="60" cy="50" r="25" fill="#0A0A0A" />
          <circle cx="42" cy="45" r="4" fill={avatar.color} opacity="0.4" />
          <circle cx="48" cy="60" r="6" fill={avatar.color} opacity="0.3" />
        </>
      );
    case 'cosmic-crystal':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={avatar.gradient[0]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.gradient[1]} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <polygon points="50,20 65,35 60,60 40,60 35,35" fill={`url(#${gradientId})`} stroke={avatar.gradient[0]} strokeWidth="2" />
          <line x1="50" y1="20" x2="50" y2="60" stroke={avatar.gradient[0]} strokeWidth="1" opacity="0.5" />
        </>
      );
    case 'cosmic-wave':
      return (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={avatar.gradient[0]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={avatar.gradient[1]} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M 20,50 Q 30,35 40,50 T 60,50 T 80,50" stroke={`url(#${gradientId})`} strokeWidth="3" fill="none" />
          <path d="M 20,60 Q 30,45 40,60 T 60,60 T 80,60" stroke={`url(#${gradientId})`} strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M 20,40 Q 30,25 40,40 T 60,40 T 80,40" stroke={`url(#${gradientId})`} strokeWidth="2" fill="none" opacity="0.6" />
        </>
      );
    case 'cosmic-energy':
      return (
        <>
          <defs>
            <radialGradient id={gradientId}>
              <stop offset="0%" stopColor={avatar.gradient[0]} stopOpacity="0.9" />
              <stop offset="100%" stopColor={avatar.gradient[1]} stopOpacity="0.3" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="30" fill={`url(#${gradientId})`} />
          <path d="M 50,30 L 55,45 L 65,42 L 52,52 L 58,65 L 48,55 L 38,68 L 45,52 L 32,48 L 48,48 Z" fill="white" opacity="0.8" />
        </>
      );
    default:
      return null;
  }
}

export default function AvatarSelector({ selected, onSelect, size = 'default', allowUpload = false }) {
  const [uploadMode, setUploadMode] = React.useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onSelect({
          id: 'custom-upload',
          category: 'uploaded',
          url: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
        {PRESET_AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar)}
            className={`
              w-20 h-20 rounded-full overflow-hidden transition-all duration-200
              border-2 hover:scale-105 flex items-center justify-center mx-auto
              ${selected?.id === avatar.id
                ? 'border-cyan-500 ring-4 ring-cyan-500/30 scale-105 shadow-lg shadow-cyan-500/30'
                : 'border-gray-700 hover:border-cyan-400/50'
              }
            `}
          >
            <img 
              src={avatar.url} 
              alt={`Avatar ${avatar.id}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {allowUpload && (
        <div className="text-center pt-2">
          <div className="inline-block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload">
              <Button 
                variant="outline" 
                className="cursor-pointer border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white" 
                asChild
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Or upload your own photo
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export { PRESET_AVATARS, AvatarIcon };