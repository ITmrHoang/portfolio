import type { LogEntry, TestCase, ExecutionResult } from './types';

export async function runJavaScript(
  code: string,
  testCases: TestCase[] = []
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
    // Transpile basic TypeScript type annotations if needed
    let cleanCode = code;
    // Strip basic TS interfaces / type annotations
    cleanCode = cleanCode
      .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '')
      .replace(/type\s+\w+\s*=[\s\S]*?;/g, '')
      .replace(/:\s*(string|number|boolean|any|void|object|unknown|never|User)(\[\])?/g, '');

    // Custom console interception
    const customConsole = {
      log: (...args: any[]) => {
        const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
        addLog('stdout', formatted);
      },
      error: (...args: any[]) => {
        const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
        addLog('stderr', formatted);
      },
      warn: (...args: any[]) => {
        const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
        addLog('info', `[WARN] ${formatted}`);
      },
      info: (...args: any[]) => {
        const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
        addLog('info', formatted);
      },
    };

    // Construct isolated function execution
    const runFn = new Function('console', 'testCases', `
      "use strict";
      ${cleanCode}
    `);

    runFn(customConsole, testCases);

    // Evaluate test cases if present
    const updatedTestCases: TestCase[] = testCases.map((tc) => {
      const tcStartTime = performance.now();
      try {
        // Look for function invocation or expression matching test case
        const evalRunner = new Function('console', `
          "use strict";
          ${cleanCode}
          if (typeof runTestCase === 'function') {
            return runTestCase(${tc.input});
          }
          if (typeof solution === 'function') {
            return solution(${tc.input});
          }
          if (typeof sum === 'function') {
            return sum(${tc.input});
          }
          return undefined;
        `);
        const result = evalRunner(customConsole);
        const actualStr = typeof result === 'object' ? JSON.stringify(result) : String(result);
        const passed = String(actualStr).trim() === String(tc.expected).trim();
        return {
          ...tc,
          actual: actualStr === 'undefined' ? 'Completed' : actualStr,
          passed,
          durationMs: Math.round(performance.now() - tcStartTime),
        };
      } catch (err: any) {
        return {
          ...tc,
          actual: `Error: ${err.message}`,
          passed: false,
          durationMs: Math.round(performance.now() - tcStartTime),
        };
      }
    });

    const endTime = performance.now();
    return {
      logs,
      testResults: updatedTestCases,
      durationMs: Math.round(endTime - startTime),
    };
  } catch (error: any) {
    addLog('stderr', `Runtime Error: ${error?.message || String(error)}`);
    const endTime = performance.now();
    return {
      logs,
      testResults: testCases.map(tc => ({ ...tc, passed: false, actual: 'Runtime Error' })),
      error: error?.message || String(error),
      durationMs: Math.round(endTime - startTime),
    };
  }
}
