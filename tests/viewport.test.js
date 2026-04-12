const {
  CELL_SIZE,
  VIEW_ZOOM_MIN,
  VIEW_ZOOM_MAX,
  VIEW_ZOOM_WHEEL_SENSITIVITY,
} = require('../constants.js');
const {
  clientToGridCell,
  clampViewZoom,
  zoomFromWheelDelta,
  zoomFromPinchRatio,
  touchPairDistance,
  buildCanvasViewTransform,
  computeViewPanBounds,
  clampViewPanPair,
} = require('../viewport.js');

describe('clientToGridCell', () => {
  const rect = { left: 100, top: 50, width: 300, height: 200 };
  const canvasW = 600;
  const canvasH = 400;

  test('maps center of rect to center of canvas in buffer pixels', () => {
    const { gridX, gridY, pixelX, pixelY } = clientToGridCell(
      100 + 150,
      50 + 100,
      rect,
      canvasW,
      canvasH,
      CELL_SIZE
    );
    expect(pixelX).toBe(300);
    expect(pixelY).toBe(200);
    expect(gridX).toBe(Math.floor(300 / CELL_SIZE));
    expect(gridY).toBe(Math.floor(200 / CELL_SIZE));
  });

  test('scales when displayed size differs from buffer (CSS scale)', () => {
    const { gridX, gridY } = clientToGridCell(
      100,
      50,
      rect,
      canvasW,
      canvasH,
      CELL_SIZE
    );
    expect(gridX).toBe(0);
    expect(gridY).toBe(0);
  });

  test('cell (2, 3) top-left corner inside cell', () => {
    const x = 100 + (80 / canvasW) * rect.width;
    const y = 50 + (120 / canvasH) * rect.height;
    const { gridX, gridY } = clientToGridCell(x, y, rect, canvasW, canvasH, CELL_SIZE);
    expect(gridX).toBe(2);
    expect(gridY).toBe(3);
  });
});

describe('clampViewZoom', () => {
  test('clamps to bounds', () => {
    expect(clampViewZoom(0.5, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX)).toBe(VIEW_ZOOM_MIN);
    expect(clampViewZoom(99, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX)).toBe(VIEW_ZOOM_MAX);
    expect(clampViewZoom(1.2, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX)).toBe(1.2);
  });
});

describe('zoomFromWheelDelta', () => {
  test('scroll down (positive deltaY) does not go below minimum zoom', () => {
    const z = zoomFromWheelDelta(1, 100, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX, VIEW_ZOOM_WHEEL_SENSITIVITY);
    expect(z).toBe(VIEW_ZOOM_MIN);
  });

  test('scroll up (negative deltaY) zooms in', () => {
    const z = zoomFromWheelDelta(1, -100, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX, VIEW_ZOOM_WHEEL_SENSITIVITY);
    expect(z).toBeGreaterThan(1);
    expect(z).toBeLessThanOrEqual(VIEW_ZOOM_MAX);
  });
});

describe('zoomFromPinchRatio', () => {
  test('doubles distance doubles zoom relative to base', () => {
    expect(zoomFromPinchRatio(1, 100, 200, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX)).toBe(2);
  });

  test('clamps when ratio is extreme', () => {
    expect(zoomFromPinchRatio(1, 10, 1000, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX)).toBe(VIEW_ZOOM_MAX);
  });
});

describe('buildCanvasViewTransform', () => {
  test('combines translate and scale', () => {
    expect(buildCanvasViewTransform(10, -5, 1.5)).toBe('translate(10px, -5px) scale(1.5)');
  });
});

describe('computeViewPanBounds', () => {
  test('returns zero range when scaled board fits viewport', () => {
    const b = computeViewPanBounds(600, 400, 1, 800, 600);
    expect(b.minPanX).toBe(0);
    expect(b.maxPanX).toBe(0);
    expect(b.minPanY).toBe(0);
    expect(b.maxPanY).toBe(0);
  });

  test('allows pan when scaled board exceeds viewport', () => {
    const b = computeViewPanBounds(600, 400, 2, 600, 400);
    expect(b.minPanX).toBe(-600);
    expect(b.maxPanX).toBe(0);
    expect(b.minPanY).toBe(-400);
    expect(b.maxPanY).toBe(0);
  });
});

describe('clampViewPanPair', () => {
  test('clamps to negative pan window (no gray top/left)', () => {
    const b = { minPanX: -50, maxPanX: 0, minPanY: -40, maxPanY: 0 };
    expect(clampViewPanPair(100, 10, b)).toEqual({ panX: 0, panY: 0 });
    expect(clampViewPanPair(-60, -50, b)).toEqual({ panX: -50, panY: -40 });
    expect(clampViewPanPair(-10, -5, b)).toEqual({ panX: -10, panY: -5 });
  });
});

describe('touchPairDistance', () => {
  test('returns hypot between two touches', () => {
    const touches = [
      { clientX: 0, clientY: 0 },
      { clientX: 3, clientY: 4 },
    ];
    expect(touchPairDistance(touches)).toBe(5);
  });

  test('returns 0 for fewer than two touches', () => {
    expect(touchPairDistance([{ clientX: 0, clientY: 0 }])).toBe(0);
    expect(touchPairDistance(null)).toBe(0);
  });
});
