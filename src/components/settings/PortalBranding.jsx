import React, { useState, useEffect } from 'react';
import {
  Palette,
  Image,
  Type,
  Globe,
  Save,
  Loader2,
  Upload,
  X,
  Eye,
  ExternalLink,
  Users,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import PortalClientManager from './PortalClientManager';

export default function PortalBranding() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    portal_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#06b6d4',
    accent_color: '#10b981',
    background_color: '#09090b',
    welcome_message: '',
    login_background_url: '',
    footer_text: '',
    custom_domain: '',
    enable_comments: true,
    enable_approvals: true,
    enable_notifications: true,
    enable_file_sharing: true,
    require_approval_for_downloads: false,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [user?.organization_id]);

  const fetchSettings = async () => {
    if (!user?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching portal settings:', error);
      }

      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.organization_id) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('portal_settings')
        .select('id')
        .eq('organization_id', user.organization_id)
        .single();

      const settingsData = {
        ...settings,
        organization_id: user.organization_id,
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('portal_settings')
          .update(settingsData)
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase
          .from('portal_settings')
          .insert(settingsData));
      }

      if (error) throw error;

      toast.success('Portal settings saved!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `portal-logo-${user.organization_id}.${fileExt}`;
      const filePath = `${user.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(filePath);

      setSettings((prev) => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploaded!');
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Client Portal Branding</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Customize how your client portal looks to external clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/portal/login?org=${user?.organization?.slug || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview Portal
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Logo & Basic Info */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Image className="w-5 h-5 text-cyan-400" />
          Logo & Identity
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Portal Logo
            </label>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <div className="relative group">
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="h-16 w-auto rounded-lg bg-zinc-800"
                  />
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, logo_url: '' }))}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-32 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Image className="w-6 h-6 text-zinc-600" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <span className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                  {uploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Logo
                </span>
              </label>
            </div>
          </div>

          {/* Portal Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Portal Name
            </label>
            <input
              type="text"
              value={settings.portal_name}
              onChange={(e) => setSettings((prev) => ({ ...prev, portal_name: e.target.value }))}
              placeholder="Client Portal"
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Welcome Message */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Welcome Message
            </label>
            <textarea
              value={settings.welcome_message}
              onChange={(e) => setSettings((prev) => ({ ...prev, welcome_message: e.target.value }))}
              placeholder="Welcome to your project portal"
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />
          </div>

          {/* Footer Text */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Footer Text
            </label>
            <input
              type="text"
              value={settings.footer_text}
              onChange={(e) => setSettings((prev) => ({ ...prev, footer_text: e.target.value }))}
              placeholder="Powered by YourCompany"
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-400" />
          Colors
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, primary_color: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white uppercase font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.accent_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, accent_color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={settings.accent_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, accent_color: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white uppercase font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.background_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, background_color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={settings.background_color}
                onChange={(e) => setSettings((prev) => ({ ...prev, background_color: e.target.value }))}
                className="flex-1 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white uppercase font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: settings.background_color }}>
          <p className="text-sm text-zinc-400 mb-3">Preview:</p>
          <div className="flex items-center gap-4">
            <button
              className="px-4 py-2 rounded-lg font-medium text-white"
              style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})` }}
            >
              Primary Button
            </button>
            <span style={{ color: settings.primary_color }} className="font-medium">
              Primary Text
            </span>
            <span style={{ color: settings.accent_color }} className="font-medium">
              Accent Text
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Portal Features
        </h3>

        <div className="space-y-4">
          <ToggleSetting
            label="Enable Comments"
            description="Allow clients to comment on projects, tasks, and files"
            checked={settings.enable_comments}
            onChange={(checked) => setSettings((prev) => ({ ...prev, enable_comments: checked }))}
          />
          <ToggleSetting
            label="Enable Approvals"
            description="Allow clients to approve or request revisions on deliverables"
            checked={settings.enable_approvals}
            onChange={(checked) => setSettings((prev) => ({ ...prev, enable_approvals: checked }))}
          />
          <ToggleSetting
            label="Enable Notifications"
            description="Send email notifications to clients for updates"
            checked={settings.enable_notifications}
            onChange={(checked) => setSettings((prev) => ({ ...prev, enable_notifications: checked }))}
          />
          <ToggleSetting
            label="Enable File Sharing"
            description="Allow clients to download project files"
            checked={settings.enable_file_sharing}
            onChange={(checked) => setSettings((prev) => ({ ...prev, enable_file_sharing: checked }))}
          />
          <ToggleSetting
            label="Require Approval for Downloads"
            description="Clients must request approval before downloading files"
            checked={settings.require_approval_for_downloads}
            onChange={(checked) => setSettings((prev) => ({ ...prev, require_approval_for_downloads: checked }))}
          />
        </div>
      </section>

      {/* Portal Clients */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <PortalClientManager />
      </section>
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl">
      <div>
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-cyan-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
