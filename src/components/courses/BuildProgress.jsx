import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export default function BuildProgress({ builds = [] }) {
  if (builds.length === 0) return null;

  return (
    <Card className="glass-card border-0 p-6 border-l-4 border-l-teal-500 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
        <h2 className="text-xl font-semibold text-white">Generating Your Courses</h2>
      </div>
      <div className="space-y-4">
        {builds.map((build) => (
          <div key={build.id} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-medium truncate flex-1">
                {build.requested_topic || "New AI Course"}
              </div>
              <Badge variant="outline" className="border-teal-500/50 text-teal-400 ml-2">
                {build.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={build.progress_percentage || 0} className="flex-1 h-2" />
              <span className="text-sm text-gray-400 w-12 text-right">
                {build.progress_percentage || 0}%
              </span>
            </div>
            {Array.isArray(build.logs) && build.logs.length > 0 && (
              <p className="mt-2 text-xs text-gray-500 truncate">
                {build.logs[build.logs.length - 1]}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}