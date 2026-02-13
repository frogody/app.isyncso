import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Scale, Eye, ChevronDown, ChevronUp, ExternalLink, Users, Server, Ban, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LEGAL_REFERENCES = [
  { article: 'Article 5(1)(f)', subject: 'Emotion recognition in the workplace', status: 'Prohibited since 2 Feb 2025', severity: 'banned' },
  { article: 'Article 5(1)(c)', subject: 'Social scoring based on behaviour/personality', status: 'Prohibited since 2 Feb 2025', severity: 'banned' },
  { article: 'Annex III, Point 4(b)', subject: 'AI systems for monitoring/evaluating worker performance', status: 'High-risk (obligations from 2 Aug 2026)', severity: 'high-risk' },
  { article: 'Article 26(7)', subject: 'Obligation to inform workers about AI monitoring', status: 'Applies from 2 Aug 2026', severity: 'obligation' },
  { article: 'Article 27', subject: 'Fundamental rights impact assessment for deployers', status: 'Applies from 2 Aug 2026', severity: 'obligation' },
  { article: 'Recital 57', subject: 'Impact on career prospects, livelihoods, and workers\u2019 rights', status: 'Interpretive guidance', severity: 'info' },
  { article: 'Article 99(a)', subject: 'Penalty: up to EUR 35M or 7% of global turnover', status: 'Enforcement active', severity: 'banned' },
];

export default function PrivacyAIAct() {
  const [showReferences, setShowReferences] = useState(false);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 space-y-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Your Data. Your Eyes Only.
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            iSyncSO is built to empower you, not to surveil you. Your activity data is private by design and protected by law.
          </p>
        </motion.div>

        {/* Section 1 — Our Promise */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 lg:p-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Our Promise</h2>
          </div>

          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
            <p>
              <strong className="text-white">iSyncSO is built for YOU, not your employer.</strong> We believe productivity tracking should empower employees to understand their own work patterns, not create tools for workplace surveillance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Eye, text: 'Activity data is encrypted and only accessible by you' },
                { icon: Ban, text: 'No admin dashboards for managers to view your activity' },
                { icon: Users, text: 'No employer exports of individual activity data' },
                { icon: Server, text: 'Desktop app data stays local until you choose to sync' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                  <Icon className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Section 2 — The Law Is On Your Side */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 lg:p-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">The Law Is On Your Side</h2>
          </div>

          <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
            <p>
              The <strong className="text-white">EU AI Act</strong> (Regulation 2024/1689) entered into force on 1 August 2024. It is the world's first comprehensive legal framework for artificial intelligence, and it explicitly protects workers from AI-powered surveillance.
            </p>

            {/* Prohibited Practices */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <h3 className="text-base font-semibold text-red-300 mb-3 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Prohibited Practices (Article 5) — Enforced since 2 February 2025
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="font-medium text-red-200 mb-1">Article 5(1)(f) — Emotion recognition in the workplace</p>
                  <p className="text-zinc-400">AI systems that infer emotions of employees in workplace settings are <strong className="text-red-300">banned</strong>, except for medical or safety purposes.</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="font-medium text-red-200 mb-1">Article 5(1)(c) — Social scoring based on behaviour or personality</p>
                  <p className="text-zinc-400">AI systems that evaluate or classify people based on their social behaviour or personal traits, leading to detrimental treatment, are <strong className="text-red-300">banned</strong>.</p>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-500/15">
                  <p className="text-xs text-red-300">
                    <strong>Penalty for violation:</strong> up to EUR 35 million or 7% of total worldwide annual turnover, whichever is higher.
                  </p>
                </div>
              </div>
            </div>

            {/* High-Risk Classification */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
              <h3 className="text-base font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                High-Risk Classification (Annex III, Point 4b) — Obligations from 2 August 2026
              </h3>
              <div className="space-y-3">
                <p className="text-zinc-300">
                  AI systems intended to be used for <strong className="text-white">monitoring or evaluating the performance and behaviour of persons in work-related situations</strong> are classified as <strong className="text-amber-300">high-risk</strong>.
                </p>
                <blockquote className="border-l-2 border-amber-500/40 pl-4 italic text-zinc-400">
                  "Such systems may have an appreciable impact on future career prospects, livelihoods of those persons and workers' rights."
                  <span className="block text-xs text-zinc-500 mt-1 not-italic">— Recital 57, EU AI Act</span>
                </blockquote>
                <p className="text-zinc-300">
                  Employers deploying such high-risk systems must:
                </p>
                <ul className="space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Inform workers and their representatives (Article 26(7))</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Conduct fundamental rights impact assessments (Article 27)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Assign human oversight to all automated decisions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Consent */}
            <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-5">
              <h3 className="text-base font-semibold text-zinc-200 mb-2">Why "consent" doesn't fix it</h3>
              <p className="text-zinc-400">
                Under EU law (GDPR Recital 43 and consistent case law), consent in an employer-employee relationship is <strong className="text-zinc-200">not freely given</strong> due to the inherent power imbalance. An employee cannot meaningfully refuse when their employer asks them to consent to monitoring. This means employers cannot rely on employee consent as a legal basis for workplace AI surveillance — they need a legitimate purpose, proportionality, and compliance with the AI Act's high-risk obligations.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 3 — How iSyncSO Protects You */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 lg:p-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">How iSyncSO Protects You</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Row Level Security',
                description: 'Your data is stored with Supabase Row Level Security — only your userId can read your rows. No other user, not even administrators, can access your activity data.',
              },
              {
                title: 'No Company Dashboards',
                description: 'There are no company-wide activity dashboards. Managers cannot view individual employee productivity scores, app usage, or focus metrics.',
              },
              {
                title: 'Local-First Desktop App',
                description: 'The SYNC Desktop app processes your activity data locally on your machine. Data only syncs to the cloud when you choose to, and only to your personal account.',
              },
              {
                title: 'No Employment AI Decisions',
                description: 'Your activity data is never used in any AI system that affects employment decisions, performance reviews, promotions, or disciplinary actions.',
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Section 4 — Legal References (Collapsible) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setShowReferences(!showReferences)}
            className="w-full flex items-center justify-between p-6 lg:p-8 text-left hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-zinc-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Key Legal References</h2>
            </div>
            {showReferences ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          {showReferences && (
            <div className="px-6 lg:px-8 pb-6 lg:pb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700/40">
                      <th className="text-left py-3 pr-4 text-zinc-400 font-medium">Article</th>
                      <th className="text-left py-3 pr-4 text-zinc-400 font-medium">Subject</th>
                      <th className="text-left py-3 text-zinc-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEGAL_REFERENCES.map((ref, i) => (
                      <tr key={i} className="border-b border-zinc-800/40">
                        <td className="py-3 pr-4 text-zinc-200 font-mono text-xs whitespace-nowrap">{ref.article}</td>
                        <td className="py-3 pr-4 text-zinc-300">{ref.subject}</td>
                        <td className="py-3">
                          <Badge className={
                            ref.severity === 'banned' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                            ref.severity === 'high-risk' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                            ref.severity === 'obligation' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                            'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
                          }>
                            {ref.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Source: Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 (EU AI Act). Full text available at{' '}
                <a
                  href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  EUR-Lex
                </a>.
              </p>
            </div>
          )}
        </motion.section>

      </div>
    </div>
  );
}
