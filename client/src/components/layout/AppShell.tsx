import { Suspense, useCallback, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { FigureHead } from '@/components/brand/Brand';
import { WelcomeBubbles } from '@/components/brand/WelcomeBubbles';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TaskDialogs } from '@/components/tasks/TaskDialogs';
import { useProcessingWatcher } from '@/hooks/queries';
import { useNotificationWatcher, usePendingInvite } from '@/hooks/social';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

/** Set by the login/register screen so the map greets a fresh sign-in with the bubble transition. */
export const WELCOME_FLAG = 'relai.welcome';

function takeWelcomeFlag(): boolean {
  try {
    const set = sessionStorage.getItem(WELCOME_FLAG) === '1';
    sessionStorage.removeItem(WELCOME_FLAG);
    return set;
  } catch {
    return false;
  }
}

/** relAI-UX: the head of the chosen figure opens the assistant from every tab (Avatar has its own button). */
function AssistantButton({ high }: { high: boolean }) {
  return (
    <Link
      to="/asistent"
      aria-label="Your future self assistant"
      className={cn(
        'fixed right-4 z-40 rounded-full shadow-[0_8px_24px_rgb(0_0_0/0.35)] transition-transform hover:scale-105 active:scale-95 md:right-6',
        // On the map it sits above the next-step card.
        high
          ? 'bottom-[calc(13rem+max(env(safe-area-inset-bottom),var(--host-badge)))] md:bottom-[calc(10rem+var(--host-badge))]'
          : 'bottom-[calc(4.75rem+max(env(safe-area-inset-bottom),var(--host-badge)))] md:bottom-[calc(1.5rem+var(--host-badge))]',
      )}
    >
      <FigureHead className="size-14 border-2" />
    </Link>
  );
}

export function AppShell() {
  useProcessingWatcher();
  useNotificationWatcher();
  usePendingInvite();
  const { pathname } = useLocation();
  const [welcome, setWelcome] = useState(takeWelcomeFlag);
  const endWelcome = useCallback(() => setWelcome(false), []);
  const chat = pathname === '/asistent';
  const map = pathname === '/';
  const showAssistant = !chat && pathname !== '/profil' && !pathname.startsWith('/prijatelji/');

  return (
    <div className="min-h-dvh md:pl-64">
      <Sidebar />
      <main
        className={
          map
            ? 'mx-auto max-w-3xl md:px-8 md:pt-6'
            : chat
              ? 'mx-auto max-w-3xl px-4 pt-safe md:px-8 md:pt-8 md:pb-[calc(2rem+var(--host-badge))]'
              : 'mx-auto max-w-5xl px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(9rem+var(--host-badge))] md:px-8 md:pt-8 md:pb-[calc(6rem+var(--host-badge))]'
        }
      >
        <div key={pathname} className="animate-fade-up">
          <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      {showAssistant && <AssistantButton high={map} />}
      <BottomNav />
      <TaskDialogs />
      {welcome && <WelcomeBubbles onDone={endWelcome} />}
    </div>
  );
}
