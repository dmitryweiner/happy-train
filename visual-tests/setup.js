const { createCanvas } = require('canvas');
const { PNG } = require('pngjs');
const fs = require('fs');
const pixelmatch = require('pixelmatch');
const path = require('path');
const { 
  CELL_SIZE, 
  RAIL_WIDTH, 
  TIE_WIDTH, 
  TIE_SPACING, 
  GRID_WIDTH, 
  GRID_HEIGHT,
  CELL_TYPES,
  DIRECTIONS,
  TURN_DIRECTIONS
} = require('../constants');

// Устанавливаем глобальные константы для тестов
global.CELL_SIZE = CELL_SIZE;
global.RAIL_WIDTH = RAIL_WIDTH;
global.TIE_WIDTH = TIE_WIDTH;
global.TIE_SPACING = TIE_SPACING;
global.GRID_WIDTH = GRID_WIDTH;
global.GRID_HEIGHT = GRID_HEIGHT;
global.CELL_TYPES = CELL_TYPES;
global.DIRECTIONS = DIRECTIONS;
global.TURN_DIRECTIONS = TURN_DIRECTIONS;

// Служебная функция для сравнения изображений
function compareCanvasWithReference(canvas, referenceName, threshold = 0.1) {
  const testDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const actualBuffer = canvas.toBuffer('image/png');
  const refPath = path.join(testDir, `${referenceName}.png`);
  
  // Создаем эталон, если его нет
  if (!fs.existsSync(refPath)) {
    fs.writeFileSync(refPath, actualBuffer);
    return { diffPixels: 0, message: 'Created reference image' };
  }
  
  // Сравниваем с эталоном
  const expectedBuffer = fs.readFileSync(refPath);
  const actual = PNG.sync.read(actualBuffer);
  const expected = PNG.sync.read(expectedBuffer);
  
  const diffPixels = pixelmatch(
    actual.data, expected.data, null, 
    actual.width, actual.height, 
    { threshold }
  );
  
  // Сохраняем различия, если они есть
  if (diffPixels > 0) {
    const diff = new PNG({ width: actual.width, height: actual.height });
    pixelmatch(
      actual.data, expected.data, diff.data, 
      actual.width, actual.height, 
      { threshold }
    );
    fs.writeFileSync(
      path.join(testDir, `${referenceName}-diff.png`), 
      PNG.sync.write(diff)
    );
  }
  
  return { 
    diffPixels,
    message: diffPixels > 0 ? `${diffPixels} pixels differ` : 'Images match'
  };
}

module.exports = {
  createTestCanvas() {
    return createCanvas(CELL_SIZE, CELL_SIZE);
  },
  compareCanvasWithReference
}; 