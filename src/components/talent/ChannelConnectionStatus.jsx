import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { Linkedin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CHANNELS = [
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, toolkit: "linkedin" },
  { key: "gmail", label: "Email", icon: Mail, toolkit: "gmail" },
  { key: "sms", label: "SMS", icon: Phone, toolkit: null }, // SMS via Twilio, always available
];

export default function ChannelConnectionStatus({ compact = false }) {
  const { user } = useUser();
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchConnections() {
      try {
        const { data } = await supabase
          .from("user_integrations")
          .select("toolkit_slug, status")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE");

        const connected = {};
        (data || []).forEach((i) => {
          connected[i.toolkit_slug] = true;
        });
        // SMS always available if org has Twilio number
        connected.sms = true;
        setConnections(connected);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {CHANNELS.map((ch) => {
        const isConnected = ch.toolkit ? connections[ch.toolkit] : connections[ch.key];
        const Icon = ch.icon;

        return (
          <div
            key={ch.key}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
              isConnected
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
            }`}
            title={`${ch.label}: ${isConnected ? "Connected" : "Not connected"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {!compact && (
              <span className="text-xs font-medium">{ch.label}</span>
            )}
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-400" : "bg-zinc-600"
              }`}
            />
          </div>
        );
      })}
      {Object.values(connections).filter(Boolean).length < CHANNELS.length && (
        <Link
          to={createPageUrl("Integrations")}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline ml-1"
        >
          Connect
        </Link>
      )}
    </div>
  );
}
