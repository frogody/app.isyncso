# Orchestra — Claude Code Orchestration System

## Decision Flow

Every incoming request follows this pipeline:

```
REQUEST IN
    |
    v
[1. ANALYZE] — What is being asked? Which modules are affected?
    |
    v
[2. DECOMPOSE] — Break into atomic subtasks with clear acceptance criteria
    |
    v
[3. ROUTE] — Assign each subtask to the right agent based on scope
    |
    v
[4. CONFLICT CHECK] — Does this collide with any active/queued work?
    |           |
    | (clean)   | (conflict)
    v           v
[5. EXECUTE]  [5. HOLD + REPORT] — Flag dependency, reorder, or ask user
    |
    v
[6. REPORT] — Status table with what changed, what's next, what's blocked
```

## Rules

1. **One agent per subtask.** Never let a subtask span multiple agent scopes.
2. **Agents cannot touch files outside their scope.** Hard boundary.
3. **Conflicts halt execution.** If two agents need the same file, the second task queues until the first completes.
4. **Changelog is append-only.** Every action gets logged. No edits, no deletions.
5. **Tasks track state.** Every task is `pending → active → done | blocked | cancelled`.
6. **Dependencies are explicit.** If task B needs task A, it's recorded in `tasks.md`.

## Quick Commands

| Command | What it does |
|---------|-------------|
| `status` | Print current agent workloads + task board |
| `reprioritize` | Reorder the task queue |
| `pause <task-id>` | Move a task from active to paused |
| `resume <task-id>` | Unpause a task |
| `assign <task-id> <agent>` | Reassign a task to a different agent |
| `changelog` | Show recent changelog entries |
| `conflicts` | Show any active file/scope conflicts |

## File Map

```
.orchestra/
  config.md        — This file. Rules and decision flow.
  state.json       — Persistent brain. Agents, tasks, dependencies, decision log (machine-readable).
  agents.md        — Agent registry. Scopes, owners, file boundaries (human-readable).
  tasks.md         — Task board. All work items with state and dependencies (human-readable).
  inbox.md         — Drop zone for new requests. Orchestrator processes these.
  changelog.md     — Append-only log of every action taken.
```

## Self-Heal Rule

Before starting any new work, the orchestrator reads `state.json` and cross-checks against reality:
- Are listed files still there?
- Do task statuses match actual code state?
- Any orphaned agents or tasks?

If out of sync, fix `state.json` first, log the correction in `changelog.md`, then proceed.
