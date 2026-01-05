// Pyodide Web Worker for safe Python execution
let pyodide = null;

// Initialize Pyodide on first load
async function initPyodide() {
  if (pyodide) return pyodide;
  
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
    });
    return pyodide;
  } catch (error) {
    throw new Error(`Failed to initialize Pyodide: ${error.message}`);
  }
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { code, id } = e.data;
  
  try {
    // Ensure Pyodide is loaded
    const py = await initPyodide();
    
    // Capture stdout and stderr
    let output = [];
    py.setStdout({ 
      batched: (text) => { 
        output.push(text); 
      } 
    });
    py.setStderr({ 
      batched: (text) => { 
        output.push(`ERROR: ${text}`); 
      } 
    });
    
    // Run the code
    await py.runPythonAsync(code);
    
    // Send results back
    self.postMessage({
      id,
      results: output.join('\n'),
      error: null
    });
    
  } catch (error) {
    // Send error back
    self.postMessage({
      id,
      results: null,
      error: error.message
    });
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });