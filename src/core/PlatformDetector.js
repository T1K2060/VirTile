/**
 * Platform Detector
 * Detects device type: PC, Mobile, Tablet, PCVR, Standalone VR
 */

export class PlatformDetector {
  constructor() {
    this.type = 'unknown';
    this.isMobile = false;
    this.isTablet = false;
    this.isVR = false;
    this.isPC = false;
    this.isStandaloneVR = false;
    this.isPCVR = false;
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.touchSupport = false;
    this.gamepadSupport = 'getGamepads' in navigator;
    this.xrSupport = false;
  }

  async detect() {
    // Check for XR support (VR/AR)
    if ('xr' in navigator) {
      try {
        this.xrSupport = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        this.xrSupport = false;
      }
    }

    // Check for WebXR Device API (indicates VR capability)
    const hasWebXR = 'XRSession' in window;
    
    // Detect touch support
    this.touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // User agent detection
    const ua = navigator.userAgent.toLowerCase();
    
    // Standalone VR detection (Quest, Pico, etc.)
    const standaloneVRPatterns = [
      /quest/i,
      /pico/i,
      /oculus/i,
      /meta quest/i,
      /htc Vive/i,
      /focus/i,
      /mirage/i,
      /lenovo mirage/i
    ];
    
    this.isStandaloneVR = standaloneVRPatterns.some(pattern => pattern.test(ua));
    
    // PCVR detection (VR-capable browser on PC)
    this.isPCVR = !this.isStandaloneVR && this.xrSupport && /windows|macintosh|linux/.test(ua);
    
    // VR detection (either standalone or PCVR)
    this.isVR = this.isStandaloneVR || this.isPCVR;
    
    // Mobile detection
    const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    this.isMobile = mobilePatterns.test(ua) && !this.isStandaloneVR;
    
    // Tablet detection (larger screen + touch, or iPad specifically)
    this.isTablet = (
      /ipad/i.test(ua) || 
      (/android/i.test(ua) && !/mobile/i.test(ua)) ||
      (this.touchSupport && window.innerWidth >= 600 && window.innerWidth < 1366)
    ) && !this.isStandaloneVR;
    
    // If tablet detected, it's not mobile
    if (this.isTablet) this.isMobile = false;
    
    // PC detection (not mobile, not tablet, not standalone VR)
    this.isPC = !this.isMobile && !this.isTablet && !this.isStandaloneVR;
    
    // Determine primary type
    if (this.isStandaloneVR) {
      this.type = 'standalone-vr';
    } else if (this.isPCVR) {
      this.type = 'pcvr';
    } else if (this.isTablet) {
      this.type = 'tablet';
    } else if (this.isMobile) {
      this.type = 'mobile';
    } else {
      this.type = 'pc';
    }

    // Store additional info
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.screenOrientation = screen.orientation ? screen.orientation.type : 'unknown';
    
    console.log('Platform Detection Results:', {
      type: this.type,
      isVR: this.isVR,
      isStandaloneVR: this.isStandaloneVR,
      isPCVR: this.isPCVR,
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      isPC: this.isPC,
      touchSupport: this.touchSupport,
      xrSupport: this.xrSupport,
      gamepadSupport: this.gamepadSupport
    });

    // Listen for resize events
    window.addEventListener('resize', () => this.handleResize());
    
    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => this.handleOrientationChange());
    }

    return this.type;
  }

  handleResize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    
    // Re-evaluate tablet status on resize
    if (this.touchSupport && !this.isStandaloneVR && !this.isPCVR) {
      if (this.screenWidth >= 600 && this.screenWidth < 1366 && this.screenHeight >= 600) {
        if (!this.isTablet && this.isMobile) {
          this.isMobile = false;
          this.isTablet = true;
          this.type = 'tablet';
        }
      }
    }
  }

  handleOrientationChange() {
    this.screenOrientation = screen.orientation ? screen.orientation.type : 'unknown';
    console.log('Orientation changed:', this.screenOrientation);
  }

  // Check if device is likely in VR mode
  isInVRMode() {
    return this.isVR || (document.body.classList.contains('vr-mode'));
  }

  // Get recommended render scale based on device
  getRecommendedRenderScale() {
    switch (this.type) {
      case 'standalone-vr':
        return 0.8; // Lower resolution for mobile VR
      case 'pcvr':
        return 1.0; // Full resolution for PCVR
      case 'mobile':
        return 0.75;
      case 'tablet':
        return 0.9;
      case 'pc':
      default:
        return 1.0;
    }
  }

  // Get recommended quality preset
  getRecommendedQuality() {
    switch (this.type) {
      case 'standalone-vr':
        return 'medium';
      case 'mobile':
        return 'low';
      case 'tablet':
        return 'medium';
      case 'pcvr':
        return 'high';
      case 'pc':
      default:
        return 'high';
    }
  }
}
