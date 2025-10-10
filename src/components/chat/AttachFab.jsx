import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Paperclip, Users, Briefcase, Megaphone, ClipboardList, FileUp } from "lucide-react";

export default function AttachFab({ onPick }) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,.18), rgba(239,68,68,.10))",
              border: "1px solid rgba(239,68,68,.35)",
              boxShadow: "0 8px 28px rgba(239,68,68,.25)"
            }}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem onClick={() => onPick("Candidate")}>
            <Users className="w-4 h-4 mr-2" /> Kandidaten toevoegen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPick("Project")}>
            <Briefcase className="w-4 h-4 mr-2" /> Projecten toevoegen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPick("Campaign")}>
            <Megaphone className="w-4 h-4 mr-2" /> Campagnes toevoegen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPick("Role")}>
            <ClipboardList className="w-4 h-4 mr-2" /> Open rollen toevoegen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPick("File")}>
            <FileUp className="w-4 h-4 mr-2" /> Bestanden bijvoegen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}