import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
  TOTAL_FRAMES,
  FRAME_WIDTH,
  FRAME_HEIGHT,
  getDepthForFrame,
  getZoneForDepth,
  creatureCards,
} from './config.js';
import { FrameLoader } from './frameLoader.js';
import { fetchTopScores, submitScore } from './api.js';

gsap.registerPlugin(ScrollTrigger);

class DeepDiveApp {
  constructor() {
    this.canvas = document.getElementById('canvas-frames');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.viewportEl = document.getElementById('pinned-viewport');
    this.vignetteEl = document.getElementById('vignette-overlay');

    // UI elements
    this.loaderScreen = document.getElementById('loading-screen');
    this.progressBar = document.getElementById('loader-progress-bar');
    this.percentText = document.getElementById('loader-percent-text');

    this.depthNumEl = document.getElementById('hud-depth-number');
    this.depthFeetEl = document.getElementById('hud-depth-feet');
    this.topDepthEl = document.getElementById('hud-top-depth');
    this.zoneNameEl = document.getElementById('hud-zone-name');
    this.zoneSubEl = document.getElementById('hud-zone-sub');
    this.depthComputerEl = document.getElementById('depth-computer');
    this.gaugeFillBar = document.getElementById('gauge-fill-bar');
    this.gaugeCursor = document.getElementById('gauge-cursor');
    this.telemPressure = document.getElementById('telem-pressure');
    this.telemTemp = document.getElementById('telem-temp');
    this.badgeRecord = document.getElementById('badge-record-depth');

    // Modal elements
    this.modalBackdrop = document.getElementById('leaderboard-modal');
    this.btnModalToggle = document.getElementById('btn-leaderboard-toggle');
    this.btnModalClose = document.getElementById('btn-modal-close');
    this.btnModalCloseFooter = document.getElementById('btn-modal-close-footer');
    this.leaderboardTbody = document.getElementById('leaderboard-tbody');
    this.summaryMaxDepth = document.getElementById('summary-max-depth');
    this.summaryMaxZone = document.getElementById('summary-max-zone');

    // Submission form
    this.submitForm = document.getElementById('form-submit-score');
    this.inputDiverName = document.getElementById('input-diver-name');
    this.submitFeedback = document.getElementById('submit-feedback');
    this.btnViewBoardBottom = document.getElementById('btn-view-board-bottom');

    // Cards
    this.cards = Array.from(document.querySelectorAll('.story-card'));

    // State
    this.frameLoader = new FrameLoader();
    this.lenis = null;
    this.currentRenderedFrame = -1;
    this.currentZoneId = 'sunlight';
    this.sessionMaxDepth = 0;
    this.hasShakenZones = new Set();
    this.isSubmitting = false;

    this.init();
  }

  async init() {
    this.setupCanvasSize();
    window.addEventListener('resize', () => this.handleResize());

    // Setup event listeners for modals & forms
    this.setupInteractions();

    // Preload first 90 frames
    try {
      await this.frameLoader.preloadInitial((percent) => {
        this.progressBar.style.width = `${percent}%`;
        this.percentText.textContent = `${percent}%`;
      });
    } catch (e) {
      console.error('Preload error:', e);
    }

    // Hide loading screen
    setTimeout(() => {
      this.loaderScreen.classList.add('hidden');
      this.initScrollEngine();
      this.renderFrame(1);
      this.updateTelemetry(0, 1);
    }, 400);

    // Initial fetch of leaderboard
    this.refreshLeaderboard();
  }

  setupCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.scale(dpr, dpr);
  }

  handleResize() {
    this.setupCanvasSize();
    if (this.currentRenderedFrame > 0) {
      this.forceRedraw(this.currentRenderedFrame);
    }
    ScrollTrigger.refresh();
  }

  initScrollEngine() {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Initialize Lenis smooth scroll
    this.lenis = new Lenis({
      duration: isReduced ? 0.1 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    this.lenis.on('scroll', () => {
      ScrollTrigger.update();
    });

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // GSAP ScrollTrigger mapped to 8 screens
    ScrollTrigger.create({
      trigger: '#scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.05,
      onUpdate: (self) => {
        this.handleScrollProgress(self.progress);
      },
    });
  }

  handleScrollProgress(progress) {
    const rawFrame = 1 + progress * (TOTAL_FRAMES - 1);
    const targetFrame = Math.round(rawFrame);

    // Only draw when the frame index changes
    if (targetFrame !== this.currentRenderedFrame) {
      this.renderFrame(targetFrame);
    }

    const depth = getDepthForFrame(rawFrame);
    this.updateTelemetry(depth, progress);
    this.updateStoryCards(targetFrame);
  }

  renderFrame(frameIndex) {
    const img = this.frameLoader.getFrame(frameIndex);
    if (!img) return;

    this.drawCoverFit(img);
    this.currentRenderedFrame = frameIndex;
  }

  forceRedraw(frameIndex) {
    const img = this.frameLoader.getFrame(frameIndex);
    if (img) {
      this.drawCoverFit(img);
    }
  }

  drawCoverFit(img) {
    if (!img.complete || img.naturalWidth === 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const iw = img.naturalWidth || FRAME_WIDTH;
    const ih = img.naturalHeight || FRAME_HEIGHT;

    const ratio = Math.max(w / iw, h / ih);
    const nw = iw * ratio;
    const nh = ih * ratio;
    const cx = (w - nw) / 2;
    const cy = (h - nh) / 2;

    this.ctx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
  }

  updateTelemetry(depth, progress) {
    // Session max depth tracking
    if (depth > this.sessionMaxDepth) {
      this.sessionMaxDepth = Math.round(depth);
      this.badgeRecord.textContent = `${this.sessionMaxDepth}m`;
      this.summaryMaxDepth.textContent = `${this.sessionMaxDepth.toLocaleString()} m`;
    }

    // Digital readout
    const roundedDepth = Math.round(depth);
    this.depthNumEl.textContent = roundedDepth.toLocaleString();
    this.topDepthEl.textContent = `${roundedDepth.toLocaleString()} m`;

    const feet = Math.round(depth * 3.28084);
    this.depthFeetEl.textContent = `${feet.toLocaleString()} ft`;

    // Vertical gauge fill and cursor
    const gaugePercent = Math.min(100, Math.max(0, progress * 100));
    this.gaugeFillBar.style.height = `${gaugePercent}%`;
    this.gaugeCursor.style.top = `${gaugePercent}%`;

    // Pressure & temperature calculations
    const atm = 1 + depth / 10;
    this.telemPressure.textContent = `${atm.toFixed(1)} atm`;

    // Ocean thermocline: 24.5C at surface down to ~1.8C at deep abyss
    const temp = Math.max(1.8, 24.5 - (depth / 6000) * 22.7);
    this.telemTemp.textContent = `${temp.toFixed(1)} °C`;

    // Current zone check & transitions
    const zone = getZoneForDepth(depth);
    if (zone.id !== this.currentZoneId) {
      this.handleZoneTransition(zone);
    }

    // Dynamic vignette opacity
    const baseVignette = 0.2 + (depth / 6000) * 0.75;
    this.vignetteEl.style.opacity = baseVignette.toFixed(2);
  }

  handleZoneTransition(newZone) {
    const prevZoneId = this.currentZoneId;
    this.currentZoneId = newZone.id;

    // Slide text transition for zone name
    this.zoneNameEl.classList.add('transitioning');
    setTimeout(() => {
      this.zoneNameEl.textContent = newZone.name.toUpperCase();
      this.zoneSubEl.textContent = `${newZone.scientific} • ${newZone.depthRangeText}`;
      this.zoneNameEl.classList.remove('transitioning');
    }, 180);

    // Update depth computer zone accent
    this.depthComputerEl.className = `depth-computer zone-accent-${newZone.id}`;
    this.summaryMaxZone.textContent = newZone.name;

    // Gentle screen shake on entering a new zone (once per direction/crossing)
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isReduced && !this.hasShakenZones.has(newZone.id) && prevZoneId !== newZone.id) {
      this.hasShakenZones.add(newZone.id);
      this.triggerScreenShake();
    }
  }

  triggerScreenShake() {
    this.viewportEl.classList.remove('shake-effect');
    // Force DOM reflow
    void this.viewportEl.offsetWidth;
    this.viewportEl.classList.add('shake-effect');
    setTimeout(() => {
      this.viewportEl.classList.remove('shake-effect');
    }, 500);
  }

  updateStoryCards(currentFrame) {
    // Match card by frame window
    this.cards.forEach((card) => {
      const cardId = card.getAttribute('data-card');
      const cardConfig = creatureCards.find((c) => c.id === cardId);
      if (!cardConfig) return;

      const inRange = currentFrame >= cardConfig.frameStart && currentFrame <= cardConfig.frameEnd;
      if (inRange && !card.classList.contains('active')) {
        card.classList.add('active');
      } else if (!inRange && card.classList.contains('active')) {
        card.classList.remove('active');
      }
    });
  }

  setupInteractions() {
    // Leaderboard modal open/close
    this.btnModalToggle.addEventListener('click', () => this.openLeaderboard());
    this.btnModalClose.addEventListener('click', () => this.closeLeaderboard());
    this.btnModalCloseFooter.addEventListener('click', () => this.closeLeaderboard());
    this.btnViewBoardBottom.addEventListener('click', () => this.openLeaderboard());

    this.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) {
        this.closeLeaderboard();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalBackdrop.classList.contains('open')) {
        this.closeLeaderboard();
      }
    });

    // Score submission form
    this.submitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;

      const name = this.inputDiverName.value.trim();
      if (!name) return;

      this.isSubmitting = true;
      this.submitFeedback.className = 'submit-feedback';
      this.submitFeedback.textContent = 'Recording expedition...';

      try {
        const recordedDepth = Math.max(6000, this.sessionMaxDepth);
        await submitScore(name, recordedDepth);

        this.submitFeedback.className = 'submit-feedback success';
        this.submitFeedback.textContent = `Descent confirmed! ${recordedDepth}m logged for ${name}.`;
        this.inputDiverName.value = '';

        // Auto open leaderboard after short delay
        setTimeout(() => {
          this.openLeaderboard();
        }, 800);
      } catch (err) {
        this.submitFeedback.className = 'submit-feedback error';
        this.submitFeedback.textContent = err.message || 'Error saving score. Please retry.';
      } finally {
        this.isSubmitting = false;
      }
    });
  }

  async openLeaderboard() {
    this.modalBackdrop.classList.add('open');
    this.modalBackdrop.setAttribute('aria-hidden', 'false');
    await this.refreshLeaderboard();
  }

  closeLeaderboard() {
    this.modalBackdrop.classList.remove('open');
    this.modalBackdrop.setAttribute('aria-hidden', 'true');
  }

  async refreshLeaderboard() {
    try {
      const scores = await fetchTopScores();
      this.renderLeaderboardTable(scores);
    } catch (e) {
      console.warn('Leaderboard load error:', e);
    }
  }

  renderLeaderboardTable(scores) {
    if (!scores || !Array.isArray(scores)) return;

    this.leaderboardTbody.innerHTML = '';

    scores.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rank = index + 1;

      let rankClass = '';
      let rankBadge = `#${rank}`;
      if (rank === 1) {
        rankClass = 'rank-gold';
        rankBadge = '🥇 #1';
      } else if (rank === 2) {
        rankClass = 'rank-silver';
        rankBadge = '🥈 #2';
      } else if (rank === 3) {
        rankClass = 'rank-bronze';
        rankBadge = '🥉 #3';
      }

      const formattedDepth = `${Math.round(item.maxDepth).toLocaleString()} m`;
      const dateStr = item.createdAt ? item.createdAt.split('T')[0] || item.createdAt.split(' ')[0] : 'Today';

      tr.innerHTML = `
        <td class="${rankClass}">${rankBadge}</td>
        <td><strong>${this.escapeHtml(item.name)}</strong></td>
        <td class="gold-text">${formattedDepth}</td>
        <td>${dateStr}</td>
      `;

      this.leaderboardTbody.appendChild(tr);
    });
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Start app once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new DeepDiveApp();
});
