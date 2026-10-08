import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAddFriend, useNotifications } from '@/hooks/queries';
import { takePendingInvite } from '@/lib/invite';
import type { AppNotification } from '@/lib/types';

export const notificationTarget = (n: AppNotification): string =>
  n.kind === 'friend_added' ? '/prijatelji' : n.taskId ? '/zadaci' : '/obavijesti';

/** Mounted once in the shell: announces notifications that arrive while the app is open. */
export function useNotificationWatcher(): void {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useNotifications();
  const seen = useRef<Set<string> | null>(null);
  const messages = useRef<number | null>(null);
  const { pathname } = useLocation();
  const inChat = pathname.startsWith('/prijatelji/');
  useEffect(() => {
    if (!data) return;
    const before = messages.current;
    messages.current = data.unreadMessages;
    if (before === null || data.unreadMessages <= before || inChat) return;
    void qc.invalidateQueries({ queryKey: ['friends'] });
    toast('Nova poruka od prijatelja', { action: { label: 'Otvori', onClick: () => navigate('/prijatelji') } });
  }, [data, qc, navigate, inChat]);
  useEffect(() => {
    if (!data) return;
    const ids = data.items.map((n) => n.id);
    if (seen.current === null) {
      // First load: whatever is already there is shown on the Obavijesti screen, not as toasts.
      seen.current = new Set(ids);
      return;
    }
    const fresh = data.items.filter((n) => !seen.current?.has(n.id) && !n.read);
    for (const id of ids) seen.current.add(id);
    if (fresh.length === 0) return;
    // A friend's progress changes the shared tasks and the friends list.
    for (const key of ['tasks', 'calendar', 'friends', 'dashboard']) void qc.invalidateQueries({ queryKey: [key] });
    for (const n of fresh.slice(0, 3).reverse()) {
      toast(n.text, { action: { label: 'Otvori', onClick: () => navigate(notificationTarget(n)) } });
    }
  }, [data, qc, navigate]);
}

/** Connects the friend from an invite link once the user is signed in. */
export function usePendingInvite(): void {
  const add = useAddFriend();
  const navigate = useNavigate();
  const { mutate } = add;
  useEffect(() => {
    const code = takePendingInvite();
    if (!code) return;
    mutate(code, {
      onSuccess: (r) => {
        toast.success(r.added ? `${r.friend.displayName} ti je sada prijatelj.` : `${r.friend.displayName} ti je već prijatelj.`);
        navigate('/prijatelji', { replace: true });
      },
      onError: (e) => {
        toast.error(e.message);
        navigate('/prijatelji', { replace: true });
      },
    });
  }, [mutate, navigate]);
}
