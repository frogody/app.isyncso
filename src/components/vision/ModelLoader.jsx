import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Download, AlertCircle, CheckCircle } from "lucide-react";
import { ministralService } from '@/components/vision/MinistralService';

export function ModelLoader({ onReady, onError }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    async function loadModel() {
      try {
        await ministralService.initialize((prog, stat) => {
          setProgress(Math.round(prog));
          setStatus(stat);
        });
        
        setIsComplete(true);
        setStatus("Model ready!");
        setProgress(100);
        
        // Small delay for user to see completion
        setTimeout(() => {
          onReady?.();
        }, 800);
        
      } catch (err) {
        console.error('[ModelLoader] Load failed:', err);
        setError(err.message);
        onError?.(err);
      }
    }
    
    loadModel();
  }, []);

  if (error) {
    return (
      <Card className="glass-card border-red-500/20 max-w-2xl mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Model Loading Failed</h3>
          <p className="text-gray-300">{error}</p>
          <Button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-yellow-500/20 max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center gap-3">
          {isComplete ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <Brain className="w-6 h-6 text-yellow-400 animate-pulse" />
          )}
          <CardTitle className="text-white">
            {isComplete ? 'Vision AI Ready' : 'Loading Vision AI'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-8">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{status}</span>
            <span className="text-yellow-400 font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <Download className="w-4 h-4" />
            <span className="font-medium">First-time setup</span>
          </div>
          <p className="text-xs text-gray-400">
            Downloading Ministral 3B vision model (~1.5GB). This happens once and is cached for future visits.
          </p>
        </div>

        <div className="text-xs text-gray-500 text-center">
          This enables real-time screen understanding so your tutor can see what you're working on and provide contextual guidance.
        </div>
      </CardContent>
    </Card>
  );
}