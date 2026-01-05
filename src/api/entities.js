/**
 * Entity Exports
 *
 * This module provides a unified interface for all entities using Supabase backend.
 */

import { entities as supabaseEntities, auth as supabaseAuth } from './supabaseClient';

// Entity exports - Supabase only
export const Candidate = supabaseEntities.Candidate;
export const ChatConversation = supabaseEntities.ChatConversation;
export const Organization = supabaseEntities.Organization;
export const UserInvitation = supabaseEntities.UserInvitation;
export const Team = supabaseEntities.Team;
export const ChatProgress = supabaseEntities.ChatProgress;
export const Project = supabaseEntities.Project;
export const OutreachMessage = supabaseEntities.OutreachMessage;
export const Task = supabaseEntities.Task;
export const IntelligenceProgress = supabaseEntities.IntelligenceProgress;
export const RegenerationJob = supabaseEntities.RegenerationJob;
export const OutreachTask = supabaseEntities.OutreachTask;
export const Campaign = supabaseEntities.Campaign;
export const Role = supabaseEntities.Role;
export const Client = supabaseEntities.Client;

// SkillSync entities (shared with Mac app)
export const Activity = supabaseEntities.Activity;
export const UserProfile = supabaseEntities.UserProfile;
export const MicroLesson = supabaseEntities.MicroLesson;
export const SkillCatalog = supabaseEntities.SkillCatalog;
export const UserSkillProgress = supabaseEntities.UserSkillProgress;
export const CourseCatalog = supabaseEntities.CourseCatalog;
export const CourseEnrollment = supabaseEntities.CourseEnrollment;
export const Achievement = supabaseEntities.Achievement;

// Auth SDK export
export const User = supabaseAuth;

// Log backend (for debugging)
if (typeof window !== 'undefined') {
  console.log('[ISYNCSO] Using Supabase backend');
}
