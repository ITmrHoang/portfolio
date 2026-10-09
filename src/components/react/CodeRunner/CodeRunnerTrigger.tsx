import React, { useState } from 'react';
import type { SupportedLanguage, TestCase } from './runners/types';
import CodeRunnerSider from './CodeRunnerSider';

interface CodeRunnerTriggerProps {
  buttonText?: string;
  title?: string;
  description?: string;
  language?: SupportedLanguage;
  code?: string;
  testCases?: TestCase[];
  variant?: 'button' | 'badge' | 'card';
}

export default function CodeRunnerTrigger({
  buttonText = '⚡ Chạy & Chạy thử Code trên Web Popup Sider',
  title = 'Trình Chạy Mã Nguồn Đa Ngôn Ngữ (Code Runner Popup)',
  description = 'Chạy trực tiếp mã nguồn JavaScript, TypeScript, Python (Pyodide Wasm), Rust (Server API), SQL hoặc HTML UI trên giao diện Sidebar Popup.',
  language = 'javascript',
  code,
  testCases,
  variant = 'button',
}: CodeRunnerTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('click')
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('open-code-runner', {
        detail: {
          title,
          description,
          language,
          code,
          testCases,
        },
      });
      window.dispatchEvent(event);
    }

    setIsOpen(true);
  };

  return (
    <>
      {variant === 'badge' ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-full transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          <span>⚡</span> {buttonText}
        </button>
      ) : variant === 'card' ? (
        <div className="my-6 p-5 rounded-xl bg-slate-900 border border-indigo-900/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>🚀</span> {title}
            </h4>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="shrink-0 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {buttonText}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="my-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all cursor-pointer active:scale-95"
        >
          <span>⚡</span> {buttonText}
        </button>
      )}

      {isOpen && (
        <CodeRunnerSider
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={title}
          description={description}
          initialLanguage={language}
          initialCodeMap={code ? { [language]: code } : undefined}
          testCases={testCases}
        />
      )}
    </>
  );
}
