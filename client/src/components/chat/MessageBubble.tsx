import { FigureHead } from '@/components/brand/Brand';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CitationChips } from './CitationChips';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <div className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
      {!mine && (
        <FigureHead className="mt-1 size-9" />
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          mine ? 'rounded-br-md bg-glow text-[#0b1420]' : 'rounded-bl-md border bg-card',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!mine && <CitationChips citations={message.citations} />}
      </div>
    </div>
  );
}
