import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function useBrowserSupport() {
  const [support, setSupport] = useState({
    speechRecognition: false,
    screenCapture: false,
    webGPU: false,
    checked: false
  });

  useEffect(() => {
    const checkSupport = async () => {
      const speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const screenCapture = 'getDisplayMedia' in navigator.mediaDevices;
      
      let webGPU = false;
      try {
        if ('gpu' in navigator) {
          const adapter = await navigator.gpu.requestAdapter();
          webGPU = !!adapter;
        }
      } catch (e) {
        webGPU = false;
      }

      setSupport({
        speechRecognition,
        screenCapture,
        webGPU,
        checked: true
      });
    };

    checkSupport();
  }, []);

  return support;
}

export function BrowserWarnings() {
  const support = useBrowserSupport();
  const warnings = [];

  if (support.checked) {
    if (!support.speechRecognition) {
      warnings.push('Voice input is not supported in this browser. Try Chrome or Edge.');
    }
    if (!support.screenCapture) {
      warnings.push('Screen sharing is not supported in this browser.');
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-yellow-300">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      </div>
    </div>
  );
}