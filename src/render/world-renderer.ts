import { isSwitchCell } from '../core/legacy-import';
import { getSwitchState, isSemaphoreAt, type World } from '../core/world';
import { drawCell, drawSemaphoreCell, drawStationIcon, drawSwitchCell, drawTrainPart } from './graphics';

// Всё, что не двигается: фон, рельсы, стрелки, семафоры, станция
export function drawStaticLayer(
  ctx: CanvasRenderingContext2D,
  world: World,
  backgroundCanvas: CanvasImageSource,
): void {
  // Clear canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw background
  ctx.drawImage(backgroundCanvas, 0, 0);

  const targetPoint = world.level.targetPoint;

  // Draw grid (rails only)
  for (let y = 0; y < world.grid.length; y++) {
    for (let x = 0; x < world.grid[y].length; x++) {
      const cellType = world.grid[y][x];

      // Станция — подложка: стрелка или семафор на ней рисуются со своим состоянием (§2.3.6)
      if (x === targetPoint.x && y === targetPoint.y) {
        drawStationIcon(ctx, x, y);
      }
      if (isSwitchCell(cellType)) {
        drawSwitchCell(ctx, x, y, cellType, getSwitchState(world, x, y));
      } else if (isSemaphoreAt(world, x, y)) {
        const semaphoreState = world.semaphoreStates[`${x},${y}`];
        drawSemaphoreCell(ctx, x, y, cellType, semaphoreState?.isOpen);
      } else {
        drawCell(ctx, x, y, cellType);
      }
    }
  }
}

export function drawTrains(ctx: CanvasRenderingContext2D, world: World): void {
  // Draw train and all wagons
  world.trains.forEach(train => {
    train.forEach(part => {
      drawTrainPart(ctx, part);
    });
  });
}

// Полная перерисовка кадра. Эталон для WorldRenderer (тесты сравнивают кадры побайтно).
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  backgroundCanvas: CanvasImageSource,
): void {
  drawStaticLayer(ctx, world, backgroundCanvas);
  drawTrains(ctx, world);
}

function createDomLayer(): HTMLCanvasElement {
  return document.createElement('canvas');
}

// Отрисовка кадра с кэшем неподвижного слоя. Слой перерисовывается, только когда сменился уровень, фон,
// размер поля или положение стрелок/семафоров (world.controlsVersion); в кадре — один drawImage и поезда.
// Слой непрозрачен (в нём фон), поэтому кадр побайтно совпадает с drawWorld.
export class WorldRenderer {
  private layer: HTMLCanvasElement | null = null;
  private layerKey: { world: World; version: number; background: CanvasImageSource } | null = null;
  // Сколько раз перерисовывался неподвижный слой (для тестов и отладки)
  staticRedraws = 0;

  constructor(private readonly createLayer: () => HTMLCanvasElement = createDomLayer) {}

  draw(ctx: CanvasRenderingContext2D, world: World, backgroundCanvas: CanvasImageSource): void {
    const { width, height } = ctx.canvas;
    const layer = (this.layer ??= this.createLayer());
    const key = this.layerKey;
    const stale =
      !key ||
      key.world !== world ||
      key.version !== world.controlsVersion ||
      key.background !== backgroundCanvas ||
      layer.width !== width ||
      layer.height !== height;
    if (stale) {
      layer.width = width;
      layer.height = height;
      const layerCtx = layer.getContext('2d');
      if (!layerCtx) throw new Error('2D context is not available');
      drawStaticLayer(layerCtx, world, backgroundCanvas);
      this.layerKey = { world, version: world.controlsVersion, background: backgroundCanvas };
      this.staticRedraws++;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(layer, 0, 0);
    drawTrains(ctx, world);
  }
}
