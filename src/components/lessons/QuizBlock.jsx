
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuizBlock({ quiz = [], onScored = () => {} }) {
  // Limit to at most 3 concise questions for knowledge check
  const items = Array.isArray(quiz) ? quiz.slice(0, 3) : [];
  const [answers, setAnswers] = React.useState({});
  const [openAnswers, setOpenAnswers] = React.useState({});
  const [checked, setChecked] = React.useState(false);
  const [scorePct, setScorePct] = React.useState(null);

  const select = (qi, opt) => setAnswers(prev => ({ ...prev, [qi]: opt }));
  const onChangeOpen = (qi, txt) => setOpenAnswers(prev => ({ ...prev, [qi]: txt }));

  const check = () => {
    let correct = 0;
    items.forEach((q, i) => {
      if (q.type === "multiple_choice") {
        if ((answers[i] || "").trim() === (q.correct_answer || "").trim()) correct += 1;
      } else {
        // Knowledge-focused: give credit for thoughtful completion
        if ((openAnswers[i] || "").trim().length > 0) correct += 1;
      }
    });
    const pct = Math.round((correct / Math.max(items.length, 1)) * 100);
    setScorePct(pct);
    setChecked(true);
    onScored(pct);
  };

  if (!items.length) return null;

  return (
    <Card className="glass-card border-0 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Knowledge Check</h3>
        <span className="pill">{items.length} questions</span>
      </div>

      <div className="space-y-6">
        {items.map((q, i) => (
          <div key={i} className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
            <p className="font-medium text-white mb-3">{i + 1}. {q.question}</p>

            {q.type === "multiple_choice" ? (
              <div className="grid gap-2">
                {(q.options || []).slice(0, 5).map((opt, oi) => {
                  const active = answers[i] === opt;
                  const correct = checked && (q.correct_answer || "").trim() === opt.trim();
                  const wrong = checked && active && !correct;
                  return (
                    <button
                      key={oi}
                      onClick={() => !checked && select(i, opt)}
                      className={`text-left px-4 py-3 rounded-lg border transition-colors
                        ${correct ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" :
                          wrong ? "border-red-500/40 bg-red-500/10 text-red-200" :
                          active ? "border-emerald-500/25 bg-white/5 text-white" :
                          "border-gray-700/50 bg-gray-900/10 text-gray-300 hover:bg-white/5"}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={openAnswers[i] || ""}
                onChange={(e) => onChangeOpen(i, e.target.value)}
                className="w-full bg-transparent border border-gray-700/50 rounded-lg p-3 text-white placeholder-gray-500"
                placeholder="Write a short answer…"
                rows={3}
                disabled={checked}
              />
            )}

            {checked && q.explanation && (
              <div className="mt-3 text-sm text-gray-300">
                <div className="text-emerald-300 font-medium">Explanation</div>
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        {scorePct !== null ? (
          <div className="text-sm text-gray-300">
            Your score: <span className={`font-semibold ${scorePct >= 70 ? "text-emerald-300" : "text-yellow-300"}`}>{scorePct}%</span>
          </div>
        ) : <div />}
        <Button onClick={check} disabled={checked} className="emerald-gradient emerald-gradient-hover">
          {checked ? "Checked" : "Check answers"}
        </Button>
      </div>
    </Card>
  );
}
