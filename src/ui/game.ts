import {
  CELL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  STORAGE_KEYS,
  VIEW_DRAG_THRESHOLD_PX,
  VIEW_PINCH_RATIO_THRESHOLD,
  VIEW_ZOOM_MAX,
  VIEW_ZOOM_MIN,
  VIEW_ZOOM_STEP,
  VIEW_ZOOM_WHEEL_SENSITIVITY,
} from '../constants';
import { clickCell, createWorld, isWorldIdle, stepWorld, TICK_RATE, type World } from '../core/world';
import { generateBackground } from '../render/graphics';
import { WorldRenderer } from '../render/world-renderer';
import { levels } from '../levels';
import type { LegacyLevel } from '../types';
import { Storage } from './storage';
import {
  buildCanvasViewTransform,
  clampViewPanPair,
  clampViewZoom,
  clientToGridCell,
  computeViewPanBounds,
  panForZoomAround,
  touchPairDistance,
  zoomFromPinchRatio,
  zoomFromWheelDelta,
} from './viewport';

type PauseReason = 'manual' | 'window' | 'hidden';

const TICK_SECONDS = 1 / TICK_RATE;
const MAX_TICKS_PER_FRAME = 5;

function requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element #${id} not found`);
  }
  return element as T;
}

export class Game {
  readonly levels: readonly LegacyLevel[];
  canvas: HTMLCanvasElement;
  boardViewport: HTMLElement | null;
  boardTransformRoot: HTMLElement;
  ctx: CanvasRenderingContext2D;
  gameOverScreen: HTMLElement;
  levelCompleteScreen: HTMLElement;
  gameWinScreen: HTMLElement;
  levelDisplay: HTMLElement;
  playAgainButton: HTMLElement;
  nextLevelButton: HTMLElement;
  playAgainWinButton: HTMLElement;
  startOverButton: HTMLElement;

  currentLevelIndex: number;
  lastTime: number;
  timeAccumulator = 0;
  renderer = new WorldRenderer();
  private frameRequested = false;
  private looping = false;
  pauseReasons = new Set<PauseReason>();
  viewZoom: number;
  viewPanX: number;
  viewPanY: number;
  world!: World;
  backgroundCanvas!: CanvasImageSource;

  private _pinchStartDistance: number;
  private _pinchStartZoom: number;
  private _pinchSuppressedToggle: boolean;
  private _touchGestureMultifinger: boolean;
  private _activePanPointerId: number | null;
  private _panPointerDown: boolean;
  private _panDragCommitted: boolean;
  private _suppressNextClick: boolean;
  private _panStartClientX = 0;
  private _panStartClientY = 0;
  private _panLastClientX = 0;
  private _panLastClientY = 0;

  constructor(levelList: readonly LegacyLevel[] = levels) {
    this.levels = levelList;
    this.canvas = requireElement<HTMLCanvasElement>("gameCanvas");
    this.boardViewport = document.getElementById("game-board-viewport");
    this.boardTransformRoot =
      document.getElementById("game-board-content") || this.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D context is not available");
    }
    this.ctx = ctx;
    this.gameOverScreen = requireElement("gameOver");
    this.levelCompleteScreen = requireElement("levelComplete");
    this.gameWinScreen = requireElement("gameWin");
    this.levelDisplay = requireElement("level-display");
    this.playAgainButton = requireElement("playAgain");
    this.nextLevelButton = requireElement("nextLevel");
    this.playAgainWinButton = requireElement("playAgainWin");
    this.startOverButton = requireElement("startOver");

    this.currentLevelIndex = this.loadCurrentLevel(); // Load saved level or start from 0
    this.lastTime = performance.now();
    this.setupCanvas();
    this.viewZoom = 1;
    this.viewPanX = 0;
    this.viewPanY = 0;
    this._pinchStartDistance = 0;
    this._pinchStartZoom = 1;
    this._pinchSuppressedToggle = false;
    this._touchGestureMultifinger = false;
    this._activePanPointerId = null;
    this._panPointerDown = false;
    this._panDragCommitted = false;
    this._suppressNextClick = false;
    this.initGame(); // запускает цикл кадров
    this.setupEventListeners();
  }

  loadCurrentLevel(): number {
    const savedLevel = Storage.get(STORAGE_KEYS.CURRENT_LEVEL);
    if (savedLevel !== null) {
      const levelIndex = parseInt(String(savedLevel), 10);
      // Убедимся, что сохраненный уровень существует в массиве levels
      if (levelIndex >= 0 && levelIndex < this.levels.length) {
        return levelIndex;
      }
    }
    return 0; // Default to first level
  }

  saveCurrentLevel() {
    Storage.set(STORAGE_KEYS.CURRENT_LEVEL, this.currentLevelIndex);
  }

  clearSavedLevel() {
    Storage.remove(STORAGE_KEYS.CURRENT_LEVEL);
  }

  // Размер поля — из уровня (§2.1)
  setupCanvas(columns = GRID_WIDTH, rows = GRID_HEIGHT) {
    const width = columns * CELL_SIZE;
    const height = rows * CELL_SIZE;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.boardViewport) {
      this.boardViewport.style.boxSizing = "content-box";
      this.boardViewport.style.width = `${width}px`;
      this.boardViewport.style.height = `${height}px`;
    }
    // Мобильная подгонка в styles.css считает масштаб от этих размеров (+ рамка 2px)
    document.documentElement.style.setProperty('--board-w', `${width + 4}px`);
    document.documentElement.style.setProperty('--board-h', `${height + 4}px`);
  }

  // Масштаб клавишами: относительно центра видимой части поля
  zoomBy(factor: number): void {
    const oldZoom = this.viewZoom;
    const newZoom = clampViewZoom(oldZoom * factor, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX);
    const viewportWidth = this.boardViewport?.clientWidth || this.canvas.width;
    const viewportHeight = this.boardViewport?.clientHeight || this.canvas.height;
    const pan = panForZoomAround(this.viewPanX, this.viewPanY, oldZoom, newZoom, viewportWidth / 2, viewportHeight / 2);
    this.viewPanX = pan.panX;
    this.viewPanY = pan.panY;
    this.setViewZoom(newZoom);
  }

  setViewZoom(zoom: number): void {
    this.viewZoom = clampViewZoom(zoom, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX);
    this.applyViewTransform();
  }

  applyViewTransform() {
    this.viewZoom = clampViewZoom(this.viewZoom, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX);
    const vw = this.boardViewport ? this.boardViewport.clientWidth : 0;
    const vh = this.boardViewport ? this.boardViewport.clientHeight : 0;
    const panBounds = computeViewPanBounds(
      this.canvas.width,
      this.canvas.height,
      this.viewZoom,
      vw,
      vh
    );
    const clamped = clampViewPanPair(this.viewPanX, this.viewPanY, panBounds);
    this.viewPanX = clamped.panX;
    this.viewPanY = clamped.panY;
    this.boardTransformRoot.style.transformOrigin = "top left";
    this.boardTransformRoot.style.transform = buildCanvasViewTransform(
      this.viewPanX,
      this.viewPanY,
      this.viewZoom
    );
  }

  updateLevelDisplay() {
    const paused = this.pauseReasons.has('manual') ? ' · PAUSED' : '';
    this.levelDisplay.textContent = `Level #${this.currentLevelIndex + 1}${paused}`;
  }

  get isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  setPause(reason: PauseReason, paused: boolean): void {
    const wasPaused = this.isPaused;
    if (paused) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    if (wasPaused && !this.isPaused) {
      this.requestFrame();
    }
    this.updateLevelDisplay();
  }

  initGame(resetToFirstLevel = false): void {
    // If resetToFirstLevel is true, reset to first level
    if (resetToFirstLevel) {
      this.currentLevelIndex = 0;
      this.clearSavedLevel();
    }
    
    // Load level data (use current level)
    const currentLevel = this.levels[this.currentLevelIndex];
    
    this.world = createWorld(currentLevel);
    this.timeAccumulator = 0;
    this.setupCanvas(this.world.track.width, this.world.track.height);
    this.requestFrame();
    
    // Создаем фон
    this.backgroundCanvas = generateBackground(this.canvas, this.world.grid);
    
    // Обновляем отображение уровня
    this.updateLevelDisplay();

    this.viewPanX = 0;
    this.viewPanY = 0;
    this.applyViewTransform();
  }


  setupEventListeners() {
    this.playAgainButton.addEventListener("click", () => {
      // Hide game over screen
      this.gameOverScreen.style.display = "none";
      this.initGame();
    });
    
    this.startOverButton.addEventListener("click", () => {
      // Hide game over screen
      this.gameOverScreen.style.display = "none";
      this.initGame(true);
    });
    
    this.nextLevelButton.addEventListener("click", () => {
      // Hide level complete screen
      this.levelCompleteScreen.style.display = "none";
      this.currentLevelIndex++;
      this.saveCurrentLevel(); // Save progress
      this.initGame();
    });
    
    // Ручная пауза — по клику на номер уровня. Она не снимается сама при возврате в окно (§2.3.4)
    this.levelDisplay.addEventListener("click", () => {
      this.setPause('manual', !this.pauseReasons.has('manual'));
    });

    this.playAgainWinButton.addEventListener("click", () => {
      // Hide game win screen
      this.gameWinScreen.style.display = "none";
      this.currentLevelIndex = 0; // Reset to first level
      this.clearSavedLevel(); // Clear saved progress
      this.initGame();
    });
    
    // Автопауза, пока окно не в фокусе или вкладка скрыта (для мобильных браузеров)
    window.addEventListener("blur", () => this.setPause('window', true));
    window.addEventListener("focus", () => this.setPause('window', false));
    document.addEventListener("visibilitychange", () => this.setPause('hidden', document.hidden));
    
    // Handle both clicks and taps for switch toggling
    const handleSwitchInteraction = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();

      let clientX: number, clientY: number;
      if (e.type === "touchend") {
        e.preventDefault();
        const touch = (e as TouchEvent).changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const { gridX: x, gridY: y } = clientToGridCell(
        clientX,
        clientY,
        rect,
        this.canvas.width,
        this.canvas.height,
        CELL_SIZE
      );

      if (x >= 0 && x < this.world.track.width && y >= 0 && y < this.world.track.height) {
        clickCell(this.world, x, y);
        // На паузе цикл стоит: перерисуем кадр, чтобы было видно новое положение стрелки/семафора
        this.requestFrame();
      }
    };

    this.canvas.addEventListener("click", (e) => {
      if (this._suppressNextClick) {
        this._suppressNextClick = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      handleSwitchInteraction(e);
    });

    this.canvas.addEventListener("touchend", (e) => {
      if (e.touches.length === 0) {
        this._touchGestureMultifinger = false;
      }
      if (this._pinchSuppressedToggle) {
        if (e.touches.length === 0) {
          this._pinchSuppressedToggle = false;
          this._pinchStartDistance = 0;
        }
        e.preventDefault();
        return;
      }
      if (this._suppressNextClick) {
        this._suppressNextClick = false;
        e.preventDefault();
        return;
      }
      if (e.touches.length > 0) {
        return;
      }
      this._pinchStartDistance = 0;
      handleSwitchInteraction(e);
    });

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length >= 2) {
          this._touchGestureMultifinger = true;
        }
        if (e.touches.length === 2) {
          this._pinchStartDistance = touchPairDistance(e.touches);
          this._pinchStartZoom = this.viewZoom;
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 2 && this._pinchStartDistance > 0) {
          const d = touchPairDistance(e.touches);
          const ratio = d / this._pinchStartDistance;
          if (Math.abs(ratio - 1) >= VIEW_PINCH_RATIO_THRESHOLD) {
            this._pinchSuppressedToggle = true;
          }
          this.setViewZoom(
            zoomFromPinchRatio(
              this._pinchStartZoom,
              this._pinchStartDistance,
              d,
              VIEW_ZOOM_MIN,
              VIEW_ZOOM_MAX
            )
          );
          e.preventDefault();
        }
      },
      { passive: false }
    );

    const onPanPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== this._activePanPointerId) return;
      this._panPointerDown = false;
      this._activePanPointerId = null;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (this._panDragCommitted) {
        this._suppressNextClick = true;
      }
      this._panDragCommitted = false;
    };

    this.canvas.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (this._touchGestureMultifinger) return;
      this._activePanPointerId = e.pointerId;
      this._panPointerDown = true;
      this._panDragCommitted = false;
      this._panStartClientX = e.clientX;
      this._panStartClientY = e.clientY;
      this._panLastClientX = e.clientX;
      this._panLastClientY = e.clientY;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== this._activePanPointerId || !this._panPointerDown) return;
      if (this._touchGestureMultifinger) return;
      const vw = this.boardViewport ? this.boardViewport.clientWidth : 0;
      const vh = this.boardViewport ? this.boardViewport.clientHeight : 0;
      const panBounds = computeViewPanBounds(
        this.canvas.width,
        this.canvas.height,
        this.viewZoom,
        vw,
        vh
      );
      if (
        panBounds.minPanX === panBounds.maxPanX &&
        panBounds.minPanY === panBounds.maxPanY
      ) {
        return;
      }
      if (!this._panDragCommitted) {
        const dist = Math.hypot(
          e.clientX - this._panStartClientX,
          e.clientY - this._panStartClientY
        );
        if (dist < VIEW_DRAG_THRESHOLD_PX) return;
        this._panDragCommitted = true;
      }
      this.viewPanX += e.clientX - this._panLastClientX;
      this.viewPanY += e.clientY - this._panLastClientY;
      this._panLastClientX = e.clientX;
      this._panLastClientY = e.clientY;
      this.applyViewTransform();
    });

    this.canvas.addEventListener("pointerup", onPanPointerEnd);
    this.canvas.addEventListener("pointercancel", onPanPointerEnd);

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.setViewZoom(
          zoomFromWheelDelta(
            this.viewZoom,
            e.deltaY,
            VIEW_ZOOM_MIN,
            VIEW_ZOOM_MAX,
            VIEW_ZOOM_WHEEL_SENSITIVITY
          )
        );
      },
      { passive: false }
    );

    // Масштаб клавишами + / = / - (на телефоне — жест)
    window.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + «+» — масштаб страницы в браузере, его не перехватываем
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") {
        this.zoomBy(VIEW_ZOOM_STEP);
      } else if (e.key === "-" || e.key === "_") {
        this.zoomBy(1 / VIEW_ZOOM_STEP);
      }
    });

    window.addEventListener("resize", () => {
      this.applyViewTransform();
    });
  }

  // Цикл кадров крутится, только пока игра идёт: на паузе и на экранах итога кадры не запрашиваются.
  // Перезапускают его снятие паузы, новый уровень и клик по полю (requestFrame).
  gameLoop(currentTime: number): void {
    this.frameRequested = false;
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Only update if not paused
    if (!this.isPaused) {
      this.update(deltaTime);
    }

    this.draw();
    // Мир стоит (все поезда на закрытых семафорах) — кадры одинаковые, перезапустит клик по семафору
    this.looping = !this.isPaused && this.world.status === 'running' && !isWorldIdle(this.world);
    if (this.looping) {
      this.requestFrame();
    }
  }

  requestFrame(): void {
    if (this.frameRequested) return;
    if (!this.looping) {
      // Цикл стоял: время простоя не должно попасть в deltaTime следующего кадра
      this.lastTime = performance.now();
    }
    this.frameRequested = true;
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  // Реальное время копится и расходуется фиксированными тиками симуляции.
  // Не больше MAX_TICKS_PER_FRAME за кадр: после долгой паузы (вкладка в фоне) игра не «догоняет» рывком.
  update(deltaTime: number): void {
    const previousStatus = this.world.status;
    this.timeAccumulator = Math.min(this.timeAccumulator + deltaTime, MAX_TICKS_PER_FRAME * TICK_SECONDS);
    // Допуск: 1000/60 мс в секундах не всегда точно складывается в 1/60
    while (this.timeAccumulator >= TICK_SECONDS - 1e-9 && this.world.status === 'running') {
      stepWorld(this.world);
      this.timeAccumulator -= TICK_SECONDS;
    }
    if (this.world.status === previousStatus) {
      return;
    }
    if (this.world.status === 'crashed') {
      this.gameOverScreen.style.display = "block";
    } else if (this.world.status === 'won') {
      if (this.currentLevelIndex < this.levels.length - 1) {
        // More levels available. Прогресс сохраняем сразу: перезагрузка страницы не отнимет пройденный уровень (§2.3.5)
        Storage.set(STORAGE_KEYS.CURRENT_LEVEL, this.currentLevelIndex + 1);
        this.levelCompleteScreen.style.display = "block";
      } else {
        // All levels completed
        this.gameWinScreen.style.display = "block";
      }
    }
  }

  draw(): void {
    this.renderer.draw(this.ctx, this.world, this.backgroundCanvas);
  }
}
