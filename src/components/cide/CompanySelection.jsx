import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, CheckCircle, ArrowRight, ArrowLeft, Bot, Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function CompanySelection({ companies, onSelect, onBack }) {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState(null);
  const [registrationModal, setRegistrationModal] = useState(null);
  const [systemName, setSystemName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [deploymentContext, setDeploymentContext] = useState("customer-facing");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredCompanies, setRegisteredCompanies] = useState(new Set());

  const toggleCompany = (company) => {
    setSelected(prev => 
      prev.some(c => c.domain === company.domain)
        ? prev.filter(c => c.domain !== company.domain)
        : [...prev, company]
    );
  };

  const handleSelectAll = () => {
    setSelected(selected.length === companies.length ? [] : [...companies]);
  };

  const handleContinue = () => {
    if (selected.length === 0) {
      setError("Please select at least one company");
      return;
    }
    setError(null);
    onSelect(selected);
  };

  const openRegistrationModal = (company) => {
    setRegistrationModal(company);
    setSystemName(`${company.company_name} AI Solution`);
    setPurpose(company.ai_enhanced?.ai_summary || "AI-powered solution");
    setDeploymentContext("customer-facing");
  };

  const closeRegistrationModal = () => {
    setRegistrationModal(null);
    setSystemName("");
    setPurpose("");
    setDeploymentContext("customer-facing");
  };

  const handleRegisterSystem = async () => {
    if (!systemName || !purpose) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsRegistering(true);
    try {
      const user = await db.auth.me();
      
      // Get or create company
      let companyRecord = await db.entities.Company.filter({ 
        domain: registrationModal.domain 
      });
      
      let companyId;
      if (companyRecord.length > 0) {
        companyId = companyRecord[0].id;
      } else {
        const newCompany = await db.entities.Company.create({
          name: registrationModal.company_name,
          domain: registrationModal.domain,
          website_url: `https://${registrationModal.domain}`,
          description: registrationModal.description,
          enrichment_source: "cide"
        });
        companyId = newCompany.id;
      }

      // Create AI system
      await db.entities.AISystem.create({
        company_id: companyId,
        name: systemName,
        purpose: purpose,
        description: registrationModal.description,
        provider_name: registrationModal.company_name,
        provider_url: `https://${registrationModal.domain}`,
        deployment_context: deploymentContext,
        risk_classification: "unclassified",
        compliance_status: "not-started",
        source: "cide",
        source_prospect_id: registrationModal.domain,
        assessment_answers: {
          ai_confidence: registrationModal.ai_enhanced?.ai_confidence,
          ai_summary: registrationModal.ai_enhanced?.ai_summary
        }
      });

      toast.success(`AI system registered in SENTINEL`);
      setRegisteredCompanies(prev => new Set([...prev, registrationModal.domain]));
      closeRegistrationModal();
    } catch (error) {
      console.error("Failed to register AI system:", error);
      toast.error(`Failed to register: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-400" />
            Select Companies to Enrich
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {selected.length} of {companies.length} selected
            </span>
            <Button 
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
            >
              {selected.length === companies.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {companies.map((company, idx) => {
            const isSelected = selected.some(c => c.domain === company.domain);
            
            return (
              <div
                key={idx}
                onClick={() => toggleCompany(company)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-500/20'
                    : 'border-gray-700 bg-gray-900/30 hover:border-indigo-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold truncate">{company.company_name}</h3>
                      {company.ai_enhanced?.is_ai_vendor && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs flex items-center gap-1">
                                  <Bot className="w-3 h-3" />
                                  AI Vendor
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 border-purple-500/30 text-gray-200 max-w-xs">
                              <p className="text-xs">
                                This company offers AI products that may require EU AI Act compliance tracking
                              </p>
                              {company.ai_enhanced?.ai_summary && (
                                <p className="text-xs text-gray-400 mt-1">{company.ai_enhanced.ai_summary}</p>
                              )}
                              {company.ai_enhanced?.ai_confidence && (
                                <p className="text-xs text-purple-400 mt-1">Confidence: {company.ai_enhanced.ai_confidence}%</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <a 
                        href={`https://${company.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{company.domain}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{company.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-xs">
                        {company.confidence_score}% match
                      </Badge>
                      {company.ai_enhanced?.is_ai_vendor && company.ai_enhanced?.ai_confidence >= 50 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRegistrationModal(company);
                          }}
                          disabled={registeredCompanies.has(company.domain)}
                          className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50 text-xs h-7"
                        >
                          {registeredCompanies.has(company.domain) ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Registered
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Register in SENTINEL
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-indigo-500/20">
          <Button onClick={onBack} variant="outline" className="border-gray-700 text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={selected.length === 0}
            className="bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 border border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/40"
          >
            Continue to Enrichment
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Registration Modal */}
        <Dialog open={!!registrationModal} onOpenChange={closeRegistrationModal}>
          <DialogContent className="bg-black border-purple-500/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Register AI System for Compliance Tracking
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Track this AI vendor's solution under EU AI Act requirements in SENTINEL
              </DialogDescription>
            </DialogHeader>

            {registrationModal && (
              <div className="space-y-4 py-4">
                {/* Company Info */}
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold">{registrationModal.company_name}</h4>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                      AI Vendor
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">{registrationModal.domain}</p>
                  {registrationModal.ai_enhanced?.ai_summary && (
                    <p className="text-sm text-gray-300 mt-2">{registrationModal.ai_enhanced.ai_summary}</p>
                  )}
                </div>

                {/* System Name */}
                <div>
                  <Label className="text-gray-300">System Name *</Label>
                  <Input
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="e.g., Acme AI Platform"
                    className="bg-black/30 border-purple-500/30 text-white mt-1"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <Label className="text-gray-300">Purpose / Use Case *</Label>
                  <Input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="What does this AI system do?"
                    className="bg-black/30 border-purple-500/30 text-white mt-1"
                  />
                </div>

                {/* Deployment Context */}
                <div>
                  <Label className="text-gray-300">Deployment Type</Label>
                  <Select value={deploymentContext} onValueChange={setDeploymentContext}>
                    <SelectTrigger className="bg-black/30 border-purple-500/30 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-purple-500/30 text-white">
                      <SelectItem value="customer-facing">Customer-Facing</SelectItem>
                      <SelectItem value="internal">Internal Use</SelectItem>
                      <SelectItem value="embedded-in-product">Embedded in Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Info Box */}
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-xs text-gray-400">
                    ℹ️ This will create a new AI System entry in SENTINEL for compliance monitoring. 
                    You can complete the risk assessment and track obligations after registration.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                onClick={closeRegistrationModal} 
                variant="outline" 
                className="border-gray-700 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegisterSystem}
                disabled={isRegistering || !systemName || !purpose}
                className="bg-purple-500/30 border border-purple-400/50 text-purple-200 hover:bg-purple-500/40"
              >
                {isRegistering ? "Registering..." : "Register System"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}