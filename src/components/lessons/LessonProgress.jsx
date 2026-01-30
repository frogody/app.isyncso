import React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";

export default function LessonProgress({ 
  currentIndex, 
  totalLessons, 
  completedCount, 
  completionPercentage 
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3 h-3 text-teal-400" />
          <span>{completedCount} of {totalLessons} lessons completed</span>
        </div>
        <span className="font-semibold text-white">{completionPercentage}%</span>
      </div>
      <Progress value={completionPercentage} className="h-2" />
      <p className="text-xs text-gray-500 text-center">
        Lesson {currentIndex + 1} of {totalLessons}
      </p>
    </div>
  );
}