#!/usr/bin/env node
/**
 * iSyncSO Worker Agent
 *
 * Remote-friendly worker that claims tasks from roadmap_items,
 * builds them via Claude Code CLI, creates GitHub branches + PRs,
 * and reports everything back to Supabase.
 *
 * Designed to run on DigitalOcean droplets with OpenClaw keeping it alive.
 *
 * Usage:
 *   node scripts/worker-agent.mjs --agent-id=builder-1
 *   node scripts/worker-agent.mjs --agent-id=builder-1 --capabilities=build,test
 *   node scripts/worker-agent.mjs --agent-id=security-scanner --type=security
 *
 * Env vars:
 *   SUPABASE_URL          (defaults to iSyncSO project)
 *   SUPABASE_SERVICE_KEY   (defaults to iSyncSO service key)
 *   GITHUB_TOKEN           (required for PR creation)
 */

import { createClient } from '@supabase/supabase-js';
import { spawn, execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ─── CLI Args ────────────────────────────────────────────────
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const [key, val] = arg.replace(/^--/, '').split('=');
    args[key] = val || true;
  });
  return args;
}

const cliArgs = parseArgs();
const AGENT_ID = cliArgs['agent-id'] || `builder-${Date.now()}`;
const AGENT_TYPE = cliArgs['type'] || 'builder';
const CAPABILITIES = (cliArgs['capabilities'] || 'build,test,deploy').split(',');
const MACHINE_URL = cliArgs['machine-url'] || getMachineUrl();
const TIMEOUT_MS = parseInt(cliArgs['timeout'] || '600000'); // 10 min default

function getMachineUrl() {
  try {
    const hostname = execSync('hostname', { encoding: 'utf8' }).trim();
    return `local://${hostname}`;
  } catch { return 'local://unknown'; }
}

// ─── Supabase ────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = 'frogody/app.isyncso';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
let isWorking = false;
let currentItemId = null;
let currentItem = null;

// ─── Logging ─────────────────────────────────────────────────
const ts = () => new Date().toISOString().substring(11, 19);
const log = (msg) => console.log(`[${ts()}] [${AGENT_ID}] ${msg}`);
const logErr = (msg) => console.error(`[${ts()}] [${AGENT_ID}] ${msg}`);

// ─── Activity Logging (to DB) ────────────────────────────────
async function logActivity(action, message, opts = {}) {
  const { severity = 'info', roadmapItemId = null, details = {}, durationMs = null } = opts;
  try {
    await supabase.from('agent_activity_log').insert({
      agent_id: AGENT_ID,
      roadmap_item_id: roadmapItemId,
      action,
      severity,
      message,
      details,
      duration_ms: durationMs,
    });
  } catch (err) {
    logErr(`Failed to log activity: ${err.message}`);
  }
}

// ─── Agent Registration ──────────────────────────────────────
async function registerAgent() {
  const { error } = await supabase.from('agent_registry').upsert({
    id: AGENT_ID,
    name: AGENT_ID.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    agent_type: AGENT_TYPE,
    status: 'idle',
    machine_url: MACHINE_URL,
    last_heartbeat: new Date().toISOString(),
    capabilities: CAPABILITIES,
    config: { timeout_ms: TIMEOUT_MS, pid: process.pid },
  }, { onConflict: 'id' });

  if (error) {
    logErr(`Registration failed: ${error.message}`);
    return false;
  }
  log(`Registered as ${AGENT_TYPE} agent`);
  await logActivity('agent_started', `Agent ${AGENT_ID} started on ${MACHINE_URL}`);
  return true;
}

// ─── Heartbeat ───────────────────────────────────────────────
async function heartbeat() {
  const status = isWorking ? 'working' : 'idle';
  await supabase.from('agent_registry').update({
    status,
    current_task_id: currentItemId,
    last_heartbeat: new Date().toISOString(),
  }).eq('id', AGENT_ID);

  log(`Heartbeat: ${status}${currentItemId ? ` (task: ${currentItemId})` : ''}`);
}

// ─── Git Operations ──────────────────────────────────────────
function gitExec(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 30000 }).trim();
  } catch (err) {
    logErr(`Git error: ${err.message}`);
    return null;
  }
}

function createBranch(item) {
  const slug = item.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const branchName = `roadmap/${item.id.substring(0, 8)}-${slug}`;

  // Ensure we're on latest main
  gitExec('git checkout main');
  gitExec('git pull origin main');

  // Create and checkout branch
  gitExec(`git checkout -b ${branchName}`);
  log(`Created branch: ${branchName}`);
  return branchName;
}

function pushBranch(branchName) {
  const result = gitExec(`git push -u origin ${branchName}`);
  if (result !== null) {
    log(`Pushed branch: ${branchName}`);
    return true;
  }
  return false;
}

// ─── GitHub PR Creation ──────────────────────────────────────
async function createPullRequest(item, branchName, buildOutput) {
  if (!GITHUB_TOKEN) {
    log('No GITHUB_TOKEN set, skipping PR creation');
    return null;
  }

  const prTitle = `[${item.category}] ${item.title}`;
  const prBody = [
    `## Roadmap Task`,
    `- **Module:** ${item.category}`,
    `- **Priority:** ${item.priority}`,
    `- **Agent:** ${AGENT_ID}`,
    '',
    item.description || '',
    '',
    '---',
    '### Build Output (last 1000 chars)',
    '```',
    (buildOutput || '').slice(-1000),
    '```',
    '',
    `Built by iSyncSO Worker Agent \`${AGENT_ID}\``,
  ].join('\n');

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'main',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logErr(`PR creation failed: ${res.status} ${err}`);
      return null;
    }

    const pr = await res.json();
    log(`Created PR #${pr.number}: ${pr.html_url}`);

    // Save to github_pull_requests table
    await supabase.from('github_pull_requests').insert({
      roadmap_item_id: item.id,
      agent_id: AGENT_ID,
      pr_number: pr.number,
      branch_name: branchName,
      title: prTitle,
      body: prBody,
      status: 'open',
      github_url: pr.html_url,
    });

    return pr;
  } catch (err) {
    logErr(`PR creation error: ${err.message}`);
    return null;
  }
}

// ─── Build Prompt ────────────────────────────────────────────
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
    '5. Do NOT push — the worker agent handles git push and PR creation',
    '',
    'Work autonomously. Do not ask questions — make reasonable decisions.',
  );

  return lines.join('\n');
}

// ─── Claim a Task (atomic) ───────────────────────────────────
async function claimTask() {
  // Find unclaimed queued tasks
  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .eq('auto_queued', true)
    .is('assigned_agent', null)
    .in('status', ['requested', 'planned'])
    .order('created_at', { ascending: true });

  if (error) { logErr(`Query failed: ${error.message}`); return null; }
  if (!items?.length) return null;

  // Sort by priority
  items.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  // Try to atomically claim the highest priority task
  for (const item of items) {
    const { data, error: claimError } = await supabase
      .from('roadmap_items')
      .update({
        assigned_agent: AGENT_ID,
        status: 'in_progress',
        history: [
          ...(item.history || []),
          { action: `Claimed by ${AGENT_ID}`, actor: AGENT_ID, at: new Date().toISOString() },
        ],
      })
      .eq('id', item.id)
      .is('assigned_agent', null) // Only succeed if still unclaimed
      .select()
      .single();

    if (claimError || !data) {
      // Another worker claimed it first, try next
      continue;
    }

    log(`Claimed: "${item.title}" [${item.category}] (${item.priority})`);
    return data;
  }

  return null;
}

// ─── Process a Task ──────────────────────────────────────────
async function processItem(item) {
  isWorking = true;
  currentItemId = item.id;
  currentItem = item;
  const startTime = Date.now();

  log(`Starting: "${item.title}" [${item.category}] (${item.priority})`);
  await logActivity('started_task', `Started: ${item.title}`, {
    roadmapItemId: item.id,
    details: { category: item.category, priority: item.priority },
  });

  // Update agent status
  await supabase.from('agent_registry').update({
    status: 'working',
    current_task_id: item.id,
  }).eq('id', AGENT_ID);

  // Create git branch
  const branchName = createBranch(item);

  // Update roadmap item with branch info
  await supabase.from('roadmap_items').update({
    branch_name: branchName,
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
      process.stdout.write(chunk);
    });

    claude.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const timeout = setTimeout(() => {
      log(`Task timed out after ${TIMEOUT_MS / 1000}s, killing...`);
      claude.kill('SIGTERM');
    }, TIMEOUT_MS);

    claude.on('close', async (code) => {
      clearTimeout(timeout);
      const success = code === 0;
      const durationMs = Date.now() - startTime;
      const output = (stdout || stderr).slice(-MAX_OUTPUT);

      log(success ? `Completed: "${item.title}" (${durationMs}ms)` : `Failed (exit ${code}): "${item.title}"`);

      // Push branch and create PR if successful
      let pr = null;
      if (success) {
        const pushed = pushBranch(branchName);
        if (pushed) {
          pr = await createPullRequest(item, branchName, output);
        }
      }

      // Update roadmap item
      await supabase.from('roadmap_items').update({
        status: success ? 'review' : 'in_progress',
        auto_queued: false,
        pr_number: pr?.number || null,
        github_url: pr?.html_url || null,
        comments: [
          ...(item.comments || []),
          {
            content: [
              `**Auto-build ${success ? 'completed' : 'failed'}** by \`${AGENT_ID}\` (exit code ${code})`,
              pr ? `\n**PR:** [#${pr.number}](${pr.html_url})` : '',
              '',
              '```',
              output.slice(-2000) || '(no output captured)',
              '```',
            ].join('\n'),
            author: AGENT_ID,
            created_at: new Date().toISOString(),
          },
        ],
        history: [
          ...(item.history || []),
          {
            action: `Auto-build ${success ? 'completed' : 'failed (exit ' + code + ')'}${pr ? ' — PR #' + pr.number : ''}`,
            actor: AGENT_ID,
            at: new Date().toISOString(),
          },
        ],
      }).eq('id', item.id);

      // Log activity
      await logActivity(
        success ? 'completed_task' : 'failed_task',
        `${success ? 'Completed' : 'Failed'}: ${item.title}`,
        {
          severity: success ? 'info' : 'error',
          roadmapItemId: item.id,
          durationMs,
          details: {
            exit_code: code,
            branch: branchName,
            pr_number: pr?.number,
            output_tail: output.slice(-500),
          },
        }
      );

      // Update agent metrics
      const { data: agent } = await supabase
        .from('agent_registry')
        .select('metrics')
        .eq('id', AGENT_ID)
        .single();

      const metrics = agent?.metrics || { tasks_completed: 0, avg_duration_ms: 0, error_count: 0 };
      const newCompleted = metrics.tasks_completed + 1;
      const newAvg = Math.round(
        (metrics.avg_duration_ms * metrics.tasks_completed + durationMs) / newCompleted
      );

      await supabase.from('agent_registry').update({
        status: 'idle',
        current_task_id: null,
        metrics: {
          tasks_completed: newCompleted,
          avg_duration_ms: newAvg,
          error_count: metrics.error_count + (success ? 0 : 1),
        },
      }).eq('id', AGENT_ID);

      // Switch back to main
      gitExec('git checkout main');

      isWorking = false;
      currentItemId = null;
      currentItem = null;
      resolve(success);
    });

    claude.on('error', async (err) => {
      clearTimeout(timeout);
      logErr(`Failed to spawn claude: ${err.message}`);

      await supabase.from('roadmap_items').update({
        auto_queued: false,
        assigned_agent: null,
        history: [
          ...(item.history || []),
          { action: `Agent error: ${err.message}`, actor: AGENT_ID, at: new Date().toISOString() },
        ],
      }).eq('id', item.id);

      await logActivity('agent_error', `Spawn error: ${err.message}`, {
        severity: 'error',
        roadmapItemId: item.id,
      });

      await supabase.from('agent_registry').update({
        status: 'error',
        current_task_id: null,
      }).eq('id', AGENT_ID);

      gitExec('git checkout main');
      isWorking = false;
      currentItemId = null;
      currentItem = null;
      resolve(false);
    });
  });
}

// ─── Work Loop ───────────────────────────────────────────────
async function checkForWork() {
  if (isWorking) return;

  const item = await claimTask();
  if (!item) return;

  await processItem(item);

  // After finishing, check for more
  setTimeout(checkForWork, 3000);
}

// ─── Realtime Subscription ───────────────────────────────────
supabase.channel(`worker-${AGENT_ID}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'roadmap_items',
    filter: 'auto_queued=eq.true',
  }, () => {
    log('Realtime: item queued, checking...');
    checkForWork();
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') log('Realtime subscription active');
  });

// ─── Heartbeat interval ─────────────────────────────────────
setInterval(heartbeat, 30000);

// ─── Poll fallback ───────────────────────────────────────────
setInterval(checkForWork, 30000);

// ─── Startup ─────────────────────────────────────────────────
async function main() {
  log('');
  log('╔═══════════════════════════════════════════════════════╗');
  log('║  iSyncSO Worker Agent                                ║');
  log(`║  ID: ${AGENT_ID.padEnd(47)}║`);
  log(`║  Type: ${AGENT_TYPE.padEnd(45)}║`);
  log(`║  Machine: ${MACHINE_URL.substring(0, 42).padEnd(42)}║`);
  log('║                                                       ║');
  log('║  Watching for queued tasks...                         ║');
  log('║  Press Ctrl+C to stop                                 ║');
  log('╚═══════════════════════════════════════════════════════╝');
  log('');

  const registered = await registerAgent();
  if (!registered) {
    logErr('Failed to register agent. Exiting.');
    process.exit(1);
  }

  // Initial check
  checkForWork();
}

main();

// ─── Graceful Shutdown ───────────────────────────────────────
async function shutdown() {
  log('Shutting down...');

  // Release any claimed task
  if (currentItemId) {
    log(`Releasing task ${currentItemId}...`);
    await supabase.from('roadmap_items').update({
      assigned_agent: null,
      status: 'planned',
      history: [
        ...(currentItem?.history || []),
        { action: `Released by ${AGENT_ID} (shutdown)`, actor: AGENT_ID, at: new Date().toISOString() },
      ],
    }).eq('id', currentItemId);
  }

  // Mark offline
  await supabase.from('agent_registry').update({
    status: 'offline',
    current_task_id: null,
  }).eq('id', AGENT_ID);

  await logActivity('agent_stopped', `Agent ${AGENT_ID} shutting down`);

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
