import { useSyncExternalStore } from "react";

// Light, dark, or whatever the device is set to. The choice is kept in this browser only.
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_CHOICES: ThemeChoice[] = ["light", "dark", "system"];

// index.html reads the same key before the page paints, so keep the two in step.
const STORAGE_KEY = "business-os-theme";
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

const read = (): ThemeChoice => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
};

let choice = read();

export const isDark = (value: ThemeChoice = choice) => value === "dark" || (value === "system" && systemDark().matches);

const apply = () => {
  document.documentElement.classList.toggle("dark", isDark());
  listeners.forEach((listener) => listener());
};

export const setTheme = (next: ThemeChoice) => {
  choice = next;
  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private windows may refuse storage; the choice still holds until the tab closes.
  }
  apply();
};

// Follows the device when it switches between light and dark, e.g. at sunset.
systemDark().addEventListener("change", () => {
  if (choice === "system") apply();
});

// Another tab changed the choice.
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  choice = read();
  apply();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

// `choice` is what the person picked; `dark` is what's on screen now.
export const useTheme = () => {
  const current = useSyncExternalStore(subscribe, () => choice);
  const dark = useSyncExternalStore(subscribe, () => isDark());
  return { choice: current, dark };
};
