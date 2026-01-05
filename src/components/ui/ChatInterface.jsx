import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Sparkles, User, Copy, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function ChatInterface({ 
  messages = [], 
  onSendMessage, 
  isLoading = false,
  placeholder = 'Type your message...',
  quickActions = [],
  color = 'cyan',
  assistantName = 'AI Assistant',
  assistantIcon: AssistantIcon = Sparkles,
  hideHeader = false,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const colorClasses = {
    cyan: { 
      accent: 'bg-cyan-500', 
      accentHover: 'hover:bg-cyan-400',
      bubble: 'bg-cyan-500/20 border-cyan-500/30',
      icon: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20'
    },
    sage: { 
      accent: 'bg-[#86EFAC]', 
      accentHover: 'hover:bg-[#6EE7B7]',
      bubble: 'bg-[#86EFAC]/20 border-[#86EFAC]/30',
      icon: 'text-[#86EFAC]',
      iconBg: 'bg-[#86EFAC]/20'
    },
    indigo: { 
      accent: 'bg-indigo-500', 
      accentHover: 'hover:bg-indigo-400',
      bubble: 'bg-indigo-500/20 border-indigo-500/30',
      icon: 'text-indigo-400',
      iconBg: 'bg-indigo-500/20'
    },
    orange: { 
      accent: 'bg-orange-500', 
      accentHover: 'hover:bg-orange-400',
      bubble: 'bg-orange-500/20 border-orange-500/30',
      icon: 'text-orange-400',
      iconBg: 'bg-orange-500/20'
    },
  };

  const colors = colorClasses[color];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickAction = (action) => {
    onSendMessage(action.prompt || action.label);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
            <AssistantIcon className={cn('w-5 h-5', colors.icon)} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{assistantName}</h3>
            <p className="text-xs text-zinc-500">Always here to help</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {(messages || []).map((message, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role === 'assistant' && (
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors.iconBg)}>
                  <AssistantIcon className={cn('w-4 h-4', colors.icon)} />
                </div>
              )}
              
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 border',
                message.role === 'user' 
                  ? 'bg-zinc-800 border-zinc-700 text-white' 
                  : cn('bg-zinc-900/50 border-zinc-800', colors.bubble)
              )}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}

                {/* Message actions for assistant */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-700/50">
                    <button className="p-1.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-green-400 transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400 transition-colors">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.iconBg)}>
              <Loader2 className={cn('w-4 h-4 animate-spin', colors.icon)} />
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              )}
            >
              {action.icon && <action.icon className="w-3 h-3 mr-1.5 inline" />}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-4 focus-within:border-zinc-600">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 !bg-transparent py-3 text-sm text-white placeholder-zinc-500 focus:outline-none !border-0"
            />
            <button
              type="button"
              className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              colors.accent, colors.accentHover, 'text-white'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}