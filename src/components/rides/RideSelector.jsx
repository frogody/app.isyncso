import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Briefcase, Search, Mail, Target, Shield,
  ArrowRight, Clock, Zap, Users, TrendingUp, Brain
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';

const CLAY_ICON_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/d80dd1b25_ClayArchMarque.png";
const LINKEDIN_ICON_URL = "https://cdn.worldvectorlogo.com/logos/linkedin-icon-2.svg";

const RIDES = [
  {
    id: 'clay',
    name: 'Clay Campaign',
    description: 'Build lead enrichment & outreach campaigns in Clay',
    icon: null,
    image: CLAY_ICON_URL,
    time: '10-15 min',
    difficulty: 'Intermediate',
    tags: ['Lead Gen', 'Enrichment', 'Outreach']
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Outreach',
    description: 'Create personalized connection requests & InMails',
    icon: null,
    image: LINKEDIN_ICON_URL,
    time: '5-8 min',
    difficulty: 'Beginner',
    tags: ['Social Selling', 'Networking']
  },
  {
    id: 'salesNav',
    name: 'Sales Navigator Research',
    description: 'Structured prospect research prompts for deep insights',
    icon: null,
    image: LINKEDIN_ICON_URL,
    time: '8-12 min',
    difficulty: 'Intermediate',
    tags: ['Research', 'ICP', 'Prospecting']
  },
  {
    id: 'coldEmail',
    name: 'Cold Email Sequence',
    description: 'Generate multi-step email campaigns with AI',
    icon: Mail,
    time: '10-15 min',
    difficulty: 'Beginner',
    tags: ['Email', 'Sequences', 'Copywriting']
  },
  {
    id: 'competitive',
    name: 'Competitive Intel',
    description: 'Structured competitor analysis & battlecard creation',
    icon: Target,
    time: '15-20 min',
    difficulty: 'Advanced',
    tags: ['Strategy', 'Research', 'Analysis']
  },
  {
    id: 'hubspot',
    name: 'HubSpot Workflows',
    description: 'Create CRM automation & sequence prompts',
    icon: TrendingUp,
    time: '8-12 min',
    difficulty: 'Intermediate',
    tags: ['CRM', 'Automation', 'Workflows']
  }
];

const DIFFICULTY_COLORS = {
  Beginner: 'bg-amber-900/30 text-amber-200/80 border-amber-700/20',
  Intermediate: 'bg-orange-900/30 text-orange-200/80 border-orange-700/20',
  Advanced: 'bg-orange-900/40 text-orange-100/80 border-orange-600/20'
};

export default function RideSelector({ onSelectRide, selectedRide }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/68ebfb48566133bc1cface8c/1850cd012_claude-color.png" alt="Claude" className="w-7 h-7"  loading="lazy" decoding="async" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Claude Rides</h2>
          <p className="text-sm text-zinc-500">Guided workflows for Claude browser extension</p>
        </div>
      </div>

      {/* Ride Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {RIDES.map((ride, i) => {
          const Icon = ride.icon;
          const isSelected = selectedRide === ride.id;
          
          return (
            <motion.button
              key={ride.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectRide(ride.id)}
              className={`text-left p-5 rounded-2xl border transition-all group ${
                isSelected 
                  ? 'border-orange-500/40 bg-orange-950/20' 
                  : 'border-zinc-800/60 hover:border-orange-900/50 bg-zinc-900/30 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center">
                  {ride.image ? (
                    <img src={ride.image} alt={ride.name} className="w-6 h-6 object-contain"  loading="lazy" decoding="async" />
                  ) : (
                    <Icon className="w-6 h-6 text-orange-400/80" />
                  )}
                </div>
                <Badge className={DIFFICULTY_COLORS[ride.difficulty]}>
                  {ride.difficulty}
                </Badge>
              </div>
              
              <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-white">
                {ride.name}
              </h3>
              <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                {ride.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-zinc-600">
                  <Clock className="w-3.5 h-3.5" />
                  {ride.time}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-orange-400/80 transition-colors">
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/50">
                {ride.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { RIDES };