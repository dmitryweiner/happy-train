const { createCanvas } = require('canvas');
const { compareCanvasWithReference } = require('./setup');
const { generateBackground, seededRandom } = require('../graphics');

const createGrid = (maxX, maxY, fillValue) => Array(maxX).fill(Array(maxY).fill(fillValue));

describe('Background Generation Tests', () => {
  test('seededRandom generates consistent values', () => {
    // Проверяем, что функция seededRandom для одинаковых seed даёт одинаковые значения
    const seed1 = 42;
    const value1 = seededRandom(seed1);
    const value2 = seededRandom(seed1);
    
    expect(value1).toBe(value2);
    
    // Проверяем, что для разных seed значения разные
    const seed2 = 100;
    const value3 = seededRandom(seed2);
    
    expect(value1).not.toBe(value3);
  });
  
  test('Background is generated consistently', () => {
    // Создаём canvas для генерации фона
    const canvasWidth = CELL_SIZE * 5;
    const canvasHeight = CELL_SIZE * 5;
    const grid = createGrid(5, 5, CELL_TYPES.EMPTY);
    const canvas = createCanvas(canvasWidth, canvasHeight);
    
    // Генерируем фон
    const backgroundCanvas = generateBackground(canvas, grid);
    
    // Проверяем, что размеры соответствуют исходному canvas
    expect(backgroundCanvas.width).toBe(canvasWidth);
    expect(backgroundCanvas.height).toBe(canvasHeight);
    
    // Проверяем, что при одинаковых входных данных генерируется одинаковый фон
    const { diffPixels } = compareCanvasWithReference(backgroundCanvas, 'background-5x5');
    expect(diffPixels).toBeLessThan(50);
  });
  
  test('Background scales with canvas size', () => {
    // Генерируем фоны разных размеров
    const sizes = [
      { x: 3, width: CELL_SIZE * 3, y: 3, height: CELL_SIZE * 3 },
      { x: 7, width: CELL_SIZE * 7, y: 4, height: CELL_SIZE * 4 }
    ];
    
    for (const size of sizes) {
      const canvas = createCanvas(size.width, size.height);
      const grid = createGrid(size.x, size.y, CELL_TYPES.EMPTY);
      const backgroundCanvas = generateBackground(canvas, grid);
      
      // Проверяем размер
      expect(backgroundCanvas.width).toBe(size.width);
      expect(backgroundCanvas.height).toBe(size.height);
      
      // Проверяем корректность генерации
      const { diffPixels } = compareCanvasWithReference(
        backgroundCanvas, 
        `background-${size.width/CELL_SIZE}x${size.height/CELL_SIZE}`
      );
      expect(diffPixels).toBeLessThan(Math.floor(size.width * size.height * 0.01)); // Допускаем погрешность в 1%
    }
  });
  
  test('Background has correct grid lines', () => {
    // Тест проверяет, что сетка нарисована правильно
    const canvasWidth = CELL_SIZE * 4;
    const canvasHeight = CELL_SIZE * 4;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const grid = createGrid(4, 4, CELL_TYPES.EMPTY);
    
    const backgroundCanvas = generateBackground(canvas, grid);
    
    // Проверяем пиксели на границах ячеек, они должны быть цвета сетки
    const ctx = backgroundCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    
    // Проверяем горизонтальные линии сетки
    for (let y = 1; y < 4; y++) {
      const lineY = y * CELL_SIZE;
      const pixelIndex = (lineY * canvasWidth + canvasWidth / 2) * 4; // Берём пиксель в середине линии
      
      // Проверяем, что это светло-серый цвет (примерно RGB 204,204,204)
      expect(imageData.data[pixelIndex]).toBeGreaterThan(180); // R компонент
      expect(imageData.data[pixelIndex+1]).toBeGreaterThan(180); // G компонент
      expect(imageData.data[pixelIndex+2]).toBeGreaterThan(180); // B компонент
    }
    
    // Визуальная проверка через сравнение с эталоном
    const { diffPixels } = compareCanvasWithReference(backgroundCanvas, 'background-grid-4x4');
    expect(diffPixels).toBeLessThan(40);
  });
}); 