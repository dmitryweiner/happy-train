// Импортируем необходимые константы и функции
const { 
  calculateTurnPosition, 
  calculateStraightPosition, 
  isSwitchCell,
  isSemaphoreAtPosition
} = require('../utils');
const { CELL_SIZE, CELL_TYPES, DIRECTIONS } = require('../constants');

// Мокаем глобальные константы, которые используются в функции
global.CELL_SIZE = CELL_SIZE;
global.CELL_TYPES = CELL_TYPES;
global.DIRECTIONS = DIRECTIONS;

// Простой хелпер, чтобы сравнить числа с допустимой погрешностью
function closeTo(a, b, epsilon = 0.7) {
  return Math.abs(a - b) < epsilon;
}

describe('calculateTurnPosition', () => {
  test('TURN_RIGHT_UP: движение по четверти круга из точки (CELL_SIZE, CELL_SIZE / 2)', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008; 

    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_UP,
      0, 0,                        // cellX, cellY
      CELL_SIZE, radius,          // pixelX, pixelY (начальная точка на правой стороне окружности)
      Math.PI,                    // угол — смотрим влево
      speed,
      deltaTime
    );

    expect(closeTo(result.x, CELL_SIZE)).toBe(true);
    expect(result.x).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.y, radius)).toBe(true);
    expect(result.y).toBeLessThan(radius);
    expect(closeTo(result.direction, Math.PI)).toBe(true);
  });

  test('TURN_LEFT_UP: движение по дуге против часовой стрелки', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008; 

    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_UP,
      0, 0,
      0, radius,
      0, // начальный угол (смотрим вправо)
      speed,
      deltaTime
    );

    const expectedTheta = 0 + (deltaTime * speed) / radius;


    expect(closeTo(result.x, 0)).toBe(true);
    expect(result.x).toBeGreaterThan(0);
    expect(closeTo(result.y, radius)).toBe(true);
    expect(result.y).toBeLessThan(radius);
    expect(closeTo(result.direction, 0)).toBe(true);
  });

  test('TURN_RIGHT_DOWN: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_DOWN,
      0, 0,                        // cellX, cellY
      radius, CELL_SIZE,          // pixelX, pixelY (начальная точка внизу окружности)
      -Math.PI/2,                 // угол — смотрим вверх
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, radius)).toBe(true);
    expect(result.x).toBeLessThan(radius);
    expect(closeTo(result.y, CELL_SIZE)).toBe(true);
    expect(result.y).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.direction, -Math.PI/2)).toBe(true);
    expect(result.direction).toBeLessThan(-Math.PI/2);
  });
  
  test('TURN_RIGHT_DOWN: движение по четверти круга слева направо', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_DOWN,
      0, 0,                        // cellX, cellY
      0, CELL_SIZE - radius,      // pixelX, pixelY (начальная точка слева от центра окружности)
      0,                          // угол — смотрим вправо
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, 0)).toBe(true);
    expect(result.x).toBeGreaterThan(0);
    expect(closeTo(result.y, CELL_SIZE - radius)).toBe(true);
    expect(result.y).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.direction, 0)).toBe(true);
  });
  
  test('TURN_LEFT_DOWN: движение по четверти круга справа налево', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_DOWN,
      0, 0,                        // cellX, cellY
      CELL_SIZE, CELL_SIZE - radius, // pixelX, pixelY (начальная точка справа от центра окружности)
      Math.PI,                    // угол — смотрим влево
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE)).toBe(true);
    expect(result.x).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.y, CELL_SIZE - radius)).toBe(true);
    expect(result.y).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.direction, Math.PI)).toBe(true);
  });
  
  test('TURN_LEFT_DOWN: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_DOWN,
      0, 0,                        // cellX, cellY
      CELL_SIZE - radius, CELL_SIZE, // pixelX, pixelY (начальная точка внизу окружности)
      -Math.PI/2,                 // угол — смотрим вверх
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE - radius)).toBe(true);
    expect(result.x).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.y, CELL_SIZE)).toBe(true);
    expect(result.y).toBeLessThan(CELL_SIZE);
    expect(closeTo(result.direction, -Math.PI/2)).toBe(true);
  });

  // Дополнительные тесты для проверки граничных значений
  test('TURN_RIGHT_UP: движение по четверти круга снизу вверх', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_RIGHT_UP,
      0, 0,                        // cellX, cellY
      CELL_SIZE - radius, 0,      // pixelX, pixelY (начальная точка внизу окружности)
      Math.PI/2,                  // угол — смотрим вниз
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, CELL_SIZE - radius)).toBe(true);
    expect(result.x).toBeGreaterThan(CELL_SIZE - radius);
    expect(closeTo(result.y, 0)).toBe(true);
    expect(result.y).toBeGreaterThan(0);
    expect(closeTo(result.direction, Math.PI/2)).toBe(true);
  });
  
  test('TURN_LEFT_UP: движение по четверти круга справа налево', () => {
    const radius = CELL_SIZE / 2;
    const speed = 2;
    const deltaTime = 0.008;
    
    const result = calculateTurnPosition(
      CELL_TYPES.TURN_LEFT_UP,
      0, 0,                        // cellX, cellY
      radius, 0,                  // pixelX, pixelY (начальная точка справа окружности)
      Math.PI/2,                  // угол — смотрим вниз
      speed,
      deltaTime
    );
    
    expect(closeTo(result.x, radius)).toBe(true);
    expect(result.x).toBeLessThan(radius);
    expect(closeTo(result.y, 0)).toBe(true);
    expect(result.y).toBeGreaterThan(0);
    expect(closeTo(result.direction, Math.PI/2)).toBe(true);
  });
});

describe('calculateStraightPosition', () => {
  // Тестовые параметры
  const pixelX = 100;
  const pixelY = 100;
  const speed = 2;
  const deltaTime = 0.1;
  
  describe('Горизонтальные рельсы (RAIL_H)', () => {
    const cellType = CELL_TYPES.RAIL_H;
    
    test('Движение справа налево (направление - left)', () => {
      const direction = DIRECTIONS.left;
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE);
      
      expect(result.direction).toBe(DIRECTIONS.left);
      expect(result.x).toBeLessThan(pixelX);
      expect(result.y).toBe(pixelY);
    });
    
    test('Движение слева направо (направление - right)', () => {
      const direction = DIRECTIONS.right;
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime, CELL_SIZE);
      
      expect(result.direction).toBe(DIRECTIONS.right);
      expect(result.x).toBeGreaterThan(pixelX);
      expect(result.y).toBe(pixelY);
    });
  });
  
  describe('Вертикальные рельсы (RAIL_V)', () => {
    const cellType = CELL_TYPES.RAIL_V;
    
    test('Движение сверху вниз (направление - down)', () => {
      const direction = DIRECTIONS.down;
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime);
      
      expect(result.direction).toBe(DIRECTIONS.down);
      expect(result.x).toBe(pixelX);
      expect(result.y).toBeGreaterThan(pixelY);
    });
    
    test('Движение снизу вверх (направление - up)', () => {
      const direction = DIRECTIONS.up;
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime);
      
      expect(result.direction).toBe(DIRECTIONS.up);
      expect(result.x).toBe(pixelX);
      expect(result.y).toBeLessThan(pixelY);
    });
  });
  
  describe('Пересечение рельсов (RAIL_H_V)', () => {
    const cellType = CELL_TYPES.RAIL_H_V;
    
    test('Преимущественно горизонтальное движение', () => {
      const direction = DIRECTIONS.right + 0.1; // Небольшое отклонение от горизонтали
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime);
      
      expect(result.direction).toBe(DIRECTIONS.right);
      expect(result.x).toBeGreaterThan(pixelX);
      expect(result.y).toBe(pixelY);
    });
    
    test('Преимущественно вертикальное движение', () => {
      const direction = DIRECTIONS.down + 0.1; // Небольшое отклонение от вертикали
      const result = calculateStraightPosition(cellType, pixelX, pixelY, direction, speed, deltaTime);
      
      expect(result.direction).toBe(DIRECTIONS.down);
      expect(result.x).toBe(pixelX);
      expect(result.y).toBeGreaterThan(pixelY);
    });
  });
});

describe('isSwitchCell', () => {
  test('возвращает true для типов переключателей', () => {
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_DOWN_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_DOWN_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_UP_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_UP_V)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_DOWN_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_DOWN_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_LEFT_UP_H)).toBe(true);
    expect(isSwitchCell(CELL_TYPES.SWITCH_RIGHT_UP_H)).toBe(true);
  });
  
  test('возвращает false для обычных типов рельсов', () => {
    expect(isSwitchCell(CELL_TYPES.RAIL_H)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.RAIL_V)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_RIGHT_DOWN)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_LEFT_DOWN)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_LEFT_UP)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.TURN_RIGHT_UP)).toBe(false);
    expect(isSwitchCell(CELL_TYPES.EMPTY)).toBe(false);
  });
});

describe('Semaphore functions', () => {
  describe('isSemaphoreAtPosition', () => {
    const semaphores = [
      { x: 5, y: 3, isOpen: true },
      { x: 10, y: 7, isOpen: false },
      { x: 2, y: 1, isOpen: true }
    ];
    
    test('возвращает true если семафор есть в указанной позиции', () => {
      expect(isSemaphoreAtPosition(semaphores, 5, 3)).toBe(true);
      expect(isSemaphoreAtPosition(semaphores, 10, 7)).toBe(true);
      expect(isSemaphoreAtPosition(semaphores, 2, 1)).toBe(true);
    });
    
    test('возвращает false если семафор отсутствует в указанной позиции', () => {
      expect(isSemaphoreAtPosition(semaphores, 0, 0)).toBe(false);
      expect(isSemaphoreAtPosition(semaphores, 5, 4)).toBe(false);
      expect(isSemaphoreAtPosition(semaphores, 10, 6)).toBe(false);
    });
    
    test('возвращает false если массив семафоров пустой', () => {
      expect(isSemaphoreAtPosition([], 5, 3)).toBe(false);
    });
    
    test('возвращает false если массив семафоров null или undefined', () => {
      expect(isSemaphoreAtPosition(null, 5, 3)).toBe(false);
      expect(isSemaphoreAtPosition(undefined, 5, 3)).toBe(false);
    });
  });
});
