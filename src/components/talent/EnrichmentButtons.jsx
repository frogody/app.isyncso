import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Linkedin, Building2, Loader2, Coins } from 'lucide-react';
import { fullEnrichFromLinkedIn, enrichCompanyOnly } from '@/lib/explorium-api';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { useEnrichmentConfig } from '@/hooks/useEnrichmentConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function EnrichmentButtons({
  candidate,
  userCredits = 0,
  userId,
  organizationId,
  onEnrichmentComplete,
  onCreditsUpdated,
  disabled = false,
  freeEnrichment = false,
}) {
  const { config } = useEnrichmentConfig();
  const [processing, setProcessing] = useState(null);

  const deductCredits = async (enrichmentType, creditCost, description) => {
    const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_transaction_type: 'enrichment',
      p_enrichment_type: enrichmentType,
      p_reference_type: 'candidate',
      p_reference_id: candidate.id,
      p_reference_name: candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim(),
      p_description: description,
    });

    if (deductError) throw new Error(deductError.message);
    if (!deductResult?.[0]?.success) throw new Error(deductResult?.[0]?.error_message || 'Failed to deduct credits');

    return deductResult[0].new_balance;
  };

  // LinkedIn Enrichment (Explorium)
  const handleLinkedInEnrich = async () => {
    const creditCost = config.linkedin_enrich?.credits || 5;
    if (!freeEnrichment && userCredits < creditCost) {
      toast.error('Insufficient credits', { description: `Need ${creditCost} credits` });
      return;
    }

    const linkedinUrl = candidate.linkedin_url || candidate.linkedin_profile;
    if (!linkedinUrl) {
      toast.error('No LinkedIn URL available');
      return;
    }

    setProcessing('linkedin');
    try {
      let newBalance = userCredits;
      if (!freeEnrichment) {
        newBalance = await deductCredits('linkedin_enrich', creditCost, 'LinkedIn Enrichment');
      }
      const enriched = await fullEnrichFromLinkedIn(linkedinUrl);

      await supabase.from('candidates').update({
        verified_email: enriched.email || candidate.verified_email,
        verified_phone: enriched.phone || candidate.verified_phone,
        verified_mobile: enriched.mobile_phone || candidate.verified_mobile,
        personal_email: enriched.personal_email,
        mobile_phone: enriched.mobile_phone,
        work_phone: enriched.work_phone,
        explorium_prospect_id: enriched.explorium_prospect_id,
        explorium_business_id: enriched.explorium_business_id,
        enriched_at: new Date().toISOString(),
        enrichment_source: 'explorium',
        job_title: candidate.job_title || enriched.job_title,
        company_name: candidate.company_name || enriched.company,
        job_department: enriched.job_department,
        job_seniority_level: enriched.job_seniority_level,
        location_city: enriched.location_city,
        location_region: enriched.location_region,
        location_country: enriched.location_country,
        age_group: enriched.age_group,
        gender: enriched.gender,
        skills: enriched.skills?.length ? enriched.skills : candidate.skills,
        inferred_skills: enriched.skills?.length ? enriched.skills : candidate.inferred_skills,
        work_history: enriched.work_history?.length ? enriched.work_history : candidate.work_history,
        education: enriched.education?.length ? enriched.education : candidate.education,
        certifications: enriched.certifications?.length ? enriched.certifications : candidate.certifications,
        interests: enriched.interests?.length ? enriched.interests : candidate.interests,
        company_domain: enriched.company_domain || candidate.company_domain,
      }).eq('id', candidate.id);

      toast.success('LinkedIn enriched!', { description: freeEnrichment ? 'Included with nest' : `${creditCost} credits deducted` });
      onEnrichmentComplete?.();
      if (!freeEnrichment) onCreditsUpdated?.(newBalance);
    } catch (err) {
      toast.error('LinkedIn enrichment failed', { description: err.message });
    } finally {
      setProcessing(null);
    }
  };

  // Company Enrichment (Explorium)
  const handleCompanyEnrich = async () => {
    const creditCost = config.company_enrich?.credits || 3;
    if (!freeEnrichment && userCredits < creditCost) {
      toast.error('Insufficient credits', { description: `Need ${creditCost} credits` });
      return;
    }

    const companyName = candidate.current_company || candidate.company_name;
    const companyDomain = candidate.company_domain;
    if (!companyName && !companyDomain) {
      toast.error('No company information available');
      return;
    }

    setProcessing('company');
    try {
      let newBalance = userCredits;
      if (!freeEnrichment) {
        newBalance = await deductCredits('company_enrich', creditCost, 'Company Enrichment');
      }
      const companyData = await enrichCompanyOnly({ company_name: companyName, domain: companyDomain });

      await supabase.from('candidates').update({
        company_industry: companyData.industry,
        company_employee_count: companyData.employee_count,
        company_revenue_range: companyData.revenue_range,
        company_tech_stack: companyData.tech_stack,
        company_latest_funding: companyData.latest_funding,
        company_total_funding: companyData.funding_total,
        company_hq_location: companyData.hq_location,
        company_description: companyData.description,
        company_domain: companyData.domain || companyDomain,
        explorium_business_id: companyData.business_id,
        company_enriched_at: new Date().toISOString(),
      }).eq('id', candidate.id);

      toast.success('Company enriched!', { description: freeEnrichment ? 'Included with nest' : `${creditCost} credits deducted` });
      onEnrichmentComplete?.();
      if (!freeEnrichment) onCreditsUpdated?.(newBalance);
    } catch (err) {
      toast.error('Company enrichment failed', { description: err.message });
    } finally {
      setProcessing(null);
    }
  };

  // SYNC Intel (AI Intelligence)
  const handleSyncIntel = async () => {
    const creditCost = config.sync_intel?.credits || 10;
    if (!freeEnrichment && userCredits < creditCost) {
      toast.error('Insufficient credits', { description: `Need ${creditCost} credits` });
      return;
    }

    setProcessing('sync');
    try {
      let newBalance = userCredits;
      if (!freeEnrichment) {
        newBalance = await deductCredits('sync_intel', creditCost, 'SYNC Intelligence');
      }

      // Generate Company Intelligence (AI)
      const companyName = candidate.current_company || candidate.company_name;
      if (companyName) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCompanyIntelligence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            companyName,
            companyDomain: candidate.company_domain,
            entityType: 'candidate',
            entityId: candidate.id,
          }),
        });
      }

      // Generate Candidate Intelligence (AI)
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCandidateIntelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          candidate_id: candidate.id,
          organization_id: organizationId,
        }),
      });

      toast.success('Intelligence generated!', { description: freeEnrichment ? 'Included with nest' : `${creditCost} credits deducted` });
      onEnrichmentComplete?.();
      if (!freeEnrichment) onCreditsUpdated?.(newBalance);
    } catch (err) {
      toast.error('Intelligence generation failed', { description: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const isLinkedInEnriched = !!candidate.enriched_at;
  const isCompanyEnriched = !!candidate.company_enriched_at;
  const hasLinkedIn = !!(candidate.linkedin_url || candidate.linkedin_profile);
  const hasCompany = !!(candidate.current_company || candidate.company_name || candidate.company_domain);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {/* LinkedIn Enrich Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isLinkedInEnriched ? "ghost" : "outline"}
              className={isLinkedInEnriched
                ? "text-green-400 border-green-500/30"
                : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              }
              onClick={handleLinkedInEnrich}
              disabled={disabled || processing === 'linkedin' || !hasLinkedIn || isLinkedInEnriched}
            >
              {processing === 'linkedin' ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Linkedin className="w-3 h-3 mr-1.5" />
              )}
              {isLinkedInEnriched ? 'LinkedIn ✓' : 'LinkedIn'}
              {!isLinkedInEnriched && (
                <Badge className={`ml-1.5 text-[10px] px-1 py-0 ${freeEnrichment ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {freeEnrichment ? 'Free' : config.linkedin_enrich?.credits || 5}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Contact info, work history, skills, education via Explorium</p>
          </TooltipContent>
        </Tooltip>

        {/* Company Enrich Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isCompanyEnriched ? "ghost" : "outline"}
              className={isCompanyEnriched
                ? "text-green-400 border-green-500/30"
                : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              }
              onClick={handleCompanyEnrich}
              disabled={disabled || processing === 'company' || !hasCompany || isCompanyEnriched}
            >
              {processing === 'company' ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Building2 className="w-3 h-3 mr-1.5" />
              )}
              {isCompanyEnriched ? 'Company ✓' : 'Company'}
              {!isCompanyEnriched && (
                <Badge className={`ml-1.5 text-[10px] px-1 py-0 ${freeEnrichment ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {freeEnrichment ? 'Free' : config.company_enrich?.credits || 3}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Firmographics, tech stack, funding via Explorium</p>
          </TooltipContent>
        </Tooltip>

        {/* SYNC Intel Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              onClick={handleSyncIntel}
              disabled={disabled || processing === 'sync'}
            >
              {processing === 'sync' ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1.5" />
              )}
              SYNC Intel
              <Badge className={`ml-1.5 text-[10px] px-1 py-0 ${freeEnrichment ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-white'}`}>
                {freeEnrichment ? 'Free' : config.sync_intel?.credits || 10}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI-powered candidate & company intelligence analysis</p>
          </TooltipContent>
        </Tooltip>

        {/* Credits Display */}
        {!freeEnrichment && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 ml-2">
            <Coins className="w-3 h-3" />
            <span>{userCredits}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
