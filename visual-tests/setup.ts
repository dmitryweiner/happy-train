import { createCanvas, type Canvas } from 'canvas';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import pixelmatch from 'pixelmatch';
import path from 'node:path';
import { CELL_SIZE } from '../src/constants';


// Служебная функция для сравнения изображений
export function compareCanvasWithReference(
  canvas: Canvas,
  referenceName: string,
  threshold = 0.1,
): { diffPixels: number; message: string } {
  const testDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const actualBuffer = canvas.toBuffer('image/png');
  const refPath = path.join(testDir, `${referenceName}.png`);
  
  // Эталон создаётся только явно (yarn test:visual:update), иначе пропавший эталон не заметить
  if (!fs.existsSync(refPath)) {
    if (process.env.UPDATE_VISUAL !== '1') {
      throw new Error(`Нет эталона ${referenceName}.png. Создайте его: yarn test:visual:update`);
    }
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

export function createTestCanvas(): Canvas {
  return createCanvas(CELL_SIZE, CELL_SIZE);
}