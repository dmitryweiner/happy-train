// Headless-обвязка для legacy-движка и общая логика прогона сценариев.
// Загружает скрипты игры в изолированный vm-контекст с заглушками DOM,
// двигает симуляцию фиксированным шагом и снимает с неё trace/events.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, 'legacy');
const SCRIPTS = ['constants.js', 'storage.js', 'levels.js', 'utils.js', 'viewport.js', 'graphics.js', 'game.js'];

const TICK_RATE = 60;
const DT = 1 / TICK_RATE;

let cachedSource = null;
function loadSource() {
  if (cachedSource) return cachedSource;
  // Верхнеуровневые const/class в vm-скрипте не попадают в глобальный объект,
  // поэтому превращаем их в var, чтобы достать Game и levels снаружи.
  cachedSource = SCRIPTS.map(file =>
    fs.readFileSync(path.join(ROOT, file), 'utf8')
      .replace(/^const /gm, 'var ')
      .replace(/^class (\w+)/gm, 'var $1 = class $1')
  ).join('\n;\n');
  return cachedSource;
}

function stubElement() {
  return {
    style: {},
    textContent: '',
    clientWidth: 600,
    clientHeight: 400,
    addEventListener() {},
    getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
  };
}

/** @returns {any} vm-контекст с глобалами legacy-скриптов (Game, levels, isSwitchCell, ...) */
function createContext(levelIndex) {
  const elements = {};
  const context = {
    console,
    Math,
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    localStorage: {
      getItem: () => String(levelIndex),
      setItem() {},
      removeItem() {},
    },
    document: {
      getElementById: id => elements[id] || (elements[id] = stubElement()),
      createElement: () => stubElement(),
      addEventListener() {},
    },
    window: { addEventListener() {} },
  };
  vm.createContext(context);
  vm.runInContext(
    loadSource() +
      '\n;Game.prototype.draw = function () {};' +
      '\ngenerateBackground = function () { return {}; };',
    context
  );
  return context;
}

const OVERLAYS = ['gameOverScreen', 'levelCompleteScreen', 'gameWinScreen'];

// Общая обёртка над объектом Game (legacy или из src/): клики, шаг, итог, снимки состояния.
class GameSim {
  // game — экземпляр Game без отрисовки; isSwitchCell — функция того же движка.
  constructor(game, { isSwitchCell, levelCount }) {
    this.game = game;
    this.isSwitchCell = isSwitchCell;
    this.levelCount = levelCount;
    this.tick = 0;
    this.status = 'running';
    this.reason = null;
  }

  get trains() {
    return this.game.trains;
  }

  get switchStates() {
    return this.game.switchStates;
  }

  get semaphoreStates() {
    return this.game.semaphoreStates;
  }

  // Повторяет handleSwitchInteraction из game.js: стрелка важнее семафора.
  click(x, y) {
    const game = this.game;
    const cellType = game.grid[y][x];
    if (this.isSwitchCell(cellType)) {
      game.toggleSwitch(x, y);
    } else if (game.isSemaphoreAtPosition(x, y)) {
      game.toggleSemaphore(x, y);
    }
  }

  controls() {
    const game = this.game;
    const result = [];
    for (const key of Object.keys(game.switchStates)) {
      const [x, y] = key.split(',').map(Number);
      result.push({ kind: 'switch', x, y });
    }
    for (const key of Object.keys(game.semaphoreStates)) {
      const [x, y] = key.split(',').map(Number);
      if (!this.isSwitchCell(game.grid[y][x])) result.push({ kind: 'semaphore', x, y });
    }
    return result;
  }

  step(dt = DT) {
    if (this.status !== 'running') return;
    this.game.update(dt);
    this.tick++;
    const game = this.game;
    if (game.gameOverScreen.style.display === 'block') {
      this.status = 'crashed';
      this.reason = game.checkCollisions() ? 'collision' : 'derail';
    } else if (
      game.levelCompleteScreen.style.display === 'block' ||
      game.gameWinScreen.style.display === 'block'
    ) {
      this.status = 'won';
    }
  }

  // Мутабельное состояние симуляции целиком (для перебора в солвере).
  snapshot() {
    const game = this.game;
    return {
      tick: this.tick,
      status: this.status,
      reason: this.reason,
      trains: structuredClone(game.trains),
      switchStates: structuredClone(game.switchStates),
      semaphoreStates: structuredClone(game.semaphoreStates),
    };
  }

  restore(snap) {
    const game = this.game;
    this.tick = snap.tick;
    this.status = snap.status;
    this.reason = snap.reason;
    game.trains = structuredClone(snap.trains);
    game.switchStates = structuredClone(snap.switchStates);
    game.semaphoreStates = structuredClone(snap.semaphoreStates);
    for (const overlay of OVERLAYS) game[overlay].style.display = 'none';
  }
}

// Legacy-движок из замороженной копии (tests/golden/legacy/).
class LegacySim extends GameSim {
  // customLevel — уровень в формате levels.js, подменяет уровень levelIndex (для тестов на баги).
  constructor(levelIndex, { customLevel } = {}) {
    const ctx = createContext(levelIndex);
    if (customLevel) ctx.levels[levelIndex] = customLevel;
    super(new ctx.Game(), { isSwitchCell: ctx.isSwitchCell, levelCount: ctx.levels.length });
    this.ctx = ctx;
  }
}

const round = (value, digits) => Number(value.toFixed(digits));

// sim: GameSim или любая симуляция с полями trains / switchStates / semaphoreStates
function traceFrame(sim) {
  return {
    tick: sim.tick,
    trains: sim.trains.map(train => ({
      state: train[0].state,
      speed: round(train[0].speed, 3),
      parts: train.map(part => [
        part.x,
        part.y,
        round(part.pixelX, 1),
        round(part.pixelY, 1),
        round(part.direction, 3),
      ]),
    })),
    switches: Object.fromEntries(Object.entries(sim.switchStates).map(([k, v]) => [k, v.isStraight])),
    semaphores: Object.fromEntries(Object.entries(sim.semaphoreStates).map(([k, v]) => [k, v.isOpen])),
  };
}

/**
 * Прогоняет сценарий (по умолчанию на legacy-движке; createSim подставляет другой движок).
 * scenario = { level: 1-based, maxTicks, actions: [{ tick, x, y }] } — action = клик по клетке перед шагом tick.
 * Возвращает { events, trace }:
 *  - events: для каждого поезда последовательность клеток локомотива с тиком входа, итог и тик итога;
 *  - trace: кадры каждые traceEvery тиков (позиции с округлением до 0.1px).
 * @param {{ level: number, maxTicks?: number, actions?: { tick: number, x: number, y: number }[] }} scenario
 * @param {{ traceEvery?: number, createSim?: (levelIndex: number) => any }} [options]
 */
function runScenario(scenario, { traceEvery = 15, createSim = levelIndex => new LegacySim(levelIndex) } = {}) {
  const sim = createSim(scenario.level - 1);
  const actions = [...(scenario.actions || [])].sort((a, b) => a.tick - b.tick);
  const maxTicks = scenario.maxTicks ?? 60 * TICK_RATE;

  const cells = sim.trains.map(train => [[train[0].x, train[0].y, 0]]);
  const trace = [traceFrame(sim)];
  let next = 0;

  while (sim.status === 'running' && sim.tick < maxTicks) {
    while (next < actions.length && actions[next].tick <= sim.tick) {
      sim.click(actions[next].x, actions[next].y);
      next++;
    }
    sim.step();
    sim.trains.forEach((train, i) => {
      const last = cells[i][cells[i].length - 1];
      if (last[0] !== train[0].x || last[1] !== train[0].y) cells[i].push([train[0].x, train[0].y, sim.tick]);
    });
    if (sim.tick % traceEvery === 0 || sim.status !== 'running') trace.push(traceFrame(sim));
  }

  return {
    events: {
      tickRate: TICK_RATE,
      outcome: { status: sim.status === 'running' ? 'timeout' : sim.status, reason: sim.reason, tick: sim.tick },
      trains: cells.map(list => ({ cells: list })),
      finalCells: sim.trains.map(train => train.map(part => [part.x, part.y])),
    },
    trace,
  };
}

module.exports = { GameSim, LegacySim, runScenario, TICK_RATE, DT };
