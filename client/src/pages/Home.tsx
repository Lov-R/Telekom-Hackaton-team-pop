import { useRef } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronRight, Crown, Flag, Flame, Heart, LocateFixed, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Figure, Logo } from '@/components/brand/Brand';
import { RecommendationCard } from '@/components/calendar/RecommendationCard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { useMapCamera } from '@/components/map/useMapCamera';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import { MOOD_MESSAGES, moodFor } from '@/lib/labels';
import type { Dashboard, GameState, MapMarker } from '@/lib/types';
import { cn } from '@/lib/utils';

const FIELDS = 10;
/** SRS §6.3's 10 fields placed on the path drawn in relAI-UX path-v6 (its STOPS, % of the art), bottom to top. */
const STOPS: [number, number][] = [
  [36, 94],
  [35, 86],
  [48, 76],
  [63, 66],
  [55, 59],
  [38, 52],
  [40, 44],
  [70, 32],
  [42, 21],
  [54, 12],
];

function Stop({ field, game, marker }: { field: number; game: GameState; marker?: MapMarker }) {
  const [x, y] = STOPS[field - 1];
  const done = field < game.field;
  const current = field === game.field;
  const boss = field === FIELDS;
  // Only the next few fields and the boss carry a label; further ones show a dot, so the map stays readable.
  const labelled = marker?.kind === 'boss' || (field >= game.field && field <= game.field + 2);
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div
        className={cn(
          'flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[50%] border text-[10px] font-extrabold',
          boss
            ? 'h-9 w-11 border-warm bg-gradient-to-b from-[#ffd9b5] to-[#c98a52] text-[#3d230f] shadow-[0_0_22px_rgb(243_179_125/0.6)]'
            : done
              ? 'h-6 w-7 border-[#b6ceec] bg-gradient-to-b from-[#8ab0df] to-[#3f6695] text-white shadow-[0_3px_0_#2e435d,0_0_14px_rgb(127_214_164/0.55)]'
              : current
                ? 'h-7 w-9 border-2 border-[#c8daf0] bg-[#5984b9] text-transparent shadow-[0_0_0_5px_rgb(84_125_176/0.27),0_0_25px_rgb(95_148_213/0.6)]'
                : 'h-6 w-7 border-[#a2abb7] bg-gradient-to-br from-[#444d58] to-[#272c32] text-[#d4d9e0] opacity-85 shadow-[0_3px_0_#1b2129]',
        )}
        aria-label={`Polje ${field}${current ? ', tvoja pozicija' : done ? ', prijeđeno' : ''}${boss ? ', boss' : ''}`}
      >
        {boss ? <Crown className="size-4" /> : done ? <Check className="size-3.5" strokeWidth={3} /> : field}
      </div>
      {marker && !labelled && (
        <span aria-hidden className="absolute -top-3.5 right-0 size-2 rounded-full bg-warm shadow-[0_0_6px_var(--warm)]" />
      )}
      {marker && labelled && (
        <Link
          to="/zadaci"
          className={cn(
            'absolute top-0 left-6 flex max-w-36 -translate-y-1/2 items-baseline gap-1.5 rounded-lg border border-white/10 bg-[#0b1420]/80 px-2 py-1 text-[10px] leading-tight text-[#eef3f9] backdrop-blur-sm',
            marker.kind === 'boss' && 'border-warm/60',
          )}
        >
          <span className="min-w-0 flex-1 truncate font-bold">{marker.kind === 'boss' ? `Boss: ${marker.title}` : marker.title}</span>
          {marker.date && <span className="shrink-0 text-[#a9bbd0]">{formatDate(marker.date, 'd.M.')}</span>}
        </Link>
      )}
    </div>
  );
}

function MapWorld({ data }: { data: Dashboard }) {
  const { game } = data;
  const viewport = useRef<HTMLDivElement>(null);
  const field = Math.min(game.field, FIELDS);
  const [ax, ay] = STOPS[field - 1];
  const { cam, world, handlers, zoomAt, recenter } = useMapCamera(viewport, { x: ax, y: ay }, 150);
  const markers = new Map<number, MapMarker>(game.markers.map((m) => [m.field, m]));
  const next = data.dueTasks[0];

  return (
    <div className="relative h-[calc(100dvh-4rem-max(env(safe-area-inset-bottom),var(--host-badge)))] overflow-hidden bg-[#0b1420] text-[#eef3f9] md:h-[calc(100dvh-3rem-var(--host-badge))] md:rounded-3xl md:border">
      {/* The world: art, fields and figure move together; HUD and controls stay put. */}
      <div
        ref={viewport}
        tabIndex={0}
        aria-label="Mapa. Povuci za pomicanje, strelice i +/− za zum, Home za povratak."
        className="absolute inset-0 cursor-grab touch-none outline-none select-none active:cursor-grabbing"
        {...handlers}
      >
        <div
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{ width: world.w, height: world.h, transform: `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.zoom})` }}
        >
          <img src="/ux/path.webp" alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" />
          {Array.from({ length: FIELDS }, (_, i) => (
            <Stop key={i + 1} field={i + 1} game={game} marker={markers.get(i + 1)} />
          ))}
          <div
            className="absolute z-10 transition-[left,top] duration-[900ms] ease-in-out"
            style={{ left: `${ax}%`, top: `${ay}%` }}
          >
            <Link to="/profil" aria-label="Tvoj avatar" className="block -translate-x-1/2 -translate-y-[95%]">
              <Figure presence={game.presence / 100} aura className="h-28 w-[4.5rem]" />
            </Link>
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(#0b1420_0,transparent_22%,transparent_70%,#0b1420_100%)]" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2">
          <Logo onDark className="mr-auto h-8 md:invisible" />
          <div className="flex min-w-24 items-center gap-2 rounded-2xl border border-white/10 bg-[#111b27]/85 px-3 py-1.5 backdrop-blur">
            <Heart className="size-4 text-[#c1dcf7]" />
            <div className="flex-1">
              <p className="text-sm leading-none font-extrabold tabular-nums">
                {game.hp} <span className="text-[10px] font-semibold text-[#a9bbd0]">HP</span>
              </p>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3a69a3] to-[#8ebef4] transition-[width] duration-700"
                  style={{ width: `${game.hp}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#111b27]/85 px-3 py-2 text-sm font-extrabold backdrop-blur">
            {game.streak > 0 ? (
              <>
                <Flame className="size-4 text-warm" /> {game.streak}
              </>
            ) : (
              <>
                <span className="text-[10px] font-semibold text-[#a9bbd0]">MAPA</span> {Math.min(game.mapIndex, 5)}/5
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-extrabold text-warm">step by step</p>
          <p className="truncate text-xs font-semibold text-[#a9bbd0]">
            {game.mapName} · {game.phase}
          </p>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-48 left-4 z-20 flex flex-col items-center rounded-2xl border border-white/10 bg-[#111b27]/85 backdrop-blur">
        <button type="button" onClick={() => zoomAt(cam.zoom * 1.25)} aria-label="Približi" className="p-2.5">
          <Plus className="size-5" />
        </button>
        <span className="text-[10px] font-bold tabular-nums">{Math.round(cam.zoom * 100)}%</span>
        <button type="button" onClick={() => zoomAt(cam.zoom / 1.25)} aria-label="Udalji" className="p-2.5">
          <Minus className="size-5" />
        </button>
        <span className="h-px w-6 bg-white/10" />
        <button type="button" onClick={() => recenter(1)} aria-label="Pronađi avatara" className="p-2.5">
          <LocateFixed className="size-5" />
        </button>
      </div>

      {/* Next step */}
      <div className="absolute inset-x-4 bottom-4 z-20">
        <p className="mb-2 text-center text-[11px] font-semibold text-[#a9bbd0]">
          {MOOD_MESSAGES[moodFor(game.presence)]}
        </p>
        <Link
          to="/zadaci"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111b27]/90 p-4 backdrop-blur-md transition-colors hover:border-[#8ebef4]/50"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-[#c1dcf7]">
            <Flag className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-[0.14em] text-[#a9bbd0] uppercase">Sljedeći korak</span>
            <span className="block truncate font-extrabold">
              {next?.title ?? (game.boss ? `Boss: ${game.boss.title}` : 'Ništa ne gori')}
            </span>
            <span className="block text-xs text-[#a9bbd0]">
              {next?.dueDate
                ? `rok ${formatDate(next.dueDate)}`
                : next?.date
                  ? formatDate(next.date)
                  : next
                    ? ''
                    : 'Slikaj dokument i pronaći ću sljedeći.'}
            </span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warm text-warm-foreground">
            <ArrowRight className="size-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

function SectionTitle({ title, to, linkLabel }: { title: string; to: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg">{title}</h2>
      <Link to={to} className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground">
        {linkLabel} <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) return <Skeleton className="h-[calc(100dvh-4rem)] md:rounded-3xl" />;
  if (isError || !data) {
    return (
      <div className="p-4">
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div>
      <MapWorld data={data} />
      <div className="space-y-8 px-4 pt-8 pb-[calc(9rem+var(--host-badge))] md:px-0">
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
            <SectionTitle title="Preporuke" to="/zadaci" linkLabel="Zadaci" />
            <div className="space-y-3">
              {data.recommendations.map((r) => (
                <RecommendationCard key={r.id} rec={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
