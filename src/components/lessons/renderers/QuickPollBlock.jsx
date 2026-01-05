import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * QuickPollBlock - Self-assessment and reflection tool
 * 
 * Usage in markdown:
 * ```poll
 * {
 *   "question": "How confident do you feel about this concept?",
 *   "options": ["Not confident", "Somewhat confident", "Very confident", "Expert level"],
 *   "reflection": "It's okay to not be confident yet! That's what practice is for."
 * }
 * ```
 */

export default function QuickPollBlock({ content }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  let config;
  try {
    config = JSON.parse(content);
  } catch (e) {
    return (
      <Card className="glass-card border-0 my-4">
        <CardContent className="p-4 text-red-400">
          Invalid poll block format
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (selected !== null) {
      setSubmitted(true);
    }
  };

  return (
    <Card className="glass-card border-0 my-6 border-cyan-500/20">
      <CardContent className="p-6">
        {/* Question */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h4 className="text-lg font-semibold text-white">Quick Check-In</h4>
          </div>
          <p className="text-gray-300 leading-relaxed">{config.question}</p>
        </div>

        {/* Options */}
        {!submitted ? (
          <>
            <div className="space-y-2 mb-4">
              {config.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelected(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selected === index
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="text-white text-sm">{option}</span>
                </button>
              ))}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={selected === null}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
            >
              Submit
            </Button>
          </>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Thanks for your input!</span>
              </div>
              
              {config.reflection && (
                <p className="text-gray-300 text-sm leading-relaxed p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                  {config.reflection}
                </p>
              )}

              <button
                onClick={() => {
                  setSelected(null);
                  setSubmitted(false);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Change answer
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}