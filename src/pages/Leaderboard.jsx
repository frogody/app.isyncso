import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Flame, TrendingUp, Medal } from "lucide-react";
import { usePagination } from "@/components/hooks/usePagination";
import { useUser } from "@/components/context/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Leaderboard() {
  const { user, isLoading: userLoading } = useUser();
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('weekly');
  const [dataLoading, setDataLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);

  const loadLeaderboard = React.useCallback(async () => {
    if (!user) return;
    try {
      const response = await db.functions.invoke('getLeaderboard', { timeframe, limit: 100 });
      const data = response.data?.leaderboard || [];
      setLeaderboard(data);
      const rank = data.findIndex(entry => entry.user_id === user.id);
      setUserRank(rank >= 0 ? rank + 1 : null);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user, timeframe]);

  useEffect(() => {
    if (user) loadLeaderboard();
  }, [loadLeaderboard, user]);

  const getRankBadge = (index) => {
    if (index === 0) return { icon: '🥇', bg: 'from-yellow-400 to-amber-500', border: 'border-yellow-500/50' };
    if (index === 1) return { icon: '🥈', bg: 'from-zinc-300 to-zinc-500', border: 'border-zinc-400/50' };
    if (index === 2) return { icon: '🥉', bg: 'from-amber-600 to-amber-800', border: 'border-amber-600/50' };
    return null;
  };

  const getProgressWidth = (points) => {
    if (leaderboard.length === 0) return 0;
    return Math.min(100, (points / (leaderboard[0]?.points || 1)) * 100);
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const pagination = usePagination(rest, 20);

  const loading = userLoading || dataLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 bg-zinc-800 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          icon={Trophy}
          title="Leaderboard"
          subtitle={`${timeframe === 'weekly' ? 'This Week' : timeframe === 'monthly' ? 'This Month' : 'All Time'}'s Top Learners`}
          color="cyan"
          actions={
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="bg-zinc-900 border border-zinc-700">
                <TabsTrigger value="weekly" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  Weekly
                </TabsTrigger>
                <TabsTrigger value="monthly" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="alltime" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  All Time
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {/* Podium */}
        {top3.length >= 3 && (
          <div className="grid grid-cols-3 gap-4">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="pt-8"
            >
              <GlassCard className="p-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center text-3xl mb-3 border-4 border-zinc-400/50">
                  🥈
                </div>
                <h3 className="font-semibold text-white truncate">{top3[1].user_name}</h3>
                <Badge className="bg-zinc-500/20 text-zinc-300 border-zinc-500/30 mt-2">
                  {top3[1].points} XP
                </Badge>
              </GlassCard>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-4 text-center border-yellow-500/30">
                <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-4xl mb-3 border-4 border-yellow-500/50 shadow-lg shadow-yellow-500/20">
                  🥇
                </div>
                <h3 className="font-bold text-white truncate">{top3[0].user_name}</h3>
                <p className="text-xs text-zinc-400">{top3[0].level_title}</p>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 mt-2">
                  {top3[0].points} XP
                </Badge>
              </GlassCard>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="pt-8"
            >
              <GlassCard className="p-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-3xl mb-3 border-4 border-amber-600/50">
                  🥉
                </div>
                <h3 className="font-semibold text-white truncate">{top3[2].user_name}</h3>
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 mt-2">
                  {top3[2].points} XP
                </Badge>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Full Rankings */}
        <GlassCard glow="cyan" className="p-6">
          <div className="space-y-2">
            <AnimatePresence>
              {leaderboard.slice(0, 10).map((entry, index) => {
                const isCurrentUser = entry.user_id === user?.id;
                const badge = getRankBadge(index);

                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                      isCurrentUser 
                        ? 'bg-cyan-500/20 border-2 border-cyan-500/40' 
                        : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center">
                      {badge ? (
                        <span className="text-2xl">{badge.icon}</span>
                      ) : (
                        <span className="text-lg font-bold text-zinc-400">{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                      {entry.avatar ? (
                        <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-zinc-400 font-bold">
                          {entry.user_name[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white truncate">{entry.user_name}</h4>
                        {isCurrentUser && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{entry.level_title}</p>
                      <div className="w-full bg-zinc-700 rounded-full h-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getProgressWidth(entry.points)}%` }}
                          transition={{ duration: 0.8 }}
                          className={`h-full rounded-full ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                            index === 1 ? 'bg-gradient-to-r from-zinc-300 to-zinc-500' :
                            index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800' :
                            'bg-gradient-to-r from-cyan-500 to-cyan-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-cyan-400">{entry.points}</div>
                      <div className="text-xs text-zinc-500">XP</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Paginated rest */}
            {pagination.items.length > 0 && (
              <>
                <div className="border-t border-zinc-700 my-4" />
                {pagination.items.map((entry, i) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  const rank = 10 + (pagination.currentPage - 1) * 20 + i + 1;

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        isCurrentUser ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-zinc-800/30'
                      }`}
                    >
                      <div className="w-8 text-center text-sm font-medium text-zinc-500">#{rank}</div>
                      <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                        <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                          {entry.user_name[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{entry.user_name}</h4>
                          {isCurrentUser && <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">You</Badge>}
                        </div>
                      </div>
                      <div className="text-cyan-400 font-bold">{entry.points} XP</div>
                    </div>
                  );
                })}

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-700">
                    <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrev} className="border-zinc-700">
                      Previous
                    </Button>
                    <span className="text-sm text-zinc-400">Page {pagination.currentPage} of {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext} className="border-zinc-700">
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </GlassCard>

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <GlassCard className="p-12 text-center">
            <Trophy className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Rankings Yet</h3>
            <p className="text-zinc-400">Complete lessons and courses to appear on the leaderboard!</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}