import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Chrome, Info } from "lucide-react";

export function WebGPUFallback({ reason }) {
  return (
    <Card className="glass-card border-yellow-500/20 max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <CardTitle className="text-white">Screen Understanding Unavailable</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300">{reason}</p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium mb-2">For the best experience, use:</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Chrome className="w-4 h-4 text-gray-400" />
                  <span>Chrome 113+ (recommended)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Chrome className="w-4 h-4 text-gray-400" />
                  <span>Edge 113+</span>
                </li>
                <li className="flex items-center gap-2">
                  <Chrome className="w-4 h-4 text-gray-400" />
                  <span>Firefox Nightly (enable dom.webgpu.enabled in about:config)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400">
            Don't worry - you can still use the AI tutor and all other learning features. 
            Screen understanding is an optional enhancement that provides real-time guidance 
            based on what you're working on.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}