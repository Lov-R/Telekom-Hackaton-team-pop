import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDialogs } from '@/components/tasks/TaskDialogs';
import { useProcessingWatcher } from '@/hooks/queries';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell() {
  useProcessingWatcher();
  const { pathname } = useLocation();
  const chat = pathname === '/asistent';
  return (
    <div className="min-h-dvh md:pl-64">
      <Sidebar />
      <main
        className={
          chat
            ? 'mx-auto max-w-3xl px-4 pt-safe md:px-8 md:py-8'
            : 'mx-auto max-w-5xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-28 md:px-8 md:py-8'
        }
      >
        <div key={pathname} className="animate-fade-up">
          <Suspense fallback={<Skeleton className="h-64 rounded-lg" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNav />
      <TaskDialogs />
    </div>
  );
}
