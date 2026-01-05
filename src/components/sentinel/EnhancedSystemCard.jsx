import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Shield, 
  ArrowRight, 
  FileText, 
  List, 
  Edit, 
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  Copy
} from "lucide-react";

export default function EnhancedSystemCard({ system, onEdit }) {
  const [obligations, setObligations] = useState([]);
  const [loadingObligations, setLoadingObligations] = useState(true);

  const handleDelete = React.useCallback(async () => {
    if (confirm(`Are you sure you want to delete "${system.name}"? This action cannot be undone.`)) {
      try {
        await base44.entities.AISystem.delete(system.id);
        window.location.reload();
      } catch (error) {
        console.error("Failed to delete system:", error);
        alert("Failed to delete system. Please try again.");
      }
    }
  }, [system.id, system.name]);

  const loadObligations = React.useCallback(async () => {

    try {
      const allObligations = await base44.entities.Obligation.list();
      
      // Filter obligations applicable to this system
      const applicable = allObligations.filter(obl => {
        if (obl.risk_category === 'all') return true;
        if (obl.risk_category === system.risk_classification) return true;
        if (system.risk_classification === 'gpai' && obl.risk_category === 'gpai-systemic') {
          return system.assessment_answers?.gpai?.systemic_risk === true;
        }
        return false;
      });

      setObligations(applicable);
    } catch (error) {
      console.error("Failed to load obligations:", error);
    } finally {
      setLoadingObligations(false);
    }
  }, [system]);

  useEffect(() => {
    if (system.risk_classification !== 'unclassified') {
      loadObligations();
    } else {
      setLoadingObligations(false);
    }
  }, [system, loadObligations]);

  // Calculate progress (mock completion for now)
  const totalObligations = obligations.length;
  const completedObligations = Math.floor(totalObligations * 0.36); // Mock 36% completion
  const progressPercent = totalObligations > 0 ? Math.round((completedObligations / totalObligations) * 100) : 0;

  // Find next action (highest priority incomplete obligation)
  const nextObligation = obligations
    .filter(obl => obl.priority === 'critical' || obl.priority === 'high')
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];

  const daysRemaining = nextObligation 
    ? Math.ceil((new Date(nextObligation.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const classificationColors = {
    prohibited: { bg: 'bg-[#86EFAC]/20', text: 'text-[#86EFAC]', border: 'border-[#86EFAC]/30' },
    'high-risk': { bg: 'bg-[#86EFAC]/20', text: 'text-[#86EFAC]', border: 'border-[#86EFAC]/30' },
    gpai: { bg: 'bg-[#6EE7B7]/20', text: 'text-[#6EE7B7]', border: 'border-[#6EE7B7]/30' },
    'limited-risk': { bg: 'bg-[#6EE7B7]/20', text: 'text-[#6EE7B7]', border: 'border-[#6EE7B7]/30' },
    'minimal-risk': { bg: 'bg-[#86EFAC]/20', text: 'text-[#86EFAC]', border: 'border-[#86EFAC]/30' },
    unclassified: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  };

  const colors = classificationColors[system.risk_classification];

  // Render unclassified card (special treatment)
  if (system.risk_classification === 'unclassified') {
    return (
      <Card className="glass-card border-0 border-gray-500/30 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{system.name}</h3>
              <p className="text-sm text-gray-400 line-clamp-2">{system.purpose}</p>
            </div>
            <Badge className={`border ${colors.bg} ${colors.text} ${colors.border}`}>
              ⚪ UNCLASSIFIED
            </Badge>
          </div>

          <div className="border-t border-white/10 pt-4 pb-4 mb-4">
            <div className="flex items-center gap-3 text-[#86EFAC]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Classification required</div>
                <div className="text-xs text-gray-400">Run the assessment wizard to determine obligations</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center gap-3">
            <Link to={createPageUrl(`RiskAssessment?systemId=${system.id}`)} className="flex-1">
              <Button size="sm" className="w-full bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]">
                ▶ Start Assessment
              </Button>
            </Link>
            <Button
              onClick={() => onEdit(system)}
              size="sm"
              className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem onClick={() => onEdit(system)} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate System
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-800 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render prohibited card (warning state)
  if (system.risk_classification === 'prohibited') {
    return (
      <Card className="glass-card border-0 border-[#86EFAC]/30 group relative">
        <div className="absolute inset-0 bg-[#86EFAC]/5 rounded-lg pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{system.name}</h3>
              <p className="text-sm text-gray-400 line-clamp-2">{system.purpose}</p>
            </div>
            <Badge className={`border ${colors.bg} ${colors.text} ${colors.border}`}>
              🚫 PROHIBITED
            </Badge>
          </div>

          <div className="border-t border-white/10 pt-4 pb-4 mb-4">
            <div className="flex items-center gap-3 text-[#86EFAC]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">⚠️ Review Required — Deployment may be banned</div>
                <div className="text-xs text-gray-400">This system falls under EU AI Act prohibited practices</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center gap-3">
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
              onClick={() => {}}
            >
              <List className="w-4 h-4 mr-2" />
              View Restrictions
            </Button>
            <Button
              onClick={() => onEdit(system)}
              size="sm"
              className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem onClick={() => onEdit(system)} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-800 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render minimal-risk card (simple state)
  if (system.risk_classification === 'minimal-risk') {
    return (
      <Card className="glass-card border-0 border-[#86EFAC]/30 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">{system.name}</h3>
              <p className="text-sm text-gray-400 line-clamp-2">{system.purpose}</p>
            </div>
            <Badge className={`border ${colors.bg} ${colors.text} ${colors.border}`}>
              🟢 MINIMAL RISK
            </Badge>
          </div>

          <div className="border-t border-white/10 pt-4 pb-4 mb-4">
            <div className="flex items-center gap-3 text-[#86EFAC]">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">✓ Minimal requirements</div>
                <div className="text-xs text-gray-400">No specific AI Act obligations</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center gap-3">
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
              onClick={() => {}}
            >
              View Details
            </Button>
            <Button
              onClick={() => onEdit(system)}
              size="sm"
              className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem onClick={() => onEdit(system)} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-800 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render high-risk/GPAI/limited-risk card (full featured)
  return (
    <Card className={`glass-card border-0 ${colors.border} group`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{system.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-1">
              {system.classification_reasoning || system.purpose}
            </p>
          </div>
          <Badge className={`border ${colors.bg} ${colors.text} ${colors.border}`}>
            {system.risk_classification === 'high-risk' && '🔴'} 
            {system.risk_classification === 'gpai' && '🟣'} 
            {system.risk_classification === 'limited-risk' && '🟡'} 
            {' '}
            {system.risk_classification.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Progress Section */}
        {!loadingObligations && totalObligations > 0 && (
          <div className="border-t border-white/10 pt-4 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-400">Compliance Progress</span>
              <span className={colors.text}>
                {completedObligations}/{totalObligations} obligations · {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-[#86EFAC] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Next Action */}
        {nextObligation && (
          <div className="border-t border-white/10 pt-4 pb-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#86EFAC] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white mb-1">
                  Next: {nextObligation.obligation_title}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    Due: {new Date(nextObligation.deadline).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                  {daysRemaining !== null && (
                    <>
                      <span>•</span>
                      <span className={daysRemaining < 180 ? 'text-[#86EFAC] font-semibold' : ''}>
                        {daysRemaining} days remaining
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-white/10 pt-4 flex items-center gap-3">
          <Link to={createPageUrl("ComplianceRoadmap")} className="flex-1">
            <Button size="sm" className="w-full bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]">
              <List className="w-4 h-4 mr-2" />
              View Obligations
            </Button>
          </Link>
          {(system.risk_classification === 'high-risk' || system.risk_classification === 'gpai') && (
            <Link to={createPageUrl("DocumentGenerator")}>
              <Button
                size="sm"
                className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Button
            onClick={() => onEdit(system)}
            size="sm"
            className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-gradient-to-b from-[#86EFAC]/10 to-[#86EFAC]/5 border border-[#86EFAC]/30 text-[#86EFAC] hover:border-[#86EFAC]/50 hover:text-[#6EE7B7]"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              <DropdownMenuItem onClick={() => onEdit(system)} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="text-gray-300 hover:bg-gray-800 cursor-pointer">
                <Copy className="w-4 h-4 mr-2" />
                Duplicate System
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-800 cursor-pointer">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}