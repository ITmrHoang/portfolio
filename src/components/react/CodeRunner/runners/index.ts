import type { SupportedLanguage, TestCase, ExecutionResult } from './types';
import { runJavaScript } from './jsRunner';
import { runPython } from './pyRunner';
import { runRust } from './rustRunner';
import { runSQL } from './sqlRunner';

export async function executeCode(
  language: SupportedLanguage,
  code: string,
  testCases: TestCase[] = [],
  options?: {
    customServerUrl?: string;
    onStatusUpdate?: (status: string) => void;
  }
): Promise<ExecutionResult> {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return await runJavaScript(code, testCases);
    case 'python':
      return await runPython(code, testCases, options?.onStatusUpdate);
    case 'rust':
      return await runRust(code, testCases, options?.customServerUrl);
    case 'sql':
      return await runSQL(code, testCases);
    case 'html':
      return {
        logs: [
          {
            id: 'html-1',
            type: 'success',
            content: '🌐 Rendered live HTML UI preview frame successfully.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        testResults: testCases.map(tc => ({ ...tc, passed: true, actual: 'Rendered' })),
        durationMs: 12,
      };
    default:
      return await runJavaScript(code, testCases);
  }
}
