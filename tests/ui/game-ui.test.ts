// Интеграционные тесты UI: настоящий Game из src/ui в jsdom (canvas — пакет node-canvas).
// Кадры и время ведёт тест: requestAnimationFrame складывает колбэки в очередь, frame() вызывает их.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, requestInterceptor } from 'jsdom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { STORAGE_KEYS } from '../../src/constants';
import { levels } from '../../src/levels';
import { loadTrainImages } from '../../src/render/graphics';
import type { LegacyLevel } from '../../src/types';
import { Game } from '../../src/ui/game';
import scenarios from '../golden/scenarios.json';

const ROOT = path.join(__dirname, '..', '..');
const FRAME_MS = 1000 / 60;

// Страница живёт на http://localhost/ (localStorage недоступен для file://).
// Ресурсы отдаются из public/, всё остальное (шрифты Google и т. п.) — 404, в сеть тесты не ходят.
const serveFromDisk = requestInterceptor(request => {
  const url = new URL(request.url);
  const file = path.join(ROOT, 'public', decodeURIComponent(url.pathname));
  if (url.host === 'localhost' && fs.existsSync(file)) {
    return new Response(fs.readFileSync(file));
  }
  return new Response(null, { status: 404 });
});

let dom: JSDOM;
let rafQueue: FrameRequestCallback[] = [];
let now = 0;

function installDom(): void {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  dom = new JSDOM(html, { url: 'http://localhost/index.html', resources: { interceptors: [serveFromDisk] }, pretendToBeVisual: true });
  const { window } = dom;
  Object.assign(globalThis, {
    window,
    document: window.document,
    Image: window.Image,
    MouseEvent: window.MouseEvent,
    Event: window.Event,
    localStorage: window.localStorage,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    },
  });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
}

function frame(count = 1): void {
  for (let i = 0; i < count; i++) {
    now += FRAME_MS;
    const callbacks = rafQueue;
    rafQueue = [];
    callbacks.forEach(callback => callback(now));
  }
}

function clickCell(game: Game, x: number, y: number): void {
  game.canvas.dispatchEvent(new MouseEvent('click', { clientX: (x + 0.5) * 40, clientY: (y + 0.5) * 40, bubbles: true }));
}

function isShown(id: string): boolean {
  return document.getElementById(id)?.style.display === 'block';
}

async function startGame(levelList?: LegacyLevel[]): Promise<Game> {
  await loadTrainImages();
  const game = new Game(levelList);
  // jsdom не делает раскладку: canvas показывается в натуральном размере 600×400
  game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400, x: 0, y: 0, toJSON() {} });
  return game;
}

// Уровень, который выигрывается сам через ~1.5 секунды: прямая, станция в двух клетках от локомотива
function nearWinLevel(): LegacyLevel {
  const grid = Array.from({ length: 10 }, () => Array(15).fill(' ')) as LegacyLevel['grid'];
  grid[1] = Array(15).fill('-') as LegacyLevel['grid'][number];
  return { grid, semaphores: [], trains: [[{ type: 'locomotive', x: 3, y: 1, direction: 0 }]], targetPoint: { x: 5, y: 1 } };
}

function runUntil(condition: () => boolean, maxFrames = 600): void {
  for (let i = 0; i < maxFrames && !condition(); i++) frame();
}

beforeEach(() => {
  now = 0;
  rafQueue = [];
  installDom();
});

afterEach(() => {
  vi.restoreAllMocks();
  dom.window.close();
});

describe('Game UI', () => {
  test('стартует с первого уровня и рисует поле 600×400', async () => {
    const game = await startGame();
    expect(game.canvas.width).toBe(600);
    expect(game.canvas.height).toBe(400);
    expect(document.getElementById('level-display')?.textContent).toBe('Level #1');
    frame(10);
    expect(game.world.trains[0][0].speed).toBeGreaterThan(0);
  });

  test('клик по стрелке переключает её', async () => {
    const game = await startGame();
    expect(game.world.switchStates['5,3'].isStraight).toBe(true);
    clickCell(game, 5, 3);
    expect(game.world.switchStates['5,3'].isStraight).toBe(false);
  });

  test('клик по семафору переключает его', async () => {
    const game = await startGame();
    expect(game.world.semaphoreStates['7,3'].isOpen).toBe(false);
    clickCell(game, 7, 3);
    expect(game.world.semaphoreStates['7,3'].isOpen).toBe(true);
  });

  test('решение уровня 1 кликами по канвасу показывает «Level complete»', async () => {
    const game = await startGame();
    const solution = scenarios.find(s => s.name === 'L1-solution');
    if (!solution?.actions) throw new Error('no L1 solution');
    // Первый кадр отрисован в конструкторе; дальше кадр = тик
    for (let tick = 0; tick < 3000 && !isShown('levelComplete'); tick++) {
      for (const action of solution.actions) {
        if (action.tick === tick) clickCell(game, action.x, action.y);
      }
      frame();
    }
    expect(isShown('levelComplete')).toBe(true);
    expect(isShown('gameOver')).toBe(false);
   }, 60_000); // ~1400 кадров с полной отрисовкой на node-canvas

  test('последний уровень пройден — «You are winner»', async () => {
    await startGame([nearWinLevel()]);
    runUntil(() => isShown('gameWin'));
    expect(isShown('gameWin')).toBe(true);
    expect(isShown('levelComplete')).toBe(false);
  });

  test('сход с рельс показывает «Game over», «Play Again» перезапускает уровень', async () => {
    const level = nearWinLevel();
    level.targetPoint = { x: 14, y: 9 };
    level.grid[1][8] = ' ';
    const game = await startGame([level]);
    runUntil(() => isShown('gameOver'));
    expect(isShown('gameOver')).toBe(true);
    expect(game.world.crash?.reason).toBe('derail');
    document.getElementById('playAgain')?.dispatchEvent(new MouseEvent('click'));
    expect(isShown('gameOver')).toBe(false);
    expect(game.world.status).toBe('running');
    expect(game.world.trains[0][0].x).toBe(3);
  });

  test('«Next Level» переходит на уровень 2 и сохраняет прогресс', async () => {
    const game = await startGame([nearWinLevel(), levels[1]]);
    runUntil(() => isShown('levelComplete'));
    expect(isShown('levelComplete')).toBe(true);
    document.getElementById('nextLevel')?.dispatchEvent(new MouseEvent('click'));
    expect(game.currentLevelIndex).toBe(1);
    expect(document.getElementById('level-display')?.textContent).toBe('Level #2');
    expect(localStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL)).toBe('1');
  });

  test('размер поля берётся из уровня', async () => {
    const small: LegacyLevel = {
      grid: [
        ['┌', '-', '-', '-', '┐'],
        ['|', ' ', ' ', ' ', '|'],
        ['└', '-', '-', '-', '┘'],
      ],
      semaphores: [],
      trains: [[{ type: 'locomotive', x: 2, y: 0, direction: 0 }]],
      targetPoint: { x: 2, y: 2 },
    };
    const game = await startGame([small]);
    expect([game.canvas.width, game.canvas.height]).toEqual([200, 120]);
    expect(document.documentElement.style.getPropertyValue('--board-w')).toBe('204px');
    game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 120, right: 200, bottom: 120, x: 0, y: 0, toJSON() {} });
    runUntil(() => isShown('gameWin'));
    expect(isShown('gameWin')).toBe(true);
  });

  test('клик по номеру уровня ставит игру на паузу', async () => {
    const game = await startGame();
    frame(5);
    const x = game.world.trains[0][0].pixelX;
    document.getElementById('level-display')?.dispatchEvent(new MouseEvent('click'));
    frame(30);
    expect(game.world.trains[0][0].pixelX).toBe(x);
  });

  // Исправленные баги UI (FIXIN-PLAN.md §2.3)

  test('ручная пауза не снимается при возврате фокуса в окно (§2.3.4)', async () => {
    const game = await startGame();
    document.getElementById('level-display')?.dispatchEvent(new MouseEvent('click'));
    expect(document.getElementById('level-display')?.textContent).toBe('Level #1 · PAUSED');
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    const x = game.world.trains[0][0].pixelX;
    frame(30);
    expect(game.world.trains[0][0].pixelX).toBe(x);
    // Снять паузу можно только тем же кликом
    document.getElementById('level-display')?.dispatchEvent(new MouseEvent('click'));
    frame(30);
    expect(game.world.trains[0][0].pixelX).toBeGreaterThan(x);
  });

  test('потеря фокуса ставит автопаузу, возврат — снимает', async () => {
    const game = await startGame();
    frame(5);
    window.dispatchEvent(new Event('blur'));
    const x = game.world.trains[0][0].pixelX;
    frame(30);
    expect(game.world.trains[0][0].pixelX).toBe(x);
    window.dispatchEvent(new Event('focus'));
    frame(30);
    expect(game.world.trains[0][0].pixelX).toBeGreaterThan(x);
    expect(document.getElementById('level-display')?.textContent).toBe('Level #1');
  });

  test('прогресс сохраняется сразу при прохождении уровня (§2.3.5)', async () => {
    await startGame([nearWinLevel(), levels[1]]);
    runUntil(() => isShown('levelComplete'));
    expect(isShown('levelComplete')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL)).toBe('1');
  });

  // Цикл отрисовки не крутится вхолостую: на паузе и на экранах итога кадры не запрашиваются
  describe('цикл кадров', () => {
    const framesRequested = () => rafQueue.length;
    const pause = () => document.getElementById('level-display')?.dispatchEvent(new MouseEvent('click'));

    test('ручная пауза останавливает цикл, снятие паузы запускает', async () => {
      const game = await startGame();
      frame(5);
      pause();
      frame(); // кадр, в котором игра узнаёт о паузе
      expect(framesRequested()).toBe(0);
      const x = game.world.trains[0][0].pixelX;
      pause();
      expect(framesRequested()).toBe(1);
      frame(30);
      expect(game.world.trains[0][0].pixelX).toBeGreaterThan(x);
    });

    test('автопауза (окно без фокуса) останавливает цикл', async () => {
      await startGame();
      frame(5);
      window.dispatchEvent(new Event('blur'));
      frame();
      expect(framesRequested()).toBe(0);
      window.dispatchEvent(new Event('focus'));
      expect(framesRequested()).toBe(1);
    });

    test('клик по стрелке на паузе перерисовывает кадр один раз', async () => {
      const game = await startGame();
      pause();
      frame();
      expect(framesRequested()).toBe(0);
      const drawSpy = vi.spyOn(game, 'draw');
      clickCell(game, 5, 3);
      expect(framesRequested()).toBe(1);
      frame();
      expect(drawSpy).toHaveBeenCalledTimes(1);
      expect(framesRequested()).toBe(0);
    });

    test('после крушения цикл останавливается, «Play Again» запускает', async () => {
      const level = nearWinLevel();
      level.targetPoint = { x: 14, y: 9 };
      level.grid[1][8] = ' ';
      const game = await startGame([level]);
      runUntil(() => isShown('gameOver'));
      frame();
      expect(framesRequested()).toBe(0);
      document.getElementById('playAgain')?.dispatchEvent(new MouseEvent('click'));
      expect(framesRequested()).toBe(1);
      frame(30);
      expect(game.world.trains[0][0].speed).toBeGreaterThan(0);
    });

    test('после победы цикл останавливается, «Next Level» запускает', async () => {
      const game = await startGame([nearWinLevel(), levels[1]]);
      runUntil(() => isShown('levelComplete'));
      frame();
      expect(framesRequested()).toBe(0);
      document.getElementById('nextLevel')?.dispatchEvent(new MouseEvent('click'));
      expect(framesRequested()).toBe(1);
      frame(10);
      expect(game.world.trains[0][0].speed).toBeGreaterThan(0);
    });

    test('повторные запуски не плодят параллельные циклы', async () => {
      await startGame();
      pause();
      pause();
      pause();
      pause();
      expect(framesRequested()).toBeLessThanOrEqual(1);
      frame(3);
      expect(framesRequested()).toBe(1);
    });
  });
});
