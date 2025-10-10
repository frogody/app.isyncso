import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, 
  Building2, 
  MapPin, 
  TrendingUp, 
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function CompareMode({ candidates, onClose }) {
  if (!candidates || candidates.length < 2) return null;

  const metrics = [
    { key: 'intelligence_score', label: 'Flight Risk', icon: AlertTriangle },
    { key: 'years_with_current_company', label: 'Tenure', icon: Calendar },
    { key: 'times_promoted_current_company', label: 'Promotions', icon: Award },
    { key: 'percent_employee_growth_12m', label: 'Company Growth', icon: TrendingUp }
  ];

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{color: 'var(--txt)'}}>
            <UserIcon className="w-5 h-5" style={{color: 'var(--accent)'}} />
            Kandidaten Vergelijking ({candidates.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} style={{color: 'var(--muted)'}}>
            Sluiten
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                <th className="text-left p-3 font-semibold" style={{color: 'var(--txt)'}}>Metric</th>
                {candidates.map(c => (
                  <th key={c.id} className="text-left p-3 min-w-[200px]">
                    <div>
                      <div className="font-semibold" style={{color: 'var(--txt)'}}>
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="text-xs" style={{color: 'var(--muted)'}}>
                        {c.job_title}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Company */}
              <tr className="border-b" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                <td className="p-3 font-medium" style={{color: 'var(--muted)'}}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Bedrijf
                  </div>
                </td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3" style={{color: 'var(--txt)'}}>
                    {c.company_name || '-'}
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="border-b" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                <td className="p-3 font-medium" style={{color: 'var(--muted)'}}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Locatie
                  </div>
                </td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3" style={{color: 'var(--txt)'}}>
                    {c.person_home_location || '-'}
                  </td>
                ))}
              </tr>

              {/* Metrics */}
              {metrics.map(metric => (
                <tr key={metric.key} className="border-b" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                  <td className="p-3 font-medium" style={{color: 'var(--muted)'}}>
                    <div className="flex items-center gap-2">
                      <metric.icon className="w-4 h-4" />
                      {metric.label}
                    </div>
                  </td>
                  {candidates.map(c => {
                    const value = c[metric.key];
                    const isHighest = value === Math.max(...candidates.map(c2 => c2[metric.key] || 0));
                    
                    return (
                      <td key={c.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <span style={{color: 'var(--txt)'}}>
                            {value !== undefined && value !== null 
                              ? (metric.key === 'intelligence_score' ? `${value}%` : 
                                 metric.key === 'percent_employee_growth_12m' ? `${value}%` : value)
                              : '-'}
                          </span>
                          {isHighest && value > 0 && (
                            <CheckCircle2 className="w-4 h-4" style={{color: 'var(--accent)'}} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Intelligence Level */}
              <tr className="border-b" style={{borderColor: 'rgba(255,255,255,.06)'}}>
                <td className="p-3 font-medium" style={{color: 'var(--muted)'}}>
                  Risk Level
                </td>
                {candidates.map(c => (
                  <td key={c.id} className="p-3">
                    <Badge className={
                      c.intelligence_level === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      c.intelligence_level === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      c.intelligence_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-green-500/20 text-green-400 border-green-500/30'
                    }>
                      {c.intelligence_level || 'Unknown'}
                    </Badge>
                  </td>
                ))}
              </tr>

              {/* Top Intelligence Factor */}
              <tr>
                <td className="p-3 font-medium" style={{color: 'var(--muted)'}}>
                  Top Factor
                </td>
                {candidates.map(c => {
                  const topFactor = c.intelligence_factors?.[0];
                  return (
                    <td key={c.id} className="p-3 text-sm" style={{color: 'var(--txt)'}}>
                      {topFactor ? (
                        <div>
                          <div className="font-medium">{topFactor.factor}</div>
                          <div className="text-xs" style={{color: 'var(--muted)'}}>
                            {topFactor.detail}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recommendation */}
        <div className="mt-6 p-4 rounded-lg" style={{background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)'}}>
          <h4 className="font-semibold mb-2 flex items-center gap-2" style={{color: 'var(--txt)'}}>
            <ArrowRight className="w-4 h-4" style={{color: 'var(--accent)'}} />
            Aanbeveling
          </h4>
          <p className="text-sm" style={{color: 'var(--muted)'}}>
            {getBestCandidateRecommendation(candidates)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getBestCandidateRecommendation(candidates) {
  const highest = candidates.reduce((best, current) => {
    const currentScore = current.intelligence_score || 0;
    const bestScore = best.intelligence_score || 0;
    return currentScore > bestScore ? current : best;
  }, candidates[0]);

  return `${highest.first_name} ${highest.last_name} heeft de hoogste flight risk score (${highest.intelligence_score}%) en is waarschijnlijk het meest open voor een nieuwe opportunity. Focus recruitment inspanningen hier eerst, met ${candidates.filter(c => c.id !== highest.id)[0]?.first_name} als backup optie.`;
}