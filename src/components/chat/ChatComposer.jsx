
import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, ChatConversation } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Paperclip,
  Users,
  Briefcase,
  Megaphone,
  ClipboardList,
  Mic,
  Send,
  X,
  Loader2
} from "lucide-react";
import EntityPickerModal from "./EntityPickerModal";

export default function ChatComposer({ conversation: conversationProp = null, agentName = "recruitment_assistant", className = "" }) {
  const [conversation, setConversation] = useState(conversationProp);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]); // {url, name, size}
  const [picker, setPicker] = useState({ open: false, entity: null });
  const fileInputRef = useRef(null);

  // Ensure conversation exists if not provided
  useEffect(() => {
    setConversation(conversationProp || null);
  }, [conversationProp]);

  useEffect(() => {
    const ensureConversation = async () => {
      if (conversationProp) return; // Parent manages it
      try {
        const me = await User.me();
        if (!me) return;
        // Try to get the most recent non-archived conversation for this agent
        const list = await ChatConversation.filter({ agent_name: agentName });
        const active = (list || []).find(c => !c.metadata?.archived) || null;
        if (active) {
          setConversation(active);
        } else {
          const created = await ChatConversation.create({
            agent_name: agentName,
            title: "Nieuw gesprek",
            metadata: {
              name: "Nieuw gesprek",
              language: me.language || "nl"
            },
            messages: []
          });
          setConversation(created);
        }
      } catch (e) {
        console.error("Failed to init conversation", e);
      }
    };
    if (!conversation) ensureConversation();
  }, [conversation, conversationProp, agentName]);

  const openFilePicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const onFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const uploaded = [];
    for (const file of files) {
      try {
        const { file_url } = await UploadFile({ file });
        uploaded.push({ url: file_url, name: file.name, size: file.size });
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setAttachments(prev => [...prev, ...uploaded]);
    // reset input
    e.target.value = "";
  };

  const removeAttachment = (url) => {
    setAttachments(prev => prev.filter(a => a.url !== url));
  };

  const handlePickEntity = (entity) => {
    if (entity === "File") {
      openFilePicker();
      return;
    }
    setPicker({ open: true, entity });
  };

  const handleAttachEntities = async (items) => {
    if (!items?.length) return;
    // Add a short preview into the composer text (non-destructive)
    const entityNl =
      picker.entity === "Candidate" ? "kandidaten" :
      picker.entity === "Project" ? "projecten" :
      picker.entity === "Campaign" ? "campagnes" :
      picker.entity === "Role" ? "rollen" : "items";
    const previewLines = items.slice(0, 5).map((it) => {
      const name = it.title || it.name || [it.first_name, it.last_name].filter(Boolean).join(" ") || it.id;
      return `• ${name}`;
    });
    const more = items.length > 5 ? `\n…en ${items.length - 5} meer` : "";
    const addition = `\n\nBijgevoegd (${entityNl}):\n${previewLines.join("\n")}${more}`;
    setText((t) => (t || " ")+ addition);
  };

  const canSend = useMemo(() => {
    return (!!text && text.trim().length > 0) || attachments.length > 0;
  }, [text, attachments.length]);

  const handleSend = async () => {
    if (!conversation || !canSend || sending) return;
    setSending(true);
    try {
      // Add message to conversation messages array
      const newMessage = {
        role: "user",
        content: text || "",
        file_urls: attachments.map(a => a.url),
        timestamp: new Date().toISOString()
      };
      const updatedMessages = [...(conversation.messages || []), newMessage];
      await ChatConversation.update(conversation.id, {
        messages: updatedMessages
      });
      // Update local state
      setConversation({ ...conversation, messages: updatedMessages });
      // Clear local composer
      setText("");
      setAttachments([]);
    } catch (e) {
      console.error("Failed to send message", e);
      alert("Bericht verzenden mislukt.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={["w-full", className].join(" ")}>
      <style jsx>{`
        .composer-wrap {
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9999px;
          box-shadow: 0 8px 30px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.06);
        }
        .chip {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          color: #E9F0F1;
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFilesChosen}
      />

      {/* Attachment chips row (collapses gracefully) */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-2">
          {attachments.map((a) => (
            <div key={a.url} className="chip flex items-center gap-2 px-2 py-1 rounded-full text-xs">
              <Paperclip className="w-3 h-3 opacity-70" />
              <span className="max-w-[160px] truncate">{a.name || a.url.split("/").pop()}</span>
              <button
                onClick={() => removeAttachment(a.url)}
                className="rounded-full hover:bg-white/10 p-0.5"
                title="Verwijderen"
              >
                <X className="w-3 h-3 opacity-70" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Premium pill composer */}
      <div className="composer-wrap flex items-center px-2 py-1">
        {/* Left: + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition"
              title="Opties en bijlagen"
            >
              <Plus className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuItem onClick={() => handlePickEntity("File")}>
              <Paperclip className="w-4 h-4 mr-2" /> Bestanden bijvoegen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePickEntity("Candidate")}>
              <Users className="w-4 h-4 mr-2" /> Kandidaten toevoegen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePickEntity("Project")}>
              <Briefcase className="w-4 h-4 mr-2" /> Projecten toevoegen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePickEntity("Campaign")}>
              <Megaphone className="w-4 h-4 mr-2" /> Campagnes toevoegen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePickEntity("Role")}>
              <ClipboardList className="w-4 h-4 mr-2" /> Open rollen toevoegen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text input (borderless) */}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Stel een vraag"
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none text-base"
          style={{ color: "#E9F0F1" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Right icons */}
        <button
          type="button"
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-white/10 transition mr-1"
          title="Spreek in (niet actief)"
        >
          <Mic className="w-5 h-5 opacity-70" />
        </button>

        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend || sending}
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(239,68,68,.18)",
            border: "1px solid rgba(239,68,68,.35)"
          }}
          title="Versturen"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Entities picker */}
      <EntityPickerModal
        open={picker.open}
        onClose={() => setPicker({ open: false, entity: null })}
        entityName={picker.entity || "Candidate"}
        title={
          picker.entity === "Candidate" ? "Kandidaten selecteren" :
          picker.entity === "Project" ? "Projecten selecteren" :
          picker.entity === "Campaign" ? "Campagnes selecteren" :
          picker.entity === "Role" ? "Rollen selecteren" : "Items selecteren"
        }
        multi
        onConfirm={handleAttachEntities}
      />
    </div>
  );
}
