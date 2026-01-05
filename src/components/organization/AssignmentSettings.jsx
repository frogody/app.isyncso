
import React, { useState, useEffect, useCallback } from "react";
import { Organization } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Users, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import IconWrapper from "../ui/IconWrapper";
import { useTranslation } from "@/components/utils/translations";

export default function AssignmentSettings({ organization, onUpdate }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    round_robin_enabled: organization?.settings?.round_robin_enabled ?? true,
    assignment_method: organization?.settings?.assignment_method || "round_robin",
    active_recruiters: organization?.settings?.active_recruiters || [],
    email_notifications: organization?.settings?.email_notifications || {
      new_candidate: true,
      assignment_updates: true,
      weekly_reports: false
    }
  });
  const [orgUsers, setOrgUsers] = useState([]);
  const [isSaving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { t: _t } = useTranslation(user?.language || 'nl');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      const allUsers = await User.list();
      const filteredUsers = allUsers.filter(u => 
        u.organization_id === organization.id && 
        (u.organization_role === 'recruiter' || u.organization_role === 'admin' || u.organization_role === 'super_admin')
      );
      setOrgUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingChange = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const toggleRecruiter = (userId) => {
    setSettings(prev => {
      const current = prev.active_recruiters || [];
      const isActive = current.includes(userId);
      
      return {
        ...prev,
        active_recruiters: isActive 
          ? current.filter(id => id !== userId)
          : [...current, userId]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedOrg = {
        ...organization,
        settings: {
          ...organization.settings,
          ...settings
        }
      };
      
      await Organization.update(organization.id, updatedOrg);
      
      if (onUpdate) {
        await onUpdate();
      }
      
      alert("Assignment settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconWrapper icon={Settings} size={24} variant="accent" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Method */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={Settings} size={20} variant="accent" />
            Assignment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label style={{color: 'var(--txt)'}}>Enable Round Robin</Label>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                Automatically assign candidates to recruiters in rotation
              </p>
            </div>
            <Switch
              checked={settings.round_robin_enabled}
              onCheckedChange={(checked) => handleSettingChange('round_robin_enabled', checked)}
            />
          </div>

          <div>
            <Label style={{color: 'var(--txt)'}}>Assignment Strategy</Label>
            <Select 
              value={settings.assignment_method} 
              onValueChange={(value) => handleSettingChange('assignment_method', value)}
              disabled={!settings.round_robin_enabled}
            >
              <SelectTrigger className="bg-transparent border mt-2" style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                <SelectItem value="round_robin" style={{ color: 'var(--txt)' }}>Round Robin</SelectItem>
                <SelectItem value="load_balanced" style={{ color: 'var(--txt)' }}>Load Balanced</SelectItem>
                <SelectItem value="manual" style={{ color: 'var(--txt)' }}>Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Recruiters */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={Users} size={20} variant="accent" />
            Active Recruiters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm" style={{color: 'var(--muted)'}}>
            Select which recruiters should be included in automatic candidate assignments
          </p>

          {orgUsers.length === 0 ? (
            <div className="p-4 rounded-lg text-center" style={{background: 'rgba(255,255,255,.04)'}}>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                No recruiters found. Invite team members to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orgUsers.map((orgUser) => (
                <div 
                  key={orgUser.id} 
                  className="flex items-center justify-between p-3 rounded-lg" 
                  style={{background: 'rgba(255,255,255,.04)'}}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                      {orgUser.profile_picture ? (
                        <img 
                          src={orgUser.profile_picture} 
                          alt={orgUser.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                          {orgUser.full_name?.charAt(0) || orgUser.email?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium" style={{color: 'var(--txt)'}}>
                        {orgUser.full_name || orgUser.email}
                      </p>
                      <p className="text-sm" style={{color: 'var(--muted)'}}>
                        {orgUser.email}
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.active_recruiters.includes(orgUser.id)}
                    onCheckedChange={() => toggleRecruiter(orgUser.id)}
                    disabled={!settings.round_robin_enabled}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ color: 'var(--txt)' }}>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label style={{color: 'var(--txt)'}}>New Candidate Alerts</Label>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                Notify team when new candidates are added
              </p>
            </div>
            <Switch
              checked={settings.email_notifications.new_candidate}
              onCheckedChange={(checked) => handleSettingChange('email_notifications.new_candidate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label style={{color: 'var(--txt)'}}>Assignment Updates</Label>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                Notify recruiters when candidates are assigned to them
              </p>
            </div>
            <Switch
              checked={settings.email_notifications.assignment_updates}
              onCheckedChange={(checked) => handleSettingChange('email_notifications.assignment_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label style={{color: 'var(--txt)'}}>Weekly Reports</Label>
              <p className="text-sm" style={{color: 'var(--muted)'}}>
                Send weekly summary reports to team
              </p>
            </div>
            <Switch
              checked={settings.email_notifications.weekly_reports}
              onCheckedChange={(checked) => handleSettingChange('email_notifications.weekly_reports', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
        >
          {isSaving ? (
            <>
              <IconWrapper icon={Save} size={16} variant="accent" className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <IconWrapper icon={Save} size={16} variant="accent" className="mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
