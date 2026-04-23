/**
 * Scene Manager
 * Handles Three.js scene, camera, renderer, and 3D objects
 */

import * as THREE from 'three';

export class SceneManager {
  constructor(settings) {
    this.settings = settings;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    
    // Game objects
    this.lanes = [];
    this.notes = [];
    this.particles = [];
    
    // Environment
    this.environment = null;
    this.lighting = null;
    
    // Animation
    this.clock = new THREE.Clock();
    
    // Render settings
    this.renderScale = 1.0;
    this.qualitySettings = null;
  }

  async init() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      throw new Error('Game canvas not found');
    }

    // Get quality settings
    this.qualitySettings = this.settings.getQualitySettings();
    this.renderScale = this.settings.get('renderScale') || 1.0;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, -5);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.qualitySettings.antialias,
      alpha: false,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.qualitySettings.pixelRatio)
    );
    this.renderer.setClearColor(0x0a0a0f);
    
    // Configure rendering quality
    if (this.qualitySettings.shadowMapSize > 0) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Setup environment
    this.setupEnvironment();
    this.setupLighting();
    this.setupLanes();
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Listen for settings changes
    window.addEventListener('settingsChanged', () => this.handleSettingsChanged());
    window.addEventListener('energySaveChanged', () => this.handleEnergySaveChanged());

    console.log('Scene Manager initialized');
  }

  setupEnvironment() {
    // Create a futuristic environment
    // Grid floor
    const gridHelper = new THREE.GridHelper(50, 50, 0x00d4ff, 0x1a1a2e);
    gridHelper.position.y = -1;
    gridHelper.position.z = -5;
    this.scene.add(gridHelper);

    // Animated grid lines
    if (this.qualitySettings.effects) {
      for (let i = 0; i < 10; i++) {
        const geometry = new THREE.PlaneGeometry(50, 0.1);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.3
        });
        const line = new THREE.Mesh(geometry, material);
        line.position.set(0, -1, -i * 5);
        line.rotation.x = -Math.PI / 2;
        this.scene.add(line);
      }
    }

    // Starfield background
    if (this.qualitySettings.particleCount > 0) {
      const starGeometry = new THREE.BufferGeometry();
      const starCount = Math.min(this.qualitySettings.particleCount, 500);
      const positions = new Float32Array(starCount * 3);
      
      for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 100;
        positions[i + 1] = (Math.random() - 0.5) * 50;
        positions[i + 2] = (Math.random() - 0.5) * 100 - 20;
      }
      
      starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
      });
      
      const stars = new THREE.Points(starGeometry, starMaterial);
      this.scene.add(stars);
      this.stars = stars;
    }
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    
    if (this.qualitySettings.shadowMapSize > 0) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = this.qualitySettings.shadowMapSize;
      dirLight.shadow.mapSize.height = this.qualitySettings.shadowMapSize;
    }
    
    this.scene.add(dirLight);

    // Colored accent lights
    const cyanLight = new THREE.PointLight(0x00d4ff, 2, 20);
    cyanLight.position.set(-5, 5, -5);
    this.scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00a0, 2, 20);
    magentaLight.position.set(5, 5, -5);
    this.scene.add(magentaLight);

    this.lights = { ambient: ambientLight, directional: dirLight, cyan: cyanLight, magenta: magentaLight };
  }

  setupLanes() {
    // Create lane geometry (4 lanes default)
    const laneCount = 4;
    const laneWidth = 1.5;
    const laneDepth = 20;
    
    for (let i = 0; i < laneCount; i++) {
      // Lane surface
      const geometry = new THREE.PlaneGeometry(laneWidth - 0.1, laneDepth);
      const material = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.7,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.1
      });
      
      const lane = new THREE.Mesh(geometry, material);
      const x = (i - (laneCount - 1) / 2) * laneWidth;
      lane.position.set(x, -0.9, -5);
      lane.rotation.x = -Math.PI / 2;
      
      if (this.qualitySettings.shadowMapSize > 0) {
        lane.receiveShadow = true;
      }
      
      this.scene.add(lane);
      this.lanes.push(lane);

      // Lane separators
      if (i < laneCount - 1) {
        const sepGeometry = new THREE.BoxGeometry(0.05, 0.1, laneDepth);
        const sepMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.3
        });
        const separator = new THREE.Mesh(sepGeometry, sepMaterial);
        separator.position.set(x + laneWidth / 2, -0.85, -5);
        this.scene.add(separator);
      }
    }

    // Hit line
    const hitLineGeometry = new THREE.BoxGeometry(laneCount * laneWidth, 0.05, 0.1);
    const hitLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00a0,
      transparent: true,
      opacity: 0.8
    });
    const hitLine = new THREE.Mesh(hitLineGeometry, hitLineMaterial);
    hitLine.position.set(0, -0.85, 2);
    this.scene.add(hitLine);
    this.hitLine = hitLine;
  }

  createNote(lane, time, type = 'tap') {
    const laneWidth = 1.5;
    const x = (lane - 1.5) * laneWidth;
    
    let geometry, material;
    
    switch (type) {
      case 'tap':
        geometry = new THREE.BoxGeometry(1.3, 0.2, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: 0x00d4ff,
          emissive: 0x00d4ff,
          emissiveIntensity: 0.5
        });
        break;
      case 'hold':
        geometry = new THREE.BoxGeometry(1.3, 0.2, 1);
        material = new THREE.MeshStandardMaterial({
          color: 0xff00a0,
          emissive: 0xff00a0,
          emissiveIntensity: 0.5
        });
        break;
      default:
        geometry = new THREE.BoxGeometry(1.3, 0.2, 0.5);
        material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    }
    
    const note = new THREE.Mesh(geometry, material);
    note.position.set(x, 0, -15);
    note.userData = { lane, time, type, initialZ: -15 };
    
    if (this.qualitySettings.shadowMapSize > 0) {
      note.castShadow = true;
    }
    
    this.scene.add(note);
    this.notes.push(note);
    
    return note;
  }

  createHitEffect(lane, judgment) {
    if (!this.qualitySettings.effects) return;
    
    const colors = {
      perfect: 0x00ff88,
      great: 0x00d4ff,
      good: 0xffe600,
      miss: 0xff3366
    };
    
    const laneWidth = 1.5;
    const x = (lane - 1.5) * laneWidth;
    
    // Create particle burst
    const particleCount = Math.min(20, this.qualitySettings.particleCount / 10);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 2;
      
      velocities.push({
        x: (Math.random() - 0.5) * 5,
        y: Math.random() * 5,
        z: (Math.random() - 0.5) * 5
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: colors[judgment] || 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 1
    });
    
    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities, life: 1.0 };
    
    this.scene.add(particles);
    this.particles.push(particles);
  }

  updateNotes(songTime, scrollSpeed) {
    const approachTime = 2.0; // Time in seconds for note to travel
    const hitPositionZ = 2;
    const spawnPositionZ = -15;
    
    this.notes.forEach(note => {
      const timeUntilHit = note.userData.time - songTime;
      const progress = 1 - (timeUntilHit / approachTime);
      
      if (progress >= 0 && progress <= 1) {
        note.position.z = spawnPositionZ + (hitPositionZ - spawnPositionZ) * progress;
        note.visible = true;
      } else if (progress > 1) {
        note.visible = false;
      } else {
        note.visible = false;
      }
    });
  }

  removeNote(note) {
    this.scene.remove(note);
    const index = this.notes.indexOf(note);
    if (index > -1) {
      this.notes.splice(index, 1);
    }
    note.geometry.dispose();
    note.material.dispose();
  }

  clearNotes() {
    this.notes.forEach(note => {
      this.scene.remove(note);
      note.geometry.dispose();
      note.material.dispose();
    });
    this.notes = [];
  }

  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particles = this.particles[i];
      particles.userData.life -= deltaTime * 2;
      
      if (particles.userData.life <= 0) {
        this.scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      
      const positions = particles.geometry.attributes.position.array;
      
      for (let j = 0; j < particles.userData.velocities.length; j++) {
        const vel = particles.userData.velocities[j];
        positions[j * 3] += vel.x * deltaTime;
        positions[j * 3 + 1] += vel.y * deltaTime;
        positions[j * 3 + 2] += vel.z * deltaTime;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = particles.userData.life;
    }
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  handleSettingsChanged() {
    this.qualitySettings = this.settings.getQualitySettings();
    
    // Update renderer settings
    if (this.renderer) {
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, this.qualitySettings.pixelRatio)
      );
    }
  }

  handleEnergySaveChanged() {
    this.qualitySettings = this.settings.getQualitySettings();
    
    // Aggressive quality reduction for energy save
    if (this.renderer) {
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, this.qualitySettings.pixelRatio)
      );
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    const deltaTime = this.clock.getDelta();
    
    // Update particles
    this.updateParticles(deltaTime);
    
    // Animate stars
    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.02;
    }
    
    // Pulse hit line
    if (this.hitLine) {
      const pulse = 0.8 + Math.sin(performance.now() * 0.005) * 0.2;
      this.hitLine.material.opacity = pulse;
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getScene() {
    return this.scene;
  }
}
