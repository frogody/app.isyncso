import React, { useState, useEffect } from "react";
import { OutreachTask } from "@/api/entities";
import { Campaign } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { broadcastCampaignUpdated } from "@/components/utils/events";

// Stage progression mapping - CRITICAL FOR WORKFLOW
const STAGE_PROGRESSION = {
  'first_message': 'follow_up_1',
  'follow_up_1': 'follow_up_2',
  'follow_up_2': 'no_reply',
  'no_reply': 'no_reply',
  'connected': 'connected'
};

const getNextStage = (currentStage) => {
  const nextStage = STAGE_PROGRESSION[currentStage] || currentStage;
  console.log(`[AgentBacklog] Stage progression: ${currentStage} → ${nextStage}`);
  return nextStage;
};

export default function AgentBacklog() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [commandInput, setCommandInput] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [step, setStep] = useState("list");

  const getInstructionText = () => {
    if (step === "list") {
      return user?.language === 'nl' 
        ? "Voer het nummer in van de taak die je wilt uitvoeren:"
        : "Enter the number of the task you want to execute:";
    }
    if (step === "execute") {
      return user?.language === 'nl'
        ? "Typ 'SEND' als bericht verstuurd, 'REPLIED' als kandidaat heeft gereageerd, of 'NO REPLY' als geen reactie (alleen voor Check Reply taken):"
        : "Type 'SEND' if message sent, 'REPLIED' if candidate responded, or 'NO REPLY' if no response (Check Reply tasks only):";
    }
    if (step === "reply_capture") {
      return user?.language === 'nl'
        ? "Plak de reactie van de kandidaat hieronder en typ 'SAVE' om op te slaan:"
        : "Paste the candidate's reply below and type 'SAVE' to save:";
    }
    return "";
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const allTasks = await OutreachTask.filter(
        { 
          organization_id: userData.organization_id,
          status: "approved_ready" 
        },
        "scheduled_for",
        100
      );

      const now = new Date();
      const dueTasks = allTasks.filter(task => {
        if (!task.scheduled_for) return true;
        const scheduledDate = new Date(task.scheduled_for);
        return scheduledDate <= now;
      });

      setTasks(dueTasks);
    } catch (err) {
      console.error("Error loading tasks", err);
    }
    setLoading(false);
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    const cmd = (commandInput || "").trim().toLowerCase();
    
    if (step === "list") {
      const taskNum = parseInt(cmd);
      if (taskNum > 0 && taskNum <= tasks.length) {
        setSelectedTask(tasks[taskNum - 1]);
        setStep("execute");
        setCommandInput("");
      }
      return;
    }

    if (step === "execute") {
      // REPLIED command
      if (cmd === "replied" || cmd === "reply") {
        setStep("reply_capture");
        setCommandInput("");
        return;
      }

      // NO REPLY command (only for check_reply tasks)
      if (cmd === "no reply" || cmd === "noreply" || cmd === "no") {
        if (selectedTask?.task_type !== "check_reply") {
          alert(user?.language === 'nl' ? "Op dit moment kunt u alleen 'NO REPLY' gebruiken voor Check Reply taken." : "Currently, 'NO REPLY' is only for Check Reply tasks.");
          setCommandInput("");
          return;
        }

        try {
          await OutreachTask.update(selectedTask.id, {
            status: "completed",
            reply_detected: false,
          });

          alert(user?.language === 'nl' ? "✅ Geen reactie geregistreerd" : "✅ No reply recorded");
          setCommandInput("");
          setStep("list");
          setSelectedTask(null);
          await loadData();
        } catch (error) {
          console.error("Error marking no reply:", error);
          alert(user?.language === 'nl' ? "Fout" : "Error");
        }
        return;
      }

      // SEND command - CRITICAL WORKFLOW LOGIC
      if (cmd === "send" || cmd === "sent") {
        try {
          console.log('[AgentBacklog] Processing SEND command for task:', selectedTask.id);
          console.log('[AgentBacklog] Task type:', selectedTask.task_type);
          console.log('[AgentBacklog] Campaign ID:', selectedTask.campaign_id);
          console.log('[AgentBacklog] Candidate ID:', selectedTask.candidate_id);

          // Mark task as completed
          await OutreachTask.update(selectedTask.id, {
            status: "completed",
            agent_completed_at: new Date().toISOString(),
          });

          console.log('[AgentBacklog] ✅ Task marked as completed');

          // Update campaign stage
          if (selectedTask.campaign_id && selectedTask.candidate_id) {
            console.log('[AgentBacklog] 🔄 Updating campaign stage...');
            
            const campaignList = await Campaign.filter({ id: selectedTask.campaign_id });
            const campaign = campaignList[0];

            if (campaign) {
              console.log('[AgentBacklog] ✅ Campaign found:', campaign.name);
              
              const matchedCandidates = campaign.matched_candidates || [];
              const currentMatch = matchedCandidates.find(m => m.candidate_id === selectedTask.candidate_id);

              if (currentMatch) {
                console.log('[AgentBacklog] ✅ Candidate found in campaign');
                console.log('[AgentBacklog] Current stage:', currentMatch.stage);

                const nextStage = getNextStage(currentMatch.stage);
                console.log('[AgentBacklog] Next stage:', nextStage);

                // Update the candidate's stage and last_contact_at
                const updatedCandidates = matchedCandidates.map(m => {
                  if (m.candidate_id === selectedTask.candidate_id) {
                    return {
                      ...m,
                      stage: nextStage,
                      last_contact_at: new Date().toISOString(),
                      sent_at: m.sent_at || new Date().toISOString()
                    };
                  }
                  return m;
                });

                // Save updated campaign
                await Campaign.update(selectedTask.campaign_id, {
                  matched_candidates: updatedCandidates
                });

                console.log('[AgentBacklog] ✅ Campaign stage updated successfully');
                console.log('[AgentBacklog] Candidate moved from', currentMatch.stage, 'to', nextStage);

                // Broadcast update
                broadcastCampaignUpdated(selectedTask.campaign_id);
              } else {
                console.error('[AgentBacklog] ❌ Candidate not found in campaign matched_candidates');
              }
            } else {
              console.error('[AgentBacklog] ❌ Campaign not found');
            }
          }

          alert(user?.language === 'nl' ? "✅ Bericht verzonden" : "✅ Message sent");
          setCommandInput("");
          setStep("list");
          setSelectedTask(null);
          await loadData();
        } catch (error) {
          console.error("[AgentBacklog] Error processing SEND:", error);
          alert(user?.language === 'nl' ? `Fout: ${error.message}` : `Error: ${error.message}`);
        }
        return;
      }

      // If command not recognized
      setCommandInput("");
      return;
    }

    if (step === "reply_capture") {
      if (cmd === "save") {
        try {
          // Mark task as completed with reply
          await OutreachTask.update(selectedTask.id, {
            status: "completed",
            reply_detected: true,
            reply_content: replyContent,
            agent_completed_at: new Date().toISOString(),
          });

          // Update campaign: move candidate to 'connected' stage
          if (selectedTask.campaign_id && selectedTask.candidate_id) {
            const campaignList = await Campaign.filter({ id: selectedTask.campaign_id });
            const campaign = campaignList[0];

            if (campaign) {
              const matchedCandidates = campaign.matched_candidates || [];
              const updatedCandidates = matchedCandidates.map(m => {
                if (m.candidate_id === selectedTask.candidate_id) {
                  return {
                    ...m,
                    stage: 'connected',
                    response_received: true,
                    interested: true,
                    last_contact_at: new Date().toISOString()
                  };
                }
                return m;
              });

              await Campaign.update(selectedTask.campaign_id, {
                matched_candidates: updatedCandidates
              });

              broadcastCampaignUpdated(selectedTask.campaign_id);
            }
          }

          alert(user?.language === 'nl' ? "✅ Reactie opgeslagen, kandidaat verplaatst naar Connected" : "✅ Reply saved, candidate moved to Connected");
          setReplyContent("");
          setCommandInput("");
          setStep("list");
          setSelectedTask(null);
          await loadData();
        } catch (error) {
          console.error("Error saving reply:", error);
          alert(user?.language === 'nl' ? "Fout" : "Error");
        }
        return;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--txt)' }}>{user?.language === 'nl' ? 'Taken laden...' : 'Loading tasks...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--txt)' }}>
          {user?.language === 'nl' ? 'Agent Backlog' : 'Agent Backlog'}
        </h1>

        {step === "list" && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Geen taken in de backlog' : 'No tasks in backlog'}
              </p>
            ) : (
              tasks.map((task, idx) => (
                <div key={task.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-lg" style={{ color: 'var(--txt)' }}>
                        {idx + 1}. {task.candidate_name}
                      </div>
                      <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                        {task.task_type === 'initial_outreach' && (user?.language === 'nl' ? 'Eerste Bericht' : 'Initial Outreach')}
                        {task.task_type === 'follow_up_1' && 'Follow-up 1'}
                        {task.task_type === 'follow_up_2' && 'Follow-up 2'}
                        {task.task_type === 'check_reply' && (user?.language === 'nl' ? 'Controleer Reactie' : 'Check Reply')}
                      </div>
                      {task.scheduled_for && (
                        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                          {user?.language === 'nl' ? 'Gepland voor:' : 'Scheduled for:'} {new Date(task.scheduled_for).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {step === "execute" && selectedTask && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--txt)' }}>
              {selectedTask.candidate_name}
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                  {user?.language === 'nl' ? 'Taak Type:' : 'Task Type:'}
                </div>
                <div style={{ color: 'var(--txt)' }}>
                  {selectedTask.task_type === 'initial_outreach' && (user?.language === 'nl' ? 'Eerste Bericht' : 'Initial Outreach')}
                  {selectedTask.task_type === 'follow_up_1' && 'Follow-up 1'}
                  {selectedTask.task_type === 'follow_up_2' && 'Follow-up 2'}
                  {selectedTask.task_type === 'check_reply' && (user?.language === 'nl' ? 'Controleer Reactie' : 'Check Reply')}
                </div>
              </div>

              {selectedTask.task_type !== 'check_reply' && (
                <div>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                    {user?.language === 'nl' ? 'Bericht om te verzenden:' : 'Message to send:'}
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--txt)' }}>
                    {selectedTask.message_content}
                  </div>
                </div>
              )}

              {selectedTask.candidate_linkedin && (
                <div>
                  <Button
                    onClick={() => window.open(selectedTask.candidate_linkedin, '_blank')}
                    className="w-full"
                    style={{
                      background: 'rgba(10,102,194,.12)',
                      color: '#5B9DD9',
                      border: '1px solid rgba(10,102,194,.3)'
                    }}
                  >
                    {user?.language === 'nl' ? 'Open LinkedIn Profiel' : 'Open LinkedIn Profile'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "reply_capture" && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--txt)' }}>
              {user?.language === 'nl' ? 'Reactie van kandidaat' : 'Candidate Reply'}
            </h2>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={user?.language === 'nl' ? 'Plak hier de reactie...' : 'Paste reply here...'}
              className="min-h-[200px] mb-4"
              style={{ background: 'rgba(255,255,255,.05)', color: 'var(--txt)', border: '1px solid rgba(255,255,255,.1)' }}
            />
          </div>
        )}

        <div className="mt-6 glass-card p-4">
          <div className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
            {getInstructionText()}
          </div>
          <form onSubmit={handleCommand}>
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={user?.language === 'nl' ? 'Voer commando in...' : 'Enter command...'}
              className="font-mono"
              style={{ background: 'rgba(255,255,255,.05)', color: 'var(--txt)', border: '1px solid rgba(255,255,255,.1)' }}
              autoFocus
            />
          </form>
        </div>
      </div>
    </div>
  );
}