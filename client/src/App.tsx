import { lazy, Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';
import { ErrorState } from '@/components/common/States';
import { AppShell } from '@/components/layout/AppShell';
import { useMe } from '@/hooks/queries';
import { UNAUTHORIZED_EVENT } from '@/lib/api';

const Auth = lazy(() => import('@/pages/Auth'));
const Chat = lazy(() => import('@/pages/Chat'));
const DocumentDetail = lazy(() => import('@/pages/DocumentDetail'));
const Documents = lazy(() => import('@/pages/Documents'));
const Home = lazy(() => import('@/pages/Home'));
const Intro = lazy(() => import('@/pages/Intro'));
const More = lazy(() => import('@/pages/More'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Profile = lazy(() => import('@/pages/Profile'));
const Scan = lazy(() => import('@/pages/Scan'));
const Settings = lazy(() => import('@/pages/Settings'));
const Tasks = lazy(() => import('@/pages/Tasks'));

function Splash() {
  return <div className="min-h-dvh bg-background" aria-busy="true" />;
}

export default function App() {
  const qc = useQueryClient();
  const { data: me, isLoading, isError, error, refetch } = useMe();
  // relAI-UX: the intro is shown on every signed-out entry; a tap on the wordmark continues.
  const [introDone, setIntroDone] = useState(false);

  // Any 401 from the API (expired session) drops back to the login screen.
  useEffect(() => {
    const onUnauthorized = (): void => {
      qc.clear();
      qc.setQueryData(['me'], null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [qc]);

  if (isLoading) return <Splash />;
  if (isError) {
    return (
      <div className="mx-auto max-w-md p-6 pt-20">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!me) {
    return (
      <Suspense fallback={<Splash />}>
        {introDone ? <Auth /> : <Intro onContinue={() => setIntroDone(true)} />}
      </Suspense>
    );
  }
  if (!me.game.onboarded) {
    return (
      <Suspense fallback={<Splash />}>
        <Onboarding game={me.game} />
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="dokumenti" element={<Documents />} />
        <Route path="dokumenti/:id" element={<DocumentDetail />} />
        <Route path="skeniraj" element={<Scan />} />
        <Route path="zadaci" element={<Tasks />} />
        <Route path="kalendar" element={<Navigate to="/zadaci" replace />} />
        <Route path="asistent" element={<Chat />} />
        <Route path="profil" element={<Profile />} />
        <Route path="vise" element={<More />} />
        <Route path="postavke" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
