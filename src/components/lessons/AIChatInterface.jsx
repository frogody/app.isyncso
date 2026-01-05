import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

import MicrophonePrompt from "./MicrophonePrompt";
import VoiceStatusIndicator from "./VoiceStatusIndicator";
import { learningTracker } from "@/components/learn/LearningTracker";
import { visionContextProvider } from "@/components/vision/VisionContextProvider";
import { BrowserWarnings } from "@/components/utils/BrowserCheck";
import { conversationManager } from "@/components/learn/ConversationManager";
import { VoiceSelector, useVoicePreference } from "./VoiceSettings";
import { SessionRecap } from "./SessionRecap";
import { RotateCcw } from "lucide-react";


// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 max-w-[80%]">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// Screen reader announcement utility
function announce(message) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Global audio player - outside React lifecycle
let globalAudioPlayer = null;


export default function AIChatInterface({ lesson, isVisible, onClose, onConversationReady, onGenerateAudio, isGeneratingAudio, visionEnabled, onVisionToggle }) {
        const [messages, setMessages] = useState([]);
        const [inputMessage, setInputMessage] = useState("");
        const [isLoading, setIsLoading] = useState(false);
        const [conversation, setConversation] = useState(null);
        const [isSpeaking, setIsSpeaking] = useState(false);
        const [voiceEnabled, setVoiceEnabled] = useState(true);
        const lastSpokenMessageRef = useRef(null);
        const lastAssistantMessageRef = useRef('');
        const lastSpeechEndTimeRef = useRef(0);
        const [forceNewChat, setForceNewChat] = useState(0);
        const [showRecap, setShowRecap] = useState(false);

        // Voice input states
        const [isRecording, setIsRecording] = useState(false);
        const [isThinking, setIsThinking] = useState(false);
        const [micPermissionGranted, setMicPermissionGranted] = useState(false);
        const [showMicPrompt, setShowMicPrompt] = useState(false);
        const [isListening, setIsListening] = useState(false);
        const [currentTranscript, setCurrentTranscript] = useState('');
        const mediaRecorderRef = useRef(null);
        const audioChunksRef = useRef([]);
        const recognitionRef = useRef(null);
        const finalTranscriptRef = useRef('');
        const silenceTimerRef = useRef(null);
        const lastSpeechTimeRef = useRef(Date.now());
        const wasListeningRef = useRef(false);

        // Voice preference
        const { voiceId, updateVoice } = useVoicePreference();

  useEffect(() => {
    let unsubscribe;

    if (lesson && isVisible) {
      // Reset conversation when lesson changes
      setConversation(null);
      setMessages([]);

      // Initialize conversation
      (async () => {
        try {
          const user = await base44.auth.me();

          // Initialize learning tracker
          learningTracker.initialize(user.id, lesson.id);

          // Try to resume existing conversation first
          let newConversation = await conversationManager.tryResumeConversation(lesson.id);

          if (!newConversation) {
            // Create new conversation if no resume
            // Fetch user's interactions for this lesson
            const interactions = await base44.entities.LessonInteraction.filter({
              user_id: user.id,
              lesson_id: lesson.id
            });

          // Build context string from interactions
          let userWorkContext = "";
          if (interactions.length > 0) {
            userWorkContext = "\n\n=== USER'S WORK ON THIS LESSON ===\n";

            interactions.forEach((interaction, idx) => {
              if (interaction.interaction_type === 'reflection') {
                userWorkContext += `\nReflection ${idx + 1}:\n${interaction.user_input}\n`;
                if (interaction.ai_feedback) {
                  userWorkContext += `Previous Feedback: ${interaction.ai_feedback}\n`;
                }
              } else if (interaction.interaction_type === 'code') {
                try {
                  const codeData = JSON.parse(interaction.user_input);
                  userWorkContext += `\nCode Submission ${idx + 1}:\n\`\`\`python\n${codeData.code}\n\`\`\`\nOutput: ${codeData.output}\n`;
                } catch (e) {
                  userWorkContext += `\nCode Submission ${idx + 1}: ${interaction.user_input}\n`;
                }
              }
            });

            userWorkContext += "\n=== END USER WORK ===\n\nUse this context to provide personalized help. Reference their specific submissions when relevant.\n";
          }

          // Get enriched profile and company for personalization
          const enrichedProfile = user.enriched_profile || {};

          // Fetch user's company if they have one
          let companyName = null;
          if (user.company_id) {
            try {
              const company = await base44.entities.Company.get(user.company_id);
              companyName = company?.name;
            } catch (e) {
              console.error('Failed to load company:', e);
            }
          }

          // Detect user's role type for content adaptation
          const roleContext = {
            technical: ['engineer', 'developer', 'architect', 'data scientist', 'programmer', 'software'],
            business: ['manager', 'director', 'vp', 'ceo', 'executive', 'analyst', 'consultant'],
            creative: ['designer', 'marketer', 'content', 'brand', 'marketing'],
            operations: ['hr', 'operations', 'admin', 'coordinator', 'people', 'human resources']
          };

          const detectRoleType = (jobTitle) => {
            if (!jobTitle) return 'business';
            const titleLower = jobTitle.toLowerCase();
            for (const [type, keywords] of Object.entries(roleContext)) {
              if (keywords.some(keyword => titleLower.includes(keyword))) {
                return type;
              }
            }
            return 'business';
          };

          const userRoleType = detectRoleType(user.job_title);
          const contentStyle = userRoleType === 'technical' ? 'code_examples' : 'business_scenarios';

          newConversation = await base44.agents.createConversation({
            agent_name: "learn_assistant",
            metadata: {
              lesson_id: lesson.id,
              lesson_title: lesson.title,
              lesson_content: lesson.content.substring(0, 2000) + userWorkContext,

              // User context for personalization
              user_name: user.full_name || 'there',
              user_company: companyName || enrichedProfile.company_name || null,
              user_industry: enrichedProfile.industry || user.industry || null,
              user_role: user.job_title || enrichedProfile.user_role || null,
              user_experience: enrichedProfile.user_experience_level || user.experience_level || 'intermediate',
              user_tech_stack: enrichedProfile.tech_stack?.join(', ') || '',
              user_ai_tools: enrichedProfile.ai_tools_used?.join(', ') || '',
              user_goals: enrichedProfile.user_goals?.join(', ') || user.goals || '',
              user_challenges: enrichedProfile.key_business_challenges?.join(', ') || '',
              personalization_notes: enrichedProfile.personalization_notes || '',
              preferred_language: enrichedProfile.preferred_language || user.preferred_language || 'English',

              // Role-based adaptation
              role_type: userRoleType,
              content_style: contentStyle,
              example_domain: user.industry || 'general business',

              is_first_message: true
            },
          });

          // Store for future resumption
          conversationManager.storeConversation(lesson.id, newConversation.id);

          console.log('[Agent] Created new conversation:', newConversation.id);
          } else {
          console.log('[Agent] Resumed existing conversation:', newConversation.id);
          }

          setConversation(newConversation);

          // Notify parent component
          if (onConversationReady) {
            onConversationReady(newConversation);
          }

          // Subscribe to conversation updates
          unsubscribe = base44.agents.subscribeToConversation(
            newConversation.id,
            (data) => {
              console.log('[Agent] Subscription update, messages:', data?.messages?.length);
              if (data?.messages && Array.isArray(data.messages)) {
                setMessages(data.messages);
              }
            }
          );
        } catch (error) {
          console.error("Failed to initialize conversation:", error);
        }
      })();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
    }, [lesson?.id, isVisible, forceNewChat]);



  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversation || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      // Use CACHED vision context - don't wait for new analysis
      let messageContent = userMessage;
      let hasVisionContext = false;

      if (visionEnabled) {
        try {
          const visionContext = visionContextProvider.getLatestInsight();

          if (visionContext && visionContext.observation_for_tutor) {
            const visionPrefix = `[VISION] Screen: ${visionContext.screen_description || 'unknown'}. User activity: ${visionContext.user_activity || 'unknown'}. Relevance: ${visionContext.relevance_to_lesson || 'unknown'}.\n\nUser typed: `;
            messageContent = visionPrefix + userMessage;
            hasVisionContext = true;
            console.log('[Chat] Including cached vision context');
          } else {
            console.log('[Chat] No cached vision context available');
          }
        } catch (visionError) {
          console.log('[Chat] Vision context not available:', visionError.message);
        }
      }

      // Track the question
      learningTracker.trackQuestion(userMessage, hasVisionContext);

      await base44.agents.addMessage(conversation, {
        role: "user",
        content: messageContent,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Track last assistant message for feedback loop prevention
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage?.content) {
      lastAssistantMessageRef.current = lastMessage.content;
    }
  }, [messages]);

  // Handle sending accumulated voice message (declare first - no dependencies on other callbacks)
  const sendVoiceMessage = useCallback(async (message) => {
    if (!conversation || !message || message.length < 3) return;

    // CRITICAL: Ignore if AI just spoke (feedback loop prevention)
    if (Date.now() - lastSpeechEndTimeRef.current < 4000) {
      console.log('[Voice] BLOCKED - too soon after AI speech (within 4s)');
      return;
    }

    // Check against recent AI messages - aggressive matching
    const recentAssistantMessages = messages
      .filter(m => m.role === 'assistant')
      .slice(-5)
      .map(m => (m.content || '').toLowerCase());

    const heardLower = message.toLowerCase().trim();
    for (const aiMsg of recentAssistantMessages) {
      // Match if ANY 15-char substring overlaps
      if (aiMsg.length > 15) {
        for (let i = 0; i <= aiMsg.length - 15; i++) {
          const aiSubstr = aiMsg.substring(i, i + 15);
          if (heardLower.includes(aiSubstr)) {
            console.log('[Voice] BLOCKED - matches AI speech fragment:', aiSubstr);
            return;
          }
        }
      }
    }

    console.log('[Voice] Sending accumulated message:', message);
    learningTracker.trackVoiceUsed();

    try {
      let messageContent = message.trim();

      if (visionEnabled) {
        try {
          const visionContext = visionContextProvider.getLatestInsight();
          if (visionContext && visionContext.observation_for_tutor) {
            const visionPrefix = `[VISION] Screen: ${visionContext.screen_description || 'unknown'}. User activity: ${visionContext.user_activity || 'unknown'}. Relevance: ${visionContext.relevance_to_lesson || 'unknown'}.\n\nUser said: `;
            messageContent = visionPrefix + messageContent;
          }
        } catch (visionError) {
          console.log('[Voice] Vision context not available');
        }
      }

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });
    } catch (error) {
      console.error('[Voice] Failed to send message:', error);
    }
  }, [conversation, messages, visionEnabled]);

  // Silence timer handler (depends on sendVoiceMessage)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    silenceTimerRef.current = setTimeout(() => {
      const message = finalTranscriptRef.current.trim();
      
      if (message && message.split(' ').length >= 2) {
        console.log('[Voice] Sending after pause:', message);
        sendVoiceMessage(message);
        finalTranscriptRef.current = '';
        setCurrentTranscript('');
      }
    }, 1200); // 1.2 second pause triggers send
  }, [sendVoiceMessage]);

  // Initialize recognition instance (depends on resetSilenceTimer)
  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('[Voice] Recognition started (fresh instance)');
      setIsListening(true);
    };
    
    recognition.onresult = (event) => {
      if (isSpeaking) return;

      lastSpeechTimeRef.current = Date.now();
      
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        finalTranscriptRef.current += final;
      }
      
      setCurrentTranscript(finalTranscriptRef.current + interim);
      resetSilenceTimer();
    };
    
    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('[Voice] Recognition error:', event.error);
      }
      
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening && !isSpeaking) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('[Voice] Auto-restart failed');
              }
            }
          }, 1000);
        }
      }
    };

    recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      if (isListening && !isSpeaking) {
        setTimeout(() => {
          if (isListening && !isSpeaking) {
            try {
              recognitionRef.current.start();
              console.log('[Voice] Auto-restarted recognition');
            } catch (e) {
              console.log('[Voice] Could not restart');
            }
          }
        }, 300);
      }
    };
    
    return recognition;
  }, [isSpeaking, isListening, resetSilenceTimer]);

  // Declare startListening and stopListening FIRST (used by keyboard shortcuts useEffect)
  const startListening = useCallback(async () => {
    if (!conversation) {
      console.error('[Voice] Cannot start listening - no conversation');
      return;
    }

    // Try to get permission directly first
    if (!micPermissionGranted) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermissionGranted(true);
      } catch (error) {
        console.log('[Voice] No mic permission, showing prompt');
        setShowMicPrompt(true);
        return;
      }
    }

    // Reset accumulated transcript
    finalTranscriptRef.current = '';
    setCurrentTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('[Voice] Started continuous listening');
      } catch (error) {
        console.error('[Voice] Failed to start listening:', error);
      }
    }
  }, [conversation, micPermissionGranted]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    console.log('[Voice] Stopped continuous listening');
  }, []);

  // Declare speakMessage callback (depends on initializeRecognition)
  const speakMessage = useCallback(async (text) => {
    if (!text || isSpeaking) return;

    // CRITICAL: Stop listening to prevent feedback
    wasListeningRef.current = isListening;
    if (isListening && recognitionRef.current) {
      console.log('[Voice] Stopping recognition for AI speech');
      recognitionRef.current.stop();
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current = null;
      setIsListening(false);
    }

    setIsSpeaking(true);

    try {
      // Clean text for natural speech
      let cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[-*]\s/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/```[\s\S]*?```/g, 'code example')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('[Voice Premium] Requesting TTS, length:', cleanText.length);
      const startTime = Date.now();

      const { data } = await base44.functions.invoke('generateVoice', { 
        text: cleanText, 
        voice_id: voiceId 
      });
      console.log('[Voice Premium] Response:', data);

      if (data?.success && data.audio_base64) {
        const latency = Date.now() - startTime;
        console.log('[Voice Premium] Received audio in', latency, 'ms, size:', data.audio_size_bytes, 'bytes');

        // Convert base64 to blob
        const audioData = atob(data.audio_base64);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Kill any existing audio IMMEDIATELY
        if (globalAudioPlayer) {
          globalAudioPlayer.pause();
          globalAudioPlayer.currentTime = 0;
          globalAudioPlayer = null;
        }

        // Create new premium audio instance
        globalAudioPlayer = new Audio();
        globalAudioPlayer.preload = 'auto';

        globalAudioPlayer.onended = () => {
          console.log('[Voice Premium] Playback complete');
          lastSpeechEndTimeRef.current = Date.now();
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          globalAudioPlayer = null;

          // Resume listening after 2s
          if (wasListeningRef.current) {
            setTimeout(() => {
              if (!isSpeaking) {
                recognitionRef.current = initializeRecognition();
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error('[Voice] Failed to restart:', e);
                  }
                }
              }
            }, 2000);
          }
        };

        globalAudioPlayer.onerror = (e) => {
          console.error('[Voice Premium] Playback error:', globalAudioPlayer.error);
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          globalAudioPlayer = null;

          if (wasListeningRef.current) {
            setTimeout(() => {
              if (!isSpeaking) {
                recognitionRef.current = initializeRecognition();
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {}
                }
              }
            }, 1000);
          }
        };

        globalAudioPlayer.src = audioUrl;
        globalAudioPlayer.load();

        // Start playback as soon as possible
        globalAudioPlayer.oncanplaythrough = () => {
          const playStartTime = Date.now();
          console.log('[Voice Premium] Starting playback, total latency:', playStartTime - startTime, 'ms');
          globalAudioPlayer.play().catch((playError) => {
            console.error('[Voice Premium] Play failed:', playError);
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            globalAudioPlayer = null;
          });
        };
      }
    } catch (error) {
      console.error('[Voice Premium] Failed:', error);
      setIsSpeaking(false);

      if (wasListeningRef.current) {
        setTimeout(() => {
          if (!isSpeaking) {
            recognitionRef.current = initializeRecognition();
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {}
            }
          }
        }, 1000);
      }
    }
  }, [isSpeaking, isListening, voiceId, initializeRecognition]);

  // Auto-play voice for new assistant messages (after speakMessage is declared)
  useEffect(() => {
    if (!voiceEnabled || !messages.length) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only speak complete assistant messages (not still streaming)
    if (
      lastMessage?.role === 'assistant' && 
      lastMessage?.content && 
      lastSpokenMessageRef.current !== lastMessage.content &&
      !lastMessage?.tool_calls?.some(tc => tc.status === 'running' || tc.status === 'in_progress')
    ) {
      // Debounce to ensure message is complete (wait for streaming to finish)
      const timer = setTimeout(() => {
        const currentLastMessage = messages[messages.length - 1];
        if (
          currentLastMessage?.role === 'assistant' && 
          currentLastMessage?.content &&
          lastSpokenMessageRef.current !== currentLastMessage.content
        ) {
          console.log('[Voice] Speaking complete assistant message');
          lastSpokenMessageRef.current = currentLastMessage.content;
          speakMessage(currentLastMessage.content);
        }
      }, 500); // Wait 500ms to ensure streaming is done
      
      return () => clearTimeout(timer);
    }
  }, [messages, voiceEnabled, speakMessage]);

  // Initialize Web Speech API for continuous listening
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      recognitionRef.current = initializeRecognition();
    }
    
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [initializeRecognition]);

  // Voice state announcements for screen readers
  useEffect(() => {
    if (isListening) {
      announce('Voice input started. Speak now.');
    }
  }, [isListening]);

  useEffect(() => {
    if (isSpeaking) {
      announce('AI is responding.');
    }
  }, [isSpeaking]);

  // Announce new assistant messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg?.content) {
      announce('AI tutor responded');
    }
  }, [messages.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        isListening ? stopListening() : startListening();
      }
      if (e.code === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isListening, isVisible, onClose, stopListening, startListening]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (globalAudioPlayer) {
        globalAudioPlayer.pause();
        globalAudioPlayer = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    // Check if microphone permission was granted
    if (!micPermissionGranted) {
      setShowMicPrompt(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicPermissionGranted(false);
      setShowMicPrompt(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsThinking(true);
    }
  };

  const handleVoiceMessage = async (audioBlob) => {
    if (!conversation) return;

    try {
      // Upload audio file first
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });

      // Include recent chat history
      const recentMessages = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call voice chat function through SDK (includes auth automatically)
      const { data } = await base44.functions.invoke('voiceChat', {
        audio_url: file_url,
        lesson_context: `${lesson.title}\n\n${lesson.content.substring(0, 2000)}`,
        chat_history: recentMessages
      });

      if (data.success) {
        // Add user's transcribed question to chat
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: data.user_question
        });

        // Add AI's text response to chat
        await base44.agents.addMessage(conversation, {
          role: 'assistant',
          content: data.text_response
        });

        // Play audio response
        if (voiceEnabled && data.audio_base64) {
          console.log('[VoiceChat] Received audio response, size:', data.audio_base64.length);
          
          const audioData = atob(data.audio_base64);
          const audioArray = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            audioArray[i] = audioData.charCodeAt(i);
          }
          const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          console.log('[VoiceChat] Created blob URL, size:', audioBlob.size);

          // Kill any existing audio
          if (globalAudioPlayer) {
            globalAudioPlayer.pause();
            globalAudioPlayer.currentTime = 0;
            globalAudioPlayer = null;
          }

          // Create new audio instance in global scope
          globalAudioPlayer = new Audio();
          globalAudioPlayer.preload = 'auto'; // Force preload
          setIsSpeaking(true);
          
          // Set up event listeners BEFORE setting src
          globalAudioPlayer.onloadedmetadata = () => {
            console.log('[VoiceChat] Metadata loaded, duration:', globalAudioPlayer.duration, 'seconds');
          };
          
          globalAudioPlayer.onloadeddata = () => {
            console.log('[VoiceChat] Audio data loaded');
          };
          
          globalAudioPlayer.onended = () => {
            console.log('[VoiceChat] Playback ended naturally');
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            globalAudioPlayer = null;
          };
          
          globalAudioPlayer.onerror = (e) => {
            console.error('[VoiceChat] Playback error:', globalAudioPlayer.error?.message);
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            globalAudioPlayer = null;
          };
          
          // Set source AFTER event listeners
          globalAudioPlayer.src = audioUrl;
          
          // Force load the entire audio before playing
          globalAudioPlayer.load();
          
          // Wait for enough data to play through
          globalAudioPlayer.oncanplaythrough = () => {
            console.log('[VoiceChat] Audio fully loaded, starting playback');
            globalAudioPlayer.play().catch((playError) => {
              console.error('[VoiceChat] Play failed:', playError);
              URL.revokeObjectURL(audioUrl);
              setIsSpeaking(false);
              globalAudioPlayer = null;
            });
          };
        }
      }
    } catch (error) {
      console.error('Voice chat failed:', error);
    } finally {
      setIsThinking(false);
    }
  };

  // BARGE-IN: User speaks → immediately stop AI
  useEffect(() => {
    if (isListening && isSpeaking && globalAudioPlayer) {
      console.log('[Voice] BARGE-IN detected - stopping AI immediately');
      globalAudioPlayer.pause();
      globalAudioPlayer.currentTime = 0;
      setIsSpeaking(false);
      lastSpeechEndTimeRef.current = Date.now();
    }
  }, [isListening, isSpeaking]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    const stats = learningTracker.getSessionStats();

    // Show recap if session was > 2 minutes with interactions
    if (stats.duration_ms > 120000 && stats.interaction_count > 0) {
      setShowRecap(true);
    } else {
      onClose?.();
    }
  };

  return (
    <>
      {/* Microphone Permission Prompt */}
      {showMicPrompt && (
        <MicrophonePrompt
          onGranted={() => {
            setMicPermissionGranted(true);
            setShowMicPrompt(false);
            // Auto-start listening after permission
            setTimeout(() => {
              startListening();
            }, 100);
          }}
          onDenied={() => setShowMicPrompt(false)}
        />
      )}

      {/* Session Recap Modal */}
      <SessionRecap
        isOpen={showRecap}
        onClose={() => {
          setShowRecap(false);
          onClose?.();
        }}
        lessonTitle={lesson?.title}
      />

      {/* Slide-in Panel */}
      <div 
        role="dialog"
        aria-label="AI Tutor conversation"
        aria-modal="true"
        className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-gray-950/98 backdrop-blur-lg border-l border-gray-800/50 
        transform transition-transform duration-300 ease-out z-50 flex flex-col
        pb-[env(safe-area-inset-bottom,0px)]
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Clean Header */}
        <div className="h-14 border-b border-gray-800/50 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-medium">AI Tutor</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice selector */}
            <VoiceSelector voiceId={voiceId} onVoiceChange={updateVoice} />

            {/* New chat button */}
            <button
              onClick={() => {
                conversationManager.clearConversation(lesson.id);
                setConversation(null);
                setMessages([]);
                setForceNewChat(prev => prev + 1);
              }}
              className="text-gray-400 hover:text-white p-1"
              title="Start new conversation"
              aria-label="Start new conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Vision status indicator */}
            {visionEnabled && (
              <div className="flex items-center gap-1.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  visionContextProvider.getLatestInsight() 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
                }`} />
                <span className={`hidden sm:inline ${
                  visionContextProvider.getLatestInsight() 
                    ? 'text-green-400' 
                    : 'text-yellow-400'
                }`}>
                  {visionContextProvider.getLatestInsight() ? 'Screen visible' : 'Connecting...'}
                </span>
              </div>
            )}

            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="hidden sm:inline">Listening</span>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div 
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {Array.isArray(messages) && messages.filter((m) => m?.role !== "system").length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <BrowserWarnings />
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
              <h3 className="text-white font-medium mb-2">AI Tutor Connecting...</h3>
              <p className="text-gray-400 text-sm">
                Preparing personalized learning experience
              </p>
            </div>
          ) : (
            <>
              {isLoading && messages.filter((m) => m?.role !== "system").length === 1 && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-sm text-cyan-400">AI is thinking...</span>
                  </div>
                </div>
              )}
              {Array.isArray(messages) && messages
                .filter((m) => m?.role !== "system")
                .map((message, index) => {
                // Clean message content for display
                let displayContent = message?.content || '';

              // Remove all internal context blocks
              displayContent = displayContent.replace(/\[SCREEN_CONTEXT\][\s\S]*?\[\/SCREEN_CONTEXT\]/g, '');
              displayContent = displayContent.replace(/\[PROACTIVE_HELP_TRIGGER\][\s\S]*/g, '');
              displayContent = displayContent.replace(/\[VISION\].*?(?=\n|$)/g, '');

              // Extract just user's question if formatted
              if (message?.role === "user" && displayContent.includes("Student's question:")) {
                const match = displayContent.match(/Student's question:\s*(.*)/s);
                if (match) displayContent = match[1].trim();
              }
              if (message?.role === "user" && displayContent.includes("User said:") || displayContent.includes("User typed:")) {
                const match = displayContent.match(/User (?:said|typed):\s*(.*)/s);
                if (match) displayContent = match[1].trim();
              }

              // Clean up extra whitespace
              displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim();

              // Skip rendering if content is empty after cleaning (internal messages)
              if (!displayContent || displayContent.length < 2) return null;

              return (
                <div 
                  key={index} 
                  role="article"
                  aria-label={`${message?.role === 'user' ? 'You' : 'AI Tutor'} said`}
                  className={message?.role === "user" ? "ml-8" : "mr-8"}
                >
                  <div className={`rounded-2xl px-4 py-2 text-sm ${
                    message?.role === "user" 
                      ? 'bg-cyan-500/20 text-white ml-auto' 
                      : 'bg-gray-800/50 text-gray-200'
                  }`}>
                    {displayContent}
                  </div>
                </div>
              );
                })
                .filter(Boolean) // Remove nulls
                }
                {isLoading && messages.filter((m) => m?.role !== "system").length > 1 && (
                <TypingIndicator />
                )}
                {false && isLoading && (
                  <div className="mr-8">
              <div className="bg-gray-800/50 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
            )}
            </>
            )}
            </div>

        {/* Progress Widget */}
        <div className="px-3 sm:px-4 py-2 border-t border-gray-800/50">
          {/* Progress widget temporarily removed due to import error */}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 border-t border-gray-800/50 flex-shrink-0 pb-[env(safe-area-inset-bottom,12px)]">
          {/* Live Transcript Display */}
          {isListening && currentTranscript && (
            <div className="bg-gray-800/80 rounded-lg px-3 py-2 mb-2 max-w-full overflow-hidden">
              <p className="text-sm text-gray-300 italic truncate">
                "{currentTranscript}"
              </p>
            </div>
          )}

          {/* Voice Status Indicator */}
          <div className="flex items-center justify-center mb-3">
            <VoiceStatusIndicator
              voiceState={
                isSpeaking ? 'speaking' : 
                isLoading ? 'processing' : 
                isListening ? 'listening' : 
                'idle'
              }
              onToggle={isListening ? stopListening : startListening}
              disabled={!conversation}
            />
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <Input 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="bg-gray-900 border-gray-700 text-white"
              disabled={isLoading || !conversation}
              aria-label="Type a message to the AI tutor"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading || !conversation}
              size="icon" 
              className="bg-cyan-600 hover:bg-cyan-500"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}