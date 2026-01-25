import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/api/supabaseClient';
import {
  Building2, Globe, Users, DollarSign, MapPin, Linkedin, TrendingUp,
  Server, ChevronLeft, ExternalLink, Briefcase, Calendar, Award,
  Layers, Shield, ChevronDown, ChevronUp, Plus, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/GlassCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function CompanyProfile() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTechCategories, setExpandedTechCategories] = useState({});
  const [addingToProspects, setAddingToProspects] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain');
    const companyId = params.get('id');
    
    if (companyId) {
      loadCompanyById(companyId);
    } else if (domain) {
      loadCompanyByDomain(domain);
    } else {
      setLoading(false);
    }
  }, []);

  const loadCompanyById = async (id) => {
    try {
      const data = await db.entities.Company.get(id);
      setCompany(data);
    } catch (error) {
      console.error('Failed to load company:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyByDomain = async (domain) => {
    try {
      const companies = await db.entities.Company.filter({ domain });
      if (companies.length > 0) {
        setCompany(companies[0]);
      }
    } catch (error) {
      console.error('Failed to load company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToProspects = async () => {
    if (!company) return;
    setAddingToProspects(true);
    try {
      await db.entities.Prospect.create({
        company_name: company.name,
        domain: company.domain,
        description: company.description,
        industry: company.industry,
        company_size: company.size_range || company.employee_count?.toString(),
        website_url: company.website_url,
        status: 'new'
      });
      toast.success(`${company.name} added to prospects!`);
    } catch (error) {
      toast.error('Failed to add to prospects');
    } finally {
      setAddingToProspects(false);
    }
  };

  const toggleTechCategory = (category) => {
    setExpandedTechCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 bg-zinc-800 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-64 bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <GlassCard className="p-12 text-center max-w-md">
          <Building2 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Company Not Found</h2>
          <p className="text-zinc-400 mb-6">The company profile you're looking for doesn't exist.</p>
          <Link to={createPageUrl('GrowthProspects')}>
            <Button className="bg-indigo-500 hover:bg-indigo-400 text-white">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Prospects
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const firmographics = company.firmographics || {};
  const technographics = company.technographics || {};
  const funding = company.funding_data || {};

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4 max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to={createPageUrl('GrowthProspects')} className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Prospects
        </Link>

        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard glow="indigo" className="p-4">
            <div className="flex flex-col md:flex-row items-start gap-4">
              {/* Logo */}
              <div className="w-20 h-20 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {firmographics.business_logo ? (
                  <img src={firmographics.business_logo} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-zinc-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{company.name}</h1>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      {company.industry && (
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                          {company.industry}
                        </Badge>
                      )}
                      {(company.size_range || firmographics.number_of_employees_range) && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Users className="w-4 h-4" />
                          {company.size_range || firmographics.number_of_employees_range} employees
                        </span>
                      )}
                      {(company.revenue_range || firmographics.yearly_revenue_range) && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <DollarSign className="w-4 h-4" />
                          {company.revenue_range || firmographics.yearly_revenue_range}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {company.website_url && (
                      <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </Button>
                      </a>
                    )}
                    {firmographics.linkedin_profile && (
                      <a href={firmographics.linkedin_profile} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                        </Button>
                      </a>
                    )}
                    <Button 
                      onClick={handleAddToProspects} 
                      disabled={addingToProspects}
                      className="bg-indigo-500 hover:bg-indigo-400 text-white"
                    >
                      {addingToProspects ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add to Prospects
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {company.description && (
                  <p className="text-zinc-400 mt-4 text-sm leading-relaxed">{company.description}</p>
                )}

                {/* Location */}
                {(firmographics.city_name || firmographics.region_name || firmographics.country_name) && (
                  <div className="flex items-center gap-2 mt-4 text-zinc-500 text-sm">
                    <MapPin className="w-4 h-4" />
                    {[firmographics.city_name, firmographics.region_name, firmographics.country_name].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Tabs Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-700 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="funding" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
              Funding
            </TabsTrigger>
            <TabsTrigger value="tech" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">
              Tech Stack
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick Stats */}
              <GlassCard className="p-4 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  Company Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                    <Users className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{firmographics.number_of_employees_range || 'N/A'}</div>
                    <div className="text-[10px] text-zinc-500">Employees</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                    <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{firmographics.yearly_revenue_range || 'N/A'}</div>
                    <div className="text-[10px] text-zinc-500">Revenue</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                    <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{formatCurrency(funding.known_funding_total_value)}</div>
                    <div className="text-[10px] text-zinc-500">Total Funding</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                    <Globe className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{firmographics.locations_distribution?.length || 1}</div>
                    <div className="text-[10px] text-zinc-500">Countries</div>
                  </div>
                </div>

                {/* Industry Info */}
                {(firmographics.naics_description || firmographics.sic_code_description) && (
                  <div className="mt-4 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Industry Classification</h4>
                    <div className="space-y-2">
                      {firmographics.naics_description && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">NAICS</span>
                          <span className="text-white text-sm">{firmographics.naics_description}</span>
                        </div>
                      )}
                      {firmographics.sic_code_description && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">SIC</span>
                          <span className="text-white text-sm">{firmographics.sic_code_description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Global Presence */}
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  Global Presence
                </h3>
                {firmographics.locations_distribution?.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {firmographics.locations_distribution.sort((a, b) => b.locations - a.locations).map((loc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30">
                        <span className="text-zinc-300 uppercase text-sm">{loc.country}</span>
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                          {loc.locations} {loc.locations === 1 ? 'office' : 'offices'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No location data available</p>
                )}
              </GlassCard>
            </div>
          </TabsContent>

          {/* Funding Tab */}
          <TabsContent value="funding" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Funding Summary */}
              <GlassCard className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Funding Summary
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                    <div className="text-lg font-bold text-green-400">{formatCurrency(funding.known_funding_total_value)}</div>
                    <div className="text-xs text-zinc-400">Total Raised</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                      <div className="text-lg font-bold text-white">{funding.number_of_funding_rounds || 0}</div>
                      <div className="text-[10px] text-zinc-500">Rounds</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                      <div className="text-lg font-bold text-white">{funding.number_of_advisors || 0}</div>
                      <div className="text-[10px] text-zinc-500">Advisors</div>
                    </div>
                  </div>
                  {funding.last_funding_round_type && (
                    <div className="p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                      <div className="text-xs text-zinc-500 mb-1">Latest Round</div>
                      <div className="text-white font-medium capitalize">{funding.last_funding_round_type}</div>
                      <div className="text-sm text-green-400">{formatCurrency(parseFloat(funding.last_funding_round_value_usd))}</div>
                      {funding.last_funding_round_date && (
                        <div className="text-xs text-zinc-500 mt-1">{new Date(funding.last_funding_round_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Funding Rounds */}
              <GlassCard className="p-4 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  Funding History
                </h3>
                {funding.funding_rounds_info?.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {funding.funding_rounds_info.map((round, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                        <div>
                          <div className="text-white font-medium">{round['Announcement date']}</div>
                          {round['Lead investors'] && (
                            <div className="text-xs text-zinc-500 mt-1">
                              {round['Lead investors'].slice(0, 3).join(', ')}
                              {round['Lead investors'].length > 3 && ` +${round['Lead investors'].length - 3} more`}
                            </div>
                          )}
                        </div>
                        {round['Money raised value ($)'] && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            {formatCurrency(round['Money raised value ($)'])}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">No funding history available</p>
                )}
              </GlassCard>

              {/* Investors */}
              {funding.investors?.length > 0 && (
                <GlassCard className="p-4 lg:col-span-3">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Investors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {funding.investors.map((investor, i) => (
                      <Badge key={i} className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-3 py-1">
                        {investor}
                      </Badge>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </TabsContent>

          {/* Tech Stack Tab */}
          <TabsContent value="tech" className="space-y-4">
            <GlassCard className="p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                Technology Stack
              </h3>
              {technographics.full_nested_tech_stack?.length > 0 ? (
                <div className="space-y-2">
                  {technographics.full_nested_tech_stack.map((category, i) => (
                    <div key={i} className="border border-zinc-700/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleTechCategory(category.category)}
                        className="w-full flex items-center justify-between p-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-cyan-400" />
                          <span className="text-white font-medium">{category.category}</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            {category.techs?.length || 0}
                          </Badge>
                        </div>
                        {expandedTechCategories[category.category] ? (
                          <ChevronUp className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-400" />
                        )}
                      </button>
                      {expandedTechCategories[category.category] && (
                        <div className="p-3 bg-zinc-900/50">
                          <div className="flex flex-wrap gap-2">
                            {category.techs?.map((tech, j) => (
                              <Badge key={j} className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : technographics.full_tech_stack?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {technographics.full_tech_stack.slice(0, 50).map((tech, i) => (
                    <Badge key={i} className="bg-zinc-800 text-zinc-300 border-zinc-700">
                      {tech}
                    </Badge>
                  ))}
                  {technographics.full_tech_stack.length > 50 && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      +{technographics.full_tech_stack.length - 50} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">No tech stack data available</p>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}