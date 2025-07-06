class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.gameOverScreen = document.getElementById("gameOver");
    this.levelCompleteScreen = document.getElementById("levelComplete");
    this.gameWinScreen = document.getElementById("gameWin");
    this.levelDisplay = document.getElementById("level-display");
    this.playAgainButton = document.getElementById("playAgain");
    this.nextLevelButton = document.getElementById("nextLevel");
    this.playAgainWinButton = document.getElementById("playAgainWin");
    this.startOverButton = document.getElementById("startOver");
    this.levelDisplay = document.getElementById("level-display");

    this.currentLevelIndex = this.loadCurrentLevel(); // Load saved level or start from 0
    this.lastTime = performance.now();
    this.isPaused = false; // Add pause state
    this.setupCanvas();
    this.initGame();
    this.setupEventListeners();
    this.gameLoop(performance.now());
  }

  loadCurrentLevel() {
    const savedLevel = Storage.get(STORAGE_KEYS.CURRENT_LEVEL);
    if (savedLevel !== null) {
      const levelIndex = parseInt(savedLevel, 10);
      // Убедимся, что сохраненный уровень существует в массиве levels
      if (levelIndex >= 0 && levelIndex < levels.length) {
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

  setupCanvas() {
    this.canvas.width = GRID_WIDTH * CELL_SIZE;
    this.canvas.height = GRID_HEIGHT * CELL_SIZE;
  }

  updateLevelDisplay() {
    this.levelDisplay.textContent = `Level #${this.currentLevelIndex + 1}`;
  }

  initGame(resetToFirstLevel = false) {
    // If resetToFirstLevel is true, reset to first level
    if (resetToFirstLevel) {
      this.currentLevelIndex = 0;
      this.clearSavedLevel();
    }
    
    // Load level data (use current level)
    const currentLevel = levels[this.currentLevelIndex];
    
    // Initialize game grid from level data
    this.grid = currentLevel.grid.map(row => [...row]); // Deep copy the grid
    
    // Initialize switch states
    this.switchStates = {};
    
    // Scan grid for switches and set default states
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const cell = this.grid[y][x];
        if (isSwitchCell(cell)) {
          this.switchStates[`${x},${y}`] = { 
            isStraight: true // Default state
          };
        }
      }
    }
    
    // Initialize semaphore states from level data
    this.semaphoreStates = {};
    
    // Initialize semaphores from level data
    if (currentLevel.semaphores) {
      for (const semaphore of currentLevel.semaphores) {
        this.semaphoreStates[`${semaphore.x},${semaphore.y}`] = { 
          isOpen: semaphore.isOpen
        };
      }
    }
    
    // Create train parts from level data
    this.trains = [];
    for (let trainIndex = 0; trainIndex < currentLevel.trains.length; trainIndex++) {
      this.trains[trainIndex] = [];
      for(let trainPartIndex = 0; trainPartIndex < currentLevel.trains[trainIndex].length; trainPartIndex++) {
        const trainData = currentLevel.trains[trainIndex][trainPartIndex];
        const direction = trainData.direction;
        
        const trainPart = {
          type: trainData.type,
          x: trainData.x,
          y: trainData.y,
          direction: direction,
          speed: 0,
          pixelX: (trainData.x + 0.5) * CELL_SIZE,
          pixelY: (trainData.y + 0.5) * CELL_SIZE,
        };
        
        // Add locomotive state if it's a locomotive
        if (trainData.type === 'locomotive') {
          trainPart.state = LOCOMOTIVE_STATES.ACCELERATING;
        } else {
          trainPart.wagonType = trainData.wagonType;
        }
        
        this.trains[trainIndex].push(trainPart);
      }
    }
    
    // Создаем фон
    this.backgroundCanvas = generateBackground(this.canvas, this.grid);
    
    // Обновляем отображение уровня
    this.updateLevelDisplay();
  }


  // Toggle switch state when clicked/tapped
  toggleSwitch(x, y) {
    const key = `${x},${y}`;
    if (this.switchStates[key]) {
      // Check if train is on the switch
      if (this.isTrainOnSwitch(x, y)) return;
      
      // Toggle state
      this.switchStates[key].isStraight = !this.switchStates[key].isStraight;
    }
  }

  // Toggle semaphore state when clicked/tapped
  toggleSemaphore(x, y) {
    const key = `${x},${y}`;
    if (this.semaphoreStates[key]) {
      // Toggle state (semaphores can be toggled even if train is on them)
      this.semaphoreStates[key].isOpen = !this.semaphoreStates[key].isOpen;
    }
  }

  // Check if any train part is on the given cell
  isTrainOnSwitch(x, y) {
    return this.trains.some(trainParts => trainParts.some(part => part.x === x && part.y === y));
  }

  // Check if there is a semaphore at given coordinates
  isSemaphoreAtPosition(x, y) {
    const currentLevel = levels[this.currentLevelIndex];
    return currentLevel.semaphores && 
           currentLevel.semaphores.some(semaphore => semaphore.x === x && semaphore.y === y);
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
    
    this.levelDisplay.addEventListener("click", () => {
      if (this.isPaused) {
        this.isPaused = false;
        this.lastTime = performance.now();
      } else {
        this.isPaused = true;
      }
    });

    this.playAgainWinButton.addEventListener("click", () => {
      // Hide game win screen
      this.gameWinScreen.style.display = "none";
      this.currentLevelIndex = 0; // Reset to first level
      this.clearSavedLevel(); // Clear saved progress
      this.initGame();
    });
    
    // Add focus/blur event listeners for pause functionality
    window.addEventListener("blur", () => {
      this.isPaused = true;
    });
    
    window.addEventListener("focus", () => {
      this.isPaused = false;
      // Reset lastTime to prevent large deltaTime when resuming
      this.lastTime = performance.now();
    });
    
    // Handle visibility change (for mobile browsers)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.isPaused = true;
      } else {
        this.isPaused = false;
        // Reset lastTime to prevent large deltaTime when resuming
        this.lastTime = performance.now();
      }
    });
    
    // Handle both clicks and taps for switch toggling
    const handleSwitchInteraction = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      
      // Get coordinates (handle both mouse and touch)
      let clientX, clientY;
      if (e.type === 'touchend') {
        // Prevent mouse events from also firing
        e.preventDefault();
        // Use the last touch position
        const touch = e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // Calculate relative coordinates within the canvas element
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;
      
      // Convert from displayed canvas coordinates to actual canvas coordinates
      // rect.width/height give us the displayed size, this.canvas.width/height give us actual size
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      const actualX = relativeX * scaleX;
      const actualY = relativeY * scaleY;
      
      const x = Math.floor(actualX / CELL_SIZE);
      const y = Math.floor(actualY / CELL_SIZE);
      
      // Check if valid grid position
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const cellType = this.grid[y][x];
        if (isSwitchCell(cellType)) {
          this.toggleSwitch(x, y);
        } else if (this.isSemaphoreAtPosition(x, y)) {
          this.toggleSemaphore(x, y);
        }
      }
    };
    
    // Mouse click
    this.canvas.addEventListener("click", handleSwitchInteraction);
    
    // Touch events for mobile
    this.canvas.addEventListener("touchend", handleSwitchInteraction);
    
    // Prevent scrolling/zooming when touching the canvas on mobile
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Only update if not paused
    if (!this.isPaused) {
      this.update(deltaTime);
    }
    
    this.draw();
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    if (this.trains.some(train => train[0].state === LOCOMOTIVE_STATES.CRASHED)) {
      return;
    }

    for (let trainIndex = 0; trainIndex < this.trains.length; trainIndex++) {
      const locomotive = this.trains[trainIndex][0];

      // Check if locomotive is on a semaphore
      if (this.isSemaphoreAtPosition(locomotive.x, locomotive.y)) {
        const semaphoreKey = `${locomotive.x},${locomotive.y}`;
        const semaphoreState = this.semaphoreStates[semaphoreKey];

        if (semaphoreState) {
          if (!semaphoreState.isOpen) {
            if (locomotive.speed > 0) {
              locomotive.state = LOCOMOTIVE_STATES.DECELERATING;
            } else {
              locomotive.state = LOCOMOTIVE_STATES.STOPPED;
            }
          } else {
            locomotive.state = LOCOMOTIVE_STATES.ACCELERATING;
          }
        }
      }

      switch (locomotive.state) {
        case LOCOMOTIVE_STATES.ACCELERATING:
          if (locomotive.speed < TRAIN_MAX_SPEED) {
            locomotive.speed = Math.min(
              TRAIN_MAX_SPEED,
              locomotive.speed + TRAIN_ACCELERATION * deltaTime
            );
          }
          break;
        case LOCOMOTIVE_STATES.DECELERATING:
          if (locomotive.speed > 0) {
            locomotive.speed = Math.max(
              0,
              locomotive.speed - TRAIN_DECELERATION * deltaTime
            );
          }
          break;
        case LOCOMOTIVE_STATES.STOPPED:
          locomotive.speed = 0;
          break;
        case LOCOMOTIVE_STATES.IDLE:
          break;
        default:
          break;
      }

      // Process all train parts in a single loop
      for (let i = 0; i < this.trains[trainIndex].length; i++) {
        const trainPart = this.trains[trainIndex][i];

        // For wagons, use locomotive's speed
        if (i > 0) {
          trainPart.speed = locomotive.speed;
        }

        // Get current cell type
        const currentCellType = this.grid[trainPart.y][trainPart.x];

        // Calculate next position using the shared function
        const nextPosition = calculateNextPosition(
          currentCellType,
          trainPart.x,
          trainPart.y,
          trainPart.pixelX,
          trainPart.pixelY,
          trainPart.direction,
          trainPart.speed,
          deltaTime,
          this.getSwitchState(trainPart.x, trainPart.y),
        );

        const nextPixelX = nextPosition.x;
        const nextPixelY = nextPosition.y;
        trainPart.direction = nextPosition.direction;

        // Convert pixel position to grid position (using center points)
        const nextGridX = Math.floor(nextPixelX / CELL_SIZE);
        const nextGridY = Math.floor(nextPixelY / CELL_SIZE);

        // Check if train part moved to a new cell
        if (nextGridX !== trainPart.x || nextGridY !== trainPart.y) {
          // Check if the new cell is valid
          if (this.isValidMove(nextGridX, nextGridY)) {
            // Update grid position first
            trainPart.x = nextGridX;
            trainPart.y = nextGridY;

            // Check if locomotive reached the target point (station)
            if (i === 0) {
              // Only check for locomotive (first train part)
              const currentLevel = levels[this.currentLevelIndex];
              const targetPoint = currentLevel.targetPoint;

              if (
                trainPart.x === targetPoint.x &&
                trainPart.y === targetPoint.y
              ) {
                // Level completed!
                if (this.currentLevelIndex < levels.length - 1) {
                  // More levels available
                  this.levelCompleteScreen.style.display = "block";
                } else {
                  // All levels completed
                  this.gameWinScreen.style.display = "block";
                }
                locomotive.state = LOCOMOTIVE_STATES.CRASHED;
                return;
              }
            }
          } else {
            this.crashTrain(trainIndex);
            return;
          }
        }

        // Update train part pixel position
        trainPart.pixelX = nextPixelX;
        trainPart.pixelY = nextPixelY;
      }

      // Check for collisions between train parts
      if (this.checkCollisions()) {
        this.crashTrain(trainIndex);
        return;
      }
    }
  }

  isValidMove(x, y) {
    // Check if position is within grid
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return false;
    }

    // Check if there are rails at the position
    const cellType = this.grid[y][x];
    return cellType !== CELL_TYPES.EMPTY;
  }

  getSwitchState(x, y) {
    return this.switchStates[`${x},${y}`]?.isStraight;
  }

  checkCollisions() {
    const collisionDistance = CELL_SIZE / 2;

    const trainParts = this.trains.flat();
    
    // Check all pairs of train parts
    for (let i = 0; i < trainParts.length; i++) {
      for (let j = i + 1; j < trainParts.length; j++) {
        const part1 = trainParts[i];
        const part2 = trainParts[j];
        
        // Calculate distance between the two train parts
        const dx = part1.pixelX - part2.pixelX;
        const dy = part1.pixelY - part2.pixelY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if parts are too close (collision)
        if (distance < collisionDistance) {
          return true;
        }
      }
    }
    
    return false;
  }

  crashTrain(trainIndex) {
    this.trains[trainIndex][0].state = LOCOMOTIVE_STATES.CRASHED;
    this.gameOverScreen.style.display = "block";
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    this.ctx.drawImage(this.backgroundCanvas, 0, 0);

    // Get current level target point
    const currentLevel = levels[this.currentLevelIndex];
    const targetPoint = currentLevel.targetPoint;

    // Draw grid (rails only)
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cellType = this.grid[y][x];
        
        // Check if this is the station cell
        if (x === targetPoint.x && y === targetPoint.y) {
          drawStationCell(this.ctx, x, y, cellType);
        } else if (isSwitchCell(cellType)) {
          drawSwitchCell(this.ctx, x, y, cellType, this.getSwitchState(x, y));
        } else if (this.isSemaphoreAtPosition(x, y)) {
          const semaphoreState = this.semaphoreStates[`${x},${y}`];
          drawSemaphoreCell(this.ctx, x, y, cellType, semaphoreState?.isOpen);
        } else {
          drawCell(this.ctx, x, y, cellType);
        }
      }
    }

    // Draw train and all wagons
    this.trains.forEach(train => {
      train.forEach(part => {
        drawTrainPart(this.ctx, part);
      });
    });
  }
}

// Start the game when the page loads
window.addEventListener("load", () => {
  // Game instance will be created when PLAY button is clicked
  let gameInstance = null;
  
  const welcomeScreen = document.getElementById("welcome-screen");
  const gameContainer = document.getElementById("game-container");
  const startGameBtn = document.getElementById("start-game-btn");
  
  // Handle PLAY button click
  startGameBtn.addEventListener("click", async () => {
    // Load train images first
    await loadTrainImages();
    
    // Hide welcome screen
    welcomeScreen.style.display = "none";
    // Show game container
    gameContainer.style.display = "flex";
    // Start the game
    gameInstance = new Game();
  });
});
