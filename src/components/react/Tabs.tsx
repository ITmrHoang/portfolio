import {
  Children,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
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

export default function Tabs({
  items,
  children,
  defaultIndex = 0,
}: TabsProps) {
  const [active, setActive] =
    useState(defaultIndex);

  const tabs = useMemo(() => {
    // ưu tiên items
    if (items?.length) {
      return items.map((item) => ({
        title: item.title,
        content: item.content,
      }));
    }

    return Children.toArray(
      children
    ).map((child) => {
      const tab =
        child as ReactElement<ChildTabProps>;

      return {
        title: tab.props.title,
        content: tab.props.children,
      };
    });
  }, [items, children]);

  if (!tabs.length) {
    return null;
  }

  return (
    <div className="tabs">
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <button
            key={tab.title}
            className={
              active === index
                ? "active"
                : ""
            }
            onClick={() =>
              setActive(index)
            }
          >
            {tab.title}
          </button>
        ))}
      </div>

      <div className="tabs-content">
        {tabs[active]?.content}
      </div>
    </div>
  );
}