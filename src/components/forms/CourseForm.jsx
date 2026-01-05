import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CourseForm({ initialData, onSubmit, isSubmitting = false }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: initialData || {
      topic: "",
      difficulty: "intermediate",
      category: "applications",
      duration: "1",
      audience: "",
      objectives: "",
      style: "practical"
    }
  });

  const difficulty = watch("difficulty");
  const category = watch("category");
  const duration = watch("duration");
  const style = watch("style");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Course Topic *</label>
          <Input
            {...register("topic", { required: "Topic is required" })}
            placeholder="e.g., Machine Learning for Beginners"
            className="bg-gray-800/50 border-gray-700 text-white"
          />
          {errors.topic && (
            <p className="text-xs text-red-400">{errors.topic.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Difficulty Level</label>
          <Select value={difficulty} onValueChange={(value) => setValue("difficulty", value)}>
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
          <label className="text-sm font-medium text-gray-300">Category</label>
          <Select value={category} onValueChange={(value) => setValue("category", value)}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="fundamentals" className="text-white">AI Fundamentals</SelectItem>
              <SelectItem value="machine_learning" className="text-white">Machine Learning</SelectItem>
              <SelectItem value="deep_learning" className="text-white">Deep Learning</SelectItem>
              <SelectItem value="nlp" className="text-white">NLP</SelectItem>
              <SelectItem value="computer_vision" className="text-white">Computer Vision</SelectItem>
              <SelectItem value="ethics" className="text-white">AI Ethics</SelectItem>
              <SelectItem value="applications" className="text-white">Applications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Duration</label>
          <Select value={duration} onValueChange={(value) => setValue("duration", value)}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
              <SelectItem value="0.25" className="text-white">15 minutes</SelectItem>
              <SelectItem value="0.5" className="text-white">30 minutes</SelectItem>
              <SelectItem value="1" className="text-white">1 hour</SelectItem>
              <SelectItem value="1.5" className="text-white">1.5 hours</SelectItem>
              <SelectItem value="2" className="text-white">2 hours</SelectItem>
              <SelectItem value="3" className="text-white">3 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Teaching Style</label>
          <Select value={style} onValueChange={(value) => setValue("style", value)}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="theoretical" className="text-white">Theoretical Focus</SelectItem>
              <SelectItem value="practical" className="text-white">Hands-on Practical</SelectItem>
              <SelectItem value="mixed" className="text-white">Theory + Practice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Target Audience</label>
        <Input
          {...register("audience")}
          placeholder="e.g., Software developers, data scientists"
          className="bg-gray-800/50 border-gray-700 text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Learning Objectives</label>
        <Textarea
          {...register("objectives")}
          placeholder="What should students learn from this course?"
          className="bg-gray-800/50 border-gray-700 text-white h-20"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full emerald-gradient emerald-gradient-hover"
      >
        {isSubmitting ? "Generating..." : "Generate Course"}
      </Button>
    </form>
  );
}