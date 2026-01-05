import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, Clock, Mic, Brain, TrendingUp, Target 
} from 'lucide-react';

export function LearningAnalytics({ courseId, userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch all interactions for this user
        const interactions = await base44.entities.LessonInteraction.filter({
          user_id: userId
        });

        // Filter to this course if courseId provided
        const relevant = courseId 
          ? interactions.filter(i => i.course_id === courseId)
          : interactions;

        // Calculate stats
        const stats = {
          totalQuestions: relevant.filter(i => i.interaction_type === 'question_asked').length,
          voiceInteractions: relevant.filter(i => i.interaction_type === 'voice_used').length,
          lessonsCompleted: new Set(
            relevant.filter(i => i.interaction_type === 'lesson_completed').map(i => i.lesson_id)
          ).size,
          quizzesPassed: relevant.filter(i => {
            if (i.interaction_type !== 'quiz_attempted') return false;
            try {
              const data = JSON.parse(i.user_input);
              return data.passed;
            } catch { return false; }
          }).length,
          totalTimeMinutes: Math.round(
            relevant.reduce((sum, i) => {
              try {
                const data = JSON.parse(i.user_input);
                return sum + (data.session_duration_ms || 0);
              } catch { return sum; }
            }, 0) / 60000
          ),
          proactiveHelps: relevant.filter(i => i.interaction_type === 'proactive_help').length,
          avgQuestionsPerLesson: 0
        };

        if (stats.lessonsCompleted > 0) {
          stats.avgQuestionsPerLesson = Math.round(
            stats.totalQuestions / stats.lessonsCompleted * 10
          ) / 10;
        }

        setStats(stats);
      } catch (error) {
        console.error('[Analytics] Failed to load:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) loadStats();
  }, [courseId, userId]);

  if (loading) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-800 rounded w-1/3" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const metrics = [
    { icon: MessageSquare, label: 'Questions Asked', value: stats.totalQuestions, color: 'text-blue-400' },
    { icon: Mic, label: 'Voice Chats', value: stats.voiceInteractions, color: 'text-red-400' },
    { icon: Target, label: 'Lessons Done', value: stats.lessonsCompleted, color: 'text-green-400' },
    { icon: Brain, label: 'Quizzes Passed', value: stats.quizzesPassed, color: 'text-yellow-400' },
    { icon: Clock, label: 'Time Spent', value: `${stats.totalTimeMinutes}m`, color: 'text-purple-400' },
    { icon: TrendingUp, label: 'Avg Questions/Lesson', value: stats.avgQuestionsPerLesson, color: 'text-orange-400' },
  ];

  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-400" />
          Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-800/30 rounded-lg p-3 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}