import { useEffect } from 'react';
import { Bell, CheckCircle2, PartyPopper, Share2, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { notificationTarget } from '@/hooks/social';
import { useMarkNotificationsRead, useNotifications } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import type { NotificationKind } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<NotificationKind, typeof Bell> = {
  friend_added: UserPlus,
  task_shared: Share2,
  friend_done: CheckCircle2,
  group_done: PartyPopper,
};

/** In-app notifications (friends and joint tasks). Opening the screen marks everything as read. */
export default function Notifications() {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();
  const unread = data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) markRead();
  }, [unread, markRead]);

  return (
    <>
      <PageHeader title="Obavijesti" subtitle="Što rade tvoji prijatelji." backTo="/vise" />
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError || !data ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nema obavijesti"
          description="Kad prijatelj riješi zajednički zadatak ili ti nešto podijeli, vidjet ćeš to ovdje."
          action={
            <Link to="/prijatelji" className="text-sm font-bold text-primary">
              Pozovi prijatelje
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {data.items.map((n) => {
            const Icon = ICONS[n.kind] ?? Bell;
            return (
              <li key={n.id}>
                <Link
                  to={notificationTarget(n)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:border-primary/50',
                    !n.read && 'border-primary/40',
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm leading-snug', !n.read && 'font-bold')}>{n.text}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatDate(n.createdAt, 'd. MMM, HH:mm')}
                    </span>
                  </span>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Novo" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
