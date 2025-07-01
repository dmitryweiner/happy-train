const { createCanvas } = require('canvas');
const { createTestCanvas, compareCanvasWithReference } = require('./setup');
const { drawCell } = require('../graphics');

describe('Cell Parameters Tests', () => {
  // Тестируем влияние глобальных настроек на отрисовку
  
  test('Изменение размера клетки', () => {
    const originalCellSize = global.CELL_SIZE;
    global.CELL_SIZE = 60; // Увеличиваем размер
    
    const canvas = createCanvas(global.CELL_SIZE, global.CELL_SIZE);
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-large');
    expect(diffPixels).toBeLessThan(10);
    
    // Восстанавливаем размер
    global.CELL_SIZE = originalCellSize;
  });
  
  test('Изменение ширины рельсов', () => {
    const originalRailWidth = global.RAIL_WIDTH;
    global.RAIL_WIDTH = 5; // Более широкие рельсы
    
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-wide');
    expect(diffPixels).toBeLessThan(10);
    
    // Восстанавливаем ширину
    global.RAIL_WIDTH = originalRailWidth;
  });
  
  test('Изменение расстояния между шпалами', () => {
    const originalTieSpacing = global.TIE_SPACING;
    global.TIE_SPACING = 5; // Более частые шпалы
    
    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-dense-ties');
    expect(diffPixels).toBeLessThan(10);
    
    // Восстанавливаем расстояние
    global.TIE_SPACING = originalTieSpacing;
  });
}); 