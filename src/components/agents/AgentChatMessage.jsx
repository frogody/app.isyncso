import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { Terminal, ChevronDown, ChevronRight, CheckCircle2, Loader2, Code2 } from 'lucide-react';

const ToolCallDisplay = ({ toolCall }) => {
  const [isOpen, setIsOpen] = useState(false);
  const name = toolCall.function?.name || "Processing";
  const args = toolCall.function?.arguments;
  
  return (
    <div className="mb-2 max-w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 w-full md:w-auto"
      >
        <Terminal className="w-3 h-3 text-cyan-500/70" />
        <span className="font-mono">{name}</span>
        {isOpen ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
      </button>
      
      {isOpen && args && (
        <div className="mt-2 pl-2 border-l border-white/10 ml-2">
           <pre className="text-[10px] text-gray-400 font-mono bg-[#050505] p-2 rounded-md overflow-x-auto border border-white/5">
             {args}
           </pre>
        </div>
      )}
    </div>
  );
};

export default function AgentChatMessage({ msg, logo, transparentLogo }) {
  const isUser = msg.role === "user";
  const hasContent = !!msg.content;
  const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
  
  // Don't render empty messages (avoids "ghost" bubbles)
  if (!hasContent && !hasToolCalls) return null;

  // Pre-process content to force hard breaks on newlines (GFM style behavior)
  const processedContent = msg.content?.replace(/\n/g, '  \n');

  return (
    <div className={cn("flex gap-4 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className={cn(
          "w-8 h-8 flex items-center justify-center shrink-0 self-start mt-1",
          transparentLogo
            ? ""
            : "rounded-lg border border-white/10 bg-[#1a1a1a] shadow-lg shadow-black/50"
        )}>
          {React.cloneElement(logo, { className: "w-5 h-5" })}
        </div>
      )}
      
      <div className={cn("flex flex-col gap-2 max-w-[85%]", isUser && "items-end")}>
        {/* Render Tool Calls if present */}
        {hasToolCalls && (
           <div className="flex flex-col gap-1 w-full items-start">
              {msg.tool_calls.map((tc, idx) => (
                 <ToolCallDisplay key={idx} toolCall={tc} />
              ))}
           </div>
        )}

        {/* Render Content if present */}
        {hasContent && (
          <div className={cn(
            "rounded-2xl px-6 py-5 shadow-sm transition-all duration-200",
            isUser 
              ? "bg-[#1a1a1a] text-white border border-white/10 text-sm" 
              : "bg-[#0E0E0E] text-gray-300 border border-white/5 hover:border-white/10 text-[15px]"
          )}>
            <ReactMarkdown 
                className="prose prose-invert max-w-none leading-8 prose-p:my-4 prose-headings:mb-4 prose-headings:mt-8 prose-headings:font-bold prose-headings:text-white prose-strong:text-white prose-strong:font-bold prose-ul:my-6 prose-li:my-3 prose-li:marker:text-gray-500 prose-code:text-cyan-400 prose-code:bg-cyan-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none"
                components={{
                  a: ({node, ...props}) => <a {...props} className="text-cyan-400 hover:text-cyan-300 hover:underline underline-offset-4 font-medium" target="_blank" rel="noopener noreferrer" />,
                  ul: ({node, ...props}) => <ul {...props} className="list-disc pl-6 space-y-3 marker:text-gray-500" />,
                  ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-6 space-y-3 marker:text-gray-500" />,
                  li: ({node, children, ...props}) => (
                    <li {...props} className="pl-2">
                      {children}
                    </li>
                  ),
                }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}