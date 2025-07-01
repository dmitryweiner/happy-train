const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawStationCell } = require('../graphics');

describe('Station Cell Rendering Tests', () => {
  // Тестируем станционные клетки с разными типами рельсов
  
  test('Station with RAIL_H - горизонтальные рельсы со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем станцию с горизонтальными рельсами
    drawStationCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    // Проверяем результат
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-rail-h');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with RAIL_V - вертикальные рельсы со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем станцию с вертикальными рельсами
    drawStationCell(ctx, 0, 0, CELL_TYPES.RAIL_V);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-rail-v');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with TURN_RIGHT_DOWN - поворот вправо-вниз со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawStationCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-turn-right-down');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with TURN_LEFT_DOWN - поворот влево-вниз со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawStationCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-turn-left-down');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with TURN_LEFT_UP - поворот влево-вверх со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawStationCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-turn-left-up');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with TURN_RIGHT_UP - поворот вправо-вверх со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawStationCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-turn-right-up');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with EMPTY - пустая клетка со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Тестируем станцию на пустой клетке (только дом)
    drawStationCell(ctx, 0, 0, CELL_TYPES.EMPTY);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-empty');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Station with UNKNOWN_TYPE - неизвестный тип рельсов со станцией', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Тестируем отрисовку станции с неизвестным типом рельсов
    drawStationCell(ctx, 0, 0, 'UNKNOWN_TYPE');
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'station-unknown');
    expect(diffPixels).toBeLessThan(10);
  });
}); 