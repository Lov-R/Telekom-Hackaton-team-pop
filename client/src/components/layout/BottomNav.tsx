import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav';

export function BottomNav() {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-[22px]" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
