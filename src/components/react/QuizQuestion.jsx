import React, { useState, useEffect, useRef } from 'react';

export default function QuizQuestion({
  title,
  question,
  media,
  options = [],
  correct,
  correctAnswer,
  explanation,
  multiple = false,
}) {
  // Normalize correct answer(s) into an array of indices
  const normalizeCorrect = () => {
    const raw = correct !== undefined ? correct : correctAnswer;
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === 'number') return [raw];
    if (typeof raw === 'string') {
      // If passed as "0,2" or "A, C" or index number string
      if (raw.includes(',')) {
        return raw.split(',').map((s) => s.trim()).map(Number);
      }
      const parsed = Number(raw);
      if (!isNaN(parsed)) return [parsed];
    }
    return [0];
  };

  const correctIndices = normalizeCorrect();
  const isMulti = multiple || correctIndices.length > 1;

  const [selected, setSelected] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const containerRef = useRef(null);

  // --- Out-of-focus detection (Tự động kiểm tra khi click ra ngoài câu hỏi trong trang) ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSelected((prevSelected) => {
          if (prevSelected.length > 0 && !isChecked) {
            setIsChecked(true);
          }
          return prevSelected;
        });
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isChecked]);

  // Handle option selection
  const handleSelect = (index) => {
    if (isChecked) return; // Khóa không cho chọn khi đã check

    if (isMulti) {
      if (selected.includes(index)) {
        setSelected(selected.filter((i) => i !== index));
      } else {
        setSelected([...selected, index]);
      }
    } else {
      setSelected([index]);
    }
  };

  // Toggle nút xem đáp án ở góc trên bên phải
  const handleToggleShowAnswer = (e) => {
    e.stopPropagation();
    const nextState = !showAnswer;
    setShowAnswer(nextState);
    if (nextState) {
      setIsChecked(true);
    }
  };

  // Reset câu hỏi
  const handleReset = () => {
    setSelected([]);
    setIsChecked(false);
    setShowAnswer(false);
  };

  // Kiểm tra đáp án người dùng chọn có chính xác không
  const isCorrect =
    selected.length === correctIndices.length &&
    selected.every((val) => correctIndices.includes(val));

  // Render media (ảnh hoặc video)
  const renderMedia = () => {
    if (!media) return null;

    const mediaUrl = typeof media === 'string' ? media : media.url;
    const isVideo =
      mediaUrl.endsWith('.mp4') ||
      mediaUrl.endsWith('.webm') ||
      mediaUrl.includes('youtube.com') ||
      mediaUrl.includes('youtu.be') ||
      (typeof media === 'object' && media.type === 'video');

    if (isVideo) {
      if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
        const embedUrl = mediaUrl.replace('watch?v=', 'embed/');
        return (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 border border-slate-700/50 shadow-md">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Media preview"
            ></iframe>
          </div>
        );
      }
      return (
        <div className="w-full rounded-xl overflow-hidden mb-4 border border-slate-700/50 shadow-md bg-black">
          <video src={mediaUrl} controls className="w-full max-h-80 object-contain mx-auto" />
        </div>
      );
    }

    return (
      <div className="w-full rounded-xl overflow-hidden mb-4 border border-slate-700/50 shadow-md bg-slate-900/50 flex justify-center">
        <img src={mediaUrl} alt="Illustration" className="max-h-80 object-contain rounded-xl" />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`my-6 relative rounded-2xl border transition-all duration-300 p-5 sm:p-6 shadow-xl backdrop-blur-md ${
        isChecked
          ? isCorrect
            ? 'bg-emerald-950/30 border-emerald-500/50 shadow-emerald-500/10'
            : 'bg-rose-950/30 border-rose-500/50 shadow-rose-500/10'
          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40'
      }`}
    >
       {/* Header: Title / Badge & Nút "Hiện đáp án" ở góc trên bên phải  */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {title && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {title}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {isMulti ? 'Chọn nhiều đáp án' : 'Chọn 1 đáp án'}
          </span>
        </div>

        {/* Nút hiển thị đáp án ở góc trên bên phải câu hỏi  */}
        <button
          type="button"
          onClick={handleToggleShowAnswer}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shrink-0 ${
            showAnswer
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title="Bấm để xem đáp án đúng"
        >
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span>{showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}</span>
        </button>
      </div>

      {/* Media (nếu có)  */}
      {renderMedia()}

      {/* Question Text (nếu có)  */}
      {question && (
        <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-5 leading-snug">
          {question}
        </h3>
      )}

      {/* Options List */}
      <div className="space-y-3 mb-5">
        {options.map((option, idx) => {
          const optText = typeof option === 'string' ? option : option.text;
          const isSelected = selected.includes(idx);
          const isCorrectOpt = correctIndices.includes(idx);

          let optionStyle = 'bg-slate-800/50 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600';

          if (isChecked) {
            if (isCorrectOpt) {
              optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-medium shadow-md shadow-emerald-500/10';
            } else if (isSelected && !isCorrectOpt) {
              optionStyle = 'bg-rose-500/20 border-rose-500 text-rose-200 font-medium shadow-md shadow-rose-500/10';
            } else {
              optionStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
            }
          } else if (isSelected) {
            optionStyle = 'bg-indigo-600/30 border-indigo-500 text-indigo-100 font-medium shadow-lg shadow-indigo-500/20';
          }

          return (
            <div
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${optionStyle}`}
            >
              {/* <!-- Checkbox / Radio indicator --> */}
              <div
                className={`w-5 h-5 rounded-${isMulti ? 'md' : 'full'} border flex items-center justify-center shrink-0 transition-colors ${
                  isChecked
                    ? isCorrectOpt
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : isSelected
                      ? 'bg-rose-500 border-rose-400 text-white'
                      : 'border-slate-700'
                    : isSelected
                    ? 'bg-indigo-500 border-indigo-400 text-white'
                    : 'border-slate-600 bg-slate-800'
                }`}
              >
                {isChecked ? (
                  isCorrectOpt ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isSelected ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : null
                ) : isSelected ? (
                  isMulti ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )
                ) : null}
              </div>

              {/* <!-- Option Label --> */}
              <span className="text-sm sm:text-base leading-relaxed flex-1">{optText}</span>
            </div>
          );
        })}
      </div>

      {/* <!-- Action Footer & Result Banner -->   */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        {!isChecked ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Chọn đáp án và click ra ngoài câu hỏi để kiểm tra kết quả.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Chính xác!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Chưa chính xác!
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm lại
            </button>
          </div>
        )}
      </div>

      {/* <!-- Explanation Box (khi đã check hoặc xem đáp án) --> */}
      {(isChecked || showAnswer) && explanation && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-xs sm:text-sm text-slate-300 space-y-1 animate-fadeIn">
          <div className="font-bold text-indigo-400 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Giải thích chi tiết:
          </div>
          <p className="leading-relaxed text-slate-300">{explanation}</p>
        </div>
      )}
    </div>
  );
}
