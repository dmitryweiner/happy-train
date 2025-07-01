// Game constants
const CELL_SIZE = 40;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;
const RAIL_WIDTH = 3; // Ширина рельса в пикселях (смещение от центра)
const TIE_WIDTH = 6; // Ширина шпалы в пикселях
const TIE_SPACING = 10; // Расстояние между шпалами в пикселях

// Train movement constants
const TRAIN_MAX_SPEED = 2; // cells per second
const TRAIN_ACCELERATION = 0.5; // cells per second^2
const TRAIN_DECELERATION = 4; // cells per second^2

// Cell types
const CELL_TYPES = {
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
};

// Direction angles in radians
const DIRECTIONS = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: 3 * Math.PI / 2,
};

const LOCOMOTIVE_STATES = {
  ACCELERATING: "accelerating",
  DECELERATING: "decelerating",
  STOPPED: "stopped",
  IDLE: "idle",
  CRASHED: "crashed",
};

// Storage keys
const STORAGE_KEYS = {
  CURRENT_LEVEL: 'trainGameCurrentLevel',
};

if (typeof module !== 'undefined' && module.exports) {
module.exports = {
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  RAIL_WIDTH,
  TIE_WIDTH,
  TIE_SPACING,
  TRAIN_MAX_SPEED,
  TRAIN_ACCELERATION,
  TRAIN_DECELERATION,
  CELL_TYPES,
  DIRECTIONS,
  LOCOMOTIVE_STATES,
  STORAGE_KEYS,
  }; 
}