
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { UserInvitation } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Mail,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserPlus,
  Send
} from "lucide-react";
import { inviteUser } from "@/api/functions";
import { syncDomainUsers } from "@/api/functions";
import { migrateCandidatesToOrganization } from "@/api/functions";
import IconWrapper from "../ui/IconWrapper";

export default function UserManagement({ organization, onUpdate }) {
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [inviting, setInviting] = useState(false);
  const [lastInvitationUrl, setLastInvitationUrl] = useState(null); // New state
  const [showInviteSuccess, setShowInviteSuccess] = useState(false); // New state

  useEffect(() => {
    const loadAndSyncUsers = async () => {
      try {
        if (organization.email_domain) {
          try {
            await syncDomainUsers({ organizationId: organization.id });
          } catch (error) {
            console.log("Auto-sync failed, continuing with manual load:", error);
          }
        }

        const allUsers = await User.list();
        let orgUsers;
        if (organization.email_domain) {
          orgUsers = allUsers.filter(u => 
            u.organization_id === organization.id || 
            (u.email && u.email.endsWith(`@${organization.email_domain}`))
          );
        } else {
          orgUsers = allUsers.filter(u => u.organization_id === organization.id);
        }
        setUsers(orgUsers);

        const allInvitations = await UserInvitation.filter({ organization_id: organization.id });
        setInvitations(allInvitations);
      } catch (error) {
        console.error("Error loading users or invitations:", error);
      }
      setIsLoading(false);
    };

    loadAndSyncUsers();
  }, [organization]);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;

    setInviting(true);
    setShowInviteSuccess(false); // Reset success message visibility
    setLastInvitationUrl(null); // Reset last invitation URL
    
    try {
      const response = await inviteUser({
        email: inviteEmail,
        role: inviteRole,
      });
      
      if (response.data.success) {
        setInviteEmail("");
        setInviteRole("recruiter");
        setLastInvitationUrl(response.data.invitation_url); // Store the URL
        setShowInviteSuccess(true); // Show the success message UI
        
        const allInvitations = await UserInvitation.filter({ organization_id: organization.id });
        setInvitations(allInvitations);
        // alert("Invitation sent successfully!"); // Removed alert
      } else {
        alert(response.data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert("Failed to send invitation");
    }
    setInviting(false);
  };

  const copyInvitationUrl = () => { // New function to copy URL
    if (lastInvitationUrl) {
      navigator.clipboard.writeText(lastInvitationUrl);
      alert('Invitation URL copied to clipboard!'); // Alert for copy confirmation
    }
  };

  const handleSyncDomainUsers = async () => {
    setIsSyncing(true);
    try {
      const response = await syncDomainUsers({ organizationId: organization.id });
      if (response.data.success) {
        alert(`Successfully assigned ${response.data.assigned_count} users to the organization`);
        const allUsers = await User.list();
        let orgUsers;
        if (organization.email_domain) {
          orgUsers = allUsers.filter(u => 
            u.organization_id === organization.id || 
            (u.email && u.email.endsWith(`@${organization.email_domain}`))
          );
        } else {
          orgUsers = allUsers.filter(u => u.organization_id === organization.id);
        }
        setUsers(orgUsers);
      } else {
        alert('Failed to sync users');
      }
    } catch (error) {
      console.error("Error syncing domain users:", error);
      alert('Error syncing users');
    }
    setIsSyncing(false);
  };

  const handleMigrateCandidates = async () => {
    if (!confirm('This will assign all unassigned candidates to your organization. Continue?')) {
      return;
    }
    
    setIsMigrating(true);
    try {
      const response = await migrateCandidatesToOrganization({ organizationId: organization.id });
      if (response.data.success) {
        alert(`Successfully migrated ${response.data.migrated_count} candidates to the organization`);
        if (onUpdate) onUpdate();
      } else {
        alert('Failed to migrate candidates');
      }
    } catch (error) {
      console.error("Error migrating candidates:", error);
      alert('Error migrating candidates');
    }
    setIsMigrating(false);
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: "bg-red-100 text-red-800 border-red-200",
      admin: "bg-blue-100 text-blue-800 border-blue-200", 
      recruiter: "bg-green-100 text-green-800 border-green-200",
      viewer: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[role] || colors.viewer;
  };

  const getRoleDisplayName = (role) => {
    const names = {
      super_admin: "Super Admin",
      admin: "Admin",
      recruiter: "Recruiter", 
      viewer: "Viewer"
    };
    return names[role] || role;
  };

  const getInvitationStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconWrapper icon={RefreshCw} size={24} variant="accent" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{color: 'var(--txt)'}}>Team Members</h3>
          <p className="text-sm" style={{color: 'var(--muted)'}}>
            {organization.email_domain ? 
              `Auto-grouped by domain: @${organization.email_domain}` :
              'Manage your team and send invitations'
            }
          </p>
        </div>
        <div className="flex gap-3">
          {organization.email_domain && (
            <Button 
              onClick={handleSyncDomainUsers} 
              disabled={isSyncing}
              className="btn-outline"
            >
              {isSyncing ? (
                <>
                  <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <IconWrapper icon={RefreshCw} size={16} variant="muted" className="mr-2" />
                  Sync Domain Users
                </>
              )}
            </Button>
          )}
          <Button 
            onClick={handleMigrateCandidates} 
            disabled={isMigrating}
            className="btn-outline"
          >
            {isMigrating ? (
              <>
                <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <IconWrapper icon={Users} size={16} variant="muted" className="mr-2" />
                Migrate Candidates
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Invite User Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={UserPlus} size={20} variant="accent" />
            Invite User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3"> {/* Added wrapper div here */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Email Address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-transparent border"
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-transparent border w-full sm:w-[150px]" style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                  <SelectItem value="recruiter" style={{ color: 'var(--txt)' }}>Recruiter</SelectItem>
                  <SelectItem value="admin" style={{ color: 'var(--txt)' }}>Administrator</SelectItem>
                  <SelectItem value="viewer" style={{ color: 'var(--txt)' }}>Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="btn-primary w-full sm:w-auto"
              >
                {inviting ? (
                  <>
                    <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <IconWrapper icon={Send} size={16} variant="accent" className="mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
            
            {/* Success message with invitation URL */}
            {showInviteSuccess && lastInvitationUrl && (
              <div className="p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, .08)', border: '1px solid rgba(16, 185, 129, .2)' }}>
                <div className="flex items-start gap-3">
                  <IconWrapper icon={CheckCircle} size={20} variant="accent" />
                  <div className="flex-1">
                    <p className="font-medium mb-2" style={{ color: 'var(--txt)' }}>
                      Invitation created successfully!
                    </p>
                    <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
                      An email has been sent to <strong>{inviteEmail}</strong>. You can also share this link directly:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={lastInvitationUrl}
                        readOnly
                        className="flex-1 bg-transparent border text-sm"
                        style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                      />
                      <Button
                        onClick={copyInvitationUrl}
                        variant="outline"
                        size="sm"
                        className="btn-outline"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInviteSuccess(false)}
                    className="text-xl hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--muted)' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Members Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
            <IconWrapper icon={Users} size={20} variant="accent" />
            Team Members ({users.length})
            {organization.email_domain && (
              <Badge variant="outline" style={{color: 'var(--accent)', borderColor: 'rgba(239,68,68,.35)'}}>
                @{organization.email_domain}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg" style={{background: 'rgba(255,255,255,.04)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                    {user.profile_picture ? (
                      <img 
                        src={user.profile_picture} 
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium" style={{color: 'var(--txt)'}}>
                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium" style={{color: 'var(--txt)'}}>
                      {user.full_name || user.email}
                    </p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      {user.email}
                    </p>
                    {user.job_title && (
                      <p className="text-xs" style={{color: 'var(--muted)'}}>
                        {user.job_title}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(user.organization_role || 'recruiter')}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleDisplayName(user.organization_role || 'recruiter')}
                  </Badge>
                  {user.is_active_recruiter && (
                    <Badge variant="outline" style={{color: 'var(--accent)', borderColor: 'rgba(239,68,68,.35)'}}>
                      Active
                    </Badge>
                  )}
                  {!user.organization_id && organization.email_domain && user.email?.endsWith(`@${organization.email_domain}`) && (
                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                      Pending Assignment
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{color: 'var(--txt)'}}>
              <IconWrapper icon={Mail} size={20} variant="accent" />
              Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 rounded-lg" style={{background: 'rgba(255,255,255,.04)'}}>
                  <div>
                    <p className="font-medium" style={{color: 'var(--txt)'}}>
                      {invitation.email}
                    </p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      Invited as {getRoleDisplayName(invitation.role)} • 
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getInvitationStatusColor(invitation.status)}>
                      {invitation.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {invitation.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {invitation.status === 'expired' && <XCircle className="w-3 h-3 mr-1" />}
                      {invitation.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
