/**
 * Menu Manager
 * Handles all UI interactions, menu navigation, and VR keyboard
 */

import { VirtualKeyboard } from './VirtualKeyboard.js';
import { AudioVisualizer } from './AudioVisualizer.js';

export class MenuManager {
  constructor(game) {
    this.game = game;
    this.currentPanel = null;
    this.virtualKeyboard = null;
    this.visualizer = null;
    
    // Menu panels
    this.panels = {
      'home-screen': document.getElementById('home-screen'),
      'song-select': document.getElementById('song-select'),
      'settings-menu': document.getElementById('settings-menu'),
      'game-hud': document.getElementById('game-hud'),
      'pause-menu': document.getElementById('pause-menu'),
      'results-screen': document.getElementById('results-screen')
    };
    
    // Song list data
    this.songList = [];
    this.recommendedSongs = [];
    this.selectedSong = null;
    this.selectedDifficulty = null;
    this.previewAudio = null;
    this.isPreviewPlaying = false;
    
    // Bind event handlers
    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.handleGameEnded = this.handleGameEnded.bind(this);
    this.handleSettingsChange = this.handleSettingsChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleRecommendedClick = this.handleRecommendedClick.bind(this);
    this.handlePreviewToggle = this.handlePreviewToggle.bind(this);
  }

  async init() {
    // Setup button event listeners
    this.setupButtons();
    
    // Setup keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Listen for game end
    window.addEventListener('gameEnded', this.handleGameEnded);
    
    // Listen for settings changes
    window.addEventListener('settingsChanged', this.handleSettingsChange);
    
    // Initialize virtual keyboard for VR
    this.virtualKeyboard = new VirtualKeyboard();
    this.virtualKeyboard.init();
    
    // Initialize audio visualizer
    this.visualizer = new AudioVisualizer(this.game.audio);
    this.visualizer.init();
    
    // Load recommended songs for home screen
    this.loadRecommendedSongs();
    
    // Setup preview player
    this.setupPreviewPlayer();
    
    console.log('Menu Manager initialized');
  }

  setupPreviewPlayer() {
    const playBtn = document.getElementById('preview-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', this.handlePreviewToggle);
    }
  }

  async loadRecommendedSongs() {
    try {
      // Load song list
      const songs = await this.game.levelLoader.loadLevelList();
      this.songList = songs;
      
      // Filter and sort for recommendations (star rating, ranked, difficulty)
      this.recommendedSongs = songs
        .filter(song => {
          const charts = Object.values(song.charts);
          return charts.some(chart => chart.starRating > 0);
        })
        .sort((a, b) => {
          // Prioritize ranked songs, then by star rating
          const aRanked = Object.values(a.charts).some(c => c.ranked);
          const bRanked = Object.values(b.charts).some(c => c.ranked);
          if (aRanked && !bRanked) return -1;
          if (!aRanked && bRanked) return 1;
          
          // Sort by star rating
          const aStars = Math.max(...Object.values(a.charts).map(c => c.starRating));
          const bStars = Math.max(...Object.values(b.charts).map(c => c.starRating));
          return bStars - aStars;
        })
        .slice(0, 5); // Top 5 recommendations
      
      this.renderRecommendedSongs();
    } catch (error) {
      console.warn('Failed to load recommended songs:', error);
    }
  }

  renderRecommendedSongs() {
    const container = document.getElementById('recommended-songs');
    if (!container) return;
    
    if (this.recommendedSongs.length === 0) {
      container.innerHTML = '<div class="loading-text">No recommendations available</div>';
      return;
    }
    
    container.innerHTML = '';
    
    this.recommendedSongs.forEach((song, index) => {
      const bestChart = this.getBestChart(song);
      const el = document.createElement('div');
      el.className = 'recommended-song' + (index === 0 ? ' active' : '');
      el.dataset.songName = song.name;
      el.innerHTML = `
        <div class="song-title">${song.meta.title}</div>
        <div class="song-artist">${song.meta.artist}</div>
        <div class="song-meta">
          <span class="difficulty">${bestChart.difficulty}</span>
          <span class="stars">★${bestChart.starRating.toFixed(2)}</span>
          ${bestChart.ranked ? '<span class="ranked">R</span>' : ''}
        </div>
      `;
      el.addEventListener('click', () => this.handleRecommendedClick(song, el));
      container.appendChild(el);
    });
    
    // Select first song by default
    if (this.recommendedSongs.length > 0) {
      this.selectSong(this.recommendedSongs[0]);
    }
  }

  getBestChart(song) {
    const charts = Object.values(song.charts);
    // Prioritize ranked, then highest star rating
    return charts.sort((a, b) => {
      if (a.ranked && !b.ranked) return -1;
      if (!a.ranked && b.ranked) return 1;
      return b.starRating - a.starRating;
    })[0] || charts[0];
  }

  handleRecommendedClick(song, element) {
    // Update active state
    document.querySelectorAll('.recommended-song').forEach(el => {
      el.classList.remove('active');
    });
    element.classList.add('active');
    
    this.selectSong(song);
  }

  selectSong(song) {
    this.selectedSong = song;
    
    // Update preview info
    const titleEl = document.getElementById('preview-title');
    if (titleEl) {
      titleEl.textContent = `${song.meta.title} - ${song.meta.artist}`;
    }
    
    // Show preview player
    const previewPlayer = document.getElementById('preview-player');
    if (previewPlayer) {
      previewPlayer.classList.remove('hidden');
    }
    
    // Stop current preview
    this.stopPreview();
    
    // Start visualizer with song BPM
    const bestChart = this.getBestChart(song);
    if (this.visualizer) {
      this.visualizer.setBPM(song.meta.bpm || 128);
      this.visualizer.start(song.meta.bpm || 128);
    }
    
    // Auto-start preview at 20 seconds
    this.startPreview(song);
  }

  async startPreview(song) {
    try {
      // Create new audio element for preview
      this.previewAudio = new Audio(song.audio);
      this.previewAudio.crossOrigin = 'anonymous';
      
      // Seek to 20 seconds
      this.previewAudio.currentTime = song.meta.previewTime || 20;
      
      await this.previewAudio.play();
      this.isPreviewPlaying = true;
      
      // Update play button
      const playBtn = document.getElementById('preview-play-btn');
      if (playBtn) {
        playBtn.textContent = '⏸';
      }
      
      // Handle ended
      this.previewAudio.addEventListener('ended', () => {
        this.stopPreview();
      });
      
    } catch (error) {
      console.warn('Failed to start preview:', error);
    }
  }

  stopPreview() {
    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio = null;
    }
    this.isPreviewPlaying = false;
    
    const playBtn = document.getElementById('preview-play-btn');
    if (playBtn) {
      playBtn.textContent = '▶';
    }
    
    // Stop visualizer
    if (this.visualizer) {
      this.visualizer.stop();
    }
  }

  handlePreviewToggle() {
    if (!this.selectedSong) return;
    
    if (this.isPreviewPlaying) {
      this.stopPreview();
    } else {
      this.startPreview(this.selectedSong);
    }
  }

  setupButtons() {
    // Setup all menu buttons with data-action attributes
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', this.handleButtonClick);
    });
    
    // Setup settings form inputs
    this.setupSettingsInputs();
  }

  setupSettingsInputs() {
    // Platform mode
    const platformMode = document.getElementById('platform-mode');
    if (platformMode) {
      platformMode.addEventListener('change', (e) => {
        this.game.settings.set('platformMode', e.target.value);
      });
    }
    
    // Graphics quality
    const graphicsQuality = document.getElementById('graphics-quality');
    if (graphicsQuality) {
      graphicsQuality.addEventListener('change', (e) => {
        this.game.settings.set('graphicsQuality', e.target.value);
      });
    }
    
    // Energy save
    const energySave = document.getElementById('energy-save');
    if (energySave) {
      energySave.addEventListener('change', (e) => {
        this.game.settings.set('energySaveEnabled', e.target.checked);
      });
    }
    
    // Battery threshold
    const batteryThreshold = document.getElementById('battery-threshold');
    if (batteryThreshold) {
      batteryThreshold.addEventListener('change', (e) => {
        this.game.settings.set('batteryThreshold', parseInt(e.target.value));
      });
    }
    
    // VR mode
    const vrMode = document.getElementById('vr-mode');
    if (vrMode) {
      vrMode.addEventListener('change', (e) => {
        this.game.settings.set('vrMode', e.target.value);
        this.updateVRSettingsVisibility();
      });
    }
    
    // VR screen settings
    const vrScreenSize = document.getElementById('vr-screen-size');
    if (vrScreenSize) {
      vrScreenSize.addEventListener('input', (e) => {
        this.game.settings.set('vrScreenSize', parseFloat(e.target.value));
      });
    }
    
    const vrScreenDistance = document.getElementById('vr-screen-distance');
    if (vrScreenDistance) {
      vrScreenDistance.addEventListener('input', (e) => {
        this.game.settings.set('vrScreenDistance', parseFloat(e.target.value));
      });
    }
    
    const vrScreenCurve = document.getElementById('vr-screen-curve');
    if (vrScreenCurve) {
      vrScreenCurve.addEventListener('input', (e) => {
        this.game.settings.set('vrScreenCurve', parseFloat(e.target.value));
      });
    }
    
    // Audio settings
    const masterVolume = document.getElementById('master-volume');
    if (masterVolume) {
      masterVolume.addEventListener('input', (e) => {
        this.game.settings.set('masterVolume', parseInt(e.target.value));
        if (this.game.audio) this.game.audio.updateVolumes();
      });
    }
    
    const hitsoundVolume = document.getElementById('hitsound-volume');
    if (hitsoundVolume) {
      hitsoundVolume.addEventListener('input', (e) => {
        this.game.settings.set('hitsoundVolume', parseInt(e.target.value));
      });
    }
    
    const audioOffset = document.getElementById('audio-offset');
    if (audioOffset) {
      audioOffset.addEventListener('change', (e) => {
        this.game.settings.set('audioOffset', parseInt(e.target.value));
      });
    }
    
    // Gameplay settings
    const scrollSpeed = document.getElementById('scroll-speed');
    if (scrollSpeed) {
      scrollSpeed.addEventListener('input', (e) => {
        this.game.settings.set('scrollSpeed', parseFloat(e.target.value));
      });
    }
    
    const noteSize = document.getElementById('note-size');
    if (noteSize) {
      noteSize.addEventListener('input', (e) => {
        this.game.settings.set('noteSize', parseFloat(e.target.value));
      });
    }
  }

  updateVRSettingsVisibility() {
    const flatScreenSettings = document.getElementById('flat-screen-settings');
    const vrMode = this.game.settings.get('vrMode');
    
    if (flatScreenSettings) {
      if (vrMode === '2d-flat') {
        flatScreenSettings.classList.remove('hidden');
      } else {
        flatScreenSettings.classList.add('hidden');
      }
    }
  }

  handleButtonClick(e) {
    const action = e.target.dataset.action;
    if (!action) return;
    
    console.log('Menu action:', action);
    
    switch (action) {
      case 'solo':
        this.stopPreview();
        this.loadSongList();
        this.show('song-select');
        break;
        
      case 'multiplayer':
        alert('Multiplayer coming soon!');
        break;
        
      case 'leaderboard':
      case 'leaderboard-hotbar':
        alert('Leaderboard coming soon!');
        break;
        
      case 'settings':
        this.stopPreview();
        this.show('settings-menu');
        break;
        
      case 'back-to-home':
        this.stopPreview();
        this.show('home-screen');
        break;
        
      case 'play-selected':
        this.startSelectedSong();
        break;
        
      case 'resume':
        this.game.resumeGame();
        break;
        
      case 'restart':
      case 'retry':
        // Restart current song
        if (this.game.gameplay && this.game.gameplay.currentChart) {
          this.game.startGame({
            name: 'Current',
            charts: { Hard: this.game.gameplay.currentChart },
            audio: this.game.audio.musicElement?.src || ''
          });
        }
        break;
        
      case 'quit':
        this.game.quitToMenu();
        break;
        
      case 'back-to-songs':
        this.show('song-select');
        break;
        
      case 'save-levels-url':
        const urlInput = document.getElementById('levels-url');
        if (urlInput && this.game.levelLoader) {
          this.game.levelLoader.setBaseUrl(urlInput.value);
          this.game.settings.set('levelsUrl', urlInput.value);
          this.game.settings.save();
          alert('Level repository URL saved! Reloading song list...');
          this.songList = []; // Clear cache
          this.loadRecommendedSongs();
        }
        break;
    }
  }

  handleKeyDown(e) {
    // Global keyboard shortcuts
    switch (e.code) {
      case 'Escape':
        if (this.game.currentState === 'playing') {
          this.game.pauseGame();
        } else if (this.game.currentState === 'paused') {
          this.game.resumeGame();
        }
        break;
        
      case 'Space':
        // Prevent scrolling when in game
        if (this.game.currentState === 'playing') {
          e.preventDefault();
        }
        break;
    }
  }

  handleGameEnded(e) {
    this.showResults(e.detail);
  }

  handleSettingsChange(e) {
    // Update UI to reflect new settings
    if (this.game.settings) {
      this.game.settings.updateUI();
    }
  }

  show(panelName) {
    // Hide current panel
    if (this.currentPanel) {
      const panel = this.panels[this.currentPanel];
      if (panel) {
        panel.classList.add('hidden');
      }
    }
    
    // Show new panel
    this.currentPanel = panelName;
    const newPanel = this.panels[panelName];
    if (newPanel) {
      newPanel.classList.remove('hidden');
      newPanel.classList.add('fade-in');
    }
    
    // Special handling for specific panels
    if (panelName === 'song-select') {
      this.refreshSongList();
      this.stopPreview();
    } else if (panelName === 'home-screen') {
      // Restart visualizer if we have a selected song
      if (this.selectedSong && this.visualizer) {
        this.visualizer.start(this.selectedSong.meta.bpm || 128);
      }
    }
  }

  async loadSongList() {
    if (this.songList.length > 0) return;
    
    try {
      const levels = await this.game.levelLoader.loadLevelList();
      
      // Add song name to each level for sorting
      levels.forEach(level => {
        level.songName = level.name || level.meta.title;
      });
      
      // Sort by name
      levels.sort((a, b) => a.songName.localeCompare(b.songName));
      
      // Calculate daily recommendation
      const dailyRecommended = this.calculateDailyRecommended(levels);
      
      // Move recommended to top if exists
      if (dailyRecommended) {
        const index = levels.findIndex(l => l.name === dailyRecommended.name);
        if (index > 0) {
          levels.splice(index, 1);
          levels.unshift(dailyRecommended);
        }
        this.dailyRecommended = dailyRecommended;
      }
      
      this.songList = levels;
      this.refreshSongList();
    } catch (error) {
      console.error('Failed to load song list:', error);
    }
  }

  calculateDailyRecommended(levels) {
    // Get today's date as seed
    const today = new Date();
    const dateStr = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
    
    // Create deterministic hash from date
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Filter songs with star ratings
    const ratedSongs = levels.filter(l => {
      const charts = Object.values(l.charts);
      return charts.some(c => c.starRating > 0);
    });
    
    if (ratedSongs.length === 0) return levels[0];
    
    // Use hash to pick a song
    const index = Math.abs(hash) % ratedSongs.length;
    return ratedSongs[index];
  }

  refreshSongList() {
    const songListEl = document.getElementById('song-list');
    if (!songListEl) return;
    
    songListEl.innerHTML = '';
    
    // Show/hide daily recommended badge
    const badge = document.getElementById('daily-recommended');
    if (badge) {
      badge.classList.toggle('hidden', !this.dailyRecommended);
    }
    
    if (this.songList.length === 0) {
      songListEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>No songs found.</p>
          <p>Add songs to your GitHub repository!</p>
        </div>
      `;
      return;
    }
    
    // Create song bars
    this.songList.forEach((level, index) => {
      const isRecommended = this.dailyRecommended && level.name === this.dailyRecommended.name;
      const bar = this.createSongBar(level, index === 0, isRecommended);
      songListEl.appendChild(bar);
    });
  }

  createSongBar(level, isFirst = false, isRecommended = false) {
    const bar = document.createElement('div');
    bar.className = `song-bar${isFirst ? ' active' : ''}${isRecommended ? ' recommended' : ''}`;
    bar.dataset.songName = level.name;
    
    // Get best chart for display
    const bestChart = this.getBestChart(level);
    const iconUrl = this.game.levelLoader.getIconUrl(level.name);
    const duration = level.formattedDuration || '0:00';
    
    bar.innerHTML = `
      <div class="song-bar-icon">
        <img src="${iconUrl}" alt="${level.meta.title}" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="icon-placeholder" style="display:none">🎵</div>
      </div>
      <div class="song-bar-info">
        <div class="song-bar-name">${level.meta.title}</div>
        <div class="song-bar-meta">
          <span class="song-bar-stars">★${bestChart.starRating.toFixed(2)}</span>
          <span>${bestChart.difficulty}</span>
          <span>${duration}</span>
        </div>
      </div>
    `;
    
    bar.addEventListener('click', () => this.handleSongBarClick(level, bar));
    
    return bar;
  }

  handleSongBarClick(level, element) {
    // Update active state
    document.querySelectorAll('.song-bar').forEach(el => {
      el.classList.remove('active');
    });
    element.classList.add('active');
    
    // Select song with preview and visualizer
    this.selectSongWithPreview(level);
  }

  async selectSongWithPreview(level) {
    this.selectedSong = level;
    
    // Update song info panel
    this.updateSongInfo(level);
    
    // Stop any existing preview
    this.stopPreview();
    
    // Start new preview
    const bestChart = this.getBestChart(level);
    const bpm = level.meta.bpm || bestChart.bpm || 128;
    
    // Start visualizer in song select screen
    const visualizerCanvas = document.getElementById('song-visualizer-canvas');
    if (visualizerCanvas && this.visualizer) {
      // Switch visualizer to new canvas
      this.visualizer.canvas = visualizerCanvas;
      this.visualizer.ctx = visualizerCanvas.getContext('2d');
      this.visualizer.resize();
      this.visualizer.setBPM(bpm);
      this.visualizer.start(bpm);
    }
    
    // Start audio preview
    await this.startPreview(level);
  }

  updateSongInfo(level) {
    // Get available difficulties
    const difficulties = this.game.levelLoader.getAvailableDifficulties(level);
    
    // Default to first difficulty if none selected
    if (!this.selectedDifficulty || !level.charts[this.selectedDifficulty]) {
      this.selectedDifficulty = difficulties[0]?.name || Object.keys(level.charts)[0];
    }
    
    const selectedChart = level.charts[this.selectedDifficulty];
    
    // Update icon
    const iconImg = document.getElementById('info-icon-img');
    const iconUrl = this.game.levelLoader.getIconUrl(level.name);
    if (iconImg) {
      iconImg.src = iconUrl;
      iconImg.classList.remove('hidden');
      iconImg.onerror = () => {
        iconImg.classList.add('hidden');
        document.querySelector('.icon-placeholder').style.display = 'flex';
      };
    }
    
    // Update info fields
    const fields = {
      'info-song-name': level.meta.title,
      'info-artist': level.meta.artist,
      'info-mapper': level.meta.mapper || 'Unknown',
      'info-difficulty': this.selectedDifficulty,
      'info-star': `★${selectedChart.starRating.toFixed(2)}`,
      'info-ranked': selectedChart.ranked ? 'Yes' : 'No',
      'info-chart-type': selectedChart.chartType || 'Acc',
      'info-bpm': level.meta.bpm || selectedChart.bpm || 120,
      'info-offset': selectedChart.offset.toFixed(3),
      'info-note-speed': selectedChart.noteSpeed.toFixed(1),
      'info-duration': level.formattedDuration || '0:00'
    };
    
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
        
        // Add color class for ranked
        if (id === 'info-ranked') {
          el.className = `info-value ${value === 'Yes' ? 'ranked-yes' : 'ranked-no'}`;
        }
      }
    });
    
    // Render difficulty buttons
    this.renderDifficultyButtons(difficulties);
    
    // Update play button
    const playBtn = document.getElementById('play-song-btn');
    if (playBtn) {
      playBtn.onclick = () => this.startSelectedSong();
    }
  }

  renderDifficultyButtons(difficulties) {
    const container = document.getElementById('difficulty-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    difficulties.forEach(diff => {
      const btn = document.createElement('button');
      btn.className = `difficulty-btn${diff.name === this.selectedDifficulty ? ' active' : ''}`;
      btn.innerHTML = `${diff.name}<span class="stars">★${diff.starRating.toFixed(2)}</span>`;
      btn.onclick = () => this.selectDifficulty(diff.name);
      container.appendChild(btn);
    });
  }

  selectDifficulty(difficultyName) {
    this.selectedDifficulty = difficultyName;
    
    // Update UI
    if (this.selectedSong) {
      this.updateSongInfo(this.selectedSong);
    }
    
    // Update active state on buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(difficultyName));
    });
  }

  startSelectedSong() {
    if (!this.selectedSong) return;
    
    // Stop preview and visualizer
    this.stopPreview();
    
    // Start the game with selected difficulty
    this.game.startGame(this.selectedSong, this.selectedDifficulty);
  }

  showResults(results) {
    // Update results screen with data
    const finalScore = document.querySelector('.final-score');
    const finalAccuracy = document.querySelector('.final-accuracy');
    const finalRank = document.querySelector('.final-rank');
    
    if (finalScore) finalScore.textContent = `Score: ${results.score.toLocaleString()}`;
    if (finalAccuracy) finalAccuracy.textContent = `Accuracy: ${results.accuracy.toFixed(2)}%`;
    if (finalRank) {
      finalRank.textContent = results.rank;
      finalRank.style.color = this.getRankColor(results.rank);
    }
    
    // Update judgment breakdown
    const countPerfect = document.getElementById('count-perfect');
    const countGreat = document.getElementById('count-great');
    const countGood = document.getElementById('count-good');
    const countMiss = document.getElementById('count-miss');
    
    if (countPerfect) countPerfect.textContent = results.judgments.perfect;
    if (countGreat) countGreat.textContent = results.judgments.great;
    if (countGood) countGood.textContent = results.judgments.good;
    if (countMiss) countMiss.textContent = results.judgments.miss;
    
    this.show('results-screen');
  }

  getRankColor(rank) {
    const colors = {
      'SSS': '#ffd700',
      'SS': '#ffec8b',
      'S': '#00ff88',
      'A': '#00d4ff',
      'B': '#ffaa00',
      'C': '#ff6600',
      'D': '#ff3366',
      'F': '#666666'
    };
    return colors[rank] || '#ffffff';
  }

  // VR keyboard methods
  showVirtualKeyboard(inputElement, onSubmit) {
    if (this.virtualKeyboard) {
      this.virtualKeyboard.show(inputElement, onSubmit);
    }
  }

  hideVirtualKeyboard() {
    if (this.virtualKeyboard) {
      this.virtualKeyboard.hide();
    }
  }
}
