import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, X, Loader2, CheckCircle2,
  RefreshCw, Power, PowerOff, FileText, LinkIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useComposio } from '@/hooks/useComposio';
import { toast } from 'sonner';

export default function EmailImportSettings() {
  const { user } = useUser();
  const { ft } = useTheme();
  const composio = useComposio();
  const companyId = user?.company_id || user?.organization_id;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [gmailConnection, setGmailConnection] = useState(null);
  const [recentImports, setRecentImports] = useState([]);
  const [newSender, setNewSender] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // Load settings + check for existing Composio Gmail connection
  useEffect(() => {
    if (!companyId || !user?.id) return;
    loadAll();
  }, [companyId, user?.id]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      loadSettings(),
      loadGmailConnection(),
      loadRecentImports(),
    ]);
    setLoading(false);
  };

  const loadSettings = async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from('email_import_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('provider', 'gmail')
        .maybeSingle();
      setSettings(data);
    } catch (e) {
      // Table may not exist yet — silently ignore
      console.warn('email_import_settings not available:', e?.message);
    }
  };

  // Check if user has a Composio Gmail connection
  const loadGmailConnection = async () => {
    if (!user?.id) return;
    try {
      const connection = await composio.getConnection(user.id, 'gmail');
      setGmailConnection(connection);

      // If we have a Composio connection but no email_import_settings, auto-link it
      if (connection?.composio_connected_account_id) {
        await autoLinkConnection(connection.composio_connected_account_id);
      }
    } catch (e) {
      console.warn('Failed to check Gmail connection:', e?.message);
    }
  };

  // Auto-create email_import_settings row when we detect a Composio Gmail connection
  const autoLinkConnection = async (connectedAccountId) => {
    if (!companyId || !user?.id) return;
    try {
      // Check if settings already exist
      const { data: existing } = await supabase
        .from('email_import_settings')
        .select('id, connected_account_id')
        .eq('company_id', companyId)
        .eq('provider', 'gmail')
        .maybeSingle();

      // Already linked to this account
      if (existing?.connected_account_id === connectedAccountId) return;

      // Upsert the settings with the Composio connection
      const { data, error } = await supabase
        .from('email_import_settings')
        .upsert({
          company_id: companyId,
          user_id: user.id,
          provider: 'gmail',
          connected_account_id: connectedAccountId,
          is_active: existing?.id ? undefined : true,
          filter_keywords: existing?.id ? undefined : ['invoice', 'factuur', 'rekening', 'nota', 'receipt', 'bon'],
          auto_process: existing?.id ? undefined : true,
        }, { onConflict: 'company_id,provider' })
        .select()
        .single();

      if (!error && data) {
        setSettings(data);
      }
    } catch (e) {
      // Table may not exist — that's fine, connection still works
      console.warn('Auto-link skipped:', e?.message);
    }
  };

  const loadRecentImports = async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from('email_invoice_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentImports(data || []);
    } catch (e) {
      // Silently ignore — table may not exist
    }
  };

  // Connect Gmail via Composio OAuth popup
  const handleConnectGmail = useCallback(async () => {
    if (!user?.id) return;
    setConnecting(true);

    try {
      // 1. Get auth configs for Gmail
      const authConfigs = await composio.getAuthConfigs('gmail');
      if (!authConfigs?.length) {
        toast.error('Gmail OAuth not configured. Contact support.');
        return;
      }

      // Use the first available auth config
      const authConfigId = authConfigs[0].id || authConfigs[0].uniqueKey;

      // 2. Initiate OAuth connection (opens popup)
      toast.info('A popup will open to connect your Gmail account...');
      const connectionResult = await composio.connect(user.id, authConfigId, {
        popup: true,
        toolkitSlug: 'gmail',
      });

      if (!connectionResult?.connectedAccountId) {
        toast.error('Failed to start Gmail connection');
        return;
      }

      // 3. Wait for OAuth completion (polls until active)
      toast.loading('Waiting for Gmail authorization...', { id: 'gmail-connect' });
      const status = await composio.waitForConnection(
        connectionResult.connectedAccountId,
        user.id,
      );

      toast.dismiss('gmail-connect');

      if (status?.status === 'ACTIVE') {
        toast.success('Gmail connected successfully!');
        // Reload to pick up the new connection
        const connection = await composio.getConnection(user.id, 'gmail');
        setGmailConnection(connection);

        if (connection?.composio_connected_account_id) {
          await autoLinkConnection(connection.composio_connected_account_id);
          await loadSettings();
        }
      }
    } catch (err) {
      toast.dismiss('gmail-connect');
      if (err.message?.includes('timeout')) {
        toast.error('Connection timed out. Please try again.');
      } else {
        toast.error(`Failed to connect Gmail: ${err.message}`);
      }
    } finally {
      setConnecting(false);
    }
  }, [user?.id, composio]);

  const handleDisconnectGmail = async () => {
    if (!gmailConnection?.composio_connected_account_id) return;
    setSaving(true);
    try {
      await composio.disconnect(gmailConnection.composio_connected_account_id);
      setGmailConnection(null);

      // Clear connected_account_id from settings
      if (settings?.id) {
        await supabase
          .from('email_import_settings')
          .update({ connected_account_id: null, is_active: false })
          .eq('id', settings.id);
        setSettings(prev => prev ? { ...prev, connected_account_id: null, is_active: false } : null);
      }
      toast.success('Gmail disconnected');
    } catch (e) {
      toast.error('Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_import_settings')
        .update({ is_active: !settings.is_active })
        .eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, is_active: !prev.is_active }));
      toast.success(settings.is_active ? 'Email import paused' : 'Email import activated');
    } catch (e) {
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoProcess = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_import_settings')
        .update({ auto_process: !settings.auto_process })
        .eq('id', settings.id);
      if (error) throw error;
      setSettings(prev => ({ ...prev, auto_process: !prev.auto_process }));
    } catch (e) {
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSender = async () => {
    if (!settings || !newSender.trim()) return;
    const updated = [...(settings.filter_senders || []), newSender.trim()];
    const { error } = await supabase
      .from('email_import_settings')
      .update({ filter_senders: updated })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => ({ ...prev, filter_senders: updated }));
      setNewSender('');
    }
  };

  const handleRemoveSender = async (sender) => {
    if (!settings) return;
    const updated = (settings.filter_senders || []).filter(s => s !== sender);
    const { error } = await supabase
      .from('email_import_settings')
      .update({ filter_senders: updated })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => ({ ...prev, filter_senders: updated }));
    }
  };

  const handleAddKeyword = async () => {
    if (!settings || !newKeyword.trim()) return;
    const updated = [...(settings.filter_keywords || []), newKeyword.trim()];
    const { error } = await supabase
      .from('email_import_settings')
      .update({ filter_keywords: updated })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => ({ ...prev, filter_keywords: updated }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = async (kw) => {
    if (!settings) return;
    const updated = (settings.filter_keywords || []).filter(k => k !== kw);
    const { error } = await supabase
      .from('email_import_settings')
      .update({ filter_keywords: updated })
      .eq('id', settings.id);
    if (!error) {
      setSettings(prev => ({ ...prev, filter_keywords: updated }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'extracted': return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
      case 'processing': return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
      case 'pending': return 'border-zinc-600 text-zinc-400';
      case 'failed': return 'border-red-500/30 text-red-400 bg-red-500/10';
      default: return 'border-zinc-600 text-zinc-400';
    }
  };

  const isConnected = !!gmailConnection?.composio_connected_account_id;

  if (loading) {
    return (
      <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ft('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${ft('text-slate-900', 'text-white')}`}>
            <Mail className="w-5 h-5 text-cyan-400" />
            Email Invoice Import
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Gmail Connected
              </Badge>
            )}
            {settings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleActive}
                disabled={saving}
                className={settings.is_active ? 'text-cyan-400' : 'text-zinc-400'}
              >
                {settings.is_active ? <Power className="w-4 h-4 mr-1" /> : <PowerOff className="w-4 h-4 mr-1" />}
                {settings.is_active ? 'Active' : 'Paused'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          /* ─── Not connected: show Connect Gmail button ─── */
          <div className="text-center py-6">
            <Mail className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
            <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-1`}>
              Connect your Gmail to auto-import invoice attachments
            </p>
            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mb-4`}>
              Uses Composio OAuth to securely read your emails
            </p>
            <Button
              onClick={handleConnectGmail}
              disabled={connecting}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {connecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><LinkIcon className="w-4 h-4 mr-2" /> Connect Gmail</>
              )}
            </Button>
          </div>
        ) : (
          /* ─── Connected: show settings ─── */
          <>
            {/* Connection info */}
            <div className={`flex items-center justify-between p-3 rounded-lg ${ft('bg-gray-50', 'bg-zinc-800/50')}`}>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className={ft('text-slate-600', 'text-zinc-400')}>
                  Gmail connected via Composio
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectGmail}
                disabled={saving}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Disconnect
              </Button>
            </div>

            {/* Auto-process toggle */}
            {settings && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Auto-extract invoices</Label>
                  <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                    Automatically run AI extraction on detected invoices
                  </p>
                </div>
                <Switch
                  checked={settings.auto_process}
                  onCheckedChange={handleToggleAutoProcess}
                  disabled={saving}
                />
              </div>
            )}

            {/* Sender whitelist */}
            {settings && (
              <div>
                <Label className={`mb-2 block ${ft('text-slate-700', 'text-zinc-300')}`}>
                  Sender filter (optional)
                </Label>
                <p className={`text-xs mb-2 ${ft('text-slate-400', 'text-zinc-500')}`}>
                  Only import from these senders. Leave empty to import from all.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(settings.filter_senders || []).map((sender) => (
                    <Badge key={sender} variant="outline" className="flex items-center gap-1 text-xs">
                      {sender}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => handleRemoveSender(sender)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSender}
                    onChange={(e) => setNewSender(e.target.value)}
                    placeholder="e.g. invoices@vodafone.nl"
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSender()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddSender}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Keyword filter */}
            {settings && (
              <div>
                <Label className={`mb-2 block ${ft('text-slate-700', 'text-zinc-300')}`}>
                  Subject keywords
                </Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(settings.filter_keywords || []).map((kw) => (
                    <Badge key={kw} variant="outline" className="flex items-center gap-1 text-xs">
                      {kw}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => handleRemoveKeyword(kw)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g. maandfactuur"
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddKeyword}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Recent imports log */}
            {recentImports.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Recent imports</Label>
                  <Button variant="ghost" size="sm" onClick={loadRecentImports} className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                  </Button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentImports.map((imp) => (
                    <div
                      key={imp.id}
                      className={`flex items-center justify-between text-xs p-2 rounded ${ft('bg-gray-50', 'bg-zinc-800/50')}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className={`truncate ${ft('text-slate-600', 'text-zinc-400')}`}>
                          {imp.attachment_filename || imp.email_subject}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(imp.status)}`}>
                        {imp.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
