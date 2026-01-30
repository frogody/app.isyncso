import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Linkedin,
  CheckCircle,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { fullEnrichFromLinkedIn, fullEnrichFromEmail } from '@/lib/explorium-api';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

/**
 * QuickAddClientModal - Quick Add with Enrichment for Talent Clients
 *
 * Allows users to quickly add recruitment clients by entering a LinkedIn URL
 * or email address, which automatically enriches contact and company data
 * via the Explorium API.
 */
export function QuickAddClientModal({ isOpen, onClose, onSuccess }) {
  const { user } = useUser();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input', 'matching', 'enriching', 'preview', 'error'
  const [enrichedData, setEnrichedData] = useState(null);
  const [error, setError] = useState(null);

  const isLinkedIn = inputValue.includes('linkedin.com');
  const isEmail = inputValue.includes('@') && !inputValue.includes('linkedin.com');

  const handleEnrich = async () => {
    if (!inputValue.trim()) {
      toast.error('Please enter a LinkedIn URL or email address');
      return;
    }

    if (!isLinkedIn && !isEmail) {
      toast.error('Please enter a valid LinkedIn URL or email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStep('matching');
      await new Promise(r => setTimeout(r, 300)); // Small delay for UX

      setStep('enriching');
      let data;

      if (isLinkedIn) {
        data = await fullEnrichFromLinkedIn(inputValue.trim());
      } else {
        data = await fullEnrichFromEmail(inputValue.trim());
      }

      setStep('preview');
      setEnrichedData(data);
    } catch (err) {
      console.error('Enrichment error:', err);
      setError(err.message || 'Failed to enrich contact');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!enrichedData) return;

    setLoading(true);
    try {
      // Build location string from enriched data
      const location = [
        enrichedData.location_city,
        enrichedData.location_region,
        enrichedData.location_country
      ].filter(Boolean).join(', ');

      // Insert into prospects table as recruitment_client
      const { error: insertError } = await supabase.from('prospects').insert({
        organization_id: user.organization_id,
        contact_type: 'recruitment_client',
        is_recruitment_client: true,
        // Contact info
        first_name: enrichedData.first_name,
        last_name: enrichedData.last_name,
        email: enrichedData.email,
        phone: enrichedData.phone || enrichedData.mobile_phone,
        personal_email: enrichedData.personal_email,
        linkedin_url: enrichedData.linkedin_url,
        // Professional info
        company: enrichedData.company,
        job_title: enrichedData.job_title,
        title: enrichedData.job_title, // Some tables use 'title' instead
        job_department: enrichedData.job_department,
        job_seniority_level: enrichedData.job_seniority_level,
        // Location
        location: location || null,
        location_city: enrichedData.location_city,
        location_region: enrichedData.location_region,
        location_country: enrichedData.location_country,
        // Company info
        industry: enrichedData.company_industry,
        company_size: enrichedData.company_size,
        website: enrichedData.company_domain,
        company_domain: enrichedData.company_domain,
        company_linkedin: enrichedData.company_linkedin,
        company_industry: enrichedData.company_industry,
        company_employee_count: enrichedData.company_employee_count,
        company_revenue: enrichedData.company_revenue,
        company_founded_year: enrichedData.company_founded_year,
        company_hq_location: enrichedData.company_hq_location,
        company_description: enrichedData.company_description,
        company_tech_stack: enrichedData.company_tech_stack,
        company_funding_total: enrichedData.company_funding_total,
        company_latest_funding: enrichedData.company_latest_funding,
        // Skills and background
        skills: enrichedData.skills,
        education: enrichedData.education,
        work_history: enrichedData.work_history,
        interests: enrichedData.interests,
        // Enrichment metadata
        enriched_at: enrichedData.enriched_at,
        enrichment_source: enrichedData.enrichment_source,
        explorium_prospect_id: enrichedData.explorium_prospect_id,
        explorium_business_id: enrichedData.explorium_business_id,
        // Client-specific
        stage: 'lead', // Default stage for new clients
        source: isLinkedIn ? 'LinkedIn Enrichment' : 'Email Enrichment',
        // Default fee (can be edited later)
        recruitment_fee_percentage: 20,
      });

      if (insertError) throw insertError;

      toast.success(`${enrichedData.first_name} ${enrichedData.last_name} added as client`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInputValue('');
    setStep('input');
    setEnrichedData(null);
    setError(null);
    onClose();
  };

  const handleRetry = () => {
    setStep('input');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-400" />
            Quick Add with Enrichment
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Input Step */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <p className="text-white/60 text-sm">
                Enter a LinkedIn URL or email address to automatically enrich contact and company data.
              </p>

              <div className="space-y-2">
                <Input
                  placeholder="https://linkedin.com/in/... or email@company.com"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  className="bg-zinc-800/50 border-zinc-700 text-white h-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim() && (isLinkedIn || isEmail)) {
                      handleEnrich();
                    }
                  }}
                />
                {inputValue && (
                  <div className="flex items-center gap-2 text-sm">
                    {isLinkedIn && (
                      <Badge className="bg-red-600/20 text-red-400 border-red-500/30">
                        <Linkedin className="w-3 h-3 mr-1" />
                        LinkedIn Profile
                      </Badge>
                    )}
                    {isEmail && (
                      <Badge className="bg-red-600/20 text-red-400 border-red-500/30">
                        <Mail className="w-3 h-3 mr-1" />
                        Email Address
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={handleEnrich}
                disabled={!inputValue.trim() || (!isLinkedIn && !isEmail) || loading}
                className="w-full h-12 bg-red-600 hover:bg-red-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Enrich & Preview
              </Button>
            </motion.div>
          )}

          {/* Loading Steps */}
          {(step === 'matching' || step === 'enriching') && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-12 text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-red-500/30"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-2 rounded-full bg-red-600 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>

              <p className="text-white/80 font-medium">
                {step === 'matching' && 'Finding prospect...'}
                {step === 'enriching' && 'Enriching contact & company data...'}
              </p>
              <p className="text-white/50 text-sm mt-2">
                This may take a few seconds
              </p>
            </motion.div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8 text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium">Enrichment Failed</p>
                <p className="text-white/60 text-sm mt-1">{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Try Again
              </Button>
            </motion.div>
          )}

          {/* Preview Step */}
          {step === 'preview' && enrichedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              {/* Success Badge */}
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Contact enriched successfully
              </div>

              {/* Contact Preview Card */}
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4 border border-zinc-700/50">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-red-600/20 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {enrichedData.first_name} {enrichedData.last_name}
                    </h3>
                    <p className="text-sm text-white/60">{enrichedData.job_title}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Mail className="h-4 w-4 text-white/40" />
                    <span className="truncate">{enrichedData.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="h-4 w-4 text-white/40" />
                    <span>{enrichedData.mobile_phone || enrichedData.phone || 'N/A'}</span>
                  </div>
                  {enrichedData.location_city && (
                    <div className="flex items-center gap-2 text-white/70 col-span-2">
                      <MapPin className="h-4 w-4 text-white/40" />
                      <span>
                        {[enrichedData.location_city, enrichedData.location_country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Company Info */}
                {enrichedData.company && (
                  <div className="pt-3 border-t border-zinc-700/50">
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-white/40 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">{enrichedData.company}</p>
                        <p className="text-xs text-white/50">
                          {[
                            enrichedData.company_industry,
                            enrichedData.company_size,
                            enrichedData.company_hq_location
                          ].filter(Boolean).join(' \u2022 ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {enrichedData.skills?.length > 0 && (
                  <div className="pt-3 border-t border-zinc-700/50">
                    <div className="flex flex-wrap gap-1">
                      {enrichedData.skills.slice(0, 6).map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs bg-zinc-800 border-zinc-600 text-white/70"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {enrichedData.skills.length > 6 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-zinc-800 border-zinc-600 text-white/50"
                        >
                          +{enrichedData.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Badge */}
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Briefcase className="w-4 h-4" />
                Will be added as <Badge className="bg-zinc-500/20 text-zinc-400 border-0 ml-1">Lead</Badge> with 20% default fee
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('input')}
                  disabled={loading}
                  className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-[2] bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add Client
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default QuickAddClientModal;
