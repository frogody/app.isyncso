import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Send, Sparkles, ExternalLink } from "lucide-react";
import { generateOutreachMessage } from "@/api/functions";
import { Campaign } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CampaignOutreachModal({ open, onClose, matchData, campaign, user }) {
  const [message, setMessage] = useState(matchData.outreach_message || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // If no message exists, generate one
    if (open && !matchData.outreach_message) {
      handleGenerate();
    }
  }, [open]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateOutreachMessage({
        candidate: matchData.candidate,
        campaign_id: campaign.id
      });
      setMessage(result.message);
      
      // Save to campaign
      await saveMessageToCampaign(result.message);
    } catch (error) {
      console.error('Error generating message:', error);
      alert(user?.language === 'nl' 
        ? 'Fout bij genereren bericht'
        : 'Error generating message');
    }
    setIsGenerating(false);
  };

  const saveMessageToCampaign = async (newMessage) => {
    try {
      const updatedCandidates = (campaign.matched_candidates || []).map(c => {
        if (c.candidate_id === matchData.candidate_id) {
          return { ...c, outreach_message: newMessage };
        }
        return c;
      });

      await Campaign.update(campaign.id, {
        matched_candidates: updatedCandidates
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveMessageToCampaign(message);
    setIsSaving(false);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    alert(user?.language === 'nl' ? 'Bericht gekopieerd!' : 'Message copied!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] border-0 flex flex-col"
        style={{
          background: 'rgba(12,16,20,0.98)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold mb-2" style={{color: 'var(--txt)'}}>
                {user?.language === 'nl' ? 'Outreach Bericht' : 'Outreach Message'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm" style={{color: 'var(--muted)'}}>
                  {matchData.candidate_name}
                </p>
                <Badge variant="outline" className="text-xs">
                  {matchData.candidate_job_title}
                </Badge>
              </div>
            </div>
            <Link 
              to={`${createPageUrl('CandidateProfile')}?id=${matchData.candidate_id}`}
              target="_blank"
            >
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Bericht genereren...' : 'Generating message...'}
              </p>
            </div>
          ) : (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="bg-transparent"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                placeholder={user?.language === 'nl' 
                  ? 'Je outreach bericht...'
                  : 'Your outreach message...'}
              />

              <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {user?.language === 'nl' ? 'Opnieuw Genereren' : 'Regenerate'}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    disabled={!message}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {user?.language === 'nl' ? 'Kopiëren' : 'Copy'}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !message}
                    className="btn-primary"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {user?.language === 'nl' ? 'Opslaan' : 'Save'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}