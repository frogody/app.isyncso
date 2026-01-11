import { db } from '@/api/supabaseClient';
import { visionContextProvider } from './VisionContextProvider';

class TutorVisionBridge {
  constructor() {
    this.conversation = null;
    this.isActive = false;
    this.lastProactiveTime = 0;
    this.minProactiveInterval = 45000; // 45 seconds between proactive messages
    this.lastScreenHash = null;
    this.sameScreenDuration = 0;
    this.stuckThreshold = 30000; // 30 seconds on same screen = might be stuck
  }

  initialize(conversation) {
    this.conversation = conversation;
    this.isActive = true;
    
    visionContextProvider.setInsightCallback((insight) => {
      this.evaluateForProactiveHelp(insight);
    });
    
    console.log('[TutorVisionBridge] Initialized with proactive help');
  }

  evaluateForProactiveHelp(insight) {
    if (!this.conversation || !this.isActive) return;
    
    const now = Date.now();
    
    // Don't be too chatty
    if (now - this.lastProactiveTime < this.minProactiveInterval) return;

    // Check for help triggers
    const shouldHelp = this.detectHelpNeeded(insight);
    
    if (shouldHelp) {
      this.sendProactiveHelp(insight, shouldHelp.reason);
      this.lastProactiveTime = now;
    }
  }

  detectHelpNeeded(insight) {
    // 1. Error messages visible on screen
    if (insight.readable_text?.toLowerCase().includes('error') ||
        insight.readable_text?.toLowerCase().includes('exception') ||
        insight.readable_text?.toLowerCase().includes('failed')) {
      return { reason: 'error_detected' };
    }

    // 2. User idle on same content (stuck signal)
    const currentHash = insight.screen_description + insight.user_activity;
    if (currentHash === this.lastScreenHash) {
      this.sameScreenDuration += 8000; // Analysis interval
      if (this.sameScreenDuration >= this.stuckThreshold) {
        this.sameScreenDuration = 0; // Reset to avoid repeat triggers
        return { reason: 'idle_too_long' };
      }
    } else {
      this.lastScreenHash = currentHash;
      this.sameScreenDuration = 0;
    }

    // 3. Potential struggles flagged by Claude Vision
    if (insight.potential_struggles && insight.potential_struggles !== 'None detected') {
      return { reason: 'struggle_detected' };
    }

    // 4. High relevance but user hasn't interacted
    if (insight.relevance_to_lesson === 'high' && insight.suggested_help) {
      return { reason: 'helpful_observation' };
    }

    return null;
  }

  async sendProactiveHelp(insight, reason) {
    if (!this.conversation || !this.isActive) return;

    const prompts = {
      error_detected: `[PROACTIVE_HELP_TRIGGER]
I noticed there might be an error on the student's screen.
What I see: ${insight.screen_description}
Visible text: ${insight.readable_text?.substring(0, 200)}

Offer brief, friendly help with the error. Keep it under 40 words. Don't say "I noticed" - just naturally offer assistance.`,

      idle_too_long: `[PROACTIVE_HELP_TRIGGER]
The student has been on the same screen for 30+ seconds without interacting.
What they're viewing: ${insight.screen_description}
Activity: ${insight.user_activity}

Gently check in: "Everything making sense?" or offer a micro-hint. Keep it under 25 words. Be casual, not pushy.`,

      struggle_detected: `[PROACTIVE_HELP_TRIGGER]
The student might be having difficulty.
Observation: ${insight.potential_struggles}
Current activity: ${insight.user_activity}

Offer a gentle hint or ask if they need help. Keep it under 30 words. Be encouraging, not intrusive.`,

      helpful_observation: `[PROACTIVE_HELP_TRIGGER]
I have a helpful observation about what the student is viewing.
What I see: ${insight.screen_description}
Suggestion: ${insight.suggested_help}

Share a brief, relevant tip or insight. Keep it under 35 words. Make it feel natural, not robotic.`
    };

    try {
      console.log(`[TutorVisionBridge] Sending proactive help: ${reason}`);
      
      await db.agents.addMessage(this.conversation, {
        role: 'user',
        content: prompts[reason]
      });
    } catch (error) {
      console.error('[TutorVisionBridge] Failed to send proactive help:', error);
    }
  }

  stop() {
    this.isActive = false;
    visionContextProvider.stopContinuousAnalysis();
    console.log('[TutorVisionBridge] Stopped');
  }
}

export const tutorVisionBridge = new TutorVisionBridge();