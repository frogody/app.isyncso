import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, CheckCircle2, Loader2, Sparkles, 
  Edit3, MessageSquare, Save
} from "lucide-react";
import { db } from "@/api/supabaseClient";
import { cn } from "@/lib/utils";

export default function ReflectionBlock({ content, lessonId }) {
  const [userInput, setUserInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingInteraction, setExistingInteraction] = useState(null);
  const hasLoaded = React.useRef(false);

  // Stable interaction key - only compute once
  const interactionKey = React.useMemo(
    () => `reflection-${content?.slice(0, 20) || 'default'}`,
    [content]
  );

  // Load existing reflection on mount - only once
  useEffect(() => {
    if (hasLoaded.current || !lessonId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    hasLoaded.current = true;

    const loadExisting = async () => {
      try {
        const user = await db.auth.me();
        if (!user) {
          if (mounted) setIsLoading(false);
          return;
        }

        const interactions = await db.entities.LessonInteraction.filter({
          user_id: user.id,
          lesson_id: lessonId,
          interaction_key: interactionKey
        });

        if (mounted && interactions && interactions.length > 0) {
          const existing = interactions[0];
          setExistingInteraction(existing);
          setUserInput(existing.user_input || "");
          setIsSubmitted(true);
        }
      } catch (error) {
        // Silently fail - don't spam console
        if (mounted) console.warn("Could not load reflection:", error.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadExisting();
    return () => { mounted = false; };
  }, [lessonId, interactionKey]);

  const handleSave = async () => {
    if (!userInput.trim() || !lessonId) return;

    setIsSaving(true);
    try {
      const user = await db.auth.me();
      
      if (existingInteraction) {
        await db.entities.LessonInteraction.update(existingInteraction.id, {
          user_input: userInput
        });
        setExistingInteraction({ ...existingInteraction, user_input: userInput });
      } else {
        const newInteraction = await db.entities.LessonInteraction.create({
          user_id: user.id,
          lesson_id: lessonId,
          interaction_key: interactionKey,
          interaction_type: "reflection",
          user_input: userInput
        });
        setExistingInteraction(newInteraction);
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to save reflection:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskAI = () => {
    window.dispatchEvent(new CustomEvent("openAIChat", {
      detail: { prompt: `Please provide feedback on my reflection:\n\nQuestion: ${content}\n\nMy Answer: ${userInput}` }
    }));
  };

  if (isLoading) {
    return (
      <div className="my-6 p-6 rounded-xl bg-purple-900/20 border border-purple-500/20 animate-pulse">
        <div className="h-4 bg-purple-500/20 rounded w-1/3 mb-4" />
        <div className="h-24 bg-purple-500/10 rounded" />
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-zinc-900/50 border border-purple-500/20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Reflection</span>
        </div>
        <p className="text-zinc-300 text-sm mt-1">{content}</p>
      </div>

      {/* Content */}
      <div className="p-4">
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Take a moment to reflect... Type your thoughts here."
          className={cn(
            "min-h-[100px] bg-black/30 border-zinc-700 text-white placeholder:text-zinc-500",
            "focus:border-purple-400 rounded-lg resize-none text-sm"
          )}
          disabled={isSaving}
        />

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {!isSubmitted ? (
            <Button
              onClick={handleSave}
              disabled={!userInput.trim() || isSaving}
              size="sm"
              className={cn(
                "text-xs",
                userInput.trim()
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-zinc-800 text-zinc-500"
              )}
            >
              {isSaving ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-3 h-3 mr-1.5" />Save</>
              )}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </div>
              
              <Button
                onClick={handleAskAI}
                variant="ghost"
                size="sm"
                className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                <MessageSquare className="w-3 h-3 mr-1.5" />
                Get Feedback
              </Button>
              
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-400 hover:text-white"
              >
                <Edit3 className="w-3 h-3 mr-1.5" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}