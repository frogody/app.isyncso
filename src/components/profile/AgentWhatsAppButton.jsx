import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function AgentWhatsAppButton({ className = "" }) {
  const whatsappUrl = useMemo(() => {
    try {
      const url = base44.agents.getWhatsAppConnectURL("recruitment_assistant");
      return typeof url === "string" && url.length > 0 ? url : null;
    } catch (_) {
      return null;
    }
  }, []);

  const handleClick = () => {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={!whatsappUrl}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${className}`}
      style={{
        background: "rgba(37,211,102,.12)",
        color: "#4ADE80",
        borderColor: "rgba(37,211,102,.3)"
      }}
      title={whatsappUrl ? "Verbind WhatsApp met de recruitment assistent" : "WhatsApp niet beschikbaar"}
    >
      <MessageSquare className="w-4 h-4" />
      WhatsApp koppelen
    </Button>
  );
}