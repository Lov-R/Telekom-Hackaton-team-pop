export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.6;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Coordinates are relative to the centre of the visible map, in CSS pixels.
export function constrainCamera(camera, width, height) {
  const scale = clamp(camera.scale, MIN_ZOOM, MAX_ZOOM);
  return {
    scale,
    x: clamp(camera.x, -width * ((scale - 1) / 2 + .2), width * ((scale - 1) / 2 + .2)),
    y: clamp(camera.y, -height * ((scale - 1) / 2 + .38), height * ((scale - 1) / 2 + .52)),
  };
}

export function zoomAt(camera, scale, anchor, width, height) {
  const nextScale = clamp(scale, MIN_ZOOM, MAX_ZOOM);
  const ratio = nextScale / camera.scale;
  return constrainCamera({scale: nextScale, x: anchor.x - (anchor.x - camera.x) * ratio, y: anchor.y - (anchor.y - camera.y) * ratio}, width, height);
}

export function focusAvatar(position, width, height) {
  // Keep the head and the current field visible, including the upper path.
  return constrainCamera({scale: 1, x: 0, y: Math.max(0, 220 - position[1] / 100 * height)}, width, height);
}

export function createMapCamera({root, signal}) {
  let viewport = null, scene = null, camera = {scale: 1, x: 0, y: 0};
  let frameKey = null, avatar = [36, 94], dragging = false, moved = false, suppressUntil = 0;
  let gesture = null;
  const pointers = new Map();
  const size = () => ({width: viewport?.clientWidth || 1, height: viewport?.clientHeight || 1});
  const point = e => {
    const r = viewport.getBoundingClientRect();
    return {x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2};
  };
  function paint() {
    if (!scene?.isConnected) return;
    const {width, height} = size();
    camera = constrainCamera(camera, width, height);
    scene.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    viewport.dataset.zoom = camera.scale.toFixed(2);
    root.querySelectorAll('[data-map-zoom]').forEach(el => { el.textContent = `${Math.round(camera.scale * 100)}%`; });
    root.querySelector('[data-map-camera="in"]')?.toggleAttribute('disabled', camera.scale >= MAX_ZOOM);
    root.querySelector('[data-map-camera="out"]')?.toggleAttribute('disabled', camera.scale <= MIN_ZOOM);
  }
  function zoom(scale, anchor = {x: 0, y: 0}) {
    const {width, height} = size();
    camera = zoomAt(camera, scale, anchor, width, height);
    paint();
  }
  function beginGesture() {
    const points = [...pointers.values()];
    if (!points.length) { gesture = null; return; }
    gesture = {camera: {...camera}, points};
    if (points.length > 1) {
      gesture.distance = Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
      gesture.mid = {x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2};
    }
  }
  function down(e) {
    if (e.button !== 0 || !e.target.closest('.rg-world') || e.target.closest('.rg-stop-tip')) return;
    if (!pointers.size) moved = false;
    pointers.set(e.pointerId, point(e));
    if (pointers.size > 1) moved = true;
    beginGesture();
  }
  function move(e) {
    if (!pointers.has(e.pointerId) || !viewport?.isConnected) return;
    pointers.set(e.pointerId, point(e));
    const points = [...pointers.values()], {width, height} = size();
    if (points.length > 1 && gesture.distance) {
      const mid = {x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2};
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      camera = zoomAt(gesture.camera, gesture.camera.scale * distance / gesture.distance, gesture.mid, width, height);
      camera.x += mid.x - gesture.mid.x;
      camera.y += mid.y - gesture.mid.y;
      moved = true;
    } else {
      const dx = points[0].x - gesture.points[0].x, dy = points[0].y - gesture.points[0].y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      camera = {...gesture.camera, x: gesture.camera.x + dx, y: gesture.camera.y + dy};
    }
    e.preventDefault();
    if (!dragging) {
      dragging = true;
      viewport.classList.add('is-dragging');
      // Capture only once dragging starts so ordinary field/avatar taps remain native clicks.
      for (const id of pointers.keys()) { try { viewport.setPointerCapture(id); } catch {} }
    }
    paint();
  }
  function up(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (moved) suppressUntil = performance.now() + 350;
    if (!pointers.size) {
      dragging = false;
      viewport?.classList.remove('is-dragging');
    }
    beginGesture();
  }
  // Prevent a drag ending over a field or avatar from accidentally opening it.
  root.addEventListener('click', e => {
    if (e.detail !== 0 && e.target.closest('.rg-world') && performance.now() < suppressUntil) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, {capture: true, signal});
  root.addEventListener('pointerdown', down, {signal});
  root.ownerDocument.addEventListener('pointermove', move, {passive: false, signal});
  root.ownerDocument.addEventListener('pointerup', up, {signal});
  root.ownerDocument.addEventListener('pointercancel', up, {signal});
  root.addEventListener('wheel', e => {
    if (!e.target.closest('.rg-world') || !viewport) return;
    e.preventDefault();
    zoom(camera.scale * Math.exp(-e.deltaY * .002), point(e));
  }, {passive: false, signal});
  root.addEventListener('dblclick', e => {
    if (!e.target.closest('.rg-world') || e.target.closest('button')) return;
    e.preventDefault(); zoom(camera.scale > 1.8 ? 1 : camera.scale * 1.5, point(e));
  }, {signal});
  root.addEventListener('click', e => {
    const button = e.target.closest('[data-map-camera]');
    if (!button || button.disabled || !viewport) return;
    if (button.dataset.mapCamera === 'home') {
      const {width, height} = size(); camera = focusAvatar(avatar, width, height); paint();
    } else zoom(camera.scale + (button.dataset.mapCamera === 'in' ? .25 : -.25));
  }, {signal});
  root.addEventListener('keydown', e => {
    if (e.target !== viewport) return;
    const delta = {ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45]}[e.key];
    if (delta) { e.preventDefault(); camera.x += delta[0]; camera.y += delta[1]; paint(); }
    else if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); zoom(camera.scale + (e.key === '-' ? -.25 : .25)); }
    else if (e.key === 'Home') { e.preventDefault(); const {width, height} = size(); camera = focusAvatar(avatar, width, height); paint(); }
  }, {signal});
  let lastSize=null;
  const observer = new ResizeObserver(() => {
    const next=size();
    if(lastSize&&(next.width!==lastSize.width||next.height!==lastSize.height)) {
      if(camera.scale===1) camera=focusAvatar(avatar,next.width,next.height);
      else {camera.x*=next.width/lastSize.width;camera.y*=next.height/lastSize.height;}
    }
    lastSize=next; paint();
  });
  signal.addEventListener('abort', () => observer.disconnect(), {once: true});
  return {
    sync(key, position) {
      const next = root.querySelector('.rg-world');
      if (next !== viewport) {
        observer.disconnect(); pointers.clear(); gesture = null; dragging = false;
        viewport = next; scene = next?.querySelector('.rg-world-scene');
        if (viewport) observer.observe(viewport);
      }
      if (!viewport) return;
      avatar = position;
      if (key !== frameKey) { const {width, height} = size(); camera = focusAvatar(avatar, width, height); frameKey = key; }
      paint();
    },
  };
}
