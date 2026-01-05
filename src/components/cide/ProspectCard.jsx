import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, Zap, Users, Mail } from "lucide-react";

export default function ProspectCard({ prospect, onStatusChange, onViewDetails }) {
  const scoreColor = prospect.overall_score >= 80 ? 'text-indigo-400' : 
                     prospect.overall_score >= 60 ? 'text-indigo-400' : 'text-gray-400';

  const statusColors = {
    new: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    researching: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    contacted: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    qualified: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    disqualified: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
    converted: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
  };

  const primaryContact = prospect.contacts?.[0];

  return (
    <Card className="glass-card border-0 hover:border-indigo-500/40 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold text-lg">{prospect.company_name}</h3>
              <a 
                href={`https://${prospect.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-gray-400 mb-2">{prospect.domain}</p>
            {prospect.description && (
              <p className="text-sm text-gray-300 line-clamp-2 mb-3">{prospect.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {prospect.overall_score || prospect.confidence_score || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {prospect.company_size && (
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
              <Users className="w-3 h-3 mr-1" />
              {prospect.company_size}
            </Badge>
          )}
          {prospect.location && (
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
              {prospect.location}
            </Badge>
          )}
          {prospect.industry && (
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300">
              {prospect.industry}
            </Badge>
          )}
        </div>

        {/* Funding Data - Strongest Buying Signal */}
        {prospect.funding_data && prospect.funding_data.last_round_date && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Funding Signal:
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-400/30 text-xs">
              💰 Raised {prospect.funding_data.last_round_type || 'funding'} 
              {prospect.funding_data.last_round_amount ? ` $${(prospect.funding_data.last_round_amount / 1000000).toFixed(1)}M` : ''}
              {prospect.funding_data.last_round_date && (
                <> ({new Date(prospect.funding_data.last_round_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</>
              )}
            </Badge>
          </div>
        )}

        {/* AI-Generated Buying Signals */}
        {prospect.buying_signals && prospect.buying_signals.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Other Signals:
            </div>
            <div className="flex flex-wrap gap-1">
              {prospect.buying_signals.slice(0, 3).map((signal, idx) => (
                <Badge key={idx} className="bg-indigo-500/10 text-indigo-300 border-indigo-400/30 text-xs">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {primaryContact && (
          <div className="mb-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="text-xs text-gray-400 mb-1">Primary Contact:</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-medium">{primaryContact.name}</div>
                <div className="text-xs text-gray-400">{primaryContact.title}</div>
              </div>
              {primaryContact.email && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-300">{primaryContact.email}</span>
                  </div>
                  {primaryContact.email_status === 'valid' ? (
                    <span className="text-indigo-400 font-bold" title="Email verified as valid">✓</span>
                  ) : primaryContact.email_status === 'invalid' ? (
                    <span className="text-indigo-400 font-bold" title="Email is invalid">✗</span>
                  ) : primaryContact.email_status === 'accept_all' || primaryContact.email_status === 'unknown' ? (
                    <span className="text-indigo-400 font-bold" title="Email accepts all / unknown">⚠️</span>
                  ) : (
                    <span className="text-gray-500" title="Not verified yet">○</span>
                  )}
                  {primaryContact.email_score > 0 && (
                    <span className="text-[10px] text-gray-500">({primaryContact.email_score}%)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <select
            value={prospect.status}
            onChange={(e) => onStatusChange && onStatusChange(prospect.id, e.target.value)}
            className="px-3 py-1 rounded-lg text-sm border bg-black/30 border-indigo-500/30 text-white"
          >
            <option value="new">New</option>
            <option value="researching">Researching</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="disqualified">Disqualified</option>
            <option value="converted">Converted</option>
          </select>
          <Button 
            onClick={() => onViewDetails && onViewDetails(prospect)}
            variant="outline" 
            size="sm"
            className="border-indigo-500/30 text-indigo-300"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}