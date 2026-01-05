import React, { useState, useEffect } from 'react';
import { screenCaptureService } from './ScreenCaptureService';
import { visionContextProvider } from './VisionContextProvider';
import { tutorVisionBridge } from './TutorVisionBridge';
import { ScreenSharePrompt } from './ScreenSharePrompt';

export function SmartLearningController({ 
  lesson,
  conversation,
  onVisionReady,
  onVisionStopped 
}) {
  const [status, setStatus] = useState('checking');
  const [isVisionActive, setIsVisionActive] = useState(false);

  useEffect(() => {
    if (conversation && isVisionActive) {
      tutorVisionBridge.initialize(conversation);
    }
  }, [conversation, isVisionActive]);

  useEffect(() => {
    // Skip local model - we use Claude Vision API
    console.log('[Vision] Claude Vision API ready');
    setStatus('permission');
  }, []);

  useEffect(() => {
    if (lesson) {
      visionContextProvider.setLessonContext(lesson);
    }
  }, [lesson]);

  useEffect(() => {
    screenCaptureService.onCaptureEnded = () => {
      setIsVisionActive(false);
      visionContextProvider.stopContinuousAnalysis();
      tutorVisionBridge.stop();
      onVisionStopped?.();
    };
    
    return () => {
      // Cleanup on unmount
      if (isVisionActive) {
        screenCaptureService.stopCapture();
        visionContextProvider.stopContinuousAnalysis();
        tutorVisionBridge.stop();
      }
    };
  }, [onVisionStopped, isVisionActive]);

  function handleVisionGranted() {
    console.log('[Vision] Permission granted, activating vision');
    
    if (!conversation) {
      console.error('[Vision] ERROR: No conversation available! Cannot connect vision to agent.');
      setStatus('ready');
      return;
    }
    
    setStatus('ready');
    setIsVisionActive(true);
    
    console.log('[Vision] Initializing tutor bridge with conversation:', conversation.id);
    tutorVisionBridge.initialize(conversation);
    
    visionContextProvider.startContinuousAnalysis(8000);
    
    onVisionReady?.();
  }

  function handleVisionDenied() {
    setStatus('ready');
    setIsVisionActive(false);
  }

  function handleStopVision() {
    screenCaptureService.stopCapture();
    visionContextProvider.stopContinuousAnalysis();
    tutorVisionBridge.stop();
    setIsVisionActive(false);
    onVisionStopped?.();
  }

  // Wait for conversation before showing permission prompt
  if (status === 'permission' && conversation) {
    return (
      <ScreenSharePrompt
        onGranted={handleVisionGranted}
        onDenied={handleVisionDenied}
      />
    );
  }

  // Silent operation otherwise
  return null;
}