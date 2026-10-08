/** relAI 0.10.1 integration boundary for a future Lovable Cloud adapter. Not a live API. */
export type ProofPolicy = 'none' | 'optional' | 'required';
export type TaskStatus = 'pending' | 'completed' | 'missed';
export interface Task {
  id: string; ownerId: string; title: string; dueAt: string;
  categoryId: string | null;
  importance: 1 | 2 | 3; difficulty: 1 | 2 | 3;
  status: TaskStatus; proofPossible: boolean; proofPolicy: ProofPolicy;
  proofId: string | null; calendarEventId: string | null;
}
export interface Proof {
  id: string; taskId: string; ownerId: string;
  storagePath: string; mime: 'image/jpeg'; bytes: number;
  createdAt: string; verification: 'submitted' | 'accepted' | 'rejected';
}
export interface Category {
  id: string; ownerId: string; name: string; parentId: string | null;
}
export interface DocumentMetadata {
  id: string; ownerId: string; name: string; storagePath: string;
  mime: string; bytes: number; categoryId: string | null; taskId: string | null;
  /** Date-only local-calendar value YYYY-MM-DD; null means no expiry. */
  expiresOn: string | null; pinned: boolean; createdAt: string;
}
export interface RelAICategoryBackend {
  listCategories(): Promise<Category[]>;
  createCategory(name: string, parentId: string | null): Promise<Category>;
  updateCategory(id: string, changes: Pick<Category,'name'|'parentId'>): Promise<Category>;
  updateDocumentMetadata(id: string, changes: Pick<DocumentMetadata,'categoryId'|'expiresOn'|'taskId'>): Promise<DocumentMetadata>;
}
export interface Progress {
  totalXP: number; totalSteps: number; hp: number; peakHP: number;
  weekStart: string; weeklyXP: number; weeklySteps: number;
}

export interface AvatarAppearance {
  gender: 'female' | 'male'; height: number; build: number;
  hair: string; eyes: string; hairLength: 'short' | 'medium' | 'long';
  beard: 'none' | 'short' | 'full';
}
export interface UserProfile {
  firstName: string; lastName: string; birthDate: string;
  gender: 'female' | 'male' | 'other' | 'prefer_not'; username: string;
}
/** Device/browser-only opt-in, separate from owner-synced display preferences.
 * The prototype saves only this boolean, never a password or auth token.
 * In production it configures provider session persistence; it is not authorization. */
export interface DeviceSessionPreferences {
  /** Defaults to false. */
  rememberMe: boolean;
}
export interface DisplayPreferences {
  theme: 'dark' | 'light'; taskView: 'day' | 'week' | 'month';
  /** Persist per owner; defaults to hr. UI language never rewrites user content. */
  language: 'hr' | 'en';
}
/** Future authenticated adapter. The UX prototype has no authentication session.
 * Passwords must be sent only to the selected auth provider, never profile storage. */
export interface RelAIProfileBackend {
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  saveDisplayPreferences(preferences: DisplayPreferences): Promise<void>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}
export interface AssistantMessage {
  id: string; threadId: string; role: 'user' | 'assistant'; text: string; createdAt: string;
}
export interface RelAIAssistantBackend {
  /** Authenticated Cloud function; no HP/XP or task status changes from text alone. */
  sendMessage(threadId: string, text: string, signal: AbortSignal): AsyncIterable<string>;
  listMessages(threadId: string): Promise<AssistantMessage[]>;
}
export interface NotificationPreferences {
  enabled: boolean; tone: 'supportive' | 'direct' | 'roast';
  hideTitles: boolean; timezone: string;
  quietEnabled: boolean; quietStart: number; quietEnd: number;
}
export interface CalendarConnection {
  provider: 'apple'; direction: 'read' | 'write' | 'both';
  calendarIds: string[]; lastSyncedAt: string | null;
  status: 'disconnected' | 'requesting_permission' | 'connected' | 'error';
}
export interface FutureSelfBackend {
  listTasks(): Promise<Task[]>;
  createTask(task: Omit<Task,'id'|'ownerId'|'status'|'proofId'>): Promise<Task>;
  rescheduleTask(id: string, dueAt: string): Promise<Task>;
  uploadProof(taskId: string, image: Blob): Promise<Proof>;
  removeProof(id: string): Promise<void>;
  /** Must be one server transaction; XP is never accepted from the client. */
  completeTask(id: string, idempotencyKey: string): Promise<{task:Task;progress:Progress}>;
  getProgress(): Promise<Progress>;
  saveNotificationPreferences(prefs: NotificationPreferences): Promise<void>;
  subscribePush(subscription: PushSubscriptionJSON): Promise<void>;
  unsubscribePush(endpoint: string): Promise<void>;
  requestCalendarConnection(): Promise<CalendarConnection>;
}


/** Future authorized social API; the current UI uses local sample data. */
export interface CircleMemberPreview {
  id: string; name: string; steps: number; xp: number; hp: number;
  avatar: Record<string, unknown>; self?: boolean;
}
export interface GroupMessageRecord {
  id: string; groupId: string; authorId: string; text: string; createdAt: string;
}
export interface WeeklyCircleStanding {
  groupId: string; userId: string; weekStart: string; timezone: string;
  steps: number; xp: number; rank: number;
}
