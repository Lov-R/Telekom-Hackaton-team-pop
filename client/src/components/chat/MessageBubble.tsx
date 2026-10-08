import { Ghost as GhostIcon } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CitationChips } from './CitationChips';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <div className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
      {!mine && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
          <GhostIcon className="size-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-card',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!mine && <CitationChips citations={message.citations} />}
      </div>
    </div>
  );
}
