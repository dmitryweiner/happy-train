// Обёртка над Game из src/ для golden-тестов: те же сценарии, что и у legacy-движка.
import { Game } from '../../src/game';
import { levels } from '../../src/levels';
import type { LegacyLevel } from '../../src/types';
import { isSwitchCell } from '../../src/utils';
import { GameSim, LegacySim } from './legacy-harness';

let storedLevel = 0;
let drawDisabled = false;

function stubElement() {
  const noop = () => {};
  return {
    style: {} as Record<string, string>,
    textContent: '',
    clientWidth: 600,
    clientHeight: 400,
    addEventListener: noop,
    // Контекст-заглушка: любой метод — пустая функция (фон и отрисовка в тестах не нужны)
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
  };
}

// Свежие DOM-заглушки на каждую симуляцию: Game хранит ссылки на элементы (экраны итога и т. п.),
// и состояние одной симуляции не должно просачиваться в следующую.
function installDomStubs(): void {
  const elements: Record<string, ReturnType<typeof stubElement>> = {};
  Object.assign(globalThis, {
    document: {
      getElementById: (id: string) => elements[id] || (elements[id] = stubElement()),
      createElement: () => stubElement(),
      addEventListener: () => {},
    },
    window: { addEventListener: () => {} },
    localStorage: {
      getItem: () => String(storedLevel),
      setItem: () => {},
      removeItem: () => {},
    },
    requestAnimationFrame: () => 0,
  });
  if (!drawDisabled) {
    drawDisabled = true;
    // Отрисовка в симуляции не участвует
    Game.prototype.draw = () => {};
  }
}

export type Sim = InstanceType<typeof GameSim>;

export class CurrentSim extends GameSim {
  constructor(levelIndex: number, { customLevel }: { customLevel?: LegacyLevel } = {}) {
    installDomStubs();
    storedLevel = levelIndex;
    const list = customLevel ? levels.map((level, i) => (i === levelIndex ? customLevel : level)) : levels;
    // Как в legacy-обвязке: время стоит на нуле, первый кадр из конструктора получает deltaTime = 0
    const originalNow = performance.now;
    performance.now = () => 0;
    let game: Game;
    try {
      game = new Game(list);
    } finally {
      performance.now = originalNow;
    }
    super(game, { isSwitchCell, levelCount: list.length });
  }
}

// Движок для golden-тестов: GOLDEN_ENGINE=legacy — замороженная копия, иначе код из src/
export const ENGINE = process.env.GOLDEN_ENGINE === 'legacy' ? 'legacy' : 'current';

export function createSim(levelIndex: number, options: { customLevel?: LegacyLevel } = {}): Sim {
  return ENGINE === 'legacy' ? new LegacySim(levelIndex, options) : new CurrentSim(levelIndex, options);
}
