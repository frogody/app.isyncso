import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Lightbulb, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * DecisionBlock - Interactive decision scenario for non-technical learning
 * 
 * Usage in markdown:
 * ```decision
 * {
 *   "scenario": "Your team wants to implement AI in customer service...",
 *   "question": "What's your first step?",
 *   "options": [
 *     {
 *       "text": "Buy the most expensive AI tool immediately",
 *       "outcome": "negative",
 *       "feedback": "Whoa there! Without understanding your needs first..."
 *     },
 *     {
 *       "text": "Map current customer pain points and processes",
 *       "outcome": "positive",
 *       "feedback": "Exactly! Understanding the problem before..."
 *     }
 *   ]
 * }
 * ```
 */

export default function DecisionBlock({ content }) {
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  let config;
  try {
    config = JSON.parse(content);
  } catch (e) {
    return (
      <Card className="glass-card border-0 my-4">
        <CardContent className="p-4 text-red-400">
          Invalid decision block format
        </CardContent>
      </Card>
    );
  }

  const handleChoice = (index) => {
    setSelected(index);
    setShowFeedback(true);
  };

  const selectedOption = selected !== null ? config.options[selected] : null;

  return (
    <Card className="glass-card border-0 my-6 border-purple-500/20">
      <CardContent className="p-6">
        {/* Scenario */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            <h4 className="text-lg font-semibold text-white">Decision Scenario</h4>
          </div>
          <p className="text-gray-300 leading-relaxed mb-4">{config.scenario}</p>
          <p className="text-white font-medium">{config.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-4">
          {config.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrect = option.outcome === 'positive';
            
            return (
              <motion.button
                key={index}
                onClick={() => !showFeedback && handleChoice(index)}
                disabled={showFeedback}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected && showFeedback
                    ? isCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-red-500 bg-red-500/10'
                    : isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}

                whileTap={!showFeedback ? { scale: 0.99 } : {}}
              >
                <div className="flex items-start gap-3">
                  {showFeedback && isSelected && (
                    isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )
                  )}
                  <span className="text-white flex-1">{option.text}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {showFeedback && selectedOption && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg border ${
                selectedOption.outcome === 'positive'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-orange-500/10 border-orange-500/30'
              }`}
            >
              <p className={`text-sm leading-relaxed ${
                selectedOption.outcome === 'positive' ? 'text-green-200' : 'text-orange-200'
              }`}>
                {selectedOption.feedback}
              </p>
              {config.learn_more && (
                <button
                  onClick={() => setShowFeedback(false)}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  Try another approach
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}