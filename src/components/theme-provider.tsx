"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (theme === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // Prevent flash by hiding until mounted, or just render children directly (slight flash on first load)
  // Rendering directly is better for SEO, the theme flash is minimal
  return <>{children}</>;
}
