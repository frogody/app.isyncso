/**
 * SYNC Conversation Layer
 *
 * Generates human-like, varied responses that make SYNC feel
 * like a real co-worker rather than a robotic assistant.
 */

// =============================================================================
// Response Templates - Varied Language Patterns
// =============================================================================

export const CONVERSATION_PATTERNS = {
  // =========================================================================
  // Task Acknowledgment - When user gives a task
  // =========================================================================
  taskAcknowledge: [
    "On it!",
    "Got it!",
    "Sure thing!",
    "Absolutely!",
    "Right away!",
    "Let me handle that.",
    "I'm on it!",
    "Consider it done!",
    "Working on it!",
    "Let's do it!",
  ],

  // =========================================================================
  // Plan Presentation - Showing the plan before execution
  // =========================================================================
  planIntro: [
    "Here's my plan:",
    "Here's what I'll do:",
    "My approach:",
    "I'll handle this in a few steps:",
    "Let me break this down:",
    "Here's how I'll tackle this:",
  ],

  planConfirmation: [
    "Sound good? I'll get started!",
    "Ready to proceed?",
    "Should I go ahead?",
    "Want me to proceed?",
    "Let me know if this looks right!",
    "All good? Starting now!",
  ],

  // =========================================================================
  // Step Announcements - Before executing a step
  // =========================================================================
  stepStart: {
    search: [
      "Let me find {{target}}...",
      "Searching for {{target}}...",
      "Looking up {{target}}...",
      "Finding {{target}}...",
      "Let me look for {{target}}...",
    ],
    create: [
      "Creating {{target}}...",
      "Setting up {{target}}...",
      "Building {{target}}...",
      "Putting together {{target}}...",
    ],
    send: [
      "Sending {{target}}...",
      "Delivering {{target}}...",
      "Getting {{target}} out...",
    ],
    update: [
      "Updating {{target}}...",
      "Making changes to {{target}}...",
      "Modifying {{target}}...",
    ],
    schedule: [
      "Scheduling {{target}}...",
      "Setting up {{target}}...",
      "Adding {{target}} to calendar...",
    ],
    general: [
      "Working on {{target}}...",
      "Handling {{target}}...",
      "Taking care of {{target}}...",
    ],
  },

  // =========================================================================
  // Step Completion - After successful step
  // =========================================================================
  stepComplete: {
    search: [
      "Found {{result}}!",
      "Got it! {{result}}",
      "Here it is: {{result}}",
      "Located {{result}}!",
    ],
    create: [
      "Created {{result}}!",
      "Done! {{result}} is ready.",
      "{{result}} created successfully!",
      "All set! {{result}}",
    ],
    send: [
      "Sent!",
      "Delivered!",
      "{{result}} sent successfully!",
      "On its way!",
    ],
    update: [
      "Updated!",
      "Changes saved!",
      "{{result}} updated!",
      "Done!",
    ],
    general: [
      "Done!",
      "Completed!",
      "All done!",
      "That's sorted!",
    ],
  },

  // =========================================================================
  // Step Progress - For longer operations
  // =========================================================================
  stepProgress: [
    "Still working on it...",
    "Almost there...",
    "Just a moment...",
    "Processing...",
    "Hang tight...",
  ],

  // =========================================================================
  // Task Completion - Full task done
  // =========================================================================
  taskComplete: [
    "All done!",
    "That's everything!",
    "Done and dusted!",
    "All sorted!",
    "Everything's taken care of!",
    "Finished!",
    "Complete!",
    "All wrapped up!",
  ],

  taskCompleteWithSummary: [
    "All done! Here's what I did:",
    "That's everything! Quick summary:",
    "Done! Here's the recap:",
    "Finished! Summary below:",
    "All sorted! Here's what happened:",
  ],

  // =========================================================================
  // Clarification Requests
  // =========================================================================
  clarification: [
    "Quick question - {{question}}",
    "Before I continue, {{question}}",
    "I want to make sure I get this right. {{question}}",
    "Just to clarify, {{question}}",
    "One thing - {{question}}",
  ],

  missingInfo: [
    "I need a bit more info. {{question}}",
    "Can you help me with something? {{question}}",
    "I'm missing something. {{question}}",
    "To do this, I'll need to know: {{question}}",
  ],

  // =========================================================================
  // Problems / Failures
  // =========================================================================
  problem: [
    "Hmm, ran into a snag. {{issue}}",
    "Small hiccup - {{issue}}",
    "Oops, {{issue}}",
    "Had a bit of trouble. {{issue}}",
    "Something's not quite right. {{issue}}",
  ],

  suggestion: [
    "Want me to {{suggestion}}?",
    "Should I try {{suggestion}}?",
    "I can {{suggestion}} instead.",
    "How about I {{suggestion}}?",
    "Maybe I could {{suggestion}}?",
  ],

  recovery: [
    "Let me try something else...",
    "Trying a different approach...",
    "One more attempt...",
    "Let me work around this...",
  ],

  // =========================================================================
  // Agent Handoff - When switching agents
  // =========================================================================
  handoff: [
    "Passing this to {{agent}} to {{action}}...",
    "Let me get {{agent}} to help with {{action}}...",
    "Bringing in {{agent}} for {{action}}...",
    "{{agent}} will handle {{action}}...",
  ],

  // =========================================================================
  // Waiting / Checkpoints
  // =========================================================================
  checkpoint: [
    "About to {{action}}. Continue?",
    "Ready to {{action}}. Should I proceed?",
    "Next step is to {{action}}. Go ahead?",
    "I'm going to {{action}}. That okay?",
  ],

  waiting: [
    "Waiting for your input...",
    "Let me know when you're ready.",
    "Standing by...",
    "Ready when you are.",
  ],

  // =========================================================================
  // Next Steps Suggestions
  // =========================================================================
  nextSteps: [
    "Anything else you need?",
    "What else can I help with?",
    "Need anything else?",
    "Is there something else I can do?",
    "What's next?",
  ],

  proactiveSuggestion: [
    "By the way, {{suggestion}}",
    "Just a thought - {{suggestion}}",
    "You might also want to {{suggestion}}",
    "While you're at it, {{suggestion}}",
  ],

  // =========================================================================
  // Greetings (Time-based)
  // =========================================================================
  greeting: {
    morning: [
      "Good morning!",
      "Morning!",
      "Hey, good morning!",
    ],
    afternoon: [
      "Good afternoon!",
      "Hey there!",
      "Hi!",
    ],
    evening: [
      "Good evening!",
      "Hey!",
      "Hi there!",
    ],
  },

  // =========================================================================
  // Acknowledgments
  // =========================================================================
  understood: [
    "Got it.",
    "Understood.",
    "Makes sense.",
    "Okay!",
    "Right.",
    "Sure.",
  ],

  thanks: [
    "No problem!",
    "Happy to help!",
    "Anytime!",
    "You got it!",
    "Of course!",
  ],
};

// =============================================================================
// Response Generation Functions
// =============================================================================

/**
 * Pick a random item from an array
 */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Fill template with values
 */
function fillTemplate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a task acknowledgment message
 */
export function getTaskAck(): string {
  return pickRandom(CONVERSATION_PATTERNS.taskAcknowledge);
}

/**
 * Get a plan intro message
 */
export function getPlanIntro(): string {
  return pickRandom(CONVERSATION_PATTERNS.planIntro);
}

/**
 * Get a plan confirmation message
 */
export function getPlanConfirmation(): string {
  return pickRandom(CONVERSATION_PATTERNS.planConfirmation);
}

/**
 * Get a step start announcement
 */
export function getStepStartMessage(action: string, target: string): string {
  const actionType = getActionType(action);
  const templates = CONVERSATION_PATTERNS.stepStart[actionType] ||
                    CONVERSATION_PATTERNS.stepStart.general;
  return fillTemplate(pickRandom(templates), { target });
}

/**
 * Get a step completion message
 */
export function getStepCompleteMessage(action: string, result: string): string {
  const actionType = getActionType(action);
  const templates = CONVERSATION_PATTERNS.stepComplete[actionType] ||
                    CONVERSATION_PATTERNS.stepComplete.general;
  return fillTemplate(pickRandom(templates), { result });
}

/**
 * Get a task completion message
 */
export function getTaskCompleteMessage(withSummary: boolean = true): string {
  if (withSummary) {
    return pickRandom(CONVERSATION_PATTERNS.taskCompleteWithSummary);
  }
  return pickRandom(CONVERSATION_PATTERNS.taskComplete);
}

/**
 * Get a clarification request
 */
export function getClarificationMessage(question: string): string {
  return fillTemplate(pickRandom(CONVERSATION_PATTERNS.clarification), { question });
}

/**
 * Get a problem message with suggestion
 */
export function getProblemMessage(issue: string, suggestion?: string): string {
  let message = fillTemplate(pickRandom(CONVERSATION_PATTERNS.problem), { issue });
  if (suggestion) {
    message += ' ' + fillTemplate(pickRandom(CONVERSATION_PATTERNS.suggestion), { suggestion });
  }
  return message;
}

/**
 * Get an agent handoff message
 */
export function getHandoffMessage(agentName: string, action: string): string {
  return fillTemplate(pickRandom(CONVERSATION_PATTERNS.handoff), { agent: agentName, action });
}

/**
 * Get a checkpoint message
 */
export function getCheckpointMessage(action: string): string {
  return fillTemplate(pickRandom(CONVERSATION_PATTERNS.checkpoint), { action });
}

/**
 * Get a next steps message
 */
export function getNextStepsMessage(): string {
  return pickRandom(CONVERSATION_PATTERNS.nextSteps);
}

/**
 * Get a time-appropriate greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return pickRandom(CONVERSATION_PATTERNS.greeting.morning);
  } else if (hour < 17) {
    return pickRandom(CONVERSATION_PATTERNS.greeting.afternoon);
  } else {
    return pickRandom(CONVERSATION_PATTERNS.greeting.evening);
  }
}

/**
 * Get a proactive suggestion
 */
export function getProactiveSuggestion(suggestion: string): string {
  return fillTemplate(pickRandom(CONVERSATION_PATTERNS.proactiveSuggestion), { suggestion });
}

// =============================================================================
// Helper Functions
// =============================================================================

type ActionType = 'search' | 'create' | 'send' | 'update' | 'schedule' | 'general';

function getActionType(action: string): ActionType {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes('search') || lowerAction.includes('find') ||
      lowerAction.includes('list') || lowerAction.includes('get')) {
    return 'search';
  }
  if (lowerAction.includes('create') || lowerAction.includes('make') ||
      lowerAction.includes('generate') || lowerAction.includes('add')) {
    return 'create';
  }
  if (lowerAction.includes('send') || lowerAction.includes('email') ||
      lowerAction.includes('notify')) {
    return 'send';
  }
  if (lowerAction.includes('update') || lowerAction.includes('edit') ||
      lowerAction.includes('modify') || lowerAction.includes('change')) {
    return 'update';
  }
  if (lowerAction.includes('schedule') || lowerAction.includes('calendar') ||
      lowerAction.includes('event') || lowerAction.includes('remind')) {
    return 'schedule';
  }
  return 'general';
}

// =============================================================================
// Message Formatting
// =============================================================================

/**
 * Format a complete task response with plan and progress
 */
export function formatTaskResponse(options: {
  acknowledgment?: boolean;
  greeting?: boolean;
  plan?: string[];
  progress?: string[];
  summary?: string[];
  nextSteps?: boolean;
}): string {
  const parts: string[] = [];

  if (options.greeting) {
    parts.push(getGreeting());
  }

  if (options.acknowledgment) {
    parts.push(getTaskAck());
  }

  if (options.plan && options.plan.length > 0) {
    parts.push('');
    parts.push(getPlanIntro());
    options.plan.forEach((step, i) => {
      parts.push(`${i + 1}. ${step}`);
    });
    parts.push('');
    parts.push(getPlanConfirmation());
  }

  if (options.progress && options.progress.length > 0) {
    parts.push('');
    parts.push('---');
    parts.push('');
    options.progress.forEach(p => parts.push(p));
  }

  if (options.summary && options.summary.length > 0) {
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(getTaskCompleteMessage(true));
    options.summary.forEach(s => parts.push(`• ${s}`));
  }

  if (options.nextSteps) {
    parts.push('');
    parts.push(getNextStepsMessage());
  }

  return parts.join('\n');
}

// =============================================================================
// Agent Name Formatting
// =============================================================================

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  finance: 'Finance team',
  growth: 'Growth team',
  products: 'Products team',
  tasks: 'Tasks team',
  inbox: 'Inbox',
  team: 'Team management',
  learn: 'Learning',
  sentinel: 'Compliance',
  create: 'Creative team',
  research: 'Research',
  composio: 'Integrations',
  orchestrator: 'SYNC',
};

export function getAgentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId] || agentId;
}

// =============================================================================
// Emoji Helpers
// =============================================================================

export const STEP_ICONS: Record<string, string> = {
  search: '🔍',
  find: '🔍',
  create: '📝',
  make: '📝',
  send: '📧',
  email: '📧',
  update: '✏️',
  schedule: '📅',
  calendar: '📅',
  generate: '🎨',
  image: '🖼️',
  task: '✅',
  invoice: '🧾',
  proposal: '📋',
  product: '📦',
  client: '👤',
  prospect: '👤',
};

export function getStepIcon(action: string): string {
  const lowerAction = action.toLowerCase();
  for (const [key, icon] of Object.entries(STEP_ICONS)) {
    if (lowerAction.includes(key)) {
      return icon;
    }
  }
  return '•';
}
