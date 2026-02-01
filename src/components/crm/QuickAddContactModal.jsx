import { useState } from 'react';
import { useTheme } from '@/contexts/GlobalThemeContext';
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
import { usePermissions } from '@/components/context/PermissionContext';
import { toast } from 'sonner';

export function QuickAddContactModal({ isOpen, onClose, onSuccess, targetTable = 'contacts' }) {
  const { crt } = useTheme();
  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('users.create');
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState('linkedin'); // 'linkedin' or 'email'
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
    if (!canCreate) {
      toast.error("You don't have permission to create contacts");
      return;
    }

    setLoading(true);
    try {
      const fullName = `${enrichedData.first_name} ${enrichedData.last_name}`.trim();

      // Check for duplicate email
      if (enrichedData.email) {
        const tableName = targetTable === 'contacts' ? 'contacts' : 'prospects';
        const { data: existingContact, error: checkError } = await supabase
          .from(tableName)
          .select('id, first_name, last_name, email')
          .eq('organization_id', user.organization_id || user.company_id)
          .eq('email', enrichedData.email)
          .maybeSingle();

        if (existingContact) {
          toast.error(`A contact with email ${enrichedData.email} already exists: ${existingContact.first_name || ''} ${existingContact.last_name || ''}`);
          setLoading(false);
          return;
        }
      }

      if (targetTable === 'contacts') {
        const { error: insertError } = await supabase.from('contacts').insert({
          organization_id: user.organization_id || user.company_id,
          first_name: enrichedData.first_name,
          last_name: enrichedData.last_name,
          email: enrichedData.email,
          phone: enrichedData.phone,
          mobile_phone: enrichedData.mobile_phone,
          personal_email: enrichedData.personal_email,
          company: enrichedData.company,
          job_title: enrichedData.job_title,
          job_department: enrichedData.job_department,
          job_seniority_level: enrichedData.job_seniority_level,
          linkedin_url: enrichedData.linkedin_url,
          skills: enrichedData.skills,
          education: enrichedData.education,
          work_history: enrichedData.work_history,
          age_group: enrichedData.age_group,
          interests: enrichedData.interests,
          location_city: enrichedData.location_city,
          location_region: enrichedData.location_region,
          location_country: enrichedData.location_country,
          company_domain: enrichedData.company_domain,
          company_linkedin: enrichedData.company_linkedin,
          company_industry: enrichedData.company_industry,
          company_size: enrichedData.company_size,
          company_employee_count: enrichedData.company_employee_count,
          company_revenue: enrichedData.company_revenue,
          company_founded_year: enrichedData.company_founded_year,
          company_hq_location: enrichedData.company_hq_location,
          company_description: enrichedData.company_description,
          company_tech_stack: enrichedData.company_tech_stack,
          company_funding_total: enrichedData.company_funding_total,
          company_latest_funding: enrichedData.company_latest_funding,
          enriched_at: enrichedData.enriched_at,
          enrichment_source: enrichedData.enrichment_source,
          explorium_prospect_id: enrichedData.explorium_prospect_id,
          explorium_business_id: enrichedData.explorium_business_id,
          stage: 'New Lead',
          source: isLinkedIn ? 'LinkedIn' : 'Email',
        });

        if (insertError) throw insertError;
      } else if (targetTable === 'prospects') {
        // Save ALL enrichment data to prospects table (columns added in 20260121010000_full_enrichment_columns.sql)
        const { error: insertError } = await supabase.from('prospects').insert({
          // Required org/owner fields
          organization_id: user.organization_id || user.company_id,
          owner_id: user.id,

          // Basic contact info
          first_name: enrichedData.first_name,
          last_name: enrichedData.last_name,
          email: enrichedData.email,
          phone: enrichedData.phone || enrichedData.mobile_phone,
          mobile_phone: enrichedData.mobile_phone,
          work_phone: enrichedData.work_phone,
          personal_email: enrichedData.personal_email,
          email_status: enrichedData.email_status,
          linkedin_url: enrichedData.linkedin_url,

          // Location fields
          location: [enrichedData.location_city, enrichedData.location_region, enrichedData.location_country].filter(Boolean).join(', '),
          location_city: enrichedData.location_city,
          location_region: enrichedData.location_region,
          location_country: enrichedData.location_country,

          // Professional info
          company: enrichedData.company,
          job_title: enrichedData.job_title,
          job_department: enrichedData.job_department,
          job_seniority_level: enrichedData.job_seniority_level,
          age_group: enrichedData.age_group,
          gender: enrichedData.gender,

          // Skills, education, work history as JSONB
          skills: enrichedData.skills || [],
          interests: enrichedData.interests || [],
          education: enrichedData.education || [],
          work_history: enrichedData.work_history || [],
          certifications: enrichedData.certifications || [],

          // Company info
          industry: enrichedData.company_industry,
          company_size: enrichedData.company_size,
          website: enrichedData.company_domain ? `https://${enrichedData.company_domain}` : null,
          company_domain: enrichedData.company_domain,
          company_linkedin: enrichedData.company_linkedin,
          company_industry: enrichedData.company_industry,
          company_employee_count: enrichedData.company_employee_count,
          company_revenue: enrichedData.company_revenue,
          company_founded_year: enrichedData.company_founded_year,
          company_hq_location: enrichedData.company_hq_location,
          company_description: enrichedData.company_description,
          company_logo_url: enrichedData.company_logo_url,
          company_naics: enrichedData.company_naics,
          company_naics_description: enrichedData.company_naics_description,
          company_sic_code: enrichedData.company_sic_code,
          company_sic_code_description: enrichedData.company_sic_code_description,
          company_locations_distribution: enrichedData.company_locations_distribution || [],

          // Technology stack
          company_tech_stack: enrichedData.company_tech_stack || [],
          company_tech_categories: enrichedData.company_tech_categories || {},

          // Funding & growth
          company_funding_total: enrichedData.company_funding_total,
          company_funding_rounds: enrichedData.company_funding_rounds || [],
          company_investors: enrichedData.company_investors || [],
          company_last_funding: enrichedData.company_last_funding,
          company_is_ipo: enrichedData.company_is_ipo || false,
          company_ticker: enrichedData.company_ticker,

          // Social media
          social_profiles: enrichedData.social_profiles || {},
          social_activity: enrichedData.social_activity || {},

          // Intent signals
          intent_topics: enrichedData.intent_topics || [],

          // Full raw enrichment blob
          enrichment_data: enrichedData.enrichment_data || {},

          // Enrichment tracking
          enriched_at: enrichedData.enriched_at,
          enrichment_source: enrichedData.enrichment_source,
          explorium_prospect_id: enrichedData.explorium_prospect_id,
          explorium_business_id: enrichedData.explorium_business_id,

          // CRM fields
          stage: 'New Lead',
          source: isLinkedIn ? 'LinkedIn' : 'Email',
          contact_type: 'lead',
        });

        if (insertError) throw insertError;
      }

      toast.success(`${enrichedData.first_name} ${enrichedData.last_name} added successfully`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save contact');
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
      <DialogContent className={`${crt('bg-white border-slate-200', 'bg-slate-900 border-white/10')} max-w-lg`}>
        <DialogHeader>
          <DialogTitle className={`${crt('text-slate-900', 'text-white')} flex items-center gap-2`}>
            <Sparkles className="h-5 w-5 text-cyan-400" />
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
              <p className={`${crt('text-slate-500', 'text-white/60')} text-sm`}>
                Enter a LinkedIn URL or email address to automatically enrich contact and company data.
              </p>

              <div className="space-y-2">
                <Input
                  placeholder="https://linkedin.com/in/... or email@company.com"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  className={`${crt('bg-slate-50 border-slate-300 text-slate-900', 'bg-zinc-800/50 border-zinc-700 text-white')} h-12`}
                />
                {inputValue && (
                  <div className="flex items-center gap-2 text-sm">
                    {isLinkedIn && (
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                        <Linkedin className="w-3 h-3 mr-1" />
                        LinkedIn Profile
                      </Badge>
                    )}
                    {isEmail && (
                      <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
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
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700"
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
                  className="absolute inset-0 rounded-full border-4 border-cyan-500/30"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-2 rounded-full bg-cyan-600 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>

              <p className={`${crt('text-slate-700', 'text-white/80')} font-medium`}>
                {step === 'matching' && 'Finding prospect...'}
                {step === 'enriching' && 'Enriching contact & company data...'}
              </p>
              <p className={`${crt('text-slate-400', 'text-white/50')} text-sm mt-2`}>
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
                <p className={`${crt('text-slate-900', 'text-white')} font-medium`}>Enrichment Failed</p>
                <p className={`${crt('text-slate-500', 'text-white/60')} text-sm mt-1`}>{error}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRetry}
                className={`${crt('border-slate-300 text-slate-900 hover:bg-slate-100', 'border-zinc-700 text-white hover:bg-zinc-800')}`}
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
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Contact enriched successfully
              </div>

              {/* Contact Preview Card */}
              <div className={`${crt('bg-slate-50 border-slate-200', 'bg-zinc-800/50 border-zinc-700/50')} rounded-lg p-4 space-y-4 border`}>
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-cyan-600/20 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${crt('text-slate-900', 'text-white')}`}>
                      {enrichedData.first_name} {enrichedData.last_name}
                    </h3>
                    <p className={`text-sm ${crt('text-slate-500', 'text-white/60')}`}>{enrichedData.job_title}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`flex items-center gap-2 ${crt('text-slate-600', 'text-white/70')}`}>
                    <Mail className={`h-4 w-4 ${crt('text-slate-400', 'text-white/40')}`} />
                    <span className="truncate">{enrichedData.email || 'N/A'}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${crt('text-slate-600', 'text-white/70')}`}>
                    <Phone className={`h-4 w-4 ${crt('text-slate-400', 'text-white/40')}`} />
                    <span>{enrichedData.mobile_phone || enrichedData.phone || 'N/A'}</span>
                  </div>
                  {enrichedData.location_city && (
                    <div className={`flex items-center gap-2 ${crt('text-slate-600', 'text-white/70')} col-span-2`}>
                      <MapPin className={`h-4 w-4 ${crt('text-slate-400', 'text-white/40')}`} />
                      <span>
                        {[enrichedData.location_city, enrichedData.location_country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Company Info */}
                {enrichedData.company && (
                  <div className={`pt-3 border-t ${crt('border-slate-200', 'border-zinc-700/50')}`}>
                    <div className="flex items-start gap-2">
                      <Building className={`h-4 w-4 ${crt('text-slate-400', 'text-white/40')} mt-0.5`} />
                      <div>
                        <p className={`font-medium ${crt('text-slate-900', 'text-white')}`}>{enrichedData.company}</p>
                        <p className={`text-xs ${crt('text-slate-400', 'text-white/50')}`}>
                          {[
                            enrichedData.company_industry,
                            enrichedData.company_size,
                            enrichedData.company_hq_location
                          ].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {enrichedData.skills?.length > 0 && (
                  <div className={`pt-3 border-t ${crt('border-slate-200', 'border-zinc-700/50')}`}>
                    <div className="flex flex-wrap gap-1">
                      {enrichedData.skills.slice(0, 6).map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`text-xs ${crt('bg-slate-100 border-slate-300 text-slate-600', 'bg-zinc-800 border-zinc-600 text-white/70')}`}
                        >
                          {skill}
                        </Badge>
                      ))}
                      {enrichedData.skills.length > 6 && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${crt('bg-slate-100 border-slate-300 text-slate-400', 'bg-zinc-800 border-zinc-600 text-white/50')}`}
                        >
                          +{enrichedData.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('input')}
                  disabled={loading}
                  className={`flex-1 ${crt('border-slate-300 text-slate-900 hover:bg-slate-100', 'border-zinc-700 text-white hover:bg-zinc-800')}`}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-[2] bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Add Contact
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

export default QuickAddContactModal;
