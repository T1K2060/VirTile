/**
 * Audio Manager
 * Handles music playback, hitsounds, and timing
 */

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.hitsoundGain = null;
    
    // Music audio element
    this.musicElement = null;
    this.musicSource = null;
    
    // Timing
    this.audioOffset = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    
    // Hitsounds
    this.hitsounds = new Map();
    this.preloadHitsounds();
  }

  async init() {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Create gain nodes (volume control)
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.hitsoundGain = this.audioContext.createGain();
      
      // Connect nodes
      this.musicGain.connect(this.masterGain);
      this.hitsoundGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      
      // Set initial volumes
      this.updateVolumes();
      
      console.log('Audio Manager initialized');
      
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      // Fallback to simple audio element
      this.useFallback = true;
    }
  }

  preloadHitsounds() {
    // Generate simple synthesized hitsounds
    // In production, these would be loaded from files
    this.hitsoundTypes = {
      normal: { frequency: 800, duration: 0.05 },
      whistle: { frequency: 1200, duration: 0.08 },
      finish: { frequency: 600, duration: 0.1 },
      clap: { frequency: 400, duration: 0.05 }
    };
  }

  createHitsound(type = 'normal') {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    const sound = this.hitsoundTypes[type] || this.hitsoundTypes.normal;
    
    osc.frequency.value = sound.frequency;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
    
    osc.connect(gain);
    gain.connect(this.hitsoundGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + sound.duration);
  }

  async loadMusic(url) {
    try {
      if (this.useFallback) {
        // Simple audio element fallback
        this.musicElement = new Audio(url);
        this.musicElement.crossOrigin = 'anonymous';
        return new Promise((resolve, reject) => {
          this.musicElement.addEventListener('canplaythrough', resolve, { once: true });
          this.musicElement.addEventListener('error', reject, { once: true });
          this.musicElement.load();
        });
      }
      
      // Web Audio API approach
      this.musicElement = new Audio(url);
      this.musicElement.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        this.musicElement.addEventListener('canplaythrough', resolve, { once: true });
        this.musicElement.addEventListener('error', reject, { once: true });
        this.musicElement.load();
      });
      
      // Create media element source
      if (this.musicSource) {
        this.musicSource.disconnect();
      }
      this.musicSource = this.audioContext.createMediaElementSource(this.musicElement);
      this.musicSource.connect(this.musicGain);
      
      console.log('Music loaded:', url);
      
    } catch (error) {
      console.error('Failed to load music:', error);
      throw error;
    }
  }

  play() {
    if (this.isPlaying) return;
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    if (this.musicElement) {
      this.musicElement.play();
      this.startTime = this.audioContext ? this.audioContext.currentTime : performance.now();
      this.isPlaying = true;
      this.isPaused = false;
    }
  }

  pause() {
    if (this.musicElement && this.isPlaying) {
      this.musicElement.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.musicElement && this.isPaused) {
      this.musicElement.play();
      this.isPaused = false;
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.currentTime = 0;
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  seek(time) {
    if (this.musicElement) {
      this.musicElement.currentTime = time;
    }
  }

  getCurrentTime() {
    if (!this.musicElement) return 0;
    
    // Apply audio offset
    let time = this.musicElement.currentTime;
    const offset = (this.settings?.get('audioOffset') || 0) / 1000;
    return time + offset;
  }

  getDuration() {
    return this.musicElement?.duration || 0;
  }

  playHitsound(judgment) {
    // Different hitsounds based on judgment
    switch (judgment) {
      case 'perfect':
        this.createHitsound('normal');
        break;
      case 'great':
        this.createHitsound('normal');
        break;
      case 'good':
        this.createHitsound('clap');
        break;
      default:
        // No sound for miss
        break;
    }
  }

  updateVolumes() {
    if (!this.settings) return;
    
    const masterVol = this.settings.get('masterVolume') / 100;
    const musicVol = this.settings.get('musicVolume') / 100;
    const hitsoundVol = this.settings.get('hitsoundVolume') / 100;
    
    if (this.masterGain) {
      this.masterGain.gain.value = masterVol;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = musicVol;
    }
    if (this.hitsoundGain) {
      this.hitsoundGain.gain.value = hitsoundVol;
    }
    
    // Fallback audio element volume
    if (this.musicElement) {
      this.musicElement.volume = masterVol * musicVol;
    }
  }

  // Called when settings change
  onSettingsChanged() {
    this.updateVolumes();
  }

  get ended() {
    return this.musicElement?.ended || false;
  }
}
