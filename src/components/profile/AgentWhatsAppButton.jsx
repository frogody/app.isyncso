import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

/**
 * WhatsApp Agent Connect Button
 *
 * Note: WhatsApp integration requires a backend service.
 * This button is currently disabled pending Supabase Edge Function implementation.
 */
export default function AgentWhatsAppButton({ className = "" }) {
  // WhatsApp integration not yet available with Supabase backend
  const whatsappUrl = null;

  const handleClick = () => {
    if (!whatsappUrl) {
      alert("WhatsApp integratie is momenteel niet beschikbaar.");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={!whatsappUrl}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 opacity-50 ${className}`}
      style={{
        background: "rgba(37,211,102,.12)",
        color: "#4ADE80",
        borderColor: "rgba(37,211,102,.3)"
      }}
      title="WhatsApp integratie komt binnenkort"
    >
      <MessageSquare className="w-4 h-4" />
      WhatsApp koppelen
    </Button>
  );
}
