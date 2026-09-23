// Pure helpers: canvas display rect ↔ grid, zoom math (no DOM).

function clientToGridCell(clientX, clientY, rect, canvasWidth, canvasHeight, cellSize) {
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;
  const pixelX = relativeX * scaleX;
  const pixelY = relativeY * scaleY;
  return {
    gridX: Math.floor(pixelX / cellSize),
    gridY: Math.floor(pixelY / cellSize),
    pixelX,
    pixelY,
  };
}

function clampViewZoom(zoom, min, max) {
  return Math.min(max, Math.max(min, zoom));
}

function zoomFromWheelDelta(currentZoom, deltaY, min, max, sensitivity) {
  const factor = Math.exp(-deltaY * sensitivity);
  return clampViewZoom(currentZoom * factor, min, max);
}

function zoomFromPinchRatio(baseZoom, startDistance, currentDistance, min, max) {
  if (startDistance <= 0 || currentDistance <= 0) {
    return clampViewZoom(baseZoom, min, max);
  }
  return clampViewZoom((baseZoom * currentDistance) / startDistance, min, max);
}

function touchPairDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function buildCanvasViewTransform(panX, panY, zoom) {
  return `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

/**
 * Допустимый сдвиг translate при transform-origin: top left.
 * pan ≤ 0: без пустоты слева/сверху; pan ≥ min: без пустоты справа/снизу (докрут до правого нижнего угла).
 */
function computeViewPanBounds(canvasWidth, canvasHeight, zoom, viewportWidth, viewportHeight) {
  const sw = canvasWidth * zoom;
  const sh = canvasHeight * zoom;
  const vw = viewportWidth > 0 ? viewportWidth : sw;
  const vh = viewportHeight > 0 ? viewportHeight : sh;
  const rangeX = Math.max(0, sw - vw);
  const rangeY = Math.max(0, sh - vh);
  return {
    minPanX: rangeX === 0 ? 0 : -rangeX,
    maxPanX: 0,
    minPanY: rangeY === 0 ? 0 : -rangeY,
    maxPanY: 0,
  };
}

function clampViewPanPair(panX, panY, bounds) {
  const { minPanX, maxPanX, minPanY, maxPanY } = bounds;
  return {
    panX: Math.min(maxPanX, Math.max(minPanX, panX)),
    panY: Math.min(maxPanY, Math.max(minPanY, panY)),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clientToGridCell,
    clampViewZoom,
    zoomFromWheelDelta,
    zoomFromPinchRatio,
    touchPairDistance,
    buildCanvasViewTransform,
    computeViewPanBounds,
    clampViewPanPair,
  };
}
