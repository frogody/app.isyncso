
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  Eye,
  XCircle,
  User as UserIcon,
  Building2,
  Sparkles,
  Copy,
  RefreshCw
} from "lucide-react";
import LinkedInIcon from "../ui/LinkedInIcon";
import { OutreachMessage } from "@/api/entities";
import { User } from "@/api/entities";
import { generateFollowUpMessage } from "@/api/functions";

export default function ConversationView({ messages, candidate, open, onClose, onMessageSent, autoGenerate = false }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Initialize sortedMessages to handle cases where messages might be null or undefined initially
  const sortedMessages = useMemo(() => {
    return messages ? [...messages].sort((a, b) =>
      new Date(a.sent_at) - new Date(b.sent_at)
    ) : [];
  }, [messages]);

  const getStatusIcon = (status) => {
    const icons = {
      sent: <MessageCircle className="w-4 h-4" />,
      viewed: <Eye className="w-4 h-4" />,
      responded: <CheckCircle2 className="w-4 h-4" />,
      interested: <CheckCircle2 className="w-4 h-4" />,
      not_interested: <XCircle className="w-4 h-4" />,
      no_response: <Clock className="w-4 h-4" />
    };
    return icons[status] || icons.sent;
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: "text-blue-400",
      viewed: "text-purple-400",
      responded: "text-green-400",
      interested: "text-emerald-400",
      not_interested: "text-red-400",
      no_response: "text-gray-400"
    };
    return colors[status] || "text-gray-400";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleGenerateFollowUp = useCallback(async () => {
    if (!sortedMessages || sortedMessages.length === 0) {
      console.error("No messages available for follow-up generation");
      alert("Geen berichten gevonden om een follow-up te genereren");
      return;
    }

    // Get candidate_id from first message
    const candidateId = sortedMessages[0].candidate_id;
    
    if (!candidateId) {
      console.error("No candidate_id found in messages");
      alert("Kandidaat ID ontbreekt");
      return;
    }

    setIsGenerating(true);
    setHasCopied(false); // Reset hasCopied when generating a new message
    setGeneratedMessage(""); // Clear previous generated message
    setDisplayedMessage(""); // Clear displayed message immediately
    setShowMessageForm(true); // Always show form when generating

    try {
      const isFinal = sortedMessages.length >= 2; // Determine if it's the 3rd or more message

      const response = await generateFollowUpMessage({
        candidate_id: candidateId,
        previous_messages: sortedMessages.map(m => ({
          content: m.message_content,
          sent_at: m.sent_at,
          status: m.status,
          response_notes: m.response_notes || null // Ensure response_notes is null if undefined
        })),
        is_final: isFinal // Pass the is_final flag
      });

      if (response.data?.message) {
        setGeneratedMessage(response.data.message);
        // showMessageForm is already true
      } else {
        throw new Error("Geen bericht ontvangen van de generator");
      }
    } catch (error) {
      console.error("Error generating follow-up:", error);
      alert("Fout bij genereren follow-up bericht: " + (error.message || "Onbekende fout"));
      setShowMessageForm(false); // Hide form on error
    }
    setIsGenerating(false);
  }, [sortedMessages]); // Add sortedMessages as a dependency

  // Auto-generate on mount if autoGenerate is true - with safety check
  useEffect(() => {
    if (autoGenerate && open && !showMessageForm && !generatedMessage && !isGenerating && sortedMessages.length > 0) {
      handleGenerateFollowUp();
    }
  }, [autoGenerate, open, showMessageForm, generatedMessage, isGenerating, sortedMessages.length, handleGenerateFollowUp]); // Added handleGenerateFollowUp and isGenerating to dependencies

  // Typing animation effect
  useEffect(() => {
    let timeoutId;

    if (generatedMessage && generatedMessage.length > 0) {
      setIsTyping(true);
      setDisplayedMessage(""); // Clear displayed message when a new generatedMessage comes in

      let currentIndex = 0;

      const typeNextCharacter = () => {
        if (currentIndex < generatedMessage.length) {
          const charToAdd = generatedMessage[currentIndex];
          setDisplayedMessage(prev => {
            const newMessage = prev + charToAdd;

            // Auto-scroll to bottom after state update
            setTimeout(() => {
              const messageContainer = document.querySelector('[data-message-container]');
              if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
              }
            }, 10);

            return newMessage;
          });
          currentIndex++;
          timeoutId = setTimeout(typeNextCharacter, 25);
        } else {
          setIsTyping(false);
          // Final scroll to ensure we're at the bottom
          setTimeout(() => {
            const messageContainer = document.querySelector('[data-message-container]');
            if (messageContainer) {
              messageContainer.scrollTop = messageContainer.scrollHeight;
            }
          }, 100);
        }
      };

      // Start typing after a brief pause
      timeoutId = setTimeout(typeNextCharacter, 100);
    } else {
      setIsTyping(false);
      setDisplayedMessage("");
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [generatedMessage]);

  const handleSendMessage = async () => {
    if (!generatedMessage.trim()) return;

    setIsSending(true);
    try {
      const user = await User.me();
      const firstMessage = sortedMessages[0];

      // Calculate correct sequence: count existing messages + 1
      const existingMessagesCount = sortedMessages.length;
      const newSequence = existingMessagesCount + 1;

      const newMessage = await OutreachMessage.create({
        candidate_id: firstMessage.candidate_id,
        candidate_name: firstMessage.candidate_name,
        candidate_linkedin: firstMessage.candidate_linkedin,
        candidate_job_title: firstMessage.candidate_job_title,
        candidate_company: firstMessage.candidate_company,
        message_content: generatedMessage,
        message_length: generatedMessage.length,
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        sent_by_name: user.full_name || user.email,
        organization_id: user.organization_id,
        project_id: firstMessage.project_id,
        status: 'sent',
        follow_up_sequence: newSequence
      });

      // Create follow-up task automatically
      try {
        const { createTaskAfterFollowUp } = await import("@/api/functions");
        await createTaskAfterFollowUp({ outreach_message_id: newMessage.id });
      } catch (taskError) {
        console.error("Error creating follow-up task:", taskError);
      }

      setShowMessageForm(false);
      setGeneratedMessage("");
      setDisplayedMessage("");
      setHasCopied(false);

      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error("Error saving message:", error);
      alert("Fout bij opslaan bericht");
    }
    setIsSending(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage); // Copy the full generated message
    setHasCopied(true);
  };

  const handleLinkedInClick = async () => {
    // Only log (via handleSendMessage) if message was copied
    if (hasCopied && generatedMessage) {
      await handleSendMessage();
    }

    // Open LinkedIn profile - check both possible field names
    const linkedinUrl = candidate?.linkedin_profile || candidate?.candidate_linkedin;
    if (linkedinUrl) {
      window.open(linkedinUrl, '_blank');
    }
  };

  if (!candidate || !messages) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="glass-card max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}
      >
        <DialogHeader>
          <DialogTitle style={{color: 'var(--txt)'}}>
            Conversatie met {candidate.candidate_name || `${candidate.first_name} ${candidate.last_name}`}
          </DialogTitle>
        </DialogHeader>

        {/* Candidate Info */}
        <div className="p-4 rounded-lg border mb-4" style={{background: 'rgba(255,255,255,.02)', borderColor: 'rgba(255,255,255,.06)'}}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2" style={{color: 'var(--txt)'}}>
                {candidate.candidate_name || `${candidate.first_name} ${candidate.last_name}`}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{color: 'var(--muted)'}}>
                {(candidate.candidate_job_title || candidate.job_title) && (
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <span>{candidate.candidate_job_title || candidate.job_title}</span>
                  </div>
                )}
                {(candidate.candidate_company || candidate.company_name) && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{candidate.candidate_company || candidate.company_name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {(candidate.candidate_linkedin || candidate.linkedin_profile) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(candidate.candidate_linkedin || candidate.linkedin_profile, '_blank')}
                  className="bg-transparent border-gray-600 hover:bg-gray-800/50"
                  style={{color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)'}}
                >
                  <LinkedInIcon size={12} className="mr-2" />
                  LinkedIn
                </Button>
              )}
              <Button
                onClick={handleGenerateFollowUp}
                disabled={isGenerating || showMessageForm}
                className="btn-primary"
                size="sm"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Genereer Follow-up
              </Button>
            </div>
          </div>
        </div>

        {/* New Message Form */}
        {showMessageForm && (
          <Card className="glass-card mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold" style={{color: 'var(--txt)'}}>
                  Nieuwe Follow-up Inmail
                </h4>
                {/* Regenereer button moved here */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateFollowUp}
                  disabled={isGenerating}
                  style={{color: 'var(--muted)'}}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenereer
                </Button>
              </div>

              {/* Fixed Height Message Display Container with typing animation */}
              <div
                data-message-container
                className="h-64 p-4 rounded-lg border-2 border-dashed relative overflow-y-auto"
                style={{
                  background: 'rgba(255,255,255,.02)',
                  borderColor: 'rgba(255,255,255,.12)'
                }}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">AI schrijft een persoonlijk bericht...</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap pr-16" style={{ color: 'var(--txt)' }}>
                      {displayedMessage}
                      {isTyping && (
                        <span
                          className="inline-block w-2 h-4 ml-1 animate-pulse"
                          style={{ background: 'var(--accent)' }}
                        />
                      )}
                    </p>

                    {/* Character count - Fixed position in top right */}
                    {generatedMessage && ( // Use generatedMessage for char count logic, but displayedMessage.length for current display
                      <div className="absolute top-0 right-0 -mt-1 -mr-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${generatedMessage.length > 2000 ? 'border-red-500 text-red-400' : ''}`}
                          style={generatedMessage.length <= 2000 ? {
                            color: 'var(--muted)',
                            borderColor: 'rgba(255,255,255,.12)',
                            background: 'rgba(255,255,255,.04)'
                          } : {}}
                        >
                          {generatedMessage.length}/2000
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  disabled={!displayedMessage || isTyping || isSending || isGenerating}
                  className={`flex-1 ${hasCopied ? 'bg-blue-600 hover:bg-blue-700 border-blue-500' : 'btn-primary'}`}
                >
                  {hasCopied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Kopieer Bericht
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleLinkedInClick}
                  disabled={!(candidate?.linkedin_profile || candidate?.candidate_linkedin) || !displayedMessage || isTyping || isSending || isGenerating}
                  variant="outline"
                  className={`flex-1 ${
                    hasCopied
                      ? 'bg-blue-900/20 border-blue-600 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300'
                      : 'bg-transparent border-gray-600 hover:bg-gray-800/50'
                  }`}
                  style={!hasCopied ? { color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)' } : {}}
                >
                  <LinkedInIcon size={16} className="mr-2" />
                  Open LinkedIn
                </Button>
              </div>

              {hasCopied && (
                <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)' }}>
                  <span style={{ color: '#60A5FA' }}>
                    💡 Klik op "Open LinkedIn" om het bericht te verzenden. Dit wordt automatisch gelogd.
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMessageForm(false);
                    setGeneratedMessage("");
                    setDisplayedMessage("");
                    setHasCopied(false);
                    setIsTyping(false);
                  }}
                  className="bg-transparent border-gray-600 hover:bg-gray-800/50"
                  style={{color: 'var(--muted)', borderColor: 'rgba(255,255,255,.12)'}}
                >
                  Annuleren
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Timeline */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {sortedMessages.map((message) => (
              <Card key={message.id} className="glass-card">
                <CardContent className="p-4">
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${getStatusColor(message.status)}`}>
                        {getStatusIcon(message.status)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{color: 'var(--muted)'}}>
                            {message.sent_by_name}
                          </span>
                          {message.follow_up_sequence && message.follow_up_sequence > 1 && (
                            <Badge variant="outline" className="text-xs bg-purple-500/5 border-purple-500/20 text-purple-400">
                              Follow-up #{message.follow_up_sequence}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs" style={{color: 'var(--muted)'}}>
                          {formatDate(message.sent_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      message.status === 'responded' || message.status === 'interested'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : message.status === 'not_interested'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }>
                      {message.status === 'sent' && 'Verzonden'}
                      {message.status === 'viewed' && 'Bekeken'}
                      {message.status === 'responded' && 'Gereageerd'}
                      {message.status === 'interested' && 'Geïnteresseerd'}
                      {message.status === 'not_interested' && 'Niet geïnteresseerd'}
                      {message.status === 'no_response' && 'Geen reactie'}
                    </Badge>
                  </div>

                  {/* Message Content */}
                  <div
                    className="p-3 rounded-lg text-sm whitespace-pre-wrap"
                    style={{background: 'rgba(255,255,255,.04)', borderLeft: '3px solid rgba(239,68,68,.3)', color: 'var(--txt)'}}
                  >
                    {message.message_content}
                  </div>

                  {/* Response Notes */}
                  {message.response_notes && (
                    <div
                      className="mt-3 p-3 rounded-lg text-sm"
                      style={{background: 'rgba(34,197,94,.05)', borderLeft: '3px solid rgba(34,197,94,.3)'}}
                    >
                      <p className="font-medium text-green-400 mb-1 text-xs">Reactie notities:</p>
                      <p style={{color: 'var(--txt)'}}>{message.response_notes}</p>
                    </div>
                  )}

                  {/* Response Date */}
                  {message.response_date && (
                    <div className="mt-2 flex items-center gap-2 text-xs" style={{color: 'var(--muted)'}}>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span>Gereageerd op {formatDate(message.response_date)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{borderColor: 'rgba(255,255,255,.06)'}}>
          <div className="text-sm" style={{color: 'var(--muted)'}}>
            {sortedMessages.length} {sortedMessages.length === 1 ? 'bericht' : 'berichten'}
          </div>
          <Button onClick={onClose} className="btn-primary">
            Sluiten
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
