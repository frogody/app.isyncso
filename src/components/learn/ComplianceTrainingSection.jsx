import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, BookOpen, ArrowRight, ExternalLink } from "lucide-react";

export default function ComplianceTrainingSection({ recommendations }) {
  if (!recommendations || recommendations.ai_systems_count === 0) {
    return (
      <Card className="glass-card border-0 border-teal-500/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-teal-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">🛡️ Compliance Training</h3>
              <p className="text-sm text-gray-400 mb-4">
                Register your AI systems in SENTINEL to get personalized compliance training recommendations.
              </p>
              <Link to={createPageUrl("SentinelDashboard")}>
                <Button variant="outline" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
                  Go to SENTINEL
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { ai_systems_count, high_risk_count, recommendations: courses } = recommendations;
  const requiredCourses = courses.filter(c => c.priority === 'required');
  const recommendedCourses = courses.filter(c => c.priority === 'recommended');

  return (
    <Card className="glass-card border-0 border-teal-500/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">🛡️ Compliance Training</h3>
            <p className="text-sm text-gray-400">
              Based on your registered AI systems
            </p>
          </div>
        </div>

        {/* Context */}
        <div className="mb-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
          <p className="text-sm text-teal-200">
            Your company has <span className="font-bold">{ai_systems_count}</span> AI system{ai_systems_count !== 1 ? 's' : ''} registered
            {high_risk_count > 0 && (
              <>, including <span className="font-bold text-orange-300">{high_risk_count}</span> high-risk system{high_risk_count !== 1 ? 's' : ''}</>
            )}.
          </p>
        </div>

        {/* Required Courses */}
        {requiredCourses.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h4 className="text-sm font-semibold text-orange-300 uppercase tracking-wider">Required</h4>
            </div>
            <div className="space-y-3">
              {requiredCourses.map(course => (
                <div 
                  key={course.course_id}
                  className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:border-orange-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-orange-400" />
                        <h5 className="text-base font-semibold text-white">{course.course_title}</h5>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{course.relevance_reason}</p>
                      {course.matching_systems.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Required for:</span>
                          {course.matching_systems.map((system, idx) => (
                            <Badge key={idx} className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link to={createPageUrl(`CourseDetail?id=${course.course_id}`)}>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white">
                        Start
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Courses */}
        {recommendedCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-teal-400" />
              <h4 className="text-sm font-semibold text-teal-300 uppercase tracking-wider">Recommended</h4>
            </div>
            <div className="space-y-3">
              {recommendedCourses.map(course => (
                <div 
                  key={course.course_id}
                  className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:border-teal-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-teal-400" />
                        <h5 className="text-base font-semibold text-white">{course.course_title}</h5>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{course.relevance_reason}</p>
                      {course.matching_systems.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Relevant for:</span>
                          {course.matching_systems.map((system, idx) => (
                            <Badge key={idx} className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link to={createPageUrl(`CourseDetail?id=${course.course_id}`)}>
                      <Button size="sm" variant="outline" className="border-teal-500/30 text-teal-300 hover:bg-teal-500/10">
                        View
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state (no matching courses) */}
        {courses.length === 0 && (
          <div className="text-center py-6">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No matching compliance courses available yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}