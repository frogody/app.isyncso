/**
 * Team Management Tool Functions for SYNC
 *
 * Actions:
 * - create_team
 * - list_teams
 * - add_team_member
 * - remove_team_member
 * - list_team_members
 * - invite_user
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Team Types
// ============================================================================

interface TeamData {
  name: string;
  description?: string;
}

interface TeamMemberData {
  team_id?: string;
  team_name?: string;
  user_id?: string;
  user_email?: string;
  role?: string;
}

interface InvitationData {
  email: string;
  role?: string;
}

// ============================================================================
// Create Team
// ============================================================================

export async function createTeam(
  ctx: ActionContext,
  data: TeamData
): Promise<ActionResult> {
  try {
    const teamRecord = {
      organization_id: null,
      name: data.name,
      description: data.description || null,
      settings: {},
    };

    const { data: team, error } = await ctx.supabase
      .from('teams')
      .insert(teamRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create team: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Team created!\n\n**${team.name}**\n- Description: ${team.description || 'No description'}`,
      team,
      '/settings/teams'
    );
  } catch (err) {
    return errorResult(`Exception creating team: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Teams
// ============================================================================

export async function listTeams(
  ctx: ActionContext,
  data: { limit?: number } = {}
): Promise<ActionResult> {
  try {
    const { data: teams, error } = await ctx.supabase
      .from('teams')
      .select('id, name, description, created_date')
      .order('name', { ascending: true })
      .limit(data.limit || 20);

    if (error) {
      return errorResult(`Failed to list teams: ${error.message}`, error.message);
    }

    if (!teams || teams.length === 0) {
      return successResult('No teams found.', []);
    }

    const list = formatList(teams, (t) => {
      return `- **${t.name}** | ${t.description || 'No description'}`;
    });

    return successResult(
      `Found ${teams.length} team(s):\n\n${list}`,
      teams,
      '/settings/teams'
    );
  } catch (err) {
    return errorResult(`Exception listing teams: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Add Team Member
// ============================================================================

export async function addTeamMember(
  ctx: ActionContext,
  data: TeamMemberData
): Promise<ActionResult> {
  try {
    let teamId = data.team_id;
    let teamName: string | undefined;
    let userId = data.user_id;
    let userEmail: string | undefined;

    // Find team by name if ID not provided
    if (!teamId && data.team_name) {
      const { data: teams } = await ctx.supabase
        .from('teams')
        .select('id, name')
        .ilike('name', `%${data.team_name}%`)
        .limit(1);

      if (teams && teams.length > 0) {
        teamId = teams[0].id;
        teamName = teams[0].name;
      }
    }

    if (!teamId) {
      return errorResult('Team not found. Please provide a valid team ID or name.', 'Not found');
    }

    // Find user by email if ID not provided
    if (!userId && data.user_email) {
      const { data: users } = await ctx.supabase
        .from('users')
        .select('id, email, full_name')
        .ilike('email', `%${data.user_email}%`)
        .limit(1);

      if (users && users.length > 0) {
        userId = users[0].id;
        userEmail = users[0].email;
      }
    }

    if (!userId) {
      return errorResult('User not found. Please provide a valid user ID or email.', 'Not found');
    }

    // Check if already a member
    const { data: existing } = await ctx.supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return errorResult('User is already a member of this team.', 'Already exists');
    }

    // Add member
    const memberRecord = {
      team_id: teamId,
      user_id: userId,
      role: data.role || 'member',
    };

    const { data: member, error } = await ctx.supabase
      .from('team_members')
      .insert(memberRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to add team member: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Team member added!\n\n**${userEmail || userId}** added to **${teamName || teamId}**\n- Role: ${member.role}`,
      member,
      '/settings/teams'
    );
  } catch (err) {
    return errorResult(`Exception adding team member: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Remove Team Member
// ============================================================================

export async function removeTeamMember(
  ctx: ActionContext,
  data: TeamMemberData
): Promise<ActionResult> {
  try {
    let teamId = data.team_id;
    let teamName: string | undefined;
    let userId = data.user_id;
    let userEmail: string | undefined;

    // Find team by name if ID not provided
    if (!teamId && data.team_name) {
      const { data: teams } = await ctx.supabase
        .from('teams')
        .select('id, name')
        .ilike('name', `%${data.team_name}%`)
        .limit(1);

      if (teams && teams.length > 0) {
        teamId = teams[0].id;
        teamName = teams[0].name;
      }
    }

    if (!teamId) {
      return errorResult('Team not found.', 'Not found');
    }

    // Find user by email if ID not provided
    if (!userId && data.user_email) {
      const { data: users } = await ctx.supabase
        .from('users')
        .select('id, email')
        .ilike('email', `%${data.user_email}%`)
        .limit(1);

      if (users && users.length > 0) {
        userId = users[0].id;
        userEmail = users[0].email;
      }
    }

    if (!userId) {
      return errorResult('User not found.', 'Not found');
    }

    // Remove member
    const { error } = await ctx.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      return errorResult(`Failed to remove team member: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Team member removed!\n\n**${userEmail || userId}** removed from **${teamName || teamId}**`,
      { teamId, userId, removed: true },
      '/settings/teams'
    );
  } catch (err) {
    return errorResult(`Exception removing team member: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List Team Members
// ============================================================================

export async function listTeamMembers(
  ctx: ActionContext,
  data: { team_id?: string; team_name?: string; limit?: number }
): Promise<ActionResult> {
  try {
    let teamId = data.team_id;
    let teamName: string | undefined;

    // Find team by name if ID not provided
    if (!teamId && data.team_name) {
      const { data: teams } = await ctx.supabase
        .from('teams')
        .select('id, name')
        .ilike('name', `%${data.team_name}%`)
        .limit(1);

      if (teams && teams.length > 0) {
        teamId = teams[0].id;
        teamName = teams[0].name;
      }
    }

    if (!teamId) {
      return errorResult('Team not found. Please provide a valid team ID or name.', 'Not found');
    }

    // Get team members with user details
    const { data: members, error } = await ctx.supabase
      .from('team_members')
      .select(`
        id,
        role,
        user_id,
        created_date
      `)
      .eq('team_id', teamId)
      .limit(data.limit || 50);

    if (error) {
      return errorResult(`Failed to list team members: ${error.message}`, error.message);
    }

    if (!members || members.length === 0) {
      return successResult(`No members found in team "${teamName || teamId}".`, []);
    }

    // Get user details for each member
    const userIds = members.map(m => m.user_id).filter(Boolean);
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await ctx.supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (users) {
        usersMap = Object.fromEntries(users.map(u => [u.id, u]));
      }
    }

    const enrichedMembers = members.map(m => ({
      ...m,
      user: usersMap[m.user_id] || { full_name: 'Unknown', email: 'Unknown' },
    }));

    const list = formatList(enrichedMembers, (m) => {
      return `- **${m.user.full_name}** (${m.user.email}) | ${m.role}`;
    });

    return successResult(
      `Team "${teamName || teamId}" has ${members.length} member(s):\n\n${list}`,
      enrichedMembers,
      '/settings/teams'
    );
  } catch (err) {
    return errorResult(`Exception listing team members: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Invite User
// ============================================================================

export async function inviteUser(
  ctx: ActionContext,
  data: InvitationData
): Promise<ActionResult> {
  try {
    // Check if user already exists
    const { data: existingUser } = await ctx.supabase
      .from('users')
      .select('id, email')
      .eq('email', data.email)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return errorResult(`User with email "${data.email}" already exists.`, 'Already exists');
    }

    // Check if invitation already pending
    const { data: existingInvite } = await ctx.supabase
      .from('user_invitations')
      .select('id, status')
      .eq('email', data.email)
      .eq('status', 'pending')
      .limit(1);

    if (existingInvite && existingInvite.length > 0) {
      return errorResult(`An invitation is already pending for "${data.email}".`, 'Already pending');
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitationRecord = {
      organization_id: null,
      email: data.email,
      role: data.role || 'member',
      status: 'pending',
      invited_by: ctx.userId || null,
      token: token,
      expires_at: expiresAt.toISOString(),
    };

    const { data: invitation, error } = await ctx.supabase
      .from('user_invitations')
      .insert(invitationRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to create invitation: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Invitation sent!\n\n**${data.email}**\n- Role: ${invitation.role}\n- Expires: ${formatDate(invitation.expires_at)}`,
      invitation,
      '/settings/team'
    );
  } catch (err) {
    return errorResult(`Exception inviting user: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Team Action Router
// ============================================================================

export async function executeTeamAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'create_team':
      return createTeam(ctx, data);
    case 'list_teams':
      return listTeams(ctx, data);
    case 'add_team_member':
      return addTeamMember(ctx, data);
    case 'remove_team_member':
      return removeTeamMember(ctx, data);
    case 'list_team_members':
      return listTeamMembers(ctx, data);
    case 'invite_user':
      return inviteUser(ctx, data);
    default:
      return errorResult(`Unknown team action: ${action}`, 'Unknown action');
  }
}
