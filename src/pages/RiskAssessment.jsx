import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import RiskAssessmentWizard from "@/components/sentinel/RiskAssessmentWizard";

export default function RiskAssessment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemId = searchParams.get("systemId");
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSystem = React.useCallback(async () => {
    if (!systemId) {
      navigate(createPageUrl("AISystemInventory"));
      return;
    }

    try {
      const systemData = await base44.entities.AISystem.get(systemId);
      setSystem(systemData);
    } catch (error) {
      console.error("Failed to load system:", error);
      navigate(createPageUrl("AISystemInventory"));
    } finally {
      setLoading(false);
    }
  }, [systemId, navigate]);

  useEffect(() => {
    loadSystem();
  }, [loadSystem]);

  const handleComplete = () => {
    navigate(createPageUrl("AISystemInventory"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#86EFAC]/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl("AISystemInventory"))}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#86EFAC]" />
              Risk Assessment
            </h1>
            <p className="text-zinc-400">{system?.name}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RiskAssessmentWizard systemId={systemId} onComplete={handleComplete} />
        </motion.div>
      </div>
    </div>
  );
}