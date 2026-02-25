import React, { useState, useEffect } from 'react';
import {
  Mail, Settings, Plus, X, Loader2, CheckCircle2, XCircle,
  RefreshCw, Trash2, Power, PowerOff, FileText, Clock
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
import { toast } from 'sonner';

export default function EmailImportSettings() {
  const { user } = useUser();
  const { ft } = useTheme();
  const companyId = user?.company_id || user?.organization_id;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentImports, setRecentImports] = useState([]);
  const [newSender, setNewSender] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    loadSettings();
    loadRecentImports();
  }, [companyId]);

  const loadSettings = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('email_import_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('provider', 'gmail')
        .maybeSingle();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load email import settings:', e);
    } finally {
      setLoading(false);
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
      console.warn('Failed to load recent imports:', e);
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

  const handleConnectGmail = async () => {
    // Use existing Composio connection flow
    toast.info('Connect Gmail via the Integrations page, then link your connected account here.');
  };

  const handleSetConnectedAccount = async (accountId) => {
    if (!companyId || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('email_import_settings')
        .upsert({
          company_id: companyId,
          user_id: user.id,
          provider: 'gmail',
          connected_account_id: accountId,
          is_active: true,
          filter_keywords: ['invoice', 'factuur', 'rekening', 'nota', 'receipt', 'bon'],
          auto_process: true,
        }, { onConflict: 'company_id,provider' })
        .select()
        .single();
      if (error) throw error;
      setSettings(data);
      toast.success('Gmail import configured');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'extracted': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
      case 'processing': return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
      case 'pending': return 'border-zinc-600 text-zinc-400';
      case 'failed': return 'border-red-500/30 text-red-400 bg-red-500/10';
      default: return 'border-zinc-600 text-zinc-400';
    }
  };

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
          {settings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              disabled={saving}
              className={settings.is_active ? 'text-emerald-400' : 'text-zinc-400'}
            >
              {settings.is_active ? <Power className="w-4 h-4 mr-1" /> : <PowerOff className="w-4 h-4 mr-1" />}
              {settings.is_active ? 'Active' : 'Paused'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings ? (
          <div className="text-center py-6">
            <Mail className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
            <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')} mb-4`}>
              Connect your Gmail to auto-import invoice attachments
            </p>
            <Button onClick={handleConnectGmail} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Mail className="w-4 h-4 mr-2" /> Connect Gmail
            </Button>
          </div>
        ) : (
          <>
            {/* Auto-process toggle */}
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

            {/* Sender whitelist */}
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

            {/* Keyword filter */}
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
