
import React from "react";
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
  Wifi
} from "lucide-react";

export default function DownloadApp() {
  const downloadUrl = "https://github.com/frogody/learning-tracker/releases/download/v1.0.0/LearningTracker-1.0.0.dmg";

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-gray-900 to-zinc-950">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-green-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-teal-500/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          <div className="text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/db-prod/public/4314197e6_logoisyncso1.png"
                alt="ISYNCSO"
                className="w-20 h-20 rounded-2xl"
              />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Track Your Learning Journey Automatically
            </h1>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Install our macOS app to get personalized course recommendations based on your real activity
            </p>

            <div className="max-w-2xl mx-auto my-12">
              <div className="rounded-2xl bg-gray-800/50 border border-gray-700 p-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-emerald-400" />
                  <span className="text-white font-medium">Menu Bar App Preview</span>
                </div>
                <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700">
                  <Monitor className="w-16 h-16 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <a href={downloadUrl} download>
                <Button className="btn-primary text-xl px-12 py-8 text-white">
                  <Download className="w-6 h-6 mr-3" />
                  Download for Mac (v1.0)
                </Button>
              </a>
              <p className="text-sm text-gray-400">
                macOS 14.0 or later • Free
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Installation Instructions
          </h2>
          <p className="text-gray-400">
            Follow these simple steps to get started
          </p>
        </div>

        <div className="space-y-8">
          <Card className="glass-card border-0 p-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-400">1</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-4">Download and Install</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Click the download button above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Open the downloaded DMG file</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Drag LearningTracker to Applications folder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Eject the DMG</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-400">2</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-4">First Launch</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Open LearningTracker from Applications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>macOS will show a security warning (because it's not from App Store)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Go to System Settings → Privacy & Security</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Click "Open Anyway" next to the warning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Click "Open" to confirm</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-400">3</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-4">Grant Permissions</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>The app will request Accessibility access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>Click "Open System Settings"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>Enable LearningTracker in Accessibility list</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>The app will guide you through this</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-400">4</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white mb-4">Connect Your Account</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Enter your email (the one you use for courses)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>The app will authenticate automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>You're ready to start tracking!</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-900/50 to-black py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400">
              Intelligent tracking that adapts to your learning style
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="glass-card border-0 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Runs Silently</h3>
              <p className="text-gray-400">
                Lives in menu bar, works in background
              </p>
            </Card>

            <Card className="glass-card border-0 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Learns Your Workflow</h3>
              <p className="text-gray-400">
                Understands what skills you use
              </p>
            </Card>

            <Card className="glass-card border-0 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Personalizes Courses</h3>
              <p className="text-gray-400">
                Recommends what you need to learn
              </p>
            </Card>

            <Card className="glass-card border-0 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Privacy First</h3>
              <p className="text-gray-400">
                All data encrypted, you control everything
              </p>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400">
            Everything you need to know about the app
          </p>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-0 p-8">
            <div className="flex gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Is it safe?</h3>
                <p className="text-gray-300">
                  Yes! The app is notarized by Apple and all data is encrypted. We only track development activity, not personal browsing.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Will it slow down my Mac?</h3>
                <p className="text-gray-300">
                  No, it uses less than 3% CPU and 100MB of RAM. You won't notice it running.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">What does it track?</h3>
                <p className="text-gray-300">
                  Which applications you use for learning/work, how long you spend, and what skills you apply. It never captures passwords, personal data, or sensitive content.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Can I pause it?</h3>
                <p className="text-gray-300">
                  Yes, click the menu bar icon and choose "Pause" anytime.
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-card border-0 p-8">
            <div className="flex gap-4">
              <HelpCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">How do I uninstall?</h3>
                <p className="text-gray-300">
                  Just drag LearningTracker from Applications to Trash.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-gradient-to-t from-gray-900/50 to-black py-16">
        <div className="max-w-5xl mx-auto px-6">
          <Card className="glass-card border-0 p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              System Requirements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <Monitor className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-2">Operating System</h4>
                  <p className="text-gray-400">macOS 14.0 (Sonoma) or later</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <HardDrive className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-2">Disk Space</h4>
                  <p className="text-gray-400">100MB free disk space</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Wifi className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white mb-2">Connectivity</h4>
                  <p className="text-gray-400">Internet connection for syncing</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400">
            Download now and start tracking your learning journey
          </p>
          <a href={downloadUrl} download>
            <Button className="btn-primary text-xl px-12 py-8 text-white">
              <Download className="w-6 h-6 mr-3" />
              Download for Mac (v1.0)
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
