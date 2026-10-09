import React, { useRef } from 'react';

interface CodeEditorProps {
  code?: string;
  onChange: (newCode: string) => void;
  language: string;
  editable?: boolean;
}

export default function CodeEditor({
  code = '',
  onChange,
  language,
  editable = true,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const safeCode = code || '';
  const lines = safeCode.split('\n');
  const lineCount = lines.length;

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editable) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces
      const newCode = safeCode.substring(0, start) + '  ' + safeCode.substring(end);
      onChange(newCode);

      // Reset selection
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0d1117] text-slate-100 rounded-lg overflow-hidden border border-slate-800 shadow-inner font-mono text-sm">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-slate-800 text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500/80 inline-block"></span>
          <span className="ml-2 font-medium text-slate-300 capitalize">{language} source file</span>
        </div>
        <div className="flex items-center gap-3">
          {!editable && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              🔒 Read-only
            </span>
          )}
          <span className="text-slate-500 font-mono text-[11px]">{lineCount} lines</span>
        </div>
      </div>

      {/* Main Code Editing Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Line Numbers Bar */}
        <div
          ref={lineNumbersRef}
          className="w-11 py-3 bg-[#090d13] text-slate-600 font-mono text-xs text-right pr-3 select-none overflow-hidden border-r border-slate-800/60 leading-6"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i + 1} className="h-6 leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          value={safeCode}
          onChange={(e) => editable && onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={!editable}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={`flex-1 p-3 bg-transparent text-slate-200 font-mono text-xs leading-6 resize-none focus:outline-none whitespace-pre overflow-auto tab-4 ${
            !editable ? 'cursor-not-allowed opacity-90' : ''
          }`}
          style={{
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
          }}
        />
      </div>
    </div>
  );
}
