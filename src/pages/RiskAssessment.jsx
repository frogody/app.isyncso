import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RiskAssessmentWizard from "@/components/sentinel/RiskAssessmentWizard";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { cn } from "@/lib/utils";

export default function RiskAssessment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemId = searchParams.get("systemId");
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const { st } = useTheme();

  const loadSystem = React.useCallback(async () => {
    if (!systemId) {
      navigate(createPageUrl("AISystemInventory"));
      return;
    }

    try {
      const systemData = await db.entities.AISystem.get(systemId);
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
      <div className={cn("min-h-screen p-6", st("bg-slate-50", "bg-black"))}>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className={cn("h-24 w-full rounded-2xl", st("bg-slate-200", "bg-zinc-800"))} />
          <Skeleton className={cn("h-96 rounded-2xl", st("bg-slate-200", "bg-zinc-800"))} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen relative", st("bg-slate-50", "bg-black"))}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={cn("absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse", st("bg-emerald-200/20", "bg-[#86EFAC]/5"))} />
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
            className={cn(st("text-slate-400 hover:text-slate-900 hover:bg-slate-100", "text-zinc-400 hover:text-white hover:bg-zinc-800"))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className={cn("text-lg font-bold flex items-center gap-3", st("text-slate-900", "text-white"))}>
              <Shield className="w-8 h-8 text-[#86EFAC]" />
              Risk Assessment
            </h1>
            <p className={cn(st("text-slate-500", "text-zinc-400"))}>{system?.name}</p>
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
