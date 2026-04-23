/**
 * Audio Visualizer
 * Creates particle effects and visualizations synced to audio BPM
 */

export class AudioVisualizer {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isActive = false;
    this.bpm = 128;
    this.lastBeat = 0;
    this.zoomIntensity = 1;
    
    // Configuration
    this.config = {
      particleCount: 50,
      baseZoom: 1,
      maxZoom: 1.2,
      colors: ['#00d4ff', '#ff00a0', '#ffe600']
    };
  }

  init() {
    this.canvas = document.getElementById('visualizer-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
    
    // Create particles
    this.createParticles();
    
    console.log('Audio Visualizer initialized');
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  start(bpm = 128) {
    this.bpm = bpm;
    this.isActive = true;
    this.lastBeat = performance.now();
    
    const container = document.getElementById('audio-visualizer-bg');
    if (container) {
      container.classList.remove('hidden');
    }
    
    this.animate();
  }

  stop() {
    this.isActive = false;
    
    const container = document.getElementById('audio-visualizer-bg');
    if (container) {
      container.classList.add('hidden');
    }
    
    // Reset zoom
    this.zoomIntensity = this.config.baseZoom;
    this.applyZoom();
  }

  animate() {
    if (!this.isActive) return;
    
    this.update();
    this.draw();
    
    requestAnimationFrame(() => this.animate());
  }

  update() {
    const now = performance.now();
    const beatDuration = 60000 / this.bpm;
    
    // Check for beat
    if (now - this.lastBeat >= beatDuration) {
      this.lastBeat = now;
      this.onBeat();
    }
    
    // Update particles
    this.particles.forEach(p => {
      // Move
      p.x += p.speedX * this.zoomIntensity;
      p.y += p.speedY * this.zoomIntensity;
      
      // Wrap around screen
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;
      
      // Pulse alpha
      p.pulse += 0.05;
      p.alpha = 0.3 + Math.sin(p.pulse) * 0.2;
    });
    
    // Decay zoom
    this.zoomIntensity = this.config.baseZoom + 
      (this.zoomIntensity - this.config.baseZoom) * 0.95;
    this.applyZoom();
  }

  onBeat() {
    // Trigger zoom on beat
    this.zoomIntensity = this.config.maxZoom;
    
    // Add energy to particles
    this.particles.forEach(p => {
      p.speedX *= 1.5;
      p.speedY *= 1.5;
      
      // Normalize speed
      const speed = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
      if (speed > 4) {
        p.speedX = (p.speedX / speed) * 4;
        p.speedY = (p.speedY / speed) * 4;
      }
    });
  }

  applyZoom() {
    if (this.canvas) {
      this.canvas.style.transform = `scale(${this.zoomIntensity})`;
    }
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    
    // Clear with fade effect
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * this.zoomIntensity, 0, Math.PI * 2);
      this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
      this.ctx.fill();
      
      // Glow effect
      this.ctx.shadowBlur = 10 * this.zoomIntensity;
      this.ctx.shadowColor = p.color;
    });
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    // Draw beat indicator
    const now = performance.now();
    const beatDuration = 60000 / this.bpm;
    const timeSinceBeat = now - this.lastBeat;
    const beatProgress = timeSinceBeat / beatDuration;
    
    if (beatProgress < 0.3) {
      const radius = 100 + beatProgress * 200;
      const alpha = 1 - beatProgress / 0.3;
      
      this.ctx.beginPath();
      this.ctx.arc(
        this.canvas.width / 2,
        this.canvas.height / 2,
        radius,
        0,
        Math.PI * 2
      );
      this.ctx.strokeStyle = `rgba(0, 212, 255, ${alpha * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  setBPM(bpm) {
    this.bpm = bpm;
  }
}
