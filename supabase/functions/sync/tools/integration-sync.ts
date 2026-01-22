/**
 * Integration Data Sync Module
 *
 * Automatically indexes data from connected integrations into the RAG system
 * and creates knowledge graph relationships.
 *
 * Supported integrations:
 * - Gmail: Emails indexed with sender/recipient relationships
 * - Google Calendar: Events indexed with attendee relationships
 * - HubSpot: Contacts/deals synced to knowledge graph
 * - Google Sheets: Row data indexed for semantic search
 * - Microsoft Teams: Messages indexed with channel context
 * - Slack: Messages indexed with channel context
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateEmbedding, embeddingToPostgresVector } from '../memory/embeddings.ts';
import { KnowledgeGraph, EntityType, RelationshipType } from './knowledge-graph.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
  integration: string;
  itemsSynced: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  errors: string[];
  syncedAt: string;
}

export interface IntegrationItem {
  externalId: string;
  integrationType: string;
  content: string;
  title?: string;
  timestamp?: string;
  metadata: Record<string, unknown>;
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  attributes: Record<string, unknown>;
}

export interface ExtractedRelationship {
  fromEntity: string;
  toEntity: string;
  relationshipType: RelationshipType;
  context?: string;
}

// ============================================================================
// INTEGRATION SYNC CLASS
// ============================================================================

export class IntegrationSync {
  private supabase: SupabaseClient;
  private knowledgeGraph: KnowledgeGraph;
  private companyId: string;
  private userId?: string;

  constructor(
    supabase: SupabaseClient,
    companyId: string,
    userId?: string
  ) {
    this.supabase = supabase;
    this.companyId = companyId;
    this.userId = userId;
    this.knowledgeGraph = new KnowledgeGraph(supabase, companyId);
  }

  /**
   * Sync Gmail emails to RAG and knowledge graph
   */
  async syncGmailEmails(emails: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'gmail',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const email of emails) {
      try {
        // Extract email data
        const headers = email.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value;

        const from = email.from || getHeader('From') || '';
        const to = email.to || getHeader('To') || '';
        const subject = email.subject || getHeader('Subject') || '';
        const date = email.date || getHeader('Date') || '';
        const snippet = email.snippet || '';

        // Parse email addresses
        const fromEmail = this.extractEmail(from);
        const fromName = this.extractName(from);
        const toEmails = to.split(',').map((t: string) => this.extractEmail(t));

        // Create searchable content
        const content = `Email from ${fromName || fromEmail}: "${subject}"\n${snippet}`;

        // Index to RAG
        await this.indexIntegrationData({
          externalId: email.id,
          integrationType: 'gmail',
          content,
          title: subject,
          timestamp: date,
          metadata: {
            from: fromEmail,
            fromName,
            to: toEmails,
            subject,
            threadId: email.threadId,
            labels: email.labelIds,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

        // Create/update sender entity
        if (fromEmail) {
          const entityId = await this.knowledgeGraph.upsertEntity(
            'client',
            fromEmail,
            fromName || fromEmail,
            { email: fromEmail, lastEmailDate: date }
          );
          if (entityId) result.entitiesCreated++;

          // Log email interaction
          if (entityId) {
            await this.knowledgeGraph.logInteraction(entityId, 'mentioned', `Email: ${subject}`, undefined, this.userId);
          }
        }

      } catch (error) {
        result.errors.push(`Email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Sync Google Calendar events to RAG and knowledge graph
   */
  async syncCalendarEvents(events: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'calendar',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const event of events) {
      try {
        const title = event.summary || 'Untitled Event';
        const description = event.description || '';
        const start = event.start?.dateTime || event.start?.date || '';
        const end = event.end?.dateTime || event.end?.date || '';
        const attendees = event.attendees || [];
        const location = event.location || '';

        // Create searchable content
        const attendeeNames = attendees.map((a: any) => a.displayName || a.email).join(', ');
        const content = `Meeting: "${title}"${location ? ` at ${location}` : ''}\nTime: ${start} - ${end}${attendeeNames ? `\nWith: ${attendeeNames}` : ''}${description ? `\nDetails: ${description}` : ''}`;

        // Index to RAG
        await this.indexIntegrationData({
          externalId: event.id,
          integrationType: 'calendar',
          content,
          title,
          timestamp: start,
          metadata: {
            start,
            end,
            location,
            attendees: attendees.map((a: any) => ({ email: a.email, name: a.displayName })),
            status: event.status,
            htmlLink: event.htmlLink,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

        // Create meeting entity
        const meetingId = await this.knowledgeGraph.upsertEntity(
          'meeting',
          event.id,
          title,
          { date: start, location, attendeeCount: attendees.length }
        );

        // Create/update attendee entities and relationships
        for (const attendee of attendees) {
          const email = attendee.email;
          const name = attendee.displayName || email;

          const attendeeId = await this.knowledgeGraph.upsertEntity(
            'client',
            email,
            name,
            { email, lastMeetingDate: start }
          );

          if (attendeeId && meetingId) {
            await this.knowledgeGraph.addRelationship(
              attendeeId,
              meetingId,
              'participated_in',
              { date: start, title }
            );
            result.relationshipsCreated++;
          }
        }

      } catch (error) {
        result.errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Sync HubSpot contacts to knowledge graph
   */
  async syncHubSpotContacts(contacts: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'hubspot',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const contact of contacts) {
      try {
        const props = contact.properties || contact;
        const email = props.email || '';
        const firstName = props.firstname || props.first_name || '';
        const lastName = props.lastname || props.last_name || '';
        const company = props.company || '';
        const phone = props.phone || '';
        const lifecycleStage = props.lifecyclestage || '';

        const name = `${firstName} ${lastName}`.trim() || email;

        // Create searchable content
        const content = `HubSpot Contact: ${name}${company ? ` from ${company}` : ''}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}${lifecycleStage ? `\nStage: ${lifecycleStage}` : ''}`;

        // Index to RAG
        await this.indexIntegrationData({
          externalId: contact.id || email,
          integrationType: 'hubspot',
          content,
          title: name,
          timestamp: props.createdate || new Date().toISOString(),
          metadata: {
            email,
            firstName,
            lastName,
            company,
            phone,
            lifecycleStage,
            hubspotId: contact.id,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

        // Create/update contact entity
        const contactId = await this.knowledgeGraph.upsertEntity(
          lifecycleStage === 'customer' ? 'client' : 'prospect',
          contact.id || email,
          name,
          { email, company, phone, lifecycleStage, source: 'hubspot' }
        );
        if (contactId) result.entitiesCreated++;

      } catch (error) {
        result.errors.push(`Contact ${contact.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Sync Google Sheets data to RAG
   */
  async syncSheetsData(sheetData: {
    spreadsheetId: string;
    sheetName: string;
    headers: string[];
    rows: any[][];
  }): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'sheets',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    const { spreadsheetId, sheetName, headers, rows } = sheetData;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        // Create content from row data
        const rowContent = headers.map((h, idx) => `${h}: ${row[idx] || ''}`).join('\n');
        const content = `Spreadsheet "${sheetName}" Row ${i + 1}:\n${rowContent}`;

        // Create row object for metadata
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = row[idx];
        });

        // Index to RAG
        await this.indexIntegrationData({
          externalId: `${spreadsheetId}_${sheetName}_${i}`,
          integrationType: 'sheets',
          content,
          title: `${sheetName} Row ${i + 1}`,
          metadata: {
            spreadsheetId,
            sheetName,
            rowIndex: i,
            rowData: rowObj,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

      } catch (error) {
        result.errors.push(`Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Sync Microsoft Teams messages to RAG
   */
  async syncTeamsMessages(messages: any[], channelInfo?: { name: string; id: string }): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'teams',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const message of messages) {
      try {
        const from = message.from?.user?.displayName || message.from?.user?.email || 'Unknown';
        const body = message.body?.content || message.content || '';
        const createdAt = message.createdDateTime || message.createdAt || '';
        const channelName = channelInfo?.name || message.channelIdentity?.channelName || '';

        // Strip HTML from body
        const cleanBody = body.replace(/<[^>]*>/g, '').trim();

        const content = `Teams message from ${from}${channelName ? ` in #${channelName}` : ''}:\n"${cleanBody}"`;

        // Index to RAG
        await this.indexIntegrationData({
          externalId: message.id,
          integrationType: 'teams',
          content,
          title: `Message from ${from}`,
          timestamp: createdAt,
          metadata: {
            from,
            channelId: channelInfo?.id,
            channelName,
            messageType: message.messageType,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

        // Create/update sender entity
        const senderId = await this.knowledgeGraph.upsertEntity(
          'team_member',
          from,
          from,
          { source: 'teams', lastMessageDate: createdAt }
        );
        if (senderId) result.entitiesCreated++;

      } catch (error) {
        result.errors.push(`Message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Sync Slack messages to RAG
   */
  async syncSlackMessages(messages: any[], channelInfo?: { name: string; id: string }): Promise<SyncResult> {
    const result: SyncResult = {
      integration: 'slack',
      itemsSynced: 0,
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const message of messages) {
      try {
        const from = message.user_profile?.real_name || message.user || 'Unknown';
        const text = message.text || '';
        const ts = message.ts ? new Date(parseFloat(message.ts) * 1000).toISOString() : '';
        const channelName = channelInfo?.name || '';

        const content = `Slack message from ${from}${channelName ? ` in #${channelName}` : ''}:\n"${text}"`;

        // Index to RAG
        await this.indexIntegrationData({
          externalId: message.ts || message.client_msg_id,
          integrationType: 'slack',
          content,
          title: `Message from ${from}`,
          timestamp: ts,
          metadata: {
            from,
            channelId: channelInfo?.id,
            channelName,
            threadTs: message.thread_ts,
          },
          entities: [],
          relationships: [],
        });
        result.itemsSynced++;

      } catch (error) {
        result.errors.push(`Message ${message.ts}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  }

  /**
   * Index integration data to RAG with embeddings
   */
  private async indexIntegrationData(item: IntegrationItem): Promise<string | null> {
    try {
      // Generate embedding for content
      const embedding = await generateEmbedding(item.content);
      const embeddingStr = embeddingToPostgresVector(embedding);

      // Check if item already exists
      const { data: existing } = await this.supabase
        .from('sync_integration_data')
        .select('id')
        .eq('company_id', this.companyId)
        .eq('integration_type', item.integrationType)
        .eq('external_id', item.externalId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await this.supabase
          .from('sync_integration_data')
          .update({
            content: item.content,
            title: item.title,
            embedding: embeddingStr,
            metadata: item.metadata,
            synced_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        return existing.id;
      } else {
        // Insert new
        const { data, error } = await this.supabase
          .from('sync_integration_data')
          .insert({
            company_id: this.companyId,
            user_id: this.userId,
            integration_type: item.integrationType,
            external_id: item.externalId,
            content: item.content,
            title: item.title,
            timestamp: item.timestamp,
            embedding: embeddingStr,
            metadata: item.metadata,
          })
          .select('id')
          .single();

        if (error) throw error;
        return data?.id || null;
      }

    } catch (error) {
      console.error('[IntegrationSync] Failed to index data:', error);
      return null;
    }
  }

  /**
   * Extract email from "Name <email@example.com>" format
   */
  private extractEmail(str: string): string {
    const match = str.match(/<([^>]+)>/);
    return match ? match[1] : str.trim();
  }

  /**
   * Extract name from "Name <email@example.com>" format
   */
  private extractName(str: string): string {
    const match = str.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, '') : '';
  }

  /**
   * Get sync status for all integrations
   */
  async getSyncStatus(): Promise<Record<string, { lastSynced?: string; itemCount: number }>> {
    const status: Record<string, { lastSynced?: string; itemCount: number }> = {};

    const { data } = await this.supabase
      .from('sync_integration_data')
      .select('integration_type, synced_at')
      .eq('company_id', this.companyId)
      .order('synced_at', { ascending: false });

    if (data) {
      const byType: Record<string, any[]> = {};
      for (const item of data) {
        if (!byType[item.integration_type]) byType[item.integration_type] = [];
        byType[item.integration_type].push(item);
      }

      for (const [type, items] of Object.entries(byType)) {
        status[type] = {
          lastSynced: items[0]?.synced_at,
          itemCount: items.length,
        };
      }
    }

    return status;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create IntegrationSync instance for a user session
 */
export function createIntegrationSync(
  supabase: SupabaseClient,
  companyId: string,
  userId?: string
): IntegrationSync {
  return new IntegrationSync(supabase, companyId, userId);
}

/**
 * Auto-sync handler that can be called after fetching integration data
 */
export async function autoSyncIntegrationData(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  integrationType: string,
  data: any[]
): Promise<SyncResult> {
  const sync = new IntegrationSync(supabase, companyId, userId);

  switch (integrationType) {
    case 'gmail':
      return sync.syncGmailEmails(data);
    case 'calendar':
    case 'googlecalendar':
      return sync.syncCalendarEvents(data);
    case 'hubspot':
      return sync.syncHubSpotContacts(data);
    case 'teams':
    case 'microsoft_teams':
      return sync.syncTeamsMessages(data);
    case 'slack':
      return sync.syncSlackMessages(data);
    default:
      return {
        integration: integrationType,
        itemsSynced: 0,
        entitiesCreated: 0,
        relationshipsCreated: 0,
        errors: [`Unknown integration type: ${integrationType}`],
        syncedAt: new Date().toISOString(),
      };
  }
}

export default IntegrationSync;
