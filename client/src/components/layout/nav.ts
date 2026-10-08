import {
  Bell,
  CalendarCheck,
  Ellipsis,
  FileText,
  Map,
  MessageCircle,
  ScanLine,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Extra paths that keep this tab highlighted (screens reached from it). */
  also?: string[];
}

/** relAI-UX navigation: Mapa / Zadaci / Avatar / Više. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Mapa', icon: Map, end: true },
  { to: '/zadaci', label: 'Zadaci', icon: CalendarCheck, also: ['/kalendar'] },
  { to: '/profil', label: 'Avatar', icon: UserRound },
  { to: '/vise', label: 'Više', icon: Ellipsis, also: ['/dokumenti', '/skeniraj', '/asistent', '/prijatelji', '/obavijesti', '/postavke'] },
];

/** The "Više" screen, and the second group in the desktop sidebar. */
export const MORE_ITEMS: (NavItem & { description: string })[] = [
  { to: '/dokumenti', label: 'Dokumenti', icon: FileText, description: 'Sve tvoje. Na svom mjestu.' },
  { to: '/skeniraj', label: 'Skeniraj', icon: ScanLine, description: 'Slikaj papir, ja pročitam rokove.' },
  { to: '/asistent', label: 'Your future self assistant', icon: MessageCircle, description: 'Pitaj o svojim dokumentima.' },
  { to: '/prijatelji', label: 'Prijatelji', icon: Users, description: 'Pozovi ekipu i dijelite zadatke.' },
  { to: '/obavijesti', label: 'Obavijesti', icon: Bell, description: 'Što rade tvoji prijatelji.' },
  { to: '/postavke', label: 'Postavke', icon: Settings, description: 'Tema, pregled zadataka, avatar, račun.' },
];

export const isNavActive = (item: NavItem, pathname: string): boolean =>
  item.end
    ? pathname === item.to
    : pathname.startsWith(item.to) || !!item.also?.some((p) => pathname.startsWith(p));
