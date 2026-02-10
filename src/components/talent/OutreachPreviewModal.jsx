import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  ChevronLeft,
  ChevronRight,
  Check,
  Edit2,
  Brain,
} from "lucide-react";

export default function OutreachPreviewModal({ open, onOpenChange, messages, onApprove, onEdit, campaignType }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!messages || messages.length === 0) return null;

  const currentMessage = messages[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-red-400" />
            Outreach Preview ({currentIndex + 1} of {messages.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
              {currentMessage.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{currentMessage.candidate_name}</p>
              <p className="text-sm text-zinc-400 truncate">{currentMessage.current_role || 'Role not specified'}</p>
            </div>
            <div className="flex items-center gap-2">
              {currentMessage.match_score && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {currentMessage.match_score}% Match
                </Badge>
              )}
              <Badge className={`${
                currentMessage.personalization_score >= 70 ? 'bg-red-500/20 text-red-400' :
                currentMessage.personalization_score >= 40 ? 'bg-red-500/15 text-red-400/80' :
                'bg-zinc-700/50 text-zinc-400'
              }`}>
                {currentMessage.personalization_score || 0}% Personal
              </Badge>
            </div>
          </div>

          {/* Subject Line (for email) */}
          {campaignType === 'email' && currentMessage.subject && (
            <div>
              <Label className="text-xs text-zinc-500 uppercase tracking-wider">Subject Line</Label>
              <div className="mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-white">{currentMessage.subject}</p>
              </div>
            </div>
          )}

          {/* Message Body */}
          <div>
            <Label className="text-xs text-zinc-500 uppercase tracking-wider">Message</Label>
            <div className="mt-1 p-4 rounded-lg bg-zinc-800 border border-zinc-700 max-h-[250px] overflow-y-auto">
              <p className="text-white whitespace-pre-wrap leading-relaxed">{currentMessage.content}</p>
            </div>
          </div>

          {/* Intelligence Used */}
          {currentMessage.intelligence_used?.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                AI Personalization Used
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentMessage.intelligence_used.map((item, i) => (
                  <Badge key={i} className="bg-red-500/20 text-red-400 text-xs">
                    {item.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.min(messages.length - 1, i + 1))}
                disabled={currentIndex === messages.length - 1}
                className="border-zinc-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit && onEdit(currentMessage, currentIndex)}
                className="border-zinc-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => onApprove && onApprove(messages)}
                className="bg-red-500 hover:bg-red-600"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve All ({messages.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
