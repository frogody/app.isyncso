import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useShortcut, useKeyboardShortcuts } from "@/contexts/KeyboardShortcutsContext";
import CommandPalette from "@/components/CommandPalette";

export default function GlobalShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setHelpOpen } = useKeyboardShortcuts();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Command Palette - Mod+K
  useShortcut(
    "mod+k",
    () => setCommandPaletteOpen(true),
    "Open command palette",
    "Global"
  );

  // Navigation shortcuts using "g" prefix sequences
  // g+d = Go to Dashboard
  useShortcut(
    "g+d",
    () => navigate(createPageUrl("TalentDashboard")),
    "Go to Dashboard",
    "Navigation"
  );

  // g+c = Go to Candidates
  useShortcut(
    "g+c",
    () => navigate(createPageUrl("TalentCandidates")),
    "Go to Candidates",
    "Navigation"
  );

  // g+p = Go to Campaigns
  useShortcut(
    "g+p",
    () => navigate(createPageUrl("TalentCampaigns")),
    "Go to Campaigns",
    "Navigation"
  );

  // g+n = Go to Nests
  useShortcut(
    "g+n",
    () => navigate("/marketplace/nests"),
    "Go to Nests",
    "Navigation"
  );

  // g+m = Go to Marketplace
  useShortcut(
    "g+m",
    () => navigate("/marketplace/nests"),
    "Go to Marketplace",
    "Navigation"
  );

  // g+s = Go to Settings
  useShortcut(
    "g+s",
    () => navigate(createPageUrl("Settings")),
    "Go to Settings",
    "Navigation"
  );

  // Escape - Close modals (handled at component level typically)
  // ? - Show shortcuts help (built into KeyboardShortcutsContext)

  // Handle command palette actions
  const handleCommandPaletteAction = (actionId) => {
    switch (actionId) {
      case "add-candidate":
        // Navigate handled by palette, parent component handles modal
        break;
      case "import-candidates":
        // Navigate handled by palette
        break;
      case "export-candidates":
        // Trigger export from current page if applicable
        window.dispatchEvent(new CustomEvent("global:export-candidates"));
        break;
      case "run-intel":
        // Trigger intel from current page if applicable
        window.dispatchEvent(new CustomEvent("global:run-intel"));
        break;
      case "run-matching":
        // Trigger matching from current page if applicable
        window.dispatchEvent(new CustomEvent("global:run-matching"));
        break;
      default:
        break;
    }
  };

  return (
    <CommandPalette
      open={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      onAction={handleCommandPaletteAction}
    />
  );
}
