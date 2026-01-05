import React, { useEffect, useRef, useState, useCallback } from "react";
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
      curve: 'basis'
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
      fontSize: '14px',
      fontFamily: "'Inter', sans-serif",
      nodeTextColor: '#ffffff',
      edgeLabelBackground: '#1e293b'
    }
  });
  
  mermaidInitialized = true;
};

export default function MermaidBlock({ content }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderAttempt = useRef(0);
  const uniqueId = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const renderDiagram = useCallback(async () => {
    if (!containerRef.current || !content) return;
    
    setIsLoading(true);
    setError(null);
    
    // Clean content - remove extra whitespace and normalize
    const cleanContent = content.trim().replace(/\\n/g, '\n');
    
    try {
      initMermaid();
      
      // Generate unique ID for this render
      const id = `${uniqueId.current}-${renderAttempt.current++}`;
      
      // Clear previous content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Render the diagram
      const { svg } = await mermaid.render(id, cleanContent);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        
        // Style the SVG
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
          svgElement.style.display = 'block';
          svgElement.style.margin = '0 auto';
        }
      }
    } catch (err) {
      console.error("Mermaid rendering failed:", err);
      setError(err.message || 'Failed to render diagram');
    } finally {
      setIsLoading(false);
    }
  }, [content]);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timer);
  }, [renderDiagram]);

  if (error) {
    return (
      <div className="my-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-400 text-sm font-medium mb-1">Diagram could not be rendered</p>
            <p className="text-zinc-500 text-xs mb-3">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={renderDiagram}
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
    <div className="my-8 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-xl min-h-[200px]">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`flex items-center justify-center overflow-x-auto rounded-xl bg-zinc-900/30 p-4 min-h-[200px] ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
}