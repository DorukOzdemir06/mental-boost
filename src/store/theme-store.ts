import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "default" | "neo-tokyo" | "arcade" | "nord" | "crimson" | "bloodborne" | "ds3" | "gta5" | "gtasa";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "default",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "mental-boost-theme",
    }
  )
);
