import { useState } from 'react';
import { Copy, Flame, MoreVertical, Send, UserMinus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAddFriend, useFriends, useRemoveFriend } from '@/hooks/queries';
import { inviteUrl } from '@/lib/invite';
import { FriendAvatar } from '@/components/social/FriendAvatar';

async function shareInvite(code: string): Promise<void> {
  const url = inviteUrl(code);
  const text = `Pridruži mi se na relAI-ju, moj kod je ${code}.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'relAI', text, url });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('Pozivnica kopirana. Zalijepi je prijatelju.');
  } catch {
    toast(url);
  }
}

/** F16: invite friends with a link or code; friends see each other's public profile and joint tasks. */
export default function Friends() {
  const { data, isLoading, isError, error, refetch } = useFriends();
  const add = useAddFriend();
  const remove = useRemoveFriend();
  const [code, setCode] = useState('');

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    add.mutate(c, {
      onSuccess: (r) => {
        setCode('');
        toast.success(r.added ? `${r.friend.displayName} ti je sada prijatelj.` : `${r.friend.displayName} ti je već prijatelj.`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <>
      <PageHeader title="Prijatelji" subtitle="Zajedno je lakše. Dijelite zadatke i navijajte." backTo="/vise" />
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError || !data ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">Tvoj kod</p>
                <button
                  type="button"
                  className="mt-1 flex items-center gap-1.5 font-mono text-xl tracking-widest"
                  onClick={() => void navigator.clipboard?.writeText(data.code).then(() => toast('Kod kopiran.'))}
                >
                  {data.code} <Copy className="size-4 text-muted-foreground" />
                </button>
              </div>
              <Button onClick={() => void shareInvite(data.code)}>
                <Send /> Pozovi
              </Button>
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t pt-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Kod prijatelja"
                aria-label="Kod prijatelja"
                className="font-mono tracking-widest"
                maxLength={20}
                autoCapitalize="characters"
              />
              <Button type="submit" variant="secondary" disabled={add.isPending || !code.trim()}>
                <UserPlus /> Dodaj
              </Button>
            </form>
          </Card>

          {data.friends.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Još nemaš prijatelja"
              description="Pošalji pozivnicu ili upiši kod prijatelja. Onda možete dijeliti zadatke."
            />
          ) : (
            <ul className="space-y-3">
              {data.friends.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
                  <FriendAvatar friend={f} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{f.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {f.mapName} · <span className="font-bold text-primary tabular-nums">{f.hp} HP</span>
                    </p>
                  </div>
                  {f.streak > 1 && (
                    <span className="flex items-center gap-1 text-sm font-bold text-warning tabular-nums" title="Niz dana">
                      <Flame className="size-4" /> {f.streak}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Više opcija">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          remove.mutate(f.id, { onSuccess: () => toast(`${f.displayName} uklonjen/a iz prijatelja.`) })
                        }
                      >
                        <UserMinus /> Ukloni
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
