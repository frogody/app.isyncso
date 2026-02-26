import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Users, Clock, Loader2, AlertCircle, Copy, Check, LogIn } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

export default function JoinCallPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [call, setCall] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | found | ended | not_found
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!joinCode) {
      setStatus('not_found');
      return;
    }

    async function fetchCall() {
      const { data, error } = await supabase
        .from('video_calls')
        .select('id, title, join_code, join_url, status, created_at, started_at, ended_at, creator_id')
        .eq('join_code', joinCode.toUpperCase().trim())
        .single();

      if (error || !data) {
        setStatus('not_found');
        return;
      }

      setCall(data);
      if (data.status === 'ended') {
        setStatus('ended');
      } else {
        setStatus('found');
      }
    }

    fetchCall();
  }, [joinCode]);

  const handleJoin = useCallback(() => {
    if (!user) {
      navigate(`/Login?redirect=/call/${joinCode}`);
      return;
    }

    // Navigate to Inbox with the call param — Inbox's auto-join will handle joining
    // (joining here would create a hook instance that gets destroyed on navigate)
    setJoining(true);
    navigate(`/Inbox?tab=calls&call=${joinCode}`);
  }, [user, joinCode, navigate]);

  const handleCopy = useCallback(() => {
    const url = call?.join_url || `${window.location.origin}/call/${joinCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [call?.join_url, joinCode]);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-zinc-400">Looking up meeting...</p>
          </div>
        )}

        {/* Not Found */}
        {status === 'not_found' && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-zinc-500" />
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">Meeting Not Found</h1>
            <p className="text-sm text-zinc-500 mb-6">
              This meeting link is invalid or has been removed.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Ended */}
        {status === 'ended' && call && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <Video className="w-7 h-7 text-zinc-500" />
            </div>
            <h1 className="text-lg font-semibold text-white mb-1">Meeting Ended</h1>
            <p className="text-sm text-zinc-500 mb-1">{call.title || 'Meeting'}</p>
            {call.ended_at && (
              <p className="text-xs text-zinc-600 mb-6">
                Ended {new Date(call.ended_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Ready to Join */}
        {status === 'found' && call && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden">
            {/* Header bar */}
            <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">{call.title || 'Meeting'}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${call.status === 'active' ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className={`text-[11px] ${call.status === 'active' ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {call.status === 'active' ? 'In progress' : 'Ready to join'}
                  </span>
                </div>
              </div>
            </div>

            {/* Join code */}
            <div className="px-6 py-5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Join Code</div>
              <div className="text-xl font-mono font-bold text-white tracking-widest mb-4">
                {call.join_code}
              </div>

              {/* Join button */}
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 mb-3"
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </span>
                ) : !user ? (
                  <span className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign in to Join
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" />
                    Join Meeting
                  </span>
                )}
              </button>

              {/* Copy link */}
              <button
                onClick={handleCopy}
                className="w-full px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700/40 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Meeting Link'}
                </span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800/60 flex items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-600">Powered by</span>
              <span className="text-[10px] font-medium text-zinc-400">iSyncSo</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
