import React, { useState, useEffect } from 'react';
import {
  Building2, RefreshCw, Loader2, CheckCircle2, XCircle,
  Power, PowerOff, Clock, Zap, Settings, Link2, Unlink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function RevolutConnectionSettings() {
  const { user } = useUser();
  const { ft } = useTheme();
  const companyId = user?.company_id || user?.organization_id;

  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Setup form
  const [clientId, setClientId] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  useEffect(() => {
    loadConnection();
    loadBankAccounts();
  }, [companyId]);

  const loadConnection = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bank_connections')
        .select('*, bank_accounts(id, name, currency)')
        .eq('company_id', companyId)
        .eq('provider', 'revolut')
        .maybeSingle();
      setConnection(data);
      if (data?.client_id) setClientId(data.client_id);
      if (data?.bank_account_id) setSelectedBankAccount(data.bank_account_id);
    } catch (e) {
      console.error('Failed to load Revolut connection:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBankAccounts = async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, name, currency')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setBankAccounts(data || []);
    } catch (e) {
      console.warn('Failed to load bank accounts:', e);
    }
  };

  const handleConnect = async () => {
    if (!companyId || !clientId.trim() || !selectedBankAccount) {
      toast.error('Please fill in Client ID and select a bank account');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bank_connections')
        .upsert({
          company_id: companyId,
          provider: 'revolut',
          client_id: clientId.trim(),
          bank_account_id: selectedBankAccount,
          is_active: true,
          sync_frequency: 'daily',
        }, { onConflict: 'company_id,provider' })
        .select('*, bank_accounts(id, name, currency)')
        .single();

      if (error) throw error;
      setConnection(data);
      toast.success('Revolut connection saved. Complete OAuth setup in Revolut Business settings.');
    } catch (e) {
      toast.error('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bank_connections')
        .update({ is_active: false, access_token: null, refresh_token: null })
        .eq('id', connection.id);
      if (error) throw error;
      setConnection(prev => ({ ...prev, is_active: false }));
      toast.success('Revolut disconnected');
    } catch (e) {
      toast.error('Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/revolut-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ company_id: companyId }),
      });

      const result = await resp.json();
      if (result.success) {
        const r = result.results?.[0];
        if (r?.status === 'success') {
          toast.success(`Synced: ${r.transactions_imported} new, ${r.transactions_skipped} skipped`);
        } else if (r?.status === 'error') {
          toast.error(`Sync failed: ${r.error}`);
        }
      } else {
        toast.error(result.error || 'Sync failed');
      }
      await loadConnection();
    } catch (e) {
      toast.error('Sync request failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSyncFrequency = async (freq) => {
    if (!connection) return;
    const { error } = await supabase
      .from('bank_connections')
      .update({ sync_frequency: freq })
      .eq('id', connection.id);
    if (!error) {
      setConnection(prev => ({ ...prev, sync_frequency: freq }));
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
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
            <Building2 className="w-5 h-5 text-blue-400" />
            Revolut Business Sync
          </CardTitle>
          {connection?.is_active && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection || !connection.is_active ? (
          <>
            <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
              Connect your Revolut Business account to auto-sync transactions for bank reconciliation.
            </p>

            {/* Setup form */}
            <div className="space-y-3">
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Client ID</Label>
                <p className={`text-xs mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                  From Revolut Business &rarr; Settings &rarr; API
                </p>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter your Revolut Client ID"
                  className="text-sm"
                />
              </div>

              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Link to Bank Account</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency || 'EUR'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleConnect}
                disabled={saving || !clientId.trim() || !selectedBankAccount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Connect Revolut
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Connection details */}
            <div className={`p-3 rounded-lg space-y-2 ${ft('bg-gray-50', 'bg-zinc-800/50')}`}>
              <div className="flex items-center justify-between text-sm">
                <span className={ft('text-slate-500', 'text-zinc-400')}>Bank Account</span>
                <span className={ft('text-slate-700', 'text-zinc-300')}>
                  {connection.bank_accounts?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={ft('text-slate-500', 'text-zinc-400')}>Last Sync</span>
                <span className={ft('text-slate-700', 'text-zinc-300')}>
                  {formatDate(connection.last_sync_at)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={ft('text-slate-500', 'text-zinc-400')}>Status</span>
                {connection.last_sync_status === 'success' ? (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                  </Badge>
                ) : connection.last_sync_status === 'error' ? (
                  <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Error
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">No sync yet</Badge>
                )}
              </div>
              {connection.last_sync_error && (
                <p className="text-xs text-red-400 mt-1">{connection.last_sync_error}</p>
              )}
            </div>

            {/* Sync frequency */}
            <div className="flex items-center justify-between">
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Auto-sync frequency</Label>
                <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                  Automatically fetch new transactions
                </p>
              </div>
              <Select value={connection.sync_frequency || 'daily'} onValueChange={handleToggleSyncFrequency}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {syncing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Sync Now</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={saving}
                className="text-red-400 hover:text-red-300 border-red-500/30"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
