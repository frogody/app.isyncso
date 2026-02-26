import React, { useEffect, useRef, useState, memo } from "react";
import { SafeHTML } from '@/components/ui/SafeHTML';
import mermaid from "mermaid";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mermaid is initialized once globally
let mermaidInitialized = false;

const initMermaid = () => {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 30,
      rankSpacing: 40
    },
    themeVariables: {
      primaryColor: '#06B6D4',
      primaryTextColor: '#fff',
      primaryBorderColor: '#06B6D4',
      lineColor: '#64748b',
      secondaryColor: '#0891b2',
      tertiaryColor: '#334155',
      background: '#0f172a',
      mainBkg: '#1e293b',
      secondBkg: '#334155',
      labelBackground: '#1e293b',
      fontSize: '12px',
      fontFamily: "'Inter', sans-serif",
      nodeTextColor: '#ffffff',
      edgeLabelBackground: '#1e293b'
    }
  });

  mermaidInitialized = true;
};

// Cache for rendered diagrams to prevent re-rendering
const diagramCache = new Map();

function MermaidBlockInner({ content }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [svgContent, setSvgContent] = useState(null);
  const hasRendered = useRef(false);
  const contentHash = useRef(content);

  useEffect(() => {
    // Only render if content changed or never rendered
    if (hasRendered.current && contentHash.current === content) {
      return;
    }

    const renderDiagram = async () => {
      if (!content) return;

      // Check cache first
      const cacheKey = content.trim();
      if (diagramCache.has(cacheKey)) {
        setSvgContent(diagramCache.get(cacheKey));
        setIsLoading(false);
        hasRendered.current = true;
        return;
      }

      setIsLoading(true);
      setError(null);

      // Clean content - remove extra whitespace and normalize
      const cleanContent = content.trim().replace(/\\n/g, '\n');

      try {
        initMermaid();

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, cleanContent);

        // Cache the result
        diagramCache.set(cacheKey, svg);
        setSvgContent(svg);
        hasRendered.current = true;
        contentHash.current = content;
      } catch (err) {
        console.error("Mermaid rendering failed:", err);
        setError(err.message || 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderDiagram, 50);
    return () => clearTimeout(timer);
  }, [content]);

  const handleRetry = () => {
    hasRendered.current = false;
    contentHash.current = '';
    setError(null);
    setIsLoading(true);
  };

  if (error) {
    return (
      <div className="my-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-400 text-sm font-medium mb-1">Diagram could not be rendered</p>
            <p className="text-zinc-500 text-xs mb-3">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
        {/* Show raw content as fallback */}
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          <pre className="text-xs text-zinc-400 whitespace-pre-wrap overflow-x-auto">{content}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 relative">
      {isLoading && (
        <div className="flex items-center justify-center bg-zinc-900/30 rounded-xl h-32">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}
      {svgContent && (
        <SafeHTML
          className="flex items-center justify-center overflow-x-auto rounded-xl bg-zinc-900/30 p-4"
          style={{ maxHeight: '400px' }}
          html={svgContent}
          svg
        />
      )}
      <style>{`
        .mermaid svg {
          max-width: 100% !important;
          max-height: 350px !important;
          height: auto !important;
        }
      `}</style>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const MermaidBlock = memo(MermaidBlockInner, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content;
});

export default MermaidBlock;