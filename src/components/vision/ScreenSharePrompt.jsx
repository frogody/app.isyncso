import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Shield, Zap, CheckCircle, EyeOff } from 'lucide-react';
import { screenCaptureService } from './ScreenCaptureService';

export function ScreenSharePrompt({ onGranted, onDenied }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState(null);

  async function handleStartCapture() {
    setIsRequesting(true);
    setError(null);
    
    try {
      const success = await screenCaptureService.startCapture();
      setIsRequesting(false);
      
      if (success) {
        onGranted?.();
      } else {
        setRejected(true);
      }
    } catch (err) {
      console.error('[ScreenShare] Error:', err);
      setIsRequesting(false);
      
      if (err.name === 'NotAllowedError') {
        setRejected(true);
        setError('Screen sharing was denied. You can still use the AI tutor without vision.');
      } else if (err.name === 'NotFoundError') {
        setError('No screen available to share. Please try again.');
      } else {
        setError('Could not start screen sharing. Please try again.');
      }
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-80 animate-in slide-in-from-bottom duration-300">
      <Card className="glass-card border-yellow-500/20 shadow-xl bg-gray-950">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rejected ? (
                <EyeOff className="w-4 h-4 text-yellow-400" />
              ) : (
                <Eye className="w-4 h-4 text-yellow-400" />
              )}
              <CardTitle className="text-white text-sm">
                {rejected ? 'Vision Disabled' : 'Enable Vision'}
              </CardTitle>
            </div>
            <Button 
              onClick={onDenied}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-6 w-6 p-0 text-lg"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rejected ? (
            <>
              <p className="text-gray-400 text-xs">
                {error || "No worries! The AI tutor can still help you with the lesson content. You can enable screen sharing anytime."}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setRejected(false);
                    setError(null);
                    handleStartCapture();
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={onDenied}
                  size="sm"
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-xs">
                Let your AI tutor see your screen for real-time help.
              </p>
              
              <div className="flex gap-2 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span>Private</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span>Real-time</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-blue-400" />
                  <span>Secure</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleStartCapture}
                  disabled={isRequesting}
                  size="sm"
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs"
                >
                  {isRequesting ? "Starting..." : "Share Screen"}
                </Button>
                
                <Button 
                  onClick={onDenied}
                  size="sm" 
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  Skip
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}