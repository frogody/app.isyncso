import React, { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { 
  BookOpen, Clock, CheckCircle2, ChevronDown, ChevronUp, 
  Code2, Lightbulb, Target, Sparkles, Copy, Check,
  Brain, Zap, Award, ArrowRight, HelpCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

// Lazy load interactive blocks
const MermaidBlock = React.lazy(() => import('./renderers/MermaidBlock'));
const ReflectionBlock = React.lazy(() => import('./renderers/ReflectionBlock'));
const TryItBlock = React.lazy(() => import('./renderers/TryItBlock'));
const DecisionBlock = React.lazy(() => import('./renderers/DecisionBlock'));
const QuickPollBlock = React.lazy(() => import('./renderers/QuickPollBlock'));
const ApplicationBlock = React.lazy(() => import('./renderers/ApplicationBlock'));

// Code Block Component
function CodeBlock({ children, language }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-6 rounded-xl overflow-hidden bg-[#0d1117] border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500 font-mono uppercase">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-sm font-mono leading-relaxed">
          <code className="text-[#e6edf3]">{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Callout Box
function CalloutBox({ type = 'info', children }) {
  const configs = {
    info: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: Lightbulb, color: 'text-cyan-400' },
    tip: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Sparkles, color: 'text-green-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Zap, color: 'text-amber-400' },
    important: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Target, color: 'text-purple-400' },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={cn("my-6 rounded-xl p-4 border", config.bg, config.border)}>
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.color)} />
        <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// Key Takeaway
function KeyTakeaway({ children }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 border border-cyan-500/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Key Takeaway</span>
      </div>
      <p className="text-white font-medium leading-relaxed">{children}</p>
    </motion.div>
  );
}

// Block Refs for unique keys
let blockCounters = { reflection: 0, tryit: 0, decision: 0, poll: 0, application: 0 };

export default function InteractiveLesson({ lesson, onComplete }) {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [user, setUser] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef(null);

  // Reset block counters on lesson change
  useEffect(() => {
    blockCounters = { reflection: 0, tryit: 0, decision: 0, poll: 0, application: 0 };
    base44.auth.me().then(setUser).catch(console.error);
  }, [lesson?.id]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100);
      setReadingProgress(Math.round(progress) || 0);
    };

    const el = contentRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const quiz = lesson?.interactive_config?.quiz || [];
  const hasQuiz = quiz.length > 0;

  const handleAnswerSelect = (answer) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: answer });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      let correct = 0;
      quiz.forEach((q, i) => {
        if (selectedAnswers[i] === q.correct_answer) correct++;
      });
      setScore(Math.round((correct / quiz.length) * 100));
      setShowResults(true);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  if (!lesson?.content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BookOpen className="w-16 h-16 text-zinc-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{lesson?.title || 'Loading...'}</h3>
        <p className="text-zinc-400">Content is being prepared...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Reading Progress */}
      <div className="sticky top-0 z-10 h-1 bg-zinc-900">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
          animate={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 scrollbar-hide">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {lesson.lesson_type && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                {lesson.lesson_type}
              </Badge>
            )}
            {lesson.duration_minutes && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {lesson.duration_minutes} min
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            {lesson.title}
          </h1>
        </motion.div>

        {/* Markdown Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose prose-invert prose-lg max-w-none"
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-bold text-white mt-10 mb-6 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-10 mb-4 pb-3 border-b border-zinc-800">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-semibold text-cyan-400 mt-8 mb-3">{children}</h3>,
              h4: ({ children }) => <h4 className="text-lg font-semibold text-zinc-200 mt-6 mb-2">{children}</h4>,
              
              p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-5 text-base lg:text-lg">{children}</p>,
              
              ul: ({ children }) => <ul className="space-y-2 mb-6 ml-1">{children}</ul>,
              ol: ({ children }) => <ol className="space-y-2 mb-6 ml-1 list-decimal list-inside">{children}</ol>,
              li: ({ children }) => (
                <li className="flex items-start gap-3 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2.5 flex-shrink-0" />
                  <span className="flex-1">{children}</span>
                </li>
              ),
              
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-cyan-400 not-italic font-medium">{children}</em>,
              
              code: ({ inline, className, children }) => {
                const language = className?.replace('language-', '') || '';
                const content = String(children).trim();
                
                if (inline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 text-sm font-mono border border-zinc-700">
                      {children}
                    </code>
                  );
                }

                // Interactive blocks
                if (language === 'mermaid') {
                  return (
                    <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-800 rounded-xl my-6" />}>
                      <MermaidBlock content={content} />
                    </Suspense>
                  );
                }

                if (language === 'reflection') {
                  const idx = blockCounters.reflection++;
                  return (
                    <Suspense fallback={<div className="animate-pulse h-40 bg-zinc-800 rounded-xl my-6" />}>
                      <ReflectionBlock content={content} lessonId={lesson?.id} blockIndex={idx} />
                    </Suspense>
                  );
                }

                if (language === 'tryit' || language === 'exercise') {
                  const idx = blockCounters.tryit++;
                  return (
                    <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-800 rounded-xl my-6" />}>
                      <TryItBlock content={content} lessonId={lesson?.id} blockIndex={idx} />
                    </Suspense>
                  );
                }

                if (language === 'decision') {
                  const idx = blockCounters.decision++;
                  return (
                    <Suspense fallback={<div className="animate-pulse h-40 bg-zinc-800 rounded-xl my-6" />}>
                      <DecisionBlock content={content} lessonId={lesson?.id} blockIndex={idx} />
                    </Suspense>
                  );
                }

                if (language === 'poll') {
                  const idx = blockCounters.poll++;
                  return (
                    <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-800 rounded-xl my-6" />}>
                      <QuickPollBlock content={content} lessonId={lesson?.id} blockIndex={idx} />
                    </Suspense>
                  );
                }

                if (language === 'application') {
                  const idx = blockCounters.application++;
                  return (
                    <Suspense fallback={<div className="animate-pulse h-40 bg-zinc-800 rounded-xl my-6" />}>
                      <ApplicationBlock content={content} lessonId={lesson?.id} blockIndex={idx} userId={user?.id} />
                    </Suspense>
                  );
                }

                // Callouts
                if (['callout', 'tip', 'info', 'warning', 'important'].includes(language)) {
                  return <CalloutBox type={language}>{content}</CalloutBox>;
                }

                if (language === 'key' || language === 'takeaway') {
                  return <KeyTakeaway>{content}</KeyTakeaway>;
                }

                return <CodeBlock language={language}>{children}</CodeBlock>;
              },
              
              pre: ({ children }) => <>{children}</>,
              
              blockquote: ({ children }) => (
                <blockquote className="my-6 pl-4 border-l-4 border-cyan-500 bg-cyan-500/5 py-4 pr-4 rounded-r-lg">
                  <div className="text-zinc-300 italic">{children}</div>
                </blockquote>
              ),
              
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" 
                   className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-400 transition-colors">
                  {children}
                </a>
              ),
              
              hr: () => (
                <div className="my-10 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                  <Sparkles className="w-4 h-4 text-zinc-600" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                </div>
              ),
            }}
          >
            {lesson.content}
          </ReactMarkdown>
        </motion.div>

        {/* Quiz Section */}
        {hasQuiz && (
          <Card className="mt-10 bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              {!quizStarted && !showResults && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Knowledge Check</h3>
                  <p className="text-zinc-400 mb-6">Test your understanding with {quiz.length} questions</p>
                  <Button onClick={() => setQuizStarted(true)} className="bg-cyan-600 hover:bg-cyan-500">
                    Start Quiz
                  </Button>
                </div>
              )}

              {quizStarted && !showResults && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Question {currentQuestionIndex + 1}/{quiz.length}</h3>
                    <Progress value={((currentQuestionIndex + 1) / quiz.length) * 100} className="w-32 h-2" />
                  </div>

                  <p className="text-white text-lg">{quiz[currentQuestionIndex].question}</p>

                  <div className="space-y-2">
                    {quiz[currentQuestionIndex].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswerSelect(opt)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all",
                          selectedAnswers[currentQuestionIndex] === opt
                            ? "border-cyan-500 bg-cyan-500/10 text-white"
                            : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="border-zinc-700"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      disabled={selectedAnswers[currentQuestionIndex] === undefined}
                      className="bg-cyan-600 hover:bg-cyan-500"
                    >
                      {currentQuestionIndex === quiz.length - 1 ? 'Submit' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {showResults && (
                <div className="text-center py-6">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4",
                    score >= 70 ? "bg-green-500/20" : "bg-amber-500/20"
                  )}>
                    <Award className={cn("w-10 h-10", score >= 70 ? "text-green-400" : "text-amber-400")} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h3>
                  <p className="text-4xl font-bold text-cyan-400 mb-4">{score}%</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={handleRetakeQuiz} className="border-zinc-700">Retake</Button>
                    <Button onClick={onComplete} className="bg-cyan-600 hover:bg-cyan-500">Continue</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Complete Button */}
        {!hasQuiz && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ready to continue?</h3>
                  <p className="text-sm text-zinc-400">Mark this lesson as complete</p>
                </div>
              </div>
              <Button onClick={onComplete} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white px-6">
                Complete & Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}