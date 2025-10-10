
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell
} from "recharts";
import {
  Search, TrendingUp, Users, Building2, MapPin, Zap, Filter, X, Sparkles, Brain, Target
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";

export default function CandidateAnalytics() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [tenureFilter, setTenureFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [showAllHotLeads, setShowAllHotLeads] = useState(false);

  const { t } = useTranslation(user?.language || 'nl');

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      let candidateData;
      if (userData?.organization_id) {
        candidateData = await Candidate.filter(
          { organization_id: userData.organization_id },
          "-created_date",
          500
        );
      } else {
        candidateData = await Candidate.list("-created_date", 500);
      }

      setCandidates(candidateData);
    } catch (error) {
      console.error("Error loading candidates:", error);
      setCandidates([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleGenerateAll = async () => {
    if (!confirm(t('generate_all_confirm'))) {
      return;
    }

    setGeneratingAll(true);
    try {
      const { bulkGenerateIntelligence } = await import("@/api/functions");
      
      const response = await bulkGenerateIntelligence({ forceRegenerate: true });

      if (response.data?.success) {
        const result = response.data;
        alert(`${t('intelligence_generation_complete')}\n\n${t('total_candidates')}: ${result.total_candidates}\n${t('processed')}: ${result.processed}\n${t('skipped_recent')}: ${result.skipped}\n${t('errors')}: ${result.errors}`);
        
        await loadCandidates();
      } else if (response.data?.error) {
        alert(`${t('error_msg')}: ${response.data.error}\n${response.data.message || ''}`);
      }
    } catch (error) {
      console.error('Error generating intelligence:', error);
      alert(`${t('error_msg')}: ${error.message || t('unknown_error')}`);
    } finally {
      setGeneratingAll(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    let filtered = candidates.filter(c => c.intelligence_score);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query)
      );
    }

    if (scoreFilter !== "all") {
      filtered = filtered.filter(c => {
        const score = c.intelligence_score;
        if (scoreFilter === "high") return score >= 70;
        if (scoreFilter === "medium") return score >= 50 && score < 70;
        if (scoreFilter === "low") return score < 50;
        return true;
      });
    }

    if (tenureFilter !== "all") {
      filtered = filtered.filter(c => {
        const tenure = c.years_with_current_company || 0;
        if (tenureFilter === "0-2") return tenure < 2;
        if (tenureFilter === "2-5") return tenure >= 2 && tenure <= 5;
        if (tenureFilter === "5+") return tenure > 5;
        return true;
      });
    }

    if (companyFilter !== "all") {
      filtered = filtered.filter(c => c.company_name === companyFilter);
    }

    return filtered.sort((a, b) => (b.intelligence_score || 0) - (a.intelligence_score || 0));
  }, [candidates, searchQuery, scoreFilter, tenureFilter, companyFilter]);

  const uniqueCompanies = useMemo(() => {
    return [...new Set(candidates.map(c => c.company_name).filter(Boolean))].sort();
  }, [candidates]);

  const hotLeads = filteredCandidates.filter(c => c.intelligence_score >= 70);
  const avgScore = filteredCandidates.length > 0
    ? Math.round(filteredCandidates.reduce((sum, c) => sum + (c.intelligence_score || 0), 0) / filteredCandidates.length)
    : 0;

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-30", count: 0 },
      { range: "30-50", count: 0 },
      { range: "50-70", count: 0 },
      { range: "70-100", count: 0 }
    ];
    
    filteredCandidates.forEach(c => {
      const score = c.intelligence_score || 0;
      if (score < 30) ranges[0].count++;
      else if (score < 50) ranges[1].count++;
      else if (score < 70) ranges[2].count++;
      else ranges[3].count++;
    });

    return ranges;
  }, [filteredCandidates]);

  const isRecentlyEnriched = (candidate) => {
    if (!candidate.last_intelligence_update) return false;
    
    const updateTime = new Date(candidate.last_intelligence_update);
    const now = new Date();
    const hoursSinceUpdate = (now - updateTime) / (1000 * 60 * 60);
    
    // Consider "recent" if updated in the last 48 hours
    return hoursSinceUpdate < 48;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#151A1F' }}>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: '#E9F0F1' }}>{t('loading_intelligence_data')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#151A1F' }}>
      <style>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
        }
      `}</style>

      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <IconWrapper icon={Brain} size={36} variant="muted" glow={true} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#E9F0F1' }}>
                {t('market_intelligence')}
              </h1>
              <p className="text-sm" style={{ color: '#B5C0C4' }}>
                {filteredCandidates.length} candidates | {hotLeads.length} hot leads | {avgScore} avg score
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerateAll}
            disabled={generatingAll || loading}
            className="btn-primary"
          >
            {generatingAll ? (
              <>
                <SyncAvatar size={18} className="mr-2" />
                {t('generating')}
              </>
            ) : (
              <>
                <IconWrapper icon={Sparkles} size={18} variant="accent" glow={true} className="mr-2" />
                {t('generate_all')}
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>{t('total_pool')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#E9F0F1' }}>
                    {filteredCandidates.length}
                  </p>
                </div>
                <IconWrapper icon={Users} size={40} variant="muted" glow={true} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>{t('hot_leads_metric')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#EF4444' }}>
                    {hotLeads.length}
                  </p>
                </div>
                <IconWrapper icon={TrendingUp} size={48} variant="accent" glow={true} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>{t('avg_score')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: '#E9F0F1' }}>
                    {avgScore}
                  </p>
                </div>
                <IconWrapper icon={Target} size={40} variant="muted" glow={true} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card p-4">
          <CardContent className="p-0">
            <div className="flex flex-wrap gap-3">
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-[180px]" style={{background: 'rgba(255,255,255,.04)', color: '#E9F0F1', border: '1px solid rgba(255,255,255,.12)'}}>
                  <SelectValue placeholder={t('score')} />
                </SelectTrigger>
                <SelectContent style={{background: 'rgba(15,20,24,.98)', border: '1px solid rgba(255,255,255,.1)'}}>
                  <SelectItem value="all" style={{color: '#E9F0F1'}}>{t('all_scores')}</SelectItem>
                  <SelectItem value="high" style={{color: '#E9F0F1'}}>{t('score_high')}</SelectItem>
                  <SelectItem value="medium" style={{color: '#E9F0F1'}}>{t('score_medium')}</SelectItem>
                  <SelectItem value="low" style={{color: '#E9F0F1'}}>{t('score_low')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tenureFilter} onValueChange={setTenureFilter}>
                <SelectTrigger className="w-[180px]" style={{background: 'rgba(255,255,255,.04)', color: '#E9F0F1', border: '1px solid rgba(255,255,255,.12)'}}>
                  <SelectValue placeholder={t('tenure')} />
                </SelectTrigger>
                <SelectContent style={{background: 'rgba(15,20,24,.98)', border: '1px solid rgba(255,255,255,.1)'}}>
                  <SelectItem value="all" style={{color: '#E9F0F1'}}>{t('all_tenure')}</SelectItem>
                  <SelectItem value="0-2" style={{color: '#E9F0F1'}}>0-2 {t('years')}</SelectItem>
                  <SelectItem value="2-5" style={{color: '#E9F0F1'}}>2-5 {t('years')}</SelectItem>
                  <SelectItem value="5+" style={{color: '#E9F0F1'}}>5+ {t('years')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px]" style={{background: 'rgba(255,255,255,.04)', color: '#E9F0F1', border: '1px solid rgba(255,255,255,.12)'}}>
                  <SelectValue placeholder={t('company')} />
                </SelectTrigger>
                <SelectContent style={{background: 'rgba(15,20,24,.98)', border: '1px solid rgba(255,255,255,.1)'}}>
                  <SelectItem value="all" style={{color: '#E9F0F1'}}>{t('all_companies')}</SelectItem>
                  {uniqueCompanies.slice(0, 20).map(company => (
                    <SelectItem key={company} value={company} style={{color: '#E9F0F1'}}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color: '#B5C0C4'}} />
                <Input
                  placeholder={t('search_candidates')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{background: 'transparent', border: '1px solid rgba(255,255,255,.12)', color: '#E9F0F1'}}
                />
              </div>

              {(scoreFilter !== 'all' || tenureFilter !== 'all' || companyFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setScoreFilter("all");
                    setTenureFilter("all");
                    setCompanyFilter("all");
                  }}
                  style={{color: '#EF4444'}}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('clear_filters')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hot Leads */}
        {hotLeads.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2" style={{color: '#E9F0F1'}}>
                  <IconWrapper icon={Zap} size={24} variant="accent" glow={true} />
                  {t('priority_outreach_queue')} ({hotLeads.length})
                </CardTitle>
                {hotLeads.length > 9 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllHotLeads(!showAllHotLeads)}
                    style={{ color: '#EF4444' }}
                  >
                    {showAllHotLeads ? 'Show Less' : `Show All ${hotLeads.length}`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${showAllHotLeads ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
                {(showAllHotLeads ? hotLeads : hotLeads.slice(0, 9)).map((c) => (
                  <Link
                    key={c.id}
                    to={`${createPageUrl("CandidateProfile")}?id=${c.id}`}
                    className="glass-card p-4 hover:bg-white/[0.03] transition-all cursor-pointer relative"
                  >
                    {isRecentlyEnriched(c) && (
                      <Badge 
                        className="absolute top-2 right-2 text-xs px-2 py-0.5"
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#86EFAC',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-1 inline" />
                        Fresh
                      </Badge>
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{background: 'rgba(239,68,68,.2)'}}
                      >
                        <span className="font-bold text-lg" style={{color: '#E9F0F1'}}>
                          {c.intelligence_score || 0}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate" style={{color: '#E9F0F1'}}>
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-xs truncate" style={{color: '#B5C0C4'}}>
                          {c.job_title} @ {c.company_name}
                        </div>
                        {isRecentlyEnriched(c) && (
                          <div className="text-xs mt-1" style={{color: '#86EFAC'}}>
                            Updated {new Date(c.last_intelligence_update).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Distribution */}
        {scoreDistribution.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{color: '#E9F0F1'}}>{t('readiness_score_distribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" stroke="#B5C0C4" />
                  <YAxis stroke="#B5C0C4" />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(26,32,38,0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#E9F0F1'
                    }}
                  />
                  <Bar dataKey="count" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
