import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileCompleteness({ userId, variant = 'full' }) {
  const [completeness, setCompleteness] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCompleteness = React.useCallback(async () => {

    try {
      const response = await base44.functions.invoke('calculateProfileCompleteness', {});
      setCompleteness(response.data);
    } catch (error) {
      console.error('Failed to load profile completeness:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompleteness();
  }, [userId, loadCompleteness]);

  if (loading) {
    if (variant === 'compact') {
      return <Skeleton className="h-6 w-32 bg-gray-800" />;
    }
    return <Skeleton className="h-48 bg-gray-800" />;
  }

  if (!completeness) return null;

  // Compact version for headers/dashboards
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                completeness.percentage === 100 ? 'bg-green-500' :
                completeness.percentage >= 75 ? 'bg-cyan-500' :
                completeness.percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          <span className="text-sm text-gray-400">
            {completeness.percentage}%
          </span>
        </div>
        {completeness.percentage < 100 && (
          <Link to={createPageUrl("Profile")}>
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 h-7 px-2 text-xs">
              Complete
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Full version for Profile page
  return (
    <Card className="glass-card border-0 border-cyan-500/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          {completeness.percentage === 100 ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          )}
          Profile Completeness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                completeness.percentage === 100 ? 'bg-green-500' :
                completeness.percentage >= 75 ? 'bg-cyan-500' :
                completeness.percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-white">
            {completeness.percentage}%
          </span>
        </div>

        {completeness.percentage === 100 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-green-400 font-medium">Your profile is complete!</div>
              <div className="text-sm text-gray-400">All information filled out for optimal personalization</div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="text-sm text-cyan-300 mb-2">
                Complete your profile for better course personalization and recommendations
              </div>
              <div className="text-xs text-gray-400">
                {completeness.score} / {completeness.maxScore} points
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-400 mb-3">Next Steps:</div>
              <div className="space-y-2">
                {completeness.missing.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">○</span>
                      <span className="text-gray-300">{item.label}</span>
                      {item.required && (
                        <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-xs">Required</Badge>
                      )}
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
                      +{item.weight}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {completeness.missing.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{completeness.missing.length - 5} more items
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}