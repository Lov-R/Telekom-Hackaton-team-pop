import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Figure } from '@/components/brand/Brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePatchProfile } from '@/hooks/queries';
import { TONE_LABELS } from '@/lib/labels';
import { setPref, usePrefs } from '@/lib/prefs';
import type { GameState, Tone } from '@/lib/types';
import { cn } from '@/lib/utils';

/** SRS §5.1 onboarding: tone, avatar, then notifications (asked only on click; push itself is not built yet). */
export default function Onboarding({ game }: { game: GameState }) {
  const [step, setStep] = useState(0);
  const [tone, setTone] = useState<Tone>(game.tone);
  const [name, setName] = useState(game.avatar.name);
  const { figure } = usePrefs();
  const [notify, setNotify] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');
  const patch = usePatchProfile();

  const askNotifications = async (): Promise<void> => {
    if (!('Notification' in window)) {
      setNotify('unsupported');
      return;
    }
    const result = await Notification.requestPermission();
    setNotify(result === 'granted' ? 'granted' : 'denied');
  };

  const finish = (): void => {
    patch.mutate({ tone, avatar: { name: name.trim() || 'Budući ja', color: game.avatar.color }, onboarded: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-safe">
      <div className="flex h-14 items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" size="icon" className="-ml-2" aria-label="Natrag" onClick={() => setStep(step - 1)}>
            <ArrowLeft />
          </Button>
        ) : (
          <span />
        )}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{step + 1} / 3</span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 pb-10">
        <div className="flex justify-center">
          <Figure presence={step === 2 ? 0.8 : 0.6} aura className="h-48 w-32" />
        </div>

        {step === 0 && (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl">Kako da ti se obraćam?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Ja sam ti iz budućnosti. Biraj koliko ću biti iskren.</p>
            </div>
            <div className="space-y-2">
              {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  aria-pressed={tone === t}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition-colors',
                    tone === t ? 'border-primary bg-primary/10' : 'bg-card hover:border-muted-foreground/40',
                  )}
                >
                  <p className="font-medium">{TONE_LABELS[t].label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">„{TONE_LABELS[t].sample}”</p>
                </button>
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Dalje
            </Button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <div>
              <h1 className="text-2xl">Odaberi budućeg sebe</h1>
              <p className="mt-1 text-sm text-muted-foreground">Kasnije ga možeš promijeniti u Postavkama.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ghost-name" className="text-sm font-medium">
                Kako ćeš ga zvati?
              </label>
              <Input id="ghost-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['female', 'male'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={figure === f}
                  onClick={() => setPref('figure', f)}
                  className={cn(
                    'rounded-xl border py-3 text-sm font-bold transition-colors',
                    figure === f ? 'border-primary bg-primary/15 text-foreground' : 'bg-card text-muted-foreground',
                  )}
                >
                  {f === 'female' ? 'Ona' : 'On'}
                </button>
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>
              Dalje
            </Button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl">Smijem li ti pisati?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Javit ću se kad rok stiže. Najviše 3 puta dnevno, nikad između 21 i 9 sati.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => void askNotifications()}
              disabled={notify !== 'idle'}
            >
              {notify === 'granted'
                ? 'Obavijesti uključene'
                : notify === 'denied'
                  ? 'Obavijesti odbijene'
                  : notify === 'unsupported'
                    ? 'Dodaj relAI na početni zaslon za obavijesti'
                    : 'Uključi obavijesti'}
            </Button>
            <Button size="lg" variant="warm" className="w-full" onClick={finish} disabled={patch.isPending}>
              Kreni
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}
