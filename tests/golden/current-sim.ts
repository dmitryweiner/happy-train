// Симуляция на движке из src/ (core/world) с тем же интерфейсом, что у legacy-обвязки.
import { isSwitchCell } from '../../src/core/legacy-import';
import { clickCell, createWorld, stepWorld, type World } from '../../src/core/world';
import { levels } from '../../src/levels';
import type { LegacyLevel } from '../../src/types';
import { DT, LegacySim } from './legacy-harness';

export class CurrentSim {
  readonly world: World;
  readonly levelCount = levels.length;
  tick = 0;

  constructor(levelIndex: number, { customLevel }: { customLevel?: LegacyLevel } = {}) {
    this.world = createWorld(customLevel ?? levels[levelIndex]);
  }

  get status() {
    return this.world.status;
  }

  get reason() {
    return this.world.crash?.reason ?? null;
  }

  get trains() {
    return this.world.trains;
  }

  get switchStates() {
    return this.world.switchStates;
  }

  get semaphoreStates() {
    return this.world.semaphoreStates;
  }

  click(x: number, y: number): void {
    clickCell(this.world, x, y);
  }

  controls(): { kind: 'switch' | 'semaphore'; x: number; y: number }[] {
    const parse = (key: string) => key.split(',').map(Number) as [number, number];
    return [
      ...Object.keys(this.world.switchStates).map(key => {
        const [x, y] = parse(key);
        return { kind: 'switch' as const, x, y };
      }),
      ...Object.keys(this.world.semaphoreStates)
        .map(parse)
        .filter(([x, y]) => !isSwitchCell(this.world.grid[y][x]))
        .map(([x, y]) => ({ kind: 'semaphore' as const, x, y })),
    ];
  }

  // Шаг сценария — кадр длиной dt: симуляция делает столько фиксированных тиков, сколько накопилось
  private accumulator = 0;

  step(dt = DT): void {
    if (this.status !== 'running') return;
    this.accumulator += dt;
    while (this.accumulator >= DT - 1e-9 && this.status === 'running') {
      stepWorld(this.world);
      this.accumulator -= DT;
    }
    this.tick++;
  }
}

export type Sim = CurrentSim | InstanceType<typeof LegacySim>;

// Движок для golden-тестов: GOLDEN_ENGINE=legacy — замороженная копия, иначе код из src/
export const ENGINE = process.env.GOLDEN_ENGINE === 'legacy' ? 'legacy' : 'current';

export function createSim(levelIndex: number, options: { customLevel?: LegacyLevel } = {}): Sim {
  return ENGINE === 'legacy' ? new LegacySim(levelIndex, options) : new CurrentSim(levelIndex, options);
}
