// Состояние игрового мира и шаг симуляции (FIXIN-PLAN.md §3.1). Без DOM: используется игрой, тестами и солвером.
//
// Модель: поезд — след из пройденных сегментов (клетка + сторона въезда + сторона выезда). Голова стоит на
// целочисленном смещении внутри последнего сегмента, вагон k — ровно на k·WAGON_SPACING позади по следу.
// Всё состояние — целые числа, шаг фиксированный (1 тик = 1/TICK_RATE с), поэтому результат не зависит
// от частоты кадров и браузера. Пиксели и углы вычисляются из следа только для отрисовки и столкновений.
import {
  CELL_SIZE,
  LOCOMOTIVE_STATES,
  TRAIN_ACCELERATION,
  TRAIN_DECELERATION,
  TRAIN_MAX_SPEED,
  type CellType,
  type LocomotiveState,
} from '../constants';
import type { LegacyLevel, TrainPart, WagonType } from '../types';
import { segmentPose, type Segment } from './geometry';
import { isSwitchCell, legacyGridToTrackMap } from './legacy-import';
import {
  classifyCell,
  connectionSides,
  isStraightConnection,
  OPPOSITE,
  SIDE_OFFSET,
  type Connection,
  type Side,
  type TrackMap,
} from './track';

export const TICK_RATE = 60;
// Единицы пути: прямая клетка = CELL_LENGTH, дуга поворота = четверть окружности радиусом в полклетки.
// Масштаб выбран так, чтобы скорость, ускорение и торможение из constants.ts были целыми в единицах за тик.
export const CELL_LENGTH = 360_000;
export const ARC_LENGTH = Math.round((CELL_LENGTH * Math.PI) / 4);
export const MAX_SPEED = (TRAIN_MAX_SPEED * CELL_LENGTH) / TICK_RATE; // единиц за тик
export const ACCELERATION = (TRAIN_ACCELERATION * CELL_LENGTH) / TICK_RATE / TICK_RATE; // прирост скорости за тик
export const DECELERATION = (TRAIN_DECELERATION * CELL_LENGTH) / TICK_RATE / TICK_RATE;
export const WAGON_SPACING = CELL_LENGTH;

export type WorldStatus = 'running' | 'won' | 'crashed';
export type CrashReason = 'derail' | 'collision';

export interface Train {
  // Пройденный путь от хвоста к голове; последний сегмент — клетка локомотива
  segments: Segment[];
  // Смещение головы внутри последнего сегмента, [0, length)
  headOffset: number;
  speed: number; // единиц пути за тик
  state: LocomotiveState;
  wagonTypes: WagonType[];
}

export interface World {
  readonly level: LegacyLevel;
  readonly track: TrackMap;
  // Для отрисовки: символы старого формата
  grid: CellType[][];
  switchStates: Record<string, { isStraight: boolean }>;
  semaphoreStates: Record<string, { isOpen: boolean }>;
  trainStates: Train[];
  // Части поездов (локомотив, вагоны) с координатами — пересчитываются после каждого тика
  trains: TrainPart[][];
  tick: number;
  // Растёт при каждом переключении стрелки или семафора: отрисовка по нему понимает, что неподвижный слой устарел
  controlsVersion: number;
  status: WorldStatus;
  crash: { trainIndex: number; reason: CrashReason } | null;
}

const cellKey = (x: number, y: number): string => `${x},${y}`;

const segmentLength = (from: Side, to: Side): number =>
  isStraightConnection(`${from}${to}` as Connection) || isStraightConnection(`${to}${from}` as Connection)
    ? CELL_LENGTH
    : ARC_LENGTH;

function sideFromDirection(direction: number): Side {
  const quarter = ((Math.round(direction / (Math.PI / 2)) % 4) + 4) % 4;
  return (['E', 'S', 'W', 'N'] as const)[quarter];
}

// Путь через клетку, если въехать с side. null — с этой стороны въехать нельзя (сход с рельс).
function routeThrough(world: World, x: number, y: number, entry: Side): Segment | null {
  if (x < 0 || y < 0 || x >= world.track.width || y >= world.track.height) return null;
  const connections = world.track.cells[y][x].connections;
  const options = connections.filter(c => connectionSides(c).includes(entry));
  if (options.length === 0) return null;
  let through = options[0];
  if (options.length > 1) {
    // Въезд в корень стрелки: ветка по её положению
    const shape = classifyCell(connections);
    if (shape.kind !== 'switch') throw new Error(`ambiguous track at (${x},${y})`);
    through = world.switchStates[cellKey(x, y)]?.isStraight === false ? shape.diverging : shape.straight;
  }
  const exit = connectionSides(through).find(side => side !== entry) as Side;
  return { x, y, from: entry, to: exit, length: segmentLength(entry, exit) };
}

// Сегмент для части поезда из конфига уровня: клетка и направление движения (сторона выезда)
function initialSegment(world: World, x: number, y: number, direction: number): Segment {
  const exit = sideFromDirection(direction);
  const connections = world.track.cells[y]?.[x]?.connections ?? [];
  const options = connections.filter(c => connectionSides(c).includes(exit));
  if (options.length === 0) {
    throw new Error(`train part at (${x},${y}) heading ${exit}: no track leaving ${exit}`);
  }
  let through = options[0];
  if (options.length > 1) {
    const shape = classifyCell(connections);
    if (shape.kind === 'switch') {
      through = world.switchStates[cellKey(x, y)]?.isStraight === false ? shape.diverging : shape.straight;
    }
  }
  const entry = connectionSides(through).find(side => side !== exit) as Side;
  return { x, y, from: entry, to: exit, length: segmentLength(entry, exit) };
}

// Где на следе стоит точка в distance единицах позади головы
function locate(train: Train, distance: number): { segment: Segment; offset: number } {
  let index = train.segments.length - 1;
  let offset = train.headOffset - distance;
  while (offset < 0 && index > 0) {
    index--;
    offset += train.segments[index].length;
  }
  return { segment: train.segments[index], offset: Math.max(0, offset) };
}

function trainParts(train: Train, previous: TrainPart[] | undefined): TrainPart[] {
  const types: (WagonType | null)[] = [null, ...train.wagonTypes];
  return types.map((wagonType, index) => {
    const { segment, offset } = locate(train, index * WAGON_SPACING);
    const pose = segmentPose(segment, offset);
    const part: TrainPart = {
      type: index === 0 ? 'locomotive' : 'wagon',
      x: segment.x,
      y: segment.y,
      direction: pose.direction,
      speed: (train.speed * TICK_RATE) / CELL_LENGTH, // клеток в секунду, как в конфиге
      pixelX: pose.pixelX,
      pixelY: pose.pixelY,
    };
    if (index === 0) part.state = train.state;
    else part.wagonType = wagonType ?? undefined;
    // Сохраняем идентичность объектов между тиками: удобно отрисовке и тестам
    return previous?.[index] ? Object.assign(previous[index], part) : part;
  });
}

function refreshParts(world: World): void {
  world.trains = world.trainStates.map((train, index) => trainParts(train, world.trains[index]));
}

// Хвост следа, который уже позади последнего вагона, больше не нужен
function trimTrail(train: Train): void {
  const behind = train.wagonTypes.length * WAGON_SPACING;
  let covered = train.headOffset;
  let keepFrom = train.segments.length - 1;
  while (covered < behind && keepFrom > 0) {
    keepFrom--;
    covered += train.segments[keepFrom].length;
  }
  if (keepFrom > 0) train.segments.splice(0, keepFrom);
}

export function createWorld(level: LegacyLevel): World {
  const track = legacyGridToTrackMap(level.grid);

  const switchStates: World['switchStates'] = {};
  track.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.connections.length === 2 && classifyCell(cell.connections).kind === 'switch') {
        switchStates[cellKey(x, y)] = { isStraight: true }; // Default state
      }
    })
  );
  for (const sw of level.switches ?? []) {
    const state = switchStates[cellKey(sw.x, sw.y)];
    if (state) state.isStraight = sw.isStraight;
  }

  const semaphoreStates: World['semaphoreStates'] = {};
  for (const semaphore of level.semaphores ?? []) {
    semaphoreStates[cellKey(semaphore.x, semaphore.y)] = { isOpen: semaphore.isOpen };
  }

  const world: World = {
    level,
    track,
    grid: level.grid.map(row => [...row]),
    switchStates,
    semaphoreStates,
    trainStates: [],
    trains: [],
    tick: 0,
    controlsVersion: 0,
    status: 'running',
    crash: null,
  };

  world.trainStates = level.trains.map(config => {
    // Части в конфиге идут от локомотива к хвосту; след хранится от хвоста к голове
    const segments = config.map(part => initialSegment(world, part.x, part.y, part.direction)).reverse();
    const head = segments[segments.length - 1];
    return {
      segments,
      headOffset: head.length / 2, // локомотив — в середине своей клетки
      speed: 0,
      state: LOCOMOTIVE_STATES.ACCELERATING,
      wagonTypes: config.slice(1).map(part => (part.type === 'wagon' ? part.wagonType : 'wagon1')),
    };
  });
  refreshParts(world);
  return world;
}

// Check if any train part is on the given cell
export function isTrainOnCell(world: World, x: number, y: number): boolean {
  return world.trains.some(trainParts => trainParts.some(part => part.x === x && part.y === y));
}

// Check if there is a semaphore at given coordinates
export function isSemaphoreAt(world: World, x: number, y: number): boolean {
  return world.semaphoreStates[cellKey(x, y)] !== undefined;
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
    world.controlsVersion++;
  }
}

// Toggle semaphore state (semaphores can be toggled even if train is on them)
export function toggleSemaphore(world: World, x: number, y: number): void {
  const state = world.semaphoreStates[cellKey(x, y)];
  if (state) {
    state.isOpen = !state.isOpen;
    world.controlsVersion++;
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

export function checkCollisions(world: World): boolean {
  const collisionDistance = CELL_SIZE / 2;
  const parts = world.trains.flat();
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const dx = parts[i].pixelX - parts[j].pixelX;
      const dy = parts[i].pixelY - parts[j].pixelY;
      if (Math.sqrt(dx * dx + dy * dy) < collisionDistance) {
        return true;
      }
    }
  }
  return false;
}

function crash(world: World, trainIndex: number, reason: CrashReason): void {
  world.status = 'crashed';
  world.crash = { trainIndex, reason };
}

function updateSpeed(world: World, train: Train): void {
  const [head] = train.segments.slice(-1);
  const semaphore = world.semaphoreStates[cellKey(head.x, head.y)];
  if (semaphore) {
    if (!semaphore.isOpen) {
      train.state = train.speed > 0 ? LOCOMOTIVE_STATES.DECELERATING : LOCOMOTIVE_STATES.STOPPED;
    } else {
      train.state = LOCOMOTIVE_STATES.ACCELERATING;
    }
  }
  switch (train.state) {
    case LOCOMOTIVE_STATES.ACCELERATING:
      train.speed = Math.min(MAX_SPEED, train.speed + ACCELERATION);
      break;
    case LOCOMOTIVE_STATES.DECELERATING:
      train.speed = Math.max(0, train.speed - DECELERATION);
      break;
    case LOCOMOTIVE_STATES.STOPPED:
      train.speed = 0;
      break;
    default:
      break;
  }
}

// Двигает голову поезда. Возвращает событие, если поезд сошёл с рельс или приехал на станцию.
function advance(world: World, train: Train): 'derail' | 'won' | null {
  const before = { headOffset: train.headOffset, segmentCount: train.segments.length };
  train.headOffset += train.speed;
  let head = train.segments[train.segments.length - 1];
  while (train.headOffset >= head.length) {
    const nextX = head.x + SIDE_OFFSET[head.to].dx;
    const nextY = head.y + SIDE_OFFSET[head.to].dy;
    const next = routeThrough(world, nextX, nextY, OPPOSITE[head.to]);
    if (!next) {
      // Сход с рельс: поезд остаётся там, где был до этого тика (как в legacy-движке)
      train.headOffset = before.headOffset;
      train.segments.length = before.segmentCount;
      return 'derail';
    }
    train.headOffset -= head.length;
    train.segments.push(next);
    head = next;
    const station = world.level.targetPoint;
    if (next.x === station.x && next.y === station.y) {
      return 'won';
    }
  }
  return null;
}

// Один тик симуляции (1/TICK_RATE секунды)
export function stepWorld(world: World): void {
  if (world.status !== 'running') return;
  world.tick++;

  for (let trainIndex = 0; trainIndex < world.trainStates.length; trainIndex++) {
    const train = world.trainStates[trainIndex];
    updateSpeed(world, train);
    const event = advance(world, train);
    trimTrail(train);
    refreshParts(world);
    if (event === 'derail') {
      crash(world, trainIndex, 'derail');
      return;
    }
    if (event === 'won') {
      world.status = 'won';
      return;
    }
    if (checkCollisions(world)) {
      crash(world, trainIndex, 'collision');
      return;
    }
  }
}


// Мир стоит: каждый поезд стоит на закрытом семафоре, поэтому следующий тик ничего не изменит.
// Сдвинуть его может только игрок (открыть семафор), так что игре не нужно крутить кадры.
export function isWorldIdle(world: World): boolean {
  if (world.status !== 'running') return false;
  return world.trainStates.every(train => {
    const head = train.segments[train.segments.length - 1];
    const semaphore = world.semaphoreStates[cellKey(head.x, head.y)];
    // STOPPED, а не просто скорость 0: в тике, где скорость упала до нуля, поезд ещё DECELERATING
    return train.state === LOCOMOTIVE_STATES.STOPPED && train.speed === 0 && semaphore !== undefined && !semaphore.isOpen;
  });
}
