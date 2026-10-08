import { NavLink, Link } from 'react-router';
import { useGame } from '@/hooks/queries';
import { Ghost } from '@/components/ghost/Ghost';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, SIDEBAR_EXTRA } from './nav';

export function Sidebar() {
  const { data: game } = useGame();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar p-4 md:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 px-2 pt-2">
        <img src="/logo.svg" alt="" className="size-8 rounded-lg" />
        <span className="text-lg font-semibold">relAI</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {[...NAV_ITEMS, ...SIDEBAR_EXTRA].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-foreground [&>svg]:text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      {game && (
        <Link to="/" className="mt-4 flex items-center gap-3 rounded-lg bg-card p-3 transition-colors hover:bg-secondary">
          <Ghost
            presence={game.presence}
            color={game.avatar.color}
            accessory={game.avatar.accessory}
            phaseIndex={game.phaseIndex}
            still
            className="size-12 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{game.avatar.name}</p>
            <p className="truncate text-xs text-muted-foreground">{game.mapName}</p>
            <p className="mt-0.5 font-mono text-xs text-primary tabular-nums">{game.hp} / 100 HP</p>
          </div>
        </Link>
      )}
    </aside>
  );
}
