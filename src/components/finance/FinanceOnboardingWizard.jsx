import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, supabase } from "@/api/supabaseClient";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  FileText,
  MapPin,
  Hash,
  Globe,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── AI Accountant Toggle ───────────────────────────────────────
// Set to false to use static fallback messages (no API calls)
const AI_ACCOUNTANT_ENABLED = true;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sfxpmzicgpaxfntqleig.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4";

// ─── Static Fallback Messages ───────────────────────────────────
const STATIC_MESSAGES = {
  welcome:
    "Welcome to SYNC Finance. I'm your AI accountant, here to help you set up your financial administration. Once we're done, I'll be able to process your invoices intelligently and handle your bookkeeping automatically. Let's get you set up — it only takes a minute.",
  country:
    "Tax rules vary significantly by country. I currently support Dutch BTW rules including intracommunity supplies, reverse charge mechanisms, and all standard Dutch tax rates. Let me know where your company is headquartered so I can apply the right rules.",
  identity:
    "Every invoice has two companies on it — yours and the vendor. I need your company details so I can automatically identify which one is you when processing invoices. Think of it as teaching me to recognize your letterhead.",
  complete:
    "Your finance workspace is all set up. I can now process your invoices, identify your company versus vendors, and handle Dutch tax calculations correctly. Let's get to work.",
};

// ─── Country Data ───────────────────────────────────────────────
const COUNTRIES = [
  { code: "NL", name: "Netherlands", flag: "🇳🇱", supported: true },
  { code: "DE", name: "Germany", flag: "🇩🇪", supported: false },
  { code: "BE", name: "Belgium", flag: "🇧🇪", supported: false },
  { code: "FR", name: "France", flag: "🇫🇷", supported: false },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", supported: false },
  { code: "ES", name: "Spain", flag: "🇪🇸", supported: false },
  { code: "IT", name: "Italy", flag: "🇮🇹", supported: false },
  { code: "AT", name: "Austria", flag: "🇦🇹", supported: false },
];

const STEP_NAMES = ["welcome", "country", "identity", "complete"];

// ─── Animation Variants ─────────────────────────────────────────
const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

// ─── AI Avatar Component ────────────────────────────────────────
function AIAvatar() {
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-blue-400" />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-zinc-900" />
    </div>
  );
}

// ─── AI Message Bubble ──────────────────────────────────────────
function AIMessageBubble({ message, isLoading }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <AIAvatar />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-blue-400 mb-1.5">SYNC Finance</p>
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl rounded-tl-md px-5 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentStep
              ? "bg-blue-500 w-8"
              : i === currentStep
              ? "bg-blue-400 w-12"
              : "bg-zinc-700 w-8"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Wizard Component ──────────────────────────────────────
export default function FinanceOnboardingWizard({ company, onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    country: company?.hq_country || "",
    kvkNumber: company?.kvk_number || "",
    vatNumber: company?.vat_number || "",
    address: company?.hq_address || "",
    postalCode: company?.hq_postal_code || "",
    city: company?.hq_city || "",
  });

  const [aiMessages, setAiMessages] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  // Fetch AI message for a step
  const fetchAIMessage = useCallback(
    async (stepName) => {
      if (!AI_ACCOUNTANT_ENABLED) {
        setAiMessages((prev) => ({ ...prev, [stepName]: STATIC_MESSAGES[stepName] }));
        return;
      }

      if (aiMessages[stepName]) return; // Already fetched

      setAiLoading((prev) => ({ ...prev, [stepName]: true }));

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/finance-ai-accountant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            step: stepName,
            companyName: company?.name,
            companyContext:
              stepName === "complete"
                ? {
                    country: formData.country,
                    kvkNumber: formData.kvkNumber,
                    vatNumber: formData.vatNumber,
                    city: formData.city,
                  }
                : undefined,
          }),
        });

        const data = await response.json();
        setAiMessages((prev) => ({
          ...prev,
          [stepName]: data.message || STATIC_MESSAGES[stepName],
        }));
      } catch {
        setAiMessages((prev) => ({ ...prev, [stepName]: STATIC_MESSAGES[stepName] }));
      } finally {
        setAiLoading((prev) => ({ ...prev, [stepName]: false }));
      }
    },
    [company?.name, formData, aiMessages]
  );

  // Load AI message when step changes
  useEffect(() => {
    const stepName = STEP_NAMES[step];
    if (stepName) {
      fetchAIMessage(stepName);
    }
  }, [step]);

  const currentStepName = STEP_NAMES[step];
  const currentMessage = aiMessages[currentStepName] || STATIC_MESSAGES[currentStepName];
  const isAiLoading = aiLoading[currentStepName] || false;

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // Validation
  const canProceedFromCountry = formData.country === "NL";
  const canProceedFromIdentity =
    formData.kvkNumber.trim() &&
    formData.vatNumber.trim() &&
    formData.address.trim() &&
    formData.postalCode.trim() &&
    formData.city.trim();

  // Complete onboarding
  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const user = await db.auth.me();
      if (!user?.company_id) throw new Error("No company found");

      const legalAddress = `${formData.address}, ${formData.postalCode} ${formData.city}`;

      await db.entities.Company.update(user.company_id, {
        hq_country: formData.country,
        kvk_number: formData.kvkNumber,
        vat_number: formData.vatNumber,
        hq_address: formData.address,
        hq_postal_code: formData.postalCode,
        hq_city: formData.city,
        legal_address: legalAddress,
        finance_onboarding_completed: true,
      });

      if (onComplete) onComplete();
    } catch (error) {
      console.error("[FinanceOnboarding] Error saving:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <StepIndicator currentStep={step} totalSteps={4} />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* ─── Step 0: Welcome ─── */}
            {step === 0 && (
              <div>
                <AIMessageBubble message={currentMessage} isLoading={isAiLoading} />
                <Button
                  onClick={goNext}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                >
                  Let's get started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* ─── Step 1: Country Selection ─── */}
            {step === 1 && (
              <div>
                <AIMessageBubble message={currentMessage} isLoading={isAiLoading} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        if (c.supported) setFormData((prev) => ({ ...prev, country: c.code }));
                      }}
                      disabled={!c.supported}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        formData.country === c.code
                          ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30"
                          : c.supported
                          ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                          : "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className={`text-xs font-medium ${formData.country === c.code ? "text-blue-300" : "text-zinc-400"}`}>
                        {c.name}
                      </span>
                      {!c.supported && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400">
                          Soon
                        </span>
                      )}
                      {formData.country === c.code && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 mb-6">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300/80 leading-relaxed">
                    Only Dutch (NL) tax rules are currently implemented. Support for other EU countries is on our roadmap.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={goBack}
                    variant="outline"
                    className="h-11 px-5 border-zinc-700 text-zinc-300 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceedFromCountry}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Step 2: Company Identity ─── */}
            {step === 2 && (
              <div>
                <AIMessageBubble message={currentMessage} isLoading={isAiLoading} />

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
                        <Hash className="w-3 h-3" /> KVK Number
                      </Label>
                      <Input
                        value={formData.kvkNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, kvkNumber: e.target.value }))}
                        placeholder="12345678"
                        className="bg-zinc-800/50 border-zinc-700 h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
                        <FileText className="w-3 h-3" /> VAT/BTW Number
                      </Label>
                      <Input
                        value={formData.vatNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, vatNumber: e.target.value }))}
                        placeholder="NL001234567B01"
                        className="bg-zinc-800/50 border-zinc-700 h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3 h-3" /> Street Address
                    </Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Keizersgracht 1"
                      className="bg-zinc-800/50 border-zinc-700 h-10 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
                        <MapPin className="w-3 h-3" /> Postal Code
                      </Label>
                      <Input
                        value={formData.postalCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="1015 AA"
                        className="bg-zinc-800/50 border-zinc-700 h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-400 flex items-center gap-1.5 mb-1.5">
                        <Building2 className="w-3 h-3" /> City
                      </Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Amsterdam"
                        className="bg-zinc-800/50 border-zinc-700 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={goBack}
                    variant="outline"
                    className="h-11 px-5 border-zinc-700 text-zinc-300 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      // Clear cached complete message so it re-fetches with new context
                      setAiMessages((prev) => {
                        const next = { ...prev };
                        delete next.complete;
                        return next;
                      });
                      goNext();
                    }}
                    disabled={!canProceedFromIdentity}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Complete ─── */}
            {step === 3 && (
              <div>
                <AIMessageBubble message={currentMessage} isLoading={isAiLoading} />

                {/* Summary card */}
                <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-5 mb-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Your Company Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" /> Country
                      </span>
                      <span className="text-sm text-zinc-300">
                        🇳🇱 Netherlands
                      </span>
                    </div>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Hash className="w-3 h-3" /> KVK
                      </span>
                      <span className="text-sm text-zinc-300 font-mono">{formData.kvkNumber}</span>
                    </div>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> VAT/BTW
                      </span>
                      <span className="text-sm text-zinc-300 font-mono">{formData.vatNumber}</span>
                    </div>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Address
                      </span>
                      <span className="text-sm text-zinc-300 text-right">
                        {formData.address}
                        <br />
                        <span className="text-zinc-400">
                          {formData.postalCode} {formData.city}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Enter Finance
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
