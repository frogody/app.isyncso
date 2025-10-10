import React, { useState, useEffect } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SyncAvatar from "../components/ui/SyncAvatar";

export default function AddCandidatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    linkedin_profile: "",
    job_title: "",
    company_name: "",
    person_home_location: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.linkedin_profile) {
      alert("Please fill in all required fields (First Name, Last Name, LinkedIn Profile)");
      return;
    }

    setSaving(true);

    try {
      let candidate;

      if (user?.organization_id) {
        // Use round robin assignment which includes auto-intelligence
        const { assignCandidateRoundRobin } = await import("@/api/functions");
        const response = await assignCandidateRoundRobin({
          organizationId: user.organization_id,
          candidateData: {
            ...formData,
            organization_id: user.organization_id
          }
        });

        if (response.data?.success && response.data?.candidate) {
          candidate = response.data.candidate;
          console.log('Candidate created via round robin, intelligence generation initiated');
        } else {
          throw new Error(response.data?.error || 'Failed to create candidate');
        }
      } else {
        // No organization - create directly and trigger intelligence
        candidate = await Candidate.create(formData);
        console.log('Candidate created directly, starting intelligence generation...');
        
        // Trigger intelligence generation
        const { generateCandidateIntelligence } = await import("@/api/functions");
        generateCandidateIntelligence({ candidate_id: candidate.id })
          .then(() => console.log('Intelligence generation completed for', candidate.id))
          .catch(err => console.error('Intelligence generation failed:', err));
      }

      // Navigate to candidates page
      navigate(createPageUrl("Candidates"));
      
    } catch (error) {
      console.error("Error creating candidate:", error);
      alert("Error creating candidate: " + error.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl("Candidates")} className="inline-flex items-center gap-2 mb-6 hover:opacity-70">
          <ArrowLeft className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--muted)' }}>Back to Candidates</span>
        </Link>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>Add New Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                    First Name *
                  </label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="bg-transparent border"
                    style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                    Last Name *
                  </label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="bg-transparent border"
                    style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                  LinkedIn Profile *
                </label>
                <Input
                  value={formData.linkedin_profile}
                  onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="bg-transparent border"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                  Job Title
                </label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="bg-transparent border"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                  Company Name
                </label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="bg-transparent border"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--txt)' }}>
                  Location
                </label>
                <Input
                  value={formData.person_home_location}
                  onChange={(e) => setFormData({ ...formData, person_home_location: e.target.value })}
                  className="bg-transparent border"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Candidates"))}
                  className="bg-transparent border"
                  style={{ color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                  style={{ color: 'var(--txt)' }}
                >
                  {saving ? (
                    <>
                      <SyncAvatar size={18} className="mr-2" />
                      Creating & Generating Intelligence...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Candidate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}