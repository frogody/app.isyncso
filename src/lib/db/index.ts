/**
 * Inventory Management System - Database Layer
 *
 * This module provides typed database access for the inventory management system.
 *
 * Usage:
 *   import { listCustomers, createExpense, scanBarcode } from '@/lib/db';
 *   import type { Customer, Expense, Inventory } from '@/lib/db';
 */

// Export all types
export * from './schema';

// Export all queries
export * from './queries';
