/**
 * Vision Service using vit-gpt2 for image captioning
 * Simple, reliable, no auth required
 */

import { pipeline } from "@huggingface/transformers";

class MinistralService {
  constructor() {
    this.pipe = null;
    this.isLoading = false;
    this.isReady = false;
    this.loadProgress = 0;
    this.error = null;
  }

  async initialize(onProgress) {
    if (this.isReady) return true;
    if (this.isLoading) return false;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      console.log('[Vision] Loading image captioning model...');
      onProgress?.(10, 'Initializing...');
      
      this.pipe = await pipeline(
        "image-to-text",
        "Xenova/vit-gpt2-image-captioning",
        {
          progress_callback: (progress) => {
            if (progress.progress) {
              const pct = Math.min(Math.round(progress.progress * 100), 100);
              this.loadProgress = pct;
              onProgress?.(pct, `Loading... ${pct}%`);
            }
          }
        }
      );
      
      this.isReady = true;
      this.isLoading = false;
      console.log('[Vision] Model ready!');
      return true;
      
    } catch (error) {
      this.isLoading = false;
      this.error = error;
      console.error("[Vision] Failed to load:", error);
      throw error;
    }
  }

  async analyzeImage(imageSource, prompt = "") {
    if (!this.isReady || !this.pipe) {
      throw new Error("Model not initialized");
    }
    
    try {
      console.log('[Vision] Analyzing image...');
      
      // Pipeline handles everything - just pass the image
      const result = await this.pipe(imageSource, {
        max_new_tokens: 50
      });
      
      const caption = result[0]?.generated_text || "Unable to analyze";
      console.log('[Vision] Caption:', caption);
      
      return caption;
      
    } catch (error) {
      console.error('[Vision] Analysis failed:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
      loadProgress: this.loadProgress,
      error: this.error
    };
  }
}

// Singleton instance
export const ministralService = new MinistralService();