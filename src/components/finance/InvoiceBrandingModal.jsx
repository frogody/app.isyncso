import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { BrandAssets } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Palette, Image, CreditCard, Type, Check, Loader2, Building2,
  FileText, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Dark header bar with brand color accents',
    preview: 'bg-zinc-900',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'White header with colored accent line',
    preview: 'bg-white',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, whitespace-focused, thin lines',
    preview: 'bg-zinc-50',
  },
];

export default function InvoiceBrandingModal({ open, onOpenChange, onSave }) {
  const { user, company, updateCompany } = useUser();
  const { ft } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandAssets, setBrandAssets] = useState(null);
  const companyId = company?.id || user?.company_id;

  // Form state from invoice_branding JSONB
  const [formData, setFormData] = useState({
    enabled: true,
    template: 'modern',
    logo_type: 'primary',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_vat: '',
    bank_name: '',
    iban: '',
    bic: '',
    payment_terms: '',
    footer_text: '',
    show_bank_details: true,
    color_override_primary: '',
    color_override_accent: '',
  });

  useEffect(() => {
    if (open && companyId) {
      loadData();
    } else if (open && !companyId) {
      // No company available, show form with defaults
      setLoading(false);
    }
  }, [open, companyId, company]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch brand assets
      const assets = await BrandAssets.filter({ company_id: companyId });
      setBrandAssets(assets?.[0] || null);

      // Load existing invoice_branding from company
      const existing = company?.invoice_branding || {};
      setFormData(prev => ({
        ...prev,
        enabled: existing.enabled ?? true,
        template: existing.template || 'modern',
        logo_type: existing.logo_type || 'primary',
        company_address: existing.company_address || '',
        company_phone: existing.company_phone || '',
        company_email: existing.company_email || (company?.domain ? `billing@${company.domain}` : ''),
        company_vat: existing.company_vat || '',
        bank_name: existing.bank_name || '',
        iban: existing.iban || '',
        bic: existing.bic || '',
        payment_terms: existing.payment_terms || 'Payment due within 30 days',
        footer_text: existing.footer_text || 'Thank you for your business!',
        show_bank_details: existing.show_bank_details ?? true,
        color_override_primary: existing.color_override_primary || '',
        color_override_accent: existing.color_override_accent || '',
      }));
    } catch (err) {
      console.error('Error loading brand data:', err);
      toast.error('Failed to load branding data');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandingData = { ...formData };
      await updateCompany({ invoice_branding: brandingData });
      toast.success('Invoice branding saved');
      onSave?.(brandingData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving branding:', err);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  // Get available logos from brand assets
  const availableLogos = brandAssets?.logos || [];
  const brandColors = brandAssets?.colors || {};

  // Get the selected logo URL for preview
  const selectedLogo = availableLogos.find(l => l.type === formData.logo_type) || availableLogos[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            Customize Invoice Branding
          </DialogTitle>
          <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
            Pull your brand assets to make invoices look professional. Changes apply to all future PDFs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Template Picker */}
              <Section icon={Sparkles} title="Template Style">
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateField('template', t.id)}
                      className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                        formData.template === t.id
                          ? 'border-blue-500 ring-1 ring-blue-500/30'
                          : ft('border-slate-200 hover:border-slate-300', 'border-zinc-700 hover:border-zinc-600')
                      }`}
                    >
                      {/* Mini preview */}
                      <div className={`h-16 rounded-lg mb-2 ${t.preview} border ${ft('border-slate-200', 'border-zinc-600')} relative overflow-hidden`}>
                        {t.id === 'modern' && (
                          <>
                            <div className="absolute inset-x-0 top-0 h-5 bg-zinc-900" />
                            <div className="absolute left-2 top-1 w-6 h-2 rounded-sm" style={{ backgroundColor: brandColors.primary || '#22d3ee' }} />
                            <div className={`absolute inset-x-0 top-5 h-[2px]`} style={{ backgroundColor: brandColors.primary || '#22d3ee' }} />
                          </>
                        )}
                        {t.id === 'classic' && (
                          <>
                            <div className="absolute left-2 top-2 w-8 h-2 bg-zinc-300 rounded-sm" />
                            <div className="absolute right-2 top-2 text-[6px] font-bold" style={{ color: brandColors.primary || '#22d3ee' }}>INVOICE</div>
                            <div className="absolute inset-x-2 top-6 h-[1.5px]" style={{ backgroundColor: brandColors.primary || '#22d3ee' }} />
                          </>
                        )}
                        {t.id === 'minimal' && (
                          <>
                            <div className="absolute left-2 top-2 w-4 h-2 bg-zinc-200 rounded-sm" />
                            <div className="absolute inset-x-2 top-6 h-[0.5px] bg-zinc-200" />
                          </>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{t.name}</p>
                      <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mt-0.5`}>{t.description}</p>
                      {formData.template === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Logo Selection */}
              {availableLogos.length > 0 && (
                <Section icon={Image} title="Logo">
                  <div className="flex gap-3 flex-wrap">
                    {availableLogos.map((logo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateField('logo_type', logo.type)}
                        className={`relative p-2 rounded-xl border-2 transition-all ${
                          formData.logo_type === logo.type
                            ? 'border-blue-500 ring-1 ring-blue-500/30'
                            : ft('border-slate-200 hover:border-slate-300', 'border-zinc-700 hover:border-zinc-600')
                        }`}
                      >
                        <img
                          src={logo.url}
                          alt={logo.type}
                          className="w-16 h-16 object-contain rounded-lg"
                         loading="lazy" decoding="async" />
                        <p className={`text-xs text-center mt-1 capitalize ${ft('text-slate-500', 'text-zinc-400')}`}>
                          {logo.type}
                        </p>
                        {formData.logo_type === logo.type && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Brand Colors */}
              {(brandColors.primary || brandColors.accent) && (
                <Section icon={Palette} title="Brand Colors">
                  <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mb-3`}>
                    Colors pulled from your brand assets. Override below if needed.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <ColorSwatch
                      label="Primary"
                      color={formData.color_override_primary || brandColors.primary}
                      brandColor={brandColors.primary}
                      onChange={(val) => updateField('color_override_primary', val)}
                      ft={ft}
                    />
                    <ColorSwatch
                      label="Accent"
                      color={formData.color_override_accent || brandColors.accent || brandColors.secondary}
                      brandColor={brandColors.accent || brandColors.secondary}
                      onChange={(val) => updateField('color_override_accent', val)}
                      ft={ft}
                    />
                  </div>
                </Section>
              )}

              {/* Company Details */}
              <Section icon={Building2} title="Company Details">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Company Address</Label>
                    <Textarea
                      value={formData.company_address}
                      onChange={(e) => updateField('company_address', e.target.value)}
                      placeholder="Herengracht 123, 1015 BA Amsterdam"
                      rows={2}
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Phone</Label>
                    <Input
                      value={formData.company_phone}
                      onChange={(e) => updateField('company_phone', e.target.value)}
                      placeholder="+31 20 123 4567"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Email</Label>
                    <Input
                      value={formData.company_email}
                      onChange={(e) => updateField('company_email', e.target.value)}
                      placeholder="billing@company.com"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>VAT Number</Label>
                    <Input
                      value={formData.company_vat}
                      onChange={(e) => updateField('company_vat', e.target.value)}
                      placeholder="NL123456789B01"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                </div>
              </Section>

              {/* Bank & Payment */}
              <Section icon={CreditCard} title="Bank & Payment Details">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Bank Name</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => updateField('bank_name', e.target.value)}
                      placeholder="ABN AMRO"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>BIC / SWIFT</Label>
                    <Input
                      value={formData.bic}
                      onChange={(e) => updateField('bic', e.target.value)}
                      placeholder="ABNANL2A"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>IBAN</Label>
                    <Input
                      value={formData.iban}
                      onChange={(e) => updateField('iban', e.target.value)}
                      placeholder="NL91ABNA0417164300"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Payment Terms</Label>
                    <Input
                      value={formData.payment_terms}
                      onChange={(e) => updateField('payment_terms', e.target.value)}
                      placeholder="Payment due within 30 days"
                      className={`mt-1 text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('show_bank_details', !formData.show_bank_details)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${formData.show_bank_details ? 'bg-blue-500' : ft('bg-slate-300', 'bg-zinc-600')}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${formData.show_bank_details ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>Show bank details on invoice</span>
                  </div>
                </div>
              </Section>

              {/* Footer */}
              <Section icon={Type} title="Footer Text">
                <Input
                  value={formData.footer_text}
                  onChange={(e) => updateField('footer_text', e.target.value)}
                  placeholder="Thank you for your business!"
                  className={`text-sm ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
                />
              </Section>
            </>
          )}
        </div>

        <DialogFooter className="gap-3 pt-4 border-t border-zinc-700/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={ft('border-slate-200', 'border-zinc-700')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Branding
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Section({ icon: Icon, title, children }) {
  const { ft } = useTheme();
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-400" />
        <h3 className={`text-sm font-semibold ${ft('text-slate-900', 'text-white')}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({ label, color, brandColor, onChange, ft }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative cursor-pointer group">
        <div
          className={`w-10 h-10 rounded-full border-2 ${ft('border-slate-200', 'border-zinc-600')} transition-transform group-hover:scale-110`}
          style={{ backgroundColor: color || '#22d3ee' }}
        />
        <input
          type="color"
          value={color || brandColor || '#22d3ee'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <div>
        <p className={`text-xs font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>{label}</p>
        <p className={`text-[10px] font-mono ${ft('text-slate-400', 'text-zinc-500')}`}>{color || brandColor || '#22d3ee'}</p>
      </div>
    </div>
  );
}
