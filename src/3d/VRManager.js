/**
 * VR Manager
 * Handles WebXR sessions, VR controllers, and VR-specific rendering
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRManager {
  constructor(sceneManager, settings) {
    this.sceneManager = sceneManager;
    this.settings = settings;
    
    this.isSupported = false;
    this.isPresenting = false;
    this.session = null;
    
    // XR controllers
    this.controllers = [];
    this.controllerGrips = [];
    this.controllerModels = [];
    
    // VR UI
    this.vrMenu = null;
    this.flatScreen = null;
    
    // Raycaster for pointer
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Bind methods
    this.onSessionStarted = this.onSessionStarted.bind(this);
    this.onSessionEnded = this.onSessionEnded.bind(this);
    this.onSelect = this.onSelect.bind(this);
  }

  async init() {
    // Check for WebXR support
    if (!('xr' in navigator)) {
      console.log('WebXR not supported');
      return;
    }

    try {
      this.isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      
      if (this.isSupported) {
        console.log('VR support detected');
        this.setupVRButton();
        this.setupControllers();
      }
    } catch (error) {
      console.warn('Error checking VR support:', error);
      this.isSupported = false;
    }
  }

  setupVRButton() {
    const vrBtn = document.getElementById('vr-button');
    if (vrBtn) {
      vrBtn.addEventListener('click', () => this.enterVR());
    }
    
    const vrExitBtn = document.getElementById('vr-exit-button');
    if (vrExitBtn) {
      vrExitBtn.addEventListener('click', () => this.exitVR());
    }
  }

  setupControllers() {
    const renderer = this.sceneManager.getRenderer();
    if (!renderer) return;

    // Setup controller 0 (left)
    const controller0 = renderer.xr.getController(0);
    controller0.addEventListener('selectstart', () => this.onControllerSelectStart(0));
    controller0.addEventListener('selectend', () => this.onControllerSelectEnd(0));
    this.sceneManager.getScene().add(controller0);
    this.controllers[0] = controller0;

    // Setup controller 1 (right)
    const controller1 = renderer.xr.getController(1);
    controller1.addEventListener('selectstart', () => this.onControllerSelectStart(1));
    controller1.addEventListener('selectend', () => this.onControllerSelectEnd(1));
    this.sceneManager.getScene().add(controller1);
    this.controllers[1] = controller1;

    // Controller models
    const controllerModelFactory = new XRControllerModelFactory();
    
    const grip0 = renderer.xr.getControllerGrip(0);
    grip0.add(controllerModelFactory.createControllerModel(grip0));
    this.sceneManager.getScene().add(grip0);
    this.controllerGrips[0] = grip0;
    
    const grip1 = renderer.xr.getControllerGrip(1);
    grip1.add(controllerModelFactory.createControllerModel(grip1));
    this.sceneManager.getScene().add(grip1);
    this.controllerGrips[1] = grip1;

    // Add laser pointers
    this.addLaserPointer(controller0);
    this.addLaserPointer(controller1);
  }

  addLaserPointer(controller) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.5,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    line.scale.z = 10;
    line.name = 'laser';
    controller.add(line);
  }

  async enterVR() {
    if (!this.isSupported || this.isPresenting) return;

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'layers']
      });

      const renderer = this.sceneManager.getRenderer();
      await renderer.xr.setSession(session);
      
      this.session = session;
      this.isPresenting = true;
      
      session.addEventListener('end', this.onSessionEnded);
      
      // Setup VR scene based on mode
      this.setupVRScene();
      
      console.log('VR session started');
      
    } catch (error) {
      console.error('Failed to enter VR:', error);
    }
  }

  async exitVR() {
    if (this.session) {
      await this.session.end();
    }
  }

  onSessionStarted() {
    console.log('XR session started');
  }

  onSessionEnded() {
    this.session = null;
    this.isPresenting = false;
    
    // Cleanup VR scene
    this.cleanupVRScene();
    
    console.log('VR session ended');
  }

  onSelect(event) {
    // Handle controller select (trigger pull)
    console.log('Controller select:', event);
  }

  onControllerSelectStart(index) {
    console.log('Controller', index, 'select start');
    
    // Visual feedback
    const controller = this.controllers[index];
    const laser = controller.getObjectByName('laser');
    if (laser) {
      laser.material.opacity = 1;
      laser.material.color.setHex(0xff00a0);
    }
  }

  onControllerSelectEnd(index) {
    console.log('Controller', index, 'select end');
    
    // Reset visual
    const controller = this.controllers[index];
    const laser = controller.getObjectByName('laser');
    if (laser) {
      laser.material.opacity = 0.5;
      laser.material.color.setHex(0x00d4ff);
    }
  }

  setupVRScene() {
    const vrMode = this.settings.get('vrMode');
    
    if (vrMode === '2d-flat') {
      this.setupFlatScreenMode();
    } else {
      this.setupImmersiveMode();
    }
  }

  setupFlatScreenMode() {
    // Create a flat screen in 3D space for 2D gameplay
    const screenSize = this.settings.get('vrScreenSize') || 1.5;
    const screenDistance = this.settings.get('vrScreenDistance') || 2;
    const screenCurve = this.settings.get('vrScreenCurve') || 0.3;
    
    // Create curved screen
    const width = 16 * screenSize;
    const height = 9 * screenSize;
    const radius = width / screenCurve;
    
    const geometry = new THREE.CylinderGeometry(
      radius, radius, height, 32, 1, true, -Math.PI / 4, Math.PI / 2
    );
    
    // Create render target for the screen
    this.screenRenderTarget = new THREE.WebGLRenderTarget(1920, 1080);
    
    const material = new THREE.MeshBasicMaterial({
      map: this.screenRenderTarget.texture
    });
    
    this.flatScreen = new THREE.Mesh(geometry, material);
    this.flatScreen.position.set(0, 1.6, -screenDistance);
    this.flatScreen.rotation.y = Math.PI;
    this.flatScreen.scale.set(-1, 1, 1);
    
    this.sceneManager.getScene().add(this.flatScreen);
    
    // Move camera to look at screen
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 1.6, 0);
    camera.lookAt(0, 1.6, -screenDistance);
  }

  setupImmersiveMode() {
    // Beat Saber-style immersive environment
    // The lanes are already set up in the scene
    // Position the player appropriately
    
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 1.6, 5);
    camera.lookAt(0, 1, -5);
    
    // Add additional VR environment elements
    this.createVREnvironment();
  }

  createVREnvironment() {
    // Create a tunnel effect
    const tunnelGeometry = new THREE.CylinderGeometry(10, 10, 50, 32, 1, true);
    const tunnelMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0a1a,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide
    });
    const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    tunnel.position.set(0, 1.6, -10);
    tunnel.rotation.x = Math.PI / 2;
    this.sceneManager.getScene().add(tunnel);
    this.tunnel = tunnel;
    
    // Add energy walls (like Beat Saber)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 8;
      const y = 1.6 + Math.sin(angle) * 5;
      
      const wallGeometry = new THREE.PlaneGeometry(2, 8);
      const wallMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00d4ff : 0xff00a0,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(x, y, -10);
      wall.lookAt(0, 1.6, -10);
      this.sceneManager.getScene().add(wall);
    }
  }

  cleanupVRScene() {
    if (this.flatScreen) {
      this.sceneManager.getScene().remove(this.flatScreen);
      this.flatScreen.geometry.dispose();
      this.flatScreen.material.dispose();
      this.flatScreen = null;
    }
    
    if (this.screenRenderTarget) {
      this.screenRenderTarget.dispose();
      this.screenRenderTarget = null;
    }
    
    if (this.tunnel) {
      this.sceneManager.getScene().remove(this.tunnel);
      this.tunnel = null;
    }
    
    // Reset camera
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, -5);
  }

  update(deltaTime) {
    if (!this.isPresenting) return;
    
    // Update controller tracking
    this.updateControllers();
    
    // Update VR-specific UI
    if (this.flatScreen) {
      this.updateFlatScreen();
    }
  }

  updateControllers() {
    // Get controller data
    const session = this.session;
    if (!session) return;
    
    const refSpace = session.renderState.baseLayer ? null : null;
    
    // Update raycaster for each controller
    this.controllers.forEach((controller, index) => {
      if (!controller) return;
      
      // Get controller position and direction
      controller.updateMatrixWorld();
      
      // Update laser length based on intersection
      const laser = controller.getObjectByName('laser');
      if (laser) {
        // Could raycast against UI elements here
        laser.scale.z = 10;
      }
    });
  }
  
  updateFlatScreen() {
    // Render the 2D view to the flat screen texture
    if (!this.screenRenderTarget) return;
    
    const renderer = this.sceneManager.getRenderer();
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    
    // Save current render target
    const currentRenderTarget = renderer.getRenderTarget();
    
    // Render to screen texture
    renderer.setRenderTarget(this.screenRenderTarget);
    renderer.render(scene, camera);
    
    // Restore render target
    renderer.setRenderTarget(currentRenderTarget);
  }

  // Get controller positions for gameplay
  getControllerPositions() {
    return this.controllers.map(controller => {
      if (!controller) return null;
      const pos = new THREE.Vector3();
      controller.getWorldPosition(pos);
      return pos;
    });
  }

  // Check if a controller is inside a note's hit box (for 3D touching)
  checkControllerNoteIntersection(notePosition, noteSize) {
    const controllerPositions = this.getControllerPositions();
    
    for (const pos of controllerPositions) {
      if (!pos) continue;
      
      const distance = pos.distanceTo(notePosition);
      if (distance < noteSize) {
        return true;
      }
    }
    
    return false;
  }
}
