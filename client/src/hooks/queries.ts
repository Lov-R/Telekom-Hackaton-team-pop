import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { showAutoTaskToast } from '@/components/tasks/autoTaskToast';
import type {
  CalendarItem,
  CategoryCount,
  CategoryKey,
  ChatMessage,
  ChatResponse,
  CompleteResponse,
  Dashboard,
  DocumentDetail,
  DocumentItem,
  GameState,
  GhostColor,
  Accessory,
  Goal,
  Language,
  Me,
  ProfileData,
  Recommendation,
  Recurrence,
  Task,
  TaskKind,
  Tier,
  Tone,
} from '@/lib/types';

const POLL_MS = 2000;

const hasProcessing = (docs: { status: string }[] | undefined): boolean =>
  !!docs?.some((d) => d.status === 'processing');

/** Invalidate everything that depends on document-derived data. */
export function invalidateAll(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
}

function invalidateTaskRelated(qc: QueryClient): void {
  for (const key of ['tasks', 'goals', 'profile', 'dashboard', 'calendar', 'game', 'document', 'recommendations']) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/* ---------- auth ---------- */

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<Me>('/auth/login', body),
    onSuccess: (me) => qc.setQueryData(['me'], me),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; displayName: string; language: Language }) =>
      api.post<Me>('/auth/register', body),
    onSuccess: (me) => qc.setQueryData(['me'], me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(['me'], null);
    },
  });
}

/* ---------- documents ---------- */

export interface DocumentFilters {
  category?: CategoryKey | '';
  subcategory?: string;
  q?: string;
}

export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filters.category) p.set('category', filters.category);
      if (filters.subcategory) p.set('subcategory', filters.subcategory);
      if (filters.q) p.set('q', filters.q);
      const qs = p.toString();
      return api.get<DocumentItem[]>(`/documents${qs ? `?${qs}` : ''}`);
    },
    refetchInterval: (q) => (hasProcessing(q.state.data) ? POLL_MS : false),
  });
}

/**
 * Mounted once in the shell: polls while anything is processing. When a document finishes, refreshes all data
 * and announces the task the agent added from it, with Poništi and Uredi (SRS §5.3).
 */
export function useProcessingWatcher(): void {
  const qc = useQueryClient();
  const { data } = useDocuments({});
  const previous = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!data) return;
    const now = new Set(data.filter((d) => d.status === 'processing').map((d) => d.id));
    const finished = [...previous.current].filter((id) => !now.has(id));
    previous.current = now;
    if (finished.length === 0) return;
    void invalidateAll(qc);
    for (const id of finished) {
      void api
        .get<DocumentDetail>(`/documents/${id}`)
        .then((doc) => {
          const added = doc.tasks.find((t) => t.source === 'document' && t.status !== 'done');
          if (doc.status === 'ready' && added) showAutoTaskToast(added, { documentTitle: doc.title });
        })
        .catch(() => undefined);
    }
  }, [data, qc]);
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get<DocumentDetail>(`/documents/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? POLL_MS : false),
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<CategoryCount[]>('/categories') });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<DocumentItem>('/documents', file),
    onSuccess: () => void invalidateAll(qc),
  });
}

export function usePatchDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; category?: CategoryKey; subcategory?: string | null }) =>
      api.patch<DocumentDetail>(`/documents/${id}`, body),
    onSuccess: () => void invalidateAll(qc),
  });
}

export function useReprocessDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DocumentItem>(`/documents/${id}/reprocess`),
    onSuccess: () => void invalidateAll(qc),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/documents/${id}`),
    onSuccess: () => void invalidateAll(qc),
  });
}

/* ---------- tasks ---------- */

export type TaskFilter = 'open' | 'done' | 'overdue' | 'all';

export function useTasks(filter: TaskFilter = 'all') {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => api.get<Task[]>(filter === 'all' ? '/tasks' : `/tasks?status=${filter}`),
  });
}

export interface TaskInput {
  kind: TaskKind;
  title: string;
  description?: string | null;
  tier: Tier;
  date?: string | null;
  time?: string | null;
  dueDate?: string | null;
  recurrence?: Recurrence;
  goalId?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskInput) => api.post<Task>('/tasks', body),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

export function usePatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<TaskInput> & { id: string }) => api.patch<Task>(`/tasks/${id}`, body),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/tasks/${id}`),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

/**
 * SRS §6.6: complete with an optional proof file. A rejected proof resolves (not throws) with accepted=false,
 * so the dialog can offer "Riješi bez dokaza".
 */
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, proof }: { id: string; proof: File | null }): Promise<CompleteResponse> => {
      try {
        return await api.upload<CompleteResponse>(`/tasks/${id}/complete`, proof, 'proof');
      } catch (e) {
        if (e instanceof ApiError && e.status === 422 && e.body) return e.body as CompleteResponse;
        throw e;
      }
    },
    onSuccess: (res) => {
      qc.setQueryData(['game'], (old: GameState | undefined) => (old ? res.game : old));
      invalidateTaskRelated(qc);
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () => api.get<CalendarItem[]>(`/calendar?from=${from}&to=${to}`),
  });
}

/* ---------- goals ---------- */

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => api.get<Goal[]>('/goals') });
}

export interface GoalInput {
  title: string;
  description?: string | null;
  targetDate?: string | null;
  completed?: boolean;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GoalInput) => api.post<Goal>('/goals', body),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

export function usePatchGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<GoalInput> & { id: string }) => api.patch<Goal>(`/goals/${id}`, body),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/goals/${id}`),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

/* ---------- recommendations ---------- */

export function useRecommendations() {
  return useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get<Recommendation[]>('/recommendations'),
  });
}

export function useAcceptRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) =>
      api.post<{ task: Task }>(`/recommendations/${id}/accept`, { date }),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/recommendations/${id}/dismiss`),
    onSuccess: () => invalidateTaskRelated(qc),
  });
}

/* ---------- game & profile ---------- */

export function useGame() {
  return useQuery({ queryKey: ['game'], queryFn: () => api.get<GameState>('/game') });
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: () => api.get<ProfileData>('/profile') });
}

export interface ProfileInput {
  displayName?: string;
  tone?: Tone;
  language?: Language;
  onboarded?: true;
  avatar?: { name?: string; color?: GhostColor; accessory?: Accessory };
}

export function usePatchProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) => api.patch<GameState>('/profile', body),
    onSuccess: (game) => {
      qc.setQueryData(['me'], (old: Me | null | undefined) => (old ? { ...old, game } : old));
      for (const key of ['profile', 'dashboard', 'game']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard') });
}

/* ---------- chat ---------- */

export function useChatMessages() {
  return useQuery({ queryKey: ['chat'], queryFn: () => api.get<ChatMessage[]>('/chat/messages') });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.post<ChatResponse>('/chat', { message }),
    onSuccess: (res) => {
      for (const t of res.createdTasks) showAutoTaskToast(t, { fromChat: true });
      if (res.createdTasks.length > 0) invalidateTaskRelated(qc);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['chat'] }),
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del('/chat/messages'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['chat'] }),
  });
}
