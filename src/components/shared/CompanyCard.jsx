import React from "react";
import { db } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, RefreshCw, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function CompanyCard({ companyId, showRefresh = false, onRefresh }) {
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      return await db.entities.Company.get(companyId);
    },
    enabled: !!companyId
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh(companyId);
    } catch (error) {
      console.error('Failed to refresh company data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, companyId]);

  if (!companyId) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-6 text-center">
          <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No company linked</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-12 w-12 rounded bg-gray-800" />
          <Skeleton className="h-6 w-3/4 bg-gray-800" />
          <Skeleton className="h-4 w-1/2 bg-gray-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0 border-orange-500/10">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="w-12 h-12 rounded-lg object-contain bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-orange-400" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{company.name}</h3>
            <p className="text-sm text-gray-400">{company.industry || 'Industry not specified'}</p>
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-gray-300 mb-4 line-clamp-2">{company.description}</p>
        )}

        <div className="space-y-2 mb-4">
          {company.size_range && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Size</span>
              <span className="text-white">{company.size_range} employees</span>
            </div>
          )}
          {company.founded_year && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Founded</span>
              <span className="text-white">{company.founded_year}</span>
            </div>
          )}
          {company.domain && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Domain</span>
              <a 
                href={`https://${company.domain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {company.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {company.tech_stack?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Tech Stack</div>
            <div className="flex flex-wrap gap-1">
              {company.tech_stack.slice(0, 6).map(tech => (
                <Badge key={tech} className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-xs">
                  {tech}
                </Badge>
              ))}
              {company.tech_stack.length > 6 && (
                <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-xs">
                  +{company.tech_stack.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            {company.enriched_at ? (
              <>Updated {formatDistanceToNow(new Date(company.enriched_at), { addSuffix: true })}</>
            ) : (
              <>Not enriched</>
            )}
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-orange-400 hover:text-orange-300 h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}