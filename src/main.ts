import { Game } from './ui/game';
import { loadTrainImages } from './render/graphics';

// Start the game when the page loads
window.addEventListener("load", () => {
  const welcomeScreen = document.getElementById("welcome-screen");
  const gameContainer = document.getElementById("game-container");
  const startGameBtn = document.getElementById("start-game-btn");
  if (!welcomeScreen || !gameContainer || !startGameBtn) {
    throw new Error("Game page markup is incomplete");
  }

  // Handle PLAY button click
  startGameBtn.addEventListener("click", async () => {
    // Load train images first. Если картинки не загрузились, игра всё равно стартует: поезд рисуется прямоугольниками
    try {
      await loadTrainImages();
    } catch (error) {
      console.error(error);
    }

    // Hide welcome screen
    welcomeScreen.style.display = "none";
    // Show game container
    gameContainer.style.display = "flex";
    // Start the game
    new Game();
  });
});

// Mobile warning close functionality
document.addEventListener('DOMContentLoaded', function() {
  const mobileWarning = document.getElementById('mobile-warning');
  const closeWarningBtn = document.getElementById('close-warning');
  closeWarningBtn?.addEventListener('click', function() {
    if (mobileWarning) {
      mobileWarning.style.display = 'none';
    }
  });
});
