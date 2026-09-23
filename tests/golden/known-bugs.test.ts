// Известные баги движка (FIXIN-PLAN.md §2.2, §2.3). Движок выбирается как в golden-тестах (GOLDEN_ENGINE).
// test.fails: тест описывает ПРАВИЛЬНОЕ поведение и сейчас падает.
// Когда баг исправят, vitest сообщит об этом, и тест нужно перевести в обычный test.
import { describe, expect, test } from 'vitest';
import type { LegacyLevel } from '../../src/types';
import { createSim } from './current-sim';
import { DT, TICK_RATE } from './legacy-harness';

function runWithFrames(levelIndex: number, frameDt: (frame: number, time: number) => number, seconds: number) {
  const sim = createSim(levelIndex);
  let time = 0;
  let frame = 0;
  while (sim.status === 'running' && time < seconds) {
    const dt = frameDt(frame++, time);
    sim.step(dt);
    time += dt;
  }
  return { sim, time };
}

const EMPTY_ROW = (): string[] => Array(15).fill(' ');

describe('known engine bugs', () => {
  test.fails('неровная частота кадров не сводит поезд с рельс (уровень 6)', () => {
    const jitter = (frame: number) => [1 / 60, 1 / 30, 1 / 20][frame % 3];
    const { sim } = runWithFrames(5, jitter, 40);
    expect(sim.status).toBe('running');
  });

  test.fails('одно подвисание кадра на 100 мс не сводит поезд с рельс (уровень 1)', () => {
    // Кадр 180 — один из неудачных моментов: при dt = 0.1 сход случается в 9 из 120 проверенных кадров.
    const spike = (frame: number) => (frame === 180 ? 0.1 : DT);
    const { sim } = runWithFrames(0, spike, 20);
    expect(sim.status).toBe('running');
  });

  test('без подвисаний уровень 1 едет 20 секунд без схода (контроль к тесту выше)', () => {
    const { sim } = runWithFrames(0, () => DT, 20);
    expect(sim.status).toBe('running');
  });

  test.fails('въезд в клетку с перпендикулярным рельсом — сход', () => {
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
    while (sim.status === 'running' && sim.trains[0][0].x < 6) sim.step();
    // Локомотив въехал в "|" на ходу вправо: дальше ехать нельзя.
    for (let i = 0; i < TICK_RATE && sim.status === 'running'; i++) sim.step();
    expect(sim.status).toBe('crashed');
  });
});
