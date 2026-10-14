import {
  TOTAL_FRAMES,
  PRELOAD_INITIAL_COUNT,
  DESKTOP_WINDOW_SIZE,
  MOBILE_WINDOW_SIZE,
  FRAME_PATH,
} from './config.js';

export class FrameLoader {
  constructor() {
    this.isMobile = this.detectMobile();
    this.step = this.isMobile ? 2 : 1;
    this.windowSize = this.isMobile ? MOBILE_WINDOW_SIZE : DESKTOP_WINDOW_SIZE;

    // Map<frameIndex, HTMLImageElement>
    this.cache = new Map();
    this.loadingSet = new Set();
    this.loadQueue = [];
    this.isProcessingQueue = false;
    this.currentFrame = 1;

    // Track total unique frames needed
    this.targetFrames = [];
    for (let i = 1; i <= TOTAL_FRAMES; i += this.step) {
      this.targetFrames.push(i);
    }
    // Ensure final frame 525 is always included
    if (!this.targetFrames.includes(TOTAL_FRAMES)) {
      this.targetFrames.push(TOTAL_FRAMES);
    }
  }

  detectMobile() {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth < 768 ||
      ('ontouchstart' in window && window.innerWidth <= 1024)
    );
  }

  /**
   * Preload initial frames (1 to 90) behind the loading screen
   * @param {(percent: number) => void} onProgress
   * @returns {Promise<void>}
   */
  async preloadInitial(onProgress) {
    const initialList = this.targetFrames.filter((f) => f <= PRELOAD_INITIAL_COUNT);
    const totalToLoad = initialList.length;
    let loadedCount = 0;

    const loadSingle = (frameIndex) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.cache.set(frameIndex, img);
          loadedCount++;
          if (onProgress) {
            const percent = Math.min(100, Math.round((loadedCount / totalToLoad) * 100));
            onProgress(percent);
          }
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`Failed to preload frame: ${frameIndex}`);
          loadedCount++;
          if (onProgress) {
            onProgress(Math.min(100, Math.round((loadedCount / totalToLoad) * 100)));
          }
          resolve(null);
        };
        img.src = FRAME_PATH(frameIndex);
      });
    };

    // Preload with concurrency of 6 to avoid browser socket stalls
    const concurrency = 6;
    for (let i = 0; i < initialList.length; i += concurrency) {
      const batch = initialList.slice(i, i + concurrency);
      await Promise.all(batch.map((f) => loadSingle(f)));
    }

    if (onProgress) onProgress(100);

    // Kick off background loader for remaining frames
    this.startBackgroundQueue();
  }

  /**
   * Starts non-blocking background queue for frames past initial batch
   */
  startBackgroundQueue() {
    const remaining = this.targetFrames.filter((f) => f > PRELOAD_INITIAL_COUNT);
    this.loadQueue = [...remaining];
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0) {
      // Prioritize frames closest to currentFrame
      this.loadQueue.sort((a, b) => {
        const distA = Math.abs(a - this.currentFrame);
        const distB = Math.abs(b - this.currentFrame);
        return distA - distB;
      });

      const nextFrame = this.loadQueue.shift();
      if (!nextFrame) break;

      if (!this.cache.has(nextFrame) && !this.loadingSet.has(nextFrame)) {
        await this.loadFrame(nextFrame);
      }

      // Small throttle yield to prevent main thread starvation
      await new Promise((r) => setTimeout(r, 20));
    }

    this.isProcessingQueue = false;
  }

  loadFrame(frameIndex) {
    if (this.cache.has(frameIndex)) return Promise.resolve(this.cache.get(frameIndex));
    if (this.loadingSet.has(frameIndex)) return Promise.resolve(null);

    this.loadingSet.add(frameIndex);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.loadingSet.delete(frameIndex);
        this.cache.set(frameIndex, img);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingSet.delete(frameIndex);
        console.warn(`Failed to load frame ${frameIndex}`);
        resolve(null);
      };
      img.src = FRAME_PATH(frameIndex);
    });
  }

  /**
   * Called on scroll/frame update.
   * Manages sliding window eviction and prioritizes nearby frames.
   * @param {number} rawFrame
   * @returns {HTMLImageElement | null} The closest ready image
   */
  getFrame(rawFrame) {
    const target = this.normalizeFrame(rawFrame);
    this.currentFrame = target;

    // Check sliding window eviction
    const maxDistance = this.windowSize * this.step;
    for (const [cachedIndex, img] of this.cache.entries()) {
      if (Math.abs(cachedIndex - target) > maxDistance) {
        // Release decoded image memory
        img.onload = null;
        img.onerror = null;
        img.src = '';
        this.cache.delete(cachedIndex);
      }
    }

    // Ensure immediate neighborhood [target - 8, target + 8] is requested
    const neighborhood = [];
    for (let d = -8; d <= 8; d++) {
      const f = this.normalizeFrame(target + d * this.step);
      if (f >= 1 && f <= TOTAL_FRAMES && !this.cache.has(f) && !this.loadingSet.has(f)) {
        neighborhood.push(f);
      }
    }

    if (neighborhood.length > 0) {
      // Put at front of queue
      this.loadQueue = [...new Set([...neighborhood, ...this.loadQueue])];
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    }

    // Return exact match if ready
    if (this.cache.has(target)) {
      return this.cache.get(target);
    }

    // If exact frame not loaded, find closest loaded frame to avoid black flickers
    let bestFrame = null;
    let minDistance = Infinity;

    for (const cachedIndex of this.cache.keys()) {
      const dist = Math.abs(cachedIndex - target);
      if (dist < minDistance) {
        minDistance = dist;
        bestFrame = cachedIndex;
      }
    }

    if (bestFrame !== null) {
      return this.cache.get(bestFrame);
    }

    return null;
  }

  normalizeFrame(frame) {
    const clamped = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(frame)));
    if (!this.isMobile) return clamped;
    // Mobile step of 2
    const stepped = Math.round((clamped - 1) / 2) * 2 + 1;
    return Math.min(TOTAL_FRAMES, Math.max(1, stepped));
  }
}
