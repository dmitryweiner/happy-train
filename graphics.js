// Графические функции для игры
if (typeof window === 'undefined') {
  const { CELL_SIZE, CELL_TYPES, RAIL_WIDTH, TIE_WIDTH, TIE_SPACING } = require('./constants');
  globalThis.CELL_SIZE = CELL_SIZE;
  globalThis.CELL_TYPES = CELL_TYPES;
  globalThis.RAIL_WIDTH = RAIL_WIDTH;
  globalThis.TIE_WIDTH = TIE_WIDTH;
  globalThis.TIE_SPACING = TIE_SPACING;
}

// Path to assets folder
const ASSETS_PATH = 'assets/';

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
};

const NATURE_OBJECT_PROBABILITY = 0.1;

// Функция для генерации псевдослучайного числа на основе seed
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Генерация единого фонового изображения для всей игры
function generateBackground(canvas, grid) {
  // Создаем отдельный canvas для фона
  let backgroundCanvas;
  if (typeof document !== 'undefined') {
    // Браузерное окружение
    backgroundCanvas = document.createElement('canvas');
  } else {
    // Node.js окружение (для тестов)
    const { createCanvas } = require('canvas');
    backgroundCanvas = createCanvas(canvas.width, canvas.height);
  }
  
  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  const bgCtx = backgroundCanvas.getContext('2d');
  
  // Заполняем базовым зеленым цветом
  bgCtx.fillStyle = COLORS.GRASS_BASE; // LightGreen - базовый цвет травы
  bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
  
  // Количество зеленых пятен (примерно 8 на клетку)
  const totalPatches = Math.floor(GRID_WIDTH * GRID_HEIGHT * 8);
  
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

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === CELL_TYPES.EMPTY) {
        const objects = ['🏔️', '🌋', '🌲', '🌳', '🌾', '🌵', '🌱', '☘️', '🌿', '🏕️', '🛖', '🌼'];
        const randomObject = objects[Math.floor(Math.random() * objects.length)];
        const shouldDrawObject = Math.random() < NATURE_OBJECT_PROBABILITY;
        if (shouldDrawObject) {
          const centerX = x * CELL_SIZE + CELL_SIZE / 2;
          const centerY = y * CELL_SIZE + CELL_SIZE / 2;        
          bgCtx.fillStyle = COLORS.BLACK;
          bgCtx.font = "20px Arial";
          bgCtx.textAlign = "center";
          bgCtx.textBaseline = "middle";
          bgCtx.fillText(randomObject, centerX, centerY);
        }
      }
    }
  }


  // Рисуем сетку для ориентировки
  bgCtx.strokeStyle = COLORS.GRID_LINE;
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      bgCtx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
  
  return backgroundCanvas;
}

// Helper functions for drawing rail components
function drawHorizontalTies(ctx, cellX, cellY, centerY) {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const numTies = Math.floor(CELL_SIZE / TIE_SPACING);
  const tieSpacing = CELL_SIZE / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const tieX = cellX + i * tieSpacing + tieSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(tieX, centerY - RAIL_WIDTH - TIE_WIDTH/2);
    ctx.lineTo(tieX, centerY + RAIL_WIDTH + TIE_WIDTH/2);
    ctx.stroke();
  }
}

function drawVerticalTies(ctx, cellX, cellY, centerX) {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const numTies = Math.floor(CELL_SIZE / TIE_SPACING);
  const tieSpacing = CELL_SIZE / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const tieY = cellY + i * tieSpacing + tieSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - RAIL_WIDTH - TIE_WIDTH/2, tieY);
    ctx.lineTo(centerX + RAIL_WIDTH + TIE_WIDTH/2, tieY);
    ctx.stroke();
  }
}

function drawCurvedTies(ctx, center, radius1, radius2, startAngle, endAngle) {
  ctx.strokeStyle = COLORS.TIE_BROWN;
  const arcLength = Math.abs(endAngle - startAngle) * CELL_SIZE/2;
  const numTies = Math.floor(arcLength / TIE_SPACING);
  const tieAngleSpacing = (endAngle - startAngle) / numTies;
  
  for (let i = 0; i < numTies; i++) {
    const angle = startAngle + i * tieAngleSpacing + tieAngleSpacing / 2;
    
    ctx.beginPath();
    ctx.moveTo(
      center.x + (radius1 - TIE_WIDTH/2) * Math.cos(angle), 
      center.y + (radius1 - TIE_WIDTH/2) * Math.sin(angle)
    );
    ctx.lineTo(
      center.x + (radius2 + TIE_WIDTH/2) * Math.cos(angle), 
      center.y + (radius2 + TIE_WIDTH/2) * Math.sin(angle)
    );
    ctx.stroke();
  }
}

function drawHorizontalRails(ctx, cellX, cellY, centerY) {
  ctx.strokeStyle = COLORS.RAIL_GRAY;
  
  // Верхний рельс
  ctx.beginPath();
  ctx.moveTo(cellX, centerY - RAIL_WIDTH);
  ctx.lineTo(cellX + CELL_SIZE, centerY - RAIL_WIDTH);
  ctx.stroke();

  // Нижний рельс
  ctx.beginPath();
  ctx.moveTo(cellX, centerY + RAIL_WIDTH);
  ctx.lineTo(cellX + CELL_SIZE, centerY + RAIL_WIDTH);
  ctx.stroke();
}

function drawVerticalRails(ctx, cellX, cellY, centerX) {
  ctx.strokeStyle = COLORS.RAIL_GRAY;
  
  // Левый рельс
  ctx.beginPath();
  ctx.moveTo(centerX - RAIL_WIDTH, cellY);
  ctx.lineTo(centerX - RAIL_WIDTH, cellY + CELL_SIZE);
  ctx.stroke();

  // Правый рельс
  ctx.beginPath();
  ctx.moveTo(centerX + RAIL_WIDTH, cellY);
  ctx.lineTo(centerX + RAIL_WIDTH, cellY + CELL_SIZE);
  ctx.stroke();
}

function drawCurvedRails(ctx, center, radius1, radius2, startAngle, endAngle) {
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

function drawCell(ctx, x, y, cellType) {
  const cellX = x * CELL_SIZE;
  const cellY = y * CELL_SIZE;
  const centerX = cellX + CELL_SIZE / 2;
  const centerY = cellY + CELL_SIZE / 2;

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

    case CELL_TYPES.TURN_RIGHT_DOWN:
      const radius1RD = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2RD = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerRD = { x: cellX, y: cellY + CELL_SIZE };
      
      drawCurvedTies(ctx, centerRD, radius1RD, radius2RD, -Math.PI/2, 0);
      drawCurvedRails(ctx, centerRD, radius1RD, radius2RD, -Math.PI/2, 0);
      break;

    case CELL_TYPES.TURN_LEFT_DOWN:
      const radius1LD = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2LD = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerLD = { x: cellX + CELL_SIZE, y: cellY + CELL_SIZE };
      
      drawCurvedTies(ctx, centerLD, radius1LD, radius2LD, Math.PI, Math.PI * 3/2);
      drawCurvedRails(ctx, centerLD, radius1LD, radius2LD, Math.PI, Math.PI * 3/2);
      break;

    case CELL_TYPES.TURN_RIGHT_UP:
      const radius1RU = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2RU = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerRU = { x: cellX + CELL_SIZE, y: cellY };
      
      drawCurvedTies(ctx, centerRU, radius1RU, radius2RU, Math.PI / 2, Math.PI);
      drawCurvedRails(ctx, centerRU, radius1RU, radius2RU, Math.PI / 2, Math.PI);
      break;

    case CELL_TYPES.TURN_LEFT_UP:
      const radius1LU = CELL_SIZE / 2 - RAIL_WIDTH;
      const radius2LU = CELL_SIZE / 2 + RAIL_WIDTH;
      const centerLU = { x: cellX, y: cellY };
      
      drawCurvedTies(ctx, centerLU, radius1LU, radius2LU, 0, Math.PI / 2);
      drawCurvedRails(ctx, centerLU, radius1LU, radius2LU, 0, Math.PI / 2);
      break;

    case CELL_TYPES.EMPTY:
      // Пустая клетка - ничего не рисуем
      break;

    default:
      // Для других типов клеток оставляем текстовую отрисовку
      ctx.fillStyle = COLORS.BLACK;
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cellType, centerX, centerY);
      break;
  }
}

// Object to store loaded train images
const trainImages = {
  locomotive: null,
  wagon1: null,
  wagon2: null,
  loaded: false
};

// Function to load train images
function loadTrainImages() {
  if (typeof Image === 'undefined') {
    // Node.js environment - skip image loading
    trainImages.loaded = true;
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    let loadedCount = 0;
    const totalImages = 3;
    
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
    trainImages.locomotive.src = ASSETS_PATH + 'locomotive.png';
    
    // Load wagon images
    trainImages.wagon1 = new Image();
    trainImages.wagon1.onload = onImageLoad;
    trainImages.wagon1.src = ASSETS_PATH + 'wagon1.png';

    trainImages.wagon2 = new Image();
    trainImages.wagon2.onload = onImageLoad;
    trainImages.wagon2.src = ASSETS_PATH + 'wagon2.png';
  });
}

// New function to draw different train parts
function drawTrainPart(ctx, part) {
  ctx.save();
  ctx.translate(part.pixelX, part.pixelY);
  ctx.rotate(part.direction);
  
  let image = null;
  if (part.type === 'locomotive') {
    image = trainImages.locomotive;
  } else if (part.type === 'wagon') {
    image = trainImages[part.wagonType];
  }
  
  // Calculate scaled size while preserving aspect ratio
  const maxSize = CELL_SIZE;
  const aspectRatio = image.width / image.height;
  
  let drawWidth, drawHeight;
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
function drawSwitchCell(ctx, x, y, cellType, isStraight) {
  const centerX = (x + 0.5) * CELL_SIZE;
  const centerY = (y + 0.5) * CELL_SIZE;

  // Helper function to temporarily set dashed line style
  function withDashedStyle(callback) {
    ctx.save();
    ctx.setLineDash([3, 3]); // Small dashes
    callback();
    ctx.restore();
  }

  // Determine which paths to draw based on switch type
  let straightPath, curvedPath;
  
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
function drawSemaphoreCell(ctx, x, y, cellType, isOpen) {
  // First draw the base rail/turn
  drawCell(ctx, x, y, cellType);
  
  // Then draw the semaphore indicator
  const centerX = (x + 0.5) * CELL_SIZE;
  const centerY = (y + 0.5) * CELL_SIZE;
  
  const radius = CELL_SIZE * 0.1;
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
function drawStationCell(ctx, x, y, cellType) {
  const cellX = x * CELL_SIZE;
  const cellY = y * CELL_SIZE;
  const centerX = cellX + CELL_SIZE / 2;
  const centerY = cellY + CELL_SIZE / 2;
  
  // Draw house icon first (underneath the rails)
  ctx.font = `${CELL_SIZE * 0.8}px Arial`; // Size is about half the cell
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.BLACK; // Black color for the house icon
  ctx.fillText("🏠", centerX, centerY);
  
  // Draw the normal cell content on top
  drawCell(ctx, x, y, cellType);
}

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ASSETS_PATH,
    seededRandom,
    generateBackground,
    drawCell,
    drawTrainPart,
    loadTrainImages,
    drawSwitchCell,
    drawSemaphoreCell,
    drawStationCell,
  };
} 