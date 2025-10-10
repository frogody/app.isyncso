import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";

const MCP_TOOLS_CONFIG = {
  google_drive: {
    name: 'Google Drive',
    description: 'Access and search your Google Drive files, read documents, and create new files',
    icon: '📁',
    features: ['Search files', 'Read documents', 'Create files', 'List folders'],
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  },
  gmail: {
    name: 'Gmail',
    description: 'Read, search, and send emails directly from SYNC',
    icon: '📧',
    features: ['Read emails', 'Send emails', 'Search inbox', 'Filter by date'],
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Access contacts, deals, and companies from your HubSpot CRM',
    icon: '🔶',
    features: ['View contacts', 'Manage deals', 'Company data', 'Create notes'],
    comingSoon: true
  }
};

export default function MCPToolsModal({ open, onClose, user }) {
  const [connecting, setConnecting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (open && user) {
      const checkConnections = async () => {
        setCheckingStatus(true);
        try {
          setGoogleConnected(!!user?.google_oauth_access_token);
          setHubspotConnected(!!user?.hubspot_access_token);
        } catch (error) {
          console.error('Error checking connections:', error);
        }
        setCheckingStatus(false);
      };
      
      checkConnections();
    }
  }, [open, user]);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const { googleOAuthUnified } = await import("@/api/functions");
      
      const response = await googleOAuthUnified({
        scopes: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send'
        ]
      });

      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        alert('Failed to initiate Google connection');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      alert('Failed to connect: ' + error.message);
    }
    setConnecting(false);
  };

  const handleConnectHubSpot = async () => {
    setConnecting(true);
    try {
      alert('HubSpot integration coming soon! This will connect to your HubSpot CRM for contact and deal management.');
    } catch (error) {
      console.error('Error connecting to HubSpot:', error);
      alert('Failed to connect: ' + error.message);
    }
    setConnecting(false);
  };

  const tools = [
    {
      ...MCP_TOOLS_CONFIG.google_drive,
      provider: 'google',
      connected: googleConnected,
    },
    {
      ...MCP_TOOLS_CONFIG.gmail,
      provider: 'google',
      connected: googleConnected,
    },
    {
      ...MCP_TOOLS_CONFIG.hubspot,
      provider: 'hubspot',
      connected: hubspotConnected,
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-3xl max-h-[85vh] overflow-y-auto" style={{ background: 'rgba(26,32,38,.95)', borderColor: 'rgba(255,255,255,.06)' }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--txt)' }}>
            <Zap className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            MCP Tools & Connections
          </DialogTitle>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            Verbind externe tools om SYNC toegang te geven tot je data en services
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Google Connection Card */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base" style={{ color: 'var(--txt)' }}>Google Workspace</h3>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {checkingStatus ? 'Checking...' : googleConnected ? 'Connected ✓' : 'Not connected'}
                  </p>
                </div>
              </div>
              <div>
                {checkingStatus ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted)' }} />
                ) : googleConnected ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#22C55E' }} />
                ) : (
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                    className="btn-primary"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verbinden...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Verbind
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* HubSpot Connection Card */}
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF7A59, #FF5C35)' }}>
                  <span className="text-2xl">🔶</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--txt)' }}>HubSpot CRM</h3>
                    <Badge variant="outline" className="text-xs" style={{ background: 'rgba(255, 122, 89, 0.1)', borderColor: 'rgba(255, 122, 89, 0.3)', color: '#FF7A59' }}>
                      Binnenkort
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {hubspotConnected ? 'Connected ✓' : 'Not connected'}
                  </p>
                </div>
              </div>
              <div>
                <Button
                  onClick={handleConnectHubSpot}
                  disabled={connecting}
                  className="btn-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Verbind
                </Button>
              </div>
            </div>
          </Card>

          {/* Available Tools */}
          <div className="space-y-3 mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <Zap className="w-4 h-4" />
              Beschikbare MCP Tools
            </h3>
            {tools.map((tool) => (
              <Card key={tool.name} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{tool.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold" style={{ color: 'var(--txt)' }}>{tool.name}</h4>
                      {tool.connected && (
                        <Badge variant="outline" className="text-xs" style={{ background: 'rgba(34,197,94,.1)', borderColor: 'rgba(34,197,94,.3)', color: '#22C55E' }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verbonden
                        </Badge>
                      )}
                      {tool.comingSoon && (
                        <Badge variant="outline" className="text-xs" style={{ background: 'rgba(255, 122, 89, 0.1)', borderColor: 'rgba(255, 122, 89, 0.3)', color: '#FF7A59' }}>
                          Binnenkort
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>{tool.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.08)', color: 'var(--muted)' }}>
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Info Cards */}
          {googleConnected && (
            <Card className="glass-card p-4" style={{ background: 'rgba(34,197,94,.05)', borderColor: 'rgba(34,197,94,.2)' }}>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--txt)' }}>MCP tools zijn actief!</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Je kunt SYNC nu vragen om je Google Drive en Gmail te gebruiken. Probeer bijvoorbeeld:
                  </p>
                  <ul className="text-sm mt-2 space-y-1" style={{ color: 'var(--muted)' }}>
                    <li>• "Zoek in mijn Drive naar CV's van developers"</li>
                    <li>• "Check mijn recente emails van kandidaten"</li>
                    <li>• "Stuur een email naar john@example.com"</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {!googleConnected && !checkingStatus && (
            <Card className="glass-card p-4" style={{ background: 'rgba(239,68,68,.05)', borderColor: 'rgba(239,68,68,.2)' }}>
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Verbind je Google account om Drive en Gmail tools te activeren.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}