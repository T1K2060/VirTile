/**
 * Gameplay Engine
 * Handles the main gameplay logic, note spawning, timing, and scoring
 */

import { JudgmentEngine } from './JudgmentEngine.js';
import { PPSystem } from './PPSystem.js';

export class GameplayEngine {
  constructor(sceneManager, audioManager, inputManager, settings) {
    this.scene = sceneManager;
    this.audio = audioManager;
    this.input = inputManager;
    this.settings = settings;
    
    this.judgment = new JudgmentEngine();
    this.ppSystem = new PPSystem();
    
    // UI Element references
    this.uiElements = {};
    
    // Loading screen state
    this.loadingState = {
      isLoading: false,
      fpsCheck: [],
      minFPS: 30,
      isStable: false
    };
    
    // Callbacks
    this.onJudgment = null;
    this.onScoreUpdate = null;
    this.onGameStart = null;
    this.onGameEnd = null;
    
    // Game state
    this.isPlaying = false;
    this.isPaused = false;
    this.currentChart = null;
    this.notes = [];
    this.activeNotes = [];
    
    // Timing
    this.songTime = 0;
    this.startTime = 0;
    this.pauseTime = 0;
    this.audioOffset = 0;
    
    // Scoring
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.accuracy = 100;
    this.judgmentCounts = {
      perfectPlus: 0,
      perfect: 0,
      great: 0,
      good: 0,
      ok: 0,
      bad: 0,
      miss: 0
    };
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.maxPossibleScore = 0;
    
    // Health
    this.health = 100;
    this.maxHealth = 100;
    
    // Held keys tracking (prevent multi-hit with held key)
    this.heldKeys = new Set();
    this.laneLastHitTime = {}; // Track when each lane was last hit
    this.keyHoldDelay = 100; // ms before same key can hit another note
    
    // Hold notes tracking
    this.activeHoldNotes = new Map(); // lane -> hold note
    
    // Input bindings
    this.setupInput();
  }

  setupInput() {
    // Setup key bindings based on settings
    this.keyBindings = this.settings.get('keyBindings') || {
      lane1: 'KeyD',
      lane2: 'KeyF',
      lane3: 'KeyJ',
      lane4: 'KeyK',
      lane5: 'KeySpace',
      lane6: 'ArrowLeft',
      lane7: 'ArrowDown'
    };
    
    // Map keys to lanes
    this.keyToLane = {};
    for (let i = 1; i <= 7; i++) {
      this.keyToLane[this.keyBindings[`lane${i}`]] = i - 1; // 0-indexed lanes
    }
    
    // Input callbacks
    this.input.onKeyDown = (key) => this.handleKeyDown(key);
    this.input.onKeyUp = (key) => this.handleKeyUp(key);
    this.input.onTouchStart = (id, lane, x, y) => this.handleTouchStart(lane);
    this.input.onTouchEnd = (id) => this.handleTouchEnd(id);
  }

  async start(levelData, difficulty = 'Hard') {
    console.log('Starting gameplay with level:', levelData.name, 'Difficulty:', difficulty);
    
    // Reset state
    this.resetState();
    
    // Load chart
    this.currentChart = levelData.charts[difficulty];
    if (!this.currentChart) {
      throw new Error(`Difficulty ${difficulty} not found for level ${levelData.name}`);
    }
    
    // Setup UI elements
    this.setupUIElements();
    
    // Show loading screen and align
    await this.showLoadingScreen(levelData.audio);
    
    // Prepare notes
    this.prepareNotes();
    this.calculateMaxScore();
    
    // Setup PP system callbacks
    this.ppSystem.setCallbacks(
      (bar) => this.updatePPBar(bar),
      (number) => this.updatePPNumber(number)
    );
    
    // Setup lane zones for touch input
    this.input.setupLaneZones(
      this.currentChart.laneCount,
      window.innerWidth,
      window.innerHeight
    );
    
    // Start countdown
    await this.showCountdown();
    
    // Start the song
    this.isPlaying = true;
    this.startTime = performance.now();
    this.audioOffset = this.settings.get('audioOffset') || 0;
    
    this.audio.play();
    
    if (this.onGameStart) this.onGameStart();
    
    console.log('Gameplay started');
  }

  setupUIElements() {
    this.uiElements = {
      score: document.getElementById('score-display'),
      accuracy: document.getElementById('accuracy-display'),
      combo: document.getElementById('combo-count'),
      ppNumber: document.getElementById('pp-number'),
      ppBar: document.getElementById('pp-bar'),
      healthFill: document.getElementById('health-fill'),
      judgmentDisplay: document.getElementById('judgment-display'),
      judgmentText: document.getElementById('judgment-text'),
      judgmentMs: document.getElementById('judgment-ms'),
      loadingOverlay: document.getElementById('game-loading-overlay'),
      loadingStatus: document.querySelector('.loading-status'),
      loadingFps: document.getElementById('loading-fps'),
      loadingProgress: document.querySelector('.loading-progress-fill'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownNumber: document.querySelector('.countdown-number')
    };
  }

  async showLoadingScreen(audioUrl) {
    return new Promise(async (resolve) => {
      const overlay = this.uiElements.loadingOverlay;
      const status = this.uiElements.loadingStatus;
      const fpsDisplay = this.uiElements.loadingFps;
      const progress = this.uiElements.loadingProgress;
      
      if (overlay) overlay.classList.remove('hidden');
      
      // Step 1: Load audio
      if (status) status.textContent = 'Aligning Audio...';
      if (progress) progress.style.width = '33%';
      await this.audio.loadMusic(audioUrl);
      
      // Step 2: FPS stability check (monitor for ~1 second, ensure >30 FPS)
      if (status) status.textContent = 'Stabilizing Performance...';
      if (progress) progress.style.width = '66%';
      
      let frameCount = 0;
      let lastTime = performance.now();
      const fpsSamples = [];
      
      const checkFPS = () => {
        const now = performance.now();
        const delta = now - lastTime;
        frameCount++;
        
        if (delta >= 100) { // Check every 100ms
          const fps = frameCount * (1000 / delta);
          fpsSamples.push(fps);
          
          if (fpsDisplay) fpsDisplay.textContent = Math.round(fps);
          
          frameCount = 0;
          lastTime = now;
        }
        
        if (fpsSamples.length < 10) { // Check for 1 second
          requestAnimationFrame(checkFPS);
        } else {
          // Check if stable (>30 FPS average)
          const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
          this.loadingState.isStable = avgFPS >= this.loadingState.minFPS;
          
          // Step 3: Ready
          if (status) status.textContent = 'Ready!';
          if (progress) progress.style.width = '100%';
          
          setTimeout(() => {
            if (overlay) overlay.classList.add('hidden');
            resolve();
          }, 300);
        }
      };
      
      requestAnimationFrame(checkFPS);
    });
  }

  async showCountdown() {
    return new Promise((resolve) => {
      const overlay = this.uiElements.countdownOverlay;
      const number = this.uiElements.countdownNumber;
      
      if (!overlay || !number) {
        resolve();
        return;
      }
      
      overlay.classList.remove('hidden');
      let count = 3;
      
      const showNumber = () => {
        number.textContent = count;
        number.style.animation = 'none';
        void number.offsetWidth; // Trigger reflow
        number.style.animation = 'countdownPulse 1s ease-out';
        
        count--;
        
        if (count >= 0) {
          setTimeout(showNumber, 1000);
        } else {
          overlay.classList.add('hidden');
          resolve();
        }
      };
      
      showNumber();
    });
  }

  resetState() {
    this.isPlaying = false;
    this.isPaused = false;
    this.songTime = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.accuracy = 100;
    this.judgmentCounts = {
      perfectPlus: 0,
      perfect: 0,
      great: 0,
      good: 0,
      ok: 0,
      bad: 0,
      miss: 0
    };
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.health = 100;
    this.notes = [];
    this.activeNotes = [];
    
    // Reset PP system
    if (this.ppSystem) this.ppSystem.reset();
    
    // Clear scene notes
    if (this.scene) this.scene.clearNotes();
  }

  calculateMaxScore() {
    // Calculate maximum possible score (all Perfect+)
    this.maxPossibleScore = this.totalNotes * 400;
  }

  updatePPBar(barValue) {
    const bar = this.uiElements.ppBar;
    if (bar) {
      bar.style.width = `${barValue * 100}%`;
    }
  }

  updatePPNumber(ppValue) {
    const number = this.uiElements.ppNumber;
    if (number) {
      number.textContent = Math.round(ppValue);
    }
  }

  prepareNotes() {
    if (!this.currentChart) return;
    
    this.notes = this.currentChart.notes.map((noteData, index) => ({
      id: index,
      time: noteData.time / 1000, // Convert ms to seconds if needed
      lane: noteData.lane,
      type: noteData.type,
      endTime: noteData.endTime ? noteData.endTime / 1000 : null,
      hit: false,
      missed: false,
      spawned: false,
      object3D: null
    }));
    
    this.totalNotes = this.notes.length;
    
    console.log(`Prepared ${this.totalNotes} notes`);
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    this.pauseTime = performance.now();
    this.audio.pause();
  }

  resume() {
    if (!this.isPlaying || !this.isPaused) return;
    
    // Adjust start time to account for pause duration
    const pauseDuration = performance.now() - this.pauseTime;
    this.startTime += pauseDuration;
    
    this.isPaused = false;
    this.audio.resume();
  }

  stop() {
    this.isPlaying = false;
    this.audio.stop();
    this.scene.clearNotes();
  }

  update(deltaTime) {
    if (!this.isPlaying || this.isPaused) return;
    
    // Update song time
    this.songTime = this.audio.getCurrentTime();
    
    // Spawn notes
    this.spawnNotes();
    
    // Update note positions
    this.updateNotes();
    
    // Check for missed notes
    this.checkMissedNotes();
    
    // Check song end
    if (this.audio.ended) {
      this.endGame();
    }
    
    // Update UI
    this.updateUI();
  }

  spawnNotes() {
    const spawnWindow = 3.0; // Spawn notes 3 seconds before they need to be hit
    const scrollSpeed = this.settings.get('scrollSpeed') || 5;
    
    for (const note of this.notes) {
      if (note.spawned || note.hit || note.missed) continue;
      
      // Calculate when note should be visible
      const approachTime = 2.0 / (scrollSpeed / 5); // Base approach time adjusted by scroll speed
      
      if (this.songTime >= note.time - approachTime) {
        note.spawned = true;
        note.object3D = this.scene.createNote(note.lane, note.time, note.type);
        this.activeNotes.push(note);
      }
    }
  }

  updateNotes() {
    const scrollSpeed = this.settings.get('scrollSpeed') || 5;
    this.scene.updateNotes(this.songTime, scrollSpeed);
  }

  checkMissedNotes() {
    const missWindow = 0.2; // Time after note to consider it missed
    
    for (const note of this.activeNotes) {
      if (note.hit || note.missed) continue;
      
      if (this.songTime > note.time + missWindow) {
        this.registerJudgment('miss', note);
      }
    }
  }

  handleKeyDown(key) {
    if (!this.isPlaying || this.isPaused) return;
    
    const lane = this.keyToLane[key];
    if (lane === undefined) return;
    
    // Track held key
    this.heldKeys.add(key);
    
    // Check if key was just used to hit a note (prevent multi-hit)
    const now = performance.now();
    const lastHit = this.laneLastHitTime[lane] || 0;
    if (now - lastHit < this.keyHoldDelay) {
      return; // Too soon after last hit
    }
    
    this.attemptHit(lane);
  }

  handleKeyUp(key) {
    const lane = this.keyToLane[key];
    if (lane === undefined) return;
    
    // Remove from held keys
    this.heldKeys.delete(key);
    
    // Check for hold note release
    const holdNote = this.activeHoldNotes.get(lane);
    if (holdNote && holdNote.holding) {
      const timeDiff = (this.songTime - holdNote.endTime) * 1000;
      const judgment = this.judgment.judge(timeDiff);
      this.registerHoldEndJudgment(judgment, holdNote);
      holdNote.holding = false;
      this.activeHoldNotes.delete(lane);
      
      // Update lane visual
      this.setLaneHeld(lane, false);
    }
  }

  handleTouchStart(lane) {
    if (!this.isPlaying || this.isPaused) return;
    if (lane === undefined || lane === null) return;
    
    this.attemptHit(lane);
  }

  handleTouchEnd(id) {
    // Similar to key up - handle hold note releases
  }

  attemptHit(lane) {
    // Find notes in this lane that can be hit (prioritize notes in front)
    const hittableNotes = [];
    const maxWindow = this.judgment.windows.miss / 1000; // Convert ms to seconds
    
    for (const note of this.activeNotes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      
      const timeDiff = note.time - this.songTime; // Positive = in future
      
      // Note is hittable if it's within the hit window (before or after target time)
      if (Math.abs(timeDiff) <= maxWindow) {
        hittableNotes.push({ note, timeDiff });
      }
    }
    
    if (hittableNotes.length === 0) return;
    
    // Sort by time - prioritize notes closest to current time (in front)
    // For notes before target time (negative diff), closer to 0 = more urgent
    // For notes after target time (positive diff), closer to 0 = more urgent
    hittableNotes.sort((a, b) => Math.abs(a.timeDiff) - Math.abs(b.timeDiff));
    
    // Hit the closest note
    const target = hittableNotes[0].note;
    const timeDiffMs = hittableNotes[0].timeDiff * 1000;
    
    const judgment = this.judgment.judge(timeDiffMs);
    
    // Track lane hit time for key hold prevention
    this.laneLastHitTime[lane] = performance.now();
    
    // For hold notes, set up hold tracking
    if (target.type === 'hold' && judgment.type !== 'miss') {
      target.holding = true;
      this.activeHoldNotes.set(lane, target);
      this.setLaneHeld(lane, true);
      
      // For hold notes, we don't immediately remove - wait for release
      this.registerHoldStartJudgment(judgment, target);
    } else {
      this.registerJudgment(judgment, target);
    }
  }

  setLaneHeld(lane, isHeld) {
    // Update visual for lane (lane_held.png vs lane.png)
    const hitbox = document.querySelector(`.hitbox[data-lane="${lane}"]`);
    if (hitbox) {
      hitbox.classList.toggle('held', isHeld);
    }
  }

  registerHoldStartJudgment(judgmentResult, note) {
    // Initial hit judgment for hold note
    const judgmentType = judgmentResult.type;
    
    note.hit = true;
    this.combo++;
    this.hitNotes++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.judgmentCounts[judgmentType]++;
    
    // Health recovery for initial hit
    this.health = Math.min(this.maxHealth, this.health + judgmentResult.healthChange);
    
    // Partial score for initial hit (half the points)
    const comboMultiplier = 1 + (this.combo / 100);
    this.score += Math.floor((judgmentResult.points / 2) * comboMultiplier);
    
    // Show judgment
    this.showJudgmentText(judgmentResult);
    
    // Create hit effect
    if (this.scene) {
      this.scene.createHitEffect(note.lane, judgmentType);
    }
    
    // Play hitsound
    if (this.audio) {
      this.audio.playHitsound(judgmentType);
    }
  }

  registerHoldEndJudgment(judgmentResult, note) {
    // Release judgment for hold note
    const judgmentType = judgmentResult.type;
    
    // Count the release judgment separately (but don't double count accuracy)
    this.judgmentCounts[judgmentType]++;
    
    // Health change for release
    this.health = Math.max(0, Math.min(this.maxHealth, 
      this.health + judgmentResult.healthChange));
    
    // Score for release (other half of points)
    const comboMultiplier = 1 + (this.combo / 100);
    this.score += Math.floor((judgmentResult.points / 2) * comboMultiplier);
    
    // Process PP for release
    this.ppSystem.processJudgment(judgmentType);
    
    // Remove hold note from scene
    if (note.object3D && this.scene) {
      this.scene.removeNote(note.object3D);
      note.object3D = null;
    }
    
    // Show judgment for release
    const releaseJudgment = {
      ...judgmentResult,
      name: judgmentResult.name + ' (Release)'
    };
    this.showJudgmentText(releaseJudgment);
    
    // Update UI
    this.updateUI();
  }

  registerJudgment(judgmentResult, note) {
    const judgmentType = judgmentResult.type;
    const isMiss = judgmentType === 'miss';
    
    if (isMiss) {
      note.missed = true;
      this.combo = 0;
      this.judgmentCounts.miss++;
    } else {
      note.hit = true;
      this.combo++;
      this.hitNotes++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.judgmentCounts[judgmentType]++;
    }
    
    // Update health
    this.health = Math.max(0, Math.min(this.maxHealth, 
      this.health + judgmentResult.healthChange));
    
    // Add score
    const comboMultiplier = 1 + (this.combo / 100);
    this.score += Math.floor(judgmentResult.points * comboMultiplier);
    
    // Process PP
    const ppResult = this.ppSystem.processJudgment(judgmentType);
    
    // Show judgment
    this.showJudgmentText(judgmentResult);
    
    // Create hit effect
    if (this.scene && !isMiss) {
      this.scene.createHitEffect(note.lane, judgmentType);
    }
    
    // Play hitsound
    if (this.audio && !isMiss) {
      this.audio.playHitsound(judgmentType);
    }
    
    // Remove note from scene
    if (note.object3D && this.scene) {
      this.scene.removeNote(note.object3D);
      note.object3D = null;
    }
    
    // Update accuracy
    this.accuracy = this.calculateAccuracy();
    
    // Update UI
    this.updateUI();
    
    // Callback
    if (this.onJudgment) {
      this.onJudgment(judgmentResult);
    }
  }

  showJudgmentText(judgmentResult) {
    const display = this.uiElements.judgmentDisplay;
    const text = this.uiElements.judgmentText;
    const ms = this.uiElements.judgmentMs;
    
    if (!display || !text) return;
    
    // Show the display
    display.classList.remove('hidden');
    
    // Set text and color
    text.textContent = judgmentResult.name;
    text.style.color = judgmentResult.color;
    text.className = `judgment-text judgment-${judgmentResult.type}`;
    
    // Set timing
    if (ms) {
      const timingMs = parseFloat(judgmentResult.timing);
      const sign = timingMs >= 0 ? '+' : '';
      ms.textContent = `${sign}${timingMs}ms`;
    }
    
    // Reset animation
    text.style.animation = 'none';
    void text.offsetWidth; // Trigger reflow
    text.style.animation = 'judgmentPop 0.3s ease-out';
    
    // Hide after delay
    setTimeout(() => {
      if (display) display.classList.add('hidden');
    }, 500);
  }

  updateUI() {
    // Update score
    if (this.uiElements.score) {
      this.uiElements.score.textContent = this.score.toString().padStart(6, '0');
    }
    
    // Update combo
    if (this.uiElements.combo) {
      this.uiElements.combo.textContent = this.combo;
    }
    
    // Update accuracy
    if (this.uiElements.accuracy) {
      this.uiElements.accuracy.textContent = `%${this.accuracy.toFixed(2)}`;
    }
    
    // Update health bar
    if (this.uiElements.healthFill) {
      this.uiElements.healthFill.style.width = `${this.health}%`;
    }
  }

  calculateAccuracy() {
    if (this.totalNotes === 0) return 100;
    
    // Weighted accuracy based on new judgment system
    const weights = {
      perfectPlus: 1.0,
      perfect: 1.0,
      great: 0.95,
      good: 0.9,
      ok: 0.7,
      bad: 0.5,
      miss: 0
    };
    
    let weightedHits = 0;
    let totalWeight = 0;
    
    for (const [judgment, count] of Object.entries(this.judgmentCounts)) {
      weightedHits += count * (weights[judgment] || 0);
      totalWeight += count;
    }
    
    if (totalWeight === 0) return 100;
    return (weightedHits / totalWeight) * 100;
  }

  endGame() {
    this.isPlaying = false;
    
    const accuracy = this.calculateAccuracy();
    const pp = this.ppSystem.ppNumber;
    const rank = this.judgment.calculateRank(accuracy, this.score, pp, this.maxPossibleScore);
    
    const results = {
      score: this.score,
      maxCombo: this.maxCombo,
      accuracy: accuracy,
      rank: rank,
      pp: pp,
      judgments: { ...this.judgmentCounts },
      totalNotes: this.totalNotes,
      perfectPercent: ((this.judgmentCounts.perfectPlus + this.judgmentCounts.perfect) / this.totalNotes * 100).toFixed(1)
    };
    
    // Callback
    if (this.onGameEnd) {
      this.onGameEnd(results);
    }
    
    // Dispatch results event
    window.dispatchEvent(new CustomEvent('gameEnded', { detail: results }));
  }
}
