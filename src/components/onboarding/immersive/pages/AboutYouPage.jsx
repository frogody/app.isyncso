import React, { useState } from 'react';
import ParticleFormation from '../animations/ParticleFormation';

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Marketing',
  'Consulting',
  'Legal',
  'Manufacturing',
  'Retail',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

export default function AboutYouPage({ formData, updateFormData, isInvitedUser, onNext, onBack }) {
  const [showCompanyFields, setShowCompanyFields] = useState(
    !isInvitedUser && !!(formData.companyName || formData.companyWebsite || formData.companySize)
  );

  const isValid =
    (formData.fullName || '').trim().length > 0 && (formData.jobTitle || '').trim().length > 0;

  const handleChange = (field) => (e) => {
    updateFormData({ [field]: e.target.value });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
        {/* Left / Top: Particle animation */}
        <div className="flex-shrink-0 flex items-center justify-center md:pt-8">
          <ParticleFormation />
        </div>

        {/* Right / Bottom: Form */}
        <div className="flex-1 w-full max-w-lg">
          <h2 className="text-2xl font-semibold text-white mb-2">Tell us about yourself</h2>
          <p className="text-zinc-400 text-sm mb-8">
            Help us personalize your experience.
          </p>

          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5">Full Name *</label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={handleChange('fullName')}
                className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                placeholder="Your full name"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5">Job Title *</label>
              <input
                type="text"
                value={formData.jobTitle || ''}
                onChange={handleChange('jobTitle')}
                className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                placeholder="e.g. Product Manager"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-zinc-300 text-sm mb-1.5">Industry</label>
              <div className="relative">
                <select
                  value={formData.industry || ''}
                  onChange={handleChange('industry')}
                  className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-colors text-sm appearance-none"
                >
                  <option value="" disabled className="text-zinc-600">
                    Select your industry
                  </option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-zinc-900 text-white">
                      {ind}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg
                    className="h-4 w-4 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Company Fields (collapsible, hidden for invited users) */}
            {!isInvitedUser && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCompanyFields((v) => !v)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${showCompanyFields ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Company Details
                </button>

                {showCompanyFields && (
                  <div className="mt-4 space-y-5 pl-1">
                    {/* Company Name */}
                    <div>
                      <label className="block text-zinc-300 text-sm mb-1.5">Company Name</label>
                      <input
                        type="text"
                        value={formData.companyName || ''}
                        onChange={handleChange('companyName')}
                        className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                        placeholder="Your company name"
                      />
                    </div>

                    {/* Company Website */}
                    <div>
                      <label className="block text-zinc-300 text-sm mb-1.5">Company Website</label>
                      <input
                        type="url"
                        value={formData.companyWebsite || ''}
                        onChange={handleChange('companyWebsite')}
                        className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                        placeholder="https://example.com"
                      />
                    </div>

                    {/* Company Size */}
                    <div>
                      <label className="block text-zinc-300 text-sm mb-1.5">Company Size</label>
                      <div className="relative">
                        <select
                          value={formData.companySize || ''}
                          onChange={handleChange('companySize')}
                          className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-colors text-sm appearance-none"
                        >
                          <option value="" disabled className="text-zinc-600">
                            Select company size
                          </option>
                          {COMPANY_SIZES.map((size) => (
                            <option key={size} value={size} className="bg-zinc-900 text-white">
                              {size}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <svg
                            className="h-4 w-4 text-zinc-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between w-full max-w-lg mx-auto mt-8">
            <button
              onClick={onBack}
              className="px-6 py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={onNext}
              disabled={!isValid}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-medium rounded-full transition-colors text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
