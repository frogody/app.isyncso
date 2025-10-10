
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  Settings,
  UserCheck,
  Shield,
} from "lucide-react";
import UserManagement from "../components/organization/UserManagement";
import OrganizationProfile from "../components/organization/OrganizationProfile";
import AssignmentSettings from "../components/organization/AssignmentSettings";
import OrganizationAppSettings from "../components/organization/OrganizationAppSettings";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";

export default function OrganizationSettingsPage() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let userData;
      try {
        userData = await User.me();
        setUser(userData);
      } catch (userError) {
        console.error('Error loading user:', userError);
        setLoading(false);
        return; // Stop execution if user data cannot be loaded
      }

      if (userData.organization_role !== 'super_admin' && userData.organization_role !== 'admin') {
        setLoading(false);
        return;
      }

      if (!userData.organization_id) {
        console.error("User has no organization_id");
        setLoading(false);
        return;
      }

      // Load organization
      try {
        const orgs = await Organization.list();
        const userOrg = orgs.find(org => org.id === userData.organization_id);

        if (userOrg) {
          setOrganization(userOrg);
        } else {
          // Create default organization
          const newOrg = await Organization.create({
            name: userData.company || "Default Organization",
            settings: {
              round_robin_enabled: true,
              assignment_method: "round_robin",
              active_recruiters: [],
              last_assigned_index: 0,
              email_notifications: {
                new_candidate: true,
                assignment_updates: true,
                weekly_reports: false
              },
              branding: {
                primary_color: "#27E0A1",
                secondary_color: "#11C7A9"
              }
            },
            subscription: {
              plan: "free",
              users_included: 2,
              candidates_limit: 100,
              current_users: 1,
              current_candidates: 0
            }
          });

          await User.updateMyUserData({ organization_id: newOrg.id });
          setOrganization(newOrg);
        }
      } catch (orgError) {
        console.error("Error with organization:", orgError);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const loadOrganization = async () => {
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.organization_role !== 'super_admin' && user.organization_role !== 'admin')) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center" style={{background: 'var(--bg)'}}>
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
        `}</style>
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-semibold mb-2" style={{color: 'var(--txt)'}}>Access Denied</h2>
            <p style={{color: 'var(--muted)'}}>Only organization administrators can access these settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
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
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <IconWrapper icon={Building2} size={36} variant="muted" glow={true} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
              Organization Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {organization?.name}
            </p>
          </div>
        </div>

        {organization && (
          <div className="glass-card">
            <div className="flex gap-1 p-2">
              <Button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
              >
                <IconWrapper icon={Building2} size={18} variant={activeTab === 'profile' ? 'accent' : 'default'} glow={true} className="mr-2" />
                Organization Profile
              </Button>
              <Button
                onClick={() => setActiveTab('users')}
                className={`flex-1 ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
              >
                <IconWrapper icon={Users} size={18} variant={activeTab === 'users' ? 'accent' : 'default'} glow={true} className="mr-2" />
                User Management
              </Button>
              <Button
                onClick={() => setActiveTab('assignment')}
                className={`flex-1 ${activeTab === 'assignment' ? 'btn-primary' : 'btn-outline'}`}
              >
                <IconWrapper icon={UserCheck} size={18} variant={activeTab === 'assignment' ? 'accent' : 'default'} glow={true} className="mr-2" />
                Assignment Settings
              </Button>
              <Button
                onClick={() => setActiveTab('app')}
                className={`flex-1 ${activeTab === 'app' ? 'btn-primary' : 'btn-outline'}`}
              >
                <IconWrapper icon={Settings} size={18} variant={activeTab === 'app' ? 'accent' : 'default'} glow={true} className="mr-2" />
                App Settings
              </Button>
            </div>
          </div>
        )}

        {organization && activeTab === 'profile' && (
          <OrganizationProfile
            organization={organization}
            onUpdate={loadOrganization}
          />
        )}

        {organization && activeTab === 'users' && (
          <UserManagement
            organization={organization}
            onUpdate={loadOrganization}
          />
        )}

        {organization && activeTab === 'assignment' && (
          <AssignmentSettings
            organization={organization}
            onUpdate={loadOrganization}
          />
        )}

        {organization && activeTab === 'app' && (
          <OrganizationAppSettings
            organization={organization}
            onUpdate={loadOrganization}
          />
        )}
      </div>
    </div>
  );
}
