import * as THREE from 'three';

export class ParticleLayer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.snowPoints = null;
    this.snowGeometry = null;
    this.snowMaterial = null;
    this.snowCount = 1800;

    this.scrollVelocity = 0;
    this.targetVelocity = 0;
    this.depthRatio = 0; // 0 (surface) to 1 (abyss)
    this.clock = new THREE.Clock();
    this.animationFrameId = null;

    if (!this.reducedMotion) {
      this.init();
    }
  }

  createParticleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    // Marine snow has soft glowing center and feathered falloff
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(210, 240, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(140, 200, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  init() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.z = 40;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.initMarineSnow();

    this.startLoop();
  }

  initMarineSnow() {
    this.snowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.snowCount * 3);
    const scales = new Float32Array(this.snowCount);
    const wanderPhases = new Float32Array(this.snowCount);

    for (let i = 0; i < this.snowCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      scales[i] = 1.2 + Math.random() * 2.8;
      wanderPhases[i] = Math.random() * Math.PI * 2;
    }

    this.snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.snowGeometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    this.snowWanderPhases = wanderPhases;

    this.snowMaterial = new THREE.PointsMaterial({
      size: 2.2,
      map: this.createParticleTexture(),
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.snowPoints = new THREE.Points(this.snowGeometry, this.snowMaterial);
    this.scene.add(this.snowPoints);
  }

  setVelocity(vel) {
    // Lenis velocity is pixels/s; normalize for 3D units
    this.targetVelocity = vel * 0.005;
  }

  setDepthRatio(ratio) {
    this.depthRatio = Math.max(0, Math.min(1, ratio));
  }

  startLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (this.reducedMotion) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // Smooth scroll velocity damping
      this.scrollVelocity += (this.targetVelocity - this.scrollVelocity) * 0.1;
      this.targetVelocity *= 0.92;

      // Base upward drift plus velocity influence
      const upwardSpeed = 0.05 + Math.abs(this.scrollVelocity) * 0.4;

      // Update Marine Snow
      if (this.snowGeometry && this.snowPoints) {
        const pos = this.snowGeometry.attributes.position.array;
        const count = this.snowCount;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          // Upward drift as descending
          pos[idx + 1] += upwardSpeed;

          // Gentle lateral sway
          const phase = this.snowWanderPhases[i];
          pos[idx + 0] += Math.sin(time * 0.8 + phase) * 0.015;

          // Wrap boundaries
          if (pos[idx + 1] > 40) {
            pos[idx + 1] = -40;
            pos[idx + 0] = (Math.random() - 0.5) * 80;
          }
        }
        this.snowGeometry.attributes.position.needsUpdate = true;

        // Density & opacity scales with depth (sparse at surface 0.2, dense in abyss 0.85)
        const targetOpacity = 0.2 + this.depthRatio * 0.65;
        this.snowMaterial.opacity += (targetOpacity - this.snowMaterial.opacity) * 0.05;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
