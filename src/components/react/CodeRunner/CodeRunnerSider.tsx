import React, { useState, useEffect } from 'react';
import type { SupportedLanguage, TestCase, LogEntry, LanguageConfig } from './runners/types';
import { DEFAULT_LANGUAGES } from './runners/languages';
import { executeCode } from './runners';
import CodeEditor from './CodeEditor';

export interface CodeRunnerSiderProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  initialLanguage?: SupportedLanguage;
  availableLanguages?: SupportedLanguage[];
  initialCodeMap?: Partial<Record<SupportedLanguage, string>>;
  testCases?: TestCase[];
  editable?: boolean;
  customServerUrl?: string;
  defaultPinned?: boolean;
}

export default function CodeRunnerSider({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  title: propsTitle = 'Code Playground & Algorithm Test Engine',
  description: propsDescription = 'Viết code và chạy trực tiếp ngay trên trình duyệt web. Hỗ trợ đa ngôn ngữ JavaScript, TypeScript, Python (Pyodide Wasm), Rust (Server API) và HTML Live UI.',
  initialLanguage = 'javascript',
  availableLanguages = ['javascript', 'typescript', 'python', 'rust', 'html', 'sql'],
  initialCodeMap = {},
  testCases: propsTestCases = [
    { id: 1, name: 'Test Case 1: Simple numbers', input: '10, 25', expected: '35' },
    { id: 2, name: 'Test Case 2: Zero values', input: '0, 0', expected: '0' },
  ],
  editable: propsEditable = true,
  customServerUrl,
  defaultPinned = false,
}: CodeRunnerSiderProps) {
  // Sync prop open state to internal open state
  const [isOpenInternal, setIsOpenInternal] = useState(propsIsOpen ?? false);

  useEffect(() => {
    if (propsIsOpen !== undefined) {
      setIsOpenInternal(propsIsOpen);
    }
  }, [propsIsOpen]);

  const isOpen = isOpenInternal;

  const [isPinned, setIsPinned] = useState(defaultPinned);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);

  const [title, setTitle] = useState(propsTitle);
  const [description, setDescription] = useState(propsDescription);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(
    initialLanguage && availableLanguages.includes(initialLanguage) ? initialLanguage : 'javascript'
  );
  const [isEditable, setIsEditable] = useState(propsEditable);

  // Per-language code state
  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>(() => {
    const map: any = {};
    availableLanguages.forEach((lang) => {
      map[lang] = initialCodeMap[lang] || DEFAULT_LANGUAGES[lang]?.defaultCode || '';
    });
    return map;
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>(propsTestCases);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'testcases' | 'preview'>('console');
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);


  // Auto-switch to preview tab when HTML language is chosen
  useEffect(() => {
    if (currentLang === 'html') {
      setActiveBottomTab('preview');
    }
  }, [currentLang]);

  // Window Custom Event Listener (Allows opening Sider from ANY button/script)
  useEffect(() => {
    const handleGlobalOpen = (e: CustomEvent) => {
      if (e.detail) {
        if (e.detail.title) setTitle(e.detail.title);
        if (e.detail.description) setDescription(e.detail.description);
        if (e.detail.language && availableLanguages.includes(e.detail.language)) {
          setCurrentLang(e.detail.language);
        }
        if (e.detail.code) {
          const targetLang = e.detail.language || currentLang;
          setCodeMap((prev) => ({ ...prev, [targetLang]: e.detail.code }));
        }
        if (e.detail.testCases) {
          setTestCases(e.detail.testCases);
        }
      }
      setIsOpenInternal(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-code-runner' as any, handleGlobalOpen);
      return () => {
        window.removeEventListener('open-code-runner' as any, handleGlobalOpen);
      };
    }
  }, [availableLanguages, currentLang]);

  const handleClose = () => {
    setIsOpenInternal(false);
    if (propsOnClose) propsOnClose();
  };

  const handleCodeChange = (newCode: string) => {
    setCodeMap((prev) => ({
      ...prev,
      [currentLang]: newCode,
    }));
  };

  const handleResetCode = () => {
    const defaultCode = initialCodeMap[currentLang] || DEFAULT_LANGUAGES[currentLang]?.defaultCode || '';
    setCodeMap((prev) => ({
      ...prev,
      [currentLang]: defaultCode,
    }));
    setLogs([]);
  };

  const handleCopyCode = async () => {
    const activeCode = codeMap[currentLang] || '';
    try {
      await navigator.clipboard.writeText(activeCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = activeCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setStatusMessage(`Running ${DEFAULT_LANGUAGES[currentLang]?.name}...`);

    const currentCode = codeMap[currentLang] || '';
    const res = await executeCode(currentLang, currentCode, testCases, {
      customServerUrl,
      onStatusUpdate: (msg) => setStatusMessage(msg),
    });

    setLogs(res.logs);
    setTestCases(res.testResults);
    setIsExecuting(false);
    setStatusMessage(null);

    // Expand bottom panel if collapsed
    if (isBottomCollapsed) {
      setIsBottomCollapsed(false);
    }
  };

  const activeLangConfig: LanguageConfig = DEFAULT_LANGUAGES[currentLang];

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 top-0 left-0 w-screen h-screen z-[999999] flex justify-end font-sans transition-all duration-300 ${
        isPinned ? 'pointer-events-none' : 'bg-slate-950/80 backdrop-blur-md pointer-events-auto'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPinned) {
          handleClose();
        }
      }}
    >
      {/* Sider Main Drawer */}
      <div
        className={`pointer-events-auto flex flex-col bg-[#0f172a] text-slate-100 shadow-2xl border-l border-slate-800 transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full'
            : isPinned
            ? 'w-full lg:w-[65vw] xl:w-[55vw] h-full shadow-indigo-500/10'
            : 'w-full md:w-[85vw] lg:w-[70vw] xl:w-[60vw] h-full'
        }`}
      >
        {/* Top Title & Toolbar Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b] border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-xl shrink-0">{activeLangConfig?.icon || '💻'}</span>
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-100 truncate leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Engine: <span className="text-indigo-400 font-medium">{activeLangConfig?.description}</span>
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Left Panel */}
            <button
              type="button"
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              title={showLeftPanel ? 'Thu nhỏ bảng mô tả (Left Panel)' : 'Mở bảng mô tả (Left Panel)'}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                showLeftPanel
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>

            {/* Toggle Pin Drawer */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Bỏ ghim Popup (Chế độ Modal Overlay)' : 'Ghim Popup vào bên phải (Pinned Sider)'}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isPinned
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
              className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 5l5 5m0 0l-5 0m5 0l0-5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>

            {/* Close Drawer */}
            <button
              type="button"
              onClick={handleClose}
              title="Đóng cửa sổ"
              className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 ml-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Options & Problem Description */}
          {showLeftPanel && (
            <div className="w-full md:w-5/12 lg:w-4/12 bg-[#131b2e] border-r border-slate-800 p-4 overflow-y-auto flex flex-col gap-4 text-slate-300 text-xs">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📌</span> Mô Tả & Hướng Dẫn
                </h4>
                <div className="text-slate-300 leading-relaxed space-y-2 whitespace-pre-line">
                  {description}
                </div>
              </div>

              {/* Execution Options & Configurations */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>⚙️ Cấu Hình Chạy</span>
                </h4>

                {/* Edit code permission checkbox */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 cursor-pointer select-none hover:bg-slate-800">
                  <span className="text-slate-300 font-medium">Cho phép chỉnh sửa code</span>
                  <input
                    type="checkbox"
                    checked={isEditable}
                    onChange={(e) => setIsEditable(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600 cursor-pointer"
                  />
                </label>

                <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-[11px] text-indigo-200">
                  💡 <b>Mẹo:</b> Nhấn nút <b>Run Code</b> ở góc trên bên phải vùng code để tiến hành thực thi & kiểm thử các Test Cases.
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="mt-auto bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center justify-between font-mono">
                  <span>Multi-Language Engine</span>
                  <span className="text-emerald-400 font-bold">Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel: Code Area & Interactive Controls */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
            {/* Code Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#161b22] border-b border-slate-800">
              {/* Language Selector Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="lang-select" className="text-xs font-semibold text-slate-400 shrink-0">
                  Ngôn ngữ:
                </label>
                <select
                  id="lang-select"
                  value={currentLang}
                  onChange={(e) => setCurrentLang(e.target.value as SupportedLanguage)}
                  className="bg-slate-800 text-slate-100 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {availableLanguages.map((langKey) => (
                    <option key={langKey} value={langKey}>
                      {DEFAULT_LANGUAGES[langKey]?.icon} {DEFAULT_LANGUAGES[langKey]?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Control Buttons (Run, Reset, Copy) */}
              <div className="flex items-center gap-2">
                {/* Copy button */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Sao chép mã nguồn hiện tại"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  {isCopied ? (
                    <span className="text-emerald-400 font-bold">✓ Copied</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={handleResetCode}
                  title="Khôi phục code ban đầu"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>

                {/* Run Code Button */}
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isExecuting}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
                    isExecuting
                      ? 'bg-indigo-600/50 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-600/20'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {statusMessage ? statusMessage : 'Running...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Run Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Editor Section */}
            <div className="flex-1 p-2 overflow-hidden flex flex-col">
              <CodeEditor
                code={codeMap[currentLang] || ''}
                onChange={handleCodeChange}
                language={currentLang}
                editable={isEditable}
              />
            </div>

            {/* Bottom Debug / Output / Test Case Section */}
            <div
              className={`bg-[#090d13] border-t border-slate-800 flex flex-col transition-all duration-300 ${
                isBottomCollapsed ? 'h-10' : 'h-52 md:h-64'
              }`}
            >
              {/* Bottom Header Bar & Tabs */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-slate-800 text-xs select-none">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {/* Console Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBottomTab('console');
                      setIsBottomCollapsed(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeBottomTab === 'console' && !isBottomCollapsed
                        ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>💬</span> Logs / Console
                    {logs.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
                        {logs.length}
                      </span>
                    )}
                  </button>

                  {/* Test Cases Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBottomTab('testcases');
                      setIsBottomCollapsed(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeBottomTab === 'testcases' && !isBottomCollapsed
                        ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🧪</span> Test Cases
                    {testCases.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                        {testCases.filter((t) => t.passed).length}/{testCases.length}
                      </span>
                    )}
                  </button>

                  {/* HTML Live Preview Tab (if language is HTML) */}
                  {currentLang === 'html' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBottomTab('preview');
                        setIsBottomCollapsed(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        activeBottomTab === 'preview' && !isBottomCollapsed
                          ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>🌐</span> Live Preview
                    </button>
                  )}
                </div>

                {/* Bottom Collapse Toggle & Clear button */}
                <div className="flex items-center gap-2">
                  {logs.length > 0 && activeBottomTab === 'console' && !isBottomCollapsed && (
                    <button
                      type="button"
                      onClick={() => setLogs([])}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                    >
                      Clear Logs
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}
                    title={isBottomCollapsed ? 'Mở rộng Debug Panel' : 'Thu nhỏ Debug Panel'}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isBottomCollapsed ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bottom Body Area */}
              {!isBottomCollapsed && (
                <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-200">
                  {activeBottomTab === 'console' && (
                    <div className="space-y-1.5">
                      {logs.length === 0 ? (
                        <div className="text-slate-500 italic py-4 text-center select-none">
                          Bấm "Run Code" để bắt đầu thực thi mã nguồn và xem stdout logs ở đây...
                        </div>
                      ) : (
                        logs.map((log) => (
                          <div
                            key={log.id}
                            className={`flex items-start gap-2 p-1.5 rounded text-xs leading-relaxed font-mono ${
                              log.type === 'stderr'
                                ? 'bg-rose-950/30 text-rose-300 border-l-2 border-rose-500'
                                : log.type === 'info'
                                ? 'bg-sky-950/30 text-sky-300 border-l-2 border-sky-500'
                                : log.type === 'success'
                                ? 'bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500'
                                : 'text-slate-200 border-l-2 border-slate-700'
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 shrink-0 select-none">
                              [{log.timestamp}]
                            </span>
                            <pre className="flex-1 whitespace-pre-wrap font-mono">{log.content}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeBottomTab === 'testcases' && (
                    <div className="space-y-2">
                      {testCases.map((tc) => (
                        <div
                          key={tc.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between font-sans">
                            <span className="font-semibold text-slate-200">{tc.name}</span>
                            {tc.passed !== undefined && (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  tc.passed
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {tc.passed ? '✓ Passed' : '✗ Failed'}{' '}
                                {tc.durationMs !== undefined && `(${tc.durationMs}ms)`}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] mt-1">
                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block font-sans text-[10px]">Input:</span>
                              <code>{tc.input}</code>
                            </div>
                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block font-sans text-[10px]">Expected:</span>
                              <code>{tc.expected}</code>
                            </div>
                          </div>
                          {tc.actual && (
                            <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px] mt-1">
                              <span className="text-slate-400 block font-sans text-[10px]">Actual Output:</span>
                              <code className={tc.passed ? 'text-emerald-300' : 'text-rose-300'}>
                                {tc.actual}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeBottomTab === 'preview' && (
                    <div className="w-full h-full min-h-[160px] bg-white rounded-lg overflow-hidden border border-slate-700">
                      <iframe
                        title="HTML Live UI Preview"
                        srcDoc={codeMap.html || ''}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-modals"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
