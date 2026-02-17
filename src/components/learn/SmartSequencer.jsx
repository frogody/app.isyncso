import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle, ArrowRight, Brain, Target } from 'lucide-react';
import { db } from '@/api/supabaseClient';

/**
 * SmartSequencer - Analyzes user performance and suggests optimal next steps
 * - Skip mastered content
 * - Recommend remediation
 * - Adjust difficulty
 */
export function SmartSequencer({ lesson, nextLesson, onProceed, onSkip, userId, courseId }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  const calculateMastery = (interactions, assessments) => {
    let score = 50; // Base score

    // Bonus for interactions (reflections, code attempts)
    if (interactions.length > 0) {
      score += Math.min(interactions.length * 5, 20);
    }

    // Bonus for quiz performance
    const relevantQuizzes = assessments.filter(a => 
      a.created_date > new Date(Date.now() - 24*60*60*1000).toISOString()
    );
    
    if (relevantQuizzes.length > 0) {
      const avgScore = relevantQuizzes.reduce((sum, q) => sum + q.score, 0) / relevantQuizzes.length;
      score += avgScore * 0.3; // Up to 30 bonus points
    }

    return Math.min(score, 100);
  };

  const getRecommendation = (score, next) => {
    if (score >= 85) {
      return {
        type: 'skip_offered',
        icon: Zap,
        color: 'yellow',
        title: 'You\'re crushing it! 🔥',
        message: `Based on your ${Math.round(score)}% mastery, you might already know the next topic. Want to skip ahead?`,
        canSkip: true
      };
    }

    if (score >= 70) {
      return {
        type: 'standard',
        icon: CheckCircle,
        color: 'green',
        title: 'Great work!',
        message: 'You\'re ready for the next lesson.',
        canSkip: false
      };
    }

    return {
      type: 'review',
      icon: Brain,
      color: 'blue',
      title: 'Consider reviewing',
      message: 'You might benefit from revisiting this lesson or trying the quiz again.',
      canSkip: false
    };
  };

  const analyzePerformance = React.useCallback(async () => {
    if (!userId || !nextLesson) {
      setLoading(false);
      return;
    }

    try {
      const interactions = await db.entities.LessonInteraction.filter({
        user_id: userId,
        lesson_id: lesson.id
      });

      const assessments = await db.entities.UserResult.filter({
        user_id: userId
      });

      const masteryScore = calculateMastery(interactions, assessments);
      const rec = getRecommendation(masteryScore, nextLesson);
      setRecommendation(rec);
    } catch (error) {
      console.error('[SmartSequencer] Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, [lesson.id, userId, nextLesson]);

  useEffect(() => {
    analyzePerformance();
  }, [analyzePerformance]);

  if (loading) {
    return (
      <Card className="bg-gray-800/30 border-gray-700 animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-gray-700/50 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) return null;

  const Icon = recommendation.icon;
  const colorClasses = {
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  return (
    <Card className={`${colorClasses[recommendation.color]} border`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${colorClasses[recommendation.color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{recommendation.title}</h3>
            <p className="text-sm text-gray-300 mb-4">{recommendation.message}</p>
            
            <div className="flex gap-2">
              {recommendation.canSkip && (
                <Button
                  onClick={onSkip}
                  variant="outline"
                  className="border-yellow-500/50 hover:bg-yellow-500/20"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Skip Ahead
                </Button>
              )}
              <Button
                onClick={onProceed}
                className="bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PrerequisiteCheck - Shows if user should complete prerequisites first
 */
export function PrerequisiteCheck({ lesson, userId, onProceed }) {
  const [status, setStatus] = useState('checking');

  const checkPrerequisites = React.useCallback(async () => {
    // In a real implementation, this would check course structure
    // and user's completion of prerequisite lessons
    setStatus('ready');
  }, []);

  useEffect(() => {
    checkPrerequisites();
  }, [checkPrerequisites]);

  if (status === 'ready') return null;

  return (
    <Card className="bg-amber-500/10 border-amber-500/30">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Target className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Prerequisites Recommended</h3>
            <p className="text-sm text-gray-300 mb-3">
              This lesson builds on concepts from earlier modules. We recommend completing them first for better understanding.
            </p>
            <Button
              onClick={onProceed}
              variant="outline"
              size="sm"
              className="border-amber-500/50"
            >
              Continue Anyway
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}