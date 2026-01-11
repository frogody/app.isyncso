// Learning interaction tracker for analytics

import { db } from '@/api/supabaseClient';

class LearningTracker {
  constructor() {
    this.sessionStart = Date.now();
    this.currentLessonId = null;
    this.userId = null;
    this.interactions = [];
  }

  initialize(userId, lessonId) {
    this.userId = userId;
    this.currentLessonId = lessonId;
    this.sessionStart = Date.now();
    this.interactions = [];
    console.log('[LearningTracker] Initialized for lesson:', lessonId);
  }

  async track(type, data = {}) {
    if (!this.userId || !this.currentLessonId) return;

    const interaction = {
      user_id: this.userId,
      lesson_id: this.currentLessonId,
      interaction_key: `${type}_${Date.now()}`,
      interaction_type: type,
      user_input: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        session_duration_ms: Date.now() - this.sessionStart
      })
    };

    this.interactions.push(interaction);

    // Save to database (fire and forget)
    try {
      await db.entities.LessonInteraction.create(interaction);
    } catch (error) {
      console.error('[LearningTracker] Failed to save:', error);
    }
  }

  // Convenience methods
  trackQuestion(question, hadVisionContext) {
    this.track('question_asked', { question: question.substring(0, 200), had_vision: hadVisionContext });
  }

  trackVoiceUsed() {
    this.track('voice_used', {});
  }

  trackSuggestionClicked(suggestion) {
    this.track('suggestion_clicked', { suggestion });
  }

  trackProactiveHelpReceived(reason) {
    this.track('proactive_help', { reason });
  }

  trackLessonCompleted(timeSpentSeconds) {
    this.track('lesson_completed', { time_spent_seconds: timeSpentSeconds });
  }

  trackQuizAttempt(score, totalQuestions) {
    this.track('quiz_attempted', { score, total: totalQuestions, passed: score >= 70 });
  }

  getSessionStats() {
    return {
      duration_ms: Date.now() - this.sessionStart,
      interaction_count: this.interactions.length,
      questions_asked: this.interactions.filter(i => i.interaction_type === 'question_asked').length,
      voice_interactions: this.interactions.filter(i => i.interaction_type === 'voice_used').length
    };
  }
}

export const learningTracker = new LearningTracker();