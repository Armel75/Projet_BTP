import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-gb-surface hover:bg-gb-surface-hover text-gb-muted hover:text-gb-text transition-colors border border-gb-border shadow-sm"
      title="Mode clair/sombre"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
