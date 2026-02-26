import React from 'react';
import { motion } from 'framer-motion';
import { getPersonalizedVariant, getVariantInfo } from '../personalizationEngine';

export default function ReadyPage({ formData, onLaunch, onBack, isSubmitting }) {
  const firstName = formData?.fullName?.split(' ')[0] || '';
  const variantName = getPersonalizedVariant(formData?.dailyTools, formData?.selectedGoals);
  const variantInfo = getVariantInfo?.(variantName) || { title: variantName };

  const goalsCount = formData?.selectedGoals?.length || 0;
  const appsCount = formData?.selectedApps?.length || 0;

  const summaryItems = [
    { label: 'Name & Role', value: [formData?.fullName, formData?.jobTitle].filter(Boolean).join(' — ') || 'Not set' },
    { label: 'Industry', value: formData?.industry || 'Not set' },
    { label: 'Goals selected', value: goalsCount },
    { label: 'Apps activated', value: appsCount },
    { label: 'Personalized agent', value: variantInfo?.title || variantName },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Animated rocket icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
        className="w-20 h-20 rounded-2xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center mb-6 text-4xl"
      >
        🚀
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-white mb-2"
      >
        {firstName ? `${firstName}, You're Ready!` : "You're Ready!"}
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-zinc-400 text-sm mb-8 max-w-sm text-center"
      >
        Your personalized workspace is configured.
      </motion.p>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-5 mb-10"
      >
        <div className="space-y-3">
          {summaryItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center justify-between"
            >
              <span className="text-xs text-zinc-500">{item.label}</span>
              <span className="text-sm text-white font-medium truncate ml-4 max-w-[180px] text-right">
                {item.value}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        {onBack && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={onBack}
            className="px-6 py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            Back
          </motion.button>
        )}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: 'spring' }}
          onClick={onLaunch}
          disabled={isSubmitting}
          className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 disabled:cursor-not-allowed text-black font-semibold rounded-full transition-colors text-base flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
              />
              Launching...
            </>
          ) : (
            'Launch SYNC'
          )}
        </motion.button>
      </div>
    </div>
  );
}
