/**
 * The Deep Dive Configuration
 * Easy-to-edit depth mapping, zones, anchors, and story triggers.
 */

export const TOTAL_FRAMES = 525;
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
export const PRELOAD_INITIAL_COUNT = 90;
export const DESKTOP_WINDOW_SIZE = 60;
export const MOBILE_WINDOW_SIZE = 25;

export const FRAME_PATH = (frameIndex) =>
  `/frames/deep/deep_${String(frameIndex).padStart(4, '0')}.jpg`;

/**
 * Depth anchors:
 * frame 1 = 0 m
 * frame 144 = 200 m
 * frame 287 = 1000 m
 * frame 430 = 4000 m
 * frame 525 = 6000 m
 */
export const depthAnchors = [
  { frame: 1, depth: 0 },
  { frame: 144, depth: 200 },
  { frame: 287, depth: 1000 },
  { frame: 430, depth: 4000 },
  { frame: 525, depth: 6000 },
];

/**
 * Zones:
 * Sunlight 0-200 m
 * Twilight 200-1000 m
 * Midnight 1000-4000 m
 * Abyss 4000 m+
 */
export const zones = [
  {
    id: 'sunlight',
    name: 'Sunlight',
    scientific: 'Epipelagic Zone',
    minDepth: 0,
    maxDepth: 200,
    depthRangeText: '0 – 200 m',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    accent: '#ffcc4d',
    vignetteIntensity: 0.15,
    snowDensity: 0.15,
  },
  {
    id: 'twilight',
    name: 'Twilight',
    scientific: 'Mesopelagic Zone',
    minDepth: 200,
    maxDepth: 1000,
    depthRangeText: '200 – 1,000 m',
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    accent: '#38bdf8',
    vignetteIntensity: 0.45,
    snowDensity: 0.45,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    scientific: 'Bathypelagic Zone',
    minDepth: 1000,
    maxDepth: 4000,
    depthRangeText: '1,000 – 4,000 m',
    color: '#1e3a8a',
    glowColor: 'rgba(59, 130, 246, 0.35)',
    accent: '#818cf8',
    vignetteIntensity: 0.75,
    snowDensity: 0.75,
  },
  {
    id: 'abyss',
    name: 'Abyss',
    scientific: 'Abyssopelagic Zone',
    minDepth: 4000,
    maxDepth: 6000,
    depthRangeText: '4,000 – 6,000 m',
    color: '#4338ca',
    glowColor: 'rgba(129, 140, 248, 0.5)',
    accent: '#ffcc4d',
    vignetteIntensity: 0.95,
    snowDensity: 1.0,
  },
];

/**
 * Creature facts and narrative cards positioned across zones
 */
export const creatureCards = [
  {
    id: 'surface-intro',
    zoneId: 'sunlight',
    frameStart: 1,
    frameEnd: 70,
    depthTarget: 50,
    tag: 'SURFACE DESCENT',
    title: 'The Deep Dive',
    subtitle: 'Begin your journey into Earth\'s last frontier',
    description:
      'Scroll downwards to dive through light, twilight, and total darkness into the abyssal trenches.',
  },
  {
    id: 'creature-turtle',
    zoneId: 'sunlight',
    frameStart: 75,
    frameEnd: 140,
    depthTarget: 160,
    tag: 'EPIPELAGIC CREATURE • 160 m',
    title: 'Green Sea Turtle',
    latin: 'Chelonia mydas',
    badge: 'Sunlight Wanderer',
    description:
      'Gliding gracefully through sun-drenched waters, these ancient reptiles can slow their heart rate to one beat every nine minutes during deep foraging dives.',
  },
  {
    id: 'creature-jellyfish',
    zoneId: 'twilight',
    frameStart: 180,
    frameEnd: 260,
    depthTarget: 650,
    tag: 'MESOPELAGIC CREATURE • 650 m',
    title: 'Bioluminescent Jellyfish',
    latin: 'Atolla wyvillei & Ctenophora',
    badge: 'Twilight Pulsar',
    description:
      'Where sunlight fades to a faint cobalt haze, comb jellies use rows of oscillating cilia to scatter cold bioluminescent light, flashing bright rings to deter shadowy predators.',
  },
  {
    id: 'creature-anglerfish',
    zoneId: 'midnight',
    frameStart: 310,
    frameEnd: 400,
    depthTarget: 2600,
    tag: 'BATHYPELAGIC CREATURE • 2,600 m',
    title: 'Deep Sea Anglerfish',
    latin: 'Melanocetus johnsonii',
    badge: 'Midnight Stalker',
    description:
      'In pitch-black waters under bone-crushing pressure, the female anglerfish dangles an esca beacon glowing with symbiotic bioluminescent bacteria to lure starving prey.',
  },
  {
    id: 'creature-gulpereel',
    zoneId: 'abyss',
    frameStart: 440,
    frameEnd: 505,
    depthTarget: 4800,
    tag: 'ABYSSOPELAGIC CREATURE • 4,800 m',
    title: 'Pelican Gulper Eel',
    latin: 'Eurypharynx pelecanoides',
    badge: 'Abyssal Titan',
    description:
      'Reigning over the midnight abyss at 500 atmospheres of pressure, its cavernous, pouch-like jaws unhinge to engulf prey twice its body mass in a single strike.',
  },
  {
    id: 'bottom-achievement',
    zoneId: 'abyss',
    frameStart: 512,
    frameEnd: 525,
    depthTarget: 6000,
    tag: 'HYDROTHERMAL TRENCH • 6,000 m',
    title: 'You Reached The Bottom',
    subtitle: 'Abyssal Bedrock Explored',
    description:
      'You have touched down at 6,000 meters. The pressure is 600 times atmospheric level. Record your expedition in the global explorer ledger.',
  },
];

/**
 * Interpolates depth linearly between depthAnchors based on frame index.
 * @param {number} frame - Frame number from 1 to 525
 * @returns {number} Interpolated depth in meters
 */
export function getDepthForFrame(frame) {
  const clampedFrame = Math.max(1, Math.min(TOTAL_FRAMES, frame));

  for (let i = 0; i < depthAnchors.length - 1; i++) {
    const a = depthAnchors[i];
    const b = depthAnchors[i + 1];

    if (clampedFrame >= a.frame && clampedFrame <= b.frame) {
      const progress = (clampedFrame - a.frame) / (b.frame - a.frame);
      return a.depth + progress * (b.depth - a.depth);
    }
  }

  return 6000;
}

/**
 * Returns matching zone object for a given depth in meters.
 * @param {number} depth
 * @returns {typeof zones[0]}
 */
export function getZoneForDepth(depth) {
  for (const z of zones) {
    if (depth >= z.minDepth && depth < z.maxDepth) {
      return z;
    }
  }
  return zones[zones.length - 1];
}
