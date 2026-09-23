// Баги legacy-движка (FIXIN-PLAN.md §2.2, §2.3), исправленные новым движком на этапе 5.
// На legacy-движке (GOLDEN_ENGINE=legacy) эти тесты падают — это ожидаемо.
import { describe, expect, test } from 'vitest';
import type { LegacyLevel } from '../../src/types';
import { createSim, ENGINE } from './current-sim';
import { DT, TICK_RATE } from './legacy-harness';

const onLegacy = ENGINE === 'legacy';

function runWithFrames(levelIndex: number, frameDt: (frame: number) => number, seconds: number) {
  const sim = createSim(levelIndex);
  let time = 0;
  let frame = 0;
  while (sim.status === 'running' && time < seconds - 1e-9) {
    const dt = frameDt(frame++);
    sim.step(dt);
    time += dt;
  }
  return sim;
}

interface PartLike {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
}

const trainsOf = (sim: ReturnType<typeof createSim>): PartLike[][] => sim.trains;
const partsOf = (sim: ReturnType<typeof createSim>) =>
  trainsOf(sim).map(train => train.map(part => [part.x, part.y, part.pixelX.toFixed(6), part.pixelY.toFixed(6)]));
const cellsOf = (sim: ReturnType<typeof createSim>) => trainsOf(sim).map(train => train.map(part => [part.x, part.y]));

const EMPTY_ROW = (): string[] => Array(15).fill(' ');

describe.skipIf(onLegacy)('движок: исправленные баги legacy', () => {
  test('результат не зависит от частоты кадров (§2.2.3): 60 fps ≡ 144 fps ≡ рваные кадры', () => {
    // 40 секунд уровня 6: legacy на рваных кадрах сходил с рельс на ~27-й секунде
    const steady = runWithFrames(5, () => DT, 40);
    const fast = runWithFrames(5, () => 1 / 144, 40);
    const jitter = runWithFrames(5, frame => [1 / 60, 1 / 30, 1 / 20][frame % 3], 40);
    expect(steady.status).toBe('running');
    expect(partsOf(jitter)).toEqual(partsOf(steady));
    // 144 fps не делится на 60: к концу может не хватить части тика — сравниваем клетки
    expect(cellsOf(fast)).toEqual(cellsOf(steady));
  });

  test('подвисание кадра на 100 мс не сводит поезд с рельс (§2.2.3)', () => {
    const spike = runWithFrames(0, frame => (frame === 180 ? 0.1 : DT), 20);
    const steady = runWithFrames(0, () => DT, 20);
    expect(spike.status).toBe('running');
    expect(partsOf(spike)).toEqual(partsOf(steady));
  });

  test('въезд в клетку с перпендикулярным рельсом — сход (§2.3.1)', () => {
    const grid = Array.from({ length: 10 }, EMPTY_ROW);
    grid[1] = Array(15).fill('-');
    grid[1][6] = '|';
    const customLevel = {
      grid: grid as LegacyLevel['grid'],
      semaphores: [],
      trains: [[{ type: 'locomotive' as const, x: 3, y: 1, direction: 0 }]],
      targetPoint: { x: 14, y: 9 },
    };
    const sim = createSim(0, { customLevel });
    while (sim.status === 'running' && sim.tick < 10 * TICK_RATE) sim.step();
    expect(sim.status).toBe('crashed');
    expect(sim.reason).toBe('derail');
    // Поезд остановился перед клеткой, в которую не смог въехать
    expect(sim.trains[0][0].x).toBe(5);
  });

  test('переключение стрелки между локомотивом и вагоном не разрывает состав (§2.2.5)', () => {
    // Legacy-решение уровня 6 (L6-solution) пользовалось этим багом: стрелку (0,5) щёлкают туда и обратно,
    // локомотив уходит на восток, а вагоны продолжают кружить по старому пути.
    const sim = createSim(5);
    const actions = [{ tick: 709, x: 0, y: 5 }, { tick: 763, x: 0, y: 5 }];
    for (let tick = 0; tick < 1000 && sim.status === 'running'; tick++) {
      for (const action of actions) if (action.tick === tick) sim.click(action.x, action.y);
      sim.step();
      const parts = sim.trains[0];
      for (let i = 1; i < parts.length; i++) {
        // Соседние клетки, включая диагональ: на повороте дуга короче интервала между вагонами
        const gap = Math.max(Math.abs(parts[i].x - parts[i - 1].x), Math.abs(parts[i].y - parts[i - 1].y));
        expect(gap, `tick ${sim.tick}: part ${i} is ${gap} cells from part ${i - 1}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
