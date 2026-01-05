import React, { useState } from "react";
import SupportHome from "@/components/support/SupportHome";
import SubmitTicket from "@/components/support/SubmitTicket";
import FeatureList from "@/components/support/FeatureList";
import KnowledgeBase from "@/components/support/KnowledgeBase";
import TicketList from "@/components/support/TicketList";

export default function Support() {
  // Views: 'home', 'ticket', 'features', 'knowledge', 'ticket_list'
  const [view, setView] = useState('home');

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {view === 'home' && <SupportHome setView={setView} />}
        {view === 'ticket' && <SubmitTicket onBack={() => setView('home')} />}
        {view === 'features' && <FeatureList onBack={() => setView('home')} />}
        {view === 'knowledge' && <KnowledgeBase onBack={() => setView('home')} />}
        
        {view === 'ticket_list' && <TicketList onBack={() => setView('home')} onCreateNew={() => setView('ticket')} />} 
      </div>
    </div>
  );
}