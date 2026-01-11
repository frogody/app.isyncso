import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Loader2, Terminal, StopCircle, Code, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/api/supabaseClient";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";

export default function CodeSandbox({ initialCode, lessonId, blockIndex }) {
  const [code, setCode] = useState(initialCode || "");
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const workerRef = useRef(null);
  const executionIdRef = useRef(0);
  const timeoutRef = useRef(null);

  // Generate interaction key
  const interactionKey = `code-${blockIndex}`;

  // Initialize worker
  const initializeWorker = () => {
    setOutput(["⚙️ Initializing Python environment..."]);
    
    // Simulate loading progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 15;
      setInitProgress(progress);
      if (progress >= 90) clearInterval(progressInterval);
    }, 200);
    
    // Create worker from blob - ensures bundler compatibility
    const workerCode = `
      let pyodide = null;

      async function initPyodide() {
        if (pyodide) return pyodide;
        
        try {
          importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
          pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
          });
          return pyodide;
        } catch (error) {
          self.postMessage({ 
            type: 'init_error', 
            error: \`Failed to initialize Pyodide: \${error.message}\` 
          });
          throw error;
        }
      }

      // Extract package names from import statements
      function extractPackages(code) {
        const packages = [];
        const importRegex = /^\\s*(?:import|from)\\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
        let match;
        
        while ((match = importRegex.exec(code)) !== null) {
          const pkg = match[1];
          // Common packages available in Pyodide
          const availablePackages = [
            'numpy', 'pandas', 'matplotlib', 'scipy', 'scikit-learn', 
            'sklearn', 'requests', 'beautifulsoup4', 'bs4', 'lxml',
            'pillow', 'sympy', 'networkx', 'pytest'
          ];
          
          if (availablePackages.includes(pkg.toLowerCase())) {
            packages.push(pkg.toLowerCase());
          }
        }
        
        return [...new Set(packages)]; // Remove duplicates
      }

      self.onmessage = async function(e) {
        const { code, id } = e.data;
        
        try {
          const py = await initPyodide();
          
          // Auto-load required packages
          const packages = extractPackages(code);
          if (packages.length > 0) {
            self.postMessage({ 
              type: 'loading_packages', 
              packages: packages.join(', '),
              id 
            });
            
            try {
              await py.loadPackage(packages);
            } catch (pkgError) {
              self.postMessage({
                id,
                results: null,
                error: \`Package loading failed: \${pkgError.message}. Some imports may not work.\`
              });
              return;
            }
          }
          
          let output = [];
          py.setStdout({ 
            batched: (text) => { 
              output.push(text); 
            } 
          });
          py.setStderr({ 
            batched: (text) => { 
              output.push(text); 
            } 
          });
          
          // Execute code
          await py.runPythonAsync(code);
          
          self.postMessage({
            id,
            results: output.join('\\n'),
            error: null
          });
          
        } catch (error) {
          // Clean up Python traceback for readability
          let errorMsg = error.message;
          
          // Extract just the error type and message from Python traceback
          const lines = errorMsg.split('\\n');
          const errorLine = lines.find(line => /^(\\w+Error|\\w+Exception):/.test(line.trim()));
          
          if (errorLine) {
            errorMsg = errorLine.trim();
          }
          
          self.postMessage({
            id,
            results: null,
            error: errorMsg
          });
        }
      };

      // Signal ready after script loads
      (async () => {
        try {
          await initPyodide();
          self.postMessage({ type: 'ready' });
        } catch (error) {
          self.postMessage({ 
            type: 'init_error', 
            error: error.message 
          });
        }
      })();
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e) => {
      const { type, id, results, error, packages } = e.data;
      
      if (type === 'ready') {
        clearInterval(progressInterval);
        setInitProgress(100);
        setTimeout(() => {
          setIsReady(true);
          setOutput(["✓ Python environment ready. Click 'Run Code' to execute your script."]);
        }, 300);
        return;
      }
      
      if (type === 'init_error') {
        clearInterval(progressInterval);
        setIsReady(false);
        setOutput([`❌ Runtime Error: ${error}`, "⚠️ Try refreshing the page to reinitialize."]);
        return;
      }
      
      if (type === 'loading_packages') {
        setOutput(prev => [...prev, `📦 Loading packages: ${packages}...`]);
        return;
      }
      
      if (id === executionIdRef.current) {
        setIsRunning(false);
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        const isSuccess = !error;
        
        if (error) {
          setOutput(prev => [...prev, `❌ Error: ${error}`]);
        } else {
          setOutput(prev => [...prev, results || "(no output)"]);
        }
        
        // Save to database
        saveExecution(code, results || error);
        
        // Award XP for successful execution only
        if (isSuccess) {
          awardCodeXP();
        }
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      clearInterval(progressInterval);
      setIsReady(false);
      setIsRunning(false);
      setOutput([
        `❌ Critical Worker Error: ${error.message || 'Unknown error'}`,
        "⚠️ The Python runtime failed to load. Please refresh the page.",
        "💡 If this persists, check your browser console for details."
      ]);
    };
    
    return worker;
  };

  useEffect(() => {
    const worker = initializeWorker();
    workerRef.current = worker;
    
    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  const saveExecution = async (codeContent, result) => {
    try {
      const user = await db.auth.me();
      
      await db.entities.LessonInteraction.create({
        user_id: user.id,
        lesson_id: lessonId,
        interaction_key: interactionKey,
        interaction_type: "code",
        user_input: JSON.stringify({ code: codeContent, output: result })
      });
    } catch (error) {
      console.error("Failed to save code execution:", error);
    }
  };

  const awardCodeXP = async () => {
    try {
      const user = await db.auth.me();
      
      await db.functions.invoke('updateGamification', {
        user_id: user.id,
        action_type: 'code_execute',
        metadata: { lesson_id: lessonId }
      });
    } catch (error) {
      console.error("Failed to award code XP:", error);
    }
  };

  const handleRun = () => {
    if (!workerRef.current || !isReady || isRunning) return;
    
    setIsRunning(true);
    executionIdRef.current += 1;
    setOutput([`▶ Running code...`]);
    
    workerRef.current.postMessage({
      code,
      id: executionIdRef.current
    });
    
    // Hard timeout: Kill worker after 5 seconds
    timeoutRef.current = setTimeout(() => {
      if (isRunning) {
        // Terminate worker immediately
        workerRef.current.terminate();
        
        setIsRunning(false);
        setOutput(prev => [...prev, `❌ Error: Execution timed out (5s limit)`]);
        
        // Reinitialize fresh worker for next run
        const newWorker = initializeWorker();
        workerRef.current = newWorker;
      }
    }, 5000);
  };

  const handleStop = () => {
    if (!workerRef.current || !isRunning) return;
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Terminate worker immediately
    workerRef.current.terminate();
    setIsRunning(false);
    setOutput(prev => [...prev, `❌ Error: Execution stopped by user`]);
    
    // Reinitialize fresh worker for next run
    const newWorker = initializeWorker();
    workerRef.current = newWorker;
  };

  // Set default placeholder if no code provided
  const displayCode = code || '# Write your Python code here...\n\n';

  return (
    <Card className="my-6 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30 border-0 shadow-xl shadow-cyan-500/10 not-prose">
      <CardContent className="p-0 not-prose">
        {/* Editor Panel */}
        <div className="border-b border-cyan-500/20">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <Code className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Python Code Editor</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {isReady ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Runtime Ready</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                      <span className="text-xs text-cyan-400">Loading Runtime... {initProgress}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isRunning && (
                <Button
                  onClick={handleStop}
                  size="sm"
                  variant="outline"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 h-8 transition-all"
                >
                  <StopCircle className="w-3.5 h-3.5 mr-1.5" />
                  Stop
                </Button>
              )}
              <Button
                onClick={handleRun}
                disabled={!isReady || isRunning}
                size="sm"
                className={`h-8 transition-all shadow-lg ${
                  !isReady || isRunning
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/50'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Editor Label */}
          <div className="px-4 py-2 bg-[#1a1a1a] border-b border-gray-800">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              Python Script (Editable)
            </span>
          </div>
          
          {/* Code Editor - NOT-PROSE wrapper for CSS isolation */}
          <div className="bg-[#1e1e1e] p-4 relative not-prose">
            {/* Line numbers background gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-900/50 to-transparent pointer-events-none" />
            
            <div className="not-prose">
              <Editor
                value={displayCode}
                onValueChange={setCode}
                highlight={code => highlight(code, languages.python, 'python')}
                padding={10}
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", "Consolas", monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                  minHeight: '220px',
                  caretColor: '#06B6D4',
                  color: '#e2e8f0'
                }}
                className="text-gray-100 focus:outline-none not-prose"
                textareaClassName="focus:outline-none text-gray-100 not-prose"
              />
            </div>
          </div>
        </div>

        {/* Console Output Panel */}
        <div className="bg-gradient-to-b from-black/50 to-black/80 p-4 border-t-2 border-slate-700">
          {/* Output Label */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Terminal Output</span>
          </div>
          <div className="bg-black/90 rounded-lg p-4 font-mono text-sm min-h-[120px] max-h-[320px] overflow-y-auto border border-green-500/20 shadow-inner not-prose">
            {output.length > 0 ? (
              output.map((line, i) => {
                const isError = line.includes('ERROR') || line.includes('❌');
                const isSuccess = line.includes('✓') || line.includes('ready');
                const isProgress = line.includes('⚙️') || line.includes('Initializing');
                const isPackageLoading = line.includes('📦');
                const isWarning = line.includes('⚠️');
                
                return (
                  <pre 
                    key={i} 
                    className={`mb-1 not-prose whitespace-pre-wrap font-mono ${
                      isError ? 'text-red-400 font-semibold' : 
                      isSuccess ? 'text-green-400' : 
                      isProgress || isPackageLoading ? 'text-cyan-400' : 
                      isWarning ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}
                  >
                    {isError && <AlertCircle className="inline w-3 h-3 mr-1 mb-0.5" />}
                    {line}
                  </pre>
                );
              })
            ) : (
              <div className="text-gray-600 italic flex items-center gap-2 not-prose">
                <Terminal className="w-4 h-4" />
                No output yet. Run your code to see results here.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}