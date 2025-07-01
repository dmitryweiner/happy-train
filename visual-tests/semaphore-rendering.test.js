const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawSemaphoreCell } = require('../graphics');

describe('Semaphore Cell Rendering Tests', () => {
  // Тестируем семафоры на разных типах рельсов в обоих состояниях (открыт/закрыт)
  
  test('Горизонтальные рельсы с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем семафор в открытом состоянии на горизонтальных рельсах
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_H, true);
    
    // Проверяем результат
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-h-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Горизонтальные рельсы с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем семафор в закрытом состоянии на горизонтальных рельсах
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_H, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-h-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Вертикальные рельсы с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_V, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-v-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Вертикальные рельсы с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.RAIL_V, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-rail-v-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот вправо-вниз с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-down-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот вправо-вниз с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-down-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот влево-вниз с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-down-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот влево-вниз с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_DOWN, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-down-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот влево-вверх с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-up-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот влево-вверх с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_LEFT_UP, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-left-up-closed');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот вправо-вверх с семафором (открыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-up-open');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('Поворот вправо-вверх с семафором (закрыт)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSemaphoreCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_UP, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'semaphore-turn-right-up-closed');
    expect(diffPixels).toBeLessThan(10);
  });
}); 