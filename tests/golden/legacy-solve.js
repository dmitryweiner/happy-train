#!/usr/bin/env node
// Ищет решение уровня на legacy-движке перебором кликов (0-1 BFS: минимум кликов).
// Точки решения: старт, вход любого локомотива в новую клетку, раз в WAIT_TICKS пока кто-то стоит.
// Использование: node tests/golden/legacy-solve.js [уровень 1-based ...]
const { LegacySim, TICK_RATE } = require('./legacy-harness');

const MAX_TICKS = 90 * TICK_RATE;
const WAIT_TICKS = TICK_RATE / 2;
const MAX_NODES = 300000;

function stateKey(sim) {
  const game = sim.game;
  const parts = game.trains
    .map(train => train[0].state + ':' + train[0].speed.toFixed(1) + ':' +
      train.map(p => `${p.x},${p.y},${Math.round(p.pixelX / 2)},${Math.round(p.pixelY / 2)}`).join(';'))
    .join('|');
  const sw = Object.values(game.switchStates).map(s => (s.isStraight ? 1 : 0)).join('');
  const se = Object.values(game.semaphoreStates).map(s => (s.isOpen ? 1 : 0)).join('');
  return parts + '#' + sw + '#' + se;
}

function locoCells(sim) {
  return sim.game.trains.map(train => train[0].x + ',' + train[0].y).join('|');
}

// Крутит симуляцию до следующей точки решения.
function advance(sim) {
  const startCells = locoCells(sim);
  const startTick = sim.tick;
  while (sim.status === 'running' && sim.tick < MAX_TICKS) {
    sim.step();
    if (locoCells(sim) !== startCells) return;
    const someoneStopped = sim.game.trains.some(train => train[0].speed === 0);
    if (someoneStopped && sim.tick - startTick >= WAIT_TICKS) return;
  }
}

function solve(level) {
  const sim = new LegacySim(level - 1);
  const controls = sim.controls();
  const deque = [{ snap: sim.snapshot(), actions: [] }];
  const seen = new Set([stateKey(sim)]);
  let expanded = 0;

  while (deque.length && expanded < MAX_NODES) {
    const node = deque.shift();
    expanded++;
    const options = [null, ...controls];
    for (const control of options) {
      sim.restore(node.snap);
      let actions = node.actions;
      if (control) {
        const before = stateKey(sim);
        sim.click(control.x, control.y);
        if (stateKey(sim) === before) continue; // клик ничего не изменил (например, на стрелке стоит поезд)
        actions = [...actions, { tick: sim.tick, x: control.x, y: control.y }];
      }
      advance(sim);
      if (sim.status === 'won') return { level, actions, wonAtTick: sim.tick, expanded };
      if (sim.status !== 'running' || sim.tick >= MAX_TICKS) continue;
      const key = stateKey(sim);
      if (seen.has(key)) continue;
      seen.add(key);
      const child = { snap: sim.snapshot(), actions };
      if (control) deque.push(child);
      else deque.unshift(child);
    }
  }
  return { level, actions: null, expanded };
}

if (require.main === module) {
  const probe = new LegacySim(0);
  const requested = process.argv.slice(2).map(Number);
  const levels = requested.length ? requested : [...Array(probe.levelCount).keys()].map(i => i + 1);
  for (const level of levels) {
    const started = Date.now();
    const result = solve(level);
    console.log(JSON.stringify({ ...result, ms: Date.now() - started }));
  }
}

module.exports = { solve };
