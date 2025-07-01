const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawSwitchCell } = require('../graphics');

describe('Switch Cell Rendering Tests', () => {
  // Тестируем каждый тип стрелки в обоих состояниях
  
  test('SWITCH_RIGHT_DOWN_V - вертикальная стрелка вправо-вниз (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем стрелку в состоянии "прямо"
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_DOWN_V, true);
    
    // Проверяем результат
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-down-v-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_DOWN_V - вертикальная стрелка вправо-вниз (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Отрисовываем стрелку в состоянии "поворот"
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_DOWN_V, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-down-v-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_DOWN_V - вертикальная стрелка влево-вниз (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_DOWN_V, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-down-v-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_DOWN_V - вертикальная стрелка влево-вниз (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_DOWN_V, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-down-v-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_UP_V - вертикальная стрелка влево-вверх (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_UP_V, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-up-v-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_UP_V - вертикальная стрелка влево-вверх (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_UP_V, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-up-v-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_UP_V - вертикальная стрелка вправо-вверх (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_UP_V, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-up-v-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_UP_V - вертикальная стрелка вправо-вверх (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_UP_V, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-up-v-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_DOWN_H - горизонтальная стрелка вправо-вниз (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_DOWN_H, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-down-h-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_DOWN_H - горизонтальная стрелка вправо-вниз (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_DOWN_H, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-down-h-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_DOWN_H - горизонтальная стрелка влево-вниз (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_DOWN_H, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-down-h-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_DOWN_H - горизонтальная стрелка влево-вниз (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_DOWN_H, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-down-h-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_UP_H - горизонтальная стрелка влево-вверх (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_UP_H, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-up-h-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_LEFT_UP_H - горизонтальная стрелка влево-вверх (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_LEFT_UP_H, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-left-up-h-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_UP_H - горизонтальная стрелка вправо-вверх (прямо)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_UP_H, true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-up-h-straight');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('SWITCH_RIGHT_UP_H - горизонтальная стрелка вправо-вверх (поворот)', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    drawSwitchCell(ctx, 0, 0, CELL_TYPES.SWITCH_RIGHT_UP_H, false);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'switch-right-up-h-turn');
    expect(diffPixels).toBeLessThan(10);
  });
  
  test('UNKNOWN_SWITCH - неизвестный тип стрелки', () => {
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    
    // Тестируем отрисовку неизвестного типа стрелки
    drawSwitchCell(ctx, 0, 0, 'UNKNOWN_SWITCH', true);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'unknown-switch');
    expect(diffPixels).toBeLessThan(10);
  });
}); 