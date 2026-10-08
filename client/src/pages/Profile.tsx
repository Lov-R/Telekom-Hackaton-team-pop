import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/States';
import { Ghost } from '@/components/ghost/Ghost';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogout, useMe, usePatchProfile, useProfile } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import {
  ACCESSORY_LABELS,
  ACCESSORY_MAP,
  GHOST_COLORS,
  GHOST_COLOR_LABELS,
  MAP_NAMES,
  MOOD_MESSAGES,
  TONE_LABELS,
  moodFor,
} from '@/lib/labels';
import type { Accessory, GhostColor, Language, Tone } from '@/lib/types';
import { cn } from '@/lib/utils';

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-card p-4">
      <p className="font-mono text-2xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-secondary text-foreground' : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { data, isLoading, isError, error, refetch } = useProfile();
  const { data: me } = useMe();
  const patch = usePatchProfile();
  const logout = useLogout();
  const [ghostName, setGhostName] = useState('');
  const [displayName, setDisplayName] = useState('');

  const currentGhostName = data?.game.avatar.name;
  const currentDisplayName = data?.game.displayName;
  useEffect(() => {
    if (currentGhostName !== undefined) setGhostName(currentGhostName);
  }, [currentGhostName]);
  useEffect(() => {
    if (currentDisplayName !== undefined) setDisplayName(currentDisplayName);
  }, [currentDisplayName]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }
  if (isError || !data) return <ErrorState message={error?.message} onRetry={() => void refetch()} />;

  const { game, stats, ledger } = data;

  return (
    <>
      <PageHeader title="Profil" />
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
        <div className="space-y-4">
          <Card className="items-center gap-3 border-transparent p-6 text-center">
            <Ghost
              presence={game.presence}
              color={game.avatar.color}
              accessory={game.avatar.accessory}
              phaseIndex={game.phaseIndex}
              className="h-44 w-auto"
            />
            <div>
              <p className="text-2xl font-semibold">{game.avatar.name}</p>
              <p className="text-sm text-muted-foreground">
                {game.phase} · {game.mapName}
              </p>
              <p className="mt-2 text-sm">{MOOD_MESSAGES[moodFor(game.presence)]}</p>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="HP ukupno" value={game.totalHp} />
            <Stat label="Niz dana" value={game.streak} />
            <Stat label="Riješeno u 7 dana" value={stats.doneLast7} />
          </div>

          <Card className="gap-3 border-transparent p-4">
            <h2 className="text-base font-semibold">HP knjiga</h2>
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
                      className={cn(
                        'shrink-0 font-mono font-medium tabular-nums',
                        l.amount > 0 ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {l.amount > 0 ? `+${l.amount}` : l.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="gap-4 border-transparent p-4">
            <h2 className="text-base font-semibold">Glas duha</h2>
            <Segmented<Tone>
              label="Ton"
              value={game.tone}
              options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t].label }))}
              onChange={(tone) => patch.mutate({ tone })}
            />
            <p className="text-sm text-muted-foreground">„{TONE_LABELS[game.tone].sample}”</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Jezik</span>
              <div className="w-32">
                <Segmented<Language>
                  label="Jezik"
                  value={game.language}
                  options={[
                    { value: 'hr', label: 'HR' },
                    { value: 'en', label: 'EN' },
                  ]}
                  onChange={(language) => patch.mutate({ language })}
                />
              </div>
            </div>
          </Card>

          <Card className="gap-4 border-transparent p-4">
            <h2 className="text-base font-semibold">Izgled duha</h2>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = ghostName.trim();
                if (n && n !== game.avatar.name) {
                  patch.mutate({ avatar: { name: n } }, { onSuccess: () => toast.success('Ime spremljeno.') });
                }
              }}
            >
              <Input value={ghostName} onChange={(e) => setGhostName(e.target.value)} maxLength={30} aria-label="Ime duha" />
              <Button type="submit" disabled={patch.isPending || !ghostName.trim() || ghostName.trim() === game.avatar.name}>
                <Check /> Spremi
              </Button>
            </form>
            <div className="flex gap-3">
              {(Object.keys(GHOST_COLORS) as GhostColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={GHOST_COLOR_LABELS[c]}
                  aria-pressed={game.avatar.color === c}
                  onClick={() => patch.mutate({ avatar: { color: c } })}
                  className={cn(
                    'size-10 rounded-full ring-offset-2 ring-offset-card transition-shadow',
                    game.avatar.color === c ? 'ring-2 ring-primary' : 'ring-1 ring-border',
                  )}
                  style={{ background: GHOST_COLORS[c].body }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(ACCESSORY_LABELS) as Accessory[]).map((a) => {
                const unlocked = game.unlockedAccessories.includes(a);
                const active = game.avatar.accessory === a;
                return (
                  <button
                    key={a}
                    type="button"
                    disabled={!unlocked}
                    aria-pressed={active}
                    onClick={() => patch.mutate({ avatar: { accessory: a } })}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors',
                      active ? 'bg-primary/15 ring-1 ring-primary' : 'bg-muted',
                      unlocked ? 'hover:bg-secondary' : 'opacity-50',
                    )}
                  >
                    <div className="flex size-12 items-center justify-center">
                      {unlocked ? (
                        <Ghost presence={100} solid color={game.avatar.color} accessory={a} still className="size-12" />
                      ) : (
                        <Lock className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <span>{ACCESSORY_LABELS[a]}</span>
                    {!unlocked && (
                      <span className="text-[10px] text-muted-foreground">{MAP_NAMES[ACCESSORY_MAP[a] - 1]}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="gap-4 border-transparent p-4">
            <h2 className="text-base font-semibold">Račun</h2>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = displayName.trim();
                if (n && n !== game.displayName) {
                  patch.mutate({ displayName: n }, { onSuccess: () => toast.success('Ime spremljeno.') });
                }
              }}
            >
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} aria-label="Tvoje ime" />
              <Button type="submit" variant="secondary" disabled={patch.isPending || !displayName.trim() || displayName.trim() === game.displayName}>
                Spremi
              </Button>
            </form>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Kod za prijatelje</span>
              <button
                type="button"
                className="flex items-center gap-1.5 font-mono tracking-widest"
                onClick={() => {
                  void navigator.clipboard?.writeText(game.friendCode).then(() => toast('Kod kopiran.'));
                }}
              >
                {game.friendCode} <Copy className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-muted-foreground">{me?.email}</span>
              <Button variant="ghost" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
                <LogOut /> Odjava
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
