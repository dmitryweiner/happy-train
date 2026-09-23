// Известные баги legacy-движка (FIXIN-PLAN.md §2.2, §2.3).
// test.failing: тест описывает ПРАВИЛЬНОЕ поведение и сейчас падает.
// Когда баг исправят, jest сообщит об этом, и тест нужно перевести в обычный test.
const { LegacySim, DT, TICK_RATE } = require('./legacy-harness');

function runWithFrames(levelIndex, frameDt, seconds, options) {
  const sim = new LegacySim(levelIndex, options);
  let time = 0;
  let frame = 0;
  while (sim.status === 'running' && time < seconds) {
    const dt = frameDt(frame++, time);
    sim.step(dt);
    time += dt;
  }
  return { sim, time };
}

const EMPTY_ROW = () => Array(15).fill(' ');

describe('legacy engine: known bugs', () => {
  test.failing('неровная частота кадров не сводит поезд с рельс (уровень 6)', () => {
    const jitter = (frame) => [1 / 60, 1 / 30, 1 / 20][frame % 3];
    const { sim } = runWithFrames(5, jitter, 40);
    expect(sim.status).toBe('running');
  });

  test.failing('одно подвисание кадра на 100 мс не сводит поезд с рельс (уровень 1)', () => {
    // Кадр 180 — один из неудачных моментов: при dt = 0.1 сход случается в 9 из 120 проверенных кадров.
    const spike = (frame) => (frame === 180 ? 0.1 : DT);
    const { sim } = runWithFrames(0, spike, 20);
    expect(sim.status).toBe('running');
  });

  test('без подвисаний уровень 1 едет 20 секунд без схода (контроль к тесту выше)', () => {
    const { sim } = runWithFrames(0, () => DT, 20);
    expect(sim.status).toBe('running');
  });

  test.failing('въезд в клетку с перпендикулярным рельсом — сход', () => {
    const grid = Array.from({ length: 10 }, EMPTY_ROW);
    grid[1] = Array(15).fill('-');
    grid[1][6] = '|';
    const customLevel = {
      grid,
      semaphores: [],
      trains: [[{ type: 'locomotive', x: 3, y: 1, direction: 0 }]],
      targetPoint: { x: 14, y: 9 },
    };
    const sim = new LegacySim(0, { customLevel });
    while (sim.status === 'running' && sim.game.trains[0][0].x < 6) sim.step();
    // Локомотив въехал в "|" на ходу вправо: дальше ехать нельзя.
    for (let i = 0; i < TICK_RATE && sim.status === 'running'; i++) sim.step();
    expect(sim.status).toBe('crashed');
  });
});
