import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Shield, Zap, CheckCircle } from "lucide-react";

export default function MicrophonePrompt({ onGranted, onDenied }) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    try {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Sorry, your browser doesn\'t support voice recognition. Please use Chrome, Edge, or Safari.');
        setIsRequesting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      onGranted();
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Please allow microphone access to use voice chat');
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 animate-in slide-in-from-top duration-500">
      <Card className="glass-card border-yellow-500/20 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-yellow-400" />
              <CardTitle className="text-white text-lg">Enable Voice Chat</CardTitle>
            </div>
            <Button 
              onClick={onDenied}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Allow microphone access to chat with your AI tutor using voice. 
            Speak naturally and get instant audio responses.
          </p>
          
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col items-center text-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-white font-medium">Private</p>
                <p className="text-gray-500">Audio is processed securely and not stored</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Real-time</p>
                <p className="text-gray-500">Get instant voice responses from your tutor</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-white font-medium">Easy</p>
                <p className="text-gray-500">Just click, speak, and listen</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleGrantAccess}
              disabled={isRequesting}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              {isRequesting ? "Requesting..." : "Allow Microphone"}
            </Button>
            
            <Button 
              onClick={onDenied} 
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}