import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "foundations", label: "Foundations" },
  { value: "mindset", label: "Mindset & Adaptation" },
  { value: "communication", label: "Communication" },
  { value: "research", label: "Research & Analysis" },
  { value: "productivity", label: "Productivity" },
  { value: "thinking", label: "Thinking & Problem-Solving" },
  { value: "collaboration", label: "Collaboration & Quality" },
  { value: "advanced", label: "Advanced Skills" }
];

export default function CourseFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedDifficulty,
  onDifficultyChange
}) {
  return (
    <Card className="glass-card border-0 p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-700 focus:border-teal-500 text-white focus:ring-teal-500/20"
          />
        </div>
        <div className="flex gap-4">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[180px] bg-gradient-to-b from-teal-500/10 to-teal-500/5 border-teal-500/30 text-teal-400 hover:border-teal-500/50 transition-all">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-teal-500/20">
              {categories.map(cat => (
                <SelectItem 
                  key={cat.value} 
                  value={cat.value} 
                  className="text-gray-300 focus:bg-teal-500/10 focus:text-teal-400 data-[state=checked]:text-teal-400 cursor-pointer"
                >
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDifficulty} onValueChange={onDifficultyChange}>
            <SelectTrigger className="w-[140px] bg-gradient-to-b from-teal-500/10 to-teal-500/5 border-teal-500/30 text-teal-400 hover:border-teal-500/50 transition-all">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-teal-500/20">
              <SelectItem value="all" className="text-gray-300 focus:bg-teal-500/10 focus:text-teal-400 data-[state=checked]:text-teal-400 cursor-pointer">All Levels</SelectItem>
              <SelectItem value="beginner" className="text-gray-300 focus:bg-teal-500/10 focus:text-teal-400 data-[state=checked]:text-teal-400 cursor-pointer">Beginner</SelectItem>
              <SelectItem value="intermediate" className="text-gray-300 focus:bg-teal-500/10 focus:text-teal-400 data-[state=checked]:text-teal-400 cursor-pointer">Intermediate</SelectItem>
              <SelectItem value="advanced" className="text-gray-300 focus:bg-teal-500/10 focus:text-teal-400 data-[state=checked]:text-teal-400 cursor-pointer">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}