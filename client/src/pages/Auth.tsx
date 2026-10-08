import { useState, type FormEvent } from 'react';
import { Logo } from '@/components/brand/Brand';
import { WELCOME_FLAG } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin, useRegister } from '@/hooks/queries';
import type { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Greet the next map view with the soap-bubble transition (relAI-UX). */
const markWelcome = (): void => {
  try {
    sessionStorage.setItem(WELCOME_FLAG, '1');
  } catch {
    // No storage: skip the transition.
  }
};

/** SRS §5.1 email + password, in the relAI-UX entry style ("Krenimo od tebe."). */
export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<Language>('hr');
  const login = useLogin();
  const register = useRegister();
  const pending = login.isPending || register.isPending;

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (mode === 'login') login.mutate({ email, password }, { onSuccess: markWelcome });
    else register.mutate({ email, password, displayName, language }, { onSuccess: markWelcome });
  };

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-safe pb-safe">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgb(142_190_244/0.16),transparent_60%),radial-gradient(ellipse_at_80%_100%,rgb(243_179_125/0.08),transparent_55%)]"
      />
      <div className="mb-8">
        <Logo className="h-10" />
        <h1 className="hero-title mt-6">
          Krenimo
          <span>od tebe.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Papir postaje rok, rok postaje igra.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              'rounded-xl py-2.5 text-sm font-bold transition-colors',
              mode === m ? 'bg-glow text-[#0b1420]' : 'text-muted-foreground',
            )}
          >
            {m === 'login' ? 'Prijava' : 'Novi račun'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Ime</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
              autoComplete="given-name"
              className="h-12 rounded-xl bg-card"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            className="h-12 rounded-xl bg-card"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Lozinka</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="h-12 rounded-xl bg-card"
          />
          {mode === 'register' && <p className="text-xs text-muted-foreground">Najmanje 8 znakova.</p>}
        </div>
        {mode === 'register' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Jezik</span>
            <div className="flex gap-1 rounded-xl border bg-card p-1">
              {(['hr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  className={cn(
                    'rounded-lg px-3 py-1 text-sm font-bold uppercase',
                    language === l ? 'bg-glow text-[#0b1420]' : 'text-muted-foreground',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" size="lg" variant="warm" className="mt-2 w-full" disabled={pending}>
          {mode === 'login' ? 'Zakorači na mapu' : 'Napravi račun i zakorači'}
        </Button>
      </form>
    </main>
  );
}
