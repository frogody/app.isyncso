/**
 * Composio Integrations Page
 * Manage third-party service connections via Composio
 */

import React from 'react';
import Layout from './Layout';
import { ConnectionManager } from '@/components/integrations/ConnectionManager';
import { PageHeader } from '@/components/ui/PageHeader';
import { PermissionGuard } from '@/components/guards';
import { Plug } from 'lucide-react';

export default function ComposioIntegrations() {
  return (
    <Layout>
      <PermissionGuard permission="integrations.view" showMessage>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <PageHeader
            title="Third-Party Integrations"
            description="Connect your favorite tools to SYNC for seamless automation"
            icon={<Plug className="w-6 h-6" />}
          />

          <div className="mt-6">
            <ConnectionManager />
          </div>
        </div>
      </PermissionGuard>
    </Layout>
  );
}
