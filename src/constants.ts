// Game constants
export const CELL_SIZE = 40;
export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 10;
export const RAIL_WIDTH = 3; // Ширина рельса в пикселях (смещение от центра)
export const TIE_WIDTH = 6; // Ширина шпалы в пикселях
export const TIE_SPACING = 10; // Расстояние между шпалами в пикселях

// Train movement constants
export const TRAIN_MAX_SPEED = 2; // cells per second
export const TRAIN_ACCELERATION = 0.5; // cells per second^2
export const TRAIN_DECELERATION = 4; // cells per second^2

// Cell types
export const CELL_TYPES = {
  EMPTY: " ",
  RAIL_H: "-",
  RAIL_V: "|",
  RAIL_H_V: "┼",
  TURN_RIGHT_DOWN: "┐",
  TURN_LEFT_DOWN: "┌",
  TURN_LEFT_UP: "┘",
  TURN_RIGHT_UP: "└",
  SWITCH_RIGHT_DOWN_V: "┐|",
  SWITCH_LEFT_DOWN_V: "|┌",
  SWITCH_LEFT_UP_V: "┘|",
  SWITCH_RIGHT_UP_V: "|└",
  SWITCH_RIGHT_DOWN_H: "┐-",
  SWITCH_LEFT_DOWN_H: "-┌",
  SWITCH_LEFT_UP_H: "┘-",
  SWITCH_RIGHT_UP_H: "-└",
} as const;

export type CellType = (typeof CELL_TYPES)[keyof typeof CELL_TYPES];

// Direction angles in radians
export const DIRECTIONS = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: 3 * Math.PI / 2,
} as const;

export const LOCOMOTIVE_STATES = {
  ACCELERATING: "accelerating",
  DECELERATING: "decelerating",
  STOPPED: "stopped",
  IDLE: "idle",
  CRASHED: "crashed",
} as const;

export type LocomotiveState = (typeof LOCOMOTIVE_STATES)[keyof typeof LOCOMOTIVE_STATES];

// Storage keys
export const STORAGE_KEYS = {
  CURRENT_LEVEL: 'trainGameCurrentLevel',
} as const;

// View zoom (CSS scale on canvas; train logic unchanged)
export const VIEW_ZOOM_MIN = 1;
export const VIEW_ZOOM_MAX = 3;
export const VIEW_ZOOM_WHEEL_SENSITIVITY = 0.0015;
export const VIEW_PINCH_RATIO_THRESHOLD = 0.04;
export const VIEW_DRAG_THRESHOLD_PX = 6;
