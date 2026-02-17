import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Eye, EyeOff,
  CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight,
  AlertTriangle, RotateCcw, Trophy, Timer, Send, Loader2,
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
];
const ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'practice', label: 'Practice' },
];

const emptyQuestion = () => ({
  id: crypto.randomUUID(),
  text: '',
  type: 'multiple_choice',
  options: ['', ''],
  correctAnswer: 0,
  points: 1,
  explanation: '',
});

// ---------------------------------------------------------------------------
// 1. AssessmentBuilder  (instructor / admin)
// ---------------------------------------------------------------------------

export function AssessmentBuilder({ courseId, lessonId, onSaved }) {
  const { user } = useUser();
  const { lt } = useTheme();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('quiz');
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isRequired, setIsRequired] = useState(false);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateQuestion = useCallback((idx, patch) => {
    setQuestions(p => p.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }, []);
  const addQuestion = useCallback(() => setQuestions(p => [...p, emptyQuestion()]), []);
  const removeQuestion = useCallback((idx) => setQuestions(p => p.filter((_, i) => i !== idx)), []);
  const moveQuestion = useCallback((idx, dir) => {
    setQuestions(p => {
      const a = [...p]; const t = idx + dir;
      if (t < 0 || t >= a.length) return a;
      [a[idx], a[t]] = [a[t], a[idx]]; return a;
    });
  }, []);
  const updateOption = useCallback((qI, oI, val) => {
    setQuestions(p => p.map((q, i) => {
      if (i !== qI) return q;
      const o = [...q.options]; o[oI] = val; return { ...q, options: o };
    }));
  }, []);
  const addOption = useCallback((qI) => {
    setQuestions(p => p.map((q, i) => (i !== qI || q.options.length >= 6) ? q : { ...q, options: [...q.options, ''] }));
  }, []);
  const removeOption = useCallback((qI, oI) => {
    setQuestions(p => p.map((q, i) => {
      if (i !== qI || q.options.length <= 2) return q;
      const o = q.options.filter((_, j) => j !== oI);
      return { ...q, options: o, correctAnswer: q.correctAnswer >= o.length ? 0 : q.correctAnswer };
    }));
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return toast.error('Assessment title is required');
    if (questions.some(q => !q.text.trim())) return toast.error('All questions must have text');
    if (questions.some(q => q.type === 'multiple_choice' && q.options.some(o => !o.trim())))
      return toast.error('All multiple-choice options must be filled in');
    setSaving(true);
    try {
      const payload = {
        lesson_id: lessonId || null, course_id: courseId, title: title.trim(), type,
        questions: questions.map(q => ({
          id: q.id, text: q.text, type: q.type, points: q.points, explanation: q.explanation || '',
          options: q.type === 'multiple_choice' ? q.options : q.type === 'true_false' ? ['True', 'False'] : [],
          correctAnswer: q.type === 'short_answer' ? null : q.correctAnswer,
        })),
        passing_score: passingScore, time_limit_minutes: timeLimit || null,
        max_attempts: maxAttempts, is_required: isRequired, created_by: user?.id,
      };
      const result = await db.entities.Assessment.create(payload);
      toast.success('Assessment saved');
      onSaved?.(result);
    } catch (err) {
      console.error('[AssessmentBuilder] save error:', err);
      toast.error('Failed to save assessment');
    } finally { setSaving(false); }
  };

  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (q.points || 0), 0), [questions]);
  const inputCls = lt('bg-white border-gray-300', 'bg-zinc-800/60 border-zinc-700 text-white');
  const labelCls = lt('text-gray-600', 'text-zinc-400') + ' text-xs font-medium mb-1 block';

  return (
    <div className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800/60') + ' border rounded-xl p-6 space-y-6'}>
      <div className="flex items-center justify-between">
        <h2 className={lt('text-gray-900', 'text-white') + ' text-xl font-bold'}>Assessment Builder</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}
            className={lt('border-gray-300', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}>
            {preview ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-500 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />} Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div><label className={labelCls}>Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Module 1 Quiz" className={inputCls} /></div>
        <div><label className={labelCls}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className={lt('bg-white border-gray-300 text-gray-900', 'bg-zinc-800/60 border-zinc-700 text-white') + ' w-full h-9 rounded-md border px-3 text-sm'}>
            {ASSESSMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select></div>
        <div><label className={labelCls}>Passing Score (%)</label>
          <Input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(+e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Time Limit (min, 0 = none)</label>
          <Input type="number" min={0} value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} className={inputCls} /></div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <label className={lt('text-gray-600', 'text-zinc-400') + ' text-xs font-medium'}>Max Attempts</label>
          <Input type="number" min={1} value={maxAttempts} onChange={e => setMaxAttempts(+e.target.value)} className={inputCls + ' w-20'} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="accent-teal-500 w-4 h-4" />
          <span className={lt('text-gray-700', 'text-zinc-300') + ' text-sm'}>Required to proceed</span>
        </label>
        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
          {questions.length} question{questions.length !== 1 ? 's' : ''} / {totalPoints} pts
        </Badge>
      </div>

      {preview ? <PreviewPane questions={questions} title={title} lt={lt} /> : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuestionEditor key={q.id} question={q} index={idx} total={questions.length} lt={lt}
              onChange={p => updateQuestion(idx, p)} onRemove={() => removeQuestion(idx)}
              onMove={d => moveQuestion(idx, d)} onUpdateOption={(oI, v) => updateOption(idx, oI, v)}
              onAddOption={() => addOption(idx)} onRemoveOption={oI => removeOption(idx, oI)} />
          ))}
          <Button variant="outline" onClick={addQuestion}
            className={lt('border-gray-300 text-gray-600', 'border-zinc-700 text-zinc-400 hover:bg-zinc-800') + ' w-full'}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Question
          </Button>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ question, index, total, lt, onChange, onRemove, onMove, onUpdateOption, onAddOption, onRemoveOption }) {
  const innerInput = lt('bg-white border-gray-300', 'bg-zinc-900/60 border-zinc-600 text-white');
  return (
    <div className={lt('bg-gray-50 border-gray-200', 'bg-zinc-800/40 border-zinc-700/50') + ' border rounded-lg p-4 space-y-3'}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 pt-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="text-zinc-500 hover:text-teal-400 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="text-zinc-500 hover:text-teal-400 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className={lt('text-gray-500', 'text-zinc-500') + ' text-xs font-bold'}>Q{index + 1}</span>
            <Input value={question.text} onChange={e => onChange({ text: e.target.value })} placeholder="Question text..." className={innerInput + ' flex-1 text-sm'} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={question.type} onChange={e => {
              const t = e.target.value, p = { type: t };
              if (t === 'true_false') p.options = ['True', 'False'];
              if (t === 'multiple_choice' && question.options.length < 2) p.options = ['', ''];
              onChange(p);
            }} className={lt('bg-white border-gray-300 text-gray-900', 'bg-zinc-900/60 border-zinc-600 text-white') + ' h-8 rounded-md border px-2 text-xs'}>
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <label className={lt('text-gray-500', 'text-zinc-500') + ' text-xs'}>Points</label>
              <Input type="number" min={1} max={100} value={question.points} onChange={e => onChange({ points: +e.target.value })} className={innerInput + ' w-16 h-8 text-xs'} />
            </div>
          </div>

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {question.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button onClick={() => onChange({ correctAnswer: oIdx })}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${question.correctAnswer === oIdx ? 'border-teal-500 bg-teal-500' : lt('border-gray-300', 'border-zinc-600')}`}>
                    {question.correctAnswer === oIdx && <CheckCircle className="w-3 h-3 text-white" />}
                  </button>
                  <Input value={opt} onChange={e => onUpdateOption(oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className={innerInput + ' flex-1 h-8 text-sm'} />
                  {question.options.length > 2 && <button onClick={() => onRemoveOption(oIdx)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              {question.options.length < 6 && <button onClick={onAddOption} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add option</button>}
            </div>
          )}
          {question.type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map((label, i) => (
                <button key={label} onClick={() => onChange({ correctAnswer: i })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${question.correctAnswer === i ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : lt('border-gray-300 text-gray-600', 'border-zinc-600 text-zinc-400')}`}>{label}</button>
              ))}
            </div>
          )}
          {question.type === 'short_answer' && <p className={lt('text-gray-400', 'text-zinc-500') + ' text-xs italic'}>Short-answer questions are manually graded.</p>}
          <Textarea value={question.explanation} onChange={e => onChange({ explanation: e.target.value })} placeholder="Explanation (shown after answering)..." className={innerInput + ' text-xs min-h-[56px]'} />
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 pt-1"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function PreviewPane({ questions, title, lt }) {
  const [cur, setCur] = useState(0);
  const q = questions[cur];
  if (!q) return null;
  return (
    <div className={lt('bg-gray-50 border-gray-200', 'bg-zinc-800/30 border-zinc-700/40') + ' border rounded-xl p-6 space-y-4'}>
      <div className="flex items-center justify-between">
        <h3 className={lt('text-gray-900', 'text-white') + ' font-semibold'}>{title || 'Untitled Assessment'}</h3>
        <span className={lt('text-gray-500', 'text-zinc-400') + ' text-sm'}>{cur + 1} / {questions.length}</span>
      </div>
      <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
        <p className={lt('text-gray-800', 'text-zinc-200') + ' font-medium'}>{q.text || '(no question text)'}</p>
        {q.type === 'multiple_choice' && <div className="space-y-2">{q.options.map((o, i) => (
          <div key={i} className={lt('bg-white border-gray-200 text-gray-700', 'bg-zinc-900/50 border-zinc-700 text-zinc-300') + ' border rounded-lg px-4 py-2.5 text-sm'}>{o || `Option ${i + 1}`}</div>
        ))}</div>}
        {q.type === 'true_false' && <div className="flex gap-3">{['True', 'False'].map(l => (
          <div key={l} className={lt('bg-white border-gray-200 text-gray-700', 'bg-zinc-900/50 border-zinc-700 text-zinc-300') + ' border rounded-lg px-6 py-2.5 text-sm'}>{l}</div>
        ))}</div>}
        {q.type === 'short_answer' && <Textarea disabled placeholder="Student types answer here..." className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-700') + ' text-sm min-h-[80px]'} />}
      </motion.div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => setCur(c => c - 1)} className={lt('border-gray-300', 'border-zinc-700 text-zinc-300')}><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">{q.points} pt{q.points !== 1 ? 's' : ''}</Badge>
        <Button variant="outline" size="sm" disabled={cur === questions.length - 1} onClick={() => setCur(c => c + 1)} className={lt('border-gray-300', 'border-zinc-700 text-zinc-300')}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. AssessmentTaker
// ---------------------------------------------------------------------------

export function AssessmentTaker({ assessmentId, userId, onComplete }) {
  const { lt } = useTheme();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [pastAttempts, setPastAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const data = await db.entities.Assessment.get(assessmentId);
        if (off) return;
        if (!data) throw new Error('Assessment not found');
        setAssessment(data);
        if (data.time_limit_minutes) setTimeLeft(data.time_limit_minutes * 60);
        startTimeRef.current = Date.now();
        const res = await db.entities.UserResult.filter({ user_id: userId, assessment_id: assessmentId });
        if (!off) setPastAttempts(res.length);
      } catch (e) { if (!off) setError(e.message); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [assessmentId, userId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = assessment?.questions || [];
  const currentQ = questions[currentIdx];
  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (q.points || 1), 0), [questions]);
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const setAnswer = useCallback((qId, v) => setAnswers(p => ({ ...p, [qId]: v })), []);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const calculateResult = useCallback(() => {
    let earned = 0;
    const details = questions.map(q => {
      const ua = answers[q.id];
      const correct = q.type !== 'short_answer' && ua !== undefined && ua === q.correctAnswer;
      if (correct) earned += (q.points || 1);
      return { questionId: q.id, userAnswer: ua, correct, points: q.points || 1 };
    });
    return { score: totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0, earned, details };
  }, [questions, answers, totalPoints]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (result) return;
    setConfirmOpen(false); setSubmitting(true); clearInterval(timerRef.current);
    try {
      const { score, earned, details } = calculateResult();
      const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      const passed = score >= (assessment?.passing_score || 70);
      await db.entities.UserResult.create({
        user_id: userId, assessment_id: assessmentId, score,
        answers: { details, raw: answers }, completed_at: new Date().toISOString(),
        time_taken_seconds: timeTaken, attempt_number: pastAttempts + 1,
      });
      setResult({ score, earned, totalPoints, passed, timeTaken, details, autoSubmit: auto });
      setPastAttempts(p => p + 1);
      if (auto) toast.info('Time is up! Your answers have been submitted.');
    } catch (err) { console.error('[AssessmentTaker] submit:', err); toast.error('Failed to submit'); }
    finally { setSubmitting(false); }
  }, [result, calculateResult, assessment, userId, assessmentId, pastAttempts, answers, totalPoints]);

  const handleRetry = useCallback(() => {
    setAnswers({}); setCurrentIdx(0); setResult(null);
    startTimeRef.current = Date.now();
    if (assessment?.time_limit_minutes) setTimeLeft(assessment.time_limit_minutes * 60);
  }, [assessment]);

  const attemptsLeft = assessment?.max_attempts ? assessment.max_attempts - pastAttempts : Infinity;

  if (loading) return (
    <div className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800/60') + ' border rounded-xl p-12 flex justify-center'}>
      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
    </div>
  );
  if (error) return (
    <div className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800/60') + ' border rounded-xl p-8 text-center'}>
      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p className={lt('text-gray-700', 'text-zinc-300')}>{error}</p>
    </div>
  );
  if (result) return <ResultScreen result={result} assessment={assessment} questions={questions} answers={answers} attemptsLeft={attemptsLeft} onRetry={handleRetry} onComplete={onComplete} lt={lt} />;

  const optBtn = (selected) => selected
    ? 'bg-teal-500/15 border-teal-500/50 text-teal-300'
    : lt('bg-white border-gray-200 text-gray-700 hover:border-gray-400', 'bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:border-zinc-500');

  return (
    <div className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800/60') + ' border rounded-xl overflow-hidden'}>
      {/* Header */}
      <div className={lt('bg-gray-50 border-gray-200', 'bg-zinc-800/60 border-zinc-700/50') + ' border-b px-5 py-3 flex items-center justify-between'}>
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-teal-400" />
          <h3 className={lt('text-gray-900', 'text-white') + ' font-semibold text-sm'}>{assessment.title}</h3>
          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">{assessment.type}</Badge>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-medium ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-zinc-800/50 text-zinc-300'}`}>
            <Timer className="w-4 h-4" />{fmtTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="px-5 pt-3">
        <div className="flex justify-between mb-1.5">
          <span className={lt('text-gray-500', 'text-zinc-500') + ' text-xs'}>Question {currentIdx + 1} of {questions.length}</span>
          <span className={lt('text-gray-500', 'text-zinc-500') + ' text-xs'}>{answeredCount}/{questions.length} answered</span>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1.5" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentQ?.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="p-5 space-y-4">
          <p className={lt('text-gray-800', 'text-zinc-100') + ' font-medium'}>{currentQ?.text}</p>
          {currentQ?.type === 'multiple_choice' && (
            <div className="space-y-2">{currentQ.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswer(currentQ.id, i)} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optBtn(answers[currentQ.id] === i)}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border mr-3 text-xs font-bold ${answers[currentQ.id] === i ? 'border-teal-500 bg-teal-500 text-white' : lt('border-gray-300 text-gray-500', 'border-zinc-600 text-zinc-500')}`}>{String.fromCharCode(65 + i)}</span>{opt}
              </button>
            ))}</div>
          )}
          {currentQ?.type === 'true_false' && (
            <div className="flex gap-3">{[0, 1].map(i => (
              <button key={i} onClick={() => setAnswer(currentQ.id, i)} className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${optBtn(answers[currentQ.id] === i)}`}>{i === 0 ? 'True' : 'False'}</button>
            ))}</div>
          )}
          {currentQ?.type === 'short_answer' && (
            <Textarea value={answers[currentQ.id] || ''} onChange={e => setAnswer(currentQ.id, e.target.value)} placeholder="Type your answer..." className={lt('bg-white border-gray-200', 'bg-zinc-800/40 border-zinc-700 text-white') + ' min-h-[100px]'} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav dots */}
      <div className="px-5 pb-2 flex gap-1 flex-wrap justify-center">
        {questions.map((q, i) => (
          <button key={q.id} onClick={() => setCurrentIdx(i)}
            className={`w-7 h-7 rounded-full text-[10px] font-bold border transition-all ${i === currentIdx ? 'bg-teal-500 border-teal-500 text-white' : answers[q.id] !== undefined ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' : lt('border-gray-300 text-gray-400', 'border-zinc-700 text-zinc-500')}`}>{i + 1}</button>
        ))}
      </div>

      {/* Bottom nav */}
      <div className={lt('bg-gray-50 border-gray-200', 'bg-zinc-800/40 border-zinc-700/40') + ' border-t px-5 py-3 flex justify-between'}>
        <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)} className={lt('border-gray-300', 'border-zinc-700 text-zinc-300')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        {currentIdx === questions.length - 1 ? (
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting} className="bg-teal-600 hover:bg-teal-500 text-white">
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />} Submit
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCurrentIdx(i => i + 1)} className="bg-teal-600 hover:bg-teal-500 text-white">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className={lt('bg-white', 'bg-zinc-900 border-zinc-800')}>
          <DialogHeader><DialogTitle className={lt('text-gray-900', 'text-white')}>Submit Assessment?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className={lt('text-gray-600', 'text-zinc-400') + ' text-sm'}>
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {answeredCount < questions.length && <span className="text-amber-400 ml-1">{questions.length - answeredCount} unanswered will be marked incorrect.</span>}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} className={lt('border-gray-300', 'border-zinc-700 text-zinc-300')}>Cancel</Button>
              <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting} className="bg-teal-600 hover:bg-teal-500 text-white">
                {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Confirm Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result screen
// ---------------------------------------------------------------------------

function ResultScreen({ result, assessment, questions, answers, attemptsLeft, onRetry, onComplete, lt }) {
  const passed = result.passed;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className={lt('bg-white border-gray-200', 'bg-zinc-900/50 border-zinc-800/60') + ' border rounded-xl overflow-hidden'}>
      {/* Hero */}
      <div className={`p-8 text-center ${passed ? 'bg-gradient-to-br from-teal-500/10 to-emerald-500/10' : 'bg-gradient-to-br from-red-500/10 to-orange-500/10'}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
          {passed ? <Trophy className="w-14 h-14 text-teal-400 mx-auto mb-3" /> : <XCircle className="w-14 h-14 text-red-400 mx-auto mb-3" />}
        </motion.div>
        <h2 className={lt('text-gray-900', 'text-white') + ' text-2xl font-bold mb-1'}>{passed ? 'You Passed!' : 'Not Quite'}</h2>
        <p className={lt('text-gray-500', 'text-zinc-400') + ' text-sm'}>{passed ? 'Great work on this assessment.' : 'Review the answers below and try again.'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-6">
        {[
          { val: `${result.score}%`, label: 'Score', cls: passed ? 'text-teal-400' : 'text-red-400' },
          { val: `${result.earned}/${result.totalPoints}`, label: 'Points', cls: lt('text-gray-900', 'text-white') },
          { val: `${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}`, label: 'Time', cls: lt('text-gray-900', 'text-white') },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className={`text-3xl font-bold ${s.cls}`}>{s.val}</div>
            <div className={lt('text-gray-500', 'text-zinc-500') + ' text-xs mt-1'}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="px-6 pb-4">
        <div className="flex justify-between mb-1.5">
          <span className={lt('text-gray-500', 'text-zinc-500') + ' text-xs'}>Your Score</span>
          <span className={lt('text-gray-500', 'text-zinc-500') + ' text-xs'}>Passing: {assessment.passing_score || 70}%</span>
        </div>
        <div className={lt('bg-gray-200', 'bg-zinc-800') + ' w-full h-3 rounded-full overflow-hidden relative'}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${result.score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${passed ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`} />
          <div className="absolute top-0 bottom-0 border-r-2 border-dashed border-zinc-400" style={{ left: `${assessment.passing_score || 70}%` }} />
        </div>
      </div>

      {/* Review */}
      <div className="px-6 pb-4 space-y-2">
        <h4 className={lt('text-gray-700', 'text-zinc-300') + ' text-sm font-semibold mb-2'}>Question Review</h4>
        {result.details.map((d, idx) => {
          const q = questions[idx]; if (!q) return null;
          return (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className={`border rounded-lg p-3 ${d.correct ? lt('bg-green-50 border-green-200', 'bg-green-500/5 border-green-500/20') : lt('bg-red-50 border-red-200', 'bg-red-500/5 border-red-500/20')}`}>
              <div className="flex items-start gap-2">
                {d.correct ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={lt('text-gray-800', 'text-zinc-200') + ' text-sm font-medium'}>{q.text}</p>
                  {q.type !== 'short_answer' && (
                    <div className="mt-1.5 space-y-1">
                      {!d.correct && d.userAnswer !== undefined && <p className="text-xs text-red-400">Your answer: {q.type === 'true_false' ? (d.userAnswer === 0 ? 'True' : 'False') : q.options?.[d.userAnswer]}</p>}
                      <p className="text-xs text-green-400">Correct: {q.type === 'true_false' ? (q.correctAnswer === 0 ? 'True' : 'False') : q.options?.[q.correctAnswer]}</p>
                    </div>
                  )}
                  {q.type === 'short_answer' && d.userAnswer && <p className={lt('text-gray-500', 'text-zinc-400') + ' text-xs mt-1'}>Your answer: {d.userAnswer}</p>}
                  {q.explanation && <p className={lt('text-gray-500', 'text-zinc-500') + ' text-xs mt-2 italic'}>{q.explanation}</p>}
                </div>
                <span className={lt('text-gray-400', 'text-zinc-600') + ' text-xs font-mono'}>{d.points}pt</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className={lt('bg-gray-50 border-gray-200', 'bg-zinc-800/40 border-zinc-700/40') + ' border-t px-6 py-4 flex justify-between'}>
        {!passed && attemptsLeft > 0 ? (
          <Button variant="outline" size="sm" onClick={onRetry} className={lt('border-gray-300', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Retry ({attemptsLeft} left)
          </Button>
        ) : !passed ? <p className="text-xs text-red-400">No attempts remaining</p> : <div />}
        <Button size="sm" onClick={() => onComplete?.({ ...result, assessment })} className="bg-teal-600 hover:bg-teal-500 text-white">
          {passed ? 'Continue' : 'Done'} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
