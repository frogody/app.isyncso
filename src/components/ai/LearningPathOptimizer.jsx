
import React, { useState, useEffect } from "react";
import { Course, UserProgress } from "@/api/entities";
import { InvokeClaude } from "@/components/integrations/AnthropicAPI";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Zap
} from "lucide-react";

export default function LearningPathOptimizer() {
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [learningGoal, setLearningGoal] = useState("");
  const [timeCommitment, setTimeCommitment] = useState("5");
  const [currentSkillLevel, setCurrentSkillLevel] = useState("beginner");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPath, setOptimizedPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, progressData] = await Promise.all([
        Course.list(),
        UserProgress.list()
      ]);
      
      setCourses(coursesData.filter(course => course.is_published));
      setUserProgress(progressData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const optimizeLearningPath = async () => {
    if (!learningGoal.trim()) return;
    
    setIsOptimizing(true);
    
    try {
      const completedCourses = userProgress
        .filter(p => p.status === 'completed')
        .map(p => p.course_id);
      
      const inProgressCourses = userProgress
        .filter(p => p.status === 'in_progress')
        .map(p => p.course_id);

      const prompt = `Optimize a personalized learning path based on the following:

Learning Goal: ${learningGoal}
Current Skill Level: ${currentSkillLevel}
Available Time per Week: ${timeCommitment} hours
Completed Courses: ${completedCourses.length} courses
In Progress Courses: ${inProgressCourses.length} courses

Available Courses:
${JSON.stringify(courses.map(c => ({
  id: c.id,
  title: c.title,
  category: c.category,
  difficulty: c.difficulty,
  duration_hours: c.duration_hours,
  prerequisites: c.prerequisites
})))}

User Progress:
- Completed: ${completedCourses}
- In Progress: ${inProgressCourses}

Create an optimized learning path that:
1. Aligns with the user's goal
2. Considers their current progress and skill level
3. Respects their time constraints
4. Follows logical prerequisite sequences
5. Provides milestone achievements

Include specific recommendations for immediate next steps, medium-term goals, and long-term objectives.`;

      const result = await InvokeClaude({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            learning_path: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                estimated_completion_weeks: { type: "number" },
                skill_progression: { type: "array", items: { type: "string" } }
              }
            },
            immediate_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  course_id: { type: "string" },
                  priority: { type: "string" },
                  reason: { type: "string" },
                  estimated_weeks: { type: "number" }
                }
              }
            },
            medium_term_goals: {
              type: "array",
              items: {
                type: "object", 
                properties: {
                  course_id: { type: "string" },
                  milestone: { type: "string" },
                  estimated_weeks: { type: "number" }
                }
              }
            },
            long_term_objectives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  course_id: { type: "string" },
                  objective: { type: "string" },
                  estimated_weeks: { type: "number" }
                }
              }
            },
            personalized_tips: { type: "array", items: { type: "string" } },
            potential_challenges: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Enrich the results with course data
      const enrichedResult = {
        ...result,
        immediate_actions: result.immediate_actions?.map(action => ({
          ...action,
          course: courses.find(c => c.id === action.course_id)
        })).filter(action => action.course),
        medium_term_goals: result.medium_term_goals?.map(goal => ({
          ...goal,
          course: courses.find(c => c.id === goal.course_id)
        })).filter(goal => goal.course),
        long_term_objectives: result.long_term_objectives?.map(obj => ({
          ...obj,
          course: courses.find(c => c.id === obj.course_id)
        })).filter(obj => obj.course)
      };

      setOptimizedPath(enrichedResult);
    } catch (error) {
      console.error("Error optimizing learning path:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-32 bg-gray-800/50 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimization Settings */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Learning Path Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Current Skill Level</label>
              <Select value={currentSkillLevel} onValueChange={setCurrentSkillLevel}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="beginner" className="text-white">Beginner</SelectItem>
                  <SelectItem value="intermediate" className="text-white">Intermediate</SelectItem>
                  <SelectItem value="advanced" className="text-white">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Weekly Time (hours)</label>
              <Select value={timeCommitment} onValueChange={setTimeCommitment}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="2" className="text-white">2 hours</SelectItem>
                  <SelectItem value="5" className="text-white">5 hours</SelectItem>
                  <SelectItem value="10" className="text-white">10 hours</SelectItem>
                  <SelectItem value="15" className="text-white">15+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Learning Goal</label>
              <input
                type="text"
                placeholder="e.g., Become an ML Engineer"
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white placeholder-gray-400"
              />
            </div>
          </div>

          <Button
            onClick={optimizeLearningPath}
            disabled={isOptimizing || !learningGoal.trim()}
            className="w-full emerald-gradient emerald-gradient-hover"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Optimizing Your Path...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Optimize Learning Path
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Optimized Path Results */}
      {optimizedPath && (
        <div className="space-y-6">
          {/* Path Overview */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Your Optimized Learning Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-400/10 border border-emerald-500/20">
                <h3 className="text-xl font-bold text-white mb-2">
                  {optimizedPath.learning_path.title}
                </h3>
                <p className="text-gray-300 mb-4">
                  {optimizedPath.learning_path.description}
                </p>
                <div className="flex items-center gap-4">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    {optimizedPath.learning_path.estimated_completion_weeks} weeks
                  </Badge>
                  <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
                    <Target className="w-3 h-3 mr-1" />
                    {currentSkillLevel} → advanced
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Immediate Actions */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Start Here (Next 4 weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizedPath.immediate_actions?.map((action, index) => (
                  <div key={index} className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover-glow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{action.course?.title}</h4>
                      <Badge className={`${
                        action.priority === 'high' ? 'bg-emerald-600/20 text-emerald-500 border-emerald-600/30' :
                        action.priority === 'medium' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                      }`}>
                        {action.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{action.reason}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {action.estimated_weeks} weeks ({action.course?.duration_hours}h total)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Medium Term Goals */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Build Skills (1-3 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizedPath.medium_term_goals?.map((goal, index) => (
                  <div key={index} className="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 hover-glow">
                    <h4 className="font-semibold text-white mb-2">{goal.course?.title}</h4>
                    <p className="text-sm text-emerald-300 mb-2">
                      <Target className="w-4 h-4 inline mr-1" />
                      {goal.milestone}
                    </p>
                    <div className="text-xs text-gray-400">
                      Estimated: {goal.estimated_weeks} weeks
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Long Term Objectives */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Master Advanced Skills (3+ months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizedPath.long_term_objectives?.map((objective, index) => (
                  <div key={index} className="p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20 hover-glow">
                    <h4 className="font-semibold text-white mb-2">{objective.course?.title}</h4>
                    <p className="text-sm text-emerald-500 mb-2">{objective.objective}</p>
                    <div className="text-xs text-gray-400">
                      Target: {objective.estimated_weeks} weeks from start
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips and Challenges */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400" />
                  Personalized Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimizedPath.personalized_tips?.map((tip, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-emerald-400" />
                  Potential Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimizedPath.potential_challenges?.map((challenge, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      {challenge}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
