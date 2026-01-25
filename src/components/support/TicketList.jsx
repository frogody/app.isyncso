import React from "react";
import { ArrowLeft, MessageSquarePlus, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";

export default function TicketList({ onBack, onCreateNew }) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['myTickets'],
    queryFn: () => db.entities.SupportTicket.filter({}, '-created_date'), // Filter automatically applies user_id RLS usually, or we filter explicitly
    initialData: []
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-400 hover:text-white pl-0 gap-2 h-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Support
        </Button>
        <Button onClick={onCreateNew} className="bg-red-500 hover:bg-red-600 text-white border-0 h-8 text-sm">
          <MessageSquarePlus className="w-3 h-3 mr-1" />
          New Ticket
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1 rounded-lg bg-gray-800 border border-gray-700">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
        <h1 className="text-lg font-bold text-white">My Support Tickets</h1>
      </div>

      {tickets.length > 0 ? (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="glass-card border-0 p-4 flex items-center justify-between group hover:border-gray-600 transition-colors">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{ticket.title}</h3>
                  <Badge variant="outline" className={`
                    text-[10px] py-0 px-2
                    ${ticket.status === 'open' ? 'text-green-400 border-green-500/30 bg-green-500/10' : ''}
                    ${ticket.status === 'closed' ? 'text-gray-400 border-gray-500/30 bg-gray-500/10' : ''}
                    ${ticket.status === 'in_progress' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : ''}
                  `}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                   <span>ID: #{ticket.id.substring(0, 8)}</span>
                   <span>•</span>
                   <span>{new Date(ticket.created_date).toLocaleDateString()}</span>
                   <span>•</span>
                   <span className="capitalize">{ticket.category}</span>
                </div>
                <p className="text-gray-500 text-xs mt-2 line-clamp-1">{ticket.description}</p>
              </div>
              <Button variant="ghost" className="text-gray-500 hover:text-white h-auto p-1 ml-2 text-xs flex-shrink-0">
                 Details <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card border-0 p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
          <MessageSquarePlus className="w-8 h-8 text-gray-700 mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No tickets found</h3>
          <p className="text-gray-500 mb-4 text-xs">You haven't submitted any support tickets yet</p>
          <Button
            onClick={onCreateNew}
            className="bg-red-500 hover:bg-red-600 text-white border-0 h-8 text-sm"
          >
            Create your first ticket
          </Button>
        </Card>
      )}
    </div>
  );
}