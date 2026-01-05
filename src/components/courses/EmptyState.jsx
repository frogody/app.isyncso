import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";
import CoursesOrbitIcon from "../icons/CoursesOrbitIcon";

export default function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  actionDisabled = false,
  icon: Icon = Sparkles
}) {
  return (
    <Card className="glass-card border-0 p-16 text-center">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="mx-auto flex items-center justify-center">
          <CoursesOrbitIcon className="w-20 h-20" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction}
            disabled={actionDisabled}
            className="bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 text-yellow-400 hover:border-yellow-500/50 hover:text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all text-lg px-8 py-6"
          >
            <Zap className="w-5 h-5 mr-2 fill-current" />
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}