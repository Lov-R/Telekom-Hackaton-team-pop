import { closeCompleteTask, closeShareTask, closeTaskEditor, useTaskDialogs } from '@/lib/taskDialogs';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { ShareTaskDialog } from './ShareTaskDialog';
import { TaskForm } from './TaskForm';

/** The app-wide edit and complete dialogs (see lib/taskDialogs.ts). */
export function TaskDialogs() {
  const { editing, creating, completing, sharing } = useTaskDialogs();
  return (
    <>
      <TaskForm
        open={!!editing || !!creating}
        onOpenChange={(o) => !o && closeTaskEditor()}
        task={editing}
        defaultGoalId={creating?.goalId}
      />
      <CompleteTaskDialog task={completing} onClose={closeCompleteTask} />
      <ShareTaskDialog task={sharing} onClose={closeShareTask} />
    </>
  );
}
