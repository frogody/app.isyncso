import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Linkedin,
  Zap,
  Loader2,
  Coins,
} from 'lucide-react';
import { useEnrichmentConfig } from '@/hooks/useEnrichmentConfig';
import { fullEnrichFromLinkedIn } from '@/lib/explorium-api';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const ENRICHMENT_ICONS = {
  linkedin_enrich: Linkedin,
  sync_intel: Sparkles,
  full_package: Zap,
};

const ENRICHMENT_COLORS = {
  linkedin_enrich: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5',
  sync_intel: 'border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5',
  full_package: 'border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5',
};

const ENRICHMENT_ICON_COLORS = {
  linkedin_enrich: 'text-blue-400',
  sync_intel: 'text-amber-400',
  full_package: 'text-green-400',
};

export function EnrichmentOptionsPopover({
  candidate,
  userCredits = 0,
  userId,
  organizationId,
  onEnrichmentComplete,
  onCreditsUpdated,
  disabled = false,
  className,
}) {
  const { configList, loading: configLoading } = useEnrichmentConfig();
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(null);

  const handleEnrichment = async (option) => {
    if (!option || !userId || !candidate?.id) return;

    const creditCost = option.credits;

    if (userCredits < creditCost) {
      toast.error('Insufficient credits', {
        description: `You need ${creditCost} credits but only have ${userCredits}`,
      });
      return;
    }

    setProcessing(option.key);

    try {
      // Deduct credits via RPC
      const { data: deductResult, error: deductError } = await supabase
        .rpc('deduct_credits', {
          p_user_id: userId,
          p_amount: creditCost,
          p_transaction_type: 'enrichment',
          p_enrichment_type: option.key,
          p_reference_type: 'candidate',
          p_reference_id: candidate.id,
          p_reference_name: candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unknown',
          p_description: `${option.label} for ${candidate.name || candidate.first_name || 'candidate'}`,
        });

      if (deductError) throw new Error(deductError.message);
      if (!deductResult?.[0]?.success) throw new Error(deductResult?.[0]?.error_message || 'Failed to deduct credits');

      const newBalance = deductResult[0].new_balance;

      try {
        if (option.key === 'linkedin_enrich' || option.key === 'full_package') {
          const linkedinUrl = candidate.linkedin_url || candidate.linkedin_profile;
          if (linkedinUrl) {
            const enriched = await fullEnrichFromLinkedIn(linkedinUrl);

            // Save enriched data to candidates table
            const updateData = {
              verified_email: enriched.email || candidate.verified_email,
              verified_phone: enriched.phone || candidate.verified_phone,
              verified_mobile: enriched.mobile_phone || candidate.verified_mobile,
              personal_email: enriched.personal_email || candidate.personal_email,
              mobile_phone: enriched.mobile_phone || candidate.mobile_phone,
              work_phone: enriched.work_phone || candidate.work_phone,
              email_status: enriched.email_status || candidate.email_status,
              explorium_prospect_id: enriched.explorium_prospect_id || candidate.explorium_prospect_id,
              explorium_business_id: enriched.explorium_business_id || candidate.explorium_business_id,
              enriched_at: new Date().toISOString(),
              enrichment_source: 'explorium',
              job_title: candidate.job_title || enriched.job_title,
              company_name: candidate.company_name || enriched.company,
              job_department: enriched.job_department || candidate.job_department,
              job_seniority_level: enriched.job_seniority_level || candidate.job_seniority_level,
              location_city: enriched.location_city || candidate.location_city,
              location_region: enriched.location_region || candidate.location_region,
              location_country: enriched.location_country || candidate.location_country,
              age_group: enriched.age_group || candidate.age_group,
              gender: enriched.gender || candidate.gender,
              skills: enriched.skills?.length ? enriched.skills : candidate.skills,
              inferred_skills: enriched.skills?.length ? enriched.skills : candidate.inferred_skills,
              work_history: enriched.work_history?.length ? enriched.work_history : candidate.work_history,
              education: enriched.education?.length ? enriched.education : candidate.education,
              certifications: enriched.certifications?.length ? enriched.certifications : candidate.certifications,
              interests: enriched.interests?.length ? enriched.interests : candidate.interests,
              company_domain: enriched.company_domain || candidate.company_domain,
            };

            await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', candidate.id);
          }
        }

        if (option.key === 'sync_intel' || option.key === 'full_package') {
          // Company Intelligence
          const companyName = candidate.current_company || candidate.company_name;
          if (companyName) {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCompanyIntelligence`,
              {
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
              }
            );
          }

          // Candidate Intelligence
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCandidateIntelligence`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                candidate_id: candidate.id,
                organization_id: organizationId,
              }),
            }
          );
        }

        toast.success('Enrichment complete!', {
          description: `${option.label} — ${creditCost} credits deducted`,
        });

        onEnrichmentComplete?.();
        onCreditsUpdated?.(newBalance);
        setOpen(false);
      } catch (enrichError) {
        console.error('Enrichment execution failed:', enrichError);
        toast.error('Enrichment partially failed', {
          description: 'Credits were deducted. Contact support if the issue persists.',
        });
        onCreditsUpdated?.(newBalance);
      }
    } catch (error) {
      console.error('Enrichment failed:', error);
      toast.error('Enrichment failed', { description: error.message });
    } finally {
      setProcessing(null);
    }
  };

  if (configLoading) {
    return (
      <Button disabled size="sm" className={className}>
        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className={cn(
            'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
            className,
          )}
          disabled={disabled || !!processing}
        >
          {processing ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 mr-1.5" />
          )}
          Enrich
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-zinc-900 border-zinc-700 shadow-xl"
        align="end"
        sideOffset={5}
      >
        <div className="p-4 border-b border-zinc-800">
          <h4 className="font-semibold text-white">Choose Enrichment</h4>
          <div className="flex items-center gap-2 mt-1">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-400">
              Balance: <span className="text-amber-400 font-semibold">{userCredits} credits</span>
            </span>
          </div>
        </div>

        <div className="p-2 space-y-2">
          {configList.map((option) => {
            const Icon = ENRICHMENT_ICONS[option.key] || Sparkles;
            const colorClass = ENRICHMENT_COLORS[option.key] || '';
            const iconColorClass = ENRICHMENT_ICON_COLORS[option.key] || 'text-zinc-400';
            const canAfford = userCredits >= option.credits;
            const isProcessing = processing === option.key;

            return (
              <button
                key={option.key}
                onClick={() => handleEnrichment(option)}
                disabled={!canAfford || !!processing}
                className={cn(
                  'w-full p-3 rounded-lg border bg-zinc-800/50 text-left transition-all',
                  canAfford && !processing
                    ? colorClass + ' cursor-pointer'
                    : 'opacity-50 cursor-not-allowed border-zinc-700',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      option.key === 'full_package' ? 'bg-green-500/10' :
                      option.key === 'linkedin_enrich' ? 'bg-blue-500/10' : 'bg-amber-500/10',
                    )}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Icon className={cn('w-4 h-4', iconColorClass)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">{option.label}</span>
                        {option.key === 'full_package' && (
                          <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0">
                            Best Value
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{option.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs flex-shrink-0',
                      canAfford ? 'border-zinc-600 text-zinc-300' : 'border-red-500/30 text-red-400',
                    )}
                  >
                    {option.credits} cr
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-800/30">
          <p className="text-xs text-zinc-500">Credits are deducted immediately upon selection</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EnrichmentOptionsPopover;
