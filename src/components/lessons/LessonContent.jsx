import React, { useRef, useEffect, useCallback, useState, lazy, Suspense, useMemo, memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen, Clock, CheckCircle2, ChevronDown, ChevronUp,
  Code2, Lightbulb, Target, Sparkles, Copy, Check,
  Zap, Award, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Lazy load interactive blocks
const ReflectionBlock = lazy(() => import('./renderers/ReflectionBlock'));
const TryItBlock = lazy(() => import('./renderers/TryItBlock'));
const MermaidBlock = lazy(() => import('./renderers/MermaidBlock'));

// Memoized Mermaid wrapper to prevent re-renders
const StableMermaidBlock = memo(({ content }) => (
  <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-800 rounded-xl my-6" />}>
    <MermaidBlock content={content} />
  </Suspense>
));

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
    <div className="my-6 rounded-xl overflow-hidden bg-[#0d1117] border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500 font-mono uppercase">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
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
  const styles = {
    info: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: Lightbulb, iconColor: 'text-teal-400' },
    tip: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Sparkles, iconColor: 'text-green-400' },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Zap, iconColor: 'text-amber-400' },
    important: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Target, iconColor: 'text-purple-400' },
  };

  const config = styles[type] || styles.info;
  const Icon = config.icon;

  return (
    <div className={cn("my-6 rounded-xl p-4 border", config.bg, config.border)}>
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconColor)} />
        <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// Key Takeaway
function KeyTakeaway({ children }) {
  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 via-transparent to-purple-500/10 border border-teal-500/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-teal-500/20">
          <Award className="w-4 h-4 text-teal-400" />
        </div>
        <span className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Key Takeaway</span>
      </div>
      <p className="text-white font-medium leading-relaxed">{children}</p>
    </div>
  );
}

// Progress bar as separate component to prevent re-renders of content
function ProgressBar({ containerRef }) {
  const [progress, setProgress] = useState(0);
  const scrollRAF = useRef(null);
  const lastProgress = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollRAF.current) return;

      scrollRAF.current = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          let scrollProgress = Math.min(Math.max((scrollTop / maxScroll) * 100, 0), 100);
          scrollProgress = Math.round(scrollProgress / 5) * 5;
          if (Math.abs(scrollProgress - lastProgress.current) >= 5) {
            lastProgress.current = scrollProgress;
            setProgress(scrollProgress);
          }
        }
        scrollRAF.current = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollRAF.current) cancelAnimationFrame(scrollRAF.current);
    };
  }, [containerRef]);

  return (
    <div className="h-1 bg-zinc-900 flex-shrink-0">
      <div
        className="h-full bg-gradient-to-r from-teal-500 to-purple-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Memoized markdown content to prevent re-renders on scroll
const MarkdownContent = memo(function MarkdownContent({ contentString, lessonId }) {
  // Memoize the components object so it doesn't change on re-render
  const components = useMemo(() => ({
    h1: ({ children }) => (
      <h1 className="text-2xl lg:text-3xl font-bold text-white mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl lg:text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-zinc-800">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-teal-400 mt-6 mb-3">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-zinc-200 mt-4 mb-2">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-zinc-300 leading-relaxed mb-4 text-base">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="space-y-2 mb-4 ml-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="space-y-2 mb-4 ml-0 list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-3 text-zinc-300">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2.5 flex-shrink-0" />
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }) => (
      <strong className="text-white font-semibold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="text-teal-400 not-italic font-medium">{children}</em>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-zinc-900/80 border-b border-zinc-800">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-zinc-800/50">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-semibold text-teal-400 uppercase tracking-wider">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-zinc-300">{children}</td>
    ),
    code: ({ inline, className, children }) => {
      const language = className?.replace('language-', '') || '';

      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-teal-400 text-sm font-mono border border-zinc-700">
            {children}
          </code>
        );
      }

      if (['callout', 'tip', 'info', 'warning'].includes(language)) {
        return <CalloutBox type={language}>{String(children)}</CalloutBox>;
      }

      if (language === 'key' || language === 'takeaway') {
        return <KeyTakeaway>{String(children)}</KeyTakeaway>;
      }

      if (language === 'reflection') {
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-800 rounded-xl my-6" />}>
            <ReflectionBlock content={String(children)} lessonId={lessonId} />
          </Suspense>
        );
      }

      if (language === 'tryit' || language === 'exercise') {
        return (
          <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-800 rounded-xl my-6" />}>
            <TryItBlock content={String(children)} lessonId={lessonId} />
          </Suspense>
        );
      }

      if (language === 'mermaid') {
        return <StableMermaidBlock content={String(children)} />;
      }

      return <CodeBlock language={language}>{children}</CodeBlock>;
    },
    pre: ({ children }) => <>{children}</>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 pl-4 border-l-4 border-teal-500 bg-teal-500/5 py-3 pr-4 rounded-r-lg text-zinc-300 italic">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
      >
        {children}
      </a>
    ),
    hr: () => (
      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
        <Sparkles className="w-4 h-4 text-zinc-600" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      </div>
    ),
    img: ({ src, alt }) => (
      <figure className="my-6">
        <img
          src={src}
          alt={alt || ''}
          className="rounded-xl max-w-full h-auto border border-zinc-800"
          loading="lazy"
        />
        {alt && <figcaption className="text-center text-sm text-zinc-500 mt-2">{alt}</figcaption>}
      </figure>
    ),
  }), [lessonId]);

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={contentString}
        components={components}
      />
    </article>
  );
});

export default function LessonContent({ lesson, onComplete }) {
  const contentRef = useRef(null);

  // Reset scroll when lesson changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [lesson?.id]);

  // Extract content - handle both string and JSON formats
  const contentString = useMemo(() => {
    if (!lesson?.content) return null;
    if (typeof lesson.content === 'string') return lesson.content;
    if (typeof lesson.content === 'object' && lesson.content.body) return lesson.content.body;
    if (typeof lesson.content === 'object') return JSON.stringify(lesson.content);
    return null;
  }, [lesson?.content]);

  if (!contentString) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-6">
          <BookOpen className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Content</h3>
        <p className="text-zinc-400">This lesson's content is being prepared.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Progress Bar - separate component to avoid re-rendering content */}
      <ProgressBar containerRef={contentRef} />

      {/* Scrollable Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
          {/* Lesson Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {lesson.lesson_type && (
              <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
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

          {/* Markdown Content - memoized to prevent re-renders */}
          <MarkdownContent contentString={contentString} lessonId={lesson?.id} />

          {/* Completion CTA */}
          <div className="mt-12 mb-8 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">Ready to continue?</h3>
                  <p className="text-xs text-zinc-500">Mark this lesson as complete</p>
                </div>
              </div>
              <Button
                onClick={onComplete}
                className="bg-teal-600 hover:bg-teal-500 text-white text-sm px-5"
              >
                Complete & Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}