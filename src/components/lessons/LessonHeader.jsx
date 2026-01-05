import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Menu, Brain, X, MessageSquare,
  Eye, EyeOff, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function LessonHeader({ 
  course,
  currentLesson,
  showChat,
  onToggleChat,
  visionEnabled,
  conversation,
  MobileSidebar
}) {
  return (
    <header className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-black/80 backdrop-blur-sm sticky top-0 z-20">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-black border-zinc-800">
            {MobileSidebar}
          </SheetContent>
        </Sheet>

        {/* Back Button (Desktop) */}
        <Link 
          to={createPageUrl(`CourseDetail?id=${course?.id}`)} 
          className="hidden lg:flex items-center text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Lesson Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-medium truncate text-sm lg:text-base">
            {currentLesson?.title}
          </h1>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Vision Status */}
        {conversation && visionEnabled && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20"
          >
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">Vision</span>
          </motion.div>
        )}

        {/* AI Tutor Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleChat}
          className={cn(
            "relative",
            showChat 
              ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20" 
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          )}
        >
          <Brain className="w-5 h-5" />
          <span className="hidden sm:inline ml-2 text-sm">AI Tutor</span>
          {showChat && (
            <motion.div 
              layoutId="chatIndicator"
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full"
            />
          )}
        </Button>
      </div>
    </header>
  );
}