import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Save, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * ApplicationBlock - "How does this apply to YOUR work?" reflection
 * Personalizes to their actual company and role
 * 
 * Usage in markdown:
 * ```application
 * {
 *   "prompt": "How could you apply this concept in your role?",
 *   "placeholder": "Think about a specific project or challenge...",
 *   "hint": "Consider your current priorities and team goals"
 * }
 * ```
 */

export default function ApplicationBlock({ content, lessonId, blockIndex, userId }) {
  const [response, setResponse] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  let config;
  try {
    config = JSON.parse(content);
  } catch (e) {
    return (
      <Card className="glass-card border-0 my-4">
        <CardContent className="p-4 text-red-400">
          Invalid application block format
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    if (!response.trim() || !lessonId) return;

    setSaving(true);
    try {
      const currentUser = user || await base44.auth.me();
      
      await base44.entities.LessonInteraction.create({
        user_id: currentUser.id,
        lesson_id: lessonId,
        interaction_key: `application_${blockIndex}`,
        interaction_type: 'reflection',
        user_input: response
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save application:', error);
    } finally {
      setSaving(false);
    }
  };

  const personalizedPrompt = user ? 
    config.prompt.replace('[role]', user.job_title || 'your role')
                 .replace('[company]', user.company_name || 'your company') 
    : config.prompt;

  return (
    <Card className="glass-card border-0 my-6 border-amber-500/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <h4 className="text-lg font-semibold text-white">Apply to Your Work</h4>
          </div>
          <p className="text-gray-300 leading-relaxed mb-2">{personalizedPrompt}</p>
          {config.hint && (
            <p className="text-sm text-gray-500 italic">{config.hint}</p>
          )}
        </div>

        {/* Input */}
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder={config.placeholder || "Your thoughts here..."}
          className="bg-gray-900/50 border-gray-800 text-white min-h-[120px] mb-3"
        />

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {response.length > 0 ? `${response.length} characters` : 'Start writing...'}
          </span>
          <Button
            onClick={handleSave}
            disabled={!response.trim() || saving}
            className="bg-amber-600 hover:bg-amber-500"
          >
            {saved ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Reflection
              </>
            )}
          </Button>
        </div>

        {user && user.job_title && (
          <p className="text-xs text-gray-600 mt-3 italic">
            💡 The AI tutor can reference this in your conversations
          </p>
        )}
      </CardContent>
    </Card>
  );
}