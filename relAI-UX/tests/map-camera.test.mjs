import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainCamera, zoomAt, focusAvatar} from '../src/map-camera.mjs';

test('zoom preserves the world point under the pointer', () => {
  const camera = {scale: 1.2, x: 12, y: -20}, anchor = {x: 60, y: 75};
  const zoomed = zoomAt(camera, 1.8, anchor, 400, 600);
  assert.ok(Math.abs((anchor.x - camera.x) / camera.scale - (anchor.x - zoomed.x) / zoomed.scale) < 1e-9);
  assert.ok(Math.abs((anchor.y - camera.y) / camera.scale - (anchor.y - zoomed.y) / zoomed.scale) < 1e-9);
});

test('camera bounds keep a recoverable part of the map visible', () => {
  const c = constrainCamera({scale: 99, x: 1e6, y: -1e6}, 320, 500);
  assert.equal(c.scale, 2.6);
  assert.ok(c.x <= 320 + 1e-9 && c.y >= -590 - 1e-9);
  assert.equal(constrainCamera({scale: .1, x: 0, y: 0}, 320, 500).scale, 1);
});

test('recentring keeps upper-field avatars below the map heading', () => {
  const start = focusAvatar([36, 94], 390, 600);
  const upper = focusAvatar([43, 16], 390, 600);
  assert.equal(start.y, 0);
  assert.ok(upper.y > 100);
  assert.equal(upper.scale, 1);
  const short = focusAvatar([43, 16], 390, 332);
  assert.ok(332 * .16 + short.y >= 215, 'a tall avatar fits below the top edge on a short screen');
});
