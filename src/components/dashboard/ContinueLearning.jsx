import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, Circle, Clock } from "lucide-react";

export default function ContinueLearning({ courses, userProgress }) {
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
    <Card className="h-full bg-black border-black flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-cyan-400" />
          Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-3 pt-0">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">Overall</span>
            <span className="text-white font-bold">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-1.5 bg-gray-700" />
        </div>

        <div className="space-y-2.5">
          {stepsWithProgress.map((step, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                step.completed 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : step.progress > 0
                  ? 'bg-cyan-400/20 text-cyan-300'
                  : 'bg-gray-700 text-gray-500'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : step.progress > 0 ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white text-xs leading-tight">{step.title}</h4>
                {step.totalCourses > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Progress value={step.progress} className="flex-1 h-1 bg-gray-700" />
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
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