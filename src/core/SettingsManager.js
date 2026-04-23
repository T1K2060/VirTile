/**
 * Settings Manager
 * Handles all game settings, graphics quality, and energy saving
 */

export class SettingsManager {
  constructor(platform) {
    this.platform = platform;
    this.settings = {};
    this.defaultSettings = this.getDefaultSettings();
    this.energySaveActive = false;
    this.previousQuality = null;
    
    // Graphics quality presets
    this.qualityPresets = {
      ultra: {
        shadowMapSize: 2048,
        antialias: true,
        pixelRatio: 2.0,
        effects: true,
        particleCount: 1000,
        noteTrail: true,
        bloom: true,
        reflections: true
      },
      high: {
        shadowMapSize: 1024,
        antialias: true,
        pixelRatio: 1.5,
        effects: true,
        particleCount: 500,
        noteTrail: true,
        bloom: true,
        reflections: false
      },
      medium: {
        shadowMapSize: 512,
        antialias: true,
        pixelRatio: 1.0,
        effects: true,
        particleCount: 200,
        noteTrail: true,
        bloom: false,
        reflections: false
      },
      low: {
        shadowMapSize: 256,
        antialias: false,
        pixelRatio: 0.8,
        effects: false,
        particleCount: 50,
        noteTrail: false,
        bloom: false,
        reflections: false
      },
      minimal: {
        shadowMapSize: 0,
        antialias: false,
        pixelRatio: 0.5,
        effects: false,
        particleCount: 0,
        noteTrail: false,
        bloom: false,
        reflections: false
      }
    };
  }

  getDefaultSettings() {
    const recommendedQuality = this.platform ? this.platform.getRecommendedQuality() : 'medium';
    
    return {
      // Platform
      platformMode: 'auto', // auto, pc, pcvr, mobile, tablet, standalone-vr
      
      // Graphics
      graphicsQuality: recommendedQuality,
      energySaveEnabled: true,
      batteryThreshold: 15,
      renderScale: this.platform ? this.platform.getRecommendedRenderScale() : 1.0,
      vsync: true,
      
      // VR Settings
      vrMode: '3d-immersive', // '2d-flat' or '3d-immersive'
      vrScreenSize: 1.5,
      vrScreenDistance: 2.0,
      vrScreenCurve: 0.3,
      vrHandTracking: false,
      vrHapticFeedback: true,
      
      // Audio
      masterVolume: 80,
      musicVolume: 100,
      hitsoundVolume: 60,
      audioOffset: 0, // in milliseconds
      
      // Gameplay
      scrollSpeed: 5.0,
      noteSize: 1.0,
      laneCount: 4, // 4, 5, 6, 7, mania
      keyBindings: {
        // Default key bindings for PC
        lane1: 'KeyD',
        lane2: 'KeyF',
        lane3: 'KeyJ',
        lane4: 'KeyK',
        lane5: 'KeySpace',
        lane6: 'ArrowLeft',
        lane7: 'ArrowDown',
        pause: 'Escape',
        restart: 'Backquote'
      },
      touchControls: true,
      touchOffset: 0,
      
      // Visual
      hitPosition: 0.85, // 0-1, where notes are hit
      fadeInTime: 0.5, // seconds before note reaches hit position
      showFPS: false,
      showJudgment: true,
      showCombo: true,
      showAccuracy: true,
      
      // Accessibility
      reduceMotion: false,
      highContrast: false,
      colorblindMode: 'none', // none, deuteranopia, protanopia, tritanopia
      
      // Beatmap
      defaultDifficulty: 'Hard',
      autoDownload: true,
      
      // Multiplayer (future)
      playerName: 'Player',
      lobbyDefaultPrivacy: 'public'
    };
  }

  async load() {
    // Load from localStorage
    const saved = localStorage.getItem('virtile_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.defaultSettings, ...parsed };
        console.log('Settings loaded from localStorage');
      } catch (e) {
        console.warn('Failed to parse saved settings, using defaults');
        this.settings = { ...this.defaultSettings };
      }
    } else {
      this.settings = { ...this.defaultSettings };
    }
    
    // Apply platform-specific defaults if auto mode
    if (this.settings.platformMode === 'auto' && this.platform) {
      this.settings.graphicsQuality = this.platform.getRecommendedQuality();
      this.settings.renderScale = this.platform.getRecommendedRenderScale();
    }
    
    this.applySettings();
    return this.settings;
  }

  save() {
    try {
      localStorage.setItem('virtile_settings', JSON.stringify(this.settings));
      console.log('Settings saved to localStorage');
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
    this.applySettings();
  }

  getQualitySettings() {
    const quality = this.energySaveActive ? 'minimal' : this.settings.graphicsQuality;
    return this.qualityPresets[quality] || this.qualityPresets.medium;
  }

  applySettings() {
    // Update UI elements based on settings
    this.updateUI();
    
    // Dispatch event for other systems to react
    window.dispatchEvent(new CustomEvent('settingsChanged', { 
      detail: { settings: this.settings } 
    }));
  }

  updateUI() {
    // Update settings form elements if they exist
    const elements = {
      'platform-mode': this.settings.platformMode,
      'graphics-quality': this.settings.graphicsQuality,
      'energy-save': this.settings.energySaveEnabled,
      'battery-threshold': this.settings.batteryThreshold,
      'vr-mode': this.settings.vrMode,
      'vr-screen-size': this.settings.vrScreenSize,
      'vr-screen-distance': this.settings.vrScreenDistance,
      'vr-screen-curve': this.settings.vrScreenCurve,
      'master-volume': this.settings.masterVolume,
      'hitsound-volume': this.settings.hitsoundVolume,
      'audio-offset': this.settings.audioOffset,
      'scroll-speed': this.settings.scrollSpeed,
      'note-size': this.settings.noteSize
    };

    for (const [id, value] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = value;
        } else {
          el.value = value;
        }
      }
    }

    // Show/hide VR-specific settings
    const vrSettings = document.getElementById('vr-settings');
    if (vrSettings) {
      const flatScreenSettings = document.getElementById('flat-screen-settings');
      if (this.settings.vrMode === '2d-flat') {
        flatScreenSettings?.classList.remove('hidden');
      } else {
        flatScreenSettings?.classList.add('hidden');
      }
    }

    // Show/hide FPS counter
    const fpsCounter = document.getElementById('fps-counter');
    if (fpsCounter) {
      fpsCounter.style.display = this.settings.showFPS ? 'block' : 'none';
    }
  }

  // Energy saving functionality
  enableEnergySave() {
    if (!this.energySaveActive) {
      this.previousQuality = this.settings.graphicsQuality;
      this.energySaveActive = true;
      console.log('Energy save mode activated');
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('energySaveChanged', { 
        detail: { active: true } 
      }));
      
      this.applySettings();
    }
  }

  disableEnergySave() {
    if (this.energySaveActive) {
      this.energySaveActive = false;
      console.log('Energy save mode deactivated');
      
      // Restore previous quality if available
      if (this.previousQuality) {
        this.settings.graphicsQuality = this.previousQuality;
      }
      
      window.dispatchEvent(new CustomEvent('energySaveChanged', { 
        detail: { active: false } 
      }));
      
      this.applySettings();
    }
  }

  checkBatteryLevel(level, charging) {
    if (!this.settings.energySaveEnabled) return;
    
    const threshold = this.settings.batteryThreshold;
    
    if (!charging && level <= threshold) {
      this.enableEnergySave();
      
      // Show battery warning
      const warning = document.getElementById('battery-warning');
      if (warning) {
        warning.classList.remove('hidden');
      }
    } else if (charging || level > threshold + 5) {
      this.disableEnergySave();
      
      // Hide battery warning
      const warning = document.getElementById('battery-warning');
      if (warning) {
        warning.classList.add('hidden');
      }
    }
  }

  // Get current effective settings considering energy save
  getEffectiveSettings() {
    const quality = this.getQualitySettings();
    return {
      ...this.settings,
      ...quality,
      energySave: this.energySaveActive
    };
  }

  // Reset to defaults
  resetToDefaults() {
    this.settings = { ...this.defaultSettings };
    this.energySaveActive = false;
    this.previousQuality = null;
    this.save();
    this.applySettings();
  }

  // Export settings for sharing
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings from string
  importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.settings = { ...this.defaultSettings, ...imported };
      this.save();
      this.applySettings();
      return true;
    } catch (e) {
      console.error('Failed to import settings:', e);
      return false;
    }
  }
}
