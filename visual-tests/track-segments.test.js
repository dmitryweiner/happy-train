const { createCanvas } = require('canvas');
const { compareCanvasWithReference } = require('./setup');
const { drawCell } = require('../graphics');

describe('Track Segments Tests', () => {
  test('Straight horizontal segment', () => {
    // Создаем больший canvas для нескольких клеток
    const canvas = createCanvas(CELL_SIZE * 3, CELL_SIZE);
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовываем горизонтальный участок из 3 клеток
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    drawCell(ctx, 1, 0, CELL_TYPES.RAIL_H);
    drawCell(ctx, 2, 0, CELL_TYPES.RAIL_H);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'segment-horizontal');
    expect(diffPixels).toBeLessThan(30); // Допускаем больше различий для большего изображения
  });
  
  test('Curved segment', () => {
    // Canvas для поворотного участка
    const canvas = createCanvas(CELL_SIZE * 2, CELL_SIZE * 2);
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовываем поворот
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    drawCell(ctx, 1, 0, CELL_TYPES.TURN_RIGHT_DOWN);
    drawCell(ctx, 1, 1, CELL_TYPES.RAIL_V);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'segment-curve');
    expect(diffPixels).toBeLessThan(30);
  });
  
  test('Complex track shape', () => {
    // Создаем canvas для сложной формы пути
    const canvas = createCanvas(CELL_SIZE * 3, CELL_SIZE * 3);
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовываем U-образную форму
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_V);
    drawCell(ctx, 0, 1, CELL_TYPES.TURN_RIGHT_DOWN);
    drawCell(ctx, 1, 1, CELL_TYPES.RAIL_H);
    drawCell(ctx, 2, 1, CELL_TYPES.TURN_LEFT_DOWN);
    drawCell(ctx, 2, 0, CELL_TYPES.RAIL_V);
    
    const { diffPixels } = compareCanvasWithReference(canvas, 'segment-complex');
    expect(diffPixels).toBeLessThan(50);
  });
}); 