import { afterEach, describe, test, expect } from 'vitest';
import { CELL_SIZE, CELL_TYPES, RAIL_WIDTH, TIE_SPACING, TIE_WIDTH } from '../src/constants';
import { createCanvas } from 'canvas';
import { createTestCanvas, compareCanvasWithReference } from './setup';
import { drawCell, renderParams } from '../src/graphics';

describe('Cell Parameters Tests', () => {
  // Тестируем влияние параметров отрисовки (renderParams) на отрисовку

  afterEach(() => {
    // Восстанавливаем параметры по умолчанию
    renderParams.cellSize = CELL_SIZE;
    renderParams.railWidth = RAIL_WIDTH;
    renderParams.tieWidth = TIE_WIDTH;
    renderParams.tieSpacing = TIE_SPACING;
  });

  test('Изменение размера клетки', () => {
    renderParams.cellSize = 60; // Увеличиваем размер

    const canvas = createCanvas(renderParams.cellSize, renderParams.cellSize);
    const ctx = canvas.getContext('2d');

    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);

    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-large');
    expect(diffPixels).toBeLessThan(10);
  });

  test('Изменение ширины рельсов', () => {
    renderParams.railWidth = 5; // Более широкие рельсы

    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');

    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);

    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-wide');
    expect(diffPixels).toBeLessThan(10);
  });

  test('Изменение расстояния между шпалами', () => {
    renderParams.tieSpacing = 5; // Более частые шпалы

    const canvas = createTestCanvas();
    const ctx = canvas.getContext('2d');

    // Очищаем canvas перед отрисовкой
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);

    const { diffPixels } = compareCanvasWithReference(canvas, 'rail-h-dense-ties');
    expect(diffPixels).toBeLessThan(10);
  });
});
