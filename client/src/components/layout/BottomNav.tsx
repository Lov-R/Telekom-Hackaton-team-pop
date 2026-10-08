import { Link, useLocation } from 'react-router';
import { useNotifications } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isNavActive } from './nav';

export function BottomNav() {
  const { pathname } = useLocation();
  const unread = useNotifications().data?.unread ?? 0;
  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4 px-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                  active ? 'font-bold text-foreground [&>svg]:text-primary' : 'font-medium text-muted-foreground',
                )}
              >
                <Icon className="size-[22px]" strokeWidth={1.7} />
                {item.to === '/vise' && unread > 0 && (
                  <span
                    className="absolute top-2 left-1/2 ml-2 size-2.5 rounded-full bg-primary ring-2 ring-background"
                    aria-label={`${unread} nepročitanih obavijesti`}
                  />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
