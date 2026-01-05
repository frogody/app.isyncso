import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecommendedCourses({ recommendations }) {
  const difficultyColors = {
    beginner: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    intermediate: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
    advanced: "bg-cyan-600/20 text-cyan-500 border-cyan-600/30"
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          AI Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading personalized recommendations...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((course) => (
              <div key={course.id} className="p-4 rounded-lg bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{course.title}</h3>
                      <Badge className={difficultyColors[course.difficulty]}>
                        {course.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                    
                    {course.reason && (
                      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-3">
                        <p className="text-sm text-cyan-300">
                          <Sparkles className="w-4 h-4 inline mr-1" />
                          {course.reason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration_hours}h
                      </div>
                      <div className="capitalize">
                        {course.category?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
                    <Button size="sm" className="bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.1)] hover:shadow-[0_0_16px_rgba(6,182,212,0.2)] transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}