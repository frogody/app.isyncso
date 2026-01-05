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
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function SupportHome({ setView }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: recentTickets } = useQuery({
    queryKey: ['recentTickets'],
    queryFn: () => base44.entities.SupportTicket.filter({}, '-created_date', 3),
    initialData: []
  });

  const { data: popularArticles } = useQuery({
    queryKey: ['popularArticles'],
    queryFn: () => base44.entities.HelpArticle.filter({ is_published: true }, '-views', 3),
    initialData: []
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden p-8 md:p-12 bg-gradient-to-r from-cyan-950/40 to-black border border-cyan-500/20">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <LifeBuoy className="w-64 h-64 text-cyan-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <LifeBuoy className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Support Hub</h1>
          </div>
          <p className="text-lg text-gray-300 mb-8">
            Get help, request features, and browse our knowledge base to get the most out of your learning journey.
          </p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for help articles, tickets, or features..."
              className="pl-12 h-14 bg-black/50 border-gray-700 text-lg focus:border-cyan-500/50 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('ticket')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
              <MessageSquarePlus className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">Submit a Ticket</h3>
              <p className="text-sm text-gray-400">Report a bug or request help</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('features')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Lightbulb className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">Feature Requests</h3>
              <p className="text-sm text-gray-400">Vote on upcoming features</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="glass-card hover:border-cyan-500/30 transition-all cursor-pointer group"
          onClick={() => setView('knowledge')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Book className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">Knowledge Base</h3>
              <p className="text-sm text-gray-400">Browse help articles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tickets */}
        <Card className="glass-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              My Recent Tickets
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('ticket_list')} className="text-xs text-gray-400 hover:text-white">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center justify-between group hover:border-gray-600 transition-colors">
                    <div>
                      <h4 className="text-white font-medium mb-1 group-hover:text-cyan-400 transition-colors">{ticket.title}</h4>
                      <p className="text-xs text-gray-500">
                        {new Date(ticket.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={`
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
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <p className="text-gray-500 text-sm">No tickets found</p>
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
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-cyan-400" />
              Popular Articles
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('knowledge')} className="text-xs text-gray-400 hover:text-white">
              Browse All
            </Button>
          </CardHeader>
          <CardContent>
            {popularArticles.length > 0 ? (
              <div className="space-y-3">
                {popularArticles.map((article) => (
                  <div key={article.id} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 group hover:border-gray-600 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                       <h4 className="text-white font-medium group-hover:text-cyan-400 transition-colors">{article.title}</h4>
                       <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-400" />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{article.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <Book className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No articles available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}