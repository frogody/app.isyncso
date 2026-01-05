import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SyncAvatar from "../components/ui/SyncAvatar";
import { RegenerationJob } from "@/api/entities";
import { User } from "@/api/entities";

export default function RegenerateIntelligence() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [user, setUser] = useState(null);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const processingRef = useRef(false);
  const jobIdRef = useRef(null);

  // Load user and check for existing job on mount
  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        setUser(userData);

        // Check for running job
        const jobs = await RegenerationJob.filter(
          { user_id: userData.id, status: 'running' },
          '-created_date',
          1
        );

        if (jobs.length > 0) {
          const job = jobs[0];
          console.log('Found existing job:', job.id);
          setCurrentJob(job);
          jobIdRef.current = job.id;
          setResults(job.results || []);
          setProgress(Math.round((job.processed / job.total_candidates) * 100));
          setIsRunning(true);
          
          // Resume processing
          console.log('Resuming from index:', job.current_index);
          processNextBatch(job.id, job.current_index);
        }
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };

    init();
  }, []);

  const clearExistingJobs = async () => {
    try {
      // Delete all existing jobs for this user
      const jobs = await RegenerationJob.filter(
        { user_id: user.id },
        '-created_date',
        100
      );

      for (const job of jobs) {
        await RegenerationJob.delete(job.id);
      }
      
      console.log('Cleared', jobs.length, 'existing jobs');
    } catch (error) {
      console.error('Error clearing jobs:', error);
    }
  };

  const startRegeneration = async () => {
    if (isRunning || isResetting) {
      console.log('Already running or resetting, ignoring start request');
      return;
    }

    if (!confirm('This will regenerate intelligence for ALL candidates with improved scoring. This may take 20-30 minutes. Continue?')) {
      return;
    }

    try {
      console.log('Starting regeneration...');
      
      // Clear any existing jobs first
      await clearExistingJobs();

      // Reset all state
      setIsRunning(true);
      setResults([]);
      setSummary(null);
      setProgress(0);
      setCurrentCandidate(null);
      setCurrentBatch(0);
      processingRef.current = false;

      // Create new job record starting from 0
      const job = await RegenerationJob.create({
        user_id: user.id,
        organization_id: user.organization_id,
        status: 'running',
        total_candidates: 0,
        processed: 0,
        errors: 0,
        current_index: 0,
        results: [],
        started_at: new Date().toISOString()
      });

      console.log('Created new job:', job.id);
      setCurrentJob(job);
      jobIdRef.current = job.id;
      
      // Start processing from index 0
      processNextBatch(job.id, 0);
    } catch (error) {
      console.error('Error starting regeneration:', error);
      setIsRunning(false);
      alert('Failed to start regeneration: ' + error.message);
    }
  };

  const resetAndRestart = async () => {
    if (isResetting) {
      console.log('Already resetting, ignoring');
      return;
    }

    if (!confirm('This will STOP current processing and reset everything. Continue?')) {
      return;
    }

    try {
      console.log('Resetting...');
      setIsResetting(true);

      // Stop current processing immediately
      processingRef.current = true; // Set to true to block any pending processNextBatch calls
      setIsRunning(false);

      // Wait a moment for any in-flight requests to finish
      await new Promise(r => setTimeout(r, 1000));

      // Clear everything
      await clearExistingJobs();
      
      // Reset all state
      setResults([]);
      setSummary(null);
      setProgress(0);
      setCurrentCandidate(null);
      setCurrentJob(null);
      setCurrentBatch(0);
      jobIdRef.current = null;
      processingRef.current = false;

      console.log('Reset complete');
      setIsResetting(false);

    } catch (error) {
      console.error('Error resetting:', error);
      setIsResetting(false);
      alert('Failed to reset: ' + error.message);
    }
  };

  const processNextBatch = async (jobId, startIndex) => {
    // Prevent multiple simultaneous calls
    if (processingRef.current) {
      console.log('Already processing, skipping...');
      return;
    }

    processingRef.current = true;

    try {
      console.log(`Processing batch starting at index ${startIndex}`);
      
      const { regenerateAllIntelligence } = await import("@/api/functions");
      const response = await regenerateAllIntelligence({
        jobId: jobId,
        batchSize: 5,
        startIndex: startIndex
      });

      if (response.data?.success) {
        const data = response.data;
        
        console.log('Batch complete:', {
          processed: data.batch_processed,
          errors: data.batch_errors,
          totalProcessed: data.total_processed,
          hasMore: data.has_more,
          progress: data.progress_percentage
        });

        // Update UI
        setResults(data.all_results || []);
        setProgress(data.progress_percentage);
        setCurrentBatch(Math.floor(startIndex / 5) + 1);
        if (data.current_candidate) {
          setCurrentCandidate(data.current_candidate);
        }

        // If there's more work, continue after a delay
        if (data.has_more) {
          processingRef.current = false;
          console.log('Scheduling next batch in 2 seconds...');
          setTimeout(() => {
            processNextBatch(jobId, data.next_start_index);
          }, 2000);
        } else {
          // Job complete
          console.log('Job complete!');
          
          // Mark job as completed in database
          await RegenerationJob.update(jobId, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });

          setSummary({
            total: data.total_candidates,
            processed: data.total_processed,
            errors: data.total_errors
          });
          setIsRunning(false);
          setCurrentCandidate(null);
          processingRef.current = false;
        }
      } else {
        throw new Error(response.data?.error || 'Batch processing failed');
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      
      // Mark job as failed
      try {
        await RegenerationJob.update(jobId, {
          status: 'failed',
          completed_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Error updating job status:', updateError);
      }

      setIsRunning(false);
      setCurrentCandidate(null);
      processingRef.current = false;
      alert('Regeneration failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#151A1F' }}>
      <style>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <SyncAvatar size={40} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#E9F0F1' }}>
              Regenerate All Intelligence
            </h1>
            <p className="text-sm" style={{ color: '#B5C0C4' }}>
              Regenerate intelligence reports with improved, realistic scoring (5 second delay between candidates)
            </p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: '#E9F0F1' }}>Start Regeneration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p style={{ color: '#B5C0C4' }}>
                This will regenerate intelligence reports for all candidates using the new, more realistic scoring system.
                The process runs in batches of 5 candidates with a 5-second delay between each to avoid rate limits.
              </p>
              
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <p className="text-sm" style={{ color: '#FCD34D' }}>
                  ⚠️ This process will take approximately 20-30 minutes. Keep this tab open - if you refresh, it will resume automatically.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={startRegeneration}
                  disabled={isRunning || isResetting || !user}
                  className="flex-1"
                  style={{
                    background: (isRunning || isResetting) ? 'rgba(255,255,255,.08)' : 'rgba(239,68,68,.12)',
                    color: (isRunning || isResetting) ? '#B5C0C4' : '#FFCCCB',
                    border: '1px solid rgba(255,255,255,.12)'
                  }}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing Batch {currentBatch}...
                    </>
                  ) : isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start Regeneration
                    </>
                  )}
                </Button>

                {(currentJob || results.length > 0) && (
                  <Button
                    onClick={resetAndRestart}
                    disabled={!user || isResetting}
                    variant="destructive"
                    style={{
                      background: 'rgba(239,68,68,.15)',
                      color: '#FFCCCB',
                      border: '1px solid rgba(239,68,68,.3)'
                    }}
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Reset & Clear
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isRunning && (
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm" style={{ color: '#E9F0F1' }}>
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentCandidate && (
                  <p className="text-xs text-center" style={{ color: '#B5C0C4' }}>
                    Currently processing: {currentCandidate}
                  </p>
                )}
                <p className="text-xs text-center" style={{ color: '#B5C0C4' }}>
                  Batch {currentBatch} • 5 seconds per candidate • Keep this tab open
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ color: '#E9F0F1' }}>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#E9F0F1' }}>{summary.total}</p>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{summary.processed}</p>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>Success</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>{summary.errors}</p>
                  <p className="text-sm" style={{ color: '#B5C0C4' }}>Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle style={{ color: '#E9F0F1' }}>Results ({results.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.slice().reverse().map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(255,255,255,.02)' }}>
                    <div className="flex items-center gap-2">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />
                      ) : (
                        <XCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                      )}
                      <span style={{ color: '#E9F0F1' }}>{result.name}</span>
                    </div>
                    {result.status === 'success' ? (
                      <span className="text-sm" style={{ color: '#B5C0C4' }}>Score: {result.score}</span>
                    ) : (
                      <span className="text-sm" style={{ color: '#EF4444' }}>{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}