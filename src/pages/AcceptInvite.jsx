import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, LogIn } from "lucide-react";
import { acceptInvitation } from "@/api/functions";
import SyncAvatar from "../components/ui/SyncAvatar";

export default function AcceptInvitePage() {
  const [status, setStatus] = useState('checking'); // checking, success, error, requires_login
  const [message, setMessage] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');
  const [_user, setUser] = useState(null);

  useEffect(() => {
    checkAuthAndAcceptInvite();
  }, []);

  const checkAuthAndAcceptInvite = async () => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. No token provided.');
      return;
    }

    // Check if user is logged in
    try {
      const userData = await User.me();
      setUser(userData);

      // User is logged in, try to accept invitation
      try {
        const response = await acceptInvitation({ token });
        
        if (response.data.success) {
          setStatus('success');
          setMessage('Invitation accepted successfully! Redirecting...');
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else if (response.data.requires_login) {
          setStatus('requires_login');
          setInvitationEmail(response.data.invitation_email);
          setMessage('Please log in with the invited email address to accept this invitation.');
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Failed to accept invitation');
        }
      } catch (error) {
        console.error('Error accepting invitation:', error);
        if (error.response?.data?.requires_login) {
          setStatus('requires_login');
          setInvitationEmail(error.response.data.invitation_email);
          setMessage('Please log in with the invited email address to accept this invitation.');
        } else {
          setStatus('error');
          setMessage(error.response?.data?.error || error.message || 'Failed to accept invitation');
        }
      }
    } catch {
      // User is not logged in
      setStatus('requires_login');
      setMessage('Please log in to accept this invitation.');
      
      // Try to get invitation email from the backend
      try {
        const response = await acceptInvitation({ token });
        if (response.data.invitation_email) {
          setInvitationEmail(response.data.invitation_email);
        }
      } catch (e) {
        console.error('Error getting invitation details:', e);
      }
    }
  };

  const handleLogin = async () => {
    // Redirect to login with callback to this page
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const callbackUrl = `${window.location.origin}/accept-invite?token=${token}`;
    await User.loginWithRedirect(callbackUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
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
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
      `}</style>

      <Card className="glass-card max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center" style={{ color: 'var(--txt)' }}>
            Accept Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          {status === 'checking' && (
            <>
              <SyncAvatar size={48} />
              <p style={{ color: 'var(--muted)' }}>Checking invitation...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16" style={{ color: '#10B981' }} />
              <p className="text-center font-medium" style={{ color: 'var(--txt)' }}>
                {message}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16" style={{ color: 'var(--accent)' }} />
              <p className="text-center font-medium" style={{ color: 'var(--txt)' }}>
                {message}
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="btn-primary mt-4"
              >
                Go to Home
              </Button>
            </>
          )}

          {status === 'requires_login' && (
            <>
              <AlertCircle className="w-16 h-16" style={{ color: '#F59E0B' }} />
              <div className="text-center space-y-2">
                <p className="font-medium" style={{ color: 'var(--txt)' }}>
                  {message}
                </p>
                {invitationEmail && (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Invited email: <strong>{invitationEmail}</strong>
                  </p>
                )}
              </div>
              <Button
                onClick={handleLogin}
                className="btn-primary mt-4 w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Log In to Accept
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}