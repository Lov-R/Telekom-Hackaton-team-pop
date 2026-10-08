import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, SendHorizonal } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/common/States';
import { FriendAvatar } from '@/components/social/FriendAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversation, useSendMessage } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** 1:1 chat with a friend, polled every few seconds while open. */
export default function FriendChat() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useConversation(id);
  const send = useSendMessage(id);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const content = text.trim();
    if (!content || send.isPending) return;
    send.mutate(content, { onSuccess: () => setText('') });
  };

  if (isError) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to="/prijatelji">
            <ArrowLeft /> Prijatelji
          </Link>
        </Button>
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <header className="mb-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Natrag">
          <Link to="/prijatelji">
            <ArrowLeft />
          </Link>
        </Button>
        {data && <FriendAvatar friend={data.friend} />}
        <div className="min-w-0">
          <h1 className="truncate text-lg">{data?.friend.displayName ?? 'Razgovor'}</h1>
          {data && (
            <p className="truncate text-sm text-muted-foreground">
              {data.friend.mapName} · {data.friend.hp} HP
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-2 pb-4">
        {isLoading && <Loader2 className="mx-auto mt-10 animate-spin text-primary" />}
        {data && data.messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Još nema poruka. Pozdravi {data.friend.displayName}!
          </p>
        )}
        {data?.messages.map((m) => (
          <div key={m.id} className={cn('flex', m.mine && 'justify-end')}>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
                m.mine ? 'rounded-br-md bg-glow text-[#0b1420]' : 'rounded-bl-md border bg-card',
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className={cn('mt-0.5 text-right text-[10px]', m.mine ? 'text-[#0b1420]/60' : 'text-muted-foreground')}>
                {formatDate(m.createdAt, 'd.M. HH:mm')}
                {m.mine && m.read && ' · pročitano'}
              </p>
            </div>
          </div>
        ))}
        {send.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{send.error.message}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-[calc(4rem+max(env(safe-area-inset-bottom),var(--host-badge)))] -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-[calc(1rem+var(--host-badge))] md:mx-0 md:rounded-2xl md:border md:px-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiši poruku..."
          maxLength={2000}
          aria-label="Poruka"
          className="h-11 rounded-xl bg-card"
        />
        <Button
          type="submit"
          variant="warm"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          disabled={!text.trim() || send.isPending}
          aria-label="Pošalji"
        >
          <SendHorizonal />
        </Button>
      </form>
    </div>
  );
}
