/**
 * Battery Manager
 * Monitors battery level and handles energy saving
 */

export class BatteryManager {
  constructor(settings) {
    this.settings = settings;
    this.battery = null;
    this.level = 1.0;
    this.charging = true;
    this.supported = false;
  }

  async init() {
    // Check if Battery API is supported
    if ('getBattery' in navigator) {
      try {
        this.battery = await navigator.getBattery();
        this.supported = true;
        
        // Initial values
        this.level = this.battery.level;
        this.charging = this.battery.charging;
        
        // Set up event listeners
        this.battery.addEventListener('levelchange', () => this.handleLevelChange());
        this.battery.addEventListener('chargingchange', () => this.handleChargingChange());
        this.battery.addEventListener('chargingtimechange', () => this.handleChargingTimeChange());
        this.battery.addEventListener('dischargingtimechange', () => this.handleDischargingTimeChange());
        
        console.log('Battery API initialized:', {
          level: this.level,
          charging: this.charging
        });
        
        // Initial check
        this.checkEnergySave();
        
      } catch (error) {
        console.warn('Battery API error:', error);
        this.supported = false;
      }
    } else {
      console.log('Battery API not supported on this device');
      this.supported = false;
    }
    
    // Fallback: Try to detect battery through other means
    if (!this.supported) {
      this.setupFallbackDetection();
    }
  }

  handleLevelChange() {
    this.level = this.battery.level;
    console.log('Battery level changed:', Math.round(this.level * 100) + '%');
    this.checkEnergySave();
  }

  handleChargingChange() {
    this.charging = this.battery.charging;
    console.log('Charging state changed:', this.charging ? 'charging' : 'discharging');
    this.checkEnergySave();
  }

  handleChargingTimeChange() {
    console.log('Time to full charge:', this.battery.chargingTime, 'seconds');
  }

  handleDischargingTimeChange() {
    console.log('Time until empty:', this.battery.dischargingTime, 'seconds');
  }

  checkEnergySave() {
    if (this.settings) {
      this.settings.checkBatteryLevel(this.level, this.charging);
    }
  }

  setupFallbackDetection() {
    // Some devices expose battery info through other APIs
    // This is a placeholder for platform-specific fallbacks
    
    // For Android WebView or certain browsers
    if (window.Android && window.Android.getBatteryLevel) {
      try {
        const androidLevel = window.Android.getBatteryLevel();
        this.level = androidLevel / 100;
        console.log('Android battery level (fallback):', this.level);
      } catch (e) {
        // Ignore errors
      }
    }
  }

  update() {
    // Called every frame - can be used for continuous monitoring
    // Currently just ensures energy save state is correct
    if (this.supported && this.settings && this.settings.energySaveActive) {
      // In energy save mode, we might want to do additional frame limiting
      // This is handled by the renderer
    }
  }

  // Get battery info for display
  getBatteryInfo() {
    return {
      supported: this.supported,
      level: Math.round(this.level * 100),
      charging: this.charging,
      chargingTime: this.battery?.chargingTime || Infinity,
      dischargingTime: this.battery?.dischargingTime || Infinity
    };
  }

  // Force energy save mode (for testing)
  forceEnergySave(enabled) {
    if (enabled) {
      this.settings.enableEnergySave();
    } else {
      this.settings.disableEnergySave();
    }
  }
}
