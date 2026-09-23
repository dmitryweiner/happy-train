// Отрисовка целого кадра игры.
//  - golden-кадры эталонной отрисовки drawWorld (всё поле заново каждый кадр);
//  - кэширующий WorldRenderer (неподвижный слой рисуется один раз) обязан давать побайтно тот же кадр.
// Картинок поезда в Node нет — поезд рисуется запасными прямоугольниками, этого достаточно для сравнения.
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, type Canvas } from 'canvas';
import { describe, expect, test } from 'vitest';
import { compileLevel } from '../src/core/level-v2';
import { clickCell, createWorld, stepWorld, type World } from '../src/core/world';
import { generateBackground } from '../src/render/graphics';
import { drawWorld, WorldRenderer } from '../src/render/world-renderer';
import { compareCanvasWithReference } from './setup';

const loadLevel = (n: number) =>
  compileLevel(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', `${String(n).padStart(2, '0')}.json`), 'utf8'))).legacy;

type Ctx = CanvasRenderingContext2D;
const ctxOf = (canvas: Canvas) => canvas.getContext('2d') as unknown as Ctx;

function setup(level: number) {
  const world = createWorld(loadLevel(level));
  const width = world.track.width * 40;
  const height = world.track.height * 40;
  const background = generateBackground({ width, height }, world.grid, false, createCanvas) as unknown as CanvasImageSource;
  return { world, width, height, background };
}

function referenceFrame(world: World, background: CanvasImageSource, width: number, height: number): Canvas {
  const canvas = createCanvas(width, height);
  drawWorld(ctxOf(canvas), world, background);
  return canvas;
}

describe('кадр целиком: эталон drawWorld', () => {
  test('уровень 1 на старте', () => {
    const { world, background, width, height } = setup(1);
    const { diffPixels } = compareCanvasWithReference(referenceFrame(world, background, width, height), 'frame-level1-start');
    expect(diffPixels).toBe(0);
  });

  test('уровень 1: стрелки и семафор переключены, поезд в пути', () => {
    const { world, background, width, height } = setup(1);
    for (let tick = 0; tick < 300; tick++) stepWorld(world);
    clickCell(world, 6, 3); // стрелка
    clickCell(world, 7, 3); // семафор
    const { diffPixels } = compareCanvasWithReference(referenceFrame(world, background, width, height), 'frame-level1-moving');
    expect(diffPixels).toBe(0);
  });
});

describe('WorldRenderer: тот же кадр, что и drawWorld', () => {
  // Каждый клик — [тик, x, y]; клики по стрелкам и семафорам меняют неподвижный слой
  const scenarios: { level: number; clicks: [number, number, number][] }[] = [
    { level: 1, clicks: [[60, 5, 3], [120, 7, 3], [150, 7, 9], [200, 14, 2]] },
    { level: 3, clicks: [[30, 4, 2], [90, 9, 6]] },
    { level: 6, clicks: [[100, 0, 5], [160, 0, 5]] },
    { level: 8, clicks: [[50, 9, 8], [70, 9, 6]] },
  ];

  for (const { level, clicks } of scenarios) {
    test(`уровень ${level}: кадры совпадают побайтно`, () => {
      const { world, background, width, height } = setup(level);
      const canvas = createCanvas(width, height);
      const renderer = new WorldRenderer(() => createCanvas(width, height) as unknown as HTMLCanvasElement);
      for (let tick = 0; tick <= 240; tick++) {
        for (const [at, x, y] of clicks) if (at === tick) clickCell(world, x, y);
        if (tick % 20 === 0) {
          renderer.draw(ctxOf(canvas), world, background);
          const expected = referenceFrame(world, background, width, height);
          expect(canvas.toBuffer('raw').equals(expected.toBuffer('raw')), `tick ${tick}`).toBe(true);
        }
        stepWorld(world);
      }
    });
  }

  test('неподвижный слой перерисовывается только при изменении стрелок и семафоров', () => {
    const { world, background, width, height } = setup(1);
    let layers = 0;
    const renderer = new WorldRenderer(() => {
      layers++;
      return createCanvas(width, height) as unknown as HTMLCanvasElement;
    });
    const canvas = createCanvas(width, height);
    const draw = () => renderer.draw(ctxOf(canvas), world, background);
    draw();
    const afterFirst = renderer.staticRedraws;
    for (let i = 0; i < 30; i++) {
      stepWorld(world);
      draw();
    }
    expect(renderer.staticRedraws).toBe(afterFirst);
    clickCell(world, 5, 3); // стрелка переключилась
    draw();
    expect(renderer.staticRedraws).toBe(afterFirst + 1);
    clickCell(world, 1, 1); // пустая клетка: ничего не изменилось
    draw();
    expect(renderer.staticRedraws).toBe(afterFirst + 1);
    expect(layers).toBe(1); // канвас слоя создаётся один раз
  });
});
