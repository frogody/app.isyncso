import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { SentinelButton } from './ui/SentinelButton';
import { SentinelCard } from './ui/SentinelCard';
import { SentinelBadge } from './ui/SentinelBadge';

interface AISystem {
  id: string;
  name: string;
  ai_techniques?: string[];
}

interface DeclarationOfConformityProps {
  system: AISystem;
  onBack: () => void;
}

interface FormData {
  providerName: string;
  providerAddress: string;
  providerContact: string;
  systemName: string;
  systemType: string;
  systemVersion: string;
  conformityProcedure: string;
  notifiedBodyName: string;
  notifiedBodyNumber: string;
  harmonisedStandards: string;
  otherStandards: string;
  signatureName: string;
  signatureTitle: string;
  signatureDate: string;
  signaturePlace: string;
}

export default function DeclarationOfConformity({ system, onBack }: DeclarationOfConformityProps) {
  const [formData, setFormData] = useState<FormData>({
    providerName: '',
    providerAddress: '',
    providerContact: '',
    systemName: system.name,
    systemType: system.ai_techniques?.join(', ') || '',
    systemVersion: '',
    conformityProcedure: 'Internal control (Article 43)',
    notifiedBodyName: '',
    notifiedBodyNumber: '',
    harmonisedStandards: '',
    otherStandards: '',
    signatureName: '',
    signatureTitle: '',
    signatureDate: new Date().toISOString().split('T')[0],
    signaturePlace: '',
  });

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const generateDocument = useCallback(() => {
    return `# EU DECLARATION OF CONFORMITY

**AI System:** ${formData.systemName}

---

## Provider Information
**Name:** ${formData.providerName || '[PLACEHOLDER: Provider legal name]'}
**Address:** ${formData.providerAddress || '[PLACEHOLDER: Complete legal address]'}
**Contact:** ${formData.providerContact || '[PLACEHOLDER: Contact person and details]'}

---

## AI System Identification
**Name:** ${formData.systemName}
**Type/Category:** ${formData.systemType || '[PLACEHOLDER: AI system type]'}
**Version:** ${formData.systemVersion || '[PLACEHOLDER: Version number]'}
**Risk Classification:** High-Risk AI System (Annex III)

---

## Declaration

We, the undersigned, acting on behalf of ${formData.providerName || '[PROVIDER]'}, declare under our sole responsibility that the AI system described above is in conformity with the requirements set out in the EU Artificial Intelligence Act (EU) 2024/1689.

### Conformity Assessment Procedure
The conformity assessment procedure used is: **${formData.conformityProcedure}**

${formData.notifiedBodyName ? `**Notified Body:**\n- Name: ${formData.notifiedBodyName}\n- Identification Number: ${formData.notifiedBodyNumber}\n` : ''}

### Standards and Specifications
**Harmonised Standards Applied:**
${formData.harmonisedStandards || '[PLACEHOLDER: List all harmonised standards applied]'}

**Other Technical Specifications:**
${formData.otherStandards || '[PLACEHOLDER: Any other technical specifications used]'}

### Documentation Reference
The Technical Documentation required by Annex IV is available and maintained by the provider. Documentation date: ${formData.signatureDate}

---

## Signature

**Signed for and on behalf of:** ${formData.providerName || '[PLACEHOLDER: Provider name]'}
**Name:** ${formData.signatureName || '[PLACEHOLDER: Authorized signatory name]'}
**Title/Position:** ${formData.signatureTitle || '[PLACEHOLDER: Title/Position]'}
**Place of Issue:** ${formData.signaturePlace || '[PLACEHOLDER: City, Country]'}
**Date of Issue:** ${formData.signatureDate}
**Signature:** _________________________

---

## Legal Notice
This Declaration of Conformity is issued in accordance with Article 47 of Regulation (EU) 2024/1689 (EU AI Act).

*Document generated on ${new Date().toISOString().split('T')[0]}*
*This is a draft template - complete all [PLACEHOLDER] fields and obtain authorized signature before official use.*
`;
  }, [formData]);

  const handleExport = useCallback(() => {
    const disclaimer = `# DISCLAIMER\nThis Declaration of Conformity is a DRAFT template and MUST be completed and signed by an authorized representative.\n\n---\n\n`;
    const fullContent = disclaimer + generateDocument();
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EU_Declaration_of_Conformity_${system.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateDocument, system.name]);

  const inputClass = 'bg-zinc-900/40 border-zinc-800/60 text-white placeholder:text-zinc-500 focus:border-sky-500/50 focus:ring-sky-500/20';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SentinelButton variant="secondary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </SentinelButton>
        <SentinelButton onClick={handleExport} icon={<Download className="w-4 h-4" />}>
          Export Document
        </SentinelButton>
      </div>

      {/* System Info */}
      <SentinelCard padding="md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">EU Declaration of Conformity</h2>
            <p className="text-sm text-zinc-400">{system.name}</p>
          </div>
          <SentinelBadge variant="highRisk">HIGH-RISK</SentinelBadge>
        </div>
      </SentinelCard>

      {/* Disclaimer */}
      <SentinelCard padding="sm" className="border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400 mb-1">Draft Template</p>
            <p className="text-xs text-zinc-300">
              Complete all fields and obtain authorized signature before using this declaration officially.
            </p>
          </div>
        </div>
      </SentinelCard>

      {/* Form */}
      <SentinelCard padding="md">
        <div className="space-y-6">
          {/* Provider Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Provider Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Provider Legal Name</label>
                <Input value={formData.providerName} onChange={(e) => handleChange('providerName', e.target.value)} placeholder="Full legal name of the organization" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Legal Address</label>
                <Textarea value={formData.providerAddress} onChange={(e) => handleChange('providerAddress', e.target.value)} placeholder="Complete legal address" className={inputClass} rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Contact Information</label>
                <Input value={formData.providerContact} onChange={(e) => handleChange('providerContact', e.target.value)} placeholder="Contact person name and details" className={inputClass} />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">System Name</label>
                <Input value={formData.systemName} onChange={(e) => handleChange('systemName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Version Number</label>
                <Input value={formData.systemVersion} onChange={(e) => handleChange('systemVersion', e.target.value)} placeholder="e.g., 1.0.0" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">System Type/Category</label>
              <Input value={formData.systemType} onChange={(e) => handleChange('systemType', e.target.value)} placeholder="AI techniques and system category" className={inputClass} />
            </div>
          </div>

          {/* Conformity Assessment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Conformity Assessment</h3>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Assessment Procedure</label>
              <select
                value={formData.conformityProcedure}
                onChange={(e) => handleChange('conformityProcedure', e.target.value)}
                className="w-full px-4 h-11 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
              >
                <option value="Internal control (Article 43)">Internal control (Article 43)</option>
                <option value="Quality management assessment (Article 43)">Quality management assessment (Article 43)</option>
                <option value="Conformity based on full quality assurance">Conformity based on full quality assurance</option>
              </select>
            </div>
            {formData.conformityProcedure !== 'Internal control (Article 43)' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Notified Body Name</label>
                  <Input value={formData.notifiedBodyName} onChange={(e) => handleChange('notifiedBodyName', e.target.value)} placeholder="Name of notified body" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Identification Number</label>
                  <Input value={formData.notifiedBodyNumber} onChange={(e) => handleChange('notifiedBodyNumber', e.target.value)} placeholder="e.g., NB 1234" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* Standards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Standards Applied</h3>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Harmonised Standards</label>
              <Textarea value={formData.harmonisedStandards} onChange={(e) => handleChange('harmonisedStandards', e.target.value)} placeholder="List harmonised standards (EN standards) applied" className={inputClass} rows={3} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Other Technical Specifications</label>
              <Textarea value={formData.otherStandards} onChange={(e) => handleChange('otherStandards', e.target.value)} placeholder="Other standards or specifications used" className={inputClass} rows={2} />
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Authorized Signature</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Signatory Name</label>
                <Input value={formData.signatureName} onChange={(e) => handleChange('signatureName', e.target.value)} placeholder="Full name of authorized person" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Title/Position</label>
                <Input value={formData.signatureTitle} onChange={(e) => handleChange('signatureTitle', e.target.value)} placeholder="e.g., CEO, Legal Representative" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Place of Issue</label>
                <Input value={formData.signaturePlace} onChange={(e) => handleChange('signaturePlace', e.target.value)} placeholder="City, Country" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Date of Issue</label>
                <Input type="date" value={formData.signatureDate} onChange={(e) => handleChange('signatureDate', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </SentinelCard>
    </div>
  );
}
