import React, { useState } from "react";
import { 
  LifeBuoy, 
  Search, 
  MessageSquarePlus, 
  Lightbulb, 
  Book, 
  Clock, 
  ChevronRight,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { db } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";

export default function SupportHome({ setView }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: recentTickets } = useQuery({
    queryKey: ['recentTickets'],
    queryFn: () => db.entities.SupportTicket.filter({}, '-created_date', 3),
    initialData: []
  });

  const { data: popularArticles } = useQuery({
    queryKey: ['popularArticles'],
    queryFn: () => db.entities.HelpArticle.filter({ is_published: true }, '-views', 3),
    initialData: []
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden p-6 md:p-8 bg-gradient-to-r from-cyan-950/40 to-black border border-cyan-500/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <LifeBuoy className="w-64 h-64 text-cyan-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <LifeBuoy className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Support Hub</h1>
          </div>
          <p className="text-sm text-gray-300 mb-6">
            Get help, request features, and browse our knowledge base to get the most out of your learning journey.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for help articles, tickets, or features..."
              className="pl-12 h-10 bg-black/50 border-gray-700 text-sm focus:border-cyan-500/50 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('ticket')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
              <MessageSquarePlus className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Submit a Ticket</h3>
              <p className="text-xs text-gray-400">Report a bug or request help</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('features')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Feature Requests</h3>
              <p className="text-xs text-gray-400">Vote on upcoming features</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('knowledge')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Book className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">Knowledge Base</h3>
              <p className="text-xs text-gray-400">Browse help articles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              My Recent Tickets
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('ticket_list')} className="text-xs text-gray-400 hover:text-white h-auto p-1">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {recentTickets.length > 0 ? (
              <div className="space-y-2">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center justify-between group hover:border-gray-600 transition-colors">
                    <div className="flex-1">
                      <h4 className="text-sm text-white font-medium mb-1 group-hover:text-cyan-400 transition-colors">{ticket.title}</h4>
                      <p className="text-[10px] text-gray-500">
                        {new Date(ticket.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`
                      text-[10px] py-0 px-2
                      ${ticket.status === 'open' ? 'text-green-400 border-green-500/30 bg-green-500/10' : ''}
                      ${ticket.status === 'closed' ? 'text-gray-400 border-gray-500/30 bg-gray-500/10' : ''}
                      ${ticket.status === 'in_progress' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : ''}
                    `}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
                <p className="text-gray-500 text-xs">No tickets found</p>
                <Button variant="link" onClick={() => setView('ticket')} className="text-cyan-400 h-auto p-0 text-xs mt-2">
                  Create your first ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Articles */}
        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Book className="w-4 h-4 text-cyan-400" />
              Popular Articles
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('knowledge')} className="text-xs text-gray-400 hover:text-white h-auto p-1">
              Browse All
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {popularArticles.length > 0 ? (
              <div className="space-y-2">
                {popularArticles.map((article) => (
                  <div key={article.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 group hover:border-gray-600 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                       <h4 className="text-sm text-white font-medium group-hover:text-cyan-400 transition-colors">{article.title}</h4>
                       <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{article.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
                <Book className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No articles available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}