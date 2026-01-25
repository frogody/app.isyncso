import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "@/api/supabaseClient";
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
      const user = await db.auth.me();
      setCurrentUser(user);

      // Load invitation
      const invite = await db.entities.Invitation.get(token);
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
      const companyData = await db.entities.Company.get(invite.company_id);
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
      db.auth.redirectToLogin(window.location.href);
      return;
    }

    setJoining(true);
    try {
      // Update user's company
      await db.auth.updateMe({ company_id: invitation.company_id });

      // Mark invitation as accepted
      await db.entities.Invitation.update(invitation.id, { 
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-gray-400">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-400 mb-4">{error}</p>
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-gray-400">Joining company...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="glass-card border-0 max-w-lg w-full">
        <CardHeader className="text-center pb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3 border border-cyan-500/30">
            <Building2 className="w-7 h-7 text-cyan-400" />
          </div>
          <CardTitle className="text-lg text-white">You're Invited!</CardTitle>
          <p className="text-gray-400 mt-1 text-sm">Join your team on ISYNCSO</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {company && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                {company.logo_url ? (
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-2" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-cyan-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">{company.name}</h3>
                  {company.domain && (
                    <p className="text-xs text-gray-400">{company.domain}</p>
                  )}
                </div>
              </div>

              {company.description && (
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  {company.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                {company.industry && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                    <span className="text-[10px] text-gray-400">Industry:</span>
                    <span className="text-[10px] text-white font-medium">{company.industry}</span>
                  </div>
                )}
                {company.size_range && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] text-white font-medium">{company.size_range}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {invitation?.message && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-200 italic">"{invitation.message}"</p>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleJoin}
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium h-10 text-sm"
            >
              {currentUser ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Join {company?.name}
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Sign Up & Join
                </>
              )}
            </Button>

            {currentUser && (
              <p className="text-center text-[10px] text-gray-500">
                Joining as {currentUser.email}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}