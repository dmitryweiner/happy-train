// Вспомогательные функции для игры
if (typeof window === 'undefined') {
  const { CELL_SIZE, CELL_TYPES, DIRECTIONS } = require('./constants');
  globalThis.CELL_SIZE = CELL_SIZE;
  globalThis.CELL_TYPES = CELL_TYPES;
  globalThis.DIRECTIONS = DIRECTIONS;
}

const EPSILON = 0.15;

const normalizeAngle = angle => ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

const closeTo = (a, b, epsilon = EPSILON) => Math.abs(a - b) < epsilon;

const isBetween = (value, min, max, epsilon = EPSILON) => value <= (max + epsilon) && value >= (min - epsilon);

function isClockwise(cellType, direction) {
  // Нормализуем угол от 0 до 2π
  const normalized = normalizeAngle(direction);

  switch (cellType) {
    case CELL_TYPES.TURN_RIGHT_UP:
    case CELL_TYPES.SWITCH_RIGHT_UP_V:
    case CELL_TYPES.SWITCH_RIGHT_UP_H:
      if (isBetween(normalized, 0, Math.PI / 2)) {
        return false;
      }
      if (isBetween(normalized, Math.PI, 3 * Math.PI / 2)) {
        return true;
      }
      return true;
    case CELL_TYPES.TURN_LEFT_UP:
    case CELL_TYPES.SWITCH_LEFT_UP_V:
    case CELL_TYPES.SWITCH_LEFT_UP_H:
      if (closeTo(normalized, 0) || isBetween(normalized, 3 * Math.PI / 2, 2 * Math.PI)) {
        return false;
      }
      if (isBetween(normalized, Math.PI / 2, Math.PI)) {
        return true;
      }
      return true;
    case CELL_TYPES.TURN_RIGHT_DOWN:
    case CELL_TYPES.SWITCH_RIGHT_DOWN_V:
    case CELL_TYPES.SWITCH_RIGHT_DOWN_H:
      if (isBetween(normalized, Math.PI, 3 * Math.PI / 2)) {
        return false;
      }
      if (isBetween(normalized, 0, Math.PI / 2)) {
        return true;
      }
      return true;
    case CELL_TYPES.TURN_LEFT_DOWN:
    case CELL_TYPES.SWITCH_LEFT_DOWN_V:
    case CELL_TYPES.SWITCH_LEFT_DOWN_H:
      if (isBetween(normalized, Math.PI / 2, Math.PI)) {
        return false;
      }
      if (isBetween(normalized, 3 * Math.PI / 2, 2 * Math.PI)) {
        return true;
      }
      return true;
    default:
      return true;
  }
}

// Вычисляет следующую позицию при повороте
function calculateTurnPosition(cellType, cellX, cellY, pixelX, pixelY, direction, speed, deltaTime) {
  const radius = CELL_SIZE / 2;
  const cellLeft = cellX * CELL_SIZE;
  const cellTop = cellY * CELL_SIZE;

  // Центры окружностей по типу поворота
  const getCenters = (cellType) => {
    switch (cellType) {
      case CELL_TYPES.TURN_RIGHT_UP:
      case CELL_TYPES.SWITCH_RIGHT_UP_V:
      case CELL_TYPES.SWITCH_RIGHT_UP_H:
          return { cx: cellLeft + CELL_SIZE, cy: cellTop };
      case CELL_TYPES.TURN_LEFT_UP:
      case CELL_TYPES.SWITCH_LEFT_UP_V:
      case CELL_TYPES.SWITCH_LEFT_UP_H:
          return { cx: cellLeft, cy: cellTop };
      case CELL_TYPES.TURN_RIGHT_DOWN:
      case CELL_TYPES.SWITCH_RIGHT_DOWN_V:
      case CELL_TYPES.SWITCH_RIGHT_DOWN_H:
        return { cx: cellLeft, cy: cellTop + CELL_SIZE };
      case CELL_TYPES.TURN_LEFT_DOWN:
      case CELL_TYPES.SWITCH_LEFT_DOWN_V:
      case CELL_TYPES.SWITCH_LEFT_DOWN_H:
        return { cx: cellLeft + CELL_SIZE, cy: cellTop + CELL_SIZE };
    }
  } 
  // Направление обхода дуги (по часовой стрелке — true)
  const clockwise = isClockwise(cellType, direction);

  const { cx, cy } = getCenters(cellType);
  const dx = pixelX - cx;
  const dy = pixelY - cy;

  // Угол между объектом и центром окружности
  const theta = Math.atan2(dy, dx);
  
  // Изменение угла за время deltaTime
  const deltaTheta = 2 * speed * deltaTime * (clockwise ? 1 : -1);

  const newTheta = theta + deltaTheta;

  const nextX = cx + radius * Math.cos(newTheta);
  const nextY = cy + radius * Math.sin(newTheta);
  const nextDirection = direction + deltaTheta;

  return { x: nextX, y: nextY, direction: nextDirection };
}

// Helper function to check if a cell is a switch
function isSwitchCell(cellType) {
  return [
    CELL_TYPES.SWITCH_RIGHT_DOWN_V, 
    CELL_TYPES.SWITCH_LEFT_DOWN_V,
    CELL_TYPES.SWITCH_LEFT_UP_V,
    CELL_TYPES.SWITCH_RIGHT_UP_V,
    CELL_TYPES.SWITCH_RIGHT_DOWN_H,
    CELL_TYPES.SWITCH_LEFT_DOWN_H, 
    CELL_TYPES.SWITCH_LEFT_UP_H,
    CELL_TYPES.SWITCH_RIGHT_UP_H
  ].includes(cellType);
}

// Helper function to check if there is a semaphore at given coordinates
// Now we need to pass semaphores array and coordinates instead of checking cell type
function isSemaphoreAtPosition(semaphores, x, y) {
  if (!semaphores) return false;
  return semaphores.some(semaphore => semaphore.x === x && semaphore.y === y);
}

function isTurnCell(cellType) {
  return [
    CELL_TYPES.TURN_RIGHT_DOWN, 
    CELL_TYPES.TURN_LEFT_DOWN,
    CELL_TYPES.TURN_LEFT_UP,
    CELL_TYPES.TURN_RIGHT_UP
  ].includes(cellType);
}

// Helper method to determine switch behavior based on approach direction
function shouldTurnOnSwitch(switchType, direction, isStraight) {
  const normalizedDirection = normalizeAngle(direction);

  switch (switchType) {
    // SWITCH_RIGHT_DOWN_V: "┐|" - движется вниз или вправо
    case CELL_TYPES.SWITCH_RIGHT_DOWN_V:
      if (closeTo(normalizedDirection, DIRECTIONS.down)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.right, DIRECTIONS.down)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.left, DIRECTIONS.up)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_LEFT_DOWN_V: "|┌" - движется вниз или влево  
    case CELL_TYPES.SWITCH_LEFT_DOWN_V:
      if (closeTo(normalizedDirection, DIRECTIONS.down)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.down, DIRECTIONS.left)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.up, 2 * Math.PI)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_LEFT_UP_V: "┘|" - движется вверх или вправо
    case CELL_TYPES.SWITCH_LEFT_UP_V:
      if (closeTo(normalizedDirection, DIRECTIONS.up)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.up, 2 * Math.PI)
        || closeTo(normalizedDirection, DIRECTIONS.right)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.down, DIRECTIONS.left)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_RIGHT_UP_V: "|└" - движется вверх или влево
    case CELL_TYPES.SWITCH_RIGHT_UP_V:
      if (closeTo(normalizedDirection, DIRECTIONS.up)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.left, DIRECTIONS.up)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.right, DIRECTIONS.down)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_RIGHT_DOWN_H: "┐-" - движется вверх или влево
    case CELL_TYPES.SWITCH_RIGHT_DOWN_H:
      if (closeTo(normalizedDirection, DIRECTIONS.left)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.left, DIRECTIONS.up)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.right, DIRECTIONS.down)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_LEFT_DOWN_H: "-┌" - движется вверх или вправо
    case CELL_TYPES.SWITCH_LEFT_DOWN_H:
      if (closeTo(normalizedDirection, DIRECTIONS.right) || closeTo(normalizedDirection, 2 * Math.PI)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.up, 2 * Math.PI)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.down, DIRECTIONS.left)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_LEFT_UP_H: "┘-" - движется вниз или влево
    case CELL_TYPES.SWITCH_LEFT_UP_H:
      if (closeTo(normalizedDirection, DIRECTIONS.left)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.down, DIRECTIONS.left)) { // backward
        return true;
      }
      if (closeTo(normalizedDirection, DIRECTIONS.right) || 
        isBetween(normalizedDirection, DIRECTIONS.up, 2 * Math.PI)) { // working direction
        return !isStraight;
      }
      return false;
    
    // SWITCH_RIGHT_UP_H: "-└" - движется вниз или вправо
    case CELL_TYPES.SWITCH_RIGHT_UP_H:
      if (closeTo(normalizedDirection, DIRECTIONS.right) || closeTo(normalizedDirection, 2 * Math.PI)) { // backward
        return false;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.right, DIRECTIONS.down)) { // backward
        return true;
      }
      if (isBetween(normalizedDirection, DIRECTIONS.left, DIRECTIONS.up)) { // working direction
        return !isStraight;
      }
      return false;
    
    default:
      return false;
  }
}

// Вычисляет следующую позицию при движении по прямой клетке
function calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime) {
  let nextPixelX = pixelX;
  let nextPixelY = pixelY;
  let nextDirection = direction;

  // Нормализуем угол от 0 до 2π
  const normalizedCurrentAngle = normalizeAngle(direction);
        
  if (cellType === CELL_TYPES.RAIL_H || 
      (cellType.includes("-") && isSwitchCell(cellType))) {
    // Если на горизонтальных рельсах, "прилипаем" к горизонтальному движению
    nextDirection = Math.cos(normalizedCurrentAngle) > 0 ? DIRECTIONS.right : DIRECTIONS.left;
  } else if (cellType === CELL_TYPES.RAIL_V || 
            (cellType.includes("|") && isSwitchCell(cellType))) {
    // Если на вертикальных рельсах, "прилипаем" к вертикальному движению
    nextDirection = Math.sin(normalizedCurrentAngle) > 0 ? DIRECTIONS.down : DIRECTIONS.up;
  } else if (cellType === CELL_TYPES.RAIL_H_V) {
    // Пересечение рельсов - сохраняем текущее направление движения
    // Определяем, движется ли поезд больше горизонтально или вертикально
    const cosValue = Math.abs(Math.cos(normalizedCurrentAngle));
    const sinValue = Math.abs(Math.sin(normalizedCurrentAngle));
    
    if (cosValue > sinValue) {
      // Движение больше горизонтальное
      nextDirection = Math.cos(normalizedCurrentAngle) > 0 ? DIRECTIONS.right : DIRECTIONS.left;
    } else {
      // Движение больше вертикальное
      nextDirection = Math.sin(normalizedCurrentAngle) > 0 ? DIRECTIONS.down : DIRECTIONS.up;
    }
  }

  // Обновляем позицию в зависимости от угла направления
  nextPixelX += Math.cos(nextDirection) * speed * CELL_SIZE * deltaTime;
  nextPixelY += Math.sin(nextDirection) * speed * CELL_SIZE * deltaTime;

  return { 
    x: nextPixelX, 
    y: nextPixelY, 
    direction: nextDirection 
  };
}

// Вычисляет следующую позицию поезда в зависимости от текущей клетки
function calculateNextPosition(cellType, cellX, cellY, pixelX, pixelY, direction, speed, deltaTime, isStraight) {
  // Check if cell is a switch
  if (isSwitchCell(cellType)) {
    if (shouldTurnOnSwitch(cellType, direction, isStraight)) {
      // Use turn movement if switch is set to turning
      return calculateTurnPosition(
        cellType,
        cellX,
        cellY,
        pixelX,
        pixelY,
        direction,
        speed,
        deltaTime
      );
    } else {
      // Use straight movement if switch is set to straight
      return calculateStraightPosition(
        cellType,
        pixelX,
        pixelY,
        direction,
        speed,
        deltaTime,
      );
    }
  }
  
  // Original logic for non-switch cells
  if (isTurnCell(cellType)) {
    // Перемещение на повороте
    return calculateTurnPosition(
      cellType,
      cellX,
      cellY,
      pixelX,
      pixelY,
      direction,
      speed,
      deltaTime
    );
  } else {
    // Перемещение по прямой
    return calculateStraightPosition(
      cellType,
      pixelX,
      pixelY,
      direction,
      speed,
      deltaTime,
    );
  }
}

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTurnPosition,
    calculateStraightPosition,
    calculateNextPosition,
    isSwitchCell,
    shouldTurnOnSwitch,
    isSemaphoreAtPosition,
  };
} 
