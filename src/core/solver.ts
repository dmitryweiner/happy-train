// Перебор решений уровня: минимальное число кликов (0-1 BFS). Для проверки уровней и генерации сценариев.
// Точки решения: старт, вход любого локомотива в новую клетку, раз в полсекунды, пока какой-то поезд стоит.
import type { LegacyLevel } from '../types';
import { classifyCell } from './track';
import { clickCell, createWorld, stepWorld, TICK_RATE, type World } from './world';

export interface SolverAction {
  tick: number; // клик перед тиком tick + 1 (как в сценариях golden-тестов)
  x: number;
  y: number;
}

export interface SolverResult {
  actions: SolverAction[] | null;
  wonAtTick?: number;
  expanded: number;
}

export interface SolverOptions {
  maxTicks?: number;
  maxNodes?: number;
}

const WAIT_TICKS = TICK_RATE / 2;

function cloneWorld(world: World): World {
  return {
    ...world,
    switchStates: structuredClone(world.switchStates),
    semaphoreStates: structuredClone(world.semaphoreStates),
    trainStates: structuredClone(world.trainStates),
    trains: structuredClone(world.trains),
    crash: world.crash && { ...world.crash },
  };
}

function stateKey(world: World): string {
  // Голова — с точностью до 1/60 клетки; остальной состав задаётся клетками частей
  const heads = world.trainStates
    .map(train => {
      const head = train.segments[train.segments.length - 1];
      return `${head.x},${head.y},${head.from}${head.to},${Math.round(train.headOffset / 6000)},${train.speed},${train.state}`;
    })
    .join('/');
  const cells = world.trains.map(train => train.map(part => `${part.x},${part.y}`).join(';')).join('/');
  const switches = Object.values(world.switchStates).map(s => (s.isStraight ? 1 : 0)).join('');
  const semaphores = Object.values(world.semaphoreStates).map(s => (s.isOpen ? 1 : 0)).join('');
  return `${heads}|${cells}#${switches}#${semaphores}`;
}

function controls(world: World): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const add = (key: string) => {
    const [x, y] = key.split(',').map(Number);
    if (!result.some(c => c.x === x && c.y === y)) result.push({ x, y });
  };
  Object.keys(world.switchStates).forEach(add);
  Object.keys(world.semaphoreStates)
    .filter(key => {
      const [x, y] = key.split(',').map(Number);
      // Семафор на стрелке кликом не переключить (стрелка важнее)
      return classifyCell(world.track.cells[y][x].connections).kind !== 'switch';
    })
    .forEach(add);
  return result;
}

const headCells = (world: World) => world.trainStates.map(train => {
  const head = train.segments[train.segments.length - 1];
  return `${head.x},${head.y}`;
}).join('|');

// Крутит мир до следующей точки решения
function advance(world: World, maxTicks: number): void {
  const startCells = headCells(world);
  const startTick = world.tick;
  while (world.status === 'running' && world.tick < maxTicks) {
    stepWorld(world);
    if (headCells(world) !== startCells) return;
    const someoneStopped = world.trainStates.some(train => train.speed === 0);
    if (someoneStopped && world.tick - startTick >= WAIT_TICKS) return;
  }
}

export function solveLevel(level: LegacyLevel, { maxTicks = 90 * TICK_RATE, maxNodes = 200_000 }: SolverOptions = {}): SolverResult {
  const initial = createWorld(level);
  const buttons = controls(initial);
  const deque: { world: World; actions: SolverAction[] }[] = [{ world: initial, actions: [] }];
  const seen = new Set([stateKey(initial)]);
  let expanded = 0;

  while (deque.length > 0 && expanded < maxNodes) {
    const node = deque.shift()!;
    expanded++;
    for (const button of [null, ...buttons]) {
      const world = cloneWorld(node.world);
      let actions = node.actions;
      if (button) {
        const before = stateKey(world);
        clickCell(world, button.x, button.y);
        if (stateKey(world) === before) continue; // клик ничего не изменил (например, на стрелке стоит поезд)
        actions = [...actions, { tick: world.tick, x: button.x, y: button.y }];
      }
      advance(world, maxTicks);
      if (world.status === 'won') return { actions, wonAtTick: world.tick, expanded };
      if (world.status !== 'running' || world.tick >= maxTicks) continue;
      const key = stateKey(world);
      if (seen.has(key)) continue;
      seen.add(key);
      // Без клика — в начало очереди (стоимость 0), с кликом — в конец (стоимость 1)
      if (button) deque.push({ world, actions });
      else deque.unshift({ world, actions });
    }
  }
  return { actions: null, expanded };
}
