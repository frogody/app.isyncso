import React, { useState } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Zap,
  Target,
  Upload,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import { db } from "@/api/supabaseClient";
import { motion } from "framer-motion";

import CourseGenerator from "../components/ai/CourseGenerator";
import ContentEnhancer from "../components/ai/ContentEnhancer";
import LearningPathOptimizer from "../components/ai/LearningPathOptimizer";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { LearnPageTransition } from '@/components/learn/ui';

export default function LearnAITools() {
  const { theme, toggleTheme, lt } = useTheme();
  const [activeTab, setActiveTab] = useState("generator");
  const [importStatus, setImportStatus] = useState("idle");
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentCourse: "" });

  const handleFileUpload = React.useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("uploading");

    try {
      console.log("Uploading file:", file.name);
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      console.log("File uploaded:", file_url);

      setImportStatus("parsing");
      console.log("Parsing PDF...");
      const parseResponse = await db.functions.invoke("parsePdfCourses", { file_url });
      console.log("Parse response:", parseResponse);

      if (!parseResponse.data?.success) {
        throw new Error(parseResponse.data?.error || "Failed to parse PDF");
      }

      const courses = parseResponse.data.courses;
      console.log(`Found ${courses.length} courses in PDF`);

      if (!courses || courses.length === 0) {
        throw new Error("No courses found in PDF");
      }

      setImportProgress({ current: 0, total: courses.length, currentCourse: "" });
      setImportStatus("creating");

      let createdCount = 0;
      for (const course of courses) {
        setImportProgress(prev => ({ ...prev, currentCourse: course.title }));

        try {
           console.log(`Creating course: ${course.title}`);
           const createResponse = await db.functions.invoke("createCourseFromTemplate", { course });
           console.log(`Course created:`, createResponse);

           if (createResponse.data?.success) {
             createdCount++;
           } else {
             console.error(`Failed to create course: ${course.title}`, createResponse.data?.error);
           }
        } catch (err) {
           console.error(`Failed to create course: ${course.title}`, err);
        }

        setImportProgress(prev => ({ ...prev, current: createdCount }));

        if (createdCount < courses.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setImportStatus("done");

      if (window.confirm(`Successfully imported ${createdCount} of ${courses.length} courses! They are now visible in the Library. View them now?`)) {
          window.location.href = "/courses?tab=library";
      }

    } catch (error) {
      console.error("Import error:", error);
      alert(`Import failed: ${error.message || "Unknown error"}`);
      setImportStatus("idle");
    }
  }, []);

  return (
    <LearnPageTransition>
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')}`}>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Course AI Tools"
          subtitle="AI-powered tools to create and enhance learning content"
          icon={Sparkles}
          color="teal"
          badge="Admin Tool"
          actions={
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${lt('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-zinc-700 hover:bg-zinc-800 text-zinc-400')}`}>
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {importStatus !== "idle" && importStatus !== "done" ? (
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${lt('bg-white border border-slate-200', 'bg-zinc-900/60 border border-white/10')}`}>
                  <Clock className="w-4 h-4 text-teal-400 animate-spin" />
                  <span className={`text-sm ${lt('text-slate-600', 'text-zinc-300')}`}>
                    {importStatus === "uploading" && "Uploading..."}
                    {importStatus === "parsing" && "Analyzing..."}
                    {importStatus === "creating" && `${importProgress.current}/${importProgress.total}`}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload"
                    disabled={importStatus !== "idle"}
                  />
                  <label htmlFor="pdf-upload">
                    <Button
                      variant="outline"
                      className={lt(
                        'border-slate-200 bg-white text-slate-600 hover:text-teal-600 hover:border-teal-500/50 hover:bg-teal-500/10',
                        'border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-teal-500/50 hover:bg-teal-500/10'
                      )}
                      asChild
                    >
                      <span className="cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Import PDF
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          }
        />

        {/* Import Progress Card */}
        {importStatus !== "idle" && importStatus !== "done" && importStatus === "creating" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm ${lt('text-slate-600', 'text-zinc-300')}`}>
                  Importing: {importProgress.currentCourse}
                </span>
                <span className="text-sm text-teal-400 font-medium">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
              <div className={`h-2 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-full overflow-hidden`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* AI Tools Tabs */}
        <GlassCard className="p-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className={`border-b ${lt('border-slate-200', 'border-white/10')}`}>
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none flex-wrap">
                <TabsTrigger
                  value="generator"
                  className={`relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 ${lt('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200')} transition-colors`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Course Generator
                </TabsTrigger>
                <TabsTrigger
                  value="enhancer"
                  className={`relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 ${lt('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200')} transition-colors`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Content Enhancer
                </TabsTrigger>
                <TabsTrigger
                  value="optimizer"
                  className={`relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 ${lt('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200')} transition-colors`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Learning Optimizer
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="generator" className="mt-0">
                <CourseGenerator />
              </TabsContent>

              <TabsContent value="enhancer" className="mt-0">
                <ContentEnhancer />
              </TabsContent>

              <TabsContent value="optimizer" className="mt-0">
                <LearningPathOptimizer />
              </TabsContent>
            </div>
          </Tabs>
        </GlassCard>
      </div>
    </div>
    </LearnPageTransition>
  );
}
