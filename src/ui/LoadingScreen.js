/**
 * Loading Screen Controller
 * Roblox-style loading animation with phases:
 * "Loading Assets" -> "Grabbing Levels" -> "Done" -> Fade out
 * Background stays permanently, only content fades
 */

export class LoadingScreen {
  constructor() {
    // Delay element lookup to ensure DOM is ready
    this.elements = null;
    this.currentPhase = 0;
    this.phases = [
      { text: 'Loading Assets', duration: 2000, progress: 33 },
      { text: 'Grabbing Levels', duration: 2000, progress: 66 },
      { text: 'Done', duration: 800, progress: 100 }
    ];
    this.isComplete = false;
  }
  
  initElements() {
    if (!this.elements) {
      this.elements = {
        container: document.getElementById('loading-screen'),
        background: document.getElementById('loading-background'),
        content: document.getElementById('loading-content'),
        info: document.getElementById('loading-info'),
        assets: document.getElementById('loading-assets'),
        barSlider: document.getElementById('loading-bar-slider')
      };
      console.log('Loading screen elements:', this.elements);
    }
  }

  async start() {
    this.initElements();
    console.log('🎬 Loading screen started');
    
    // Ensure content is visible
    if (this.elements.content) {
      this.elements.content.style.display = 'flex';
      this.elements.content.style.opacity = '1';
    }
    
    // Run through each phase
    for (let i = 0; i < this.phases.length; i++) {
      this.currentPhase = i;
      await this.runPhase(this.phases[i]);
    }
    
    // Fade out content only (background stays)
    await this.fadeOut();
    
    this.isComplete = true;
    console.log('✅ Loading complete');
  }

  async runPhase(phase) {
    // Update text with pulse animation
    this.setInfoText(phase.text);
    
    // Update progress bar
    this.setProgress(phase.progress);
    
    // Simulate asset loading for "Loading Assets" phase
    if (phase.text === 'Loading Assets') {
      await this.simulateAssetLoading(phase.duration);
    } else if (phase.text === 'Grabbing Levels') {
      await this.simulateLevelLoading(phase.duration);
    } else {
      // "Done" phase - just wait briefly
      await this.wait(phase.duration);
    }
  }

  async simulateAssetLoading(duration) {
    const steps = 10;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      this.setAssetsText(i, steps);
      await this.wait(stepDuration);
    }
  }

  async simulateLevelLoading(duration) {
    const steps = 5;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      this.setAssetsText(i, steps);
      await this.wait(stepDuration);
    }
  }

  setInfoText(text) {
    this.initElements();
    if (this.elements.info) {
      // Add pulse animation
      this.elements.info.classList.remove('pulse');
      void this.elements.info.offsetWidth; // Trigger reflow
      this.elements.info.classList.add('pulse');
      
      this.elements.info.textContent = text;
      console.log('Loading phase:', text);
    }
  }

  setAssetsText(current, total) {
    this.initElements();
    if (this.elements.assets) {
      this.elements.assets.textContent = `${current} / ${total}`;
    }
  }

  setProgress(percent) {
    this.initElements();
    if (this.elements.barSlider) {
      this.elements.barSlider.style.width = `${percent}%`;
      console.log('Loading progress:', percent + '%');
    }
  }

  async fadeOut() {
    this.initElements();
    return new Promise(resolve => {
      if (this.elements.content) {
        this.elements.content.classList.add('fade-out');
        
        // Wait for fade animation to complete
        setTimeout(() => {
          // Hide content completely but keep background
          this.elements.content.style.display = 'none';
          
          // Important: Keep the loading-screen container visible
          // so the background stays! Only hide the content.
          
          resolve();
        }, 500); // Match CSS transition time
      } else {
        resolve();
      }
    });
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Force hide everything (for errors or quick skip)
  hideAll() {
    this.initElements();
    if (this.elements.container) {
      this.elements.container.style.display = 'none';
    }
  }

  // Show loading screen again (for level transitions)
  showAgain() {
    this.initElements();
    if (this.elements.content) {
      this.elements.content.style.display = 'flex';
      this.elements.content.classList.remove('fade-out');
      this.elements.content.style.opacity = '1';
    }
  }

  // Update to a specific phase manually
  setPhase(phaseName, progress = 0) {
    this.setInfoText(phaseName);
    this.setProgress(progress);
  }
}
