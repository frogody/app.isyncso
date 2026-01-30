import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Save, 
  Loader2, 
  Wand2, 
  Eye, 
  AlertCircle,
  Sparkles,
  Undo2
} from "lucide-react";
import { db } from "@/api/supabaseClient";
import { toast } from "sonner";
import InteractiveLesson from "../lessons/InteractiveLesson";

export default function LessonEditor({ lesson, onSave, onCancel }) {
  const [content, setContent] = useState(lesson?.content || "");
  const [originalContent] = useState(lesson?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [remixInstruction, setRemixInstruction] = useState("");
  const [showRemixInput, setShowRemixInput] = useState(false);
  const textareaRef = useRef(null);

  const hasChanges = content !== originalContent;

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      await db.entities.Lesson.update(lesson.id, {
        content: content
      });
      
      toast.success("Lesson saved successfully!");
      if (onSave) onSave();
    } catch (error) {
      console.error("Failed to save lesson:", error);
      toast.error("Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemixSelection = async () => {
    if (!remixInstruction.trim()) {
      toast.error("Please enter a remix instruction");
      return;
    }

    const textarea = textareaRef.current;
    const selectedText = textarea ? textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    ) : "";

    const contentToRemix = selectedText || content;

    if (!contentToRemix.trim()) {
      toast.error("No content to remix");
      return;
    }

    setIsRemixing(true);
    try {
      const { data } = await db.functions.invoke('remixContent', {
        current_content: contentToRemix,
        instruction: remixInstruction,
        context: lesson.title
      });

      if (data.success) {
        // If user selected text, replace just that portion
        if (selectedText) {
          const before = content.substring(0, textarea.selectionStart);
          const after = content.substring(textarea.selectionEnd);
          setContent(before + data.remixed_content + after);
        } else {
          // Replace entire content
          setContent(data.remixed_content);
        }
        
        toast.success("Content remixed successfully!");
        setShowRemixInput(false);
        setRemixInstruction("");
      } else {
        toast.error("Failed to remix content");
      }
    } catch (error) {
      console.error("Remix error:", error);
      toast.error("Failed to remix content");
    } finally {
      setIsRemixing(false);
    }
  };

  const handleRevert = () => {
    if (confirm("Are you sure you want to revert all changes?")) {
      setContent(originalContent);
      toast.info("Changes reverted");
    }
  };

  // Create a mock lesson object for preview
  const previewLesson = {
    ...lesson,
    content: content
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header Toolbar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Lesson Editor</h2>
              <p className="text-sm text-gray-400">{lesson.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                onClick={handleRevert}
                variant="outline"
                size="sm"
                className="border-slate-700 text-gray-400 hover:text-white hover:bg-slate-800"
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Revert
              </Button>
            )}
            
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
              className="border-slate-700 text-gray-400 hover:text-white hover:bg-slate-800"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>

            <Button
              onClick={() => setShowRemixInput(!showRemixInput)}
              variant="outline"
              size="sm"
              className="border-purple-500/40 text-purple-400 hover:bg-purple-500/20"
              disabled={isRemixing}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Remix with AI
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
              className={`${
                hasChanges
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/50'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Remix Input */}
        {showRemixInput && (
          <div className="mt-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">AI Remix Instructions</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={remixInstruction}
                onChange={(e) => setRemixInstruction(e.target.value)}
                placeholder="e.g., 'Make this more beginner-friendly' or 'Add a practical example'"
                className="flex-1 bg-slate-900 text-white border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRemixSelection();
                  }
                }}
              />
              <Button
                onClick={handleRemixSelection}
                disabled={isRemixing || !remixInstruction.trim()}
                size="sm"
                className="bg-purple-600 hover:bg-purple-500"
              >
                {isRemixing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Remixing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Apply
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Select text in the editor to remix only that section, or leave unselected to remix the entire lesson.
            </p>
          </div>
        )}
      </div>

      {/* Editor + Preview Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-800">
            <span className="text-xs text-teal-400 font-bold uppercase tracking-widest">
              Markdown Editor
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4 not-prose">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-full w-full bg-slate-950 text-gray-100 font-mono text-sm border-0 focus:ring-0 resize-none"
              placeholder="Enter lesson content in markdown..."
            />
          </div>
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-800">
              <span className="text-xs text-yellow-400 font-bold uppercase tracking-widest">
                Live Preview
              </span>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-950/50">
              {content.trim() ? (
                <InteractiveLesson 
                  lesson={previewLesson}
                  onComplete={() => {}}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start typing to see preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}