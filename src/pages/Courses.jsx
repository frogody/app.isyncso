import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
const { Course, Module, Lesson, UserProgress, User, CourseBuild } = base44.entities;
// Using base44.integrations.Core.InvokeLLM instead of direct import to avoid circular deps
const InvokeLLM = base44.integrations.Core.InvokeLLM;
import { useDebounce } from "@/components/hooks/useDebounce";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";
import { 
  Search, Filter, BookOpen, Clock, Users, Star, Grid, List, Hammer, 
  Loader2, Sparkles, Zap, TrendingUp, Building2, Briefcase, 
  CheckCircle, PlayCircle, Award, BarChart3, Target, Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Progress as ProgressBar } from "@/components/ui/progress";
import CourseCard from "../components/courses/CourseCard";
import CourseFilters from "../components/courses/CourseFilters";
import EmptyState from "../components/courses/EmptyState";
import BuildProgress from "../components/courses/BuildProgress";
import { LoadingSkeleton } from "@/components/ui/loading";
import { SkeletonList } from "@/components/ui/skeleton-card";

// Course generation logic
const buildPersonalizedCourse = async (enrichedProfile, onProgress) => {
  onProgress({ stage: "Analyzing Your Profile", detail: "Processing professional data...", percent: 10 });

  const { userProfile, companyData, individualData } = enrichedProfile;

  // Build context
  const techStackContext = companyData?.tech_stack?.length > 0
    ? `\n\nCompany Tech Stack: ${companyData.tech_stack.slice(0, 15).join(', ')}
CRITICAL: Show how to implement AI using these EXACT tools. Provide concrete code examples.`
    : '';

  const industryContext = companyData?.industry
    ? `\n\nCompany Industry: ${companyData.industry}
CRITICAL: All examples must be relevant to ${companyData.industry}. Make it immediately applicable.`
    : '';

  const roleContext = individualData?.seniority_level || individualData?.department
    ? `\n\nProfessional Context:
- Seniority: ${individualData.seniority_level || 'Not specified'}
- Department: ${individualData.department || 'Not specified'}
- Management: ${individualData.management_level || 'Individual contributor'}
- Functions: ${individualData.job_functions?.join(', ') || 'General'}

CRITICAL: Tailor content complexity and examples to their seniority and department.`
    : '';

  onProgress({ stage: "Designing Course Blueprint", detail: "Creating personalized learning path...", percent: 25 });

  const blueprintPrompt = `You are a world-class instructional designer creating an AI implementation course for:

${JSON.stringify(userProfile, null, 2)}${industryContext}${techStackContext}${roleContext}

Create a PRACTICAL, ROLE-SPECIFIC course that:
- Uses their company's ACTUAL tech stack
- Shows REAL implementations in their industry
- Matches their seniority level and responsibilities
- 3-4 modules, each with 3-4 lessons
- Each lesson: 15-25 minutes

Return complete course structure with modules and lessons.`;

  const courseBlueprint = await InvokeLLM({
    prompt: blueprintPrompt,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        category: { type: "string" },
        duration_hours: { type: "number" },
        prerequisites: { type: "array", items: { type: "string" } },
        learning_outcomes: { type: "array", items: { type: "string" } },
        modules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              order_index: { type: "number" },
              description: { type: "string" },
              duration_hours: { type: "number" },
              learning_objectives: { type: "array", items: { type: "string" } },
              lessons: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    order_index: { type: "number" },
                    learning_objectives: { type: "array", items: { type: "string" } },
                    key_concepts: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  onProgress({ stage: "Writing Lessons", detail: `Creating content for "${courseBlueprint.title}"...`, percent: 40 });

  const lessons = [];
  const totalLessons = courseBlueprint.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  let lessonsWritten = 0;

  const lessonTasks = [];
  
  for (const module of courseBlueprint.modules) {
    for (const lesson of module.lessons || []) {
      const lessonPrompt = `Create a practical lesson for implementing AI in their role.

Context:
- User: ${userProfile.job_title} (${userProfile.experience_level})
- Course: ${courseBlueprint.title}
- Module: ${module.title}
- Lesson: ${lesson.title}${industryContext}${techStackContext}${roleContext}

Requirements:
- 500-800 words of markdown content
- SPECIFIC examples using their tools/industry
- If tech stack provided, include code snippets with those tools
- Interactive elements: discussion topics, activities, quiz
- Duration: 15-25 minutes

Return JSON with: title, content (markdown), duration_minutes, lesson_type, interactive_config.`;

      lessonTasks.push(async () => {
        try {
          const lessonContent = await InvokeLLM({
            prompt: lessonPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                duration_minutes: { type: "number" },
                lesson_type: { type: "string", enum: ["interactive", "text"] },
                interactive_config: { type: "object" }
              }
            }
          });

          lessons.push({
            ...lessonContent,
            module_order_index: module.order_index,
            lesson_order_index: lesson.order_index
          });

          lessonsWritten++;
          const progressPercent = Math.min(89, 40 + Math.floor((lessonsWritten / totalLessons) * 49));
          onProgress({
            stage: `Writing Lessons (${lessonsWritten}/${totalLessons})`,
            detail: `Completed: ${lesson.title}`,
            percent: progressPercent
          });
        } catch (error) {
          console.error(`Failed to generate lesson ${lesson.title}:`, error);
          // Fallback
          lessons.push({
            title: lesson.title,
            content: `# ${lesson.title}\n\nContent generation failed. Please try regenerating this lesson later.`,
            duration_minutes: 15,
            lesson_type: "text",
            interactive_config: {},
            module_order_index: module.order_index,
            lesson_order_index: lesson.order_index
          });
          lessonsWritten++;
        }
      });
    }
  }

  const BATCH_SIZE = 3;
  for (let i = 0; i < lessonTasks.length; i += BATCH_SIZE) {
    const batch = lessonTasks.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(task => task()));
  }

  onProgress({ stage: "Writing Lessons", detail: "All lessons completed!", percent: 90 });

  await new Promise(resolve => setTimeout(resolve, 500));

  onProgress({ stage: "Finalizing Course", detail: "Saving to your account...", percent: 95 });

  return { 
    blueprint: courseBlueprint, 
    lessons,
    totalModules: courseBlueprint.modules.length,
    totalLessons: lessons.length
  };
};

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [user, setUser] = useState(null);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useLocalStorage("courses_filter_category", "all");
  const [selectedDifficulty, setSelectedDifficulty] = useLocalStorage("courses_filter_difficulty", "all");
  const [sortBy, setSortBy] = useLocalStorage("courses_sort_by", "title");
  const [viewMode, setViewMode] = useLocalStorage("courses_view_mode", "grid");
  const [loading, setLoading] = useState(true);
  const [courseTab, setCourseTab] = useState("my_learning");
  const [builds, setBuilds] = useState([]);
  const [buildsLoading, setBuildsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const [generationDetail, setGenerationDetail] = useState("");
  
  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadCourses = useCallback(async () => {
    try {
      const [coursesData, progressData, userData] = await Promise.all([
        Course.list('-created_date', 100),
        UserProgress.list(),
        base44.auth.me()
      ]);
      
      console.log('Loaded courses:', coursesData.length);
      console.log('Template courses:', coursesData.filter(c => c.is_template === true).length);
      console.log('Published template courses:', coursesData.filter(c => c.is_template === true && c.is_published === true).length);
      
      setUser(userData);
      setUserProgress(progressData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading courses:", error);
      // Set empty arrays on error to prevent crashes
      setCourses([]);
      setUserProgress([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for URL parameter to switch tabs
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && (tabParam === 'library' || tabParam === 'my_learning')) {
      setCourseTab(tabParam);
    }
    loadCourses();
  }, [loadCourses]);

  const loadBuilds = useCallback(async () => {
    try {
      const data = await CourseBuild.list();
      const active = data.filter(b => b.status === "queued" || b.status === "building");
      setBuilds(active);
    } catch (e) {
      console.error("Error loading course builds:", e);
      setBuilds([]);
    } finally {
      setBuildsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuilds();
    const id = setInterval(loadBuilds, 8000);
    return () => clearInterval(id);
  }, [loadBuilds]);

  const getFilteredCourses = useCallback((tab) => {
    let filtered = [...courses];

    if (tab === "library") {
      filtered = filtered.filter(c => c.is_template === true && c.is_published === true);
    } else {
      // My Learning: Personalized courses (created by user or in their list) or Started courses
      const personalizedIds = new Set([
        ...(user?.primary_courses || []),
        ...(user?.background_courses || []),
        ...userProgress.map(p => p.course_id)
      ]);
      
      filtered = filtered.filter(c => personalizedIds.has(c.id) && c.is_template !== true);
    }

    // Use debounced search term for filtering
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title?.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        course.category?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return (a.title || '').localeCompare(b.title || '');
        case "difficulty":
          const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
        case "duration":
          return (a.duration_hours || 0) - (b.duration_hours || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [courses, debouncedSearchTerm, selectedCategory, selectedDifficulty, sortBy, user, userProgress]);

  useEffect(() => {
    setFilteredCourses(getFilteredCourses(courseTab));
  }, [getFilteredCourses, courseTab]);

  const handleGenerateCourse = async () => {
    if (!user?.company_data || !user?.enriched_profile) {
      alert("Please complete onboarding first to generate personalized courses.");
      window.location.href = createPageUrl("Onboarding");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage("Starting...");

    try {
      const enrichedData = {
        userProfile: {
          job_title: user.job_title,
          experience_level: user.experience_level,
          industry: user.industry,
          goals: user.goals,
          interests: user.interests || [],
          time_commitment: user.time_commitment,
          preferred_difficulty: user.preferred_difficulty,
          background: user.background
        },
        companyData: user.company_data,
        individualData: user.enriched_profile
      };

      const { blueprint, lessons, totalModules, totalLessons } = await buildPersonalizedCourse(enrichedData, ({ stage, detail, percent }) => {
        setGenerationStage(stage);
        setGenerationDetail(detail);
        setGenerationProgress(percent);
      });

      console.log(`Course generated: ${totalModules} modules, ${totalLessons} lessons`);

      const course = await Course.create({
        title: blueprint.title || "Personalized Course",
        description: blueprint.description || "AI-generated personalized course",
        difficulty: blueprint.difficulty || "intermediate",
        category: blueprint.category || 'applications',
        duration_hours: blueprint.duration_hours || 10,
        prerequisites: blueprint.prerequisites || [],
        learning_outcomes: blueprint.learning_outcomes || [],
        is_published: true,
        is_template: false,
        instructor: "AI Personalized",
        cover_image: `https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop`
      });

      const moduleMap = new Map();
      for (const modData of blueprint.modules) {
        try {
          const module = await Module.create({
            course_id: course.id,
            title: modData.title || "Module",
            description: modData.description || "",
            order_index: modData.order_index,
            duration_hours: modData.duration_hours || 1,
            learning_objectives: modData.learning_objectives || []
          });
          moduleMap.set(modData.order_index, module.id);
          console.log(`Created module: ${module.title} (ID: ${module.id})`);
        } catch (err) {
          console.error("Failed to create module:", err);
          throw new Error(`Failed to create module: ${err.message}`);
        }
      }

      console.log(`Total modules created: ${moduleMap.size}`);

      let lessonsCreated = 0;
      for (const lessonData of lessons) {
        const moduleId = moduleMap.get(lessonData.module_order_index);
        if (moduleId) {
          try {
            const lesson = await Lesson.create({
              module_id: moduleId,
              title: lessonData.title || "Lesson",
              content: lessonData.content || "",
              order_index: lessonData.lesson_order_index,
              duration_minutes: lessonData.duration_minutes || 15,
              lesson_type: lessonData.lesson_type || "text",
              interactive_config: lessonData.interactive_config || {}
            });
            lessonsCreated++;
            console.log(`Created lesson ${lessonsCreated}/${lessons.length}: ${lesson.title}`);
          } catch (err) {
            console.error("Failed to create lesson:", err);
            throw new Error(`Failed to create lesson: ${err.message}`);
          }
        } else {
          console.error(`No module found for lesson with module_order_index ${lessonData.module_order_index}`);
        }
      }

      console.log(`Total lessons created: ${lessonsCreated}`);

      await UserProgress.create({
        user_id: user.id,
        course_id: course.id,
        status: 'not_started',
        completion_percentage: 0
      });

      await base44.auth.updateMe({
        primary_courses: [...(user.primary_courses || []), course.id],
        courses_created: (user.courses_created || 0) + 1
      });

      setGenerationStage("Done!");
      setGenerationProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        loadCourses();
        window.location.href = createPageUrl("CourseDetail?id=" + course.id);
      }, 1000);

    } catch (error) {
      console.error("Error generating course:", error);
      alert("Failed to generate course. Please try again.");
      setIsGenerating(false);
    }
  };



  // Stats for My Learning
  const completedCourses = userProgress.filter(p => p.status === 'completed');
  const inProgressCourses = userProgress.filter(p => p.status === 'in_progress');
  const totalTimeSpent = userProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
  const averageProgress = userProgress.length > 0
    ? userProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / userProgress.length
    : 0;

  const stats = [
    {
      title: "Completed Courses",
      value: completedCourses.length,
      icon: CheckCircle,
      color: "cyan",
      subtitle: "Learning milestones"
    },
    {
      title: "In Progress",
      value: inProgressCourses.length,
      icon: PlayCircle,
      color: "cyan",
      subtitle: "Currently learning"
    },
    {
      title: "Time Invested",
      value: `${Math.round(totalTimeSpent / 60)}h`,
      icon: Clock,
      color: "cyan",
      subtitle: "Total learning time"
    },
    {
      title: "Average Progress",
      value: `${Math.round(averageProgress)}%`,
      icon: TrendingUp,
      color: "cyan",
      subtitle: "Overall completion"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <LoadingSkeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {Array(4).fill(0).map((_, i) => (
                <LoadingSkeleton key={i} className="h-32" />
             ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonList count={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative p-4 sm:p-6">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-yellow-500/5 to-amber-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-amber-500/5 to-yellow-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
        <Tabs value={courseTab} onValueChange={setCourseTab} className="w-full">
        {/* Header */}
        <div className="relative overflow-hidden mb-8">
            <style>{`
              @keyframes wave {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
      
            <Card className="glass-card p-4 sm:p-5 md:p-6 border-0 relative overflow-hidden bg-black/60">
              {/* Animated Flowing Lines Background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
                <svg 
                  className="absolute w-[200%] h-full top-0 left-0"
                  style={{ animation: 'wave 20s linear infinite' }}
                  preserveAspectRatio="none" 
                  viewBox="0 0 1440 320"
                >
                   <path fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" d="M0,160 C320,300,420,300,740,160 C1060,20,1120,20,1440,160 V320 H0 Z" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,160 C320,280,420,280,740,160 C1060,40,1120,40,1440,160" />
                   <path fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="2" d="M0,100 C300,100,500,200,800,150 C1100,100,1300,150,1440,200" />
                   <path fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" d="M0,200 C400,250,600,50,900,150 C1200,250,1300,50,1440,150" />
                   <path fill="none" stroke="rgba(192,132,252,0.12)" strokeWidth="1" d="M0,120 C250,180,450,80,700,140 C950,200,1200,100,1440,160" />
                   <path fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" d="M0,180 C350,220,550,120,850,170 C1150,220,1350,130,1440,180" />
                   <path fill="none" stroke="rgba(192,132,252,0.15)" strokeWidth="2" d="M0,80 C280,140,480,140,720,90 C960,40,1180,80,1440,120" />
                   <path fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" d="M0,240 C320,260,520,200,800,230 C1080,260,1280,210,1440,240" />
                   <path fill="none" stroke="rgba(192,132,252,0.14)" strokeWidth="1.5" d="M0,140 C300,190,500,110,750,150 C1000,190,1250,120,1440,170" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,220 C380,270,580,180,880,240 C1180,300,1320,200,1440,250" />
                   <path fill="none" stroke="rgba(192,132,252,0.1)" strokeWidth="1" d="M0,60 C200,110,400,40,650,80 C900,120,1150,70,1440,100" />
                   <path fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" d="M0,260 C280,290,480,240,720,270 C960,300,1180,260,1440,280" />
                   <path fill="none" stroke="rgba(192,132,252,0.11)" strokeWidth="1" d="M0,190 C330,240,530,160,820,200 C1110,240,1310,180,1440,210" />
                   <path fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" d="M0,50 C250,90,450,30,700,70 C950,110,1200,60,1440,90" />
                   <path fill="none" stroke="rgba(192,132,252,0.13)" strokeWidth="1.5" d="M0,270 C300,310,500,250,800,290 C1100,330,1300,280,1440,300" />
                   <path fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" d="M0,130 C350,170,550,100,850,140 C1150,180,1350,120,1440,150" />
                   <path fill="none" stroke="rgba(192,132,252,0.08)" strokeWidth="0.5" d="M0,40 C280,70,480,20,720,50 C960,80,1180,40,1440,60" />
                   <path fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" d="M0,280 C320,310,520,270,800,295 C1080,320,1280,285,1440,305" />
                   <path fill="none" stroke="rgba(192,132,252,0.16)" strokeWidth="2" d="M0,110 C260,160,460,90,710,130 C960,170,1210,110,1440,140" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,250 C340,285,540,220,840,260 C1140,300,1340,240,1440,270" />
                </svg>
                {/* Duplicate for seamless loop */}
                 <svg 
                  className="absolute w-[200%] h-full top-0 left-[200%]"
                  style={{ animation: 'wave 20s linear infinite' }}
                  preserveAspectRatio="none" 
                  viewBox="0 0 1440 320"
                >
                   <path fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" d="M0,160 C320,300,420,300,740,160 C1060,20,1120,20,1440,160 V320 H0 Z" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,160 C320,280,420,280,740,160 C1060,40,1120,40,1440,160" />
                   <path fill="none" stroke="rgba(192,132,252,0.2)" strokeWidth="2" d="M0,100 C300,100,500,200,800,150 C1100,100,1300,150,1440,200" />
                   <path fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" d="M0,200 C400,250,600,50,900,150 C1200,250,1300,50,1440,150" />
                   <path fill="none" stroke="rgba(192,132,252,0.12)" strokeWidth="1" d="M0,120 C250,180,450,80,700,140 C950,200,1200,100,1440,160" />
                   <path fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" d="M0,180 C350,220,550,120,850,170 C1150,220,1350,130,1440,180" />
                   <path fill="none" stroke="rgba(192,132,252,0.15)" strokeWidth="2" d="M0,80 C280,140,480,140,720,90 C960,40,1180,80,1440,120" />
                   <path fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" d="M0,240 C320,260,520,200,800,230 C1080,260,1280,210,1440,240" />
                   <path fill="none" stroke="rgba(192,132,252,0.14)" strokeWidth="1.5" d="M0,140 C300,190,500,110,750,150 C1000,190,1250,120,1440,170" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,220 C380,270,580,180,880,240 C1180,300,1320,200,1440,250" />
                   <path fill="none" stroke="rgba(192,132,252,0.1)" strokeWidth="1" d="M0,60 C200,110,400,40,650,80 C900,120,1150,70,1440,100" />
                   <path fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" d="M0,260 C280,290,480,240,720,270 C960,300,1180,260,1440,280" />
                   <path fill="none" stroke="rgba(192,132,252,0.11)" strokeWidth="1" d="M0,190 C330,240,530,160,820,200 C1110,240,1310,180,1440,210" />
                   <path fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" d="M0,50 C250,90,450,30,700,70 C950,110,1200,60,1440,90" />
                   <path fill="none" stroke="rgba(192,132,252,0.13)" strokeWidth="1.5" d="M0,270 C300,310,500,250,800,290 C1100,330,1300,280,1440,300" />
                   <path fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" d="M0,130 C350,170,550,100,850,140 C1150,180,1350,120,1440,150" />
                   <path fill="none" stroke="rgba(192,132,252,0.08)" strokeWidth="0.5" d="M0,40 C280,70,480,20,720,50 C960,80,1180,40,1440,60" />
                   <path fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" d="M0,280 C320,310,520,270,800,295 C1080,320,1280,285,1440,305" />
                   <path fill="none" stroke="rgba(192,132,252,0.16)" strokeWidth="2" d="M0,110 C260,160,460,90,710,130 C960,170,1210,110,1440,140" />
                   <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,250 C340,285,540,220,840,260 C1140,300,1340,240,1440,270" />
                </svg>

                {/* Glowing Dots/Stars - Much more dense */}
                <div className="absolute top-[15%] left-[25%] w-1 h-1 bg-purple-400 rounded-full blur-[1px] animate-pulse"></div>
                <div className="absolute top-[75%] right-[22%] w-1 h-1 bg-white rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-[50%] left-[65%] w-0.5 h-0.5 bg-purple-200 rounded-full"></div>
                <div className="absolute bottom-[28%] left-[18%] w-1 h-1 bg-purple-500/50 rounded-full blur-[2px]"></div>
                <div className="absolute top-[35%] right-[35%] w-0.5 h-0.5 bg-white/60 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-[35%] right-[48%] w-1 h-1 bg-purple-300/40 rounded-full blur-[2px]"></div>
                <div className="absolute top-[68%] left-[52%] w-0.5 h-0.5 bg-purple-400/50 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute top-[20%] left-[45%] w-0.5 h-0.5 bg-white/50 rounded-full blur-[1px]"></div>
                <div className="absolute top-[82%] left-[70%] w-1 h-1 bg-purple-500/60 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-[42%] right-[15%] w-0.5 h-0.5 bg-white/40 rounded-full"></div>
                <div className="absolute bottom-[12%] left-[38%] w-1 h-1 bg-purple-400/50 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '2.5s' }}></div>
                <div className="absolute top-[55%] right-[60%] w-0.5 h-0.5 bg-purple-300 rounded-full blur-[1px]"></div>
                <div className="absolute top-[10%] right-[42%] w-1 h-1 bg-white/60 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: '1.2s' }}></div>
                <div className="absolute bottom-[45%] left-[55%] w-0.5 h-0.5 bg-purple-200/50 rounded-full"></div>
                <div className="absolute top-[88%] right-[28%] w-1 h-1 bg-purple-500 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '0.8s' }}></div>
                <div className="absolute top-[25%] left-[80%] w-0.5 h-0.5 bg-white/50 rounded-full blur-[1px]"></div>
                <div className="absolute bottom-[58%] right-[70%] w-1 h-1 bg-purple-400/60 rounded-full blur-[2px]"></div>
                <div className="absolute top-[48%] left-[12%] w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '1.8s' }}></div>
                <div className="absolute bottom-[20%] right-[55%] w-1 h-1 bg-purple-300/50 rounded-full blur-[1px]"></div>
                <div className="absolute top-[62%] right-[8%] w-0.5 h-0.5 bg-purple-500/40 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '2.2s' }}></div>
              </div>
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-bold metallic-text">
                      Learning Center
                    </h1>
                    <p className="text-base text-gray-400">
                      Manage your courses and track your progress
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <TabsList className="bg-transparent p-0 gap-2 sm:gap-3 inline-flex h-auto flex-wrap">
                      <TabsTrigger 
                        value="my_learning" 
                        className="rounded-lg border border-transparent data-[state=active]:border-yellow-500/30 data-[state=active]:bg-gradient-to-b data-[state=active]:from-yellow-500/10 data-[state=active]:to-yellow-500/5 data-[state=active]:text-yellow-400 data-[state=active]:shadow-[0_0_15px_rgba(234,179,8,0.05)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-400 hover:text-white transition-all hover:bg-white/5"
                      >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">My Learning</span>
                        <span className="sm:hidden">My</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="library" 
                        className="rounded-lg border border-transparent data-[state=active]:border-yellow-500/30 data-[state=active]:bg-gradient-to-b data-[state=active]:from-yellow-500/10 data-[state=active]:to-yellow-500/5 data-[state=active]:text-yellow-400 data-[state=active]:shadow-[0_0_15px_rgba(234,179,8,0.05)] px-4 sm:px-6 py-2 sm:py-2.5 text-sm text-gray-400 hover:text-white transition-all hover:bg-white/5"
                      >
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Course Library</span>
                        <span className="sm:hidden">Library</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>
      
                <div className="relative hidden md:block">
                  <div className="w-24 h-24 relative flex items-center justify-center">
                    {/* Orbit Rings */}
                    <div className="absolute w-full h-full rounded-full border-t-[4px] border-l-[2px] border-yellow-400/50 blur-[2px] animate-spin" style={{ animationDuration: '4s' }} />
                    <div className="absolute w-[80%] h-[80%] rounded-full border-b-[4px] border-r-[2px] border-amber-600/50 blur-[3px] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
                    <div className="absolute w-[60%] h-[60%] rounded-full border-t-[3px] border-yellow-200/60 blur-[1px] animate-spin" style={{ animationDuration: '2s' }} />

                    {/* Core */}
                    <div className="absolute w-[30%] h-[30%] bg-yellow-500/30 blur-xl rounded-full" />
                    <div className="absolute w-[20%] h-[20%] bg-amber-200/80 blur-md rounded-full" />
                  </div>
                </div>
              </div>
            </Card>
        </div>

        {/* Navigation Tabs Content */}
        <div className="w-full">

          {/* Stats Section (only on My Learning) */}
          {courseTab === "my_learning" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in slide-in-from-bottom-4 duration-500">
              {stats.map((stat, index) => (
                <Card key={index} className="glass-card border-0 p-4 bg-gradient-to-br from-yellow-900/10 to-black/50 border-yellow-500/20 hover:border-yellow-500/40 transition-all flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 shrink-0">
                     <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white leading-tight">{stat.value}</div>
                    <h3 className="text-xs font-medium text-gray-400">{stat.title}</h3>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Building Courses (Active Builds) */}
          <BuildProgress builds={builds} />

          {/* Search & Filters */}
          <CourseFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
          />

          {/* Course Grid / Empty States */}
          <TabsContent value={courseTab} className="mt-0">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-semibold text-white">
                 {courseTab === 'library' ? 'Course Library' : 'My Courses'}
               </h2>
               <div className="flex items-center gap-2">
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "text-yellow-400 bg-yellow-950/30" : "text-gray-400"}
                   >
                      <Grid className="w-4 h-4" />
                   </Button>
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "text-yellow-400 bg-yellow-950/30" : "text-gray-400"}
                   >
                    <List className="w-4 h-4" />
                 </Button>
               </div>
             </div>

             {filteredCourses.length === 0 ? (
               isGenerating ? (
                 <Card className="glass-card border-0 p-16 text-center">
                   <div className="max-w-md mx-auto space-y-6">
                     <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto" />
                     <div className="space-y-2">
                       <h3 className="text-xl font-semibold text-white">{generationStage}</h3>
                       <ProgressBar value={generationProgress} className="h-2 bg-gray-800" />
                       <p className="text-sm text-gray-400">{generationDetail}</p>
                     </div>
                   </div>
                 </Card>
               ) : (
                 <EmptyState
                   title={courseTab === 'my_learning' ? 'Start Your Journey' : 'No Courses Found'}
                   description={
                     courseTab === 'my_learning'
                       ? `Generate a personalized course tailored to your role as ${user?.job_title || 'a professional'}.`
                       : 'Try adjusting your search filters to find what you are looking for.'
                   }
                   actionLabel={courseTab === 'my_learning' ? 'Generate My Course' : null}
                   onAction={courseTab === 'my_learning' ? handleGenerateCourse : null}
                 />
               )
             ) : (
               <div className={`grid gap-6 ${
                 viewMode === "grid" 
                   ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                   : "grid-cols-1"
               }`}>
                 {filteredCourses.map((course) => {
                   const progress = userProgress.find(p => p.course_id === course.id);
                   return (
                     <CourseCard
                       key={course.id}
                       course={course}
                       progress={progress}
                       viewMode={viewMode}
                     />
                   );
                 })}
               </div>
             )}
          </TabsContent>
        </div>
        </Tabs>
      </div>
    </div>
  );
}