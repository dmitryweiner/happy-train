import { isSwitchCell } from '../core/legacy-import';
import { getSwitchState, isSemaphoreAt, type World } from '../core/world';
import { drawCell, drawSemaphoreCell, drawStationIcon, drawSwitchCell, drawTrainPart } from './graphics';

export function drawWorld(
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

  // Draw train and all wagons
  world.trains.forEach(train => {
    train.forEach(part => {
      drawTrainPart(ctx, part);
    });
  });
}
