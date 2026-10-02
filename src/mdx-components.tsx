import type { MDXComponents } from 'mdx/types';

import Callout from "./components/react/Callout";
import QuizQuestion from "./components/react/QuizQuestion";
import Tabs from "./components/react/Tabs";
import Tab from "./components/react/Tab";
import Typewriter from "./components/react/Typewriter";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    QuizQuestion,
    Tabs,
    Tab,
    Typewriter,
  };
}
