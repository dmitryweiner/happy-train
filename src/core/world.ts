// Состояние игрового мира и один шаг симуляции. Без DOM: используется игрой, тестами и солвером.
import {
  CELL_SIZE,
  CELL_TYPES,
  GRID_HEIGHT,
  GRID_WIDTH,
  LOCOMOTIVE_STATES,
  TRAIN_ACCELERATION,
  TRAIN_DECELERATION,
  TRAIN_MAX_SPEED,
  type CellType,
} from '../constants';
import type { LegacyLevel, TrainPart } from '../types';
import { calculateNextPosition, isSwitchCell } from './movement';

export type WorldStatus = 'running' | 'won' | 'crashed';
export type CrashReason = 'derail' | 'collision';

export interface World {
  readonly level: LegacyLevel;
  grid: CellType[][];
  switchStates: Record<string, { isStraight: boolean }>;
  semaphoreStates: Record<string, { isOpen: boolean }>;
  trains: TrainPart[][];
  status: WorldStatus;
  crash: { trainIndex: number; reason: CrashReason } | null;
}

const cellKey = (x: number, y: number): string => `${x},${y}`;

export function createWorld(level: LegacyLevel): World {
  // Initialize game grid from level data
  const grid = level.grid.map(row => [...row]); // Deep copy the grid

  // Scan grid for switches and set default states
  const switchStates: World['switchStates'] = {};
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (isSwitchCell(grid[y][x])) {
        switchStates[cellKey(x, y)] = { isStraight: true }; // Default state
      }
    }
  }
  for (const sw of level.switches ?? []) {
    const state = switchStates[cellKey(sw.x, sw.y)];
    if (state) state.isStraight = sw.isStraight;
  }

  // Initialize semaphores from level data
  const semaphoreStates: World['semaphoreStates'] = {};
  for (const semaphore of level.semaphores ?? []) {
    semaphoreStates[cellKey(semaphore.x, semaphore.y)] = { isOpen: semaphore.isOpen };
  }

  // Create train parts from level data
  const trains = level.trains.map(train =>
    train.map(trainData => {
      const trainPart: TrainPart = {
        type: trainData.type,
        x: trainData.x,
        y: trainData.y,
        direction: trainData.direction,
        speed: 0,
        pixelX: (trainData.x + 0.5) * CELL_SIZE,
        pixelY: (trainData.y + 0.5) * CELL_SIZE,
      };
      if (trainData.type === 'locomotive') {
        trainPart.state = LOCOMOTIVE_STATES.ACCELERATING;
      } else {
        trainPart.wagonType = trainData.wagonType;
      }
      return trainPart;
    })
  );

  return { level, grid, switchStates, semaphoreStates, trains, status: 'running', crash: null };
}

// Check if any train part is on the given cell
export function isTrainOnCell(world: World, x: number, y: number): boolean {
  return world.trains.some(trainParts => trainParts.some(part => part.x === x && part.y === y));
}

// Check if there is a semaphore at given coordinates
export function isSemaphoreAt(world: World, x: number, y: number): boolean {
  return world.level.semaphores &&
         world.level.semaphores.some(semaphore => semaphore.x === x && semaphore.y === y);
}

export function getSwitchState(world: World, x: number, y: number): boolean | undefined {
  return world.switchStates[cellKey(x, y)]?.isStraight;
}

// Toggle switch state (not while a train is on it)
export function toggleSwitch(world: World, x: number, y: number): void {
  const state = world.switchStates[cellKey(x, y)];
  if (state) {
    if (isTrainOnCell(world, x, y)) return;
    state.isStraight = !state.isStraight;
  }
}

// Toggle semaphore state (semaphores can be toggled even if train is on them)
export function toggleSemaphore(world: World, x: number, y: number): void {
  const state = world.semaphoreStates[cellKey(x, y)];
  if (state) {
    state.isOpen = !state.isOpen;
  }
}

// Клик игрока по клетке: стрелка важнее семафора
export function clickCell(world: World, x: number, y: number): void {
  if (isSwitchCell(world.grid[y][x])) {
    toggleSwitch(world, x, y);
  } else if (isSemaphoreAt(world, x, y)) {
    toggleSemaphore(world, x, y);
  }
}

function isValidMove(world: World, x: number, y: number): boolean {
  // Check if position is within grid
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return false;
  }

  // Check if there are rails at the position
  const cellType = world.grid[y][x];
  return cellType !== CELL_TYPES.EMPTY;
}

export function checkCollisions(world: World): boolean {
  const collisionDistance = CELL_SIZE / 2;

  const trainParts = world.trains.flat();

  // Check all pairs of train parts
  for (let i = 0; i < trainParts.length; i++) {
    for (let j = i + 1; j < trainParts.length; j++) {
      const part1 = trainParts[i];
      const part2 = trainParts[j];

      // Calculate distance between the two train parts
      const dx = part1.pixelX - part2.pixelX;
      const dy = part1.pixelY - part2.pixelY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if parts are too close (collision)
      if (distance < collisionDistance) {
        return true;
      }
    }
  }

  return false;
}

function crashTrain(world: World, trainIndex: number, reason: CrashReason): void {
  world.trains[trainIndex][0].state = LOCOMOTIVE_STATES.CRASHED;
  world.status = 'crashed';
  world.crash = { trainIndex, reason };
}

// Один шаг симуляции на deltaTime секунд. Физика — как в legacy-движке (FIXIN-PLAN.md §2.2).
export function stepWorld(world: World, deltaTime: number): void {
  // Победа тоже помечает локомотив как CRASHED (§2.3.2), поэтому это условие останавливает мир в обоих случаях
  if (world.trains.some(train => train[0].state === LOCOMOTIVE_STATES.CRASHED)) {
    return;
  }

  for (let trainIndex = 0; trainIndex < world.trains.length; trainIndex++) {
    const locomotive = world.trains[trainIndex][0];

    // Check if locomotive is on a semaphore
    if (isSemaphoreAt(world, locomotive.x, locomotive.y)) {
      const semaphoreState = world.semaphoreStates[cellKey(locomotive.x, locomotive.y)];

      if (semaphoreState) {
        if (!semaphoreState.isOpen) {
          if (locomotive.speed > 0) {
            locomotive.state = LOCOMOTIVE_STATES.DECELERATING;
          } else {
            locomotive.state = LOCOMOTIVE_STATES.STOPPED;
          }
        } else {
          locomotive.state = LOCOMOTIVE_STATES.ACCELERATING;
        }
      }
    }

    switch (locomotive.state) {
      case LOCOMOTIVE_STATES.ACCELERATING:
        if (locomotive.speed < TRAIN_MAX_SPEED) {
          locomotive.speed = Math.min(
            TRAIN_MAX_SPEED,
            locomotive.speed + TRAIN_ACCELERATION * deltaTime
          );
        }
        break;
      case LOCOMOTIVE_STATES.DECELERATING:
        if (locomotive.speed > 0) {
          locomotive.speed = Math.max(
            0,
            locomotive.speed - TRAIN_DECELERATION * deltaTime
          );
        }
        break;
      case LOCOMOTIVE_STATES.STOPPED:
        locomotive.speed = 0;
        break;
      case LOCOMOTIVE_STATES.IDLE:
        break;
      default:
        break;
    }

    // Process all train parts in a single loop
    for (let i = 0; i < world.trains[trainIndex].length; i++) {
      const trainPart = world.trains[trainIndex][i];

      // For wagons, use locomotive's speed
      if (i > 0) {
        trainPart.speed = locomotive.speed;
      }

      // Calculate next position using the shared function
      const nextPosition = calculateNextPosition(
        world.grid[trainPart.y][trainPart.x],
        trainPart.x,
        trainPart.y,
        trainPart.pixelX,
        trainPart.pixelY,
        trainPart.direction,
        trainPart.speed,
        deltaTime,
        getSwitchState(world, trainPart.x, trainPart.y),
      );

      const nextPixelX = nextPosition.x;
      const nextPixelY = nextPosition.y;
      trainPart.direction = nextPosition.direction;

      // Convert pixel position to grid position (using center points)
      const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
      const nextGridY = Math.floor(nextPixelY / CELL_SIZE);

      // Check if train part moved to a new cell
      if (nextGridX !== trainPart.x || nextGridY !== trainPart.y) {
        // Check if the new cell is valid
        if (isValidMove(world, nextGridX, nextGridY)) {
          // Update grid position first
          trainPart.x = nextGridX;
          trainPart.y = nextGridY;

          // Check if locomotive (first train part) reached the target point (station)
          const targetPoint = world.level.targetPoint;
          if (i === 0 && trainPart.x === targetPoint.x && trainPart.y === targetPoint.y) {
            // Level completed!
            locomotive.state = LOCOMOTIVE_STATES.CRASHED;
            world.status = 'won';
            return;
          }
        } else {
          crashTrain(world, trainIndex, 'derail');
          return;
        }
      }

      // Update train part pixel position
      trainPart.pixelX = nextPixelX;
      trainPart.pixelY = nextPixelY;
    }

    // Check for collisions between train parts
    if (checkCollisions(world)) {
      crashTrain(world, trainIndex, 'collision');
      return;
    }
  }
}
