
import React, { useState, useEffect } from "react";
import { OutreachTask } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  RefreshCw,
  Calendar,
  User as UserIcon,
  Building2,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";

export default function OutreachPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        await loadTasks(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    init();
  }, []);

  const loadTasks = async (userData) => {
    setLoading(true);
    try {
      const allTasks = await OutreachTask.filter(
        { organization_id: userData.organization_id },
        "-created_date",
        500
      );
      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
    setLoading(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending_generation: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", label: "Wacht op Generatie", icon: Clock },
      pending_approval: { color: "bg-blue-500/10 text-blue-400 border-blue-500/30", label: "Wacht op Goedkeuring", icon: Eye },
      approved_ready: { color: "bg-purple-500/10 text-purple-400 border-purple-500/30", label: "Klaar voor Verzending", icon: Send },
      in_progress: { color: "bg-orange-500/10 text-orange-400 border-orange-500/30", label: "Agent Bezig", icon: RefreshCw },
      sent: { color: "bg-green-500/10 text-green-400 border-green-500/30", label: "Verzonden", icon: CheckCircle2 },
      awaiting_reply: { color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", label: "Wacht op Reactie", icon: Clock },
      replied: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Reactie Ontvangen", icon: MessageSquare },
      completed: { color: "bg-gray-500/10 text-gray-400 border-gray-500/30", label: "Voltooid", icon: CheckCircle2 },
      failed: { color: "bg-red-500/10 text-red-400 border-red-500/30", label: "Mislukt", icon: XCircle }
    };
    return configs[status] || configs.pending_generation;
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "action_needed") return t.status === "pending_generation" || t.status === "pending_approval";
    if (filter === "active") return t.status === "approved_ready" || t.status === "in_progress" || t.status === "awaiting_reply";
    if (filter === "completed") return t.status === "sent" || t.status === "replied" || t.status === "completed";
    return true;
  });

  const stats = {
    total: tasks.length,
    action_needed: tasks.filter(t => t.status === "pending_generation" || t.status === "pending_approval").length,
    in_flight: tasks.filter(t => t.status === "approved_ready" || t.status === "in_progress" || t.status === "awaiting_reply").length,
    sent: tasks.filter(t => t.status === "sent").length,
    replied: tasks.filter(t => t.status === "replied").length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>Outreach laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#151A1F' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
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
      `}</style>

      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--txt)' }}>
              AI Outreach Pipeline
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Automatische outreach met AI agent
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>{stats.total}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Totaal</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-400">{stats.action_needed}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Actie Vereist</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.in_flight}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>In Behandeling</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Verzonden</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-400">{stats.replied}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Reacties</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={filter === "all" ? "btn-primary" : "btn-outline"}
          >
            Alle
          </Button>
          <Button
            variant={filter === "action_needed" ? "default" : "outline"}
            onClick={() => setFilter("action_needed")}
            className={filter === "action_needed" ? "btn-primary" : "btn-outline"}
          >
            Actie Vereist ({stats.action_needed})
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            className={filter === "active" ? "btn-primary" : "btn-outline"}
          >
            Actief ({stats.in_flight})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            className={filter === "completed" ? "btn-primary" : "btn-outline"}
          >
            Voltooid
          </Button>
        </div>

        {/* Tasks List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Link
                key={task.id}
                to={`${createPageUrl("OutreachTaskDetail")}?id=${task.id}`}
                className="glass-card p-6 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg" style={{ color: 'var(--txt)' }}>
                        {task.candidate_name}
                      </h3>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {task.attempt_number && (
                        <Badge variant="outline" className="text-xs">
                          Poging {task.attempt_number}/3
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm mb-3" style={{ color: 'var(--muted)' }}>
                      <div className="flex items-center gap-1">
                        <IconWrapper icon={UserIcon} size={14} variant="muted" />
                        <span>{task.candidate_job_title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconWrapper icon={Building2} size={14} variant="muted" />
                        <span>{task.candidate_company}</span>
                      </div>
                      {task.scheduled_for && (
                        <div className="flex items-center gap-1">
                          <IconWrapper icon={Calendar} size={14} variant="muted" />
                          <span>Gepland: {new Date(task.scheduled_for).toLocaleDateString('nl-NL')}</span>
                        </div>
                      )}
                    </div>

                    {task.message_content && (
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--muted)' }}>
                        {task.message_content}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <IconWrapper icon={MessageSquare} size={48} variant="muted" />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  Geen taken gevonden
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Start outreach via kandidaten pagina
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
