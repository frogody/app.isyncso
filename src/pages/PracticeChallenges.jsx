import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Swords, Flame, Clock, Zap, Trophy, CheckCircle2, Timer, Brain,
  Code2, FileQuestion, Sparkles, Target, TrendingUp, Award, Play
} from 'lucide-react';

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  medium: { label: 'Medium', color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30' },
  hard:   { label: 'Hard',   color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30' },
  expert: { label: 'Expert', color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30' },
};
const TYPE_ICONS = { quiz: FileQuestion, coding: Code2, scenario: Brain };

function DifficultyBadge({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  return <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[10px] px-1.5 py-0`}>{cfg.label}</Badge>;
}

function ChallengeCard({ challenge, completed, onClick, delay = 0 }) {
  const { lt } = useTheme();
  const TypeIcon = TYPE_ICONS[challenge.challenge_type] || FileQuestion;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onClick={() => onClick(challenge)}
      className={`group relative cursor-pointer ${lt(
        'bg-white border border-slate-200 shadow-sm hover:border-teal-400/50',
        'bg-zinc-900/50 border border-zinc-800/60 hover:border-teal-700/40'
      )} backdrop-blur-sm rounded-xl p-4 transition-all duration-200`}
    >
      {completed && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /></div>}
      <div className={`w-9 h-9 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/80')} border ${lt('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center mb-3`}>
        <TypeIcon className="w-4 h-4 text-teal-400/70" />
      </div>
      <h4 className={`font-semibold text-sm ${lt('text-slate-900', 'text-zinc-100')} mb-1 line-clamp-2 group-hover:text-teal-400/90 transition-colors`}>
        {challenge.title}
      </h4>
      <p className={`text-xs ${lt('text-slate-500', 'text-zinc-500')} line-clamp-2 mb-3`}>{challenge.description}</p>
      <div className="flex items-center flex-wrap gap-1.5 mb-3">
        <DifficultyBadge difficulty={challenge.difficulty} />
        {challenge.skill_name && (
          <Badge className={`${lt('bg-slate-100 text-slate-500 border-slate-200', 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50')} text-[9px] px-1.5 py-0`}>
            {challenge.skill_name}
          </Badge>
        )}
      </div>
      <div className={`flex items-center justify-between text-[10px] ${lt('text-slate-400', 'text-zinc-600')}`}>
        <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-teal-400" /> {challenge.points || 0} XP</span>
        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {challenge.time_limit_minutes || 10}m</span>
      </div>
      {completed && (
        <div className="mt-2 pt-2 border-t border-zinc-800/40">
          <div className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>
            Score: <span className="text-teal-400 font-medium">{completed.score}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function QuizRunner({ content, onComplete, timeLimit }) {
  const { lt } = useTheme();
  const questions = content?.questions || [];
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState((timeLimit || 10) * 60);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleFinish = useCallback(() => {
    clearInterval(timerRef.current);
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    onCompleteRef.current(score, (timeLimit || 10) * 60 - secondsLeft);
  }, [questions, answers, secondsLeft, timeLimit]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => { if (secondsLeft === 0) handleFinish(); }, [secondsLeft, handleFinish]);

  const q = questions[currentQ];
  if (!q) return <p className={lt('text-slate-500', 'text-zinc-400')}>No questions available.</p>;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${lt('text-slate-500', 'text-zinc-400')}`}>Question {currentQ + 1} of {questions.length}</span>
        <span className={`text-xs font-mono flex items-center gap-1 ${secondsLeft < 60 ? 'text-red-400' : 'text-teal-400'}`}>
          <Timer className="w-3 h-3" /> {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <Progress value={((currentQ + 1) / questions.length) * 100} className={`h-1 ${lt('bg-slate-100', 'bg-zinc-800')}`} />
      <p className={`text-sm font-medium ${lt('text-slate-900', 'text-white')} mt-2`}>{q.question}</p>
      <div className="space-y-2">
        {(q.options || []).map((opt, oi) => (
          <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: oi }))}
            className={`w-full text-left text-sm p-3 rounded-lg border transition-all ${
              answers[currentQ] === oi
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : lt('bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800')
            }`}
          >{opt}</button>
        ))}
      </div>
      <div className="flex justify-between pt-2">
        <Button size="sm" variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)} className={lt('border-slate-200', 'border-zinc-700')}>Previous</Button>
        {currentQ < questions.length - 1
          ? <Button size="sm" onClick={() => setCurrentQ(p => p + 1)} className="bg-teal-500 hover:bg-teal-400 text-white">Next</Button>
          : <Button size="sm" onClick={handleFinish} className="bg-teal-500 hover:bg-teal-400 text-white">Submit</Button>
        }
      </div>
    </div>
  );
}

function ScenarioRunner({ content, onComplete }) {
  const { lt } = useTheme();
  const [response, setResponse] = useState('');
  const [startTime] = useState(Date.now());

  const handleSubmit = () => {
    if (!response.trim()) { toast.error('Please provide a response.'); return; }
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const score = Math.min(100, Math.max(40, 60 + Math.floor(response.trim().length / 10)));
    onComplete(score, timeTaken);
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${lt('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700/50')}`}>
        <h4 className={`text-sm font-semibold ${lt('text-slate-900', 'text-white')} mb-2`}>Scenario</h4>
        <p className={`text-sm ${lt('text-slate-600', 'text-zinc-300')} whitespace-pre-wrap`}>
          {content?.scenario || content?.description || 'Read the scenario and provide your response below.'}
        </p>
      </div>
      <textarea value={response} onChange={e => setResponse(e.target.value)} rows={6}
        className={`w-full rounded-lg p-3 text-sm border resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${lt(
          'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400',
          'bg-zinc-900/70 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600'
        )}`}
        placeholder="Type your analysis and recommendation..."
      />
      <Button onClick={handleSubmit} className="w-full bg-teal-500 hover:bg-teal-400 text-white">Submit Response</Button>
    </div>
  );
}

function ResultsView({ score, timeTaken, challenge, avgScore }) {
  const { lt } = useTheme();
  const xpEarned = Math.round((challenge.points || 50) * (score / 100));
  return (
    <div className="space-y-4 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg ${
          score >= 80 ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
          score >= 50 ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
          'bg-gradient-to-br from-red-500 to-red-600'
        }`}>
          <span className="text-2xl font-bold text-white">{score}%</span>
        </div>
      </motion.div>
      <h3 className={`text-lg font-bold ${lt('text-slate-900', 'text-white')}`}>
        {score >= 80 ? 'Excellent Work!' : score >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'XP Earned', value: `+${xpEarned}`, icon: Zap, accent: 'text-teal-400' },
          { label: 'Time', value: `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`, icon: Clock, accent: lt('text-slate-600', 'text-zinc-300') },
          { label: 'Avg Score', value: avgScore != null ? `${avgScore}%` : '--', icon: TrendingUp, accent: lt('text-slate-600', 'text-zinc-300') },
        ].map((s, i) => (
          <div key={i} className={`p-3 rounded-lg ${lt('bg-slate-50', 'bg-zinc-800/50')}`}>
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.accent}`} />
            <div className={`text-sm font-bold ${s.accent}`}>{s.value}</div>
            <div className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PracticeChallenges() {
  const { user } = useUser();
  const { lt } = useTheme();
  const [challenges, setChallenges] = useState([]);
  const [results, setResults] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengePhase, setChallengePhase] = useState('preview');
  const [lastScore, setLastScore] = useState(null);
  const [lastTimeTaken, setLastTimeTaken] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [challengeData, resultData, gamData] = await Promise.all([
        db.entities.PracticeChallenge.list({ limit: 200 }).catch(() => []),
        db.entities.UserResult.list({ limit: 500 }).catch(() => []),
        db.entities.UserGamification?.list?.({ limit: 1 }).catch(() => []) || Promise.resolve([]),
      ]);
      setChallenges(challengeData);
      setResults(resultData);
      setGamification(gamData[0] || null);
      try {
        const rec = await db.functions.invoke('recommendations/practiceChallenge', { userId: user.id });
        setRecommended(rec?.data?.challenges || rec?.data || []);
      } catch { setRecommended([]); }
    } catch (err) {
      console.error('Failed to load practice data:', err);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const resultsByChallenge = useMemo(() => {
    const map = {};
    results.forEach(r => { if (!map[r.assessment_id] || r.score > map[r.assessment_id].score) map[r.assessment_id] = r; });
    return map;
  }, [results]);

  const completedIds = useMemo(() => new Set(Object.keys(resultsByChallenge)), [resultsByChallenge]);
  const categories = useMemo(() => Array.from(new Set(challenges.map(c => c.category).filter(Boolean))).sort(), [challenges]);
  const streak = useMemo(() => gamification?.current_streak || 0, [gamification]);

  const dailyChallenge = useMemo(() => {
    if (!challenges.length) return null;
    const d = new Date();
    return challenges[(d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % challenges.length];
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    let list = challenges;
    if (activeTab === 'recommended') {
      const recIds = new Set(recommended.map(r => r.id || r));
      list = list.filter(c => recIds.has(c.id));
    } else if (activeTab === 'completed') {
      list = list.filter(c => completedIds.has(c.id));
    }
    if (difficultyFilter !== 'all') list = list.filter(c => c.difficulty === difficultyFilter);
    if (categoryFilter !== 'all') list = list.filter(c => c.category === categoryFilter);
    return list;
  }, [challenges, activeTab, difficultyFilter, categoryFilter, recommended, completedIds]);

  const avgScoreForChallenge = useMemo(() => {
    if (!selectedChallenge) return null;
    const rel = results.filter(r => r.assessment_id === selectedChallenge.id);
    return rel.length ? Math.round(rel.reduce((s, r) => s + r.score, 0) / rel.length) : null;
  }, [selectedChallenge, results]);

  const handleStartChallenge = (ch) => { setSelectedChallenge(ch); setChallengePhase('preview'); setLastScore(null); setLastTimeTaken(null); };

  const handleComplete = async (score, timeTaken) => {
    setLastScore(score); setLastTimeTaken(timeTaken); setChallengePhase('results');
    try {
      await db.entities.UserResult.create({
        user_id: user.id, assessment_id: selectedChallenge.id,
        score, completed_at: new Date().toISOString(), time_taken_seconds: timeTaken,
      });
      const xpEarned = Math.round((selectedChallenge.points || 50) * (score / 100));
      if (gamification?.id && xpEarned > 0) {
        await db.entities.UserGamification.update(gamification.id, {
          total_points: (gamification.total_points || 0) + xpEarned,
          weekly_points: (gamification.weekly_points || 0) + xpEarned,
        }).catch(() => {});
      }
      toast.success(`Challenge complete! +${xpEarned} XP`);
      loadData();
    } catch (err) { console.error('Failed to save result:', err); toast.error('Could not save your result.'); }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} p-4`}>
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className={`h-16 w-full ${lt('bg-slate-100', 'bg-zinc-800')} rounded-xl`} />
          <Skeleton className={`h-24 w-full ${lt('bg-slate-100', 'bg-zinc-800')} rounded-xl`} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className={`h-14 ${lt('bg-slate-100', 'bg-zinc-800')} rounded-xl`} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className={`h-48 ${lt('bg-slate-100', 'bg-zinc-800')} rounded-xl`} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} relative`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          icon={Swords} title="Practice Challenges"
          subtitle="Sharpen your skills with quizzes, coding tasks, and real-world scenarios."
          color="teal"
          actions={
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <Flame className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-sm font-semibold text-teal-400">{streak}</span>
              <span className={`text-xs ${lt('text-slate-500', 'text-zinc-500')}`}>day streak</span>
            </div>
          }
        />

        {/* Daily Challenge Banner */}
        {dailyChallenge && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div onClick={() => handleStartChallenge(dailyChallenge)}
              className={`cursor-pointer relative overflow-hidden rounded-xl p-4 border transition-all duration-200 ${lt(
                'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200 hover:border-teal-400',
                'bg-gradient-to-r from-teal-900/20 to-cyan-900/10 border-teal-800/40 hover:border-teal-600/50'
              )}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${lt('text-teal-600', 'text-teal-400')}`}>Daily Challenge</span>
                      <DifficultyBadge difficulty={dailyChallenge.difficulty} />
                    </div>
                    <h3 className={`font-semibold text-sm ${lt('text-slate-900', 'text-white')} mt-0.5`}>{dailyChallenge.title}</h3>
                    <div className={`flex items-center gap-3 mt-1 text-[10px] ${lt('text-slate-500', 'text-zinc-500')}`}>
                      <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-teal-400" /> {dailyChallenge.points || 0} XP</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {dailyChallenge.time_limit_minutes || 10}m</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-white h-8 text-xs"><Play className="w-3 h-3 mr-1" /> Start</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Target, label: 'Available', value: challenges.length, delay: 0 },
            { icon: CheckCircle2, label: 'Completed', value: completedIds.size, delay: 0.05 },
            { icon: Trophy, label: 'Best Score', value: results.length ? `${Math.max(...results.map(r => r.score))}%` : '--', delay: 0.1 },
            { icon: Flame, label: 'Streak', value: `${streak} days`, delay: 0.15 },
          ].map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }}
              className={`${lt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/50 border border-zinc-800/60')} rounded-xl p-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${lt('text-slate-400', 'text-zinc-500')}`}>{stat.label}</p>
                  <p className={`text-lg font-bold ${lt('text-slate-900', 'text-zinc-100')} mt-0.5`}>{stat.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/80')} border ${lt('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 text-teal-400/70" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={lt('bg-slate-100 border border-slate-200', 'bg-zinc-900 border border-zinc-700')}>
              <TabsTrigger value="all" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-xs">All</TabsTrigger>
              <TabsTrigger value="recommended" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Recommended
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}
              className={`text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${lt('bg-white border-slate-200 text-slate-700', 'bg-zinc-900 border-zinc-700 text-zinc-300')}`}>
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
            {categories.length > 0 && (
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className={`text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-teal-500/50 ${lt('bg-white border-slate-200 text-slate-700', 'bg-zinc-900 border-zinc-700 text-zinc-300')}`}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Challenge Grid */}
        {filteredChallenges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChallenges.map((ch, i) => (
              <ChallengeCard key={ch.id} challenge={ch} completed={resultsByChallenge[ch.id]}
                onClick={handleStartChallenge} delay={Math.min(i * 0.04, 0.4)} />
            ))}
          </div>
        ) : (
          <GlassCard glow="teal" className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
              {activeTab === 'completed' ? <Trophy className="w-5 h-5 text-teal-400" /> : <Target className="w-5 h-5 text-teal-400" />}
            </div>
            <h4 className={`${lt('text-slate-900', 'text-white')} font-medium text-sm mb-1.5`}>
              {activeTab === 'completed' ? 'No challenges completed yet' : 'No challenges found'}
            </h4>
            <p className={`text-xs ${lt('text-slate-500', 'text-zinc-400')}`}>
              {activeTab === 'completed' ? 'Complete your first challenge to see it here.' : 'Try adjusting your filters.'}
            </p>
          </GlassCard>
        )}
      </div>

      {/* Challenge Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={open => { if (!open) setSelectedChallenge(null); }}>
        <DialogContent className={`${lt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')} max-w-lg max-h-[85vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className={`${lt('text-slate-900', 'text-white')} flex items-center gap-2`}>
              {challengePhase === 'results'
                ? <><Award className="w-5 h-5 text-teal-400" /> Results</>
                : <><Swords className="w-5 h-5 text-teal-400" /> {selectedChallenge?.title}</>}
            </DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {challengePhase === 'preview' && selectedChallenge && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 mt-2">
                <p className={`text-sm ${lt('text-slate-600', 'text-zinc-300')}`}>{selectedChallenge.description}</p>
                <div className="flex items-center flex-wrap gap-2">
                  <DifficultyBadge difficulty={selectedChallenge.difficulty} />
                  {selectedChallenge.skill_name && (
                    <Badge className={`${lt('bg-slate-100 text-slate-600 border-slate-200', 'bg-zinc-800 text-zinc-400 border-zinc-700')} text-xs`}>{selectedChallenge.skill_name}</Badge>
                  )}
                  <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">{selectedChallenge.challenge_type}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Points', val: `${selectedChallenge.points || 0} XP`, icon: Zap },
                    { label: 'Time Limit', val: `${selectedChallenge.time_limit_minutes || 10} min`, icon: Clock },
                    { label: 'Questions', val: selectedChallenge.content?.questions?.length || '--', icon: FileQuestion },
                  ].map((m, i) => (
                    <div key={i} className={`p-3 rounded-lg ${lt('bg-slate-50', 'bg-zinc-800/50')}`}>
                      <m.icon className={`w-4 h-4 mx-auto mb-1 ${lt('text-slate-400', 'text-zinc-500')}`} />
                      <div className={`text-sm font-bold ${lt('text-slate-900', 'text-white')}`}>{m.val}</div>
                      <div className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setChallengePhase('active')} className="w-full bg-teal-500 hover:bg-teal-400 text-white">
                  <Play className="w-4 h-4 mr-2" /> Begin Challenge
                </Button>
              </motion.div>
            )}
            {challengePhase === 'active' && selectedChallenge && (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2">
                {selectedChallenge.challenge_type === 'quiz'
                  ? <QuizRunner content={selectedChallenge.content} timeLimit={selectedChallenge.time_limit_minutes} onComplete={handleComplete} />
                  : <ScenarioRunner content={selectedChallenge.content} timeLimit={selectedChallenge.time_limit_minutes} onComplete={handleComplete} />}
              </motion.div>
            )}
            {challengePhase === 'results' && selectedChallenge && lastScore != null && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2">
                <ResultsView score={lastScore} timeTaken={lastTimeTaken} challenge={selectedChallenge} avgScore={avgScoreForChallenge} />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className={`flex-1 ${lt('border-slate-200', 'border-zinc-700')}`} onClick={() => setSelectedChallenge(null)}>Close</Button>
                  <Button className="flex-1 bg-teal-500 hover:bg-teal-400 text-white" onClick={() => { setChallengePhase('preview'); setLastScore(null); }}>Retry</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
