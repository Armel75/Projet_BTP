import React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gb-border bg-gb-surface-solid px-2 py-1.5">
      <div className="hidden sm:flex items-center gap-1.5 text-gb-muted">
        <Monitor className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-wide">Apparence</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          title="Thème clair"
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            theme === "light"
              ? "bg-gb-primary text-gb-inverse"
              : "text-gb-muted hover:bg-gb-surface-hover hover:text-gb-text"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Clair</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          title="Thème sombre"
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            theme === "dark"
              ? "bg-gb-primary text-gb-inverse"
              : "text-gb-muted hover:bg-gb-surface-hover hover:text-gb-text"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Sombre</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("system")}
          title="Thème système"
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            theme === "system"
              ? "bg-gb-primary text-gb-inverse"
              : "text-gb-muted hover:bg-gb-surface-hover hover:text-gb-text"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Système</span>
        </button>
      </div>
    </div>
  );
}
