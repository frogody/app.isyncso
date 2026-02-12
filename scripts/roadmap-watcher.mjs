#!/usr/bin/env node
/**
 * Roadmap Auto-Build Watcher for iSyncSO
 *
 * Watches roadmap_items for tasks queued for auto-build (auto_queued=true).
 * When found, launches Claude Code CLI to execute the task autonomously.
 *
 * Start:  node scripts/roadmap-watcher.mjs
 * Stop:   Ctrl+C
 */

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SUPABASE_URL = 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
let isWorking = false;
let currentItemId = null;

// ─── Logging ───────────────────────────────────────────────────
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
const logErr = (msg) => console.error(`[${new Date().toLocaleTimeString()}] ❌ ${msg}`);

// ─── Build Claude prompt from roadmap item ─────────────────────
function buildPrompt(item) {
  const lines = [
    `## Roadmap Task: ${item.title}`,
    '',
    `**Module:** ${item.category}`,
    `**Priority:** ${item.priority}`,
    `**Status:** ${item.status}`,
  ];

  if (item.description) {
    lines.push('', '**Description:**', item.description);
  }

  if (item.files_affected?.length) {
    lines.push('', '**Files to look at / modify:**');
    item.files_affected.forEach(f => lines.push(`- \`${f}\``));
  }

  if (item.tags?.length) {
    lines.push('', `**Tags:** ${item.tags.join(', ')}`);
  }

  if (item.subtasks?.length) {
    const pending = item.subtasks.filter(s => !s.done);
    if (pending.length) {
      lines.push('', '**Subtasks to complete:**');
      pending.forEach(s => lines.push(`- [ ] ${s.text}`));
    }
  }

  if (item.depends_on?.length) {
    lines.push('', `**Dependencies (must be done first):** ${item.depends_on.join(', ')}`);
  }

  lines.push(
    '',
    '**Instructions:**',
    '1. Read the relevant files and understand the current state',
    '2. Implement the feature/fix described above',
    '3. Test that it works (check for import errors, syntax, etc.)',
    `4. Commit changes with message: [${item.category}] ${item.title}`,
    '5. Push to main for Vercel auto-deploy',
    '',
    'Work autonomously. Do not ask questions — make reasonable decisions.',
  );

  return lines.join('\n');
}

// ─── Process a single item ─────────────────────────────────────
async function processItem(item) {
  isWorking = true;
  currentItemId = item.id;
  log(`🔨 Starting: "${item.title}" [${item.category}] (${item.priority})`);

  // Mark as in_progress
  await supabase.from('roadmap_items').update({
    status: 'in_progress',
    history: [
      ...(item.history || []),
      { action: 'Auto-build started by watcher', actor: 'claude', at: new Date().toISOString() },
    ],
  }).eq('id', item.id);

  const prompt = buildPrompt(item);

  return new Promise((resolve) => {
    const claude = spawn('claude', ['-p', '--verbose', prompt], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, TERM: 'dumb' },
    });

    let stdout = '';
    let stderr = '';
    const MAX_OUTPUT = 4000;

    claude.stdout.on('data', (d) => {
      const chunk = d.toString();
      stdout += chunk;
      // Print live output
      process.stdout.write(chunk);
    });

    claude.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const timeout = setTimeout(() => {
      log(`⏰ Task timed out after 10 minutes, killing...`);
      claude.kill('SIGTERM');
    }, 10 * 60 * 1000);

    claude.on('close', async (code) => {
      clearTimeout(timeout);
      const success = code === 0;
      const output = (stdout || stderr).slice(-MAX_OUTPUT);

      log(success ? `✅ Completed: "${item.title}"` : `⚠️ Failed (exit ${code}): "${item.title}"`);

      // Update the roadmap item
      await supabase.from('roadmap_items').update({
        status: success ? 'review' : 'in_progress',
        auto_queued: false,
        comments: [
          ...(item.comments || []),
          {
            content: [
              `**Auto-build ${success ? 'completed' : 'failed'}** (exit code ${code})`,
              '',
              '```',
              output.slice(-2000) || '(no output captured)',
              '```',
            ].join('\n'),
            author: 'claude',
            created_at: new Date().toISOString(),
          },
        ],
        history: [
          ...(item.history || []),
          {
            action: `Auto-build ${success ? 'completed' : 'failed (exit ' + code + ')'}`,
            actor: 'claude',
            at: new Date().toISOString(),
          },
        ],
      }).eq('id', item.id);

      isWorking = false;
      currentItemId = null;
      resolve(success);
    });

    claude.on('error', async (err) => {
      clearTimeout(timeout);
      logErr(`Failed to spawn claude: ${err.message}`);
      logErr('Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code');

      await supabase.from('roadmap_items').update({
        auto_queued: false,
        history: [
          ...(item.history || []),
          { action: `Auto-build error: ${err.message}`, actor: 'claude', at: new Date().toISOString() },
        ],
      }).eq('id', item.id);

      isWorking = false;
      currentItemId = null;
      resolve(false);
    });
  });
}

// ─── Check for queued work ─────────────────────────────────────
async function checkForWork() {
  if (isWorking) return;

  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('auto_queued', true)
    .in('status', ['requested', 'planned'])
    .order('created_at', { ascending: true });

  if (error) { logErr(`Query failed: ${error.message}`); return; }
  if (!items?.length) return;

  // Sort by priority
  items.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const next = items[0];
  log(`📋 Found ${items.length} queued task(s). Next: "${next.title}" (${next.priority})`);

  await processItem(next);

  // After finishing, check for more
  setTimeout(checkForWork, 2000);
}

// ─── Realtime subscription ─────────────────────────────────────
supabase.channel('roadmap-watcher')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'roadmap_items',
    filter: 'auto_queued=eq.true',
  }, () => {
    log('📡 Realtime: item queued, checking...');
    checkForWork();
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') log('📡 Realtime subscription active');
  });

// ─── Heartbeat (write to DB so UI knows watcher is alive) ──────
async function heartbeat() {
  // Use a simple upsert to a settings-like approach
  // We'll write to roadmap_items metadata or use localStorage approach
  // For now, just log
  log(`💓 Heartbeat — ${isWorking ? `working on ${currentItemId}` : 'idle, waiting for tasks'}`);
}

setInterval(heartbeat, 60000);

// ─── Poll fallback (in case realtime misses something) ─────────
setInterval(checkForWork, 30000);

// ─── Startup ───────────────────────────────────────────────────
log('');
log('╔══════════════════════════════════════════════════╗');
log('║  🤖 iSyncSO Roadmap Auto-Build Watcher          ║');
log('║                                                  ║');
log('║  Watching for queued tasks...                    ║');
log('║  Queue tasks from /admin/roadmap in the browser  ║');
log('║                                                  ║');
log('║  Press Ctrl+C to stop                            ║');
log('╚══════════════════════════════════════════════════╝');
log('');

checkForWork();

// ─── Graceful shutdown ─────────────────────────────────────────
process.on('SIGINT', () => {
  log('👋 Shutting down watcher...');
  if (currentItemId) {
    log(`⚠️ Task ${currentItemId} was in progress — it will remain "in_progress" in the roadmap.`);
  }
  process.exit(0);
});
