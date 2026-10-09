export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'rust' | 'html' | 'sql';

export type LogEntry = {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error';
  content: string;
  timestamp: string;
}

export type TestCase = {
  id: string | number;
  name: string;
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
  durationMs?: number;
}

export type  ExecutionResult = {
  logs: LogEntry[];
  testResults: TestCase[];
  error?: string;
  durationMs: number;
}

export type LanguageConfig = {  
  id: SupportedLanguage;
  name: string;
  icon: string;
  extension: string;
  defaultCode: string;
  executionType: 'browser-js' | 'browser-pyodide' | 'server-rust' | 'html-preview' | 'browser-sql';
  description: string;
}
