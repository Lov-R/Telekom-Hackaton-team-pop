/** SRS §5.2 categories. */
export type CategoryKey =
  | 'zdravstvo'
  | 'racuni'
  | 'ugovori'
  | 'vozilo'
  | 'osobni_dokumenti'
  | 'skola_vrtic'
  | 'karte_dogadaji'
  | 'bonovi'
  | 'ostalo';

/** pending: not read by the AI yet (or the last attempt failed); it is read when opened. */
export type DocStatus = 'pending' | 'processing' | 'ready';

export interface DocumentItem {
  id: string;
  title: string;
  category: CategoryKey;
  subcategory: string | null;
  docType: string | null;
  summary: string | null;
  documentDate: string | null;
  expiryDate: string | null;
  status: DocStatus;
  mimeType: string | null;
  createdAt: string;
  sizeBytes: number | null;
}

export interface KeyField {
  label: string;
  value: string;
}

/** Only on documents migrated from the old schema. */
export interface KeyDate {
  date: string;
  label: string;
  type: string;
}

export interface Person {
  name: string;
  role: string;
}

export interface DocumentDetail extends DocumentItem {
  keyFields: KeyField[];
  keyDates: KeyDate[];
  people: Person[];
  followUp: { found: boolean; title: string; source_text: string } | null;
  fullText: string | null;
  error: string | null;
  originalName: string | null;
  mimeType: string | null;
  tasks: Task[];
}

export interface CategoryCount {
  key: CategoryKey;
  label: string;
  count: number;
  subcategories: { name: string; count: number }[];
}

export type Tier = 1 | 2 | 3 | 4 | 5;
export type TaskKind = 'event' | 'deadline';
export type Recurrence = 'none' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  kind: TaskKind;
  title: string;
  description: string | null;
  tier: Tier;
  source: 'user' | 'document' | 'chat' | 'recommendation';
  sourceText: string | null;
  /** Calendar date: due date for deadlines, start date for events. */
  date: string | null;
  startAt: string | null;
  time: string | null;
  remindAt: string | null;
  dueDate: string | null;
  recurrence: Recurrence;
  status: 'open' | 'done' | 'missed';
  completedAt: string | null;
  proofReason: string | null;
  documentId: string | null;
  documentTitle: string | null;
  goalId: string | null;
  createdAt: string;
  overdue: boolean;
  /** Other members of a joint task (each has their own copy), or null when not shared. */
  shared: ShareMember[] | null;
}

export interface ShareMember {
  userId: string;
  displayName: string;
  status: 'open' | 'done' | 'missed';
  completedAt: string | null;
}

export interface Friend {
  id: string;
  displayName: string;
  avatar: { name: string; color: GhostColor; accessory: Accessory };
  mapIndex: number;
  mapName: string;
  hp: number;
  streak: number;
  presence: number;
}

export interface FriendsData {
  code: string;
  friends: Friend[];
}

export type NotificationKind = 'friend_added' | 'task_shared' | 'friend_done' | 'group_done';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  taskId: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationsData {
  unread: number;
  items: AppNotification[];
}

export interface CalendarItem extends Task {
  /** The day this (possibly recurring) task falls on. */
  occurrence: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  completed: boolean;
  progress: { done: number; total: number };
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  suggestedDate: string | null;
  ruleKey: string | null;
}

export type Mood = 'sretan' | 'dobro' | 'umoran' | 'tuzan' | 'bolestan';
export type GhostColor = 'lavanda' | 'menta' | 'breskva' | 'nebo' | 'limun';
export type Accessory = 'none' | 'sesir' | 'naocale' | 'masna' | 'kruna';
export type Tone = 'blago' | 'sarkasticno' | 'brutalno';
export type Language = 'hr' | 'en';

export interface MapMarker {
  taskId: string;
  title: string;
  tier: number;
  kind: string;
  date: string | null;
  field: number;
}

export interface GameState {
  displayName: string;
  tone: Tone;
  language: Language;
  onboarded: boolean;
  friendCode: string;
  avatar: { name: string; color: GhostColor; accessory: Accessory };
  unlockedAccessories: Accessory[];
  hp: number;
  totalHp: number;
  mapIndex: number;
  mapName: string;
  phase: string;
  phaseIndex: number;
  stars: number;
  field: number;
  presence: number;
  opacity: number;
  flicker: boolean;
  streak: number;
  boss: { id: string; title: string; tier: number; date: string | null } | null;
  markers: MapMarker[];
}

export interface Me {
  email: string;
  game: GameState;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  label: string;
  subject: string | null;
  createdAt: string;
}

export interface ProfileData {
  game: GameState;
  stats: { open: number; missed: number; documents: number; doneLast7: number };
  ledger: LedgerEntry[];
}

export interface Dashboard {
  game: GameState;
  dueTasks: Task[];
  recentDocuments: DocumentItem[];
  recommendations: Recommendation[];
}

export interface CompletionResult {
  amount: number;
  breakdown: { base: number; time: number; proof: number; streak: number; capped: boolean };
  bossDefeated: boolean;
  mapsUnlocked: number;
}

export interface CompleteResponse {
  accepted: boolean;
  reason: string | null;
  result?: CompletionResult;
  task: Task;
  game: GameState;
}

export interface Citation {
  documentId: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface ChatResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  createdTasks: Task[];
  proposedTasks: Task[];
}
