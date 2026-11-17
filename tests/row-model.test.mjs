import test from 'node:test';
import assert from 'node:assert/strict';
import { calibration, rowPosition } from '../row-model.mjs';

test('registered rows take priority and unregistered rows use same-page spacing', () => {
  const positions = { 1: { page: 1, y: 0.8 }, 2: { page: 1, y: 0.78 } };
  assert.equal(calibration(positions).page, 1);
  assert.ok(Math.abs(calibration(positions).step + 0.02) < 1e-9);
  assert.deepEqual(rowPosition(positions, 2), { page: 1, y: 0.78, estimated: false });
  assert.ok(Math.abs(rowPosition(positions, 3).y - 0.76) < 1e-9);
  assert.equal(rowPosition(positions, 3).estimated, true);
});

test('never guesses across a known page boundary or outside a page', () => {
  const positions = { 1: { page: 1, y: 0.8 }, 2: { page: 1, y: 0.78 }, 5: { page: 2, y: 0.7 } };
  assert.equal(rowPosition(positions, 4), null);
  assert.equal(rowPosition(positions, 6), null);
  assert.equal(rowPosition({ 1: { page: 1, y: 0.03 }, 2: { page: 1, y: 0.01 } }, 3), null);
  assert.equal(calibration({ 1: { page: 1, y: 0.8 }, 2: { page: 2, y: 0.78 } }), null);
});
