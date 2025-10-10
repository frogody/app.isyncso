
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Info } from "lucide-react";

export default function CampaignOutreachStyleModal({ open, onClose, campaign, onSave, user }) {
  const [styleConfig, setStyleConfig] = useState(campaign.message_style || {
    tone: "direct_observational",
    data_points: ["years_at_company", "promotions", "company_growth"],
    campaign_context: "",
    intro_style: "observation_based",
    custom_instructions: ""
  });

  const toneOptions = [
    {
      value: "direct_observational",
      label: user?.language === 'nl' ? "Direct & Observerend" : "Direct & Observational",
      description: user?.language === 'nl'
        ? "Deel wat je zag, wat je denkt, vraag bevestiging"
        : "Share what you saw, what you think, ask confirmation",
      example: user?.language === 'nl'
        ? "Zag dat je 3 promoties kreeg in 5 jaar bij Acme, dus ik denk dat je een best kritisch team runt daar. Zie ik dat goed?"
        : "Saw you got 3 promotions in 5 years at Acme, so I'm guessing you're running a pretty critical team there. Am I reading that right?"
    },
    {
      value: "professional_curious",
      label: user?.language === 'nl' ? "Professioneel & Nieuwsgierig" : "Professional & Curious",
      description: user?.language === 'nl'
        ? "Formeler maar nog steeds oprecht geïnteresseerd"
        : "More formal but still genuinely interested",
      example: user?.language === 'nl'
        ? "Ik zie dat je carrière bij Acme indrukwekkend is. Zou je open staan voor een gesprek over..."
        : "I see your career at Acme has been impressive. Would you be open to discussing..."
    },
    {
      value: "casual_friendly",
      label: user?.language === 'nl' ? "Casual & Vriendelijk" : "Casual & Friendly",
      description: user?.language === 'nl'
        ? "Informeel en benaderbaar"
        : "Informal and approachable",
      example: user?.language === 'nl'
        ? "Hey! Zag je profiel en dacht - dit is interessant..."
        : "Hey! Saw your profile and thought - this is interesting..."
    }
  ];

  const dataPointOptions = [
    {
      value: "years_at_company",
      label: user?.language === 'nl' ? "Jaren bij huidig bedrijf" : "Years at current company",
      field: "years_with_current_company"
    },
    {
      value: "promotions",
      label: user?.language === 'nl' ? "Aantal promoties" : "Number of promotions",
      field: "times_promoted_current_company"
    },
    {
      value: "company_growth",
      label: user?.language === 'nl' ? "Bedrijfsgroei (12m)" : "Company growth (12m)",
      field: "percent_employee_growth_12m"
    },
    {
      value: "job_switches",
      label: user?.language === 'nl' ? "Aantal bedrijfswisselingen" : "Number of company switches",
      field: "times_hopped_company_to_company"
    },
    {
      value: "location",
      label: user?.language === 'nl' ? "Woonlocatie" : "Home location",
      field: "person_home_location"
    },
    {
      value: "industry",
      label: user?.language === 'nl' ? "Sector" : "Industry",
      field: "industry"
    },
    {
      value: "company_size",
      label: user?.language === 'nl' ? "Bedrijfsgrootte" : "Company size",
      field: "employee_count"
    },
    {
      value: "recent_ma",
      label: user?.language === 'nl' ? "Recente fusies/overnames" : "Recent M&A news",
      field: "recent_ma_news"
    },
    {
      value: "salary_range",
      label: user?.language === 'nl' ? "Geschat salaris" : "Estimated salary",
      field: "estimated_current_salary_range"
    },
    {
      value: "age_range",
      label: user?.language === 'nl' ? "Leeftijdscategorie" : "Age range",
      field: "estimated_age_range"
    },
    {
      value: "intelligence_score",
      label: user?.language === 'nl' ? "Readiness score" : "Readiness score",
      field: "intelligence_score"
    },
    {
      value: "key_insights",
      label: user?.language === 'nl' ? "Key insights (AI)" : "Key insights (AI)",
      field: "key_insights"
    },
    {
      value: "career_indicators",
      label: user?.language === 'nl' ? "Carrière indicatoren" : "Career change indicators",
      field: "career_change_indicators"
    },
    {
      value: "motivation_triggers",
      label: user?.language === 'nl' ? "Motivatie triggers" : "Motivation triggers",
      field: "motivation_triggers"
    }
  ];

  const handleDataPointToggle = (value) => {
    const current = styleConfig.data_points || [];
    if (current.includes(value)) {
      setStyleConfig({
        ...styleConfig,
        data_points: current.filter(v => v !== value)
      });
    } else {
      setStyleConfig({
        ...styleConfig,
        data_points: [...current, value]
      });
    }
  };

  const handleSave = () => {
    onSave(styleConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] border-0 flex flex-col overflow-hidden"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2" style={{color: 'var(--txt)'}}>
            <Sparkles className="w-5 h-5" style={{color: 'var(--accent)'}} />
            {user?.language === 'nl' ? 'Outreach Schrijfstijl' : 'Outreach Writing Style'}
          </DialogTitle>
          <p className="text-sm mt-2" style={{color: 'var(--muted)'}}>
            {user?.language === 'nl'
              ? 'Configureer hoe AI outreach berichten genereert voor deze campagne'
              : 'Configure how AI generates outreach messages for this campaign'}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1 -mx-1" style={{ maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
          <div className="space-y-6 pr-4 pb-4">
            {/* Tone Selection */}
            <div>
              <Label className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {user?.language === 'nl' ? 'Schrijftoon' : 'Writing Tone'}
              </Label>
              <Select
                value={styleConfig.tone}
                onValueChange={(value) => setStyleConfig({...styleConfig, tone: value})}
              >
                <SelectTrigger className="mt-2 bg-transparent" style={{borderColor: 'rgba(255,255,255,.12)'}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)' }}>
                  {toneOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} style={{ color: 'var(--txt)' }}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs" style={{color: 'var(--muted)'}}>{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show example for selected tone */}
              <div className="mt-3 p-3 rounded-lg" style={{background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.25)'}}>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{color: '#60A5FA'}} />
                  <div>
                    <p className="text-xs font-medium mb-1" style={{color: '#93C5FD'}}>
                      {user?.language === 'nl' ? 'Voorbeeld:' : 'Example:'}
                    </p>
                    <p className="text-xs" style={{color: '#93C5FD'}}>
                      {toneOptions.find(t => t.value === styleConfig.tone)?.example}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Points Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block" style={{color: 'var(--txt)'}}>
                {user?.language === 'nl' ? 'Datapunten om te gebruiken' : 'Data points to use'}
              </Label>
              <p className="text-xs mb-3" style={{color: 'var(--muted)'}}>
                {user?.language === 'nl'
                  ? 'Selecteer welke kandidaat data gebruikt moet worden in de outreach berichten'
                  : 'Select which candidate data should be used in outreach messages'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {dataPointOptions.map(option => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: styleConfig.data_points?.includes(option.value)
                        ? 'rgba(239,68,68,.08)'
                        : 'rgba(255,255,255,.02)',
                      border: styleConfig.data_points?.includes(option.value)
                        ? '1px solid rgba(239,68,68,.3)'
                        : '1px solid rgba(255,255,255,.06)'
                    }}
                    onClick={() => handleDataPointToggle(option.value)}
                  >
                    <Checkbox
                      id={option.value}
                      checked={styleConfig.data_points?.includes(option.value)}
                      onCheckedChange={() => handleDataPointToggle(option.value)}
                    />
                    <label
                      htmlFor={option.value}
                      className="text-sm cursor-pointer flex-1"
                      style={{color: 'var(--txt)'}}
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Context */}
            <div>
              <Label className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {user?.language === 'nl' ? 'Campagne context' : 'Campaign context'}
              </Label>
              <p className="text-xs mt-1 mb-2" style={{color: 'var(--muted)'}}>
                {user?.language === 'nl'
                  ? 'Algemene informatie over deze campagne die in berichten terugkomt (bijv. vacature, bedrijf, project)'
                  : 'General information about this campaign to include in messages (e.g. vacancy, company, project)'}
              </p>
              <Textarea
                value={styleConfig.campaign_context || ''}
                onChange={(e) => setStyleConfig({...styleConfig, campaign_context: e.target.value})}
                placeholder={user?.language === 'nl'
                  ? 'bijv. "We zoeken een CFO voor een scale-up in fintech, Series B funding, 50+ team"'
                  : 'e.g. "We\'re looking for a CFO for a fintech scale-up, Series B funding, 50+ team"'}
                rows={3}
                className="mt-2 bg-transparent"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              />
            </div>

            {/* Custom Instructions */}
            <div>
              <Label className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                {user?.language === 'nl' ? 'Extra instructies' : 'Custom instructions'}
              </Label>
              <p className="text-xs mt-1 mb-2" style={{color: 'var(--muted)'}}>
                {user?.language === 'nl'
                  ? 'Specifieke instructies voor hoe berichten geschreven moeten worden'
                  : 'Specific instructions for how messages should be written'}
              </p>
              <Textarea
                value={styleConfig.custom_instructions || ''}
                onChange={(e) => setStyleConfig({...styleConfig, custom_instructions: e.target.value})}
                placeholder={user?.language === 'nl'
                  ? 'bijv. "Verwijs altijd naar hun recente promotie", "Noem de locatie van ons kantoor", "Gebruik humor"'
                  : 'e.g. "Always reference their recent promotion", "Mention our office location", "Use humor"'}
                rows={4}
                className="mt-2 bg-transparent"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0" style={{borderColor: 'rgba(255,255,255,.06)'}}>
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--txt)',
              border: '1px solid rgba(255,255,255,.12)'
            }}
          >
            {user?.language === 'nl' ? 'Annuleren' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            className="btn-primary"
            style={{
              background: 'rgba(239,68,68,.12)',
              color: '#FFCCCB',
              border: '1px solid rgba(239,68,68,.3)'
            }}
          >
            {user?.language === 'nl' ? 'Opslaan' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
