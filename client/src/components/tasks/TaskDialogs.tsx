import { closeCompleteTask, closeTaskEditor, useTaskDialogs } from '@/lib/taskDialogs';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { TaskForm } from './TaskForm';

/** The app-wide edit and complete dialogs (see lib/taskDialogs.ts). */
export function TaskDialogs() {
  const { editing, creating, completing } = useTaskDialogs();
  return (
    <>
      <TaskForm
        open={!!editing || !!creating}
        onOpenChange={(o) => !o && closeTaskEditor()}
        task={editing}
        defaultGoalId={creating?.goalId}
      />
      <CompleteTaskDialog task={completing} onClose={closeCompleteTask} />
    </>
  );
}
