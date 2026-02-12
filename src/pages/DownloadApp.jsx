
import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Monitor,
  Zap,
  CheckCircle,
  Brain,
  Lock,
  Activity,
  HelpCircle,
  HardDrive,
  Wifi,
  Apple,
  Cpu,
  Terminal,
  Copy,
  Check,
  Shield,
  Eye,
  Clock,
} from "lucide-react";

const VERSION = "2.0.0";
const BASE_URL = `https://github.com/frogody/sync.desktop/releases/download/v${VERSION}`;
const DMG_ARM64 = `${BASE_URL}/SYNC.Desktop-${VERSION}-arm64.dmg`;
const DMG_INTEL = `${BASE_URL}/SYNC.Desktop-${VERSION}.dmg`;
const INSTALL_SCRIPT = `${BASE_URL}/install-macos.command`;

function detectArch() {
  if (typeof navigator === "undefined") return "arm64";
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  if (platform.includes("ARM") || ua.includes("ARM64") || ua.includes("Apple")) {
    return "arm64";
  }
  return "x64";
}

export default function DownloadApp() {
  const arch = useMemo(() => detectArch(), []);
  const [copied, setCopied] = useState(false);

  const primaryUrl = arch === "arm64" ? DMG_ARM64 : DMG_INTEL;
  const secondaryUrl = arch === "arm64" ? DMG_INTEL : DMG_ARM64;
  const primaryLabel = arch === "arm64" ? "Apple Silicon (M1/M2/M3/M4)" : "Intel";
  const secondaryLabel = arch === "arm64" ? "Intel Mac" : "Apple Silicon (M1/M2/M3/M4)";

  const terminalCommand = `curl -fsSL ${INSTALL_SCRIPT} | bash`;

  const handleCopy = () => {
    navigator.clipboard.writeText(terminalCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-gray-900 to-zinc-950">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-12 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/4314197e6_logoisyncso1.png"
                alt="iSyncSO"
                className="w-16 h-16 rounded-xl"
              />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white">
              SYNC Desktop
            </h1>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Your AI-powered productivity companion. Tracks your workflow, detects commitments,
              and gives SYNC the context to truly help you.
            </p>

            {/* Download buttons */}
            <div className="flex flex-col items-center gap-3 pt-4">
              <a href={primaryUrl}>
                <Button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-lg px-10 py-7 rounded-xl shadow-lg shadow-cyan-500/25">
                  <Download className="w-5 h-5 mr-2" />
                  Download for Mac — {primaryLabel}
                </Button>
              </a>
              <a href={secondaryUrl} className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
                Download for {secondaryLabel} instead
              </a>
              <p className="text-sm text-gray-500">
                v{VERSION} &middot; macOS 12.0+ &middot; Free
              </p>
            </div>

            {/* Terminal installer */}
            <div className="max-w-xl mx-auto pt-4">
              <p className="text-xs text-gray-500 mb-2">Or install via Terminal (downloads, installs, and launches automatically):</p>
              <div
                className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 cursor-pointer hover:border-cyan-800/60 transition-colors"
                onClick={handleCopy}
              >
                <Terminal className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <code className="text-sm text-gray-300 flex-1 overflow-x-auto whitespace-nowrap">
                  {terminalCommand}
                </code>
                {copied ? (
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-b from-gray-900/50 to-black py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              What SYNC Desktop Does
            </h2>
            <p className="text-gray-400">
              Runs silently in the background — gives your SYNC AI real context about your work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card border-0 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center mx-auto mb-3">
                <Eye className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Context Awareness</h3>
              <p className="text-gray-400 text-sm">
                Understands what app you're in, what you're working on, and detects context switches
              </p>
            </Card>

            <Card className="glass-card border-0 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Commitment Detection</h3>
              <p className="text-gray-400 text-sm">
                Detects when you say "I'll send that by Friday" and tracks it as a commitment
              </p>
            </Card>

            <Card className="glass-card border-0 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Daily Journals</h3>
              <p className="text-gray-400 text-sm">
                Auto-generates daily activity summaries with focus scores and productivity insights
              </p>
            </Card>

            <Card className="glass-card border-0 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Privacy First</h3>
              <p className="text-gray-400 text-sm">
                All data encrypted locally. Sensitive apps auto-excluded. You control everything.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Installation
          </h2>
          <p className="text-gray-400">
            Standard macOS install — download, drag, done
          </p>
        </div>

        <div className="space-y-4">
          <Card className="glass-card border-0 p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                  <span className="text-sm font-bold text-cyan-400">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Download the DMG</h3>
                <ul className="space-y-1.5 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Click the download button above (auto-detects your Mac type)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Open the downloaded <code className="text-cyan-300">.dmg</code> file</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                  <span className="text-sm font-bold text-cyan-400">2</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Drag to Applications</h3>
                <ul className="space-y-1.5 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Drag <strong>SYNC Desktop</strong> to the <strong>Applications</strong> folder shortcut</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Eject the DMG when done</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-5 border-l-2 border-l-amber-500/40">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-400">3</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Allow the App to Open</h3>
                <p className="text-sm text-amber-300/80 mb-3">macOS will block the first launch because the app isn't from the App Store. Choose one of these methods:</p>
                <div className="space-y-3">
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                      <strong className="text-amber-300">Option A — Recommended:</strong> Open <strong>System Settings → Privacy & Security</strong>, scroll down and click <strong>"Open Anyway"</strong> next to the SYNC Desktop message.
                    </p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                      <strong className="text-amber-300">Option B — Right-click:</strong> In Finder, <strong>right-click</strong> (or Control-click) SYNC Desktop in Applications → click <strong>"Open"</strong> → confirm <strong>"Open"</strong> again in the dialog.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">You only need to do this once. After that the app opens normally.</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                  <span className="text-sm font-bold text-cyan-400">4</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Grant Permissions & Sign In</h3>
                <ul className="space-y-1.5 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Grant <strong>Accessibility</strong> access when prompted (required for activity tracking)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Click <strong>"Sign in with iSyncSO"</strong> in the app</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span>Your browser opens — log in with your iSyncSO account and you're all set</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Is it safe?</h3>
                <p className="text-sm text-gray-300">
                  Yes. All data is encrypted locally with AES-256. Sensitive apps (banking, password managers, medical) are automatically excluded. Raw screen content never leaves your device — only structured activity summaries sync to your account.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Will it slow down my Mac?</h3>
                <p className="text-sm text-gray-300">
                  No. SYNC Desktop uses the macOS Accessibility API to read window text directly — no screenshots or OCR. It uses less than 3% CPU and ~100MB RAM.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">What does it track?</h3>
                <p className="text-sm text-gray-300">
                  Which apps you use, how long you spend in each, what you're working on (document names, email subjects, code files), and commitments you make in communication tools. It never captures passwords, personal messages in full, or content from excluded apps.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Can I pause or exclude specific apps?</h3>
                <p className="text-sm text-gray-300">
                  Yes. Click the menu bar icon to pause tracking anytime. Banking apps, password managers, and private/incognito browser windows are excluded by default. You can add custom exclusions in settings.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">What about Windows?</h3>
                <p className="text-sm text-gray-300">
                  Windows support is coming soon. Currently macOS only (12.0 Monterey and later).
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-white mb-1">How do I uninstall?</h3>
                <p className="text-sm text-gray-300">
                  Drag SYNC Desktop from Applications to Trash. Your synced data on app.isyncso.com is preserved.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* System Requirements */}
      <div className="bg-gradient-to-t from-gray-900/50 to-black py-8">
        <div className="max-w-5xl mx-auto px-4 lg:px-6">
          <Card className="glass-card border-0 p-5">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              System Requirements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Monitor className="w-7 h-7 text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Operating System</h4>
                  <p className="text-gray-400 text-sm">macOS 12.0 (Monterey) or later</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Cpu className="w-7 h-7 text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Architecture</h4>
                  <p className="text-gray-400 text-sm">Apple Silicon (M1+) or Intel x64</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wifi className="w-7 h-7 text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Connectivity</h4>
                  <p className="text-gray-400 text-sm">Internet for account sync (works offline too)</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-12 text-center">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 space-y-4">
          <h2 className="text-3xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-400">
            Download SYNC Desktop and let your AI assistant understand your workflow
          </p>
          <a href={primaryUrl}>
            <Button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-lg px-10 py-7 rounded-xl shadow-lg shadow-cyan-500/25">
              <Download className="w-5 h-5 mr-2" />
              Download for Mac (v{VERSION})
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
