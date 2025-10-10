import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SyncAvatar from '../ui/SyncAvatar';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-white/5",
                    expanded ? "bg-white/5 border-white/10" : "bg-transparent border-white/8"
                )}
                style={{ color: 'var(--txt)' }}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span style={{ color: 'var(--txt)' }}>{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn(isError && "text-red-400")} style={{ color: isError ? '#FCA5A5' : 'var(--muted)' }}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 transition-transform ml-auto", 
                        expanded && "rotate-90")} style={{ color: 'var(--muted)' }} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 space-y-2" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Parameters:</div>
                            <pre className="rounded-md p-2 text-xs whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,.04)', color: 'var(--txt)' }}>
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Result:</div>
                            <pre className="rounded-md p-2 text-xs whitespace-pre-wrap max-h-48 overflow-auto" style={{ background: 'rgba(255,255,255,.04)', color: 'var(--txt)' }}>
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ChatMessage({ message, onRegenerate }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-7 w-7 flex items-center justify-center mt-0.5">
                    <SyncAvatar size={28} />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5",
                        isUser 
                            ? "text-white" 
                            : ""
                    )}
                    style={{
                        background: isUser 
                            ? 'linear-gradient(135deg, rgba(239,68,68,.15), rgba(220,38,38,.12))'
                            : 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35)',
                        border: isUser 
                            ? '1px solid rgba(239,68,68,.3)'
                            : '1px solid rgba(255,255,255,.06)',
                        backdropFilter: 'blur(8px)',
                        color: 'var(--txt)'
                    }}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--txt)' }}>{message.content}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code">
                                                <pre className="rounded-lg p-3 overflow-x-auto my-2" style={{ background: 'rgba(0,0,0,.4)', color: 'var(--txt)' }}>
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100"
                                                    style={{ background: 'rgba(0,0,0,.6)' }}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Code copied');
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3" style={{ color: 'var(--muted)' }} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--txt)' }}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ children, ...props }) => (
                                        <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{children}</a>
                                    ),
                                    p: ({ children }) => <p className="my-1 leading-relaxed" style={{ color: 'var(--txt)' }}>{children}</p>,
                                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc" style={{ color: 'var(--txt)' }}>{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal" style={{ color: 'var(--txt)' }}>{children}</ol>,
                                    li: ({ children }) => <li className="my-0.5" style={{ color: 'var(--txt)' }}>{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-semibold my-2" style={{ color: 'var(--txt)' }}>{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold my-2" style={{ color: 'var(--txt)' }}>{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold my-2" style={{ color: 'var(--txt)' }}>{children}</h3>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 pl-3 my-2" style={{ borderColor: 'rgba(255,255,255,.2)', color: 'var(--muted)' }}>
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}

                {!isUser && message.candidates && message.candidates.length > 0 && (
                    <div className="mt-2 space-y-2">
                        <p className="text-xs font-medium" style={{ color: 'var(--txt)' }}>Relevante kandidaten:</p>
                        <div className="flex flex-wrap gap-2">
                            {message.candidates.slice(0, 5).map((candidate) => (
                                <Link 
                                    key={candidate.id} 
                                    to={createPageUrl("CandidateProfile") + "?id=" + candidate.id}
                                >
                                    <Card className="px-3 py-2 hover:shadow-md transition-shadow cursor-pointer" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
                                            {candidate.first_name} {candidate.last_name}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{candidate.job_title}</p>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {!isUser && onRegenerate && (
                    <Button
                        onClick={onRegenerate}
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs hover:bg-white/5"
                        style={{ color: 'var(--muted)' }}
                    >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regenereer antwoord
                    </Button>
                )}
            </div>
        </div>
    );
}