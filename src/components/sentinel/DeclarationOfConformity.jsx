import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";

export default function DeclarationOfConformity({ system, onBack }) {
  const [formData, setFormData] = useState({
    providerName: "",
    providerAddress: "",
    providerContact: "",
    systemName: system.name,
    systemType: system.ai_techniques?.join(", ") || "",
    systemVersion: "",
    conformityProcedure: "Internal control (Article 43)",
    notifiedBodyName: "",
    notifiedBodyNumber: "",
    harmonisedStandards: "",
    otherStandards: "",
    signatureName: "",
    signatureTitle: "",
    signatureDate: new Date().toISOString().split('T')[0],
    signaturePlace: ""
  });

  const handleChange = React.useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const generateDocument = () => {
    const doc = `# EU DECLARATION OF CONFORMITY

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

${formData.notifiedBodyName ? `
**Notified Body:**
- Name: ${formData.notifiedBodyName}
- Identification Number: ${formData.notifiedBodyNumber}
` : ''}

### Standards and Specifications

**Harmonised Standards Applied:**
${formData.harmonisedStandards || '[PLACEHOLDER: List all harmonised standards applied, e.g., EN standards for AI systems]'}

**Other Technical Specifications:**
${formData.otherStandards || '[PLACEHOLDER: Any other technical specifications or industry standards used]'}

### Documentation Reference

The Technical Documentation required by Annex IV is available and maintained by the provider. Documentation date: ${formData.signatureDate}

---

## Signature

**Signed for and on behalf of:**

${formData.providerName || '[PLACEHOLDER: Provider name]'}

**Name:** ${formData.signatureName || '[PLACEHOLDER: Authorized signatory name]'}

**Title/Position:** ${formData.signatureTitle || '[PLACEHOLDER: Title/Position]'}

**Place of Issue:** ${formData.signaturePlace || '[PLACEHOLDER: City, Country]'}

**Date of Issue:** ${formData.signatureDate}

**Signature:** _________________________

---

## Legal Notice

This Declaration of Conformity is issued in accordance with Article 47 of Regulation (EU) 2024/1689 (EU AI Act). The provider assumes full responsibility for the conformity of the AI system with all applicable requirements.

This declaration shall be kept updated and made available to national competent authorities upon request.

---

*Document generated on ${new Date().toISOString().split('T')[0]}*
*This is a draft template - complete all [PLACEHOLDER] fields and obtain authorized signature before official use.*
`;

    return doc;
  };

  const handleExport = () => {
    const content = generateDocument();
    
    const disclaimer = `# ⚠️ DISCLAIMER

This Declaration of Conformity is a DRAFT template and MUST be completed and signed by an authorized representative of the provider organization before it has any legal validity.

## Required Actions:
1. Complete all [PLACEHOLDER] fields with accurate information
2. Verify conformity assessment procedure details
3. List all applicable harmonised standards
4. Obtain signature from authorized legal representative
5. Attach reference to Technical Documentation
6. Store with CE marking documentation

This draft does NOT constitute a valid declaration until properly completed and signed.

---

`;

    const fullContent = disclaimer + content;
    
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EU_Declaration_of_Conformity_${system.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-white/10 text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleExport}
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Document
          </Button>
        </div>

        {/* System Info */}
        <Card className="glass-card border-0 border-purple-500/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white mb-2">EU Declaration of Conformity</CardTitle>
                <p className="text-sm text-gray-400">{system.name}</p>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                HIGH-RISK
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Disclaimer */}
        <Card className="glass-card border-0 border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-400 mb-1">Draft Template</p>
                <p className="text-xs text-gray-300">
                  Complete all fields and obtain authorized signature before using this declaration officially. 
                  This document must be signed by a legal representative of the provider organization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="glass-card border-0 border-purple-500/20">
          <CardContent className="p-6 space-y-6">
            {/* Provider Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Provider Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Provider Legal Name</label>
                  <Input
                    value={formData.providerName}
                    onChange={(e) => handleChange('providerName', e.target.value)}
                    placeholder="Full legal name of the organization"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Legal Address</label>
                  <Textarea
                    value={formData.providerAddress}
                    onChange={(e) => handleChange('providerAddress', e.target.value)}
                    placeholder="Complete legal address"
                    className="bg-black/50 border-white/10 text-white"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Contact Information</label>
                  <Input
                    value={formData.providerContact}
                    onChange={(e) => handleChange('providerContact', e.target.value)}
                    placeholder="Contact person name and details"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">System Name</label>
                  <Input
                    value={formData.systemName}
                    onChange={(e) => handleChange('systemName', e.target.value)}
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Version Number</label>
                  <Input
                    value={formData.systemVersion}
                    onChange={(e) => handleChange('systemVersion', e.target.value)}
                    placeholder="e.g., 1.0.0"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">System Type/Category</label>
                <Input
                  value={formData.systemType}
                  onChange={(e) => handleChange('systemType', e.target.value)}
                  placeholder="AI techniques and system category"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Conformity Assessment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Conformity Assessment</h3>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Assessment Procedure</label>
                <select
                  value={formData.conformityProcedure}
                  onChange={(e) => handleChange('conformityProcedure', e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white"
                >
                  <option value="Internal control (Article 43)">Internal control (Article 43)</option>
                  <option value="Quality management assessment (Article 43)">Quality management assessment (Article 43)</option>
                  <option value="Conformity based on full quality assurance">Conformity based on full quality assurance</option>
                </select>
              </div>
              {formData.conformityProcedure !== "Internal control (Article 43)" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Notified Body Name</label>
                    <Input
                      value={formData.notifiedBodyName}
                      onChange={(e) => handleChange('notifiedBodyName', e.target.value)}
                      placeholder="Name of notified body"
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Identification Number</label>
                    <Input
                      value={formData.notifiedBodyNumber}
                      onChange={(e) => handleChange('notifiedBodyNumber', e.target.value)}
                      placeholder="e.g., NB 1234"
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Standards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Standards Applied</h3>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Harmonised Standards</label>
                <Textarea
                  value={formData.harmonisedStandards}
                  onChange={(e) => handleChange('harmonisedStandards', e.target.value)}
                  placeholder="List harmonised standards (EN standards) applied"
                  className="bg-black/50 border-white/10 text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Other Technical Specifications</label>
                <Textarea
                  value={formData.otherStandards}
                  onChange={(e) => handleChange('otherStandards', e.target.value)}
                  placeholder="Other standards or specifications used"
                  className="bg-black/50 border-white/10 text-white"
                  rows={2}
                />
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Authorized Signature</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Signatory Name</label>
                  <Input
                    value={formData.signatureName}
                    onChange={(e) => handleChange('signatureName', e.target.value)}
                    placeholder="Full name of authorized person"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Title/Position</label>
                  <Input
                    value={formData.signatureTitle}
                    onChange={(e) => handleChange('signatureTitle', e.target.value)}
                    placeholder="e.g., CEO, Legal Representative"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Place of Issue</label>
                  <Input
                    value={formData.signaturePlace}
                    onChange={(e) => handleChange('signaturePlace', e.target.value)}
                    placeholder="City, Country"
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Date of Issue</label>
                  <Input
                    type="date"
                    value={formData.signatureDate}
                    onChange={(e) => handleChange('signatureDate', e.target.value)}
                    className="bg-black/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}