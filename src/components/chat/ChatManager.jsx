
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from "react";
import { ChatConversation } from "@/api/entities";
import { ChatProgress } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";

// Centralized chat state management with optimizations
const ChatContext = createContext();

const initialState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  progress: null,
  currentProject: null,
  user: null,
  initialized: false,
  error: null
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, user: action.user, initialized: true, error: null };
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.conversations };
    case 'SET_CURRENT_CONVERSATION':
      return { 
        ...state, 
        currentConversation: action.conversation,
        messages: action.conversation?.messages || [],
        error: null
      };
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.message]
      };
    case 'UPDATE_MESSAGES':
      return { ...state, messages: action.messages };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'SET_PROJECT':
      return { ...state, currentProject: action.project };
    case 'CLEAR_PROGRESS':
      return { ...state, progress: null };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const progressPollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const conversationCacheRef = useRef(new Map());
  const isLoadingConversationsRef = useRef(false); // New ref for loading state

  // Optimized conversation loading with caching
  const loadConversations = useCallback(async (user, projectId = null, skipAutoSelect = false) => {
    if (!user || isLoadingConversationsRef.current) return; // Prevent multiple concurrent loads
    
    isLoadingConversationsRef.current = true; // Set loading flag
    
    // Check cache first
    const cacheKey = `${user.organization_id}-${projectId}`;
    const cached = conversationCacheRef.current.get(cacheKey);
    const now = Date.now();
    
    // Use cache if less than 10 seconds old
    if (cached && (now - cached.timestamp) < 10000) {
      dispatch({ type: 'SET_CONVERSATIONS', conversations: cached.data });
      
      // Only auto-select if not skipping and no current conversation
      if (!skipAutoSelect && !state.currentConversation && cached.data.length > 0) {
        const activeConv = cached.data.find(c => c.is_active) || cached.data[0];
        if (activeConv) {
          console.log("Auto-selecting from cache:", activeConv.id);
          dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: activeConv });
        }
      }
      isLoadingConversationsRef.current = false;
      return;
    }
    
    try {
      const filter = { 
        organization_id: user.organization_id
      };
      
      // If projectId is provided, filter by it, otherwise get all
      if (projectId) {
        filter.project_id = projectId;
      }
      
      const conversations = await ChatConversation.filter(filter, "-last_message_at", 50);
      
      console.log(`Loaded ${conversations.length} conversations for user ${user.email}`);
      
      // Update cache
      conversationCacheRef.current.set(cacheKey, {
        data: conversations,
        timestamp: now
      });
      
      dispatch({ type: 'SET_CONVERSATIONS', conversations });
      
      // Only auto-select if not skipping, no current conversation, and conversations exist
      if (!skipAutoSelect && !state.currentConversation && conversations.length > 0) {
        const activeConv = conversations.find(c => c.is_active) || conversations[0];
        if (activeConv) {
          console.log("Auto-selecting conversation:", activeConv.id);
          dispatch({ type: 'SET_CURRENT_CONVERSATION', conversation: activeConv });
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load conversations' });
    } finally {
      isLoadingConversationsRef.current = false;
    }
  }, [state.currentConversation]);

  // Initialize user and data
  useEffect(() => {
    let mounted = true;
    
    const initializeChat = async () => {
      try {
        const userData = await User.me();
        if (mounted) {
          console.log("Initializing SYNC for user:", userData.email);
          dispatch({ type: 'INITIALIZE', user: userData });
          // Load conversations immediately after initialization
          await loadConversations(userData);
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        if (mounted) {
          dispatch({ type: 'INITIALIZE', user: null });
          dispatch({ type: 'SET_ERROR', error: 'Failed to initialize SYNC' });
        }
      }
    };
    
    initializeChat();
    
    return () => {
      mounted = false;
    };
  }, [loadConversations]);

  // Optimized progress polling with exponential backoff
  const startProgressPolling = useCallback((jobId) => {
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
    }

    let pollInterval = 1000; // Start with 1 second
    let consecutiveErrors = 0;

    const pollProgress = async () => {
      try {
        const [progressResult] = await ChatProgress.filter({ job_id: jobId }, "-updated_date", 1);
        
        if (progressResult) {
          dispatch({ type: 'SET_PROGRESS', progress: progressResult });
          consecutiveErrors = 0; // Reset error count on success
          
          if (progressResult.status === "completed") {
            if (progressPollRef.current) {
              clearInterval(progressPollRef.current);
              progressPollRef.current = null;
            }
            // Delay clearing to show 100% briefly
            setTimeout(() => {
              dispatch({ type: 'CLEAR_PROGRESS' });
            }, 1000);
          } else if (progressResult.status === "error") {
            if (progressPollRef.current) {
              clearInterval(progressPollRef.current);
              progressPollRef.current = null;
            }
            dispatch({ type: 'SET_ERROR', error: 'Processing failed' });
          }
        }
      } catch (error) {
        console.error("Progress polling error:", error);
        consecutiveErrors++;
        
        // Stop polling after 3 consecutive errors
        if (consecutiveErrors >= 3) {
          if (progressPollRef.current) {
            clearInterval(progressPollRef.current);
            progressPollRef.current = null;
          }
          dispatch({ type: 'SET_ERROR', error: 'Lost connection to SYNC' });
        }
      }
    };

    // Initial poll
    pollProgress();
    
    // Set up interval with adaptive timing
    progressPollRef.current = setInterval(() => {
      pollProgress();
      // Gradually increase interval (max 3 seconds)
      pollInterval = Math.min(pollInterval * 1.1, 3000);
    }, pollInterval);
  }, []);

  // Clear cache when project changes
  useEffect(() => {
    conversationCacheRef.current.clear();
  }, [state.currentProject]);

  // Cleanup on unmount
  useEffect(() => {
    const currentProgressPoll = progressPollRef.current;
    const currentAbortController = abortControllerRef.current;
    
    return () => {
      if (currentProgressPoll) {
        clearInterval(currentProgressPoll);
      }
      if (currentAbortController) {
        currentAbortController.abort();
      }
    };
  }, []);

  const contextValue = {
    ...state,
    dispatch,
    loadConversations,
    startProgressPolling
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
