
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Copy, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateOutreachMessage } from "@/api/functions";
import { createOutreachTask } from "@/api/functions";
import { User } from "@/api/entities";
import SyncAvatar from "../ui/SyncAvatar";
import { haptics } from "@/components/utils/haptics";

export default function OutreachPrepWindow({ candidate, isOpen, onClose }) {
  const [step, setStep] = useState("initial"); // initial, generating, review, approved
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUser();
    }
  }, [isOpen]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleGenerate = async () => {
    haptics.medium();
    setIsGenerating(true);
    setStep("generating");
    
    try {
      const response = await generateOutreachMessage({ candidate });
      
      if (response.data?.message) {
        setMessage(response.data.message);
        setStep("review");
        haptics.success();
      } else {
        alert("Error generating message");
        setStep("initial");
        haptics.error();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error generating message: " + error.message);
      setStep("initial");
      haptics.error();
    }
    
    setIsGenerating(false);
  };

  const handleApprove = async () => {
    haptics.medium();
    setIsApproving(true);
    
    try {
      const response = await createOutreachTask({ candidate_id: candidate.id });
      
      if (response.data?.success && response.data?.task) {
        const task = response.data.task;
        
        // Import OutreachTask entity and update with message + approval
        const { OutreachTask } = await import("@/api/entities");
        await OutreachTask.update(task.id, {
          message_content: message,
          status: "approved_ready",
          generated_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          scheduled_for: new Date().toISOString() // Immediate execution
        });
        
        setStep("approved");
        haptics.success();
        setTimeout(() => {
          onClose();
          setStep("initial");
          setMessage("");
        }, 2000);
      } else {
        alert("Error creating task");
        haptics.error();
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert("Error: " + error.message);
      haptics.error();
    }
    
    setIsApproving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    alert("Message copied to clipboard!");
    haptics.light();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <style jsx>{`
            .glass-card {
              background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
              border: 1px solid rgba(255,255,255,.06);
              box-shadow: 0 4px 12px rgba(0,0,0,.15);
              backdrop-filter: blur(8px);
              border-radius: 16px;
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--txt)' }}>
                Outreach Preparation
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {candidate.first_name} {candidate.last_name} - {candidate.job_title}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === "initial" && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <Sparkles className="w-12 h-12" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  Generate Personalized Message
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  AI will generate a tailored outreach message based on this candidate's profile and intelligence.
                </p>
                <Button onClick={handleGenerate} className="btn-primary">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Message
                </Button>
              </div>
            )}

            {step === "generating" && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <SyncAvatar size={48} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  Generating Message...
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  AI is crafting a personalized outreach message
                </p>
              </div>
            )}

            {step === "review" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted)' }}>
                    Generated Message (editable)
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={12}
                    className="bg-transparent border font-mono text-sm"
                    style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={handleCopy} className="btn-outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" onClick={handleGenerate} disabled={isGenerating} className="btn-outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button onClick={handleApprove} disabled={isApproving} className="btn-primary">
                    {isApproving ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Approve & Queue for Agent
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === "approved" && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  Task Created!
                </h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Outreach task has been queued for the AI agent to execute.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
