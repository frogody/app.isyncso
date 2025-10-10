import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68d43cf2c324ccd03de6bce5", 
  requiresAuth: true // Ensure authentication is required for all operations
});
