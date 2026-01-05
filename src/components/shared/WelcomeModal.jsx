import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Database, BookOpen, CheckCircle } from "lucide-react";

const WELCOME_CONTENT = {
  sentinel: {
    icon: Shield,
    title: "Welcome to SENTINEL",
    subtitle: "EU AI Act Compliance Made Simple",
    description: "The EU AI Act requires companies to:",
    points: [
      "Register AI systems they use or build",
      "Classify them by risk level",
      "Maintain compliance documentation"
    ],
    footer: "SENTINEL guides you through each step."
  },
  cide: {
    icon: Database,
    title: "Welcome to CIDE",
    subtitle: "Context Injected Data Engine",
    description: "CIDE helps you find ideal customers by:",
    points: [
      "Defining your target customer profile",
      "AI-powered company research",
      "Enriched contact lists for outreach"
    ],
    footer: "Get started in minutes, not hours."
  },
  learn: {
    icon: BookOpen,
    title: "Welcome to Learn",
    subtitle: "Personalized AI Education",
    description: "Learn creates courses tailored to:",
    points: [
      "Your job role and industry",
      "Your company's tech stack",
      "Your experience level"
    ],
    footer: "Start your AI journey today."
  }
};

export default function WelcomeModal({ feature, isOpen, onClose, onGetStarted }) {
  const content = WELCOME_CONTENT[feature];
  
  if (!content) return null;

  const Icon = content.icon;

  // Dynamic colors based on feature
  const colors = {
    sentinel: {
      iconBg: 'bg-[#86EFAC]/20',
      iconText: 'text-[#86EFAC]',
      checkmark: 'text-[#86EFAC]',
      footer: 'text-[#86EFAC]',
      button: 'bg-[#86EFAC] hover:bg-[#6EE7B7] text-black'
    },
    cide: {
      iconBg: 'bg-indigo-500/20',
      iconText: 'text-indigo-400',
      checkmark: 'text-indigo-400',
      footer: 'text-indigo-400',
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white'
    },
    learn: {
      iconBg: 'bg-yellow-500/20',
      iconText: 'text-yellow-400',
      checkmark: 'text-yellow-400',
      footer: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-500 text-white'
    }
  };

  const featureColors = colors[feature] || colors.sentinel;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-2xl ${featureColors.iconBg} flex items-center justify-center border border-white/10`}>
              <Icon className={`w-8 h-8 ${featureColors.iconText}`} />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center font-bold">{content.title}</DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            {content.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-zinc-300 text-sm">{content.description}</p>
          <div className="space-y-3">
            {content.points.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <CheckCircle className={`w-5 h-5 ${featureColors.checkmark} mt-0.5 flex-shrink-0`} />
                <span className="text-sm text-zinc-200">{point}</span>
              </div>
            ))}
          </div>
          <p className={`${featureColors.footer} text-sm font-medium text-center`}>{content.footer}</p>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Learn More First
          </Button>
          <Button
            onClick={() => {
              onGetStarted?.();
              onClose();
            }}
            className={`flex-1 ${featureColors.button} font-semibold`}
          >
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}