const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawCell } = require('../graphics');

describe('Cell Rendering Tests', () => {
  // Тестируем каждый тип клетки отдельно
  
  test('RAIL_H - горизонтальные рельсы', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем клетку
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    // Проверяем результат
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('RAIL_V - вертикальные рельсы', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_V);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-v');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('RAIL_H_V - пересечение рельсов', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H_V);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-v');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_DOWN - поворот вправо-вниз', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'turn-right-down');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_DOWN - поворот влево-вниз', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'turn-left-down');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_RIGHT_UP - поворот вправо-вверх', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'turn-right-up');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('TURN_LEFT_UP - поворот влево-вверх', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'turn-left-up');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('EMPTY - пустая клетка', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Заполняем фон чтобы видеть, что ничего не нарисовалось
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawCell(ctx, 0, 0, CELL_TYPES.EMPTY);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'empty-cell');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('DEFAULT - неизвестный тип клетки', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Тестируем отрисовку неизвестного типа
    drawCell(ctx, 0, 0, '?');
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'unknown-cell');
    expect(diffPixels).toBeLessThan(10);
  });
}); 