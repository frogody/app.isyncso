/**
 * Base44 Client - Backwards Compatibility Layer
 *
 * This module re-exports everything from supabaseClient to maintain
 * backwards compatibility with existing imports that reference base44Client.
 *
 * The actual implementation now uses Supabase instead of the Base44 SDK.
 */

// Re-export everything from supabaseClient for backwards compatibility
export * from './supabaseClient';
export { base44, base44 as default } from './supabaseClient';
