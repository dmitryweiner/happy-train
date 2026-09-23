import type { CellType, LocomotiveState } from './constants';

export type WagonType = 'wagon1' | 'wagon2';

// Часть поезда в конфиге уровня (формат levels.ts, до перехода на v2)
export type TrainPartConfig =
  | { type: 'locomotive'; x: number; y: number; direction: number }
  | { type: 'wagon'; x: number; y: number; direction: number; wagonType: WagonType };

export interface SemaphoreConfig {
  x: number;
  y: number;
  isOpen: boolean;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface LegacyLevel {
  grid: CellType[][];
  semaphores: SemaphoreConfig[];
  trains: TrainPartConfig[][];
  targetPoint: GridPoint;
  // Начальные положения стрелок; не указанные стоят «прямо»
  switches?: { x: number; y: number; isStraight: boolean }[];
}

// Часть поезда во время игры
export interface TrainPart {
  type: 'locomotive' | 'wagon';
  x: number;
  y: number;
  direction: number;
  speed: number;
  pixelX: number;
  pixelY: number;
  state?: LocomotiveState;
  wagonType?: WagonType;
}

export interface MovementResult {
  x: number;
  y: number;
  direction: number;
}
