import { CheckCircle2, ChevronRight, Crown, Flame, Star } from 'lucide-react';
import { Link } from 'react-router';
import { RecommendationCard } from '@/components/calendar/RecommendationCard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Ghost } from '@/components/ghost/Ghost';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import { MOOD_MESSAGES, moodFor } from '@/lib/labels';
import type { GameState, MapMarker } from '@/lib/types';
import { cn } from '@/lib/utils';

const FIELDS = 10;
/** Horizontal offset of each field from the centre line, in % of the width: a winding path. */
const X_OFFSET = [-18, 0, 18, 0, -18, 0, 18, 0, -18, 0];

/** Field 1 at the bottom, the boss (10) at the top. Returns % coordinates inside the map box. */
const fieldPos = (field: number): { x: number; y: number } => ({
  x: 32 + X_OFFSET[field - 1],
  y: 94 - (field - 1) * 9.7,
});

/** SRS §11: five maps, each with its own atmosphere, from swamp fog to light on the peak. */
const ATMOSPHERE = [
  'from-[#1d2622] via-[#232b27] to-[#1c1c1e]', // Močvara Odgađanja
  'from-[#1f2a20] via-[#24261f] to-[#1c1c1e]', // Šuma Papira
  'from-[#22222e] via-[#26242f] to-[#1c1c1e]', // Grad Obaveza
  'from-[#2a2533] via-[#2d2430] to-[#1c1c1e]', // Planina Discipline
  'from-[#3a3222] via-[#2e2a22] to-[#1c1c1e]', // Vrh Mirne Glave
];

function MapBoard({ game }: { game: GameState }) {
  const markers = new Map<number, MapMarker>(game.markers.map((m) => [m.field, m]));
  const ghostAt = fieldPos(Math.min(game.field, FIELDS));
  const points = Array.from({ length: FIELDS }, (_, i) => fieldPos(i + 1));

  return (
    <div
      className={cn(
        '@container relative h-[600px] overflow-hidden rounded-2xl bg-gradient-to-t',
        ATMOSPHERE[game.phaseIndex],
      )}
    >
      {game.phaseIndex === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/[0.04] to-transparent" />
      )}
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
          strokeDasharray="2 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {points.map((p, i) => {
        const field = i + 1;
        const passed = field < game.field;
        const current = field === game.field;
        const isBoss = field === FIELDS;
        const marker = markers.get(field);
        return (
          <div key={field} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <div
              className={cn(
                'flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-xs tabular-nums',
                isBoss
                  ? 'size-12 bg-primary/20 text-primary ring-2 ring-primary/60'
                  : passed
                    ? 'bg-primary text-primary-foreground'
                    : current
                      ? 'bg-secondary text-foreground ring-2 ring-primary'
                      : 'bg-secondary/70 text-muted-foreground',
              )}
            >
              {isBoss ? <Crown className="size-5" /> : field}
            </div>
            {marker && (
              <Link
                to={marker.kind === 'boss' ? '/zadaci' : '/kalendar'}
                style={{ width: `calc(${100 - p.x}cqw - 2.5rem)` }}
                className={cn(
                  'absolute top-0 left-8 flex -translate-y-1/2 items-baseline gap-2 rounded-md bg-card/90 px-2 py-1 text-[11px] leading-tight shadow-sm',
                  marker.kind === 'boss' && 'ring-1 ring-primary/60',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {marker.kind === 'boss' ? `Boss: ${marker.title}` : marker.title}
                </span>
                {marker.date && (
                  <span className="shrink-0 font-mono text-muted-foreground">{formatDate(marker.date, 'd.M.')}</span>
                )}
              </Link>
            )}
          </div>
        );
      })}

      {/* The ghost slides between fields when HP changes (§6.3). */}
      <div
        className="absolute z-10 transition-[left,top] duration-[900ms] ease-in-out"
        style={{ left: `${ghostAt.x}%`, top: `${ghostAt.y}%` }}
      >
        <Ghost
          presence={game.presence}
          color={game.avatar.color}
          accessory={game.avatar.accessory}
          phaseIndex={game.phaseIndex}
          pulse={game.totalHp}
          className="h-24 w-auto -translate-x-1/2 -translate-y-[92%]"
        />
      </div>
    </div>
  );
}

function SectionTitle({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link to={to} className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground">
        {linkLabel} <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) return <ErrorState message={error?.message} onRetry={() => void refetch()} />;

  const { game } = data;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="label-caps">
              Mapa {Math.min(game.mapIndex, 5)} · {game.phase}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold">{game.mapName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {game.stars > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 font-mono text-xs text-gold">
                <Star className="size-3.5" /> ×{game.stars + 1}
              </span>
            )}
            {game.streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs tabular-nums">
                <Flame className="size-3.5 text-primary" /> {game.streak}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-medium tracking-tight tabular-nums">
              {game.hp}
              <span className="text-base text-muted-foreground"> / 100 HP</span>
            </span>
            <span className="text-xs text-muted-foreground">na 100 nova mapa</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={game.hp}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="HP na ovoj mapi"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${game.hp}%` }} />
          </div>
        </div>
      </header>

      <section aria-label="Mapa">
        <MapBoard game={game} />
        <p className="mt-3 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{game.avatar.name}:</span> {MOOD_MESSAGES[moodFor(game.presence)]}
        </p>
      </section>

      <section>
        <SectionTitle title="Na redu" to="/zadaci" linkLabel="Svi zadaci" />
        {data.dueTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Ništa ne gori"
            description="Nema rokova u sljedećih 7 dana. Slikaj dokument i pronaći ću sljedeći."
          />
        ) : (
          <div className="space-y-2">
            {data.dueTasks.map((t) => (
              <TaskItem key={t.id} task={t} compact />
            ))}
          </div>
        )}
      </section>

      {data.recommendations.length > 0 && (
        <section>
          <SectionTitle title="Preporuke" to="/kalendar" linkLabel="Kalendar" />
          <div className="space-y-3">
            {data.recommendations.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
