import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowLeft, Sparkles } from "lucide-react";
import AISystemModal from "@/components/sentinel/AISystemModal";
import RiskAssessmentWizard from "@/components/sentinel/RiskAssessmentWizard";

const WORKFLOW_STEPS = [
  { id: 1, title: "Register System", description: "Basic details & AI analysis" },
  { id: 2, title: "Classify Risk", description: "EU AI Act assessment" },
  { id: 3, title: "Generate Docs", description: "Compliance documentation" }
];

export default function SystemWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [registeredSystem, setRegisteredSystem] = useState(null);
  const [showSystemModal, setShowSystemModal] = useState(true);

  const handleSystemSaved = async () => {
    setShowSystemModal(false);
    setCurrentStep(2);
  };

  const handleAssessmentComplete = () => {
    setCurrentStep(3);
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setRegisteredSystem(null);
    setShowSystemModal(true);
  };

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-600/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI System Compliance Workflow</h1>
            <p className="text-gray-400">Guided registration, classification, and documentation</p>
          </div>
          <Link to={createPageUrl("SentinelDashboard")}>
            <Button variant="outline" className="border-white/10 text-gray-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Workflow
            </Button>
          </Link>
        </div>

        {/* Progress Steps */}
        <Card className="glass-card border-0 border-[#86EFAC]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const Icon = isCompleted ? CheckCircle : Circle;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive 
                          ? 'bg-[#86EFAC]/30 border-[#86EFAC] text-[#86EFAC]'
                          : isCompleted
                          ? 'bg-[#86EFAC]/20 border-[#86EFAC] text-[#86EFAC]'
                          : 'bg-gray-800 border-gray-700 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <span className="text-lg font-bold">{step.id}</span>
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <h3 className={`font-semibold text-sm ${isActive ? 'text-[#86EFAC]' : 'text-white'}`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                      </div>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-[#86EFAC]/50' : 'bg-gray-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 1 && showSystemModal && (
          <AISystemModal
            system={null}
            onClose={() => window.history.back()}
            onSave={handleSystemSaved}
          />
        )}

        {currentStep === 2 && registeredSystem && (
          <RiskAssessmentWizard
            systemId={registeredSystem.id}
            onComplete={handleAssessmentComplete}
          />
        )}

        {currentStep === 3 && registeredSystem && (
          <Card className="glass-card border-0 border-[#86EFAC]/20">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-[#86EFAC] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">System Classified!</h2>
                <p className="text-gray-400">Ready to generate compliance documentation</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to={createPageUrl("DocumentGenerator")}>
                  <Button className="w-full bg-[#86EFAC] hover:bg-[#6EE7B7] text-black h-14">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Documents
                  </Button>
                </Link>
                <Button
                  onClick={handleStartOver}
                  variant="outline"
                  className="border-white/10 text-gray-300 h-14"
                >
                  Register Another System
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}