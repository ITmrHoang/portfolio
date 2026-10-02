import {
  Children,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
    useCallback,
} from "react";

interface TabItem {
  title: string;
  content: ReactNode;
}

interface ChildTabProps {
  title: string;
  children: ReactNode;
}

interface TabsProps {
  items?: TabItem[];
  children?: ReactNode;
  defaultIndex?: number;
}

/** Lấy plain text từ ReactNode (đệ quy) để copy */
function extractText(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (typeof node === "object" && "props" in (node as object)) {
        const el = node as ReactElement<{ children?: ReactNode }>;
        return extractText(el.props?.children);
    }
    return "";
}

export default function Tabs({
  items,
  children,
  defaultIndex = 0,
}: TabsProps) {
    const [active, setActive] = useState(defaultIndex);
    const [copied, setCopied] = useState(false);

  const tabs = useMemo(() => {
    // ưu tiên items
    if (items?.length) {
      return items.map((item) => ({
        title: item.title,
        content: item.content,
      }));
    }

      return Children.toArray(children).map((child) => {
          const tab = child as ReactElement<ChildTabProps>;
      return {
        title: tab.props.title,
        content: tab.props.children,
      };
    });
  }, [items, children]);

    const handleCopy = useCallback(async () => {
        const currentContent = tabs[active]?.content;
        const text = extractText(currentContent);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback cho môi trường không hỗ trợ clipboard API
        }
  }, [tabs, active]);

    if (!tabs.length) return null;

  return (
      <div className="my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-md bg-slate-900/80 text-sm">
          {/* Header: Tabs + Copy button */}
          <div className="flex items-center justify-between bg-slate-800/80 border-b border-slate-700/50 px-1">
              {/* Tab Buttons */}
              <div className="flex items-center overflow-x-auto">
                  {tabs.map((tab, index) => (
                      <button
                          key={tab.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-b-2 focus:outline-none ${active === index
                          ? "text-indigo-300 border-indigo-500 bg-slate-900/60"
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600"
                      }`}
              >
                  {tab.title}
              </button>
          ))}
              </div>

              {/* Copy Button - copy nội dung tab đang active */}
              <button
                  type="button"
                  onClick={handleCopy}
                  title="Sao chép nội dung tab hiện tại"
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 mx-2 rounded-lg border transition-all duration-200 shrink-0 ${copied
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-700/50 text-slate-300 border-slate-600/60 hover:bg-slate-700 hover:text-white"
                      }`}
              >
                  {copied ? (
                      <>
                          <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M5 13l4 4L19 7"
                              />
                          </svg>
                          Đã chép!
                      </>
                  ) : (
                      <>
                          <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                          </svg>
                          Copy
                      </>
                  )}
              </button>
      </div>

          {/* Content Area */}
          <div className="p-4 text-slate-200">
        {tabs[active]?.content}
      </div>
    </div>
  );
}