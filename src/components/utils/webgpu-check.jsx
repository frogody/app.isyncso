/**
 * WebGPU Support Detection
 * Checks if browser supports WebGPU and can access GPU adapter
 */

export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: "WebGPU not available in this browser"
    };
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: "No GPU adapter found"
      };
    }
    
    const device = await adapter.requestDevice();
    return {
      supported: true,
      adapter: adapter,
      device: device
    };
  } catch (error) {
    return {
      supported: false,
      reason: error.message
    };
  }
}