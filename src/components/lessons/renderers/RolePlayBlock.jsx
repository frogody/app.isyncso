import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * RolePlayBlock - Interactive scenario with branching choices
 * Great for soft skills, compliance, sales training
 */
export default function RolePlayBlock({ content, lessonId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [choices, setChoices] = useState([]);
  const [complete, setComplete] = useState(false);

  // Parse roleplay from markdown
  const scenario = React.useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      return {
        steps: [
          {
            situation: "Unable to parse scenario",
            options: [{ text: "Restart", next: 0, feedback: "" }]
          }
        ]
      };
    }
  }, [content]);

  const currentScenario = scenario.steps[currentStep];

  const handleChoice = (option) => {
    setChoices([...choices, { step: currentStep, choice: option.text, feedback: option.feedback }]);
    
    if (option.next === 'complete') {
      setComplete(true);
    } else if (option.next !== undefined) {
      setCurrentStep(option.next);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setChoices([]);
    setComplete(false);
  };

  if (complete) {
    return (
      <Card className="bg-green-500/10 border-green-500/30 p-6 my-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">🎯</div>
          <h3 className="text-xl font-semibold text-white">Scenario Complete!</h3>
          <p className="text-gray-300">You navigated through {choices.length} decision points.</p>
          <Button onClick={restart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Different Path
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/30 border-yellow-500/20 p-6 my-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Interactive Scenario</h3>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-gray-200 leading-relaxed">{currentScenario.situation}</p>
          </div>

          <div className="space-y-2">
            {currentScenario.options?.map((option, idx) => (
              <Button
                key={idx}
                onClick={() => handleChoice(option)}
                variant="outline"
                className="w-full justify-between text-left h-auto py-3 px-4 hover:bg-yellow-500/10 hover:border-yellow-500/50"
              >
                <span className="text-gray-200">{option.text}</span>
                <ArrowRight className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              </Button>
            ))}
          </div>

          {choices.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              Step {currentStep + 1} · {choices.length} choices made
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}