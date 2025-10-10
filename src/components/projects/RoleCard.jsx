import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Users, Edit, Trash2, Briefcase } from "lucide-react";
import IconWrapper from "../ui/IconWrapper";

export default function RoleCard({ role, onEdit, onDelete, language = 'nl' }) {
  const getStatusStyle = (status) => {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium border ';
    switch (status) {
      case 'open': return { className: base + 'bg-green-500/10 border-green-500/30', style: { color: 'rgb(74, 222, 128)' } };
      case 'paused': return { className: base + 'bg-yellow-500/10 border-yellow-500/30', style: { color: 'rgb(250, 204, 21)' } };
      case 'filled': return { className: base + 'bg-blue-500/10 border-blue-500/30', style: { color: 'rgb(96, 165, 250)' } };
      case 'cancelled': return { className: base + 'bg-red-500/10 border-red-500/30', style: { color: 'rgb(239, 68, 68)' } };
      default: return { className: base + 'bg-gray-500/10 border-gray-500/30', style: { color: 'rgb(156, 163, 175)' } };
    }
  };

  const statusLabels = {
    nl: { open: 'Open', paused: 'Gepauzeerd', filled: 'Ingevuld', cancelled: 'Geannuleerd' },
    en: { open: 'Open', paused: 'Paused', filled: 'Filled', cancelled: 'Cancelled' }
  };

  return (
    <Card className="glass-card hover:bg-white/[0.02] transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <IconWrapper icon={Briefcase} size={16} variant="muted" />
              <h4 className="font-semibold text-base" style={{ color: 'var(--txt)' }}>
                {role.title}
              </h4>
            </div>
            <Badge {...getStatusStyle(role.status)}>
              {statusLabels[language][role.status]}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(role)}
              className="h-8 w-8"
            >
              <IconWrapper icon={Edit} size={14} variant="muted" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(role)}
              className="h-8 w-8"
            >
              <IconWrapper icon={Trash2} size={14} variant="accent" />
            </Button>
          </div>
        </div>

        {role.description && (
          <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>
            {role.description}
          </p>
        )}

        <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          {role.location_requirements && (
            <div className="flex items-center gap-2">
              <IconWrapper icon={MapPin} size={14} variant="muted" />
              <span>{role.location_requirements}</span>
            </div>
          )}
          {role.salary_range && (
            <div className="flex items-center gap-2">
              <IconWrapper icon={DollarSign} size={14} variant="muted" />
              <span>{role.salary_range}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconWrapper icon={Users} size={14} variant="muted" />
            <span>{role.candidates_count || 0} {language === 'nl' ? 'kandidaten' : 'candidates'}</span>
          </div>
        </div>

        {role.required_skills && role.required_skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {role.required_skills.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs" style={{ background: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)', color: 'var(--muted)' }}>
                {skill}
              </Badge>
            ))}
            {role.required_skills.length > 3 && (
              <Badge variant="outline" className="text-xs" style={{ background: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)', color: 'var(--muted)' }}>
                +{role.required_skills.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}