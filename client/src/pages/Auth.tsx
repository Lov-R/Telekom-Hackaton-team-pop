import { useState, type FormEvent } from 'react';
import { Ghost } from '@/components/ghost/Ghost';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin, useRegister } from '@/hooks/queries';
import type { Language } from '@/lib/types';
import { cn } from '@/lib/utils';

/** SRS §5.1: email + password, one role. HR/EN switch lives here and in Profile (§10). */
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
    if (mode === 'login') login.mutate({ email, password });
    else register.mutate({ email, password, displayName, language });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mb-8 flex flex-col items-center text-center">
        <Ghost presence={70} color="lavanda" phaseIndex={1} className="h-28 w-auto" />
        <h1 className="mt-4 text-3xl font-semibold">relAI</h1>
        <p className="mt-1 text-sm text-muted-foreground">Papir postaje rok, rok postaje igra.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md py-2 text-sm font-medium transition-colors',
              mode === m ? 'bg-secondary text-foreground' : 'text-muted-foreground',
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
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required autoComplete="given-name" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
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
          />
          {mode === 'register' && <p className="text-xs text-muted-foreground">Najmanje 8 znakova.</p>}
        </div>
        {mode === 'register' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Jezik</span>
            <div className="flex gap-1 rounded-md bg-muted p-1">
              {(['hr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  className={cn(
                    'rounded-sm px-3 py-1 text-sm font-medium uppercase',
                    language === l ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {mode === 'login' ? 'Prijavi se' : 'Napravi račun'}
        </Button>
      </form>
    </main>
  );
}
