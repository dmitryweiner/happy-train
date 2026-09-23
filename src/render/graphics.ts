// Графические функции для игры
import { CELL_SIZE, CELL_TYPES, RAIL_WIDTH, TIE_SPACING, TIE_WIDTH, type CellType } from '../constants';
import type { TrainPart } from '../types';

// Параметры отрисовки. Изменяемы, чтобы тесты могли рисовать клетки с другими размерами.
export const renderParams = {
  cellSize: CELL_SIZE,
  railWidth: RAIL_WIDTH,
  tieWidth: TIE_WIDTH,
  tieSpacing: TIE_SPACING,
};
const P = renderParams;

interface Point {
  x: number;
  y: number;
}

// Подмножество 2D-контекста, которое нужно для отрисовки клеток.
// Своё описание, а не Pick<CanvasRenderingContext2D>: ему должен соответствовать и контекст node-canvas из тестов.
export interface DrawContext {
  strokeStyle: unknown;
  fillStyle: unknown;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  stroke(): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
  save(): void;
  restore(): void;
  setLineDash(segments: number[]): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): DrawContext | null;
}

function createDomCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Path to assets folder
export const ASSETS_PATH = 'assets/';

// Color constants
const COLORS = {
  // Background and grid colors
  GRASS_BASE: "#a5ed32",
  GRID_LINE: "#ccc",
  
  // Rail colors
  RAIL_GRAY: "#555",
  TIE_BROWN: "#CD853F",
  
  // General colors
  BLACK: "#000000",
  WHITE: "#ffffff",
  
  // Semaphore colors
  SEMAPHORE_RED: "#ff0000",
  SEMAPHORE_GREEN: "#00ff00",

  // Station house
  HOUSE_WALL: "#f5deb3",
  HOUSE_ROOF: "#c0392b",
  HOUSE_DOOR: "#6b3e26",

  // Поезд, если картинки не загрузились
  TRAIN_FALLBACK_LOCOMOTIVE: "#2e7d32",
  TRAIN_FALLBACK_WAGON: "#607d8b",
};

const NATURE_OBJECT_PROBABILITY = 0.1;

// Функция для генерации псевдослучайного числа на основе seed
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Генерация единого фонового изображения для всей игры
export function generateBackground<C extends CanvasLike>(
  canvas: { width: number; height: number },
  grid: readonly (readonly string[])[],
  shouldDrawEmoji = true,
  createCanvas: (width: number, height: number) => C = createDomCanvas as unknown as (width: number, height: number) => C,
): C {
  // Создаем отдельный canvas для фона
  const backgroundCanvas = createCanvas(canvas.width, canvas.height);

  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  const bgCtx = backgroundCanvas.getContext('2d');
  if (!bgCtx) {
    throw new Error('2D context is not available');
  }
  
  // Заполняем базовым зеленым цветом
  bgCtx.fillStyle = COLORS.GRASS_BASE; // LightGreen - базовый цвет травы
  bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
  
  // Количество зеленых пятен (примерно 8 на клетку поля)
  const columns = Math.ceil(backgroundCanvas.width / P.cellSize);
  const rows = Math.ceil(backgroundCanvas.height / P.cellSize);
  const totalPatches = Math.floor(columns * rows * 8);
  
  for (let i = 0; i < totalPatches; i++) {
    // Используем i как часть seed для случайности
    const patchSeed = i * 100;
    
    // Размер пятна (от 3 до 8 пикселей)
    const size = 3 + seededRandom(patchSeed) * 5;
    
    // Положение пятна на всем поле
    const patchX = seededRandom(patchSeed + 1) * backgroundCanvas.width;
    const patchY = seededRandom(patchSeed + 2) * backgroundCanvas.height;
    
    // Цвет пятна (оттенок зеленого)
    const greenValue = 220 + Math.floor(seededRandom(patchSeed + 3) * 40);
    const color = `rgb(0, ${greenValue}, 0)`;
    
    bgCtx.fillStyle = color;
    bgCtx.beginPath();
    bgCtx.arc(patchX, patchY, size, 0, Math.PI * 2);
    bgCtx.fill();
  }

  if (shouldDrawEmoji) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === CELL_TYPES.EMPTY) {
          const objects = ['🏔️', '🌋', '🌲', '🌳', '🌾', '🌵', '🌱', '☘️', '🌿', '🏕️', '🛖', '🌼'];
          // Детерминированно по номеру клетки: фон одинаков при каждом запуске уровня (§2.3.9)
          const cellSeed = 100_000 + (y * grid[y].length + x) * 10;
          const randomObject = objects[Math.floor(seededRandom(cellSeed) * objects.length)];
          const shouldDrawObject = seededRandom(cellSeed + 1) < NATURE_OBJECT_PROBABILITY;
          if (shouldDrawObject) {
            const centerX = x * P.cellSize + P.cellSize / 2;
            const centerY = y * P.cellSize + P.cellSize / 2;        
            bgCtx.fillStyle = COLORS.BLACK;
            bgCtx.font = "20px Arial";
            bgCtx.textAlign = "center";
            bgCtx.textBaseline = "middle";
            bgCtx.fillText(randomObject, centerX, centerY);
          }
        }
      }
    }
  }


  // Рисуем сетку для ориентировки
  bgCtx.strokeStyle = COLORS.GRID_LINE;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      bgCtx.strokeRect(x * P.cellSize, y * P.cellSize, P.cellSize, P.cellSize);
    }
  }
  
  return backgroundCanvas;
}

// Helper functions for drawing rail components
function drawHorizontalTies(ctx: DrawContext, cellX: number, _cellY: number, centerY: number): void {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const numTies = Math.floor(P.cellSize / P.tieSpacing);
  const tieSpacing = P.cellSize / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const tieX = cellX + i * tieSpacing + tieSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(tieX, centerY - P.railWidth - P.tieWidth/2);
    ctx.lineTo(tieX, centerY + P.railWidth + P.tieWidth/2);
    ctx.stroke();
  }
}

function drawVerticalTies(ctx: DrawContext, _cellX: number, cellY: number, centerX: number): void {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const numTies = Math.floor(P.cellSize / P.tieSpacing);
  const tieSpacing = P.cellSize / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const tieY = cellY + i * tieSpacing + tieSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - P.railWidth - P.tieWidth/2, tieY);
    ctx.lineTo(centerX + P.railWidth + P.tieWidth/2, tieY);
    ctx.stroke();
  }
}

function drawCurvedTies(ctx: DrawContext, center: Point, radius1: number, radius2: number, startAngle: number, endAngle: number): void {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const arcLength = Math.abs(endAngle - startAngle) * P.cellSize/2;
  const numTies = Math.floor(arcLength / P.tieSpacing);
  const tieAngleSpacing = (endAngle - startAngle) / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const angle = startAngle + i * tieAngleSpacing + tieAngleSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(
      center.x + (radius1 - P.tieWidth/2) * Math.cos(angle), 
      center.y + (radius1 - P.tieWidth/2) * Math.sin(angle)
    );
    ctx.lineTo(
      center.x + (radius2 + P.tieWidth/2) * Math.cos(angle), 
      center.y + (radius2 + P.tieWidth/2) * Math.sin(angle)
    );
    ctx.stroke();
  }
}

function drawHorizontalRails(ctx: DrawContext, cellX: number, _cellY: number, centerY: number): void {
  ctx.strokeStyle = COLORS.RAIL_GRAY;
  
  // Верхний рельс
  ctx.beginPath();
  ctx.moveTo(cellX, centerY - P.railWidth);
  ctx.lineTo(cellX + P.cellSize, centerY - P.railWidth);
  ctx.stroke();

  // Нижний рельс
  ctx.beginPath();
  ctx.moveTo(cellX, centerY + P.railWidth);
  ctx.lineTo(cellX + P.cellSize, centerY + P.railWidth);
  ctx.stroke();
}

function drawVerticalRails(ctx: DrawContext, _cellX: number, cellY: number, centerX: number): void {
  ctx.strokeStyle = COLORS.RAIL_GRAY;
  
  // Левый рельс
  ctx.beginPath();
  ctx.moveTo(centerX - P.railWidth, cellY);
  ctx.lineTo(centerX - P.railWidth, cellY + P.cellSize);
  ctx.stroke();

  // Правый рельс
  ctx.beginPath();
  ctx.moveTo(centerX + P.railWidth, cellY);
  ctx.lineTo(centerX + P.railWidth, cellY + P.cellSize);
  ctx.stroke();
}

function drawCurvedRails(ctx: DrawContext, center: Point, radius1: number, radius2: number, startAngle: number, endAngle: number): void {
  ctx.strokeStyle = COLORS.RAIL_GRAY;
  
  // Внутренняя дуга
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius1, startAngle, endAngle);
  ctx.stroke();
  
  // Внешняя дуга
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius2, startAngle, endAngle);
  ctx.stroke();
}

export function drawCell(ctx: DrawContext, x: number, y: number, cellType: string): void {
  const cellX = x * P.cellSize;
  const cellY = y * P.cellSize;
  const centerX = cellX + P.cellSize / 2;
  const centerY = cellY + P.cellSize / 2;

  // Настройки линий для рельсов
  ctx.strokeStyle = COLORS.RAIL_GRAY; // Серый цвет для рельсов
  ctx.lineWidth = 2;

  // Отрисовка в зависимости от типа клетки
  switch (cellType) {
    case CELL_TYPES.RAIL_H:
      drawHorizontalTies(ctx, cellX, cellY, centerY);
      drawHorizontalRails(ctx, cellX, cellY, centerY);
      break;

    case CELL_TYPES.RAIL_V:
      drawVerticalTies(ctx, cellX, cellY, centerX);
      drawVerticalRails(ctx, cellX, cellY, centerX);
      break;

    case CELL_TYPES.RAIL_H_V:
      // Пересечение рельсов - рисуем горизонтальные и вертикальные рельсы
      drawCell(ctx, x, y, CELL_TYPES.RAIL_H);
      drawCell(ctx, x, y, CELL_TYPES.RAIL_V);
      break;

    case CELL_TYPES.TURN_RIGHT_DOWN: {
      const radius1RD = P.cellSize / 2 - P.railWidth;
      const radius2RD = P.cellSize / 2 + P.railWidth;
      const centerRD = { x: cellX, y: cellY + P.cellSize };
      
      drawCurvedTies(ctx, centerRD, radius1RD, radius2RD, -Math.PI/2, 0);
      drawCurvedRails(ctx, centerRD, radius1RD, radius2RD, -Math.PI/2, 0);
      break;
    }

    case CELL_TYPES.TURN_LEFT_DOWN: {
      const radius1LD = P.cellSize / 2 - P.railWidth;
      const radius2LD = P.cellSize / 2 + P.railWidth;
      const centerLD = { x: cellX + P.cellSize, y: cellY + P.cellSize };
      
      drawCurvedTies(ctx, centerLD, radius1LD, radius2LD, Math.PI, Math.PI * 3/2);
      drawCurvedRails(ctx, centerLD, radius1LD, radius2LD, Math.PI, Math.PI * 3/2);
      break;
    }

    case CELL_TYPES.TURN_RIGHT_UP: {
      const radius1RU = P.cellSize / 2 - P.railWidth;
      const radius2RU = P.cellSize / 2 + P.railWidth;
      const centerRU = { x: cellX + P.cellSize, y: cellY };
      
      drawCurvedTies(ctx, centerRU, radius1RU, radius2RU, Math.PI / 2, Math.PI);
      drawCurvedRails(ctx, centerRU, radius1RU, radius2RU, Math.PI / 2, Math.PI);
      break;
    }

    case CELL_TYPES.TURN_LEFT_UP: {
      const radius1LU = P.cellSize / 2 - P.railWidth;
      const radius2LU = P.cellSize / 2 + P.railWidth;
      const centerLU = { x: cellX, y: cellY };
      
      drawCurvedTies(ctx, centerLU, radius1LU, radius2LU, 0, Math.PI / 2);
      drawCurvedRails(ctx, centerLU, radius1LU, radius2LU, 0, Math.PI / 2);
      break;
    }

    case CELL_TYPES.EMPTY:
      // Пустая клетка - ничего не рисуем
      break;

    default: {
      // Неизвестный тип клетки — красный крест (фигурами, а не текстом: не зависит от шрифтов)
      const arm = P.cellSize * 0.25;
      ctx.strokeStyle = COLORS.SEMAPHORE_RED;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - arm, centerY - arm);
      ctx.lineTo(centerX + arm, centerY + arm);
      ctx.moveTo(centerX + arm, centerY - arm);
      ctx.lineTo(centerX - arm, centerY + arm);
      ctx.stroke();
      break;
    }
  }
}

// Object to store loaded train images
const trainImages: {
  locomotive: HTMLImageElement | null;
  wagon1: HTMLImageElement | null;
  wagon2: HTMLImageElement | null;
  loaded: boolean;
} = {
  locomotive: null,
  wagon1: null,
  wagon2: null,
  loaded: false
};

// Function to load train images
export function loadTrainImages(): Promise<void> {
  if (typeof Image === 'undefined') {
    // Node.js environment - skip image loading
    trainImages.loaded = true;
    return Promise.resolve();
  }
  
  return new Promise<void>((resolve, reject) => {
    let loadedCount = 0;
    const totalImages = 3;
    // Картинка не загрузилась — сообщаем, а не ждём вечно (§2.3.8)
    const onImageError = (event: Event | string) => {
      const src = typeof event === 'string' ? event : (event.target as HTMLImageElement | null)?.src;
      reject(new Error(`Failed to load image ${src ?? ''}`));
    };

    function onImageLoad() {
      loadedCount++;
      if (loadedCount === totalImages) {
        trainImages.loaded = true;
        resolve();
      }
    }
    
    // Load locomotive image
    trainImages.locomotive = new Image();
    trainImages.locomotive.onload = onImageLoad;
    trainImages.locomotive.onerror = onImageError;
    trainImages.locomotive.src = ASSETS_PATH + 'locomotive.png';
    
    // Load wagon images
    trainImages.wagon1 = new Image();
    trainImages.wagon1.onload = onImageLoad;
    trainImages.wagon1.onerror = onImageError;
    trainImages.wagon1.src = ASSETS_PATH + 'wagon1.png';

    trainImages.wagon2 = new Image();
    trainImages.wagon2.onload = onImageLoad;
    trainImages.wagon2.onerror = onImageError;
    trainImages.wagon2.src = ASSETS_PATH + 'wagon2.png';
  });
}

// New function to draw different train parts
export function drawTrainPart(
  ctx: CanvasRenderingContext2D,
  part: Pick<TrainPart, 'type' | 'wagonType' | 'pixelX' | 'pixelY' | 'direction'>,
): void {
  ctx.save();
  ctx.translate(part.pixelX, part.pixelY);
  ctx.rotate(part.direction);
  
  let image: HTMLImageElement | null = null;
  if (part.type === 'locomotive') {
    image = trainImages.locomotive;
  } else if (part.type === 'wagon') {
    image = part.wagonType ? trainImages[part.wagonType] : null;
  }
  
  if (!image || !image.complete || image.width === 0) {
    // Картинки нет (не загрузилась или отрисовка без DOM) — рисуем простой прямоугольник
    ctx.fillStyle = part.type === 'locomotive' ? COLORS.TRAIN_FALLBACK_LOCOMOTIVE : COLORS.TRAIN_FALLBACK_WAGON;
    ctx.fillRect(-P.cellSize * 0.4, -P.cellSize * 0.25, P.cellSize * 0.8, P.cellSize * 0.5);
    ctx.restore();
    return;
  }

  // Calculate scaled size while preserving aspect ratio
  const maxSize = P.cellSize;
  const aspectRatio = image.width / image.height;
  
  let drawWidth: number, drawHeight: number;
  if (aspectRatio > 1) {
    // Image is wider than tall
    drawWidth = maxSize;
    drawHeight = maxSize / aspectRatio;
  } else {
    // Image is taller than wide (or square)
    drawHeight = maxSize;
    drawWidth = maxSize * aspectRatio;
  }
  
  ctx.drawImage(image, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
  
  ctx.restore();
}

// Draw function for switch cells with visual indication of state
export function drawSwitchCell(ctx: DrawContext, x: number, y: number, cellType: string, isStraight: boolean | null | undefined): void {

  // Helper function to temporarily set dashed line style
  function withDashedStyle(callback: () => void): void {
    ctx.save();
    ctx.setLineDash([3, 3]); // Small dashes
    callback();
    ctx.restore();
  }

  // Determine which paths to draw based on switch type
  let straightPath: CellType, curvedPath: CellType;
  
  switch (cellType) {
    case CELL_TYPES.SWITCH_RIGHT_DOWN_V: // "┐|"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_RIGHT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_DOWN_V: // "|┌"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_LEFT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_UP_V: // "┘|"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_LEFT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_UP_V: // "|└"
      straightPath = CELL_TYPES.RAIL_V;
      curvedPath = CELL_TYPES.TURN_RIGHT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_DOWN_H: // "┐-"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_RIGHT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_DOWN_H: // "-┌"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_LEFT_DOWN;
      break;
    case CELL_TYPES.SWITCH_LEFT_UP_H: // "┘-"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_LEFT_UP;
      break;
    case CELL_TYPES.SWITCH_RIGHT_UP_H: // "-└"
      straightPath = CELL_TYPES.RAIL_H;
      curvedPath = CELL_TYPES.TURN_RIGHT_UP;
      break;
    default:
      // Fallback to original cell drawing
      drawCell(ctx, x, y, cellType);
      return;
  }

  // Draw the paths based on switch state
  if (isStraight) {
    // Straight path is active (solid), curved path is inactive (dashed)
    drawCell(ctx, x, y, straightPath);
    withDashedStyle(() => drawCell(ctx, x, y, curvedPath));
  } else {
    // Curved path is active (solid), straight path is inactive (dashed)
    drawCell(ctx, x, y, curvedPath);
    withDashedStyle(() => drawCell(ctx, x, y, straightPath));
  }
}

// Draw function for semaphore cells with visual indication of state
// Now cellType is the base rail/turn type, not a special semaphore type
export function drawSemaphoreCell(ctx: DrawContext, x: number, y: number, cellType: string, isOpen: boolean | undefined): void {
  // First draw the base rail/turn
  drawCell(ctx, x, y, cellType);
  
  // Then draw the semaphore indicator
  const centerX = (x + 0.5) * P.cellSize;
  const centerY = (y + 0.5) * P.cellSize;
  
  const radius = P.cellSize * 0.1;
  const semaphoreX = centerX + 10;
  const topCircleY = centerY - 10 - radius;    // Upper circle position
  const bottomCircleY = centerY - 10 + radius; // Lower circle position
  
  if (isOpen) {
    // Semaphore is open: top circle is black, bottom circle is green with black border
    
    // Draw top black circle
    ctx.fillStyle = COLORS.BLACK;
    ctx.beginPath();
    ctx.arc(semaphoreX, topCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bottom green circle with black border
    ctx.fillStyle = COLORS.SEMAPHORE_GREEN;
    ctx.beginPath();
    ctx.arc(semaphoreX, bottomCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add black border to green circle
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.stroke();
    
  } else {
    // Semaphore is closed: top circle is red with black border, bottom circle is black
    
    // Draw top red circle with black border
    ctx.fillStyle = COLORS.SEMAPHORE_RED;
    ctx.beginPath();
    ctx.arc(semaphoreX, topCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add black border to red circle
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw bottom black circle
    ctx.fillStyle = COLORS.BLACK;
    ctx.beginPath();
    ctx.arc(semaphoreX, bottomCircleY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw function for station cells with house icon underneath
export function drawStationCell(ctx: DrawContext, x: number, y: number, cellType: string): void {
  drawStationIcon(ctx, x, y);

  // Draw the normal cell content on top
  drawCell(ctx, x, y, cellType);
}

// Домик станции — подложка клетки; рельсы, стрелка или семафор рисуются поверх.
// Фигурами, а не эмодзи: одинаково во всех браузерах и системах (§2.5)
export function drawStationIcon(ctx: DrawContext, x: number, y: number): void {
  const s = P.cellSize;
  const left = x * s;
  const top = y * s;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.BLACK;

  // Стены
  ctx.fillStyle = COLORS.HOUSE_WALL;
  ctx.fillRect(left + s * 0.22, top + s * 0.45, s * 0.56, s * 0.43);
  ctx.strokeRect(left + s * 0.22, top + s * 0.45, s * 0.56, s * 0.43);

  // Крыша
  ctx.fillStyle = COLORS.HOUSE_ROOF;
  ctx.beginPath();
  ctx.moveTo(left + s * 0.12, top + s * 0.47);
  ctx.lineTo(left + s * 0.5, top + s * 0.12);
  ctx.lineTo(left + s * 0.88, top + s * 0.47);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Дверь
  ctx.fillStyle = COLORS.HOUSE_DOOR;
  ctx.fillRect(left + s * 0.43, top + s * 0.62, s * 0.14, s * 0.26);
  ctx.restore();
}
