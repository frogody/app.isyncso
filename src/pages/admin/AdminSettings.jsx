/**
 * AdminSettings Page
 * Platform-wide settings management for super_admin
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Globe,
  Bell,
  Mail,
  Lock,
  Database,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SETTING_CATEGORIES = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'integrations', label: 'Integrations', icon: Database },
];

function SettingField({ setting, value, onChange, disabled }) {
  const renderInput = () => {
    switch (setting.value_type) {
      case 'boolean':
        return (
          <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={disabled}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-zinc-800 border-zinc-700 text-white max-w-[200px]"
          />
        );
      case 'json':
        return (
          <Input
            type="text"
            value={typeof value === 'object' ? JSON.stringify(value) : value || ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            disabled={disabled}
            className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
          />
        );
      default:
        return (
          <Input
            type={setting.is_sensitive ? 'password' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        );
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800 last:border-0">
      <div className="flex-1">
        <Label className="text-white font-medium">{setting.key.replace(/_/g, ' ')}</Label>
        {setting.description && (
          <p className="text-sm text-zinc-500 mt-0.5">{setting.description}</p>
        )}
        {setting.is_sensitive && (
          <Badge className="mt-1 text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">
            Sensitive
          </Badge>
        )}
      </div>
      <div className="ml-4">{renderInput()}</div>
    </div>
  );
}

function SettingsCategory({ category, settings, values, onValueChange, isSaving }) {
  const categorySettings = settings.filter((s) => s.category === category.id);

  if (categorySettings.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No settings in this category yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categorySettings.map((setting) => (
        <SettingField
          key={setting.id}
          setting={setting}
          value={values[setting.key]}
          onChange={(newValue) => onValueChange(setting.key, newValue)}
          disabled={isSaving}
        />
      ))}
    </div>
  );
}

export default function AdminSettings() {
  const { adminRole } = useAdmin();
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');

  const isSuperAdmin = adminRole === 'super_admin';
  const hasChanges = JSON.stringify(values) !== JSON.stringify(originalValues);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;

      setSettings(data || []);

      // Build values object
      const valuesObj = {};
      (data || []).forEach((setting) => {
        valuesObj[setting.key] = setting.value;
      });
      setValues(valuesObj);
      setOriginalValues(valuesObj);
    } catch (error) {
      console.error('[AdminSettings] Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (key, newValue) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can modify settings');
      return;
    }

    setIsSaving(true);
    try {
      // Find changed settings
      const changedKeys = Object.keys(values).filter(
        (key) => JSON.stringify(values[key]) !== JSON.stringify(originalValues[key])
      );

      // Update each changed setting
      for (const key of changedKeys) {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            value: values[key],
            updated_at: new Date().toISOString(),
          })
          .eq('key', key);

        if (error) throw error;
      }

      // Log the changes
      await supabase.from('admin_audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'settings_updated',
        resource_type: 'platform_settings',
        details: { changed_keys: changedKeys },
      });

      setOriginalValues({ ...values });
      toast.success(`${changedKeys.length} setting(s) updated successfully`);
    } catch (error) {
      console.error('[AdminSettings] Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setValues({ ...originalValues });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-red-400" />
              Platform Settings
            </h1>
            <p className="text-zinc-400 mt-1">
              Configure global platform settings and defaults.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-zinc-700 text-zinc-300"
              >
                Reset
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || !isSuperAdmin}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <p className="text-sm text-orange-400">
              You have read-only access. Only super admins can modify platform settings.
            </p>
          </div>
        )}
      </div>

      {/* Settings Content */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <div className="border-b border-zinc-800">
            <TabsList className="bg-transparent p-0 h-auto">
              {SETTING_CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className={cn(
                    'px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-red-500',
                    'data-[state=active]:bg-transparent data-[state=active]:text-white',
                    'text-zinc-400 hover:text-white transition-colors'
                  )}
                >
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="p-6">
            {SETTING_CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="m-0">
                <SettingsCategory
                  category={category}
                  settings={settings}
                  values={values}
                  onValueChange={handleValueChange}
                  isSaving={isSaving}
                />
              </TabsContent>
            ))}
          </CardContent>
        </Tabs>
      </Card>

      {/* Unsaved Changes Indicator */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-2xl"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-white">You have unsaved changes</span>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={!isSuperAdmin || isSaving}
              className="bg-red-500 hover:bg-red-600 text-white ml-2"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
