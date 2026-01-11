/**
 * Vision Context Provider - Claude Vision Integration
 * Analyzes screen captures using Claude's vision capabilities
 */

import { db } from '@/api/supabaseClient';
import { screenCaptureService } from './ScreenCaptureService';

class VisionContextProvider {
  constructor() {
    this.currentLesson = null;
    this.analysisInterval = null;
    this.lastInsight = null;
    this.onNewInsight = null;
    this.isAnalyzing = false;
    this.lastAnalysisTime = 0;
    this.minAnalysisInterval = 10000; // 10 seconds minimum between calls
    this.previousImageHash = null;
    this.consecutiveNoChangeCount = 0;
    this.consecutiveFailures = 0;
  }

  setLessonContext(lesson) {
    this.currentLesson = lesson;
  }

  setInsightCallback(callback) {
    this.onNewInsight = callback;
  }

  // Simple hash to detect if screen changed
  async getImageHash(canvas) {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      
      const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
      let hash = 0;
      for (let i = 0; i < imageData.data.length; i += 100) {
        hash = ((hash << 5) - hash) + imageData.data[i];
        hash = hash & hash;
      }
      return hash;
    } catch (error) {
      console.error('[Vision] Hash generation error:', error);
      return 0;
    }
  }

  async captureAndAnalyze(userQuestion = null) {
    // Prevent concurrent analysis
    if (this.isAnalyzing) {
      console.log('[Vision] Already analyzing, skipping');
      return null;
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastAnalysisTime < this.minAnalysisInterval && !userQuestion) {
      console.log('[Vision] Rate limited, skipping');
      return null;
    }

    if (!screenCaptureService.isCapturing) {
      console.log('[Vision] Screen capture not active');
      return null;
    }

    this.isAnalyzing = true;

    try {
      // Capture frame
      const video = screenCaptureService.videoElement;
      if (!video || !video.videoWidth) {
        console.log('[Vision] Video element not ready');
        this.isAnalyzing = false;
        return null;
      }

      // Create canvas and capture
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1280 / video.videoWidth); // Max 1280px wide
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[Vision] Failed to get canvas context');
        this.isAnalyzing = false;
        return null;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Check if screen changed significantly
      const currentHash = await this.getImageHash(canvas);
      if (currentHash === this.previousImageHash && !userQuestion) {
        this.consecutiveNoChangeCount++;
        if (this.consecutiveNoChangeCount > 3) {
          console.log('[Vision] Screen unchanged, skipping analysis');
          this.isAnalyzing = false;
          return this.lastInsight; // Return cached insight
        }
      } else {
        this.consecutiveNoChangeCount = 0;
        this.previousImageHash = currentHash;
      }

      // Convert to base64 (JPEG for smaller size)
      let base64;
      try {
        base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        if (!base64) {
          throw new Error('Failed to generate base64');
        }
      } catch (error) {
        console.error('[Vision] Base64 conversion failed:', error);
        this.isAnalyzing = false;
        return null;
      }

      console.log('[Vision] Analyzing with Claude...');

      // Call Claude Vision API
      const { data } = await db.functions.invoke('analyzeScreenWithClaude', {
        image_base64: base64,
        lesson_title: this.currentLesson?.title || 'Unknown',
        lesson_content: this.currentLesson?.content?.substring(0, 1500) || '',
        previous_context: this.lastInsight?.observation_for_tutor || '',
        user_question: userQuestion
      });

      this.lastAnalysisTime = now;

      if (!data.success) {
        console.error('[Vision] Analysis failed:', data.error);
        this.consecutiveFailures++;
        this.isAnalyzing = false;
        
        // After 3 failures, notify user
        if (this.consecutiveFailures >= 3) {
          window.dispatchEvent(new CustomEvent('vision-unavailable', {
            detail: { reason: 'API failures' }
          }));
        }
        
        return null;
      }

      const analysis = data.analysis;
      console.log('[Vision] Claude analysis:', analysis);

      // Reset failure count on success
      this.consecutiveFailures = 0;

      // Build insight object
      const insight = {
        screen_description: analysis.screen_description,
        readable_text: analysis.readable_text,
        current_application: analysis.current_application,
        user_activity: analysis.user_activity,
        relevance_to_lesson: analysis.relevance_to_lesson,
        observation_for_tutor: analysis.observation_for_tutor,
        potential_struggles: analysis.potential_struggles,
        suggested_help: analysis.suggested_help,
        timestamp: Date.now()
      };

      this.lastInsight = insight;

      // Notify callback
      if (this.onNewInsight) {
        this.onNewInsight(insight);
      }

      this.isAnalyzing = false;
      return insight;

    } catch (error) {
      console.error('[Vision] Error:', error);
      this.consecutiveFailures++;
      this.isAnalyzing = false;
      return null;
    }
  }

  startContinuousAnalysis(intervalMs = 15000) {
    this.stopContinuousAnalysis();
    
    // Initial analysis after delay
    setTimeout(() => this.captureAndAnalyze(), 3000);
    
    // Continuous analysis
    this.analysisInterval = setInterval(() => {
      this.captureAndAnalyze();
    }, intervalMs);
  }

  stopContinuousAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  getLatestInsight() {
    return this.lastInsight;
  }

  // Call this when user asks a question - triggers immediate analysis
  async analyzeForQuestion(question) {
    return this.captureAndAnalyze(question);
  }
}

export const visionContextProvider = new VisionContextProvider();