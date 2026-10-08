import { useSyncExternalStore } from 'react';

/**
 * Per-device display choices (relAI-UX Postavke): theme, task view and avatar figure. They only change how the app
 * looks on this device, so they live in localStorage; reads and writes tolerate storage being unavailable.
 */
export interface Prefs {
  theme: 'dark' | 'light';
  taskView: 'day' | 'week' | 'month';
  figure: 'female' | 'male';
}

const KEY = 'relai.prefs';
const DEFAULTS: Prefs = { theme: 'dark', taskView: 'week', figure: 'female' };

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let current = read();
const listeners = new Set<() => void>();

/** Sets html.light and the browser chrome colour to match the theme. */
export function applyTheme(theme: Prefs['theme'] = current.theme): void {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f8fa' : '#0b1420');
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage blocked (private mode): the choice lasts until reload.
  }
  if (key === 'theme') applyTheme();
  for (const l of listeners) l();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
