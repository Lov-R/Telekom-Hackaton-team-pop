import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { openTaskEditor } from '@/lib/taskDialogs';
import type { Task } from '@/lib/types';

/**
 * SRS §5.3: the agent saves tasks on its own and says so immediately, with the quote it came from,
 * Poništi (delete) and Uredi (edit). Shared by documents and chat.
 */
export function showAutoTaskToast(task: Task, from: { documentTitle?: string; fromChat?: boolean }): void {
  const when =
    task.kind === 'event'
      ? `${task.date ? formatDate(task.date) : ''}${task.time ? ` u ${task.time}` : ''}`
      : [task.remindAt && `Podsjetnik ${formatDate(task.remindAt)}`, task.dueDate && `rok ${formatDate(task.dueDate)}`]
          .filter(Boolean)
          .join(', ');
  const origin = from.documentTitle
    ? `Iz dokumenta „${from.documentTitle}”${task.sourceText ? `: "${task.sourceText}"` : ''}.`
    : 'Iz razgovora s asistentom.';
  toast.success(`Dodano: ${task.title}`, {
    description: `${origin} ${when}`.trim(),
    duration: 8000,
    action: { label: 'Uredi', onClick: () => openTaskEditor(task) },
    cancel: {
      label: 'Poništi',
      onClick: () => {
        void api
          .del(`/tasks/${task.id}`)
          .then(() => {
            toast('Poništeno.');
            return queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
          })
          .catch((e: Error) => toast.error(e.message));
      },
    },
  });
}
