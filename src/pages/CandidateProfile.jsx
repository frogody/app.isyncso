
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Candidate } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CandidateDetails from "@/components/candidates/CandidateDetails";
import { ArrowLeft, RefreshCw, User } from "lucide-react";
import IntelligenceReport from "@/components/candidates/IntelligenceReport";

export default function CandidateProfile() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Read candidate id from query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const res = await Candidate.filter({ id });
      setCandidate(res && res.length ? res[0] : null);
      setLoading(false);
    };
    load();
  }, []);

  const handleCandidateUpdate = async () => {
    // Reload candidate data after intelligence generation
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      const res = await Candidate.filter({ id });
      if (res && res.length) {
        setCandidate(res[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--muted)' }}>Loading candidate...</span>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="btn-outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>Candidate Profile</h1>
          </div>
          <Card className="glass-card">
            <CardContent className="p-6 flex items-center gap-3">
              <User className="w-5 h-5" style={{ color: 'var(--muted)' }} />
              <p style={{ color: 'var(--muted)' }}>Candidate not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
          --accent2: #DC2626;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.08) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.25) !important;
          border-radius: 12px !important;
          transition: all .2s ease !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.12) !important;
          transform: translateY(-0.5px) !important;
          border-color: rgba(239,68,68,.35) !important;
          color: #E9F0F1 !important;
          box-shadow: 0 2px 8px rgba(239,68,68,.15) !important;
        }
        .btn-outline {
          background: transparent !important;
          color: var(--muted) !important;
          border: 1px solid rgba(255,255,255,.08) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.03) !important;
          color: var(--txt) !important;
        }
      `}</style>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="btn-outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
            {candidate.first_name} {candidate.last_name}
          </h1>
        </div>

        {/* Intelligence Report Section */}
        <IntelligenceReport candidate={candidate} onUpdate={handleCandidateUpdate} />

        {/* Original Candidate Details */}
        <Card className="glass-card">
          <CandidateDetails candidate={candidate} onUpdate={handleCandidateUpdate} />
        </Card>
      </div>
    </div>
  );
}
