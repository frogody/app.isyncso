import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OutreachTask } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Send,
  RefreshCw,
  Clock,
  Eye,
  MessageSquare
} from "lucide-react";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";

export default function OutreachTaskDetail() {
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        
        if (id) {
          const tasks = await OutreachTask.filter({ id });
          if (tasks.length > 0) {
            setTask(tasks[0]);
            setEditedMessage(tasks[0].message_content || "");
          }
        }
      } catch (error) {
        console.error("Error loading task:", error);
      }
      setLoading(false);
    };

    init();
  }, []);

  const handleGenerateMessage = async () => {
    setIsGenerating(true);
    try {
      const { generateOutreachMessage } = await import("@/api/functions");
      const response = await generateOutreachMessage({
        candidate_id: task.candidate_id,
        attempt_number: task.attempt_number
      });

      if (response.data?.message) {
        const updatedTask = await OutreachTask.update(task.id, {
          message_content: response.data.message,
          status: "pending_approval",
          generated_at: new Date().toISOString()
        });
        setTask(updatedTask);
        setEditedMessage(response.data.message);
      }
    } catch (error) {
      console.error("Error generating message:", error);
      alert("Fout bij genereren bericht");
    }
    setIsGenerating(false);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Calculate when to schedule (immediately or based on previous messages)
      const scheduledFor = new Date();
      if (task.attempt_number > 1) {
        // Follow-ups: schedule 3 days from now
        scheduledFor.setDate(scheduledFor.getDate() + 3);
      }

      const updatedTask = await OutreachTask.update(task.id, {
        message_content: editedMessage,
        status: "approved_ready",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        scheduled_for: scheduledFor.toISOString()
      });
      
      setTask(updatedTask);
      alert("Bericht goedgekeurd! AI agent zal dit verzenden.");
    } catch (error) {
      console.error("Error approving:", error);
      alert("Fout bij goedkeuren");
    }
    setIsApproving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#151A1F' }}>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: '#E9F0F1' }}>Taak laden...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#151A1F' }}>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Terug
        </Button>
        <p className="mt-4" style={{ color: '#E9F0F1' }}>Taak niet gevonden</p>
      </div>
    );
  }

  const canGenerate = task.status === "pending_generation";
  const canApprove = task.status === "pending_approval";
  const isWaitingForAgent = task.status === "approved_ready" || task.status === "in_progress";

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#151A1F' }}>
      <style jsx>{`
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
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Terug
          </Button>
          <h1 className="text-2xl font-bold" style={{ color: '#E9F0F1' }}>
            Outreach Taak: {task.candidate_name}
          </h1>
        </div>

        {/* Task Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: '#E9F0F1' }}>Taak Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm" style={{ color: '#B5C0C4' }}>Status:</span>
              <Badge className="ml-2">{task.status}</Badge>
            </div>
            <div>
              <span className="text-sm" style={{ color: '#B5C0C4' }}>Poging:</span>
              <span className="ml-2" style={{ color: '#E9F0F1' }}>{task.attempt_number}/3</span>
            </div>
            <div>
              <span className="text-sm" style={{ color: '#B5C0C4' }}>Kandidaat:</span>
              <span className="ml-2" style={{ color: '#E9F0F1' }}>
                {task.candidate_name} - {task.candidate_job_title} @ {task.candidate_company}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Message Generation / Approval */}
        {canGenerate && (
          <Card className="glass-card">
            <CardContent className="p-6 text-center space-y-4">
              <IconWrapper icon={Sparkles} size={48} variant="accent" glow={true} />
              <h3 className="text-xl font-semibold" style={{ color: '#E9F0F1' }}>
                Genereer Outreach Bericht
              </h3>
              <p style={{ color: '#B5C0C4' }}>
                Klik hieronder om een gepersonaliseerd bericht te genereren voor deze kandidaat.
              </p>
              <Button
                onClick={handleGenerateMessage}
                disabled={isGenerating}
                className="btn-primary"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Genereer Bericht
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {canApprove && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ color: '#E9F0F1' }}>Gegenereerd Bericht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={10}
                className="bg-transparent border"
                style={{ color: '#E9F0F1', borderColor: 'rgba(255,255,255,.12)' }}
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleGenerateMessage} disabled={isGenerating}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenereer
                </Button>
                <Button onClick={handleApprove} disabled={isApproving} className="btn-primary">
                  {isApproving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Goedkeuren...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Goedkeuren & Verzenden
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isWaitingForAgent && (
          <Card className="glass-card">
            <CardContent className="p-6 text-center space-y-4">
              <SyncAvatar size={48} />
              <h3 className="text-xl font-semibold" style={{ color: '#E9F0F1' }}>
                AI Agent Verwerkt Taak
              </h3>
              <p style={{ color: '#B5C0C4' }}>
                De AI agent zal dit bericht verzenden via LinkedIn Recruiter.
                {task.scheduled_for && (
                  <span className="block mt-2">
                    Gepland voor: {new Date(task.scheduled_for).toLocaleString('nl-NL')}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Agent Logs */}
        {task.agent_logs && task.agent_logs.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ color: '#E9F0F1' }}>Agent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {task.agent_logs.map((log, idx) => (
                  <div key={idx} className="text-sm p-2 rounded" style={{ background: 'rgba(255,255,255,.02)', color: '#B5C0C4' }}>
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}