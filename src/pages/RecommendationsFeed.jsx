import React, { useState, useEffect } from "react";
import { CourseRecommendation, Course } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  BookOpen,
  Eye,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecommendationsFeed() {
  const [recommendations, setRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    filterRecommendations();
  }, [recommendations, filterPriority, filterStatus]);

  const loadRecommendations = async () => {
    try {
      const recsData = await CourseRecommendation.list('-recommended_at');
      
      // Enrich with course details
      const enriched = await Promise.all(
        recsData.map(async (rec) => {
          try {
            const course = await Course.get(rec.course_id);
            return { 
              ...rec, 
              course_title: course?.title || 'Unknown Course',
              course_description: course?.description || ''
            };
          } catch {
            return { 
              ...rec, 
              course_title: 'Unknown Course',
              course_description: ''
            };
          }
        })
      );

      setRecommendations(enriched);
    } catch (err) {
      console.error("Error loading recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterRecommendations = () => {
    let filtered = [...recommendations];

    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    if (filterStatus === 'viewed') {
      filtered = filtered.filter(r => r.viewed);
    } else if (filterStatus === 'not_viewed') {
      filtered = filtered.filter(r => !r.viewed);
    } else if (filterStatus === 'acted_on') {
      filtered = filtered.filter(r => r.acted_on);
    }

    setFilteredRecommendations(filtered);
  };

  const handleDismiss = async (recId) => {
    try {
      await CourseRecommendation.update(recId, { viewed: true });
      setRecommendations(recommendations.filter(r => r.id !== recId));
    } catch (err) {
      console.error("Error dismissing recommendation:", err);
    }
  };

  const handleView = async (recId) => {
    try {
      await CourseRecommendation.update(recId, { viewed: true });
      setRecommendations(recommendations.map(r =>
        r.id === recId ? { ...r, viewed: true } : r
      ));
    } catch (err) {
      console.error("Error marking as viewed:", err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Course Recommendations</h1>
          <p className="text-gray-400">Personalized learning paths based on your activity</p>
        </div>

        {/* Filters */}
        <Card className="glass-card border-0 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-2 block">Priority</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterPriority('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPriority === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPriority('urgent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPriority === 'urgent'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  Urgent
                </button>
                <button
                  onClick={() => setFilterPriority('high')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPriority === 'high'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterPriority('medium')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPriority === 'medium'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  Medium
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-2 block">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('not_viewed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'not_viewed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => setFilterStatus('viewed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'viewed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  Viewed
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Recommendations Feed */}
        <div className="space-y-4">
          {filteredRecommendations.length === 0 ? (
            <Card className="glass-card border-0 p-12">
              <div className="text-center space-y-4">
                <Sparkles className="w-16 h-16 text-gray-500 mx-auto" />
                <h3 className="text-xl font-semibold text-white">No Recommendations</h3>
                <p className="text-gray-400">
                  We'll recommend courses based on your learning activity
                </p>
              </div>
            </Card>
          ) : (
            filteredRecommendations.map((rec) => (
              <Card key={rec.id} className="glass-card border-0 hover-glow transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-lg">
                              {rec.course_title}
                            </h3>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                            {rec.viewed && (
                              <Eye className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <p className="text-sm text-emerald-300">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            {rec.reason}
                          </p>
                        </div>
                      </div>

                      {rec.course_description && (
                        <p className="text-sm text-gray-400 mb-4">
                          {rec.course_description.substring(0, 150)}...
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <Link to={createPageUrl(`CourseDetail?id=${rec.course_id}`)}>
                          <Button
                            size="sm"
                            className="btn-primary"
                            onClick={() => handleView(rec.id)}
                          >
                            Start Course
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:bg-gray-800"
                          onClick={() => handleDismiss(rec.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}