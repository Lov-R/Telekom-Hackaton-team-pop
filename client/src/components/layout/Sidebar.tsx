import { Link, useLocation } from 'react-router';
import { Figure, Logo } from '@/components/brand/Brand';
import { useGame, useNotifications } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { MORE_ITEMS, NAV_ITEMS, isNavActive, type NavItem } from './nav';

function SideLink({ item, active, badge = 0 }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
        active
          ? 'bg-secondary font-bold text-foreground shadow-[inset_3px_0_var(--primary)] [&>svg]:text-primary'
          : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-5" strokeWidth={1.7} />
      <span className="truncate">{item.label}</span>
      {badge > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { data: game } = useGame();
  const { pathname } = useLocation();
  const unread = useNotifications().data?.unread ?? 0;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar p-4 md:flex">
      <Link to="/" className="mb-1 px-2 pt-2">
        <Logo className="h-9" />
      </Link>
      <p className="mb-6 px-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">step by step</p>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((i) => i.to !== '/vise').map((item) => (
          <SideLink key={item.to} item={item} active={isNavActive({ ...item, also: item.also }, pathname)} />
        ))}
        <div className="my-3 border-t" />
        {MORE_ITEMS.map((item) => (
          <SideLink
            key={item.to}
            item={item}
            active={pathname.startsWith(item.to)}
            badge={item.to === '/obavijesti' ? unread : 0}
          />
        ))}
      </nav>
      {game && (
        <Link to="/profil" className="mt-4 flex items-center gap-3 rounded-xl bg-card p-3 transition-colors hover:bg-secondary">
          <Figure presence={game.presence / 100} className="h-14 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{game.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{game.mapName}</p>
            <p className="mt-0.5 text-xs font-bold text-primary tabular-nums">{game.hp} / 100 HP</p>
          </div>
        </Link>
      )}
    </aside>
  );
}
