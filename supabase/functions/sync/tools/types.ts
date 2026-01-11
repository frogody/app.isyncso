/**
 * Shared Types for SYNC Tool Functions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Common Types
// ============================================================================

export interface ActionResult {
  success: boolean;
  result?: any;
  error?: string;
  message: string;
  link?: string;
  // Recovery information (populated on failure)
  recovery?: {
    shouldRetry: boolean;
    suggestions: Array<{
      action: string;
      description: string;
      data?: any;
      confidence: number;
    }>;
    userMessage: string;
  };
}

// ============================================================================
// Action Chaining Types
// ============================================================================

export interface ChainedAction {
  action: string;
  data: any;
  dependsOn?: string[];  // IDs of actions this depends on
  id?: string;           // Unique ID for dependency tracking
}

export interface ActionChainResult {
  success: boolean;
  completed: Array<{
    action: string;
    result: ActionResult;
  }>;
  failed?: {
    action: string;
    result: ActionResult;
    index: number;
  };
  partialResults?: any[];
  message: string;
}

export interface ActionContext {
  supabase: SupabaseClient;
  companyId: string;
  userId?: string;
}

// ============================================================================
// Finance Types
// ============================================================================

export interface ProposalData {
  client_name: string;
  client_email?: string;
  client_company?: string;
  title: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price?: number;
    description?: string;
  }>;
  tax_percent?: number;
  notes?: string;
}

export interface InvoiceData {
  client_name: string;
  client_email?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price?: number;
    description?: string;
  }>;
  tax_percent?: number;
  due_days?: number;
}

export interface InvoiceFilters {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  client?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface ExpenseData {
  description: string;
  amount: number;
  category: string;
  vendor?: string;
  date?: string;
  receipt_url?: string;
  notes?: string;
}

export interface ExpenseFilters {
  category?: string;
  vendor?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  limit?: number;
}

// ============================================================================
// Product Types
// ============================================================================

export interface ProductSearchResult {
  id: string;
  name: string;
  type: 'physical' | 'digital';
  price: number;
  currency: string;
  sku?: string;
  description?: string;
  in_stock?: boolean;
  quantity?: number;
}

export interface ProductData {
  name: string;
  type: 'physical' | 'digital';
  tagline?: string;
  description?: string;
  short_description?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

export interface PhysicalProductData extends ProductData {
  type: 'physical';
  sku?: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  quantity?: number;
  low_stock_threshold?: number;
  weight?: number;
  country_of_origin?: string;
}

export interface ProductFilters {
  type?: 'physical' | 'digital';
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  limit?: number;
}

export interface InventoryUpdate {
  product_id: string;
  quantity: number;
  adjustment_type?: 'set' | 'add' | 'subtract';
}

// ============================================================================
// Growth/CRM Types (Phase 2)
// ============================================================================

export interface ProspectData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  source?: string;
  status?: string;
  notes?: string;
}

export interface CampaignData {
  name: string;
  description?: string;
  target_criteria?: Record<string, any>;
  outreach_template?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

// ============================================================================
// Task Types (Phase 2)
// ============================================================================

export interface TaskData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'complete' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  project_id?: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assigned_to?: string;
  project_id?: string;
  limit?: number;
}

// ============================================================================
// Communication Types (Phase 3)
// ============================================================================

export interface MessageData {
  channel_id: string;
  content: string;
  mentions?: string[];
}

export interface ChannelData {
  name: string;
  type?: 'public' | 'private';
  members?: string[];
}

// ============================================================================
// Team Types (Phase 3)
// ============================================================================

export interface TeamInviteData {
  email: string;
  role?: string;
}

export interface TeamData {
  name: string;
  description?: string;
}
