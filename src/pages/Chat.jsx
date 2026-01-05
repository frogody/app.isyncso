import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SyncAvatar from "../components/ui/SyncAvatar";
import ChatComposer from "@/components/chat/ChatComposer";

export default function ChatPage() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await base44.auth.me();
        if (mounted) setMe(user || null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <SyncAvatar size={48} />
      </div>
    );
  }

  const isNl = (me?.language || 'nl') === 'nl';
  const heading = isNl ? "Waar kan ik je mee helpen?" : "How can I help you?";
  const _placeholder = isNl ? "Stel een vraag" : "Ask a question";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --surface: #1A2026;
        }
        .hero {
          background: radial-gradient(1200px 600px at 50% -200px, rgba(239,68,68,.18), transparent 60%);
        }
        .composer-wrap {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          backdrop-filter: blur(10px);
          background: linear-gradient(180deg, rgba(21,26,31,0), rgba(21,26,31,0.85));
        }
      `}</style>

      <div className="flex-1 hero px-4 md:px-6">
        <div className="max-w-3xl mx-auto pt-16 md:pt-24 pb-24 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--txt)' }}>
            {heading}
          </h1>
        </div>
      </div>

      <div className="composer-wrap px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <ChatComposer agentName="recruitment_assistant" className="w-full" />
          {/* The ChatComposer includes + menu, file attachments and entity pickers inside the bar */}
        </div>
      </div>
    </div>
  );
}