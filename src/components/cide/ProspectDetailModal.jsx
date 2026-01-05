import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, Globe, Users, TrendingUp, Mail, CheckCircle2, 
  AlertCircle, ExternalLink, DollarSign, Cpu, Briefcase
} from "lucide-react";

export default function ProspectDetailModal({ prospect, open, onClose, onStatusChange }) {
  if (!prospect) return null;

  const firmographics = prospect.firmographics || {};
  const technographics = prospect.technographics || {};
  const fundingData = prospect.funding_data || {};
  const contacts = prospect.contacts || [];
  const aiEnhanced = prospect.ai_enhanced || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-black border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl text-white mb-2">
                {prospect.company_name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Globe className="w-3 h-3" />
                <a 
                  href={`https://${prospect.domain}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {prospect.domain}
                </a>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">
                {prospect.overall_score || prospect.confidence_score || 'N/A'}
              </div>
              <div className="text-xs text-gray-500">Overall Score</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Description */}
          {prospect.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">About</h3>
              <p className="text-gray-300 leading-relaxed">{prospect.description}</p>
            </div>
          )}

          <Separator className="bg-gray-800" />

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-4">
            {firmographics.industry && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Industry</div>
                <div className="text-white">{firmographics.industry}</div>
              </div>
            )}
            {firmographics.size_range && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Company Size</div>
                <div className="text-white flex items-center gap-1">
                  <Users className="w-3 h-3 text-gray-400" />
                  {firmographics.size_range}
                </div>
              </div>
            )}
            {firmographics.revenue_range && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Revenue</div>
                <div className="text-white flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-gray-400" />
                  {firmographics.revenue_range}
                </div>
              </div>
            )}
            {firmographics.founded_year && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Founded</div>
                <div className="text-white">{firmographics.founded_year}</div>
              </div>
            )}
          </div>

          {/* Funding Data */}
          {fundingData.total_raised && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Funding
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {fundingData.total_raised && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total Raised</div>
                      <div className="text-green-400 font-semibold">
                        ${(fundingData.total_raised / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  )}
                  {fundingData.last_round_type && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Last Round</div>
                      <div className="text-white">
                        {fundingData.last_round_type}
                        {fundingData.last_round_date && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({new Date(fundingData.last_round_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tech Stack */}
          {technographics.tech_stack?.length > 0 && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  Tech Stack ({technographics.tech_stack.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {technographics.tech_stack.slice(0, 15).map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300">
                      {tech}
                    </Badge>
                  ))}
                  {technographics.tech_stack.length > 15 && (
                    <Badge variant="outline" className="border-gray-700 text-gray-400">
                      +{technographics.tech_stack.length - 15} more
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  Key Contacts ({contacts.length})
                </h3>
                <div className="space-y-2">
                  {contacts.slice(0, 5).map((contact, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white font-medium">{contact.name}</div>
                          {contact.title && (
                            <div className="text-xs text-gray-400 mt-0.5">{contact.title}</div>
                          )}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-300">{contact.email}</span>
                            </div>
                            {contact.email_status === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" title="Verified" />
                            ) : contact.email_status === 'invalid' ? (
                              <AlertCircle className="w-4 h-4 text-red-400" title="Invalid" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-600" title="Not verified" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Buying Signals */}
          {aiEnhanced.buying_signals?.length > 0 && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">🎯 Buying Signals</h3>
                <div className="space-y-2">
                  {aiEnhanced.buying_signals.map((signal, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pain Points */}
          {aiEnhanced.pain_points?.length > 0 && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">⚡ Pain Points</h3>
                <div className="space-y-2">
                  {aiEnhanced.pain_points.map((pain, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{pain}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Technology Insights */}
          {aiEnhanced.technology_insights && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">🔧 Technology Insights</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{aiEnhanced.technology_insights}</p>
              </div>
            </>
          )}

          {/* Competitive Intel */}
          {aiEnhanced.competitive_intel && (
            <>
              <Separator className="bg-gray-800" />
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">🏆 Competitive Intelligence</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{aiEnhanced.competitive_intel}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator className="bg-gray-800" />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-2">Status</div>
              <select
                value={prospect.status}
                onChange={(e) => onStatusChange && onStatusChange(prospect.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border bg-black/30 border-indigo-500/30 text-white"
              >
                <option value="new">New</option>
                <option value="researching">Researching</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="disqualified">Disqualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              {prospect.linkedin_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(prospect.linkedin_url, '_blank')}
                  className="border-blue-500/30 text-blue-300"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  LinkedIn
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${prospect.domain}`, '_blank')}
                className="border-indigo-500/30 text-indigo-300"
              >
                <Globe className="w-3 h-3 mr-1" />
                Website
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}