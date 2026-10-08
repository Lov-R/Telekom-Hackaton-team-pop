import { useSyncExternalStore } from 'react';
import type { Task } from './types';

/**
 * One edit dialog and one complete dialog for the whole app, so toasts (Uredi), the assistant and
 * every task list open the same UI. Mounted once by <TaskDialogs /> in the shell.
 */
interface State {
  editing: Task | null;
  creating: { goalId?: string | null } | null;
  completing: Task | null;
  sharing: Task | null;
}

let state: State = { editing: null, creating: null, completing: null, sharing: null };
const listeners = new Set<() => void>();

function set(next: Partial<State>): void {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export const openTaskEditor = (task: Task): void => set({ editing: task, creating: null });
export const openNewTask = (opts: { goalId?: string | null } = {}): void => set({ creating: opts, editing: null });
export const openCompleteTask = (task: Task): void => set({ completing: task });
export const closeTaskEditor = (): void => set({ editing: null, creating: null });
export const closeCompleteTask = (): void => set({ completing: null });
export const openShareTask = (task: Task): void => set({ sharing: task });
export const closeShareTask = (): void => set({ sharing: null });

export function useTaskDialogs(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
