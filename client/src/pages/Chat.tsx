import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Ghost as GhostIcon, Loader2, SendHorizonal, Trash2 } from 'lucide-react';
import { ErrorState } from '@/components/common/States';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatMessages, useClearChat, useSendChat } from '@/hooks/queries';
import type { ChatMessage, Task } from '@/lib/types';

const SUGGESTIONS = [
  'Koji su mi sljedeći rokovi?',
  'Stavi mi sastanak s Markom u četvrtak u 10.',
  'Koji mi je OIB?',
  'Kada mi ističe osobna iskaznica?',
];

export default function Chat() {
  const { data, isLoading, isError, error, refetch } = useChatMessages();
  const send = useSendChat();
  const clear = useClearChat();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  /** Tasks the assistant offered to close (propose_complete_task); shown with a "Riješeno" button. */
  const [proposals, setProposals] = useState<Task[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [data?.length, pending]);

  const ask = (message: string): void => {
    const m = message.trim();
    if (!m || send.isPending) return;
    setPending(m);
    setText('');
    setProposals([]);
    send.mutate(m, {
      onSuccess: (res) => setProposals(res.proposedTasks),
      onSettled: () => setPending(null),
    });
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    ask(text);
  };

  const messages: ChatMessage[] = data ?? [];

  return (
    <div className="flex min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col pt-4 md:min-h-[calc(100dvh-4rem)] md:pt-0">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Asistent</h1>
            <p className="text-sm text-muted-foreground">Tvoj duh iz budućnosti</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={clear.isPending}
            onClick={() => clear.mutate()}
            aria-label="Očisti razgovor"
          >
            <Trash2 /> Očisti
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-3 pb-4">
        {isLoading && <Loader2 className="mx-auto mt-10 animate-spin text-primary" />}
        {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
        {data && messages.length === 0 && !pending && (
          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg border bg-card text-primary">
              <GhostIcon className="size-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">Kako ti mogu pomoći?</p>
              <p className="text-sm text-muted-foreground">Zapisujem obaveze i odgovaram iz tvojih dokumenata.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-md border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && (
          <>
            <MessageBubble
              message={{ id: 'pending', role: 'user', content: pending, citations: [], createdAt: '' }}
            />
            <div className="flex items-center gap-2 pl-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Duh razmišlja...
            </div>
          </>
        )}
        {proposals.length > 0 && !pending && (
          <div className="space-y-2 pl-10">
            {proposals.map((t) => (
              <TaskItem key={t.id} task={t} compact />
            ))}
          </div>
        )}
        {send.isError && !pending && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{send.error.message}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 flex gap-2 border-t bg-background px-4 py-3 md:bottom-0 md:mx-0 md:rounded-lg md:border md:px-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pitaj ili reci što da zapišem..."
          maxLength={2000}
          aria-label="Poruka"
          className="h-11"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!text.trim() || send.isPending} aria-label="Pošalji">
          <SendHorizonal />
        </Button>
      </form>
    </div>
  );
}
