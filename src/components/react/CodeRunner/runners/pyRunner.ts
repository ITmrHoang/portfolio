import type { LogEntry, TestCase, ExecutionResult } from './types';

declare global {
  interface Window {
    loadPyodide?: any;
    pyodideInstance?: any;
    pyodideLoadingPromise?: Promise<any>;
  }
}

/** Dynamic Pyodide Loader */
async function getPyodideInstance(onStatusUpdate?: (status: string) => void) {
  if (window.pyodideInstance) {
    return window.pyodideInstance;
  }

  if (window.pyodideLoadingPromise) {
    return await window.pyodideLoadingPromise;
  }

  window.pyodideLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!window.loadPyodide) {
        onStatusUpdate?.("🌐 Downloading Pyodide WebAssembly runtime (v0.25.1)...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((res, rej) => {
          script.onload = res;
          script.onerror = () => rej(new Error('Failed to load Pyodide script from CDN'));
        });
      }

      onStatusUpdate?.("⚙️ Initializing Pyodide Python 3.11 environment...");
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
      });

      window.pyodideInstance = pyodide;
      resolve(pyodide);
    } catch (err) {
      window.pyodideLoadingPromise = undefined;
      reject(err);
    }
  });

  return await window.pyodideLoadingPromise;
}

export async function runPython(
  code: string,
  testCases: TestCase[] = [],
  onStatusUpdate?: (status: string) => void
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: LogEntry[] = [];

  const addLog = (type: LogEntry['type'], content: string) => {
    logs.push({
      id: Math.random().toString(36).substring(7),
      type,
      content,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  try {
    const pyodide = await getPyodideInstance(onStatusUpdate);

    // Redirect Pyodide stdout & stderr
    pyodide.setStdout({
      batched: (text: string) => {
        if (text) addLog('stdout', text);
      },
    });

    pyodide.setStderr({
      batched: (text: string) => {
        if (text) addLog('stderr', text);
      },
    });

    addLog('info', '🐍 [Pyodide WASM Engine] Executing Python code...');

    // Run user code
    await pyodide.runPythonAsync(code);

    // Evaluate test cases
    const updatedTestCases: TestCase[] = [];
    for (const tc of testCases) {
      const tcStartTime = performance.now();
      try {
        const testScript = `
import json
try:
    if 'solution' in globals():
        res = solution(${tc.input})
    elif 'calculate_fibonacci' in globals():
        res = calculate_fibonacci(${tc.input})
    else:
        res = None
    json.dumps(res)
except Exception as e:
    str(e)
`;
        const result = await pyodide.runPythonAsync(testScript);
        const actualStr = String(result);
        const passed = actualStr.trim() === String(tc.expected).trim();
        updatedTestCases.push({
          ...tc,
          actual: actualStr,
          passed,
          durationMs: Math.round(performance.now() - tcStartTime),
        });
      } catch (tcErr: any) {
        updatedTestCases.push({
          ...tc,
          actual: `Error: ${tcErr.message}`,
          passed: false,
          durationMs: Math.round(performance.now() - tcStartTime),
        });
      }
    }

    const endTime = performance.now();
    return {
      logs,
      testResults: updatedTestCases,
      durationMs: Math.round(endTime - startTime),
    };
  } catch (error: any) {
    addLog('stderr', `Python Execution Error:\n${error?.message || String(error)}`);
    const endTime = performance.now();
    return {
      logs,
      testResults: testCases.map(tc => ({ ...tc, passed: false, actual: 'Execution Error' })),
      error: error?.message || String(error),
      durationMs: Math.round(endTime - startTime),
    };
  }
}
