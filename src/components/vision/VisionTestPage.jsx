import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkWebGPUSupport } from '@/components/utils/webgpu-check';
import { ministralService } from '@/components/vision/MinistralService';
import { WebGPUFallback } from '@/components/vision/WebGPUFallback';
import { ModelLoader } from '@/components/vision/ModelLoader';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * Test page for Phase 1-2: Environment Setup + Model Loading
 * This allows us to verify WebGPU and model loading work before building more
 */
export default function VisionTestPage() {
  const [step, setStep] = useState('checking'); // checking, unsupported, loading, ready, testing
  const [webGPUStatus, setWebGPUStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  useEffect(() => {
    async function checkSupport() {
      const status = await checkWebGPUSupport();
      setWebGPUStatus(status);
      
      if (!status.supported) {
        setStep('unsupported');
      } else {
        setStep('loading');
      }
    }
    
    checkSupport();
  }, []);

  function handleModelReady() {
    setStep('ready');
  }

  function handleModelError(err) {
    setStep('unsupported');
  }

  async function runTest() {
    setStep('testing');
    setTestError(null);
    setTestResult(null);

    try {
      // Use a real image URL for testing
      const testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/480px-Cat03.jpg";

      const result = await ministralService.analyzeImage(
        testImageUrl,
        "What is in this image?"
      );

      setTestResult(result);
      setStep('ready');
    } catch (error) {
      console.error('Test failed:', error);
      setTestError(error.message);
      setStep('ready');
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Vision AI Test Page</h1>
          <p className="text-gray-400">Phase 1-2: Environment Setup + Model Loading</p>
        </div>

        {step === 'checking' && (
          <Card className="glass-card border-yellow-500/20">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Checking WebGPU support...</p>
            </CardContent>
          </Card>
        )}

        {step === 'unsupported' && (
          <WebGPUFallback reason={webGPUStatus?.reason || 'Unknown error'} />
        )}

        {step === 'loading' && (
          <ModelLoader onReady={handleModelReady} onError={handleModelError} />
        )}

        {(step === 'ready' || step === 'testing') && (
          <>
            <Card className="glass-card border-green-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <CardTitle className="text-white">System Ready</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-400 mb-1">WebGPU</p>
                    <p className="text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Available
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-400 mb-1">Vision Model</p>
                    <p className="text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Loaded
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={runTest}
                  disabled={step === 'testing'}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white"
                >
                  {step === 'testing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing Vision AI...
                    </>
                  ) : (
                    'Run Test'
                  )}
                </Button>
              </CardContent>
            </Card>

            {testResult && (
              <Card className="glass-card border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Test Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm font-mono">{testResult}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    ✅ Model successfully analyzed test image
                  </p>
                </CardContent>
              </Card>
            )}

            {testError && (
              <Card className="glass-card border-red-500/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-400" />
                    <CardTitle className="text-white">Test Failed</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{testError}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}