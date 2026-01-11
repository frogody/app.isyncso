import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCircle, Send, Loader2 } from 'lucide-react';
import { db } from '@/api/supabaseClient';

/**
 * ExpertBlock - Ask questions to an industry expert AI persona
 * Different from main tutor - specialized domain knowledge
 */
export default function ExpertBlock({ content, persona = 'Industry Expert', lessonId }) {
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const askExpert = async () => {
    if (!question.trim() || isAsking) return;

    const userQuestion = question.trim();
    setQuestion('');
    setIsAsking(true);

    try {
      const expertPrompt = `You are ${persona}, an industry expert. A learner is studying this content:

${content}

They asked: "${userQuestion}"

Respond as the expert with practical, real-world insights. Keep it under 100 words. Be conversational and helpful.`;

      const result = await db.integrations.Core.InvokeLLM({
        prompt: expertPrompt
      });

      setResponses([...responses, { question: userQuestion, answer: result }]);
    } catch (error) {
      console.error('[ExpertBlock] Failed:', error);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <Card className="bg-indigo-500/10 border-indigo-500/30 p-6 my-4">
      <div className="flex items-center gap-2 mb-4">
        <UserCircle className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Ask the Expert: {persona}</h3>
      </div>

      {responses.length > 0 && (
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {responses.map((r, idx) => (
            <div key={idx} className="space-y-2">
              <div className="bg-gray-900/50 rounded-lg p-3 ml-8">
                <p className="text-sm text-gray-300 italic">"{r.question}"</p>
              </div>
              <div className="bg-indigo-900/30 rounded-lg p-3 mr-8">
                <p className="text-sm text-gray-200">{r.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && askExpert()}
          placeholder="Ask the expert a question..."
          className="bg-gray-900/50 border-indigo-500/30 text-white"
          disabled={isAsking}
        />
        <Button
          onClick={askExpert}
          disabled={!question.trim() || isAsking}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  );
}