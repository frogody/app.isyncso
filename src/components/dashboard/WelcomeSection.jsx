import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const WelcomeSection = React.memo(({ user }) => {
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  else if (currentHour >= 17) greeting = "Good evening";

  return (
    <div className="relative overflow-hidden">
      <style>{`
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .wave-bg {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
        }
      `}</style>

      <Card className="glass-card p-5 border-0 relative overflow-hidden bg-black/60">
        {/* Animated Flowing Lines Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg 
            className="absolute w-[200%] h-full top-0 left-0"
            style={{ animation: 'wave 20s linear infinite' }}
            preserveAspectRatio="none" 
            viewBox="0 0 1440 320"
          >
             <path fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" d="M0,160 C320,300,420,300,740,160 C1060,20,1120,20,1440,160 V320 H0 Z" />
             <path fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" d="M0,160 C320,280,420,280,740,160 C1060,40,1120,40,1440,160" />
             <path fill="none" stroke="rgba(250,204,21,0.15)" strokeWidth="1.5" d="M0,100 C300,100,500,200,800,150 C1100,100,1300,150,1440,200" />
             <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,200 C400,250,600,50,900,150 C1200,250,1300,50,1440,150" />
          </svg>
          {/* Duplicate for seamless loop */}
           <svg 
            className="absolute w-[200%] h-full top-0 left-[200%]"
            style={{ animation: 'wave 20s linear infinite' }}
            preserveAspectRatio="none" 
            viewBox="0 0 1440 320"
          >
             <path fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" d="M0,160 C320,300,420,300,740,160 C1060,20,1120,20,1440,160 V320 H0 Z" />
             <path fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" d="M0,160 C320,280,420,280,740,160 C1060,40,1120,40,1440,160" />
             <path fill="none" stroke="rgba(250,204,21,0.15)" strokeWidth="1.5" d="M0,100 C300,100,500,200,800,150 C1100,100,1300,150,1440,200" />
             <path fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" d="M0,200 C400,250,600,50,900,150 C1200,250,1300,50,1440,150" />
          </svg>

          {/* Glowing Dots/Stars */}
          <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-yellow-400 rounded-full blur-[1px] animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-2/3 w-0.5 h-0.5 bg-yellow-200 rounded-full blur-[0px]"></div>
          <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-yellow-500/50 rounded-full blur-[2px]"></div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl lg:text-3xl font-bold metallic-text">
                {greeting}, {user?.full_name || 'Learner'}!
              </h1>
              <p className="text-base text-gray-400">
                Ready to advance your AI knowledge today?
              </p>
            </div>
            


            <div className="flex flex-wrap gap-3 pt-2">
              <Link to={createPageUrl("Courses")}>
                <Button className="bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 text-yellow-400 hover:border-yellow-500/50 hover:text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all h-9 px-4 text-sm">
                  Explore Courses
                </Button>
              </Link>
              <Link to={createPageUrl("Progress")}>
                <Button 
                  variant="outline" 
                  className="bg-transparent border border-yellow-500/20 text-gray-400 hover:bg-yellow-500/5 hover:border-yellow-500/30 hover:text-yellow-400 h-9 px-4 text-sm transition-all"
                >
                  View Progress
                </Button>
              </Link>

            </div>
          </div>

          <div className="relative">
            <div className="w-24 h-24 relative flex items-center justify-center">
              {/* Orbit Rings */}
              <div className="absolute w-full h-full rounded-full border-t-[4px] border-l-[2px] border-yellow-400/50 blur-[2px] animate-spin" style={{ animationDuration: '4s' }} />
              <div className="absolute w-[80%] h-[80%] rounded-full border-b-[4px] border-r-[2px] border-yellow-600/50 blur-[3px] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
              <div className="absolute w-[60%] h-[60%] rounded-full border-t-[3px] border-yellow-200/60 blur-[1px] animate-spin" style={{ animationDuration: '2s' }} />
              
              {/* Core */}
              <div className="absolute w-[30%] h-[30%] bg-yellow-500/30 blur-xl rounded-full" />
              <div className="absolute w-[20%] h-[20%] bg-white/80 blur-md rounded-full" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default WelcomeSection;