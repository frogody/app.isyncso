import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play, ExternalLink, FileText, Clock, Zap, Star, CheckCircle, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

export default function ProductHero({
  product,
  digitalDetails,
  onRequestDemo,
  onStartTrial,
  className,
}) {
  const { t } = useTheme();
  const hero = digitalDetails?.hero || {};
  const hasVideo = hero.video_url || digitalDetails?.promo_videos?.[0]?.url;
  const rating = hero.rating || 4.8;
  const reviewCount = hero.review_count || 120;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center py-12 px-6 lg:px-12">
        {/* Left: Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Badges */}
          <div className="flex flex-wrap gap-3">
            {product.status === 'published' && (
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Live
              </Badge>
            )}
            {digitalDetails?.trial_available && (
              <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Clock className="w-3 h-3 mr-1" /> {digitalDetails.trial_days}-day Free Trial
              </Badge>
            )}
            {product.category && (
              <Badge className={`${t('bg-slate-100', 'bg-zinc-800')} ${t('text-slate-700', 'text-zinc-300')} border ${t('border-slate-200', 'border-white/10')}`}>
                {product.category}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className={`text-4xl lg:text-5xl font-bold ${t('text-slate-900', 'text-white')} leading-tight`}>
            {hero.headline || product.name}
          </h1>

          {/* Tagline */}
          <p className={`text-xl ${t('text-slate-600', 'text-zinc-300')} leading-relaxed`}>
            {hero.subheadline || product.tagline || product.short_description}
          </p>

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-5 h-5",
                      i < Math.floor(rating)
                        ? "text-cyan-400 fill-cyan-400"
                        : t('text-slate-300', 'text-zinc-600')
                    )}
                  />
                ))}
              </div>
              <span className={`${t('text-slate-900', 'text-white')} font-medium`}>{rating}</span>
              <span className={t('text-slate-500', 'text-zinc-500')}>({reviewCount} reviews)</span>
            </div>
          )}

          {/* Feature Highlights */}
          {digitalDetails?.feature_highlights?.length > 0 && (
            <ul className="space-y-3">
              {digitalDetails.feature_highlights.slice(0, 4).map((feature, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`flex items-center gap-3 ${t('text-slate-600', 'text-zinc-300')}`}
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3 text-cyan-400" />
                  </div>
                  {feature.title || feature}
                </motion.li>
              ))}
            </ul>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 pt-4">
            {digitalDetails?.trial_available && (
              <Button
                size="lg"
                onClick={onStartTrial}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold px-8"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {digitalDetails?.demo_url && (
              <Button
                size="lg"
                variant="outline"
                onClick={onRequestDemo}
                className={`${t('border-slate-300', 'border-white/20')} ${t('text-slate-900', 'text-white')} ${t('hover:bg-slate-100', 'hover:bg-white/10')}`}
              >
                <Play className="w-4 h-4 mr-2" /> Watch Demo
              </Button>
            )}
            {digitalDetails?.documentation_url && (
              <Button
                size="lg"
                variant="ghost"
                asChild
                className={`${t('text-slate-500', 'text-zinc-400')} ${t('hover:text-slate-900', 'hover:text-white')}`}
              >
                <a href={digitalDetails.documentation_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" /> Documentation
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Right: Media */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className={`relative rounded-2xl overflow-hidden border ${t('border-slate-200', 'border-white/10')} shadow-2xl shadow-cyan-500/10`}>
            {product.featured_image?.url ? (
              <img
                src={product.featured_image.url}
                alt={product.name}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gradient-to-br from-cyan-900/30 to-blue-900/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-10 h-10 text-cyan-400" />
                  </div>
                  <p className={t('text-slate-500', 'text-zinc-500')}>Product Preview</p>
                </div>
              </div>
            )}

            {/* Play Button Overlay for Video */}
            {hasVideo && (
              <button
                onClick={onRequestDemo}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity group"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform">
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Floating Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`absolute -bottom-6 -left-6 p-4 rounded-xl ${t('bg-white/90', 'bg-zinc-900/90')} backdrop-blur-sm border ${t('border-slate-200', 'border-white/10')} shadow-xl`}
          >
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">10k+</p>
                <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Users</p>
              </div>
              <div className={`w-px h-10 ${t('bg-slate-200', 'bg-white/10')}`} />
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">99.9%</p>
                <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Uptime</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
