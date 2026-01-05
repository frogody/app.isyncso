import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function CompanyInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [joining, setJoining] = useState(false);

  const loadInvitation = React.useCallback(async () => {

    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    try {
      // Check if user is authenticated
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Load invitation
      const invite = await base44.entities.Invitation.get(token);
      if (!invite) {
        setError("Invitation not found");
        setLoading(false);
        return;
      }

      if (invite.status !== 'pending') {
        setError("This invitation has already been used or revoked");
        setLoading(false);
        return;
      }

      setInvitation(invite);

      // Load company
      const companyData = await base44.entities.Company.get(invite.company_id);
      setCompany(companyData);

    } catch (err) {
      console.error("Failed to load invitation:", err);
      setError(err.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  const handleJoin = React.useCallback(async () => {
    if (!currentUser) {
      // Redirect to login with return URL
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setJoining(true);
    try {
      // Update user's company
      await base44.auth.updateMe({ company_id: invitation.company_id });

      // Mark invitation as accepted
      await base44.entities.Invitation.update(invitation.id, { 
        status: 'accepted',
        email: currentUser.email
      });

      alert(`Successfully joined ${company.name}!`);
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      console.error("Failed to join company:", err);
      alert("Failed to join company: " + err.message);
    } finally {
      setJoining(false);
    }
  }, [currentUser, invitation, company, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-gray-400">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="bg-cyan-600 hover:bg-cyan-500">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joining) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-gray-400">Joining company...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="glass-card border-0 max-w-lg w-full">
        <CardHeader className="text-center pb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
            <Building2 className="w-10 h-10 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl text-white">You're Invited!</CardTitle>
          <p className="text-gray-400 mt-2">Join your team on ISYNCSO</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {company && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-4 mb-4">
                {company.logo_url ? (
                  <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-2" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-cyan-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{company.name}</h3>
                  {company.domain && (
                    <p className="text-sm text-gray-400">{company.domain}</p>
                  )}
                </div>
              </div>

              {company.description && (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {company.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                {company.industry && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                    <span className="text-xs text-gray-400">Industry:</span>
                    <span className="text-xs text-white font-medium">{company.industry}</span>
                  </div>
                )}
                {company.size_range && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-white font-medium">{company.size_range}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {invitation?.message && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-200 italic">"{invitation.message}"</p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleJoin} 
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium h-12 text-base"
            >
              {currentUser ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Join {company?.name}
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Sign Up & Join
                </>
              )}
            </Button>

            {currentUser && (
              <p className="text-center text-xs text-gray-500">
                Joining as {currentUser.email}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}