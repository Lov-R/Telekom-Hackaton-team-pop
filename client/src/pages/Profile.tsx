import type { ReactNode } from 'react';
import { Flame, Lock, MessageCircle, Mountain, Settings, Sparkles, Star, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { Figure } from '@/components/brand/Brand';
import { ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import { MOOD_MESSAGES, moodFor } from '@/lib/labels';
import { cn } from '@/lib/utils';

/** relAI-UX HP rewards. Earned once total HP passes the mark; they stay even if presence drops later. */
const MILESTONES = [
  { hp: 25, title: 'Prva iskra', icon: Sparkles },
  { hp: 50, title: 'Zvjezdani trag', icon: Star },
  { hp: 75, title: 'Tvoj puni sjaj', icon: Sun },
  { hp: 100, title: 'Nebeska staza', icon: Mountain },
];

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** The Avatar tab: the future self, HP rewards and the HP history. Settings live in Postavke. */
export default function Profile() {
  const { data, isLoading, isError, error, refetch } = useProfile();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) return <ErrorState message={error?.message} onRetry={() => void refetch()} />;

  const { game, stats, ledger } = data;

  return (
    <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label-caps">relAI on future</p>
            <h1 className="truncate text-2xl">@{game.displayName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {game.phase} · {game.mapName}
            </p>
          </div>
          <Button asChild variant="secondary" size="icon" aria-label="Postavke">
            <Link to="/postavke">
              <Settings />
            </Link>
          </Button>
        </header>

        <section className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(ellipse_at_50%_30%,rgb(142_190_244/0.22),transparent_60%)] bg-card px-4 pt-6 pb-5">
          <div className="flex items-end justify-center">
            <Figure presence={game.presence / 100} aura className="h-72 w-44" />
          </div>
          <Button asChild variant="warm" size="icon-lg" className="absolute top-4 right-4 rounded-full" aria-label="Razgovaraj s budućim sobom">
            <Link to="/asistent">
              <MessageCircle />
            </Link>
          </Button>
          <div className="mt-4 text-center">
            <p className="text-xl font-extrabold">{game.avatar.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{MOOD_MESSAGES[moodFor(game.presence)]}</p>
          </div>
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-1 flex justify-between text-xs font-bold">
              <span>{game.hp} HP</span>
              <span className="text-muted-foreground">na 100 nova mapa</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3a69a3] to-[#8ebef4] transition-[width] duration-700"
                style={{ width: `${game.hp}%` }}
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="HP ukupno" value={game.totalHp} />
          <Stat
            label="Niz dana"
            value={
              <span className="flex items-center gap-1">
                {game.streak}
                {game.streak > 0 && <Flame className="size-5 text-warm" />}
              </span>
            }
          />
          <Stat label="Riješeno u 7 dana" value={stats.doneLast7} />
        </div>
      </div>

      <div className="space-y-5">
        <section>
          <h2 className="mb-3 text-lg">HP nagrade</h2>
          <div className="grid grid-cols-2 gap-3">
            {MILESTONES.map(({ hp, title, icon: Icon }) => {
              const earned = game.totalHp >= hp;
              return (
                <div
                  key={hp}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border p-4',
                    earned
                      ? 'border-warm/50 bg-[radial-gradient(circle_at_80%_10%,rgb(243_179_125/0.25),transparent_60%)] bg-card'
                      : 'bg-card opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 place-items-center rounded-full',
                      earned ? 'bg-warm text-warm-foreground' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {earned ? <Icon className="size-5" /> : <Lock className="size-4" />}
                  </span>
                  <p className="mt-3 text-sm font-extrabold">{title}</p>
                  <p className="text-xs text-muted-foreground">{earned ? 'Osvojeno' : `${hp} HP`}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="gap-3 rounded-2xl p-4">
          <h2 className="text-base">HP knjiga</h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">Još ništa. Riješi zadatak ili dodaj dokument.</p>
          ) : (
            <ul className="divide-y">
              {ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{l.subject ?? l.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.label} · {formatDate(l.createdAt.slice(0, 10), 'd. MMM')}
                    </p>
                  </div>
                  <span
                    className={cn('shrink-0 font-extrabold tabular-nums', l.amount > 0 ? 'text-primary' : 'text-muted-foreground')}
                  >
                    {l.amount > 0 ? `+${l.amount}` : l.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
