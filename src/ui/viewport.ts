// Pure helpers: canvas display rect ↔ grid, zoom math (no DOM).

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PanBounds {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
}

export function clientToGridCell(
  clientX: number,
  clientY: number,
  rect: RectLike,
  canvasWidth: number,
  canvasHeight: number,
  cellSize: number,
) {
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

export function clampViewZoom(zoom: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, zoom));
}

export function zoomFromWheelDelta(currentZoom: number, deltaY: number, min: number, max: number, sensitivity: number): number {
  const factor = Math.exp(-deltaY * sensitivity);
  return clampViewZoom(currentZoom * factor, min, max);
}

export function zoomFromPinchRatio(baseZoom: number, startDistance: number, currentDistance: number, min: number, max: number): number {
  if (startDistance <= 0 || currentDistance <= 0) {
    return clampViewZoom(baseZoom, min, max);
  }
  return clampViewZoom((baseZoom * currentDistance) / startDistance, min, max);
}

export function touchPairDistance(touches: ArrayLike<{ clientX: number; clientY: number }> | null | undefined): number {
  if (!touches || touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

export function buildCanvasViewTransform(panX: number, panY: number, zoom: number): string {
  return `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

/**
 * Допустимый сдвиг translate при transform-origin: top left.
 * pan ≤ 0: без пустоты слева/сверху; pan ≥ min: без пустоты справа/снизу (докрут до правого нижнего угла).
 */
export function computeViewPanBounds(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): PanBounds {
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

export function clampViewPanPair(panX: number, panY: number, bounds: PanBounds): { panX: number; panY: number } {
  const { minPanX, maxPanX, minPanY, maxPanY } = bounds;
  return {
    panX: Math.min(maxPanX, Math.max(minPanX, panX)),
    panY: Math.min(maxPanY, Math.max(minPanY, panY)),
  };
}
