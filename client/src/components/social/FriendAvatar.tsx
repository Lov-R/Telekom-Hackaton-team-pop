import { GHOST_COLORS } from '@/lib/labels';
import type { Friend } from '@/lib/types';

/** A friend's ghost colour with their initial (friends only see the public profile). */
export function FriendAvatar({ friend, className = 'size-11' }: { friend: Pick<Friend, 'displayName' | 'avatar'>; className?: string }) {
  const c = GHOST_COLORS[friend.avatar.color] ?? GHOST_COLORS.lavanda;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full text-base font-extrabold text-black/70 ${className}`}
      style={{ background: c.body, boxShadow: `inset 0 -4px 0 ${c.shade}` }}
      aria-hidden
    >
      {friend.displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}
