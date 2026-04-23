/**
 * Input Manager
 * Handles keyboard, touch, mouse, and VR controller input
 */

export class InputManager {
  constructor(platform) {
    this.platform = platform;
    this.keys = {};
    this.previousKeys = {};
    this.touches = new Map();
    this.vrInputs = {
      left: null,
      right: null
    };
    
    // Lane touch zones (for mobile/tablet)
    this.laneZones = [];
    
    // Callbacks
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onTouchStart = null;
    this.onTouchEnd = null;
    this.onVRInput = null;
  }

  async init() {
    // Keyboard input
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Touch input
    if (this.platform?.touchSupport) {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      }
    }
    
    // Mouse input (for UI interactions)
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    // Gamepad input (for controllers)
    window.addEventListener('gamepadconnected', (e) => this.handleGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.handleGamepadDisconnected(e));
    
    console.log('Input Manager initialized');
  }

  handleKeyDown(e) {
    const key = e.code;
    this.keys[key] = true;
    
    // Prevent default for game keys
    if (this.isGameKey(key)) {
      e.preventDefault();
    }
    
    if (this.onKeyDown) {
      this.onKeyDown(key, e);
    }
  }

  handleKeyUp(e) {
    const key = e.code;
    this.keys[key] = false;
    
    if (this.onKeyUp) {
      this.onKeyUp(key, e);
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.touches.set(touch.identifier, { x, y, startX: x, startY: y });
      
      // Check which lane was touched
      const lane = this.getLaneFromPosition(x, y, rect.width, rect.height);
      
      if (this.onTouchStart) {
        this.onTouchStart(touch.identifier, lane, x, y);
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);
      
      if (touchData) {
        if (this.onTouchEnd) {
          this.onTouchEnd(touch.identifier);
        }
        this.touches.delete(touch.identifier);
      }
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);
      
      if (touchData) {
        touchData.x = touch.clientX - rect.left;
        touchData.y = touch.clientY - rect.top;
      }
    }
  }

  handleMouseDown(e) {
    // Only handle if not on UI element
    if (e.target.closest('#ui-layer')) return;
    
    // For 3D interactions
    this.mouseDown = true;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  handleMouseUp(e) {
    this.mouseDown = false;
  }

  handleGamepadConnected(e) {
    console.log('Gamepad connected:', e.gamepad.id);
  }

  handleGamepadDisconnected(e) {
    console.log('Gamepad disconnected:', e.gamepad.id);
  }

  update() {
    // Update previous key states
    this.previousKeys = { ...this.keys };
    
    // Update gamepad input
    this.updateGamepads();
    
    // Update VR input if in VR mode
    if (this.platform?.isInVRMode()) {
      this.updateVRInput();
    }
  }

  updateGamepads() {
    if (!this.platform?.gamepadSupport) return;
    
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        // Map gamepad buttons to lanes
        // This is simplified - in production, you'd have configurable bindings
        for (let j = 0; j < gp.buttons.length; j++) {
          const button = gp.buttons[j];
          const key = `Gamepad${i}_Button${j}`;
          
          this.previousKeys[key] = this.keys[key];
          this.keys[key] = button.pressed;
          
          // Trigger callbacks on state change
          if (button.pressed && !this.previousKeys[key]) {
            if (this.onKeyDown) this.onKeyDown(key);
          } else if (!button.pressed && this.previousKeys[key]) {
            if (this.onKeyUp) this.onKeyUp(key);
          }
        }
      }
    }
  }

  updateVRInput() {
    // VR controller input is handled by the VRManager
    // This method is called to sync VR input state
  }

  isGameKey(key) {
    // Check if key is used for gameplay
    const gameKeys = [
      'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeySpace',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Escape', 'Backquote'
    ];
    return gameKeys.includes(key);
  }

  isKeyPressed(key) {
    return !!this.keys[key];
  }

  wasKeyJustPressed(key) {
    return this.keys[key] && !this.previousKeys[key];
  }

  wasKeyJustReleased(key) {
    return !this.keys[key] && this.previousKeys[key];
  }

  getLaneFromPosition(x, y, canvasWidth, canvasHeight) {
    // Calculate lane based on touch position
    // This is a simplified 4-lane calculation
    const laneCount = 4;
    const laneWidth = canvasWidth / laneCount;
    
    const lane = Math.floor(x / laneWidth);
    return Math.max(0, Math.min(laneCount - 1, lane));
  }

  setupLaneZones(laneCount, canvasWidth, canvasHeight) {
    this.laneZones = [];
    const laneWidth = canvasWidth / laneCount;
    
    for (let i = 0; i < laneCount; i++) {
      this.laneZones.push({
        lane: i,
        left: i * laneWidth,
        right: (i + 1) * laneWidth,
        top: canvasHeight * 0.7, // Hit area at bottom 30%
        bottom: canvasHeight
      });
    }
  }

  // VR-specific input methods
  setVRInput(hand, inputSource) {
    this.vrInputs[hand] = inputSource;
  }

  getVRInput(hand) {
    return this.vrInputs[hand];
  }

  // Check for any input (for menus)
  getAnyInputPressed() {
    return Object.values(this.keys).some(v => v) || this.touches.size > 0;
  }
}
