/**
 * Pure functions that map user tool/goal selections to personalized content.
 * Used by Page 7 (PersonalizedAgentPage) to show the right variant.
 */

// Tool categories used in ToolsAndGoalsPage
export const DAILY_TOOLS = [
  { id: 'vscode', label: 'VS Code', category: 'dev', icon: '💻' },
  { id: 'github', label: 'GitHub', category: 'dev', icon: '🐙' },
  { id: 'terminal', label: 'Terminal', category: 'dev', icon: '⌨️' },
  { id: 'slack', label: 'Slack', category: 'comms', icon: '💬' },
  { id: 'teams', label: 'Teams', category: 'comms', icon: '👥' },
  { id: 'email', label: 'Email', category: 'comms', icon: '📧' },
  { id: 'figma', label: 'Figma', category: 'design', icon: '🎨' },
  { id: 'canva', label: 'Canva', category: 'design', icon: '🖼️' },
  { id: 'notion', label: 'Notion', category: 'focus', icon: '📝' },
  { id: 'calendar', label: 'Calendar', category: 'meeting', icon: '📅' },
  { id: 'zoom', label: 'Zoom', category: 'meeting', icon: '📹' },
  { id: 'docs', label: 'Google Docs', category: 'focus', icon: '📄' },
  { id: 'jira', label: 'Jira', category: 'dev', icon: '📋' },
  { id: 'linear', label: 'Linear', category: 'dev', icon: '🔄' },
  { id: 'sheets', label: 'Spreadsheets', category: 'focus', icon: '📊' },
  { id: 'lms', label: 'LMS / Courses', category: 'learning', icon: '🎓' },
];

// Goal options that map to app recommendations
export const GOALS = [
  { id: 'learn-ai', label: 'Learn AI skills', category: 'learning' },
  { id: 'grow-sales', label: 'Grow sales pipeline', category: 'comms' },
  { id: 'manage-work', label: 'Manage daily work', category: 'focus' },
  { id: 'creative-work', label: 'Create content', category: 'design' },
  { id: 'compliance-ethics', label: 'AI compliance', category: 'focus' },
  { id: 'personal-assistant', label: 'AI assistant', category: 'comms' },
  { id: 'ai-strategy', label: 'AI strategy', category: 'dev' },
];

/**
 * Determines which agent variant to show on Page 7 based on
 * the user's selected tools and goals.
 *
 * Priority: dev → comms → design → focus → learning → meeting
 * Returns one of: 'CodeIntelligence' | 'CommsPrep' | 'CreativeFlow' |
 *                  'DeepWorkGuardian' | 'SkillGrowth' | 'MeetingIntelligence'
 */
export function getPersonalizedVariant(dailyTools = [], selectedGoals = []) {
  // Count category hits from tools
  const toolCategories = {};
  for (const toolId of dailyTools) {
    const tool = DAILY_TOOLS.find(t => t.id === toolId);
    if (tool) {
      toolCategories[tool.category] = (toolCategories[tool.category] || 0) + 1;
    }
  }

  // Count category hits from goals
  const goalCategories = {};
  for (const goalId of selectedGoals) {
    const goal = GOALS.find(g => g.id === goalId);
    if (goal) {
      goalCategories[goal.category] = (goalCategories[goal.category] || 0) + 1;
    }
  }

  // Merge with tool categories weighted 1.5x (tools indicate daily behavior)
  const scores = {};
  for (const [cat, count] of Object.entries(toolCategories)) {
    scores[cat] = (scores[cat] || 0) + count * 1.5;
  }
  for (const [cat, count] of Object.entries(goalCategories)) {
    scores[cat] = (scores[cat] || 0) + count;
  }

  // Map categories to variants
  const categoryToVariant = {
    dev: 'CodeIntelligence',
    comms: 'CommsPrep',
    design: 'CreativeFlow',
    focus: 'DeepWorkGuardian',
    learning: 'SkillGrowth',
    meeting: 'MeetingIntelligence',
  };

  // Find highest-scoring category
  let bestCategory = 'focus'; // default
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return categoryToVariant[bestCategory] || 'DeepWorkGuardian';
}

/**
 * Returns display info for a variant.
 */
export function getVariantInfo(variantName) {
  const variants = {
    CodeIntelligence: {
      title: 'Code Intelligence',
      subtitle: 'Your development copilot',
      description: 'Analyzes your codebase, suggests improvements, and automates repetitive dev tasks.',
      color: '#6366f1', // indigo
      icon: '💻',
    },
    CommsPrep: {
      title: 'Comms Prep',
      subtitle: 'Your communication assistant',
      description: 'Drafts emails, prepares meeting briefs, and keeps your outreach sharp.',
      color: '#06b6d4', // cyan
      icon: '💬',
    },
    CreativeFlow: {
      title: 'Creative Flow',
      subtitle: 'Your creative partner',
      description: 'Generates visuals, refines content, and keeps your brand consistent.',
      color: '#f43f5e', // rose
      icon: '🎨',
    },
    DeepWorkGuardian: {
      title: 'Deep Work Guardian',
      subtitle: 'Your focus protector',
      description: 'Blocks distractions, batches notifications, and protects your flow state.',
      color: '#10b981', // emerald
      icon: '🛡️',
    },
    SkillGrowth: {
      title: 'Skill Growth',
      subtitle: 'Your learning accelerator',
      description: 'Curates courses, tracks progress, and adapts to your learning pace.',
      color: '#f59e0b', // amber
      icon: '🎓',
    },
    MeetingIntelligence: {
      title: 'Meeting Intelligence',
      subtitle: 'Your meeting optimizer',
      description: 'Prepares agendas, captures action items, and summarizes outcomes.',
      color: '#3b82f6', // blue
      icon: '📅',
    },
  };
  return variants[variantName] || variants.DeepWorkGuardian;
}
