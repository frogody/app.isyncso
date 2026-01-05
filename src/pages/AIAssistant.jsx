import React, { useState } from "react";
import { Course, Module, Lesson, User } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Zap,
  Clock,
  Users,
  Play,
  CheckCircle,
  ArrowRight,
  Download,
  Upload,
  FileText,
  MessageCircle,
  Bot,
  ExternalLink
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import CourseGenerator from "../components/ai/CourseGenerator";
import ContentEnhancer from "../components/ai/ContentEnhancer";
import LearningPathOptimizer from "../components/ai/LearningPathOptimizer";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState("sync");
  const [user, setUser] = useState(null);
  const [importStatus, setImportStatus] = useState("idle"); // idle, uploading, parsing, creating, done
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentCourse: "" });

  const loadUserData = React.useCallback(async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  React.useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleFileUpload = React.useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("uploading");
    
    try {
      // 1. Upload file
      console.log("Uploading file:", file.name);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log("File uploaded:", file_url);
      
      // 2. Parse PDF to get list
      setImportStatus("parsing");
      console.log("Parsing PDF...");
      const parseResponse = await base44.functions.invoke("parsePdfCourses", { file_url });
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

      // 3. Queue Creation (Sequential with delay)
      let createdCount = 0;
      for (const course of courses) {
        setImportProgress(prev => ({ ...prev, currentCourse: course.title }));
        
        try {
           console.log(`Creating course: ${course.title}`);
           const createResponse = await base44.functions.invoke("createCourseFromTemplate", { course });
           console.log(`Course created:`, createResponse);
           
           if (createResponse.data?.success) {
             createdCount++;
           } else {
             console.error(`Failed to create course: ${course.title}`, createResponse.data?.error);
           }
        } catch (err) {
           console.error(`Failed to create course: ${course.title}`, err);
           // Continue to next course even if one fails
        }

        setImportProgress(prev => ({ ...prev, current: createdCount }));
        
        // Add 2 second delay between courses to avoid rate limits and ensure sequential processing
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
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <PageHeader
          title="Course Template Builder"
          subtitle="Create high-quality template courses for the public library"
          icon={Brain}
          color="cyan"
          badge="Admin Tool"
          actions={
            <div className="flex items-center gap-3">
              {importStatus !== "idle" && importStatus !== "done" ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10">
                  <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-sm text-zinc-300">
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
                      className="border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10"
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
                <span className="text-sm text-zinc-300">
                  Importing: {importProgress.currentCourse}
                </span>
                <span className="text-sm text-cyan-400 font-medium">
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* AI Features Tabs */}
        <GlassCard className="p-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-white/10">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none flex-wrap">
                <TabsTrigger
                  value="sync"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Sync Assistant
                </TabsTrigger>
                <TabsTrigger
                  value="generator"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Course Generator
                </TabsTrigger>
                <TabsTrigger
                  value="enhancer"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Content Enhancer
                </TabsTrigger>
                <TabsTrigger
                  value="optimizer"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Learning Optimizer
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="sync" className="mt-0">
                <div className="space-y-6">
                  {/* Sync Hero Section */}
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 mb-6">
                      <Bot className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Meet Sync</h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                      Your all-in-one AI assistant that can manage your entire ISYNCSO workspace - 
                      tasks, projects, contacts, learning, campaigns, and more.
                    </p>
                  </div>

                  {/* Capabilities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { icon: CheckCircle, label: "Tasks & Projects", desc: "Create, update, and track all your work" },
                      { icon: Users, label: "CRM & Contacts", desc: "Manage prospects and sales pipeline" },
                      { icon: BookOpen, label: "Learning", desc: "Track courses, skills, and certificates" },
                      { icon: Target, label: "Growth Campaigns", desc: "Launch and manage outreach campaigns" },
                      { icon: Zap, label: "Actions & Workflows", desc: "Automate and track integrations" },
                      { icon: MessageCircle, label: "Communication", desc: "Manage inbox and messages" },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors">
                        <item.icon className="w-6 h-6 text-cyan-400 mb-3" />
                        <h3 className="text-white font-medium mb-1">{item.label}</h3>
                        <p className="text-zinc-500 text-sm">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* WhatsApp Connection */}
                  <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                          <MessageCircle className="w-8 h-8 text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Connect Sync on WhatsApp
                        </h3>
                        <p className="text-zinc-400 mb-4">
                          Take Sync with you anywhere. Manage your workspace, create tasks, check your pipeline, 
                          and more - all from your favorite messaging app.
                        </p>
                        <a 
                          href={base44.agents.getWhatsAppConnectURL('sync')} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-medium transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                          Connect to WhatsApp
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Usage Tips */}
                  <div className="p-5 rounded-xl bg-zinc-900/30 border border-white/5">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      How to use Sync
                    </h4>
                    <ul className="space-y-2 text-zinc-400 text-sm">
                      <li>• <strong className="text-zinc-300">In Inbox:</strong> Mention <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400">@sync</code> in any channel to get help</li>
                      <li>• <strong className="text-zinc-300">On WhatsApp:</strong> Just message Sync directly with your requests</li>
                      <li>• <strong className="text-zinc-300">Examples:</strong> "Create a task for tomorrow", "Show my pending deals", "What courses am I enrolled in?"</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

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
  );
}