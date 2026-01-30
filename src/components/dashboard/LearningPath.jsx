import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, Circle, Clock } from "lucide-react";

export default function LearningPath({ userProgress, courses }) {
  const pathSteps = [
    {
      title: "AI Fundamentals",
      description: "Build your foundation",
      category: "fundamentals",
      completed: false
    },
    {
      title: "Machine Learning Basics",
      description: "Understand ML concepts",
      category: "machine_learning", 
      completed: false
    },
    {
      title: "Deep Learning",
      description: "Neural networks & more",
      category: "deep_learning",
      completed: false
    },
    {
      title: "Specialized Applications",
      description: "NLP, Computer Vision, etc.",
      category: "applications",
      completed: false
    }
  ];

  // Calculate completion for each step
  const stepsWithProgress = pathSteps.map(step => {
    const categoryCourses = courses.filter(c => c.category === step.category);
    const categoryProgress = userProgress.filter(p => 
      categoryCourses.some(c => c.id === p.course_id)
    );
    const completedInCategory = categoryProgress.filter(p => p.status === 'completed').length;
    const totalInCategory = categoryCourses.length;
    
    return {
      ...step,
      completed: completedInCategory > 0,
      progress: totalInCategory > 0 ? (completedInCategory / totalInCategory) * 100 : 0,
      coursesCompleted: completedInCategory,
      totalCourses: totalInCategory
    };
  });

  const overallProgress = stepsWithProgress.reduce((sum, step) => sum + step.progress, 0) / stepsWithProgress.length;

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-400" />
          Your Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-white">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 bg-gray-700" />
        </div>

        <div className="space-y-4">
          {stepsWithProgress.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-teal-500/20 text-teal-400' 
                  : step.progress > 0
                  ? 'bg-teal-400/20 text-teal-300'
                  : 'bg-gray-700 text-gray-500'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : step.progress > 0 ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-white">{step.title}</h4>
                <p className="text-xs text-gray-400 mb-1">{step.description}</p>
                {step.totalCourses > 0 && (
                  <div className="flex items-center gap-2">
                    <Progress value={step.progress} className="flex-1 h-1 bg-gray-700" />
                    <span className="text-xs text-gray-500">
                      {step.coursesCompleted}/{step.totalCourses}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}