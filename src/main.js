/**
 * VirTile - 3D Rhythm Game
 * Main Entry Point
 * Supports: PC, Mobile, Tablet, PCVR, Standalone VR
 */

import { PlatformDetector } from './core/PlatformDetector.js';
import { SettingsManager } from './core/SettingsManager.js';
import { BatteryManager } from './core/BatteryManager.js';
import { AudioManager } from './core/AudioManager.js';
import { InputManager } from './core/InputManager.js';
import { SceneManager } from './3d/SceneManager.js';
import { VRManager } from './3d/VRManager.js';
import { LevelLoader } from './game/LevelLoader.js';
import { GameplayEngine } from './game/GameplayEngine.js';
import { MenuManager } from './ui/MenuManager.js';
import { LoadingScreen } from './ui/LoadingScreen.js';

class VirTile {
  constructor() {
    this.initialized = false;
    this.currentState = 'loading';
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 60;
    
    // Core systems
    this.platform = null;
    this.settings = null;
    this.battery = null;
    this.audio = null;
    this.input = null;
    this.scene = null;
    this.vr = null;
    this.levelLoader = null;
    this.gameplay = null;
    this.menu = null;
  }

  async init() {
    console.log('🎵 VirTile - Initializing...');
    
    try {
      // 1. Detect platform first
      this.platform = new PlatformDetector();
      await this.platform.detect();
      console.log(`Platform detected: ${this.platform.type}`);
      
      // 2. Initialize settings
      this.settings = new SettingsManager(this.platform);
      await this.settings.load();
      
      // 3. Initialize battery monitoring
      this.battery = new BatteryManager(this.settings);
      await this.battery.init();
      
      // 4. Initialize audio engine
      this.audio = new AudioManager(this.settings);
      await this.audio.init();
      
      // 5. Initialize input system
      this.input = new InputManager(this.platform);
      await this.input.init();
      
      // 6. Initialize 3D scene
      this.scene = new SceneManager(this.settings);
      await this.scene.init();
      
      // 7. Initialize VR if available
      this.vr = new VRManager(this.scene, this.settings);
      await this.vr.init();
      
      // 8. Initialize level loader
      this.levelLoader = new LevelLoader();
      
      // 9. Initialize gameplay engine
      this.gameplay = new GameplayEngine(this.scene, this.audio, this.input, this.settings);
      
      // 10. Initialize UI
      this.menu = new MenuManager(this);
      await this.menu.init();
      
      // Setup VR button visibility
      this.updateVRButtonVisibility();
      
      // Start main loop
      this.initialized = true;
      this.currentState = 'menu';
      
      // Start game loop
      this.lastFrameTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
      
      // Run loading screen animation, then show home screen
      const loadingScreen = new LoadingScreen();
      await loadingScreen.start();
      
      // Show home screen after loading completes
      this.menu.show('home-screen');
      
      console.log('✅ VirTile initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize VirTile:', error);
      this.showError('Failed to initialize game. Please check console for details.');
    }
  }


  updateVRButtonVisibility() {
    const vrBtn = document.getElementById('vr-button');
    const vrExitBtn = document.getElementById('vr-exit-button');
    
    if (this.vr && this.vr.isSupported) {
      if (this.vr.isPresenting) {
        vrBtn.classList.add('hidden');
        vrExitBtn.classList.remove('hidden');
      } else {
        vrBtn.classList.remove('hidden');
        vrExitBtn.classList.add('hidden');
      }
    } else {
      vrBtn.classList.add('hidden');
      vrExitBtn.classList.add('hidden');
    }
  }

  gameLoop(currentTime) {
    if (!this.initialized) return;
    
    // Calculate delta time
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Update FPS counter
    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      this.fps = Math.round(1 / deltaTime);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    }
    
    // Update battery status
    if (this.battery) this.battery.update();
    
    // Update input
    if (this.input) this.input.update();
    
    // Update VR
    if (this.vr && this.vr.isPresenting) {
      this.vr.update(deltaTime);
    }
    
    // Update gameplay
    if (this.currentState === 'playing' && this.gameplay) {
      this.gameplay.update(deltaTime);
    }
    
    // Render scene
    if (this.scene) {
      this.scene.render();
    }
    
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  async startGame(levelData) {
    console.log('Starting game:', levelData);
    this.currentState = 'playing';
    this.menu.show('game-hud');
    
    if (this.gameplay) {
      await this.gameplay.start(levelData);
    }
  }

  pauseGame() {
    if (this.currentState === 'playing') {
      this.currentState = 'paused';
      this.menu.show('pause-menu');
      if (this.gameplay) this.gameplay.pause();
      if (this.audio) this.audio.pause();
    }
  }

  resumeGame() {
    if (this.currentState === 'paused') {
      this.currentState = 'playing';
      this.menu.show('game-hud');
      if (this.gameplay) this.gameplay.resume();
      if (this.audio) this.audio.resume();
    }
  }

  endGame(results) {
    this.currentState = 'results';
    this.menu.showResults(results);
    if (this.gameplay) this.gameplay.stop();
  }

  quitToMenu() {
    this.currentState = 'menu';
    this.menu.show('home-screen');
    if (this.gameplay) this.gameplay.stop();
    if (this.audio) this.audio.stop();
  }

  async enterVR() {
    if (this.vr && this.vr.isSupported) {
      await this.vr.enterVR();
      this.updateVRButtonVisibility();
      document.body.classList.add('vr-mode');
    }
  }

  async exitVR() {
    if (this.vr) {
      await this.vr.exitVR();
      this.updateVRButtonVisibility();
      document.body.classList.remove('vr-mode');
    }
  }

  showError(message) {
    const loaderText = document.querySelector('.loader-text');
    const loaderSub = document.querySelector('.loader-subtext');
    if (loaderText) loaderText.textContent = 'Error';
    if (loaderSub) {
      loaderSub.textContent = message;
      loaderSub.style.color = '#ff3366';
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.virTile = new VirTile();
    window.virTile.init();
  });
} else {
  window.virTile = new VirTile();
  window.virTile.init();
}

export { VirTile };
