import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.6;
/** The landscape art is 2:3 (width:height). */
const ASPECT = 1.5;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Pan and zoom for the map (relAI-UX map-camera): drag, pinch, wheel and double-click, plus +/−/recenter buttons
 * and arrow/+/−/Home keys. The view never shows past the edges of the world.
 */
export function useMapCamera(
  viewport: RefObject<HTMLDivElement | null>,
  focus: { x: number; y: number },
  /** Height covered by fixed UI at the bottom (the next-step card): the world can scroll past it. */
  bottomInset = 0,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const centred = useRef(false);

  // World size at zoom 1: at least as wide and as tall as the viewport, keeping the art's aspect.
  const baseW = Math.max(size.w, size.h / ASPECT);
  const baseH = baseW * ASPECT;

  const clamp = useCallback(
    (c: Camera): Camera => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom));
      const minX = size.w - baseW * zoom;
      const minY = size.h - bottomInset - baseH * zoom;
      return { zoom, x: Math.min(0, Math.max(minX, c.x)), y: Math.min(0, Math.max(minY, c.y)) };
    },
    [size, baseW, baseH, bottomInset],
  );

  /** Puts the focus point (in % of the world) slightly below the middle of the view. */
  const recenter = useCallback(
    (zoom = 1) => {
      const visibleH = size.h - bottomInset;
      setCam(
        clamp({ zoom, x: size.w / 2 - (focus.x / 100) * baseW * zoom, y: visibleH * 0.6 - (focus.y / 100) * baseH * zoom }),
      );
    },
    [clamp, size, baseW, baseH, bottomInset, focus.x, focus.y],
  );

  const zoomAt = useCallback(
    (nextZoom: number, px = size.w / 2, py = size.h / 2) => {
      setCam((c) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
        const k = zoom / c.zoom;
        return clamp({ zoom, x: px - (px - c.x) * k, y: py - (py - c.y) * k });
      });
    },
    [clamp, size],
  );

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewport]);

  // First layout, and every resize: show the avatar.
  useEffect(() => {
    if (size.w === 0) return;
    recenter(centred.current ? cam.zoom : 1);
    centred.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  // The avatar moved to another field: follow it.
  useEffect(() => {
    if (centred.current) recenter(cam.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.x, focus.y]);

  // Wheel needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setCam((c) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * Math.exp(-e.deltaY * 0.0015)));
        const k = zoom / c.zoom;
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        return clamp({ zoom, x: px - (px - c.x) * k, y: py - (py - c.y) * k });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [viewport, clamp]);

  const local = (e: ReactPointerEvent): { x: number; y: number } => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest('a,button')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, local(e));
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.zoom };
      }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt(pinch.current.zoom * (dist / pinch.current.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (pointers.current.size === 1) {
        setCam((c) => clamp({ ...c, x: c.x + p.x - prev.x, y: c.y + p.y - prev.y }));
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
    },
    onPointerCancel: (e: ReactPointerEvent) => {
      pointers.current.delete(e.pointerId);
      pinch.current = null;
    },
    onDoubleClick: (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a,button')) return;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      zoomAt(cam.zoom >= MAX_ZOOM - 0.05 ? MIN_ZOOM : cam.zoom * 1.5, e.clientX - r.left, e.clientY - r.top);
    },
    onKeyDown: (e: KeyboardEvent) => {
      const step = 60;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        setCam((c) => clamp({ ...c, x: c.x + dx, y: c.y + dy }));
      } else if (e.key === '+' || e.key === '=') zoomAt(cam.zoom * 1.25);
      else if (e.key === '-') zoomAt(cam.zoom / 1.25);
      else if (e.key === 'Home') recenter(1);
    },
  };

  return { cam, world: { w: baseW, h: baseH }, handlers, zoomAt, recenter };
}
