# SYNC Agent Architecture Report

## Comprehensive Technical Documentation

**Document Version**: 1.0
**Date**: January 16, 2026
**Author**: Claude Code Technical Analysis
**Classification**: Internal Technical Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Implementation](#4-frontend-implementation)
5. [Action System](#5-action-system)
6. [Memory & Persistence](#6-memory--persistence)
7. [Multi-Agent Workflow System](#7-multi-agent-workflow-system)
8. [Voice Mode](#8-voice-mode)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Intelligence Features](#10-intelligence-features)
11. [Deployment & Operations](#11-deployment--operations)
12. [Complete Action Reference](#12-complete-action-reference)

---

## 1. Executive Summary

SYNC is the central AI orchestrator for iSyncSO, a comprehensive business intelligence platform. It functions as a conversational AI assistant capable of executing 51+ distinct actions across 11 business modules, with persistent memory, multi-agent workflows, voice interaction, and third-party service integrations.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Natural Language Processing** | Understands user intent from conversational input |
| **Action Execution** | 51+ actions across Finance, Products, CRM, Tasks, etc. |
| **Multi-Agent System** | 13 specialized agents with different LLMs for domain expertise |
| **RAG Memory System** | Vector semantic search across conversations, summaries, entities |
| **Knowledge Graph** | Entity relationships with 11 entity types and 9 relationship types |
| **Learning System** | Pattern recognition from successful tasks with feedback scoring |
| **Persistent Memory** | Database-backed sessions with automatic summarization |
| **Entity Extraction** | LLM-powered extraction of clients, products, preferences |
| **Voice Interaction** | Speech-to-text input, 8 TTS voices via Orpheus-3B |
| **Third-Party Integrations** | 30+ services via Composio (Gmail, Slack, HubSpot, etc.) |
| **Streaming Responses** | Real-time Server-Sent Events (SSE) |

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Deno (Supabase Edge Functions) |
| **Primary LLM** | Kimi-K2-Instruct (moonshotai via Together.ai) |
| **Reasoning LLM** | DeepSeek-R1 (complex analysis) |
| **Fast LLM** | Llama-3.1-8B-Instruct (quick responses) |
| **Code LLM** | Qwen-2.5-Coder-32B (code generation) |
| **Database** | PostgreSQL via Supabase with pgvector |
| **Vector Embeddings** | BAAI/bge-large-en-v1.5 (1024 dimensions) |
| **Text-to-Speech** | Orpheus-3B via Together.ai |
| **Frontend** | React with Framer Motion |
| **Integrations** | Composio SDK (30+ services)

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   SyncChat.jsx      │  │ SyncVoiceMode.jsx   │  │   SyncAgent.jsx     │  │
│  │   (Text Chat UI)    │  │  (Voice Interface)  │  │  (Full Page View)   │  │
│  └─────────┬───────────┘  └─────────┬───────────┘  └─────────────────────┘  │
└────────────┼────────────────────────┼───────────────────────────────────────┘
             │                        │
             ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         sync/index.ts                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │ Action Parser│  │ Agent Router │  │   Memory     │               │    │
│  │  │ [ACTION]...  │  │  Keyword +   │  │   System     │               │    │
│  │  │ [/ACTION]    │  │  Pattern     │  │              │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │  sync-voice/        │  │               tools/                         │   │
│  │  index.ts           │  │  finance.ts | products.ts | growth.ts        │   │
│  │  (Voice Endpoint)   │  │  tasks.ts | inbox.ts | team.ts | learn.ts    │   │
│  │                     │  │  sentinel.ts | create.ts | research.ts       │   │
│  │                     │  │  composio.ts (30+ third-party actions)       │   │
│  └─────────────────────┘  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EXTERNAL SERVICES                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Together.ai    │  │    Supabase     │  │         Composio            │  │
│  │  - Kimi-K2      │  │  - PostgreSQL   │  │  - Gmail, Slack, HubSpot    │  │
│  │  - Embeddings   │  │  - Auth         │  │  - Calendar, Notion, etc.   │  │
│  │  - TTS          │  │  - Storage      │  │  - 30+ services             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

1. **User Input**: User types message or speaks (voice mode)
2. **Frontend Processing**: React component sends HTTP POST to edge function
3. **Intent Classification**: Agent routing determines specialized handler
4. **LLM Processing**: Kimi-K2 generates response with potential [ACTION] blocks
5. **Action Parsing**: Regex extracts action definitions from response
6. **Action Execution**: Routed to appropriate tool executor
7. **Response Synthesis**: Results combined with LLM narrative
8. **Streaming/Return**: SSE stream or JSON response to frontend
9. **Memory Update**: Session persisted to database

---

## 3. Backend Architecture

### 3.1 Main Orchestrator (`sync/index.ts`)

The main orchestrator is approximately 2,400 lines of TypeScript and handles:

- **Request handling**: CORS, authentication, request parsing
- **Agent routing**: Keyword/pattern matching to specialized agents
- **LLM orchestration**: Prompt construction, API calls, streaming
- **Action parsing**: Regex extraction of `[ACTION]...[/ACTION]` blocks
- **Action execution**: Routing to module executors
- **Memory management**: Session persistence, context retrieval
- **Error recovery**: Automatic retry with fallback strategies
- **Document handling**: Long response conversion to downloadable documents

### 3.2 System Prompt Architecture

The system prompt (~1,900 lines) defines SYNC's behavior across several sections:

| Section | Lines | Purpose |
|---------|-------|---------|
| **Personality** | ~20 | Friendly, conversational tone |
| **Anti-Hallucination Rules** | ~50 | NEVER invent data, always search first |
| **Conversation Flow** | ~100 | One question at a time, step-by-step |
| **Product Verification** | ~80 | MUST search before confirming products |
| **Available Actions** | ~200 | All 51 actions with examples |
| **Image Generation** | ~200 | Detailed prompt crafting guide |
| **Integration Rules** | ~100 | Composio action requirements |
| **Proactive Intelligence** | ~80 | Smart follow-ups, pattern learning |

### 3.3 Action Categories

```typescript
// Finance Module - 8 actions
const FINANCE_ACTIONS = [
  'create_proposal', 'create_invoice', 'list_invoices', 'update_invoice',
  'create_expense', 'list_expenses', 'get_financial_summary',
  'convert_proposal_to_invoice',
];

// Products Module - 6 actions
const PRODUCT_ACTIONS = [
  'search_products', 'create_product', 'update_product',
  'update_inventory', 'list_products', 'get_low_stock',
];

// Growth/CRM Module - 9 actions
const GROWTH_ACTIONS = [
  'create_prospect', 'update_prospect', 'search_prospects', 'list_prospects',
  'move_pipeline_stage', 'get_pipeline_stats', 'create_campaign',
  'list_campaigns', 'update_campaign',
];

// Tasks Module - 8 actions
const TASK_ACTIONS = [
  'create_task', 'update_task', 'assign_task', 'list_tasks',
  'complete_task', 'delete_task', 'get_my_tasks', 'get_overdue_tasks',
];

// Additional modules: Inbox (5), Team (6), Learn (4), Sentinel (3),
// Create (2), Research (2), Composio (30+)
```

### 3.4 Agent Routing Configuration

SYNC uses keyword and regex pattern matching to route requests:

```typescript
const AGENTS: Record<string, AgentRouting> = {
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    priority: 100,
    keywords: ['invoice', 'payment', 'expense', 'budget', 'btw', 'vat',
               'revenue', 'proposal', 'billing'],
    patterns: [
      /send\s+(an?\s+)?invoice/i,
      /create\s+(an?\s+)?invoice/i,
      /\d+\s*(euro|eur|€)/i,
      /financial\s+summary/i,
    ],
  },
  products: { priority: 95, /* ... */ },
  growth: { priority: 80, /* ... */ },
  integrations: { priority: 85, /* ... */ },
  // ... 9 total agents
};
```

### 3.5 Typo Correction System

Built-in fuzzy matching for common business terms:

```typescript
const COMMON_TYPOS: Record<string, string> = {
  'invocies': 'invoices', 'invocie': 'invoice', 'invioce': 'invoice',
  'clent': 'client', 'clinet': 'client', 'cleint': 'client',
  'prposal': 'proposal', 'proposla': 'proposal',
  'prodcut': 'product', 'pruduct': 'product',
  'taks': 'task', 'tsak': 'task',
  // ... 40+ common typos covered
};
```

---

## 4. Frontend Implementation

### 4.1 SyncChat Component (`src/components/sync/SyncChat.jsx`)

**632 lines** of React implementing the chat interface:

```jsx
// Core state management
const [messages, setMessages] = useState([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [sessionId] = useState(() => `sync-${Date.now()}-${Math.random()}`);

// Message sending with streaming support
const handleSend = async (messageText = input) => {
  const response = await fetch(`${supabaseUrl}/functions/v1/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: messageText,
      sessionId,
      stream: true,
      context: { userId, companyId }
    })
  });

  // SSE streaming reader
  const reader = response.body.getReader();
  // ... streaming implementation
};
```

### 4.2 Action Button Parsing

The frontend parses `[ACTIONS]...[/ACTIONS]` blocks to render interactive buttons:

```javascript
function parseActionsFromContent(content) {
  const actionsRegex = /\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/g;
  const actions = [];

  // Pattern: - emoji Label|action_id
  // Example: - 📧 Send via Email|send_email
  const linePattern = /^[-*]\s*(.+?)\|(.+)$/gm;

  let match;
  while ((match = linePattern.exec(block)) !== null) {
    const [, label, actionId] = match;
    actions.push({
      label: label.trim(),
      actionId: actionId.trim(),
    });
  }

  return actions;
}
```

### 4.3 SyncVoiceMode Component (`src/components/sync/SyncVoiceMode.jsx`)

**461 lines** implementing voice conversation:

```jsx
// Voice selection and state
const VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];
const [selectedVoice, setSelectedVoice] = useState('tara');
const [isListening, setIsListening] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);

// Speech recognition (Web Speech API)
const recognition = new (window.SpeechRecognition ||
                         window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;

// Process voice input
const processVoiceInput = async (text) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        voice: selectedVoice,
        sessionId,
        conversationHistory,
        context: { userId, companyId }
      })
    }
  );

  const data = await response.json();
  await playAudio(data.audio, data.audioFormat);
};

// Audio playback
const playAudio = async (base64Audio, format) => {
  const audioData = atob(base64Audio);
  const audioArray = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    audioArray[i] = audioData.charCodeAt(i);
  }
  const audioBlob = new Blob([audioArray], { type: `audio/${format}` });
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  await audio.play();
};
```

### 4.4 UI Features

- **Framer Motion Animations**: Smooth message transitions
- **Markdown Rendering**: Full markdown support with syntax highlighting
- **Action Buttons**: Interactive buttons parsed from ACTIONS blocks
- **Voice Visualization**: Waveform display during recording/playback
- **Dark Mode**: Theme support via Tailwind CSS
- **Responsive Design**: Mobile-first with adaptive layouts

---

## 5. Action System

### 5.1 Action Parsing

Actions are embedded in LLM responses using a specific format:

```
[ACTION]{"action": "action_name", "data": {...}}[/ACTION]
```

Multiple actions can be specified:

```
[ACTION]{"action": "search_products", "data": {"query": "oneblade"}}[/ACTION]
[ACTION]{"action": "list_invoices", "data": {"status": "unpaid"}}[/ACTION]
```

### 5.2 Action Chaining

For multi-step operations, actions can be chained:

```json
[ACTION_CHAIN]{
  "id": "invoice_flow",
  "strategy": "sequential",
  "actions": [
    {"id": "create", "action": "create_invoice", "data": {...}},
    {"id": "send", "action": "update_invoice",
     "data": {"id": "{{create.id}}", "status": "sent"},
     "dependsOn": ["create"]}
  ]
}[/ACTION_CHAIN]
```

### 5.3 Action Context

Every action receives context for database access:

```typescript
interface ActionContext {
  supabase: SupabaseClient;  // Database client
  companyId: string;         // Tenant isolation
  userId?: string;           // User identity
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  redirect?: string;         // Optional page redirect
}
```

### 5.4 Recovery System

Actions include automatic retry with intelligent recovery:

```typescript
async function executeWithRecovery(
  executor: Function,
  actionName: string,
  data: any,
  ctx: ActionContext,
  maxAttempts: number = 3
): Promise<ActionResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executor(actionName, data, ctx);
      if (result.success) return result;

      // Attempt recovery
      const recovery = await handleActionFailure(result, attempt);
      if (recovery.shouldRetry) {
        data = recovery.modifiedData || data;
        continue;
      }
      return result;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    }
  }
}
```

---

## 6. Memory & Persistence (Advanced Intelligence Layer)

SYNC implements a sophisticated memory architecture with five interconnected systems:

1. **Session Buffer** - Sliding window with automatic summarization
2. **RAG (Retrieval-Augmented Generation)** - Vector semantic search
3. **Knowledge Graph** - Entity relationships and interactions
4. **Entity Memory** - Client, product, and preference tracking
5. **Learning System** - Pattern recognition from successful tasks

### 6.1 Memory System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORY SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ SESSION BUFFER  │    │   RAG MANAGER   │    │KNOWLEDGE GRAPH  │          │
│  │  - 10 messages  │    │  - Vector search│    │  - Entity nodes │          │
│  │  - Auto-summary │    │  - 0.6 threshold│    │  - Relationships│          │
│  │  - 20 max       │    │  - 5 results    │    │  - Interactions │          │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘          │
│           │                      │                      │                    │
│           └──────────────────────┼──────────────────────┘                    │
│                                  │                                           │
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │    MEMORY CONTEXT       │                               │
│                    │  Injected into LLM      │                               │
│                    │  System Prompt          │                               │
│                    └─────────────────────────┘                               │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ ENTITY MANAGER  │    │LEARNING SYSTEM  │    │ ACTION TEMPLATES│          │
│  │  - Extraction   │    │  - Pattern match│    │  - Success rate │          │
│  │  - Persistence  │    │  - Feedback     │    │  - EMA scoring  │          │
│  │  - Search       │    │  - Analytics    │    │  - Pruning      │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Session Buffer with Summarization

The buffer manager implements a sliding window that automatically summarizes older messages:

```typescript
// Configuration (memory/types.ts)
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  bufferSize: 10,              // Messages in immediate context
  maxBuffer: 20,               // Trigger summarization at 20
  embeddingModel: 'BAAI/bge-large-en-v1.5',
  embeddingDimensions: 1024,
  ragThreshold: 0.6,           // Minimum similarity for RAG
  ragLimit: 5,                 // Max RAG results
  summarizationModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
};

// Summarization (memory/buffer.ts)
export class BufferManager {
  // When messages exceed maxBuffer, older ones are summarized
  async summarizeOlderMessages(session: SyncSession): Promise<SyncSession> {
    const toSummarize = session.messages.slice(0, -this.bufferSize);
    const toKeep = session.messages.slice(-this.bufferSize);

    const summary = await this.generateSummary(toSummarize);

    // Summary preserves:
    // - Client names and companies
    // - Products discussed with quantities/prices
    // - Decisions made and actions taken
    // - User preferences learned
    // - Commitments and follow-up items

    session.conversation_summary = existingSummary
      ? `${existingSummary}\n\n[Later:]\n${summary}`
      : summary;

    // Store as searchable memory chunk with embedding
    await this.storeMemoryChunk(session, {
      chunk_type: 'summary',
      content: summary,
      importance_score: 0.8,
    });

    return session;
  }
}
```

### 6.3 RAG (Retrieval-Augmented Generation)

The RAG system provides semantic retrieval across all memory types:

```typescript
// RAG Manager (memory/rag.ts)
export class RAGManager {
  /**
   * Retrieve relevant memories using vector similarity search
   */
  async retrieveRelevantMemories(
    session: SyncSession,
    query: string,
    types?: string[],           // 'conversation', 'summary', 'entity', 'action_success'
    threshold = 0.6,            // Minimum cosine similarity
    limit = 5
  ): Promise<MemorySearchResult[]> {
    const embedding = await generateEmbedding(query);

    // PostgreSQL vector similarity search (pgvector)
    const { data } = await this.supabase.rpc('search_sync_memory', {
      query_embedding: embeddingStr,
      match_user_id: session.user_id,
      match_company_id: session.company_id,
      match_types: types || null,
      match_threshold: threshold,
      match_limit: limit,
    });

    // Track access counts for importance scoring
    await this.updateAccessCounts(data.map(chunk => chunk.id));

    return data;
  }

  /**
   * Build complete memory context for LLM injection
   */
  async buildMemoryContext(
    session: SyncSession,
    currentMessage: string
  ): Promise<MemoryContext> {
    // Parallel retrieval for efficiency
    const [relevantMemories, relatedEntities, actionTemplates] = await Promise.all([
      this.retrieveRelevantMemories(session, currentMessage),
      this.entityManager.searchEntities(session, currentMessage),
      this.searchActionTemplates(session, currentMessage),
    ]);

    return {
      recentMessages: this.bufferManager.getContextMessages(session),
      conversationSummary: session.conversation_summary,
      relevantMemories,              // RAG results
      activeEntities: session.active_entities,
      relatedEntities,               // Entity semantic matches
      actionTemplates,               // Similar successful actions
    };
  }

  /**
   * Format context for system prompt injection
   */
  formatContextForPrompt(context: MemoryContext): string {
    // Outputs sections:
    // ## Previous Conversation Summary
    // ## Relevant Past Interactions
    // ## Currently Discussed (clients, products)
    // ## User Preferences
    // ## Related Information from History
    // ## Similar Successful Actions
  }
}
```

### 6.4 Knowledge Graph

The Knowledge Graph tracks entity relationships for complex queries like "For each client I worked with this week...":

```typescript
// Entity and Relationship Types (tools/knowledge-graph.ts)
export type EntityType =
  | 'client' | 'prospect' | 'product' | 'task' | 'invoice'
  | 'proposal' | 'team_member' | 'campaign' | 'expense' | 'email' | 'meeting';

export type RelationshipType =
  | 'owns' | 'purchased' | 'assigned_to' | 'contacted'
  | 'worked_on' | 'manages' | 'participated_in' | 'created_for' | 'related_to';

// Knowledge Graph Class
export class KnowledgeGraph {
  /**
   * Get entity with all its relationships (1-hop graph)
   */
  async getEntityGraph(entityId: string): Promise<EntityGraph | null> {
    const { data } = await this.supabase.rpc('get_entity_graph', {
      p_company_id: this.companyId,
      p_entity_id: entityId,
    });

    return {
      entity: { id, entity_type, entity_name, attributes, confidence_score },
      relationships: [
        { related_entity, relationship_type, strength },
        // ... all connected entities
      ],
    };
  }

  /**
   * Create or strengthen a relationship
   */
  async addRelationship(
    fromEntityId: string,
    toEntityId: string,
    relationshipType: RelationshipType,
    context: Record<string, unknown>
  ): Promise<string | null> {
    // Relationships have strength scores that increase with interactions
    return this.supabase.rpc('upsert_entity_relationship', {
      p_from_entity_id: fromEntityId,
      p_to_entity_id: toEntityId,
      p_relationship_type: relationshipType,
      p_context: context,
    });
  }

  /**
   * Log interaction (increases importance score)
   */
  async logInteraction(
    entityId: string,
    interactionType: 'mentioned' | 'queried' | 'updated' | 'created',
    context?: string
  ): Promise<void>;

  /**
   * Sync entities from source tables (products, invoices, etc.)
   */
  async syncFromSource(entityType: EntityType): Promise<number> {
    // Automatically populates knowledge graph from business data
    // - Prospects/Clients from growth_prospects
    // - Products from products table
    // - Tasks from tasks table
    // - Invoices from invoices table
  }
}

// Extract entity mentions from user message
export function extractEntityMentions(message: string): Array<{ type: EntityType; name: string }> {
  // Patterns:
  // - client/prospect/customer named "John Smith"
  // - with/for/from Company about...
  // - product called "OneBlade"
}

// Format entity graph for LLM context
export function formatEntityContext(graph: EntityGraph): string {
  // **John Smith** (client)
  //   Attributes: company: Acme Corp, email: john@acme.com
  //   Relationships:
  //     - purchased → Philips OneBlade (product)
  //     - assigned_to → Follow-up call (task)
}
```

### 6.5 Entity Memory System

The Entity Manager extracts, persists, and retrieves business entities:

```typescript
// Entity Manager (memory/entities.ts)
export class EntityManager {
  /**
   * Extract entities from message using LLM
   */
  async extractEntities(
    message: ChatMessage,
    session: SyncSession
  ): Promise<ExtractedEntities> {
    const extractPrompt = `Analyze this message and extract entities.

    Extract in JSON format:
    {
      "clients": [{"name": "...", "company": "..."}],
      "products": [{"name": "...", "quantity": null}],
      "preferences": {},
      "intent": "create_invoice|create_proposal|search_products|..."
    }`;

    // Uses Llama-3.3-70B for extraction
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: [{ role: 'user', content: extractPrompt }],
        temperature: 0.1,  // Low temperature for consistent extraction
      }),
    });

    return JSON.parse(response);
  }

  /**
   * Update session's active entities and persist to long-term storage
   */
  async updateActiveEntities(
    session: SyncSession,
    extracted: ExtractedEntities
  ): Promise<ActiveEntities> {
    // Merge with existing entities
    // Update last_mentioned timestamps
    // Track current intent
    // Persist to sync_entities table with embeddings
  }

  /**
   * Semantic search for related entities
   */
  async searchEntities(
    session: SyncSession,
    query: string,
    types?: string[],
    limit = 5
  ): Promise<EntitySearchResult[]> {
    const embedding = await generateEmbedding(query);

    return this.supabase.rpc('search_sync_entities', {
      query_embedding: embeddingStr,
      match_user_id: session.user_id,
      match_company_id: session.company_id,
      match_types: types || null,
      match_limit: limit,
    });
  }

  /**
   * Get frequently interacted entities
   */
  async getFrequentEntities(
    session: SyncSession,
    types?: string[],
    limit = 5
  ): Promise<SyncEntity[]> {
    // Ordered by interaction_count DESC
  }
}
```

### 6.6 Learning System (Pattern Recognition)

SYNC learns from successful task completions:

```typescript
// Learning System (memory/learning.ts)
interface LearnedPattern {
  id: string;
  triggerText: string;              // Original user request
  triggerEmbedding?: number[];      // For semantic matching
  planTemplate: PlanTemplate;       // Reusable task plan
  successCount: number;             // How many times used successfully
  feedbackScore: number;            // EMA of user feedback (-1 to 1)
  metadata?: {
    avgExecutionTime?: number;
    commonEntities?: string[];
    userIds?: string[];
  };
}

/**
 * Store successful task completion as pattern
 */
export async function learnFromSuccess(
  supabase: SupabaseClient,
  originalRequest: string,
  executedPlan: TaskPlan,
  feedback?: 'positive' | 'negative' | null
): Promise<string | null> {
  const embedding = await generateEmbedding(originalRequest);
  const planTemplate = convertToPlanTemplate(executedPlan);

  // Check for existing similar pattern
  const existingPattern = await findExactMatch(supabase, originalRequest);

  if (existingPattern) {
    // Update success count and feedback score using EMA
    await supabase.from('sync_learned_patterns').update({
      success_count: existingPattern.success_count + 1,
      feedback_score: calculateNewScore(
        existingPattern.feedback_score,
        existingPattern.success_count,
        feedback
      ),
    });
  } else {
    // Create new pattern
    await supabase.from('sync_learned_patterns').insert({
      trigger_text: originalRequest,
      trigger_embedding: embedding,
      plan_template: planTemplate,
      success_count: 1,
    });
  }
}

/**
 * Find similar patterns for new request
 */
export async function findSimilarPatterns(
  supabase: SupabaseClient,
  request: string,
  options: {
    matchThreshold?: number;   // Default 0.75
    maxResults?: number;       // Default 5
    minSuccessCount?: number;  // Default 1
  }
): Promise<PatternMatch[]> {
  const embedding = await generateEmbedding(request);

  return supabase.rpc('match_learned_patterns', {
    query_embedding: embedding,
    match_threshold: options.matchThreshold,
    match_count: options.maxResults,
    min_success_count: options.minSuccessCount,
  });
}

/**
 * Get best pattern using combined similarity + feedback score
 */
export async function getBestPattern(
  supabase: SupabaseClient,
  request: string
): Promise<PatternMatch | null> {
  const matches = await findSimilarPatterns(supabase, request, {
    matchThreshold: 0.8,
    minSuccessCount: 2,
  });

  // Score = similarity * (1 + normalized_feedback)
  const scored = matches.map(m => ({
    ...m,
    score: m.similarity * (1 + (m.pattern.feedbackScore / 10)),
  }));

  return scored[0]?.similarity >= 0.85 ? scored[0] : null;
}

/**
 * Apply pattern to new request
 */
export function applyPattern(
  pattern: LearnedPattern,
  extractedEntities: Record<string, any>
): TaskStep[] | null {
  // Fill template with extracted entities
  // Return executable task steps
}

/**
 * Prune low-performing patterns
 */
export async function prunePatterns(
  supabase: SupabaseClient,
  options: {
    minFeedbackScore?: number;  // Default -0.5
    maxAgeHours?: number;       // Default 720 (30 days)
  }
): Promise<number> {
  // Delete patterns with poor feedback or no recent usage
}
```

### 6.7 Complete Database Schema

```sql
-- ============================================================================
-- SESSION PERSISTENCE
-- ============================================================================

CREATE TABLE sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  company_id UUID REFERENCES companies(id),
  messages JSONB DEFAULT '[]',              -- Recent message buffer
  conversation_summary TEXT,                -- Compressed history
  summary_last_updated TIMESTAMPTZ,
  summary_message_count INTEGER DEFAULT 0,
  active_entities JSONB DEFAULT '{          -- Current conversation state
    "clients": [],
    "products": [],
    "preferences": {},
    "current_intent": null
  }',
  context JSONB DEFAULT '{}',
  last_agent TEXT,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RAG MEMORY CHUNKS (Vector Search)
-- ============================================================================

CREATE TABLE sync_memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sync_sessions(session_id),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  company_id UUID REFERENCES companies(id),
  chunk_type TEXT NOT NULL,                 -- 'conversation', 'summary', 'entity',
                                            -- 'action_success', 'action_template', 'preference'
  content TEXT NOT NULL,
  embedding VECTOR(1024),                   -- BAAI/bge-large-en-v1.5
  metadata JSONB DEFAULT '{}',
  importance_score FLOAT DEFAULT 0.5,       -- Weighted by action success
  access_count INTEGER DEFAULT 0,           -- Track retrieval frequency
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX ON sync_memory_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Semantic search function
CREATE OR REPLACE FUNCTION search_sync_memory(
  query_embedding VECTOR(1024),
  match_user_id UUID,
  match_company_id UUID,
  match_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.6,
  match_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  chunk_type TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
  SELECT
    id, chunk_type, content, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM sync_memory_chunks
  WHERE (user_id = match_user_id OR company_id = match_company_id)
    AND (match_types IS NULL OR chunk_type = ANY(match_types))
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- ENTITY MEMORY (Long-term Entity Tracking)
-- ============================================================================

CREATE TABLE sync_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  company_id UUID REFERENCES companies(id),
  entity_type TEXT NOT NULL,                -- 'client', 'prospect', 'product',
                                            -- 'supplier', 'preference', 'workflow'
  entity_id TEXT,                           -- Reference to source table
  entity_name TEXT NOT NULL,
  attributes JSONB DEFAULT '{}',            -- Type-specific attributes
  embedding VECTOR(1024),                   -- For semantic search
  interaction_count INTEGER DEFAULT 1,      -- Frequency of mention
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  confidence_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON sync_entities
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Entity search function
CREATE OR REPLACE FUNCTION search_sync_entities(
  query_embedding VECTOR(1024),
  match_user_id UUID,
  match_company_id UUID,
  match_types TEXT[] DEFAULT NULL,
  match_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_name TEXT,
  entity_id TEXT,
  attributes JSONB,
  interaction_count INTEGER,
  similarity FLOAT
) AS $$
  SELECT
    id, entity_type, entity_name, entity_id, attributes, interaction_count,
    1 - (embedding <=> query_embedding) AS similarity
  FROM sync_entities
  WHERE (user_id = match_user_id OR company_id = match_company_id)
    AND (match_types IS NULL OR entity_type = ANY(match_types))
  ORDER BY embedding <=> query_embedding
  LIMIT match_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- KNOWLEDGE GRAPH (Entity Relationships)
-- ============================================================================

CREATE TABLE sync_entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  from_entity_id UUID REFERENCES sync_entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES sync_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,          -- 'owns', 'purchased', 'assigned_to',
                                            -- 'contacted', 'worked_on', 'manages',
                                            -- 'participated_in', 'created_for', 'related_to'
  strength FLOAT DEFAULT 1.0,               -- Increases with interactions
  context JSONB DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_entity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  entity_id UUID REFERENCES sync_entities(id) ON DELETE CASCADE,
  session_id TEXT,
  interaction_type TEXT NOT NULL,           -- 'mentioned', 'queried', 'updated', 'created'
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Get entity with relationships (1-hop graph)
CREATE OR REPLACE FUNCTION get_entity_graph(
  p_company_id UUID,
  p_entity_id TEXT
) RETURNS TABLE (
  entity_id TEXT,
  entity_type TEXT,
  entity_name TEXT,
  attributes JSONB,
  related_entity_id TEXT,
  related_type TEXT,
  related_name TEXT,
  relationship_type TEXT,
  relationship_strength FLOAT
) AS $$
  -- Returns entity with all related entities
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- ACTION TEMPLATES (Successful Patterns)
-- ============================================================================

CREATE TABLE sync_action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  company_id UUID REFERENCES companies(id),
  action_type TEXT NOT NULL,
  intent_description TEXT,
  example_request TEXT,
  action_data JSONB,
  embedding VECTOR(1024),
  success_count INTEGER DEFAULT 1,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action template search
CREATE OR REPLACE FUNCTION search_action_templates(
  query_embedding VECTOR(1024),
  match_user_id UUID,
  match_company_id UUID,
  match_action_type TEXT DEFAULT NULL,
  match_limit INTEGER DEFAULT 3
) RETURNS TABLE (
  id UUID,
  action_type TEXT,
  intent_description TEXT,
  example_request TEXT,
  action_data JSONB,
  success_count INTEGER,
  similarity FLOAT
) AS $$
  -- Returns similar successful action patterns
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- LEARNED PATTERNS (Task Learning)
-- ============================================================================

CREATE TABLE sync_learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_text TEXT NOT NULL,               -- Original user request
  trigger_embedding VECTOR(1024),           -- For semantic matching
  plan_template JSONB NOT NULL,             -- Reusable task template
  success_count INTEGER DEFAULT 1,
  feedback_score FLOAT DEFAULT 0,           -- EMA of feedback (-1 to 1)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern matching with vector similarity
CREATE OR REPLACE FUNCTION match_learned_patterns(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INTEGER DEFAULT 5,
  min_success_count INTEGER DEFAULT 1
) RETURNS TABLE (
  id UUID,
  trigger_text TEXT,
  plan_template JSONB,
  success_count INTEGER,
  feedback_score FLOAT,
  similarity FLOAT
) AS $$
  SELECT
    id, trigger_text, plan_template, success_count, feedback_score,
    1 - (trigger_embedding <=> query_embedding) AS similarity
  FROM sync_learned_patterns
  WHERE success_count >= min_success_count
    AND 1 - (trigger_embedding <=> query_embedding) > match_threshold
  ORDER BY trigger_embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

### 6.8 Memory Context Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE ARRIVES                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. ENTITY EXTRACTION (LLM)                                                  │
│     - Extract clients, products, preferences, intent                         │
│     - Update active_entities in session                                      │
│     - Persist to sync_entities with embeddings                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. PARALLEL MEMORY RETRIEVAL                                                │
│     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐          │
│     │ RAG Search       │ │ Entity Search    │ │ Action Templates │          │
│     │ sync_memory_     │ │ sync_entities    │ │ sync_action_     │          │
│     │ chunks           │ │                  │ │ templates        │          │
│     └──────────────────┘ └──────────────────┘ └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. CONTEXT ASSEMBLY                                                         │
│     - Recent messages (buffer)                                               │
│     - Conversation summary                                                   │
│     - RAG results                                                            │
│     - Related entities                                                       │
│     - Similar action patterns                                                │
│     - Knowledge graph context                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. LLM GENERATION (with enriched context)                                   │
│     System Prompt + Memory Context + User Message → Response                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. POST-PROCESSING                                                          │
│     - Store conversation turn with embedding                                 │
│     - If action successful → Learn pattern                                   │
│     - Update entity interactions in knowledge graph                          │
│     - Check if summarization needed                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Multi-Agent Workflow System

### 7.1 Specialized Agents (`workflows/agents.ts`)

SYNC includes 13 specialized agents, each with domain-specific prompts:

```typescript
const MODELS = {
  REASONING: 'deepseek-ai/DeepSeek-R1',
  ADVANCED: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  FAST: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  CODE: 'Qwen/Qwen2.5-Coder-32B-Instruct',
  CONTEXT: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  AGGREGATOR: 'moonshotai/Kimi-K2-Instruct',
};

export const SPECIALIZED_AGENTS: Record<string, Agent> = {
  orchestrator: {
    name: 'Orchestrator',
    model: MODELS.AGGREGATOR,
    systemPrompt: '...',
    capabilities: ['routing', 'synthesis', 'coordination'],
  },
  finance: {
    name: 'Finance Specialist',
    model: MODELS.ADVANCED,
    systemPrompt: '...',
    capabilities: ['invoicing', 'expenses', 'reporting'],
  },
  growth: { /* CRM/Sales */ },
  learn: { /* Learning & Development */ },
  sentinel: { /* Compliance */ },
  products: { /* Inventory */ },
  tasks: { /* Task Management */ },
  research: { /* Web Search */ },
  reasoning: { /* DeepSeek-R1 for complex analysis */ },
  code: { /* Qwen for code generation */ },
  aggregator: { /* Result synthesis */ },
  evaluator: { /* Quality assessment */ },
  planner: { /* Task decomposition */ },
  inbox: { /* Email management */ },
};
```

### 7.2 Workflow Patterns (`workflows/engine.ts`)

Five workflow execution patterns:

```typescript
type WorkflowType =
  | 'parallel'      // Multiple agents simultaneously
  | 'sequential'    // Agents in order, passing results
  | 'conditional'   // Route based on classification
  | 'iterative'     // Refine until quality threshold
  | 'hybrid';       // Combination of patterns

async function executeWorkflow(
  userMessage: string,
  context?: WorkflowContext,
  forceWorkflowType?: WorkflowType
): Promise<WorkflowResult> {
  const classification = await classifyIntent(userMessage, context);
  const workflowType = forceWorkflowType || classification.suggestedWorkflow;

  switch (workflowType) {
    case 'parallel':
      return executeParallelWorkflow(classification.agents, userMessage);
    case 'sequential':
      return executeSequentialWorkflow(classification.agents, userMessage);
    case 'conditional':
      return executeConditionalWorkflow(classification, userMessage);
    case 'iterative':
      return executeIterativeWorkflow(classification.agents, userMessage);
    case 'hybrid':
      return executeHybridWorkflow(classification, userMessage);
  }
}
```

### 7.3 Intent Classification

```typescript
interface IntentClassification {
  intent: string;
  confidence: number;
  agents: string[];
  suggestedWorkflow: WorkflowType;
  extractedEntities: EntityMap;
}

async function classifyIntent(
  message: string,
  context?: WorkflowContext
): Promise<IntentClassification> {
  // Quick keyword-based classification
  const quick = quickClassify(message);
  if (quick.confidence > 0.8) return quick;

  // LLM-based classification for ambiguous intents
  return classifyIntentLLM(message, context);
}
```

---

## 8. Voice Mode

### 8.1 Voice Edge Function (`sync-voice/index.ts`)

Optimized for real-time voice conversation:

```typescript
// Voice-optimized system prompt
const VOICE_SYSTEM_PROMPT = `You are SYNC, a friendly AI assistant.

CRITICAL VOICE RULES:
- Keep responses SHORT (1-3 sentences max)
- Be warm, natural, and engaging
- Never use markdown or bullet points
- Use contractions naturally (I'm, you're, let's)
- Avoid technical jargon`;

// LLM call with voice optimizations
async function getVoiceResponse(message: string): Promise<string> {
  const response = await fetch('https://api.together.ai/v1/chat/completions', {
    body: JSON.stringify({
      model: 'moonshotai/Kimi-K2-Instruct',
      messages: [...],
      max_tokens: 150,  // Short for voice
      temperature: 0.7,
    }),
  });
  return data.choices[0].message.content;
}

// TTS generation with Orpheus
async function generateSpeech(text: string, voice: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice: voice,  // tara, leah, leo, etc.
      response_format: 'mp3',
    }),
  });
  return await response.arrayBuffer();
}
```

### 8.2 Available Voices

| Voice | Gender | Personality |
|-------|--------|-------------|
| tara | Female | Friendly, default |
| leah | Female | Professional |
| jess | Female | Energetic |
| leo | Male | Calm |
| dan | Male | Authoritative |
| mia | Female | Warm |
| zac | Male | Casual |
| zoe | Female | Cheerful |

### 8.3 Voice Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Browser    │    │  sync-voice  │    │  Together.ai │    │   Browser    │
│  Web Speech  │───▶│  Edge Func   │───▶│   Kimi-K2    │    │   Audio      │
│     API      │    │              │    │   + Orpheus  │───▶│   Playback   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
     STT                 Process              LLM+TTS              Play
```

---

## 9. Third-Party Integrations

### 9.1 Composio Architecture

SYNC integrates with 30+ third-party services via Composio:

```typescript
// Composio action categories
export const COMPOSIO_ACTIONS = [
  // Email Management (Gmail)
  'check_inbox', 'summarize_inbox', 'send_email', 'reply_to_email',
  'draft_email', 'forward_email', 'get_email_details', 'mark_email_read',
  'archive_email', 'search_emails',

  // Slack
  'composio_send_slack_message', 'composio_list_slack_channels',

  // HubSpot CRM
  'composio_create_hubspot_contact', 'composio_create_hubspot_deal',

  // Calendar
  'composio_create_calendar_event', 'composio_list_calendar_events',

  // Productivity
  'composio_create_notion_page', 'composio_create_trello_card',
  'composio_create_asana_task', 'composio_create_linear_issue',

  // MCP Server Management
  'mcp_create_server', 'mcp_list_servers', 'mcp_delete_server', 'mcp_get_url',

  // Generic
  'composio_list_integrations', 'composio_execute_tool',
];
```

### 9.2 Supported Services

| Category | Services |
|----------|----------|
| **CRM & Sales** | HubSpot, Salesforce, Pipedrive, Zoho CRM |
| **Communication** | Slack, Microsoft Teams, Discord, Zoom |
| **Email & Calendar** | Gmail, Google Calendar, Outlook |
| **Project Management** | Notion, Asana, Trello, Jira, Monday.com, ClickUp, Linear |
| **File Storage** | Google Drive, Dropbox, OneDrive, Box |
| **Finance** | QuickBooks, Stripe, Xero |
| **Support** | Zendesk, Intercom, Freshdesk |
| **Social** | LinkedIn, Twitter/X |
| **Developer** | GitHub, Airtable |
| **E-commerce** | Shopify |

### 9.3 MCP Server Support

Model Context Protocol servers allow AI tools to access user integrations:

```typescript
// Create MCP server for Claude Desktop
[ACTION]{"action": "mcp_create_server", "data": {"name": "My Work Tools"}}[/ACTION]

// Get URL for AI tool configuration
[ACTION]{"action": "mcp_get_url", "data": {"server_id": "abc-123"}}[/ACTION]
```

---

## 10. Intelligence Features

### 10.1 Plan-Execute System

For complex tasks, SYNC creates execution plans:

```typescript
interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  entities: ExtractedEntities;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

interface TaskStep {
  id: string;
  action: string;
  data: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'skipped' | 'failed';
  result?: any;
  dependsOn?: string[];
}
```

### 10.2 ReAct Loop

Reasoning + Acting pattern for complex queries:

```typescript
async function executeReActLoop(
  query: string,
  context: ReActContext
): Promise<ReActResult> {
  const steps: ReActStep[] = [];

  while (steps.length < MAX_STEPS) {
    // Thought: What should I do next?
    const thought = await generateThought(query, steps);

    // Action: Execute if needed
    if (thought.requiresAction) {
      const actionResult = await executeAction(thought.action);
      steps.push({ type: 'action', ...actionResult });
    }

    // Observation: What did I learn?
    const observation = await synthesize(steps);

    if (observation.isComplete) {
      return formatResult(steps);
    }
  }
}
```

### 10.3 Proactive Insights

After completing actions, SYNC provides business intelligence:

```typescript
async function generatePostActionInsights(
  action: string,
  result: ActionResult,
  context: ActionContext
): Promise<ProactiveInsight[]> {
  // Financial context
  if (action.includes('invoice')) {
    return [
      `This brings your January revenue to €${total}`,
      `15% higher than your average order`,
    ];
  }

  // Stock alerts
  if (action.includes('inventory')) {
    return [
      `After this order, stock will be at ${remaining} units`,
    ];
  }
}
```

### 10.4 Pattern Learning

SYNC learns from successful interactions:

```typescript
async function learnFromSuccess(
  action: string,
  request: string,
  data: any,
  ctx: ActionContext
): Promise<void> {
  // Save as template for future similar requests
  const embedding = await generateEmbedding(request);

  await ctx.supabase.from('sync_action_templates').upsert({
    action_type: action,
    intent_description: request,
    action_data: data,
    embedding,
    success_count: 1,
  });
}

async function findSimilarPatterns(
  request: string,
  ctx: ActionContext
): Promise<ActionTemplate[]> {
  const embedding = await generateEmbedding(request);

  return ctx.supabase.rpc('match_action_templates', {
    query_embedding: embedding,
    match_threshold: 0.8,
    match_count: 3,
  });
}
```

---

## 11. Deployment & Operations

### 11.1 Edge Function Configuration

```toml
# supabase/config.toml
[functions.sync]
verify_jwt = false

[functions.sync-voice]
verify_jwt = false

[functions.generate-image]
verify_jwt = false
```

### 11.2 Environment Variables

| Variable | Purpose |
|----------|---------|
| `TOGETHER_API_KEY` | Together.ai API (LLM, TTS, Embeddings) |
| `SUPABASE_URL` | Database endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database access |
| `COMPOSIO_API_KEY` | Third-party integrations |

### 11.3 Deployment Commands

```bash
# Deploy SYNC edge function
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase functions deploy sync \
  --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Deploy voice function
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase functions deploy sync-voice \
  --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Update secrets
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase secrets set \
  TOGETHER_API_KEY="your_key" --project-ref sfxpmzicgpaxfntqleig
```

### 11.4 Monitoring

```bash
# View function logs
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase functions logs sync \
  --project-ref sfxpmzicgpaxfntqleig

# Check deployment status
curl -I https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/sync
```

---

## 12. Complete Action Reference

### 12.1 Finance Actions (8)

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_proposal` | Create proposal with items | client_name, items[], tax_percent |
| `create_invoice` | Create invoice with items | client_name, items[], tax_percent |
| `list_invoices` | List with filters | status?, client?, limit? |
| `update_invoice` | Update status | id, status |
| `create_expense` | Log expense | description, amount, category, vendor? |
| `list_expenses` | List expenses | category?, date_from?, date_to? |
| `get_financial_summary` | Revenue/expense summary | period: month/quarter/year |
| `convert_proposal_to_invoice` | Convert proposal | proposal_id |

### 12.2 Products Actions (6)

| Action | Description | Parameters |
|--------|-------------|------------|
| `search_products` | Search by name | query |
| `create_product` | Add new product | name, price, sku?, type? |
| `update_product` | Update details | id/name, updates |
| `update_inventory` | Update stock | name, quantity, adjustment_type |
| `list_products` | List all products | category?, limit? |
| `get_low_stock` | Below threshold | threshold? |

### 12.3 Growth/CRM Actions (9)

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_prospect` | Add lead | first_name, last_name, email, company?, deal_value? |
| `update_prospect` | Update details | id/name, updates |
| `search_prospects` | Search | query |
| `list_prospects` | List with filters | stage?, source?, starred?, limit? |
| `move_pipeline_stage` | Move stage | name/id, stage |
| `get_pipeline_stats` | Pipeline overview | - |
| `create_campaign` | Create campaign | name, type, target_prospects? |
| `list_campaigns` | List campaigns | status?, limit? |
| `update_campaign` | Update campaign | id, updates |

### 12.4 Tasks Actions (8)

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_task` | Create task | title, priority?, due_date?, description? |
| `update_task` | Update task | id/title, updates |
| `assign_task` | Assign to user | id/title, assignee_id/email |
| `list_tasks` | List tasks | status?, priority?, assignee? |
| `complete_task` | Mark complete | id/title |
| `delete_task` | Delete task | id/title |
| `get_my_tasks` | User's tasks | status? |
| `get_overdue_tasks` | Overdue tasks | - |

### 12.5 Inbox Actions (5)

| Action | Description | Parameters |
|--------|-------------|------------|
| `list_conversations` | List chats | limit? |
| `create_conversation` | Start chat | title, participant_ids[] |
| `send_message` | Send message | conversation_id, content |
| `search_messages` | Search history | query |
| `get_unread_count` | Unread count | - |

### 12.6 Team Actions (6)

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_team` | Create team | name, description? |
| `list_teams` | List teams | - |
| `add_team_member` | Add member | team_id/name, user_id/email |
| `remove_team_member` | Remove member | team_id/name, user_id/email |
| `list_team_members` | List members | team_id/name |
| `invite_user` | Send invitation | email, role? |

### 12.7 Learn Actions (4)

| Action | Description | Parameters |
|--------|-------------|------------|
| `list_courses` | List courses | category?, limit? |
| `get_learning_progress` | User progress | - |
| `enroll_course` | Enroll in course | course_id |
| `recommend_courses` | AI recommendations | interests[]? |

### 12.8 Sentinel Actions (3)

| Action | Description | Parameters |
|--------|-------------|------------|
| `register_ai_system` | Register for compliance | name, type, risk_level |
| `list_ai_systems` | List systems | - |
| `get_compliance_status` | EU AI Act status | - |

### 12.9 Create Actions (2)

| Action | Description | Parameters |
|--------|-------------|------------|
| `generate_image` | AI image generation | prompt, product_name?, style?, aspect_ratio? |
| `list_generated_content` | List generated | content_type?, limit? |

### 12.10 Research Actions (2)

| Action | Description | Parameters |
|--------|-------------|------------|
| `web_search` | Search internet | query |
| `lookup_product_info` | Product specs/pricing | product_name, brand?, info_type? |

### 12.11 Composio/Integration Actions (30+)

| Action | Description | Service |
|--------|-------------|---------|
| `check_inbox` | Check emails | Gmail |
| `summarize_inbox` | Inbox summary | Gmail |
| `send_email` | Send email | Gmail |
| `reply_to_email` | Reply to email | Gmail |
| `draft_email` | Create draft | Gmail |
| `forward_email` | Forward email | Gmail |
| `search_emails` | Search emails | Gmail |
| `archive_email` | Archive email | Gmail |
| `composio_send_slack_message` | Send Slack message | Slack |
| `composio_list_slack_channels` | List channels | Slack |
| `composio_create_hubspot_contact` | Create contact | HubSpot |
| `composio_create_hubspot_deal` | Create deal | HubSpot |
| `composio_create_calendar_event` | Create event | Google Calendar |
| `composio_list_calendar_events` | List events | Google Calendar |
| `composio_create_notion_page` | Create page | Notion |
| `composio_create_trello_card` | Create card | Trello |
| `composio_create_asana_task` | Create task | Asana |
| `composio_create_linear_issue` | Create issue | Linear |
| `composio_list_integrations` | List connected apps | Composio |
| `composio_execute_tool` | Generic execution | Any |
| `mcp_create_server` | Create MCP server | MCP |
| `mcp_list_servers` | List MCP servers | MCP |
| `mcp_delete_server` | Delete MCP server | MCP |
| `mcp_get_url` | Get MCP URL | MCP |

---

## Appendix A: File Structure

```
supabase/functions/
├── sync/
│   ├── index.ts                 # Main orchestrator (2,400 lines)
│   ├── tools/
│   │   ├── types.ts             # ActionContext, ActionResult
│   │   ├── finance.ts           # Finance actions
│   │   ├── products.ts          # Product actions
│   │   ├── growth.ts            # CRM actions
│   │   ├── tasks.ts             # Task actions
│   │   ├── inbox.ts             # Inbox actions
│   │   ├── team.ts              # Team actions
│   │   ├── learn.ts             # Learning actions
│   │   ├── sentinel.ts          # Compliance actions
│   │   ├── create.ts            # Image generation
│   │   ├── research.ts          # Web search
│   │   ├── composio.ts          # Third-party integrations (1,587 lines)
│   │   ├── recovery.ts          # Error recovery
│   │   ├── chaining.ts          # Action chaining
│   │   ├── intent.ts            # Intent classification
│   │   ├── proactive.ts         # Proactive insights
│   │   ├── intelligence-orchestrator.ts
│   │   ├── orchestration.ts     # Workflow orchestration
│   │   ├── react.ts             # ReAct loop
│   │   ├── knowledge-graph.ts   # Entity tracking
│   │   ├── synthesis.ts         # Result synthesis
│   │   ├── planner.ts           # Task planning
│   │   ├── executor.ts          # Plan execution
│   │   └── conversation.ts      # Conversation helpers
│   ├── workflows/
│   │   ├── agents.ts            # Specialized agents (534 lines)
│   │   ├── engine.ts            # Workflow engine (547 lines)
│   │   ├── types.ts             # Workflow types
│   │   └── index.ts             # Exports
│   └── memory/
│       ├── session.ts           # Session persistence
│       ├── buffer.ts            # Message summarization
│       ├── entities.ts          # Entity extraction
│       ├── rag.ts               # Vector retrieval
│       ├── actions.ts           # Action templates
│       ├── embeddings.ts        # Together.ai embeddings
│       ├── learning.ts          # Pattern learning
│       ├── types.ts             # Memory types
│       └── index.ts             # Exports
├── sync-voice/
│   └── index.ts                 # Voice endpoint (209 lines)
└── generate-image/
    └── index.ts                 # Image generation

src/components/sync/
├── SyncChat.jsx                 # Chat UI (632 lines)
├── SyncVoiceMode.jsx            # Voice UI (461 lines)
└── ...

src/pages/
└── SyncAgent.jsx                # Full page view
```

---

## Appendix B: LLM Models Used

| Model | Provider | Use Case |
|-------|----------|----------|
| `moonshotai/Kimi-K2-Instruct` | Together.ai | Primary chat, orchestration |
| `deepseek-ai/DeepSeek-R1` | Together.ai | Complex reasoning |
| `meta-llama/Llama-3.3-70B-Instruct-Turbo` | Together.ai | Advanced processing |
| `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` | Together.ai | Fast responses |
| `Qwen/Qwen2.5-Coder-32B-Instruct` | Together.ai | Code generation |
| `Qwen/Qwen2.5-72B-Instruct-Turbo` | Together.ai | Large context |
| `BAAI/bge-large-en-v1.5` | Together.ai | Embeddings (1024d) |
| `canopylabs/orpheus-3b-0.1-ft` | Together.ai | Text-to-Speech |
| `black-forest-labs/FLUX.1-Kontext-pro` | Together.ai | Product images |
| `black-forest-labs/FLUX.1.1-pro` | Together.ai | Marketing images |
| `black-forest-labs/FLUX.1-schnell` | Together.ai | Quick drafts |

---

*End of SYNC Architecture Report*

**Document Statistics:**
- Total sections: 12
- Action count: 51+
- Specialized agents: 13
- Supported integrations: 30+
- Lines of code analyzed: ~8,000+
