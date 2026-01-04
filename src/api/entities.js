/**
 * Entity Exports
 *
 * This module provides a unified interface for all entities.
 * Uses feature flag to switch between Base44 and Supabase backends.
 */

// Feature flag from environment
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

// Import both backends (tree-shaking will eliminate unused code in production)
import { base44 } from './base44Client';
import { entities as supabaseEntities, auth as supabaseAuth } from './supabaseClient';

// Select backend based on feature flag
const backend = USE_SUPABASE ? supabaseEntities : base44.entities;
const authBackend = USE_SUPABASE ? supabaseAuth : base44.auth;

// Entity exports - use Supabase or Base44 based on flag
export const Candidate = USE_SUPABASE ? supabaseEntities.Candidate : base44.entities.Candidate;
export const ChatConversation = USE_SUPABASE ? supabaseEntities.ChatConversation : base44.entities.ChatConversation;
export const Organization = USE_SUPABASE ? supabaseEntities.Organization : base44.entities.Organization;
export const UserInvitation = USE_SUPABASE ? supabaseEntities.UserInvitation : base44.entities.UserInvitation;
export const Team = USE_SUPABASE ? supabaseEntities.Team : base44.entities.Team;
export const ChatProgress = USE_SUPABASE ? supabaseEntities.ChatProgress : base44.entities.ChatProgress;
export const Project = USE_SUPABASE ? supabaseEntities.Project : base44.entities.Project;
export const OutreachMessage = USE_SUPABASE ? supabaseEntities.OutreachMessage : base44.entities.OutreachMessage;
export const Task = USE_SUPABASE ? supabaseEntities.Task : base44.entities.Task;
export const IntelligenceProgress = USE_SUPABASE ? supabaseEntities.IntelligenceProgress : base44.entities.IntelligenceProgress;
export const RegenerationJob = USE_SUPABASE ? supabaseEntities.RegenerationJob : base44.entities.RegenerationJob;
export const OutreachTask = USE_SUPABASE ? supabaseEntities.OutreachTask : base44.entities.OutreachTask;
export const Campaign = USE_SUPABASE ? supabaseEntities.Campaign : base44.entities.Campaign;
export const Role = USE_SUPABASE ? supabaseEntities.Role : base44.entities.Role;
export const Client = USE_SUPABASE ? supabaseEntities.Client : base44.entities.Client;

// Auth SDK export
export const User = USE_SUPABASE ? supabaseAuth : base44.auth;

// Log which backend is being used (for debugging)
if (typeof window !== 'undefined') {
  console.log(`[ISYNCSO] Using ${USE_SUPABASE ? 'Supabase' : 'Base44'} backend`);
}
