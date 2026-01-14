import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Code2, CheckCircle2, Loader2, Sparkles, 
  Send, RotateCcw, Lightbulb, Copy, Check,
  Play, ChevronDown, ChevronUp
} from "lucide-react";
import { db } from "@/api/supabaseClient";
import { cn } from "@/lib/utils";

export default function TryItBlock({ content, lessonId, blockIndex }) {
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasLoaded = React.useRef(false);

  // Parse content - memoized
  const exercise = React.useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      return {
        title: parsed.title || "Try It Yourself",
        prompt: parsed.prompt || parsed.exercise || content,
        hints: parsed.hints || [],
        example: parsed.example || null,
        starterCode: parsed.starter_code || parsed.starterCode || null
      };
    } catch {
      return { title: "Try It Yourself", prompt: content, hints: [], example: null, starterCode: null };
    }
  }, [content]);

  const interactionKey = `tryit-${blockIndex || 0}`;

  // Load previous response - only once
  useEffect(() => {
    if (hasLoaded.current || !lessonId) return;
    hasLoaded.current = true;

    const loadPrevious = async () => {
      try {
        const user = await db.auth.me();
        if (!user) return;

        const interactions = await db.entities.LessonInteraction.filter({
          user_id: user.id,
          lesson_id: lessonId,
          interaction_key: interactionKey
        });

        if (interactions && interactions.length > 0 && interactions[0].user_input) {
          try {
            const data = JSON.parse(interactions[0].user_input);
            setUserResponse(data.response || "");
            if (data.feedback) {
              setFeedback(data.feedback);
              setIsCompleted(true);
            }
          } catch (parseError) {
            // Invalid JSON in user_input, ignore
          }
        }
      } catch (error) {
        // Silently fail - don't spam console
        console.warn("Could not load previous response:", error.message);
      }
    };

    loadPrevious();
  }, [lessonId, interactionKey]);

  const handleSubmit = async () => {
    if (!userResponse.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const user = await db.auth.me();

      const aiResponse = await db.integrations.Core.InvokeLLM({
        prompt: `You are a supportive coding coach. Review this exercise submission:

Exercise: ${exercise.prompt}

Submission:
${userResponse}

Provide brief, encouraging feedback (2-3 sentences). Highlight what they did well and one improvement if needed.`,
        response_json_schema: {
          type: "object",
          properties: {
            feedback: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            suggestion: { type: "string" },
            score: { type: "number" }
          }
        }
      });

      setFeedback(aiResponse);
      setIsCompleted(true);

      await db.entities.LessonInteraction.create({
        user_id: user.id,
        lesson_id: lessonId,
        interaction_key: interactionKey,
        interaction_type: "exercise",
        user_input: JSON.stringify({ response: userResponse, feedback: aiResponse })
      });

      try {
        await db.functions.invoke('updateGamification', {
          user_id: user.id,
          action_type: 'exercise_complete',
          metadata: { lesson_id: lessonId }
        });
      } catch (xpError) {
        console.error("XP update failed:", xpError);
      }

    } catch (error) {
      console.error("Submission failed:", error);
      setFeedback({ feedback: "Great effort! Your response has been saved.", strengths: [], suggestion: "" });
      setIsCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (exercise.starterCode) {
      navigator.clipboard.writeText(exercise.starterCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setUserResponse("");
    setFeedback(null);
    setIsCompleted(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-cyan-950/30 border border-cyan-500/20 shadow-xl shadow-cyan-500/5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-cyan-500/10 to-transparent border-b border-cyan-500/20">
        <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
          <Code2 className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{exercise.title}</h3>
          <p className="text-xs text-cyan-400/70">Practice Exercise</p>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Completed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Prompt */}
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-zinc-200 leading-relaxed">{exercise.prompt}</p>
        </div>

        {/* Starter Code */}
        {exercise.starterCode && (
          <div className="rounded-xl overflow-hidden border border-zinc-700/50">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/50">
              <span className="text-xs text-zinc-500 font-mono">Starter Code</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 bg-[#0d1117] overflow-x-auto">
              <code className="text-sm text-zinc-300 font-mono">{exercise.starterCode}</code>
            </pre>
          </div>
        )}

        {/* Hints */}
        {exercise.hints.length > 0 && (
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            <span>{showHints ? 'Hide' : 'Show'} Hints ({exercise.hints.length})</span>
            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        <AnimatePresence>
          {showHints && exercise.hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                {exercise.hints.map((hint, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-200/80">
                    <span className="text-amber-400 font-medium">{i + 1}.</span>
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response Area */}
        {!isCompleted ? (
          <>
            <Textarea
              id={`tryit-${lessonId || 'default'}-${blockIndex || 0}`}
              name="exercise-response"
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              placeholder="Write your code or response here..."
              className="min-h-[200px] bg-[#0d1117] border-zinc-700 text-zinc-100 font-mono text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 resize-none"
            />
            
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!userResponse.trim() || isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Submitted Response */}
            <div className="rounded-xl overflow-hidden border border-zinc-700/50">
              <div className="px-4 py-2 bg-zinc-800/80 border-b border-zinc-700/50">
                <span className="text-xs text-zinc-500">Your Submission</span>
              </div>
              <pre className="p-4 bg-[#0d1117] overflow-x-auto max-h-48">
                <code className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{userResponse}</code>
              </pre>
            </div>

            {/* Feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 via-transparent to-green-500/10 border border-cyan-500/30"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-white">Feedback</span>
                  {feedback.score && (
                    <span className="ml-auto text-sm text-cyan-400 font-medium">{feedback.score}/10</span>
                  )}
                </div>
                
                <p className="text-zinc-200 mb-4">{feedback.feedback}</p>
                
                {feedback.strengths?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {feedback.strengths.map((strength, i) => (
                      <span 
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {strength}
                      </span>
                    ))}
                  </div>
                )}
                
                {feedback.suggestion && (
                  <p className="text-sm text-cyan-300/80 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {feedback.suggestion}
                  </p>
                )}
              </motion.div>
            )}

            {/* Try Again */}
            <div className="flex justify-end">
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}