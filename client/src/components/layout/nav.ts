import {
  CalendarDays,
  CheckSquare,
  FileText,
  Map,
  MessageCircle,
  ScanLine,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** SRS §5: five screens in the bottom bar. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Mapa', icon: Map, end: true },
  { to: '/dokumenti', label: 'Dokumenti', icon: FileText },
  { to: '/asistent', label: 'Asistent', icon: MessageCircle },
  { to: '/kalendar', label: 'Kalendar', icon: CalendarDays },
  { to: '/profil', label: 'Profil', icon: UserRound },
];

/** Reachable from the sidebar on desktop and from links inside screens on mobile. */
export const SIDEBAR_EXTRA: NavItem[] = [
  { to: '/zadaci', label: 'Zadaci i ciljevi', icon: CheckSquare },
  { to: '/skeniraj', label: 'Skeniraj', icon: ScanLine },
];
