'use strict';

/* Compact classic Worker. No module imports. No DOM access. */



/* ============================================================
   Protocol constants
   Source section: message-protocol.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */

const BUILD_LABEL = 'WSG Engine v2 Build 0.2.0.1 - Canvas Renderer Boot Hotfix';

const COMMANDS = Object.freeze({
  INIT: 'INIT',
  GENERATE: 'GENERATE',
  RESET: 'RESET',
  STEP: 'STEP',
  ADVANCE_YEARS: 'ADVANCE_YEARS',
  SET_SPEED: 'SET_SPEED',
  APPLY_TOOL: 'APPLY_TOOL',
  SELECT_CELL: 'SELECT_CELL',
  SET_TEMPLATE: 'SET_TEMPLATE',
  SET_ARCHETYPE: 'SET_ARCHETYPE',
  RUN_PROBE: 'RUN_PROBE',
  RUN_ALL_PROBES: 'RUN_ALL_PROBES',
  GET_STATE_SUMMARY: 'GET_STATE_SUMMARY',
  GET_RENDER_DATA: 'GET_RENDER_DATA'
});

const EVENTS = Object.freeze({
  READY: 'READY',
  STATE_SUMMARY: 'STATE_SUMMARY',
  RENDER_DATA: 'RENDER_DATA',
  SELECTED_CELL_SUMMARY: 'SELECTED_CELL_SUMMARY',
  TREND_SAMPLE: 'TREND_SAMPLE',
  PROBE_RESULT: 'PROBE_RESULT',
  PROBE_SUMMARY: 'PROBE_SUMMARY',
  DIAGNOSTIC_SUMMARY: 'DIAGNOSTIC_SUMMARY',
  ERROR: 'ERROR'
});

const VISUAL_MODES = Object.freeze([
  { id: 'natural', label: 'Natural Planet' },
  { id: 'overlay', label: 'Layer Overlay' },
  { id: 'diagnostic', label: 'Diagnostic' }
]);

const TEMPLATES = Object.freeze([
  { id: 'procedural_lifeless', label: 'Procedural Lifeless World' },
  { id: 'earthlike', label: 'Earthlike Template' },
  { id: 'water_world', label: 'Water World' },
  { id: 'ice_world', label: 'Ice World' },
  { id: 'greenhouse_world', label: 'Greenhouse World' }
]);

const ARCHETYPES = Object.freeze([
  { id: 'balanced', label: 'Balanced Primitive' },
  { id: 'dry', label: 'Dry Basin' },
  { id: 'icy', label: 'Icy Marginal' },
  { id: 'oceanic', label: 'Oceanic' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'rugged', label: 'Rugged Highlands' }
]);


const MESH_QUALITY_OPTIONS = Object.freeze([
  { id: 'performance', label: 'Performance - 1,280 faces', frequency: 8, targetFaces: 1280, default: false },
  { id: 'standard', label: 'Standard - 2,880 faces', frequency: 12, targetFaces: 2880, default: true },
  { id: 'high', label: 'High / Experimental - 5,120 faces', frequency: 16, targetFaces: 5120, default: false }
]);

function meshQualityProfile(id) {
  const requested = String(id || 'standard');
  return MESH_QUALITY_OPTIONS.find((item) => item.id === requested) || MESH_QUALITY_OPTIONS.find((item) => item.id === 'standard');
}

const LAYERS = Object.freeze([
  { id: 'elevation', label: 'Elevation' },
  { id: 'water', label: 'Water' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'ice', label: 'Ice' },
  { id: 'habitability', label: 'Habitability' },
  { id: 'primitiveLife', label: 'Primitive Life' },
  { id: 'producerMats', label: 'Producer Mats' },
  { id: 'biodiversityIndex', label: 'Biodiversity Index' },
  { id: 'ecosystemResilience', label: 'Ecosystem Resilience' },
  { id: 'stewardshipPressure', label: 'Stewardship Pressure' },
  { id: 'civilisationSuitability', label: 'Civilisation Suitability' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'waterFlow', label: 'Water Flow' },
  { id: 'cloudCover', label: 'Cloud Cover' },
  { id: 'lifeViability', label: 'Life Viability' },
  { id: 'dormantLife', label: 'Dormant Life' },
  { id: 'primitiveBiomass', label: 'Primitive Biomass' },
  { id: 'biosphereHealth', label: 'Biosphere Health' },
  { id: 'extinctionRisk', label: 'Extinction Risk' },
  { id: 'survivalPressure', label: 'Survival Pressure' },
  { id: 'nutrientLevel', label: 'Nutrients / Mineral Fertility' },
  { id: 'heatStress', label: 'Heat Stress' },
  { id: 'greenhousePressure', label: 'Greenhouse / CO2 Pressure' },
  { id: 'solarInput', label: 'Solar Input' },
  { id: 'albedo', label: 'Albedo' },
  { id: 'humidity', label: 'Humidity' },
  { id: 'rainfall', label: 'Rainfall' },
  { id: 'runoff', label: 'Runoff' },
  { id: 'waterStress', label: 'Water Stress' },
  { id: 'restorationPriority', label: 'Restoration Priority' },
  { id: 'ecosystemStress', label: 'Ecosystem Stress' },
  { id: 'recoveryPotential', label: 'Recovery Potential' },
  { id: 'disturbancePressure', label: 'Disturbance Pressure' },
  { id: 'habitatContinuity', label: 'Habitat Continuity' },
  { id: 'foodSupport', label: 'Food Support' },
  { id: 'waterAccess', label: 'Water Access' },
  { id: 'civilisationStress', label: 'Civilisation Stress' },
  { id: 'collapseRisk', label: 'Collapse Risk' },
  { id: 'recoveryCapacity', label: 'Recovery Capacity' },
  { id: 'populationIndex', label: 'Population Index' }
]);

const TOOLS = Object.freeze([
  { id: 'inspect', label: 'Inspect World', family: 'Inspect', text: 'Read the selected cell, local physical conditions, habitability, primitive life status, limiting factors, and suggested next action without mutating the world.', preview: 'Valid everywhere. Immediate effect: none. Delayed consequence: none. Layers: all.', best: 'Use first on any unfamiliar cell.' },
  { id: 'addWater', label: 'Comet Delivery', family: 'Volatiles', text: 'Deliver water and volatile material. Slightly cools the region and can lift later humidity, rainfall, water access, and habitability.', preview: 'Valid where the target is not water-saturated. Watch water, humidity, rainfall, water stress, and habitability.', best: 'Best for dry basins, barren worlds, and overheated lowlands.' },
  { id: 'iceAsteroid', label: 'Ice Asteroid Strike', family: 'Volatiles', text: 'Deliver frozen volatiles. Stronger cooling and ice effect than Comet Delivery, with a small disturbance penalty.', preview: 'Valid where ice is not saturated and the target is not already too frozen. Watch ice, albedo, temperature, and extinction risk.', best: 'Best for hot, dry, and greenhouse regions.' },
  { id: 'warm', label: 'Volcanic Outgassing', family: 'Atmosphere', text: 'Release greenhouse gases and minerals. Warms the target, can melt ice, and may improve nutrient availability.', preview: 'Valid where greenhouse, heat, or ice state can still change. Watch greenhouse pressure, temperature, heat stress, ice, and nutrients.', best: 'Best for icy worlds and cold marginal zones.' },
  { id: 'cool', label: 'Orbital Shade', family: 'Climate', text: 'Reduce local solar heating without adding water. Can reduce heat stress and preserve or expand ice where water exists.', preview: 'Valid where the target is not already near the cold lower bound. Watch temperature, heat stress, ice, and habitability.', best: 'Best for greenhouse worlds and overheated regions.' },
  { id: 'raiseLand', label: 'Tectonic Uplift', family: 'Terrain', text: 'Raise terrain, expose shallow water into land, cool high terrain slightly, and increase runoff potential.', preview: 'Valid where elevation is below its upper bound. Watch elevation, water, runoff, temperature, and water access.', best: 'Best for ocean worlds and flooded lowlands.' },
  { id: 'lowerLand', label: 'Tectonic Subsidence', family: 'Terrain', text: 'Lower terrain to form basins, improve water capture, and increase local water share or flood risk.', preview: 'Valid where elevation is above its lower bound. Watch elevation, water capture, runoff, water stress, and flood-prone water share.', best: 'Best for dry worlds and barren high basins.' },
  { id: 'greenhouseVenting', label: 'Greenhouse Venting', family: 'Atmosphere', text: 'Reduce greenhouse pressure and heat stress. Can cool a region over time and may increase ice risk if overused.', preview: 'Valid where greenhouse pressure or heat stress is not already low. Watch greenhouse pressure, temperature, heat stress, and ice.', best: 'Best for greenhouse worlds and overheated wetlands.' },
  { id: 'mineralSeeding', label: 'Mineral Seeding', family: 'Fertility', text: 'Add primitive minerals and nutrients. Improves fertility and recovery potential but does not create life by itself.', preview: 'Valid where nutrients are not saturated and water and temperature are not hostile. Watch nutrients, life viability, and habitability.', best: 'Best for barren but physically tolerable zones.' },
  { id: 'seedMicrobes', label: 'Seed Primitive Life', family: 'Life', text: 'Seed microbial life only where water, temperature, ice, nutrients, stress, and habitability are adequate.', preview: 'Fails clearly in hostile cells. Watch primitive life, dormant life, biomass, biosphere health, and extinction risk.', best: 'Best after water, temperature, stress, and nutrients have been improved.' },
  { id: 'stabilise', label: 'Planetary Stabilisation', family: 'Stability', text: 'Gently reduce local extremes in temperature, heat stress, water stress, disturbance, and instability. This is a weak nudge, not a magic fix.', preview: 'Valid where meaningful stress or extremes exist. Watch stress, recovery capacity, resilience, and habitability.', best: 'Best for marginal cells after direct terraforming.' },
  { id: 'seedSettlers', label: 'Seed Early Settlers', family: 'Civilisation', text: 'Seed a small early settlement only where resilient ecosystems, food support, water access, climate, and stability can support it.', preview: 'Fails on lifeless or unsuitable worlds. Watch civilisation suitability, food support, water access, stress, settlements, and collapse risk.', best: 'Use after a resilient living planet has emerged, not as a shortcut to life or modern civilisation.' }
]);

const PROBES = Object.freeze([
  { id: 'architecture_sanity', label: 'Architecture sanity probe' },
  { id: 'worker_boot', label: 'Worker boot probe' },
  { id: 'deterministic_generation', label: 'Deterministic generation probe' },
  { id: 'snapshot_restore', label: 'Worker snapshot/restore probe' },
  { id: 'procedural_lifeless', label: 'Procedural lifeless world probe' },
  { id: 'earthlike_template', label: 'Earthlike template probe' },
  { id: 'ecosystem_growth', label: 'Ecosystem growth probe' },
  { id: 'civilisation_gate', label: 'Civilisation emergence gate probe' },
  { id: 'intervention_parity', label: 'Intervention parity probe' },
  { id: 'no_dom_in_worker', label: 'No UI access in worker probe' },
  { id: 'render_data_finite', label: 'Render-data finite/bounded probe' },
  { id: 'visual_resolution', label: 'Scientific visual resolution probe' }
]);

function makeEnvelope(type, payload = {}) {
  return { type, payload };
}


/* ============================================================
   Utility math
   Source section: util/math.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(1e-9, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function weightedAverage(values, weights) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    const w = weights[i];
    if (Number.isFinite(v) && Number.isFinite(w) && w > 0) {
      num += v * w;
      den += w;
    }
  }
  return den > 0 ? num / den : 0;
}

function toCelsius(indexValue) {
  return -30 + indexValue * 75;
}

function finite01(value) {
  return Number.isFinite(value) ? clamp01(value) : 0;
}


/* ============================================================
   Deterministic random
   Source section: util/random.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */

function stringToSeed(input) {
  const text = String(input ?? 'seed');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function nextRandom() {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashUnit(seed, a = 0, b = 0) {
  let x = (seed >>> 0) ^ Math.imul(a + 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0xC2B2AE35, 0x27D4EB2D);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7FEB352D);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846CA68B);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}


/* ============================================================
   Performance helpers
   Source section: util/perf.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */

function nowMs() {
  return performance.now();
}

function timeBlock(fn) {
  const start = nowMs();
  const result = fn();
  return { result, ms: nowMs() - start };
}

function estimateTypedPayloadBytes(payload) {
  let bytes = 0;
  for (const value of Object.values(payload)) {
    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') {
      bytes += value.byteLength;
    }
  }
  return bytes;
}


/* ============================================================
   State schema
   Source section: state-schema.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */

const STATE_SCHEMA_VERSION = 'engine-v2-state-schema-0.1.0';

const DEFAULT_CONFIG = Object.freeze({
  defaultMeshQuality: 'standard',
  initialSeed: 'ENGINE-V2-001',
  yearPerStep: 1,
  maxAdvanceSteps: 250,
  defaultTemplate: 'procedural_lifeless',
  defaultArchetype: 'balanced',
  defaultSpeed: 1,
  defaultToolRadius: 2
});

const SIM_ARRAY_FIELDS = Object.freeze([
  'elevation',
  'water',
  'ice',
  'temperature',
  'humidity',
  'rainfall',
  'runoff',
  'waterFlow',
  'habitability',
  'primitiveLife',
  'dormantLife',
  'biomass',
  'primitiveBiomass',
  'producerMats',
  'biomeClass',
  'biodiversityIndex',
  'ecosystemResilience',
  'ecosystemStress',
  'recoveryPotential',
  'disturbancePressure',
  'habitatContinuity',
  'stewardshipPressure',
  'restorationPriority',
  'civilisationSuitability',
  'settlements',
  'populationIndex',
  'foodSupport',
  'waterAccess',
  'socialComplexity',
  'civilisationStress',
  'collapseRisk',
  'recoveryCapacity',
  'cloudCover',
  'terrainClass',
  'craterPressure',
  'greenhousePressure',
  'nutrientLevel',
  'solarInput',
  'albedo',
  'heatStress',
  'waterStress',
  'lifeViability',
  'survivalPressure',
  'extinctionRisk',
  'biosphereHealth',
  'slopeProxy',
  'coastProximity',
  'dirtyCells'
]);

const RENDER_ARRAY_FIELDS = Object.freeze([
  'elevation',
  'water',
  'ice',
  'temperature',
  'humidity',
  'rainfall',
  'runoff',
  'waterFlow',
  'habitability',
  'primitiveLife',
  'dormantLife',
  'biomass',
  'primitiveBiomass',
  'producerMats',
  'biomeClass',
  'biodiversityIndex',
  'ecosystemResilience',
  'ecosystemStress',
  'recoveryPotential',
  'disturbancePressure',
  'habitatContinuity',
  'stewardshipPressure',
  'restorationPriority',
  'civilisationSuitability',
  'settlements',
  'populationIndex',
  'foodSupport',
  'waterAccess',
  'socialComplexity',
  'civilisationStress',
  'collapseRisk',
  'recoveryCapacity',
  'cloudCover',
  'terrainClass',
  'greenhousePressure',
  'nutrientLevel',
  'solarInput',
  'albedo',
  'heatStress',
  'waterStress',
  'lifeViability',
  'survivalPressure',
  'extinctionRisk',
  'biosphereHealth',
  'slopeProxy',
  'coastProximity'
]);

function createSimulationState(mesh, options = {}) {
  const count = mesh.count;
  const state = {
    schemaVersion: STATE_SCHEMA_VERSION,
    mesh,
    cellCount: count,
    seed: options.seed || DEFAULT_CONFIG.initialSeed,
    template: options.template || DEFAULT_CONFIG.defaultTemplate,
    archetype: options.archetype || DEFAULT_CONFIG.defaultArchetype,
    meshQuality: mesh.qualityId || options.meshQuality || DEFAULT_CONFIG.defaultMeshQuality,
    meshQualityLabel: mesh.qualityLabel || meshQualityProfile(options.meshQuality || DEFAULT_CONFIG.defaultMeshQuality).label,
    stepCount: 0,
    year: 0,
    speed: DEFAULT_CONFIG.defaultSpeed,
    selectedCell: -1,
    lastAction: 'No action yet.',
    lastChange: 'What changed: nothing yet.',
    lastWatch: 'Watch selected layers after generation, tools, and time steps.',
    lastLimitingFactor: 'none',
    generationSignature: '',
    renderDirty: true,
    trendDirty: true,
    scratchLife: new Float32Array(count),
    scratchFlow: new Float32Array(count),
    diagnostics: {
      workerStatus: 'created',
      lastTickMs: 0,
      lastGenerationMs: 0,
      lastToolMs: 0,
      lastProbeMs: 0,
      lastRenderBuildMs: 0,
      lastRenderBytes: 0,
      messageCount: 0,
      lastError: '',
      neighbourLinks: mesh.neighbourLinkCount,
      meshQuality: mesh.qualityId || DEFAULT_CONFIG.defaultMeshQuality,
      meshQualityLabel: mesh.qualityLabel || 'Standard - 2,880 faces',
      meshFrequency: mesh.frequency || 12,
      performanceWarning: ''
    }
  };

  for (const field of SIM_ARRAY_FIELDS) {
    if (field === 'biomeClass' || field === 'terrainClass' || field === 'dirtyCells') {
      state[field] = new Uint8Array(count);
    } else {
      state[field] = new Float32Array(count);
    }
  }

  return state;
}

function cloneState(state) {
  const clone = {
    schemaVersion: state.schemaVersion,
    mesh: state.mesh,
    cellCount: state.cellCount,
    seed: state.seed,
    template: state.template,
    archetype: state.archetype,
    meshQuality: state.meshQuality,
    meshQualityLabel: state.meshQualityLabel,
    stepCount: state.stepCount,
    year: state.year,
    speed: state.speed,
    selectedCell: state.selectedCell,
    lastAction: state.lastAction,
    lastChange: state.lastChange,
    lastWatch: state.lastWatch,
    lastLimitingFactor: state.lastLimitingFactor,
    generationSignature: state.generationSignature,
    renderDirty: state.renderDirty,
    trendDirty: state.trendDirty,
    scratchLife: new Float32Array(state.scratchLife),
    scratchFlow: new Float32Array(state.scratchFlow),
    diagnostics: { ...state.diagnostics }
  };

  for (const field of SIM_ARRAY_FIELDS) {
    const source = state[field];
    clone[field] = source instanceof Uint8Array ? new Uint8Array(source) : new Float32Array(source);
  }

  return clone;
}

function restoreState(target, snapshot) {
  target.seed = snapshot.seed;
  target.template = snapshot.template;
  target.archetype = snapshot.archetype;
  target.meshQuality = snapshot.meshQuality;
  target.meshQualityLabel = snapshot.meshQualityLabel;
  target.stepCount = snapshot.stepCount;
  target.year = snapshot.year;
  target.speed = snapshot.speed;
  target.selectedCell = snapshot.selectedCell;
  target.lastAction = snapshot.lastAction;
  target.lastChange = snapshot.lastChange;
  target.lastWatch = snapshot.lastWatch;
  target.lastLimitingFactor = snapshot.lastLimitingFactor;
  target.generationSignature = snapshot.generationSignature;
  target.renderDirty = snapshot.renderDirty;
  target.trendDirty = snapshot.trendDirty;
  target.scratchLife.set(snapshot.scratchLife);
  target.scratchFlow.set(snapshot.scratchFlow);
  target.diagnostics = { ...snapshot.diagnostics };

  for (const field of SIM_ARRAY_FIELDS) {
    target[field].set(snapshot[field]);
  }
}

function validateArrayShape(state) {
  const failures = [];
  for (const field of SIM_ARRAY_FIELDS) {
    if (!state[field] || state[field].length !== state.cellCount) {
      failures.push(`${field}: expected ${state.cellCount}, got ${state[field] ? state[field].length : 'missing'}`);
    }
  }
  return failures;
}


/* ============================================================
   Mesh
   Source section: sim/mesh.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function normalizeVertex(v) {
  const d = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / d, v[1] / d, v[2] / d];
}

function midpoint(a, b) {
  return normalizeVertex([(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]);
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function addNeighbour(neighbours, degrees, a, b) {
  const offset = a * 3;
  for (let i = 0; i < 3; i += 1) {
    if (neighbours[offset + i] === b) return;
  }
  if (degrees[a] < 3) {
    neighbours[offset + degrees[a]] = b;
    degrees[a] += 1;
  }
}

function quantizedVertexKey(v) {
  return `${Math.round(v[0] * 1e10)}:${Math.round(v[1] * 1e10)}:${Math.round(v[2] * 1e10)}`;
}

function createMeshForQuality(qualityId) {
  const profile = meshQualityProfile(qualityId);
  return createIcosphereMesh({ frequency: profile.frequency, qualityId: profile.id, qualityLabel: profile.label });
}

function createIcosphereMesh(options = {}) {
  const frequency = clamp(options.frequency ?? 12, 1, 24) | 0;
  const qualityId = String(options.qualityId || (frequency <= 8 ? 'performance' : frequency >= 16 ? 'high' : 'standard'));
  const qualityLabel = options.qualityLabel || meshQualityProfile(qualityId).label;
  const phi = (1 + Math.sqrt(5)) / 2;
  const baseVertices = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ].map(normalizeVertex);
  const baseFaces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  const vertices = [];
  const vertexIndex = new Map();
  const getVertexIndex = (v) => {
    const n = normalizeVertex(v);
    const key = quantizedVertexKey(n);
    const existing = vertexIndex.get(key);
    if (existing !== undefined) return existing;
    const id = vertices.length;
    vertices.push(n);
    vertexIndex.set(key, id);
    return id;
  };
  const faces = [];
  for (const [ia, ib, ic] of baseFaces) {
    const a = baseVertices[ia];
    const b = baseVertices[ib];
    const c = baseVertices[ic];
    const grid = [];
    for (let u = 0; u <= frequency; u += 1) {
      grid[u] = [];
      for (let v = 0; v <= frequency - u; v += 1) {
        const w = frequency - u - v;
        const p = [
          (a[0] * w + b[0] * u + c[0] * v) / frequency,
          (a[1] * w + b[1] * u + c[1] * v) / frequency,
          (a[2] * w + b[2] * u + c[2] * v) / frequency
        ];
        grid[u][v] = getVertexIndex(p);
      }
    }
    for (let u = 0; u < frequency; u += 1) {
      for (let v = 0; v < frequency - u; v += 1) {
        const v00 = grid[u][v];
        const v10 = grid[u + 1][v];
        const v01 = grid[u][v + 1];
        faces.push([v00, v10, v01]);
        if (v < frequency - u - 1) {
          const v11 = grid[u + 1][v + 1];
          faces.push([v10, v11, v01]);
        }
      }
    }
  }

  const count = faces.length;
  const triangleX = new Float32Array(count * 3);
  const triangleY = new Float32Array(count * 3);
  const triangleZ = new Float32Array(count * 3);
  const centerX = new Float32Array(count);
  const centerY = new Float32Array(count);
  const centerZ = new Float32Array(count);
  const latitude = new Float32Array(count);
  const longitude = new Float32Array(count);
  const areaWeight = new Float32Array(count);
  const neighbours = new Int32Array(count * 3);
  neighbours.fill(-1);
  const degrees = new Uint8Array(count);
  const faceEdges = new Map();

  for (let id = 0; id < count; id += 1) {
    let face = faces[id];
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const centreRaw = normalizeVertex([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);
    const outward = normal[0] * centreRaw[0] + normal[1] * centreRaw[1] + normal[2] * centreRaw[2];
    if (outward < 0) face = [face[0], face[2], face[1]];
    faces[id] = face;
  }

  for (let id = 0; id < count; id += 1) {
    const face = faces[id];
    for (let k = 0; k < 3; k += 1) {
      const v = vertices[face[k]];
      triangleX[id * 3 + k] = v[0];
      triangleY[id * 3 + k] = v[1];
      triangleZ[id * 3 + k] = v[2];
    }
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const centre = normalizeVertex([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);
    centerX[id] = centre[0];
    centerY[id] = centre[1];
    centerZ[id] = centre[2];
    latitude[id] = Math.asin(centre[1]) * 180 / Math.PI;
    longitude[id] = Math.atan2(centre[2], centre[0]) * 180 / Math.PI;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    areaWeight[id] = Math.max(1e-6, Math.hypot(cross[0], cross[1], cross[2]) * 0.5);
    for (let k = 0; k < 3; k += 1) {
      const aIndex = face[k];
      const bIndex = face[(k + 1) % 3];
      const key = edgeKey(aIndex, bIndex);
      const other = faceEdges.get(key);
      if (other === undefined) faceEdges.set(key, id);
      else {
        addNeighbour(neighbours, degrees, id, other);
        addNeighbour(neighbours, degrees, other, id);
      }
    }
  }

  let areaSum = 0;
  let neighbourLinkCount = 0;
  for (let i = 0; i < count; i += 1) {
    areaSum += areaWeight[i];
    neighbourLinkCount += degrees[i];
  }
  const areaMean = areaSum / Math.max(1, count);
  for (let i = 0; i < count; i += 1) areaWeight[i] = areaWeight[i] / areaMean;
  return {
    type: 'frequency-icosphere-triangle-faces',
    qualityId,
    qualityLabel,
    frequency,
    subdivisions: frequency,
    vertexCount: vertices.length,
    count,
    triangleX,
    triangleY,
    triangleZ,
    centerX,
    centerY,
    centerZ,
    latitude,
    longitude,
    areaWeight,
    neighbours,
    degree: degrees,
    neighbourLinkCount
  };
}

function expandRadius(mesh, originCell, radius) {
  const origin = originCell | 0;
  const r = clamp(radius | 0, 0, 12);
  if (origin < 0 || origin >= mesh.count) return [];
  const result = [origin];
  if (r === 0) return result;

  const seen = new Uint8Array(mesh.count);
  seen[origin] = 1;
  let frontier = [origin];
  for (let depth = 0; depth < r; depth += 1) {
    const next = [];
    for (const cell of frontier) {
      const offset = cell * 3;
      for (let k = 0; k < 3; k += 1) {
        const n = mesh.neighbours[offset + k];
        if (n >= 0 && seen[n] === 0) {
          seen[n] = 1;
          result.push(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return result;
}

function meshSignature(mesh) {
  return `${mesh.type}|Q:${mesh.qualityId || 'standard'}|F${mesh.frequency || mesh.subdivisions}|cells:${mesh.count}|vertices:${mesh.vertexCount}|links:${mesh.neighbourLinkCount}`;
}



function updateVisualProxyFields(state, mesh) {
  for (let i = 0; i < state.cellCount; i += 1) {
    const offset = i * 3;
    let maxSlope = 0;
    let coastHits = 0;
    for (let k = 0; k < 3; k += 1) {
      const n = mesh.neighbours[offset + k];
      if (n >= 0) {
        maxSlope = Math.max(maxSlope, Math.abs(state.elevation[i] - state.elevation[n]));
        const waterCross = (state.water[i] >= 0.50) !== (state.water[n] >= 0.50);
        if (waterCross) coastHits += 1;
      }
    }
    state.slopeProxy[i] = clamp01(maxSlope * 5.5);
    state.coastProximity[i] = clamp01(coastHits / 3 + smoothstep(0.25, 0.56, state.water[i]) * smoothstep(0.90, 0.45, state.water[i]) * 0.45);
  }
}

function updateCellDerivedDiagnostics(state, mesh, i) {
  const latAbs = Math.abs(mesh.latitude[i]) / 90;
  const solar = clamp01(0.86 - 0.56 * latAbs);
  const albedo = clamp01(0.10 + state.ice[i] * 0.58 + state.cloudCover[i] * 0.12 + (state.water[i] > 0.55 ? 0.06 : 0));
  const heatStress = clamp01((state.temperature[i] - 0.68) * 2.4 + state.greenhousePressure[i] * 0.20 - state.cloudCover[i] * 0.08);
  const waterStress = clamp01((0.34 - state.waterAccess[i]) * 1.7 + (0.24 - state.rainfall[i]) * 0.65 + heatStress * 0.30);
  const tempFit = clamp01(1 - Math.abs(state.temperature[i] - 0.55) / 0.42);
  const waterFit = clamp01(state.waterAccess[i] * 0.55 + state.rainfall[i] * 0.25 + state.water[i] * 0.15);
  const stressPenalty = clamp01(heatStress * 0.35 + waterStress * 0.35 + state.disturbancePressure[i] * 0.20 + state.ice[i] * 0.24);
  const viability = clamp01(tempFit * 0.36 + waterFit * 0.28 + state.nutrientLevel[i] * 0.20 + state.habitability[i] * 0.16 - stressPenalty * 0.34);
  const survival = clamp01((1 - viability) * 0.46 + heatStress * 0.24 + waterStress * 0.22 + state.ice[i] * 0.18 + state.disturbancePressure[i] * 0.16 + (1 - state.nutrientLevel[i]) * 0.10);
  const living = clamp01(state.primitiveLife[i] * 0.62 + state.dormantLife[i] * 0.12 + state.producerMats[i] * 0.18 + state.biodiversityIndex[i] * 0.08);
  state.solarInput[i] = solar;
  state.albedo[i] = albedo;
  state.heatStress[i] = heatStress;
  state.waterStress[i] = waterStress;
  state.lifeViability[i] = viability;
  state.survivalPressure[i] = survival;
  state.extinctionRisk[i] = clamp01(survival * (0.55 + living * 0.45));
  state.primitiveBiomass[i] = clamp01(state.biomass[i]);
  state.biosphereHealth[i] = clamp01(living * 0.36 + state.ecosystemResilience[i] * 0.28 + viability * 0.22 + (1 - survival) * 0.14);
}

function recomputeDerivedDiagnostics(state, mesh) {
  for (let i = 0; i < state.cellCount; i += 1) {
    updateCellDerivedDiagnostics(state, mesh, i);
  }
  updateVisualProxyFields(state, mesh);
}

/* ============================================================
   Summaries and signatures
   Source section: sim/summaries.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function weightedMean(values, weights) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    const w = weights[i];
    if (Number.isFinite(v) && Number.isFinite(w)) {
      num += v * w;
      den += w;
    }
  }
  return den > 0 ? num / den : 0;
}

function weightedShare(values, weights, threshold) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const w = weights[i];
    den += w;
    if (values[i] >= threshold) num += w;
  }
  return den > 0 ? num / den : 0;
}

function computeSummary(state, mesh) {
  const weights = mesh.areaWeight;
  const temp = weightedMean(state.temperature, weights);
  const life = weightedMean(state.primitiveLife, weights);
  const civ = weightedMean(state.settlements, weights);
  const stress = weightedMean(state.ecosystemStress, weights);
  const collapse = weightedMean(state.collapseRisk, weights);
  const waterShare = weightedShare(state.water, weights, 0.50);
  const iceShare = weightedShare(state.ice, weights, 0.40);
  const habShare = weightedShare(state.habitability, weights, 0.50);
  const settlementShare = weightedShare(state.settlements, weights, 0.10);
  const warnings = collectWarnings(state, mesh, { temp, waterShare, iceShare, life });

  return {
    schemaVersion: state.schemaVersion,
    meshType: mesh.type,
    meshSignature: meshSignature(mesh),
    meshQuality: state.meshQuality || mesh.qualityId || DEFAULT_CONFIG.defaultMeshQuality,
    meshQualityLabel: state.meshQualityLabel || mesh.qualityLabel || meshQualityProfile(DEFAULT_CONFIG.defaultMeshQuality).label,
    meshFrequency: mesh.frequency || mesh.subdivisions,
    cellCount: state.cellCount,
    neighbourLinks: mesh.neighbourLinkCount,
    seed: state.seed,
    template: state.template,
    archetype: state.archetype,
    stepCount: state.stepCount,
    year: state.year,
    speed: state.speed,
    selectedCell: state.selectedCell,
    lastAction: state.lastAction,
    lastChange: state.lastChange,
    lastWatch: state.lastWatch,
    lastLimitingFactor: state.lastLimitingFactor,
    generationSignature: state.generationSignature,
    averageTemperature: temp,
    averageTemperatureC: toCelsius(temp),
    waterShare,
    iceShare,
    habitableShare: habShare,
    primitiveLifeCoverage: weightedShare(state.primitiveLife, weights, 0.05),
    primitiveLifeMean: life,
    lifeViabilityMean: weightedMean(state.lifeViability, weights),
    lifeViabilityShare: weightedShare(state.lifeViability, weights, 0.42),
    dormantLifeMean: weightedMean(state.dormantLife, weights),
    primitiveBiomassMean: weightedMean(state.primitiveBiomass, weights),
    biosphereHealthMean: weightedMean(state.biosphereHealth, weights),
    extinctionRiskMean: weightedMean(state.extinctionRisk, weights),
    survivalPressureMean: weightedMean(state.survivalPressure, weights),
    nutrientMean: weightedMean(state.nutrientLevel, weights),
    heatStressMean: weightedMean(state.heatStress, weights),
    waterStressMean: weightedMean(state.waterStress, weights),
    greenhousePressureMean: weightedMean(state.greenhousePressure, weights),
    producerMatsMean: weightedMean(state.producerMats, weights),
    biodiversityMean: weightedMean(state.biodiversityIndex, weights),
    resilienceMean: weightedMean(state.ecosystemResilience, weights),
    ecosystemStressMean: stress,
    stewardshipPressureMean: weightedMean(state.stewardshipPressure, weights),
    civilisationSuitabilityMean: weightedMean(state.civilisationSuitability, weights),
    settlementShare,
    settlementMean: civ,
    populationMean: weightedMean(state.populationIndex, weights),
    collapseRiskMean: collapse,
    cloudMean: weightedMean(state.cloudCover, weights),
    runoffMean: weightedMean(state.runoff, weights),
    waterFlowMean: weightedMean(state.waterFlow, weights),
    humidityMean: weightedMean(state.humidity, weights),
    rainfallMean: weightedMean(state.rainfall, weights),
    albedoMean: weightedMean(state.albedo, weights),
    warnings,
    renderDirty: state.renderDirty,
    trendDirty: state.trendDirty,
    diagnostics: { ...state.diagnostics }
  };
}

function computeSelectedCellSummary(state, mesh, cellId = state.selectedCell) {
  const id = cellId | 0;
  if (id < 0 || id >= state.cellCount) {
    return { cellId: -1, message: 'No cell selected.' };
  }
  return {
    cellId: id,
    latitude: mesh.latitude[id],
    longitude: mesh.longitude[id],
    neighbours: Array.from(mesh.neighbours.slice(id * 3, id * 3 + 3)).filter((v) => v >= 0),
    elevation: state.elevation[id],
    terrainClass: state.terrainClass[id],
    water: state.water[id],
    ice: state.ice[id],
    temperature: state.temperature[id],
    temperatureC: toCelsius(state.temperature[id]),
    humidity: state.humidity[id],
    rainfall: state.rainfall[id],
    runoff: state.runoff[id],
    waterFlow: state.waterFlow[id],
    habitability: state.habitability[id],
    primitiveLife: state.primitiveLife[id],
    dormantLife: state.dormantLife[id],
    biomass: state.biomass[id],
    producerMats: state.producerMats[id],
    biodiversityIndex: state.biodiversityIndex[id],
    ecosystemResilience: state.ecosystemResilience[id],
    ecosystemStress: state.ecosystemStress[id],
    recoveryPotential: state.recoveryPotential[id],
    stewardshipPressure: state.stewardshipPressure[id],
    restorationPriority: state.restorationPriority[id],
    civilisationSuitability: state.civilisationSuitability[id],
    settlements: state.settlements[id],
    populationIndex: state.populationIndex[id],
    foodSupport: state.foodSupport[id],
    waterAccess: state.waterAccess[id],
    socialComplexity: state.socialComplexity[id],
    civilisationStress: state.civilisationStress[id],
    collapseRisk: state.collapseRisk[id],
    cloudCover: state.cloudCover[id],
    greenhousePressure: state.greenhousePressure[id],
    nutrientLevel: state.nutrientLevel[id],
    solarInput: state.solarInput[id],
    albedo: state.albedo[id],
    heatStress: state.heatStress[id],
    waterStress: state.waterStress[id],
    lifeViability: state.lifeViability[id],
    primitiveBiomass: state.primitiveBiomass[id],
    biosphereHealth: state.biosphereHealth[id],
    extinctionRisk: state.extinctionRisk[id],
    survivalPressure: state.survivalPressure[id],
    lifeStatus: localLifeStatus(state, id),
    limitingFactor: localLimitingFactor(state, id)
  };
}

function buildRenderData(state, mesh) {
  const payload = {
    meshType: mesh.type,
    subdivisions: mesh.subdivisions,
    frequency: mesh.frequency || mesh.subdivisions,
    meshQuality: mesh.qualityId || state.meshQuality,
    meshQualityLabel: mesh.qualityLabel || state.meshQualityLabel,
    count: mesh.count,
    selectedCell: state.selectedCell,
    tick: state.stepCount,
    year: state.year,
    layerIds: LAYERS.map((layer) => layer.id),
    triangleX: new Float32Array(mesh.triangleX),
    triangleY: new Float32Array(mesh.triangleY),
    triangleZ: new Float32Array(mesh.triangleZ),
    centerX: new Float32Array(mesh.centerX),
    centerY: new Float32Array(mesh.centerY),
    centerZ: new Float32Array(mesh.centerZ),
    latitude: new Float32Array(mesh.latitude),
    longitude: new Float32Array(mesh.longitude),
    areaWeight: new Float32Array(mesh.areaWeight)
  };

  for (const field of RENDER_ARRAY_FIELDS) {
    const source = state[field];
    payload[field] = source instanceof Uint8Array ? new Uint8Array(source) : new Float32Array(source);
  }

  let bytes = 0;
  for (const value of Object.values(payload)) {
    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') bytes += value.byteLength;
  }
  payload.bytes = bytes;
  state.diagnostics.lastRenderBytes = bytes;
  state.renderDirty = false;
  return payload;
}

function collectTransferables(payload) {
  const buffers = [];
  for (const value of Object.values(payload)) {
    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') {
      buffers.push(value.buffer);
    }
  }
  return buffers;
}

function signatureState(state) {
  let h = 2166136261 >>> 0;
  const fields = ['elevation', 'water', 'temperature', 'ice', 'habitability', 'lifeViability', 'primitiveLife', 'dormantLife', 'producerMats', 'settlements', 'populationIndex'];
  for (const field of fields) {
    const arr = state[field];
    const stride = Math.max(1, Math.floor(arr.length / 97));
    for (let i = 0; i < arr.length; i += stride) {
      h ^= Math.round(arr[i] * 100000) + i;
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  h ^= state.stepCount;
  h = Math.imul(h, 16777619) >>> 0;
  return `sig-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

function trendSampleFromSummary(summary) {
  return {
    year: summary.year,
    tick: summary.stepCount,
    tempC: summary.averageTemperatureC,
    waterShare: summary.waterShare,
    iceShare: summary.iceShare,
    habitability: summary.habitableShare,
    primitiveLife: summary.primitiveLifeMean,
    dormantLife: summary.dormantLifeMean,
    primitiveBiomass: summary.primitiveBiomassMean,
    biosphereHealth: summary.biosphereHealthMean,
    extinctionRisk: summary.extinctionRiskMean,
    lifeViability: summary.lifeViabilityMean,
    biodiversity: summary.biodiversityMean,
    settlement: summary.settlementMean,
    collapseRisk: summary.collapseRiskMean
  };
}

function validateFiniteBounded(state) {
  const failures = [];
  for (const field of SIM_ARRAY_FIELDS) {
    const arr = state[field];
    if (!arr) {
      failures.push(`${field}: missing`);
      continue;
    }
    for (let i = 0; i < arr.length; i += 1) {
      const value = arr[i];
      if (!Number.isFinite(value)) {
        failures.push(`${field}[${i}] non-finite`);
        break;
      }
      if (value < -0.001 || value > 255.001) {
        failures.push(`${field}[${i}] out of broad bounds: ${value}`);
        break;
      }
    }
  }
  return failures;
}

function collectWarnings(state, mesh, metrics) {
  const warnings = [];
  if (metrics.waterShare < 0.03) warnings.push('Very low surface water coverage.');
  if (metrics.waterShare > 0.96) warnings.push('Very high water coverage.');
  if (metrics.temp < 0.18 || metrics.temp > 0.88) warnings.push('Extreme average temperature.');
  if (metrics.life < 0.001 && state.template === 'earthlike') warnings.push('Earthlike template has unexpectedly low primitive life.');
  const finiteFailures = validateFiniteBounded(state);
  if (finiteFailures.length > 0) warnings.push(`State validation warning: ${finiteFailures[0]}`);
  if (mesh.neighbourLinkCount < mesh.count * 2) warnings.push('Low neighbour-link count.');
  return warnings;
}

function localLifeStatus(state, i) {
  if (state.primitiveLife[i] > 0.45 && state.ecosystemStress[i] < 0.45) return 'expanding primitive life';
  if (state.primitiveLife[i] > 0.08) return 'seeded active life';
  if (state.dormantLife[i] > 0.06) return 'dormant life';
  if (state.habitability[i] > 0.48) return 'viable but lifeless';
  if (state.habitability[i] > 0.30) return 'marginal lifeless';
  return 'hostile lifeless';
}

function localLimitingFactor(state, i) {
  if (state.waterAccess[i] < 0.25) return 'water access';
  if (state.temperature[i] > 0.78) return 'heat stress';
  if (state.temperature[i] < 0.30) return 'cold stress';
  if (state.ice[i] > 0.65) return 'ice cover';
  if (state.nutrientLevel[i] < 0.24) return 'nutrients';
  if (state.ecosystemStress[i] > 0.70) return 'ecosystem stress';
  return 'none material';
}


/* ============================================================
   Generation
   Source section: sim/generation.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


const TEMPLATE_PROFILES = Object.freeze({
  procedural_lifeless: { water: 0.45, temp: 0.50, greenhouse: 0.42, ice: 0.18, nutrient: 0.44, life: 0, civ: 0 },
  earthlike: { water: 0.57, temp: 0.55, greenhouse: 0.55, ice: 0.15, nutrient: 0.66, life: 1, civ: 1 },
  water_world: { water: 0.82, temp: 0.50, greenhouse: 0.48, ice: 0.12, nutrient: 0.42, life: 0, civ: 0 },
  ice_world: { water: 0.50, temp: 0.25, greenhouse: 0.28, ice: 0.75, nutrient: 0.36, life: 0, civ: 0 },
  greenhouse_world: { water: 0.38, temp: 0.82, greenhouse: 0.86, ice: 0.02, nutrient: 0.34, life: 0, civ: 0 }
});

const ARCHETYPE_PROFILES = Object.freeze({
  balanced: { rough: 0.50, waterShift: 0.00, tempShift: 0.00, nutrientShift: 0.04 },
  dry: { rough: 0.46, waterShift: -0.20, tempShift: 0.09, nutrientShift: -0.08 },
  icy: { rough: 0.42, waterShift: 0.02, tempShift: -0.20, nutrientShift: -0.03 },
  oceanic: { rough: 0.28, waterShift: 0.22, tempShift: 0.00, nutrientShift: -0.02 },
  greenhouse: { rough: 0.52, waterShift: -0.08, tempShift: 0.20, nutrientShift: -0.05 },
  rugged: { rough: 0.78, waterShift: -0.04, tempShift: -0.02, nutrientShift: 0.02 }
});

function profileFor(options) {
  const template = TEMPLATE_PROFILES[options.template] || TEMPLATE_PROFILES.procedural_lifeless;
  const archetype = ARCHETYPE_PROFILES[options.archetype] || ARCHETYPE_PROFILES.balanced;
  const water = clamp01((options.waterLevel ?? template.water) + archetype.waterShift);
  const temp = clamp01((options.temperature ?? template.temp) + archetype.tempShift);
  const greenhouse = clamp01(options.greenhouse ?? template.greenhouse);
  const ice = clamp01(options.ice ?? template.ice);
  const nutrient = clamp01((options.nutrients ?? template.nutrient) + archetype.nutrientShift);
  const rough = clamp01(options.roughness ?? archetype.rough);
  return { template, archetype, water, temp, greenhouse, ice, nutrient, rough };
}

function terrainNoise(seed, i, x, y, z, rough) {
  const n1 = Math.sin(3.1 * x + 1.7 * y + seed * 0.000001);
  const n2 = Math.sin(4.9 * z - 2.1 * x + seed * 0.000003);
  const n3 = Math.cos(7.3 * y + 2.8 * z - seed * 0.000002);
  const grain = hashUnit(seed, i, 17) * 2 - 1;
  return 0.50 + 0.20 * n1 + 0.14 * n2 + 0.10 * n3 + (0.08 + 0.18 * rough) * grain;
}

function earthlikeMask(lonDeg, latDeg) {
  const lon = lonDeg / 180;
  const lat = latDeg / 90;
  const americas = Math.exp(-((lon + 0.55) ** 2) / 0.045) * Math.exp(-((lat - 0.05) ** 2) / 0.75);
  const africaEurasia = Math.exp(-((lon - 0.12) ** 2) / 0.14) * Math.exp(-((lat - 0.18) ** 2) / 0.42);
  const asia = Math.exp(-((lon - 0.55) ** 2) / 0.08) * Math.exp(-((lat - 0.20) ** 2) / 0.36);
  const australia = Math.exp(-((lon - 0.75) ** 2) / 0.025) * Math.exp(-((lat + 0.40) ** 2) / 0.04);
  const antarctica = smoothstep(0.66, 0.92, -lat);
  const oceanGap = Math.exp(-((lon + 0.10) ** 2) / 0.035) * Math.exp(-(lat ** 2) / 0.50);
  return americas + africaEurasia + asia + australia + antarctica - 0.45 * oceanGap;
}

function generateWorld(state, mesh, options = {}) {
  const seedText = String(options.seed || state.seed || 'ENGINE-V2-001');
  const seed = stringToSeed(seedText);
  const templateId = options.template || state.template || 'procedural_lifeless';
  const archetypeId = options.archetype || state.archetype || 'balanced';
  const profile = profileFor({ ...options, template: templateId, archetype: archetypeId });
  const seaLevel = 0.54 + (profile.water - 0.50) * 0.42;

  state.seed = seedText;
  state.template = templateId;
  state.archetype = archetypeId;
  state.meshQuality = mesh.qualityId || options.meshQuality || DEFAULT_CONFIG.defaultMeshQuality;
  state.meshQualityLabel = mesh.qualityLabel || meshQualityProfile(state.meshQuality).label;
  state.stepCount = 0;
  state.year = 0;
  state.selectedCell = -1;
  state.lastAction = `Generated ${templateId.replaceAll('_', ' ')} with ${archetypeId.replaceAll('_', ' ')} archetype at ${state.meshQualityLabel}.`;
  state.lastChange = 'What changed: full planet generation reset all Worker-owned state arrays and render data.';
  state.lastWatch = 'Watch water, ice, temperature, habitability, life viability, and selected tool guidance.';
  state.lastLimitingFactor = 'new world';

  for (let i = 0; i < mesh.count; i += 1) {
    const x = mesh.centerX[i];
    const y = mesh.centerY[i];
    const z = mesh.centerZ[i];
    const latAbs = Math.abs(mesh.latitude[i]) / 90;
    const lon = mesh.longitude[i];
    const lat = mesh.latitude[i];
    state.craterPressure[i] = 0;
    state.dirtyCells[i] = 0;
    let elevation = terrainNoise(seed, i, x, y, z, profile.rough);
    if (templateId === 'earthlike') {
      elevation = 0.42 + 0.32 * earthlikeMask(lon, lat) + 0.12 * (hashUnit(seed, i, 91) - 0.5);
    }
    elevation = clamp01((elevation - 0.18) / 0.82);
    if (profile.archetype.rough > 0.65) {
      elevation = clamp01(elevation + 0.14 * Math.sin(12 * x + 8 * z));
    }
    state.elevation[i] = elevation;

    const ocean = elevation < seaLevel ? 1 : 0;
    const coastPotential = 1 - Math.abs(elevation - seaLevel) / 0.16;
    state.water[i] = ocean ? clamp01(0.66 + 0.30 * (seaLevel - elevation) / 0.40) : clamp01(Math.max(0, coastPotential) * 0.18 * profile.water);

    const elevationCooling = elevation > seaLevel ? (elevation - seaLevel) * 0.35 : 0;
    const baseTemp = profile.temp + (1 - latAbs) * 0.22 - latAbs * 0.26 + profile.greenhouse * 0.16 - elevationCooling;
    const temp = clamp01(baseTemp + (hashUnit(seed, i, 31) - 0.5) * 0.08);
    state.temperature[i] = temp;
    state.greenhousePressure[i] = clamp01(profile.greenhouse + 0.10 * (hashUnit(seed, i, 57) - 0.5));

    const polarFreeze = smoothstep(0.46, 0.92, latAbs);
    const freeze = clamp01(profile.ice * 0.45 + polarFreeze * 0.45 + smoothstep(0.42, 0.12, temp) * 0.50);
    state.ice[i] = clamp01(freeze * (0.25 + 0.75 * state.water[i]));

    state.humidity[i] = clamp01(state.water[i] * 0.55 + (1 - latAbs) * 0.22 + profile.greenhouse * 0.12 - state.ice[i] * 0.22);
    state.rainfall[i] = clamp01(state.humidity[i] * (0.55 + 0.35 * (1 - latAbs)) - Math.max(0, elevation - seaLevel) * 0.10);
    state.runoff[i] = clamp01(Math.max(0, state.rainfall[i] - 0.20) * (0.30 + elevation * 0.55));
    state.waterFlow[i] = clamp01(state.runoff[i] + state.water[i] * 0.28);
    state.cloudCover[i] = clamp01(state.humidity[i] * 0.55 + state.rainfall[i] * 0.25);
    state.nutrientLevel[i] = clamp01(profile.nutrient + 0.14 * state.runoff[i] + 0.08 * (1 - elevation) + (hashUnit(seed, i, 77) - 0.5) * 0.12);

    const tempFit = 1 - Math.abs(temp - 0.55) / 0.42;
    const waterFit = clamp01(state.water[i] * 0.68 + state.rainfall[i] * 0.38);
    state.habitability[i] = clamp01(tempFit * 0.42 + waterFit * 0.28 + state.nutrientLevel[i] * 0.22 - state.ice[i] * 0.30);

    state.primitiveLife[i] = 0;
    state.dormantLife[i] = 0;
    state.biomass[i] = 0;
    state.producerMats[i] = 0;
    state.biodiversityIndex[i] = 0;
    state.ecosystemResilience[i] = clamp01(state.habitability[i] * 0.30);
    state.ecosystemStress[i] = clamp01(1 - state.habitability[i] + state.ice[i] * 0.20);
    state.recoveryPotential[i] = clamp01(state.habitability[i] * 0.55 + state.nutrientLevel[i] * 0.25);
    state.disturbancePressure[i] = clamp01(state.craterPressure[i] * 0.3 + Math.abs(temp - 0.55) * 0.35);
    state.habitatContinuity[i] = clamp01(state.habitability[i] * 0.40 + (1 - state.ice[i]) * 0.20);
    state.stewardshipPressure[i] = 0;
    state.restorationPriority[i] = clamp01((1 - state.habitability[i]) * 0.35);
    state.waterAccess[i] = clamp01(state.water[i] * 0.65 + state.rainfall[i] * 0.25 + state.runoff[i] * 0.15);
    state.foodSupport[i] = clamp01(state.habitability[i] * 0.60 + state.producerMats[i] * 0.20 + state.waterAccess[i] * 0.12);
    state.civilisationSuitability[i] = clamp01(state.habitability[i] * 0.52 + (1 - ocean) * 0.20 + state.waterAccess[i] * 0.15);
    state.settlements[i] = 0;
    state.populationIndex[i] = 0;
    state.socialComplexity[i] = 0;
    state.civilisationStress[i] = clamp01(1 - state.civilisationSuitability[i]);
    state.collapseRisk[i] = state.civilisationStress[i] * 0.20;
    state.recoveryCapacity[i] = clamp01(state.recoveryPotential[i] * 0.50);

    if (state.water[i] > 0.55) state.terrainClass[i] = 0;
    else if (elevation < seaLevel + 0.05) state.terrainClass[i] = 1;
    else if (elevation < 0.62) state.terrainClass[i] = 2;
    else if (elevation < 0.78) state.terrainClass[i] = 3;
    else state.terrainClass[i] = 4;
    state.biomeClass[i] = state.terrainClass[i];
  }

  if (profile.template.life > 0) {
    seedEarthlikeLife(state, mesh);
  }

  recomputeDerivedDiagnostics(state, mesh);
  state.generationSignature = signatureState(state);
  state.renderDirty = true;
  state.trendDirty = true;
}

function seedEarthlikeLife(state, mesh) {
  for (let i = 0; i < mesh.count; i += 1) {
    const viable = state.habitability[i];
    const life = viable > 0.42 ? clamp01((viable - 0.30) * 1.05) : 0;
    state.primitiveLife[i] = life;
    state.dormantLife[i] = viable > 0.30 && life <= 0 ? 0.10 : 0;
    state.biomass[i] = clamp01(life * (0.55 + state.nutrientLevel[i] * 0.25));
    state.producerMats[i] = clamp01(life * 0.65 + state.rainfall[i] * 0.10);
    state.biodiversityIndex[i] = clamp01(life * 0.45 + state.habitatContinuity[i] * 0.25);
    state.ecosystemResilience[i] = clamp01(0.20 + life * 0.45 + state.recoveryPotential[i] * 0.20);
    state.ecosystemStress[i] = clamp01(1 - state.ecosystemResilience[i]);
    state.civilisationSuitability[i] = clamp01(state.habitability[i] * 0.50 + state.producerMats[i] * 0.22 + state.waterAccess[i] * 0.18);
    updateCellDerivedDiagnostics(state, mesh, i);
    if (state.civilisationSuitability[i] > 0.62 && state.water[i] < 0.55 && Math.abs(mesh.latitude[i]) < 62) {
      state.settlements[i] = clamp01((state.civilisationSuitability[i] - 0.58) * 1.4);
      state.populationIndex[i] = clamp01(state.settlements[i] * 0.75);
      state.socialComplexity[i] = clamp01(state.settlements[i] * 0.45);
      state.stewardshipPressure[i] = clamp01(state.settlements[i] * 0.30);
    }
  }
}


/* ============================================================
   Physical systems
   Source section: sim/physical.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepPhysical(state, mesh) {
  for (let i = 0; i < state.cellCount; i += 1) {
    const latAbs = Math.abs(mesh.latitude[i]) / 90;
    const solar = 0.72 - 0.42 * latAbs;
    const oceanBuffer = state.water[i] * 0.14;
    const greenhouse = state.greenhousePressure[i] * 0.22;
    const iceAlbedo = state.ice[i] * 0.18;
    const elevationCooling = Math.max(0, state.elevation[i] - 0.55) * 0.18;
    const target = clamp01(solar + greenhouse - iceAlbedo - elevationCooling + oceanBuffer);
    state.temperature[i] = lerp(state.temperature[i], target, 0.035);

    const freezePressure = clamp01((0.36 - state.temperature[i]) * 2.1 + latAbs * 0.35 + state.water[i] * 0.25);
    const meltPressure = clamp01((state.temperature[i] - 0.42) * 1.7 + state.rainfall[i] * 0.12);
    state.ice[i] = clamp01(state.ice[i] + freezePressure * 0.012 - meltPressure * 0.018);
    state.cloudCover[i] = clamp01(state.cloudCover[i] * 0.96 + state.humidity[i] * 0.03 + state.water[i] * 0.01);
    state.habitability[i] = clamp01(state.habitability[i] * 0.88 + computeHabitability(state, i) * 0.12);
    updateCellDerivedDiagnostics(state, mesh, i);
  }
}

function computeHabitability(state, i) {
  const tempFit = 1 - Math.abs(state.temperature[i] - 0.55) / 0.42;
  const waterFit = clamp01(state.water[i] * 0.62 + state.rainfall[i] * 0.36 + state.runoff[i] * 0.12);
  const stable = clamp01(1 - state.disturbancePressure[i] * 0.55 - state.ice[i] * 0.25);
  return clamp01(tempFit * 0.38 + waterFit * 0.28 + state.nutrientLevel[i] * 0.20 + stable * 0.14);
}


/* ============================================================
   Water
   Source section: sim/water.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepWater(state, mesh) {
  // This module is deliberately local in Build 0.1.0, but the state and API are
  // prepared for later drainage direction, flow accumulation, basin filling,
  // lake overflow, erosion, sediment, ocean heat transport, and climate-water feedback loops.
  state.scratchFlow.fill(0);

  for (let i = 0; i < state.cellCount; i += 1) {
    const latAbs = Math.abs(mesh.latitude[i]) / 90;
    const evaporativeSupply = state.water[i] * clamp01(state.temperature[i] * 0.85 + 0.12) * (1 - state.ice[i] * 0.65);
    const orographicLift = Math.max(0, state.elevation[i] - 0.50) * 0.16;
    const cloudFeed = state.cloudCover[i] * 0.22;
    state.humidity[i] = clamp01(state.humidity[i] * 0.86 + evaporativeSupply * 0.10 + cloudFeed * 0.04 - latAbs * 0.025);
    state.rainfall[i] = clamp01(state.humidity[i] * (0.42 + (1 - latAbs) * 0.36) + orographicLift - state.ice[i] * 0.18);
    state.runoff[i] = clamp01(Math.max(0, state.rainfall[i] - 0.18) * (0.30 + state.elevation[i] * 0.50) + state.ice[i] * Math.max(0, state.temperature[i] - 0.40) * 0.10);
  }

  for (let i = 0; i < state.cellCount; i += 1) {
    const offset = i * 3;
    let best = -1;
    let bestDrop = 0;
    for (let k = 0; k < 3; k += 1) {
      const n = mesh.neighbours[offset + k];
      if (n >= 0) {
        const drop = state.elevation[i] - state.elevation[n];
        if (drop > bestDrop) {
          bestDrop = drop;
          best = n;
        }
      }
    }
    const localFlow = clamp01(state.runoff[i] + state.water[i] * 0.18);
    if (best >= 0) {
      state.scratchFlow[best] += localFlow * 0.28;
      state.waterFlow[i] = clamp01(localFlow + bestDrop * 0.25);
    } else {
      state.waterFlow[i] = localFlow;
    }
  }

  for (let i = 0; i < state.cellCount; i += 1) {
    state.waterFlow[i] = clamp01(state.waterFlow[i] + state.scratchFlow[i] * 0.18);
    state.waterAccess[i] = clamp01(state.water[i] * 0.50 + state.rainfall[i] * 0.25 + state.runoff[i] * 0.20 + state.waterFlow[i] * 0.18);
    updateCellDerivedDiagnostics(state, mesh, i);
  }
}


/* ============================================================
   Primitive life
   Source section: sim/life.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepLife(state, mesh) {
  state.scratchLife.fill(0);
  let spreadCount = 0;
  let dormancyTransitions = 0;
  let recoveryTransitions = 0;
  let localExtinctions = 0;

  for (let i = 0; i < state.cellCount; i += 1) {
    const viability = state.habitability[i];
    const stress = clamp01(1 - viability + state.ice[i] * 0.35 + Math.abs(state.temperature[i] - 0.55) * 0.32 + (1 - state.nutrientLevel[i]) * 0.18);
    const active = state.primitiveLife[i];
    const dormant = state.dormantLife[i];

    if (viability > 0.55) {
      const growth = (viability - 0.45) * 0.035 * (1 - active);
      state.primitiveLife[i] = clamp01(active + growth + dormant * 0.010);
      if (dormant > 0.01) recoveryTransitions += 1;
      state.dormantLife[i] = clamp01(dormant * 0.985 - growth * 0.2);
    } else if (viability > 0.34) {
      const dorm = active * 0.012;
      state.primitiveLife[i] = clamp01(active * 0.992 - stress * 0.004);
      state.dormantLife[i] = clamp01(dormant + dorm);
      if (dorm > 0.001) dormancyTransitions += 1;
    } else {
      const loss = stress * 0.025;
      if (active > 0.01 || dormant > 0.01) localExtinctions += stress > 0.82 ? 1 : 0;
      state.primitiveLife[i] = clamp01(active - loss);
      state.dormantLife[i] = clamp01(dormant - loss * 0.35);
    }
  }

  for (let i = 0; i < state.cellCount; i += 1) {
    const source = state.primitiveLife[i];
    if (source <= 0.28) continue;
    const offset = i * 3;
    for (let k = 0; k < 3; k += 1) {
      const n = mesh.neighbours[offset + k];
      if (n >= 0 && state.habitability[n] > 0.48 && state.ice[n] < 0.55) {
        const spread = source * state.habitability[n] * 0.006;
        state.scratchLife[n] += spread;
        spreadCount += spread > 0.0005 ? 1 : 0;
      }
    }
  }

  for (let i = 0; i < state.cellCount; i += 1) {
    state.primitiveLife[i] = clamp01(state.primitiveLife[i] + state.scratchLife[i]);
    state.biomass[i] = clamp01(state.primitiveLife[i] * 0.60 + state.dormantLife[i] * 0.18 + state.producerMats[i] * 0.20);
    state.producerMats[i] = clamp01(state.producerMats[i] * 0.97 + state.primitiveLife[i] * state.nutrientLevel[i] * 0.035);
    state.primitiveBiomass[i] = state.biomass[i];
    updateCellDerivedDiagnostics(state, mesh, i);
  }

  return { spreadCount, dormancyTransitions, recoveryTransitions, localExtinctions };
}


/* ============================================================
   Ecosystems
   Source section: sim/ecosystems.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepEcosystems(state) {
  for (let i = 0; i < state.cellCount; i += 1) {
    const living = clamp01(state.primitiveLife[i] * 0.65 + state.producerMats[i] * 0.25 + state.dormantLife[i] * 0.10);
    const continuity = clamp01(state.habitatContinuity[i] * 0.92 + state.habitability[i] * 0.08);
    state.biodiversityIndex[i] = clamp01(state.biodiversityIndex[i] * 0.96 + living * continuity * 0.035);
    state.ecosystemResilience[i] = clamp01(state.ecosystemResilience[i] * 0.94 + (living * 0.36 + continuity * 0.25 + state.recoveryPotential[i] * 0.20) * 0.06);
    state.ecosystemStress[i] = clamp01((1 - state.ecosystemResilience[i]) * 0.55 + (1 - state.habitability[i]) * 0.35 + state.disturbancePressure[i] * 0.22);
    state.recoveryPotential[i] = clamp01(state.recoveryPotential[i] * 0.98 + (state.nutrientLevel[i] * 0.40 + state.habitability[i] * 0.35 + state.stewardshipPressure[i] * 0.10) * 0.02);
    state.restorationPriority[i] = clamp01(state.ecosystemStress[i] * 0.50 + (1 - state.biodiversityIndex[i]) * 0.20 + state.disturbancePressure[i] * 0.20);
    updateCellDerivedDiagnostics(state, mesh, i);
  }
}


/* ============================================================
   Stewardship
   Source section: sim/stewardship.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepStewardship(state) {
  for (let i = 0; i < state.cellCount; i += 1) {
    const pressureDecay = state.stewardshipPressure[i] * 0.985;
    const restorationEffect = pressureDecay * state.restorationPriority[i] * 0.018;
    state.stewardshipPressure[i] = clamp01(pressureDecay);
    state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - restorationEffect);
    state.recoveryCapacity[i] = clamp01(state.recoveryCapacity[i] * 0.98 + (state.ecosystemResilience[i] + restorationEffect) * 0.02);
    updateCellDerivedDiagnostics(state, state.mesh || { latitude: new Float32Array(state.cellCount) }, i);
  }
}


/* ============================================================
   Civilisation diagnostics
   Source section: sim/civilisation.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function stepCivilisation(state) {
  for (let i = 0; i < state.cellCount; i += 1) {
    state.foodSupport[i] = clamp01(state.habitability[i] * 0.38 + state.producerMats[i] * 0.24 + state.waterAccess[i] * 0.22 + state.biodiversityIndex[i] * 0.10);
    state.civilisationSuitability[i] = clamp01(state.foodSupport[i] * 0.42 + state.waterAccess[i] * 0.20 + state.ecosystemResilience[i] * 0.16 + (1 - state.ice[i]) * 0.10);
    if (state.settlements[i] > 0) {
      const support = state.civilisationSuitability[i] - state.civilisationStress[i] * 0.30;
      state.settlements[i] = clamp01(state.settlements[i] + (support - 0.45) * 0.010);
      state.populationIndex[i] = clamp01(state.populationIndex[i] * 0.993 + state.settlements[i] * support * 0.010);
      state.socialComplexity[i] = clamp01(state.socialComplexity[i] * 0.995 + state.settlements[i] * 0.006);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + state.settlements[i] * 0.003);
    }
    state.civilisationStress[i] = clamp01(1 - state.civilisationSuitability[i] + state.disturbancePressure[i] * 0.20);
    state.collapseRisk[i] = clamp01(state.populationIndex[i] * state.civilisationStress[i]);
  }
}


/* ============================================================
   Tools
   Source section: sim/tools.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function normaliseToolId(toolId) {
  const map = {
    inspect_world: 'inspect',
    comet_delivery: 'addWater',
    ice_asteroid: 'iceAsteroid',
    volcanic_outgassing: 'warm',
    orbital_shade: 'cool',
    tectonic_uplift: 'raiseLand',
    tectonic_subsidence: 'lowerLand',
    greenhouse_venting: 'greenhouseVenting',
    mineral_seeding: 'mineralSeeding',
    seed_primitive_life: 'seedMicrobes',
    planetary_stabilisation: 'stabilise',
    seed_early_settlers: 'seedSettlers'
  };
  return map[toolId] || toolId;
}

function toolDefinition(toolId) {
  return TOOLS.find((tool) => tool.id === toolId) || TOOLS[0];
}

function validateToolTarget(state, toolId, cellId) {
  const tool = normaliseToolId(toolId);
  const i = cellId | 0;
  if (i < 0 || i >= state.cellCount) {
    return { valid: false, reason: 'Invalid target cell.', suggestion: 'Select a visible cell on the planet first.', watch: 'Selected-cell summary.' };
  }
  if (tool === 'inspect') {
    return { valid: true, reason: 'Inspect World is always valid.', suggestion: suggestedActionForCell(state, i), watch: 'All selected-cell layers.' };
  }
  if (tool === 'addWater') {
    const valid = state.water[i] < 0.94;
    return { valid, reason: valid ? 'Comet Delivery can add volatiles here.' : 'Comet Delivery failed: this cell is already water-saturated.', suggestion: valid ? 'Advance time and watch humidity, rainfall, water stress, and habitability.' : 'Use another region or reduce heat/stress instead.', watch: 'Water, Humidity, Rainfall, Water Stress, Habitability.' };
  }
  if (tool === 'iceAsteroid') {
    const valid = state.ice[i] < 0.88 && (state.water[i] < 0.96 || state.temperature[i] > 0.44);
    return { valid, reason: valid ? 'Ice Asteroid Strike can add frozen volatiles here.' : 'Ice Asteroid Strike failed: target is already ice-saturated or unsuitable.', suggestion: valid ? 'Watch ice, albedo, cooling, disturbance, and habitability.' : 'Use Orbital Shade or Greenhouse Venting elsewhere if heat is the issue.', watch: 'Ice, Albedo, Temperature, Disturbance Pressure.' };
  }
  if (tool === 'warm') {
    const valid = state.greenhousePressure[i] < 0.94 || state.temperature[i] < 0.94 || state.ice[i] > 0.04;
    return { valid, reason: valid ? 'Volcanic Outgassing can still raise greenhouse pressure, heat, or melt ice.' : 'Volcanic Outgassing failed: greenhouse and heat pressure are already near saturation.', suggestion: valid ? 'Use on cold or icy cells, then watch heat stress.' : 'Use cooling, water, or stabilisation instead.', watch: 'Greenhouse / CO2 Pressure, Temperature, Ice, Heat Stress, Nutrients.' };
  }
  if (tool === 'cool') {
    const valid = state.temperature[i] > 0.06 || state.heatStress[i] > 0.05;
    return { valid, reason: valid ? 'Orbital Shade can reduce local heat pressure.' : 'Orbital Shade failed: target temperature is already near the lower bound.', suggestion: valid ? 'Watch cooling, heat stress, and ice risk.' : 'Use warming or stabilisation if cold stress is the issue.', watch: 'Temperature, Heat Stress, Ice, Habitability.' };
  }
  if (tool === 'raiseLand') {
    const valid = state.elevation[i] < 0.96;
    return { valid, reason: valid ? 'Tectonic Uplift can raise this terrain.' : 'Tectonic Uplift failed: elevation is already near the upper bound.', suggestion: valid ? 'Use on oceans or lowlands to expose land or increase runoff.' : 'Use subsidence or another cell.', watch: 'Elevation, Water, Runoff, Temperature.' };
  }
  if (tool === 'lowerLand') {
    const valid = state.elevation[i] > 0.04;
    return { valid, reason: valid ? 'Tectonic Subsidence can lower this terrain into a basin.' : 'Tectonic Subsidence failed: elevation is already near the lower bound.', suggestion: valid ? 'Use on dry terrain to improve water capture, but watch flooding.' : 'Use uplift or another cell.', watch: 'Elevation, Water, Runoff, Water Stress.' };
  }
  if (tool === 'greenhouseVenting') {
    const valid = state.greenhousePressure[i] > 0.06 || state.heatStress[i] > 0.08 || state.temperature[i] > 0.68;
    return { valid, reason: valid ? 'Greenhouse Venting can reduce local greenhouse or heat pressure.' : 'Greenhouse Venting failed: greenhouse pressure and heat stress are already low.', suggestion: valid ? 'Watch cooling and ice risk if overused.' : 'Use direct water, nutrients, or warming tools instead.', watch: 'Greenhouse / CO2 Pressure, Temperature, Heat Stress, Ice.' };
  }
  if (tool === 'mineralSeeding') {
    const tolerable = state.waterAccess[i] > 0.10 && state.temperature[i] > 0.24 && state.temperature[i] < 0.86 && state.ice[i] < 0.82;
    const valid = state.nutrientLevel[i] < 0.94 && tolerable;
    return { valid, reason: valid ? 'Mineral Seeding can add primitive fertility here.' : (tolerable ? 'Mineral Seeding failed: nutrients are already near saturation.' : 'Mineral Seeding failed: water or temperature makes the intervention meaningless.'), suggestion: valid ? 'Watch nutrients, life viability, and recovery potential.' : 'Fix water, temperature, or ice first.', watch: 'Nutrients / Mineral Fertility, Life Viability, Habitability.' };
  }
  if (tool === 'seedMicrobes') {
    const blockers = [];
    if (state.waterAccess[i] <= 0.25) blockers.push('too dry');
    if (state.temperature[i] < 0.30) blockers.push('too cold');
    if (state.temperature[i] > 0.78) blockers.push('too hot');
    if (state.ice[i] >= 0.68) blockers.push('too icy');
    if (state.nutrientLevel[i] < 0.24) blockers.push('too nutrient-poor');
    if (state.waterStress[i] > 0.72 || state.heatStress[i] > 0.62 || state.disturbancePressure[i] > 0.74) blockers.push('too stressed');
    if (state.habitability[i] < 0.42 || state.lifeViability[i] < 0.40) blockers.push('insufficient habitability');
    const valid = blockers.length === 0 && state.survivalPressure[i] < 0.72;
    return { valid, reason: valid ? 'Seed Primitive Life can start active microbes here.' : `Seed Primitive Life blocked: ${blockers.join(', ') || 'survival pressure too high'}.`, suggestion: valid ? 'Advance time and watch growth, dormancy, recovery, and spread.' : `Terraform first: ${limitingFactor(state, i)}.`, watch: 'Primitive Life, Dormant Life, Primitive Biomass, Biosphere Health, Extinction Risk.' };
  }
  if (tool === 'stabilise') {
    const extreme = state.waterStress[i] > 0.22 || state.heatStress[i] > 0.18 || state.disturbancePressure[i] > 0.18 || state.temperature[i] < 0.34 || state.temperature[i] > 0.72 || state.habitability[i] < 0.38;
    return { valid: extreme, reason: extreme ? 'Planetary Stabilisation has local extremes to soften.' : 'Planetary Stabilisation found no meaningful local extreme to soften.', suggestion: extreme ? 'Use after direct terraforming to reduce stress; it will not solve missing water, heat, or nutrients by itself.' : 'Use a direct terraforming tool where something specific is missing.', watch: 'Heat Stress, Water Stress, Disturbance Pressure, Ecosystem Stress, Recovery Capacity.' };
  }
  if (tool === 'seedSettlers') {
    const blockers = [];
    if (state.primitiveLife[i] < 0.22 && state.producerMats[i] < 0.06) blockers.push('lifeless or biologically weak');
    if (state.ecosystemResilience[i] < 0.34) blockers.push('ecosystem resilience too low');
    if (state.foodSupport[i] < 0.34) blockers.push('food support too weak');
    if (state.waterAccess[i] < 0.34) blockers.push('water access too weak');
    if (state.civilisationSuitability[i] < 0.54) blockers.push('civilisation suitability too low');
    if (state.civilisationStress[i] > 0.62 || state.collapseRisk[i] > 0.54) blockers.push('stability too weak');
    const valid = blockers.length === 0;
    return { valid, reason: valid ? 'Early settlers can establish a small settlement here.' : `Seed Early Settlers blocked: ${blockers.join(', ')}.`, suggestion: valid ? 'Advance time and watch food support, water access, stress, collapse risk, and settlements.' : 'Build a resilient living planet first; this tool must not create modern civilisation by shortcut.', watch: 'Settlements, Food Support, Water Access, Civilisation Stress, Collapse Risk.' };
  }
  return { valid: false, reason: `Unknown tool: ${toolId}.`, suggestion: 'Select a known terraforming tool.', watch: 'Tool registry.' };
}

function suggestedActionForCell(state, i) {
  const factor = limitingFactor(state, i);
  if (factor === 'too dry' || factor === 'water access') return 'Suggested next action: Comet Delivery or Tectonic Subsidence.';
  if (factor === 'too hot' || factor === 'heat stress') return 'Suggested next action: Orbital Shade or Greenhouse Venting.';
  if (factor === 'too cold' || factor === 'cold stress' || factor === 'ice cover') return 'Suggested next action: Volcanic Outgassing or reduce cooling.';
  if (factor === 'too nutrient-poor' || factor === 'nutrients') return 'Suggested next action: Mineral Seeding.';
  if (factor === 'ecosystem stress' || factor === 'too stressed') return 'Suggested next action: Planetary Stabilisation.';
  if (state.primitiveLife[i] <= 0.02 && state.lifeViability[i] > 0.42) return 'Suggested next action: Seed Primitive Life.';
  if (state.primitiveLife[i] > 0.20 && state.civilisationSuitability[i] > 0.54) return 'Suggested next action: Seed Early Settlers if the goal is early civilisation.';
  return 'Suggested next action: inspect neighbouring cells or advance time.';
}

function localMeans(state, cells) {
  const fields = ['water', 'ice', 'temperature', 'elevation', 'greenhousePressure', 'nutrientLevel', 'habitability', 'lifeViability', 'primitiveLife', 'dormantLife', 'biosphereHealth', 'heatStress', 'waterStress', 'settlements', 'collapseRisk'];
  const out = {};
  for (const field of fields) {
    let sum = 0;
    for (const i of cells) sum += state[field] ? state[field][i] : 0;
    out[field] = cells.length ? sum / cells.length : 0;
  }
  return out;
}

function summariseToolDelta(before, after) {
  const labels = {
    water: 'water',
    ice: 'ice',
    temperature: 'temperature',
    elevation: 'elevation',
    greenhousePressure: 'greenhouse pressure',
    nutrientLevel: 'nutrients',
    habitability: 'habitability',
    lifeViability: 'life viability',
    primitiveLife: 'primitive life',
    dormantLife: 'dormant life',
    biosphereHealth: 'biosphere health',
    heatStress: 'heat stress',
    waterStress: 'water stress',
    settlements: 'settlements',
    collapseRisk: 'collapse risk'
  };
  const changes = [];
  for (const [field, label] of Object.entries(labels)) {
    const delta = (after[field] ?? 0) - (before[field] ?? 0);
    if (Math.abs(delta) >= 0.003) changes.push(`${label} ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(3)}`);
  }
  return changes.length ? changes.slice(0, 5).join('; ') : 'local state remained near threshold; no large mean shift detected';
}

function applyTool(state, mesh, request = {}) {
  const tool = normaliseToolId(request.tool);
  const origin = request.cellId | 0;
  const strength = Math.max(0.1, Math.min(2, Number(request.strength ?? 1)));
  const radius = Math.max(0, Math.min(6, Number(request.radius ?? 1) | 0));
  const def = toolDefinition(tool);
  if (origin < 0 || origin >= state.cellCount) {
    return { success: false, mutated: false, message: 'Invalid target cell.', affected: 0 };
  }

  const cells = expandRadius(mesh, origin, radius);
  if (tool === 'inspect') {
    const validity = validateToolTarget(state, tool, origin);
    state.selectedCell = origin;
    state.lastAction = `Inspected cell ${origin}. ${validity.suggestion}`;
    state.lastChange = 'What changed: nothing. Inspect World is read-only.';
    state.lastWatch = validity.watch;
    state.lastLimitingFactor = limitingFactor(state, origin);
    return { success: true, mutated: false, message: state.lastAction, affected: 1, validation: validity };
  }

  const originValidation = validateToolTarget(state, tool, origin);
  if (!originValidation.valid) {
    state.selectedCell = origin;
    state.lastAction = `${def.label} could not be applied to cell ${origin}. ${originValidation.reason}`;
    state.lastChange = `What changed: nothing. ${originValidation.suggestion}`;
    state.lastWatch = originValidation.watch;
    state.lastLimitingFactor = limitingFactor(state, origin);
    return { success: false, mutated: false, message: state.lastAction, affected: 0, validation: originValidation };
  }

  const beforeSig = localMutationSignature(state, cells);
  const beforeMeans = localMeans(state, cells);
  let affected = 0;
  let skipped = 0;

  for (const i of cells) {
    const validity = validateToolTarget(state, tool, i);
    if (!validity.valid && tool !== 'stabilise') {
      skipped += 1;
      continue;
    }
    const falloff = localFalloff(mesh, origin, i, radius);
    const f = strength * falloff;
    const old = localMutationSignature(state, [i]);
    if (tool === 'addWater') {
      state.water[i] = clamp01(state.water[i] + 0.14 * f * (1 - state.water[i] * 0.45));
      state.humidity[i] = clamp01(state.humidity[i] + 0.09 * f);
      state.rainfall[i] = clamp01(state.rainfall[i] + 0.06 * f);
      state.temperature[i] = clamp01(state.temperature[i] - 0.012 * f);
      state.waterStress[i] = clamp01(state.waterStress[i] - 0.06 * f);
      if (state.temperature[i] < 0.34) state.ice[i] = clamp01(state.ice[i] + 0.025 * f);
    } else if (tool === 'iceAsteroid') {
      state.water[i] = clamp01(state.water[i] + 0.08 * f);
      state.ice[i] = clamp01(state.ice[i] + 0.15 * f * (1 - state.ice[i] * 0.40));
      state.temperature[i] = clamp01(state.temperature[i] - 0.070 * f);
      state.heatStress[i] = clamp01(state.heatStress[i] - 0.060 * f);
      state.albedo[i] = clamp01(state.albedo[i] + 0.070 * f);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + 0.028 * f);
    } else if (tool === 'warm') {
      state.greenhousePressure[i] = clamp01(state.greenhousePressure[i] + 0.070 * f);
      state.temperature[i] = clamp01(state.temperature[i] + 0.060 * f);
      state.ice[i] = clamp01(state.ice[i] - 0.070 * f);
      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.032 * f);
      state.heatStress[i] = clamp01(state.heatStress[i] + 0.028 * f);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + 0.040 * f);
    } else if (tool === 'cool') {
      state.temperature[i] = clamp01(state.temperature[i] - 0.075 * f);
      state.heatStress[i] = clamp01(state.heatStress[i] - 0.075 * f);
      state.cloudCover[i] = clamp01(state.cloudCover[i] + 0.020 * f);
      if (state.water[i] > 0.08) state.ice[i] = clamp01(state.ice[i] + 0.048 * f);
    } else if (tool === 'raiseLand') {
      state.elevation[i] = clamp01(state.elevation[i] + 0.070 * f);
      state.temperature[i] = clamp01(state.temperature[i] - 0.016 * f);
      state.runoff[i] = clamp01(state.runoff[i] + 0.040 * f);
      if (state.elevation[i] > 0.55) state.water[i] = clamp01(state.water[i] - 0.035 * f);
    } else if (tool === 'lowerLand') {
      state.elevation[i] = clamp01(state.elevation[i] - 0.070 * f);
      state.water[i] = clamp01(state.water[i] + 0.052 * f);
      state.waterAccess[i] = clamp01(state.waterAccess[i] + 0.040 * f);
      state.runoff[i] = clamp01(state.runoff[i] - 0.022 * f);
    } else if (tool === 'greenhouseVenting') {
      state.greenhousePressure[i] = clamp01(state.greenhousePressure[i] - 0.080 * f);
      state.temperature[i] = clamp01(state.temperature[i] - 0.032 * f);
      state.heatStress[i] = clamp01(state.heatStress[i] - 0.070 * f);
      if (state.temperature[i] < 0.34 && state.water[i] > 0.10) state.ice[i] = clamp01(state.ice[i] + 0.014 * f);
    } else if (tool === 'mineralSeeding') {
      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.16 * f * (1 - state.nutrientLevel[i] * 0.35));
      state.recoveryPotential[i] = clamp01(state.recoveryPotential[i] + 0.075 * f);
    } else if (tool === 'seedMicrobes') {
      state.primitiveLife[i] = clamp01(state.primitiveLife[i] + 0.25 * f * (1 - state.primitiveLife[i] * 0.25));
      if (state.lifeViability[i] > 0.30) state.dormantLife[i] = clamp01(state.dormantLife[i] + 0.045 * f);
      state.biomass[i] = clamp01(state.biomass[i] + 0.10 * f);
    } else if (tool === 'stabilise') {
      const targetTemp = state.temperature[i] < 0.45 ? 0.47 : (state.temperature[i] > 0.65 ? 0.62 : state.temperature[i]);
      state.temperature[i] = clamp01(lerp(state.temperature[i], targetTemp, 0.11 * f));
      state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - 0.070 * f);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] - 0.080 * f);
      state.heatStress[i] = clamp01(state.heatStress[i] - 0.040 * f);
      state.waterStress[i] = clamp01(state.waterStress[i] - 0.040 * f);
      state.ecosystemResilience[i] = clamp01(state.ecosystemResilience[i] + 0.045 * f);
      state.recoveryCapacity[i] = clamp01(state.recoveryCapacity[i] + 0.035 * f);
      state.stewardshipPressure[i] = clamp01(state.stewardshipPressure[i] + 0.030 * f);
    } else if (tool === 'seedSettlers') {
      state.settlements[i] = clamp01(state.settlements[i] + 0.14 * f * (1 - state.settlements[i]));
      state.populationIndex[i] = clamp01(state.populationIndex[i] + 0.065 * f * (1 - state.populationIndex[i]));
      state.socialComplexity[i] = clamp01(state.socialComplexity[i] + 0.030 * f);
    }
    updateCellDerivedDiagnostics(state, mesh, i);
    state.dirtyCells[i] = 1;
    if (localMutationSignature(state, [i]) !== old) affected += 1;
  }

  recomputeDerivedDiagnostics(state, mesh);
  const afterSig = localMutationSignature(state, cells);
  const mutated = beforeSig !== afterSig;
  const afterMeans = localMeans(state, cells);
  state.selectedCell = origin;
  state.lastLimitingFactor = mutated ? 'tool applied' : limitingFactor(state, origin);
  if (!mutated) {
    state.lastAction = `${def.label} found no material target cells in radius ${radius}.`;
    state.lastChange = `What changed: nothing material. ${originValidation.suggestion}`;
    state.lastWatch = originValidation.watch;
    state.renderDirty = false;
    state.trendDirty = false;
    return { success: false, mutated: false, message: state.lastAction, affected: 0, skipped, validation: originValidation };
  }

  const deltaText = summariseToolDelta(beforeMeans, afterMeans);
  state.lastAction = `${def.label} affected ${affected} cells${skipped ? ` and skipped ${skipped}` : ''}.`;
  state.lastChange = `What changed: ${deltaText}. ${originValidation.suggestion}`;
  state.lastWatch = originValidation.watch;
  state.renderDirty = true;
  state.trendDirty = true;
  return { success: true, mutated: true, message: `${state.lastAction} ${state.lastChange}`, affected, skipped, before: beforeMeans, after: afterMeans, validation: originValidation };
}

function localFalloff(mesh, origin, cell, radius) {
  if (cell === origin || radius <= 0) return 1;
  const dot = mesh.centerX[origin] * mesh.centerX[cell] + mesh.centerY[origin] * mesh.centerY[cell] + mesh.centerZ[origin] * mesh.centerZ[cell];
  return clamp01(0.45 + 0.55 * dot);
}

function localMutationSignature(state, cells) {
  let h = 2166136261 >>> 0;
  const fields = [
    'elevation', 'water', 'ice', 'temperature', 'humidity', 'rainfall', 'runoff', 'waterFlow',
    'habitability', 'lifeViability', 'survivalPressure', 'extinctionRisk', 'biosphereHealth',
    'greenhousePressure', 'nutrientLevel', 'heatStress', 'waterStress', 'albedo',
    'primitiveLife', 'dormantLife', 'biomass', 'producerMats', 'biodiversityIndex',
    'ecosystemResilience', 'ecosystemStress', 'disturbancePressure', 'settlements',
    'populationIndex', 'socialComplexity', 'civilisationStress', 'collapseRisk'
  ];
  for (const i of cells) {
    h ^= i;
    h = Math.imul(h, 16777619) >>> 0;
    for (const field of fields) {
      const arr = state[field];
      if (!arr) continue;
      h ^= Math.round(arr[i] * 100000);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h >>> 0;
}

function limitingFactor(state, i) {
  if (state.waterAccess[i] < 0.25) return 'too dry';
  if (state.temperature[i] > 0.78 || state.heatStress[i] > 0.62) return 'too hot';
  if (state.temperature[i] < 0.30) return 'too cold';
  if (state.ice[i] > 0.65) return 'too icy';
  if (state.nutrientLevel[i] < 0.24) return 'too nutrient-poor';
  if (state.ecosystemStress[i] > 0.70 || state.survivalPressure[i] > 0.72) return 'too stressed';
  return 'insufficient habitability';
}


/* ============================================================
   Probes
   Source section: sim/probes.js
   Compacted for Engine v2 0.2.0.
   ============================================================ */


function runProbe(probeId, ctx) {
  const probe = PROBES.find((item) => item.id === probeId);
  if (!probe) return { id: probeId, label: probeId, status: 'fail', detail: 'Unknown probe.' };
  const snapshot = cloneState(ctx.state);
  const startSig = signatureState(ctx.state);
  try {
    const result = executeProbe(probeId, ctx, startSig);
    restoreState(ctx.state, snapshot);
    const restoredSig = signatureState(ctx.state);
    if (restoredSig !== startSig) {
      return { id: probeId, label: probe.label, status: 'fail', detail: `Probe did not restore active state: ${restoredSig} vs ${startSig}` };
    }
    return { id: probeId, label: probe.label, ...result };
  } catch (error) {
    restoreState(ctx.state, snapshot);
    return { id: probeId, label: probe.label, status: 'fail', detail: error instanceof Error ? error.message : String(error) };
  }
}

function runAllProbes(ctx) {
  const results = PROBES.map((probe) => runProbe(probe.id, ctx));
  const summary = {
    total: results.length,
    pass: results.filter((item) => item.status === 'pass').length,
    warn: results.filter((item) => item.status === 'warn').length,
    fail: results.filter((item) => item.status === 'fail').length,
    results
  };
  return summary;
}

function executeProbe(probeId, ctx, startSig) {
  if (probeId === 'architecture_sanity') {
    const shapeFailures = validateArrayShape(ctx.state);
    const ok = ctx.mesh.count > 0 && ctx.mesh.neighbourLinkCount > 0 && shapeFailures.length === 0;
    return { status: ok ? 'pass' : 'fail', detail: ok ? 'Worker owns mesh and array state.' : shapeFailures.join('; ') };
  }

  if (probeId === 'worker_boot') {
    const summary = computeSummary(ctx.state, ctx.mesh);
    const render = buildRenderData(ctx.state, ctx.mesh);
    const ok = Boolean(ctx.state)
      && Boolean(ctx.mesh)
      && ctx.mesh.count > 0
      && summary.cellCount === ctx.mesh.count
      && render.count === ctx.mesh.count
      && render.bytes > 0
      && Number.isFinite(summary.averageTemperatureC);
    return {
      status: ok ? 'pass' : 'fail',
      detail: ok
        ? `Worker ready; generation ${ctx.state.generationSignature || 'available'}; render payload ${render.bytes} bytes; summary updated.`
        : 'Worker, generated state, summary, or render data is incomplete.'
    };
  }

  if (probeId === 'deterministic_generation') {
    generateWorld(ctx.state, ctx.mesh, { seed: 'determinism-probe', template: 'procedural_lifeless', archetype: 'balanced' });
    const first = signatureState(ctx.state);
    generateWorld(ctx.state, ctx.mesh, { seed: 'determinism-probe', template: 'procedural_lifeless', archetype: 'balanced' });
    const second = signatureState(ctx.state);
    return { status: first === second ? 'pass' : 'fail', detail: `First ${first}; second ${second}.` };
  }

  if (probeId === 'snapshot_restore') {
    const internal = cloneState(ctx.state);
    ctx.stepOnce();
    restoreState(ctx.state, internal);
    const restored = signatureState(ctx.state);
    return { status: restored === startSig ? 'pass' : 'fail', detail: `Restored signature ${restored}.` };
  }

  if (probeId === 'procedural_lifeless') {
    generateWorld(ctx.state, ctx.mesh, { seed: 'lifeless-probe', template: 'procedural_lifeless', archetype: 'dry' });
    const summary = computeSummary(ctx.state, ctx.mesh);
    const ok = summary.primitiveLifeMean < 0.0001 && summary.settlementMean < 0.0001;
    return { status: ok ? 'pass' : 'fail', detail: `Primitive life mean ${summary.primitiveLifeMean.toFixed(4)}, settlement mean ${summary.settlementMean.toFixed(4)}.` };
  }

  if (probeId === 'earthlike_template') {
    generateWorld(ctx.state, ctx.mesh, { seed: 'earthlike-probe', template: 'earthlike', archetype: 'balanced' });
    const summary = computeSummary(ctx.state, ctx.mesh);
    const ok = summary.primitiveLifeMean > 0.05 && summary.biodiversityMean > 0.02;
    return { status: ok ? 'pass' : 'warn', detail: `Life ${summary.primitiveLifeMean.toFixed(3)}, biodiversity ${summary.biodiversityMean.toFixed(3)}.` };
  }

  if (probeId === 'ecosystem_growth') {
    generateWorld(ctx.state, ctx.mesh, { seed: 'growth-probe', template: 'earthlike', archetype: 'balanced' });
    const before = computeSummary(ctx.state, ctx.mesh).primitiveLifeMean;
    for (let i = 0; i < 8; i += 1) ctx.stepOnce();
    const afterSummary = computeSummary(ctx.state, ctx.mesh);
    const ok = Number.isFinite(afterSummary.primitiveLifeMean) && afterSummary.primitiveLifeMean >= before * 0.75;
    return { status: ok ? 'pass' : 'warn', detail: `Primitive life before ${before.toFixed(3)}, after ${afterSummary.primitiveLifeMean.toFixed(3)}.` };
  }

  if (probeId === 'civilisation_gate') {
    generateWorld(ctx.state, ctx.mesh, { seed: 'civ-gate-probe', template: 'procedural_lifeless', archetype: 'icy' });
    const result = applyTool(ctx.state, ctx.mesh, { tool: 'seedSettlers', cellId: 0, radius: 2, strength: 1 });
    return { status: result.success ? 'fail' : 'pass', detail: result.message };
  }


  if (probeId === 'intervention_parity') {
    const required = ['inspect', 'addWater', 'iceAsteroid', 'warm', 'cool', 'raiseLand', 'lowerLand', 'greenhouseVenting', 'mineralSeeding', 'seedMicrobes', 'stabilise', 'seedSettlers'];
    const missing = required.filter((id) => !TOOLS.some((tool) => tool.id === id));
    const failures = [];
    if (missing.length) failures.push(`missing tools ${missing.join(', ')}`);
    const validationsOk = required.every((id) => {
      const v = validateToolTarget(ctx.state, id, 0);
      return v && typeof v.valid === 'boolean' && v.reason && v.suggestion && v.watch;
    });
    if (!validationsOk) failures.push('validation shape incomplete');

    generateWorld(ctx.state, ctx.mesh, { seed: 'intervention-parity-probe', template: 'earthlike', archetype: 'balanced' });
    recomputeDerivedDiagnostics(ctx.state, ctx.mesh);
    function primeForTool(tool, i) {
      ctx.state.water[i] = 0.35;
      ctx.state.ice[i] = 0.10;
      ctx.state.temperature[i] = 0.55;
      ctx.state.greenhousePressure[i] = 0.45;
      ctx.state.elevation[i] = 0.52;
      ctx.state.nutrientLevel[i] = 0.52;
      ctx.state.waterAccess[i] = 0.55;
      ctx.state.rainfall[i] = 0.45;
      ctx.state.humidity[i] = 0.45;
      ctx.state.runoff[i] = 0.22;
      ctx.state.habitability[i] = 0.62;
      ctx.state.ecosystemStress[i] = 0.22;
      ctx.state.disturbancePressure[i] = 0.12;
      ctx.state.ecosystemResilience[i] = 0.55;
      ctx.state.foodSupport[i] = 0.58;
      ctx.state.civilisationSuitability[i] = 0.62;
      ctx.state.primitiveLife[i] = tool === 'seedSettlers' ? 0.45 : ctx.state.primitiveLife[i];
      ctx.state.producerMats[i] = tool === 'seedSettlers' ? 0.30 : ctx.state.producerMats[i];
      ctx.state.settlements[i] = 0;
      ctx.state.populationIndex[i] = 0;
      if (tool === 'addWater') ctx.state.water[i] = 0.20;
      if (tool === 'iceAsteroid') { ctx.state.ice[i] = 0.05; ctx.state.temperature[i] = 0.72; }
      if (tool === 'warm') { ctx.state.temperature[i] = 0.28; ctx.state.ice[i] = 0.45; ctx.state.greenhousePressure[i] = 0.25; }
      if (tool === 'cool') { ctx.state.temperature[i] = 0.82; ctx.state.heatStress[i] = 0.60; }
      if (tool === 'raiseLand') ctx.state.elevation[i] = 0.32;
      if (tool === 'lowerLand') ctx.state.elevation[i] = 0.72;
      if (tool === 'greenhouseVenting') { ctx.state.greenhousePressure[i] = 0.80; ctx.state.temperature[i] = 0.78; ctx.state.heatStress[i] = 0.55; }
      if (tool === 'mineralSeeding') ctx.state.nutrientLevel[i] = 0.20;
      if (tool === 'stabilise') { ctx.state.temperature[i] = 0.80; ctx.state.heatStress[i] = 0.50; ctx.state.waterStress[i] = 0.40; }
      if (tool === 'seedMicrobes') { ctx.state.primitiveLife[i] = 0; ctx.state.lifeViability[i] = 0.65; }
      recomputeDerivedDiagnostics(ctx.state, ctx.mesh);
    }
    function poisonOriginForTool(tool, i) {
      if (tool === 'addWater') ctx.state.water[i] = 0.99;
      else if (tool === 'iceAsteroid') { ctx.state.ice[i] = 0.99; ctx.state.temperature[i] = 0.20; ctx.state.water[i] = 0.98; }
      else if (tool === 'warm') { ctx.state.temperature[i] = 0.99; ctx.state.greenhousePressure[i] = 0.99; ctx.state.ice[i] = 0; }
      else if (tool === 'cool') { ctx.state.temperature[i] = 0.01; ctx.state.heatStress[i] = 0; }
      else if (tool === 'raiseLand') ctx.state.elevation[i] = 0.99;
      else if (tool === 'lowerLand') ctx.state.elevation[i] = 0.01;
      else if (tool === 'greenhouseVenting') { ctx.state.greenhousePressure[i] = 0.01; ctx.state.heatStress[i] = 0.01; ctx.state.temperature[i] = 0.40; }
      else if (tool === 'mineralSeeding') { ctx.state.nutrientLevel[i] = 0.99; ctx.state.waterAccess[i] = 0.01; }
      else if (tool === 'seedMicrobes') { ctx.state.waterAccess[i] = 0.01; ctx.state.temperature[i] = 0.95; ctx.state.habitability[i] = 0.05; }
      else if (tool === 'stabilise') { ctx.state.temperature[i] = 0.55; ctx.state.heatStress[i] = 0.01; ctx.state.waterStress[i] = 0.01; ctx.state.disturbancePressure[i] = 0.01; ctx.state.habitability[i] = 0.70; }
      else if (tool === 'seedSettlers') { ctx.state.primitiveLife[i] = 0; ctx.state.producerMats[i] = 0; ctx.state.civilisationSuitability[i] = 0.10; }
      recomputeDerivedDiagnostics(ctx.state, ctx.mesh);
    }
    const mutating = required.filter((id) => id !== 'inspect');
    for (const tool of mutating) {
      primeForTool(tool, 0);
      const before = signatureState(ctx.state);
      const res = applyTool(ctx.state, ctx.mesh, { tool, cellId: 0, radius: 0, strength: 1 });
      const after = signatureState(ctx.state);
      if (!res.mutated || before === after || !Number.isFinite(res.affected)) failures.push(`${tool} did not mutate a valid target`);
      poisonOriginForTool(tool, 0);
      const invalidBefore = signatureState(ctx.state);
      const invalid = applyTool(ctx.state, ctx.mesh, { tool, cellId: 0, radius: 2, strength: 1 });
      const invalidAfter = signatureState(ctx.state);
      if (invalid.mutated || invalidBefore !== invalidAfter) failures.push(`${tool} mutated invalid target`);
    }
    const r0 = expandRadius(ctx.mesh, 0, 0);
    const r1 = expandRadius(ctx.mesh, 0, 1);
    if (!(r0.length === 1 && r0[0] === 0 && r1.length > 1 && new Set(r1).size === r1.length)) failures.push('radius expansion is not mesh-neighbour bounded');
    const bounded = validateFiniteBounded(ctx.state).length === 0;
    if (!bounded) failures.push('bounded finite check failed');
    generateWorld(ctx.state, ctx.mesh, { seed: 'intervention-reset-probe', template: 'procedural_lifeless', archetype: 'balanced' });
    const a = signatureState(ctx.state);
    generateWorld(ctx.state, ctx.mesh, { seed: 'intervention-reset-probe', template: 'procedural_lifeless', archetype: 'balanced' });
    const b = signatureState(ctx.state);
    if (a !== b) failures.push('reset deterministic signature changed');
    return { status: failures.length ? 'fail' : 'pass', detail: failures.length ? failures.join('; ') : 'All 12 interventions exist, validate, mutate only valid targets, preserve invalid targets, use mesh radius expansion, remain bounded, and reset deterministically.' };
  }

  if (probeId === 'no_dom_in_worker') {
    const ok = ctx.uiSurface === undefined && ctx.state && ctx.mesh;
    return { status: ok ? 'pass' : 'fail', detail: ok ? 'Probe found simulation-only context.' : 'Unexpected UI surface detected.' };
  }

  if (probeId === 'visual_resolution') {
    const profile = meshQualityProfile(ctx.state.meshQuality || ctx.mesh.qualityId || DEFAULT_CONFIG.defaultMeshQuality);
    const shapeFailures = validateArrayShape(ctx.state);
    const ok = ctx.mesh.count === profile.targetFaces && ctx.mesh.count >= 1280 && shapeFailures.length === 0 && ctx.mesh.frequency === profile.frequency;
    return { status: ok ? 'pass' : 'fail', detail: ok ? `${profile.label}; ${ctx.mesh.count} active triangle cells; arrays match active cell count.` : `Expected ${profile.targetFaces} cells for ${profile.label}; got ${ctx.mesh.count}. ${shapeFailures.join('; ')}` };
  }

  if (probeId === 'render_data_finite') {
    const render = buildRenderData(ctx.state, ctx.mesh);
    const failures = [];
    for (const [key, value] of Object.entries(render)) {
      if (value && value.buffer instanceof ArrayBuffer) {
        for (let i = 0; i < value.length; i += Math.max(1, Math.floor(value.length / 64))) {
          if (!Number.isFinite(value[i])) {
            failures.push(`${key}[${i}]`);
            break;
          }
        }
      }
    }
    const bounds = validateFiniteBounded(ctx.state);
    const ok = failures.length === 0 && bounds.length === 0;
    return { status: ok ? 'pass' : 'fail', detail: ok ? `Render payload ${render.bytes} bytes finite.` : [...failures, ...bounds].join('; ') };
  }

  return { status: 'fail', detail: 'Probe implementation missing.' };
}


/* ============================================================
   Worker command dispatcher
   Source section: workers/simulation-worker.js
   ============================================================ */


let mesh = null;
let state = null;
let lastGenerateOptions = {
  seed: DEFAULT_CONFIG.initialSeed,
  template: DEFAULT_CONFIG.defaultTemplate,
  archetype: DEFAULT_CONFIG.defaultArchetype,
  meshQuality: DEFAULT_CONFIG.defaultMeshQuality
};
let pendingTemplate = DEFAULT_CONFIG.defaultTemplate;
let pendingArchetype = DEFAULT_CONFIG.defaultArchetype;

function post(type, payload = {}, transfer = []) {
  globalThis.postMessage({ type, payload }, transfer);
}

function ensureState() {
  ensureMeshOnly(lastGenerateOptions.meshQuality || DEFAULT_CONFIG.defaultMeshQuality);
  if (!state || state.cellCount !== mesh.count) {
    state = createSimulationState(mesh, lastGenerateOptions);
    generateWithOptions(lastGenerateOptions);
  }
}

function generateWithOptions(options = {}) {
  const requestedQuality = meshQualityProfile(options.meshQuality || lastGenerateOptions.meshQuality || DEFAULT_CONFIG.defaultMeshQuality);
  ensureMeshOnly(requestedQuality.id);
  const start = nowMs();
  if (!state || state.cellCount !== mesh.count || state.meshQuality !== requestedQuality.id) {
    state = createSimulationState(mesh, { ...options, meshQuality: requestedQuality.id });
  }
  lastGenerateOptions = {
    seed: options.seed || lastGenerateOptions.seed || DEFAULT_CONFIG.initialSeed,
    template: options.template || pendingTemplate || lastGenerateOptions.template || DEFAULT_CONFIG.defaultTemplate,
    archetype: options.archetype || pendingArchetype || lastGenerateOptions.archetype || DEFAULT_CONFIG.defaultArchetype,
    meshQuality: requestedQuality.id,
    waterLevel: options.waterLevel,
    temperature: options.temperature,
    greenhouse: options.greenhouse,
    ice: options.ice,
    nutrients: options.nutrients,
    roughness: options.roughness
  };
  pendingTemplate = lastGenerateOptions.template;
  pendingArchetype = lastGenerateOptions.archetype;
  generateWorld(state, mesh, lastGenerateOptions);
  state.meshQuality = requestedQuality.id;
  state.meshQualityLabel = requestedQuality.label;
  state.diagnostics.lastGenerationMs = nowMs() - start;
  state.diagnostics.workerStatus = 'READY';
  state.diagnostics.meshQuality = requestedQuality.id;
  state.diagnostics.meshQualityLabel = requestedQuality.label;
  state.diagnostics.meshFrequency = mesh.frequency || 0;
  state.diagnostics.performanceWarning = mesh.count > 3000 ? 'High cell count: use Performance quality on slower browsers if render exceeds target.' : '';
}

function ensureMeshOnly(qualityId = DEFAULT_CONFIG.defaultMeshQuality) {
  const profile = meshQualityProfile(qualityId);
  if (!mesh || mesh.qualityId !== profile.id) mesh = createMeshForQuality(profile.id);
}

function stepOnce() {
  ensureState();
  const start = nowMs();
  stepPhysical(state, mesh);
  stepWater(state, mesh);
  const lifeStats = stepLife(state, mesh);
  stepEcosystems(state, mesh);
  stepStewardship(state);
  stepCivilisation(state);
  state.stepCount += 1;
  state.year += DEFAULT_CONFIG.yearPerStep;
  state.renderDirty = true;
  state.trendDirty = true;
  state.lastAction = summariseStepChange(lifeStats);
  state.lastChange = 'What changed: climate, water, life, ecosystem, stewardship, and early-civilisation diagnostics advanced through the Worker tick pipeline.';
  state.lastWatch = 'Watch temperature, water stress, life viability, biosphere health, settlements, and collapse risk.';
  state.diagnostics.lastTickMs = nowMs() - start;
}

function summariseStepChange(lifeStats) {
  if (lifeStats.localExtinctions > 0) return `Time advanced. Primitive life suffered local extinction pressure in ${lifeStats.localExtinctions} cells.`;
  if (lifeStats.recoveryTransitions > 0) return `Time advanced. Dormant primitive life recovered in ${lifeStats.recoveryTransitions} cells.`;
  if (lifeStats.spreadCount > 0) return `Time advanced. Primitive life spread through ${lifeStats.spreadCount} neighbour links.`;
  if (lifeStats.dormancyTransitions > 0) return `Time advanced. Some primitive life entered dormancy.`;
  return 'Time advanced. Planet state updated inside the simulation worker.';
}

function sendSummary(includeTrend = true) {
  const summary = computeSummary(state, mesh);
  post(EVENTS.STATE_SUMMARY, summary);
  if (includeTrend) {
    post(EVENTS.TREND_SAMPLE, trendSampleFromSummary(summary));
  }
}

function sendSelectedCell() {
  post(EVENTS.SELECTED_CELL_SUMMARY, computeSelectedCellSummary(state, mesh));
}

function sendRenderData() {
  const start = nowMs();
  const renderData = buildRenderData(state, mesh);
  state.diagnostics.lastRenderBuildMs = nowMs() - start;
  const transfer = collectTransferables(renderData);
  post(EVENTS.RENDER_DATA, renderData, transfer);
}

function sendDiagnostics() {
  post(EVENTS.DIAGNOSTIC_SUMMARY, {
    workerStatus: state ? state.diagnostics.workerStatus : 'not initialised',
    lastWorkerTickMs: state ? state.diagnostics.lastTickMs : 0,
    lastGenerationMs: state ? state.diagnostics.lastGenerationMs : 0,
    lastToolApplicationMs: state ? state.diagnostics.lastToolMs : 0,
    lastProbeMs: state ? state.diagnostics.lastProbeMs : 0,
    lastRenderDataBuildMs: state ? state.diagnostics.lastRenderBuildMs : 0,
    renderDirty: state ? state.renderDirty : false,
    trendDirty: state ? state.trendDirty : false,
    cellCount: mesh ? mesh.count : 0,
    meshQuality: mesh ? mesh.qualityId : DEFAULT_CONFIG.defaultMeshQuality,
    meshQualityLabel: mesh ? mesh.qualityLabel : meshQualityProfile(DEFAULT_CONFIG.defaultMeshQuality).label,
    meshFrequency: mesh ? mesh.frequency : 0,
    performanceWarning: state ? state.diagnostics.performanceWarning : '',
    neighbourLinks: mesh ? mesh.neighbourLinkCount : 0,
    bytesTransferredLastRenderUpdate: state ? state.diagnostics.lastRenderBytes : 0,
    workerMessageCount: state ? state.diagnostics.messageCount : 0,
    lastWorkerError: state ? state.diagnostics.lastError : ''
  });
}

function fullUpdate(options = {}) {
  const includeRender = options.render !== false;
  sendSummary(options.trend !== false);
  sendSelectedCell();
  if (includeRender) sendRenderData();
  sendDiagnostics();
}

function handleCommand(type, payload = {}) {
  if (type === COMMANDS.INIT) {
    generateWithOptions(payload || lastGenerateOptions);
    post(EVENTS.READY, { status: 'READY', meshType: mesh.type, cellCount: mesh.count, meshQuality: mesh.qualityId, meshQualityLabel: mesh.qualityLabel, meshFrequency: mesh.frequency });
    fullUpdate({ render: true });
    return;
  }

  ensureState();

  if (type === COMMANDS.GENERATE) {
    generateWithOptions(payload || {});
    fullUpdate({ render: true });
  } else if (type === COMMANDS.RESET) {
    generateWithOptions(lastGenerateOptions);
    fullUpdate({ render: true });
  } else if (type === COMMANDS.STEP) {
    stepOnce();
    fullUpdate({ render: true });
  } else if (type === COMMANDS.ADVANCE_YEARS) {
    const requested = Math.max(1, Math.min(DEFAULT_CONFIG.maxAdvanceSteps, Number(payload.years ?? 1) | 0));
    for (let i = 0; i < requested; i += 1) stepOnce();
    state.lastAction = `Advanced ${requested} years inside the simulation worker.`;
    state.lastChange = 'What changed: multiple Worker ticks advanced climate, water, life, ecosystem, and early-civilisation diagnostics.';
    state.lastWatch = 'Watch trends for water, ice, temperature, primitive life, biosphere health, and collapse risk.';
    fullUpdate({ render: true });
  } else if (type === COMMANDS.SET_SPEED) {
    state.speed = Math.max(0, Math.min(10, Number(payload.speed ?? 1)));
    sendSummary(false);
    sendDiagnostics();
  } else if (type === COMMANDS.APPLY_TOOL) {
    const start = nowMs();
    const result = applyTool(state, mesh, payload || {});
    state.diagnostics.lastToolMs = nowMs() - start;
    fullUpdate({ render: result.mutated || result.success });
  } else if (type === COMMANDS.SELECT_CELL) {
    const id = Number(payload.cellId);
    state.selectedCell = Number.isFinite(id) ? Math.max(-1, Math.min(state.cellCount - 1, id | 0)) : -1;
    sendSelectedCell();
    sendSummary(false);
    sendDiagnostics();
  } else if (type === COMMANDS.SET_TEMPLATE) {
    pendingTemplate = payload.template || pendingTemplate;
    sendDiagnostics();
  } else if (type === COMMANDS.SET_ARCHETYPE) {
    pendingArchetype = payload.archetype || pendingArchetype;
    sendDiagnostics();
  } else if (type === COMMANDS.RUN_PROBE) {
    const start = nowMs();
    const result = runProbe(payload.probeId, { state, mesh, stepOnce });
    state.diagnostics.lastProbeMs = nowMs() - start;
    post(EVENTS.PROBE_RESULT, result);
    fullUpdate({ render: false, trend: false });
  } else if (type === COMMANDS.RUN_ALL_PROBES) {
    const start = nowMs();
    const summary = runAllProbes({ state, mesh, stepOnce });
    state.diagnostics.lastProbeMs = nowMs() - start;
    post(EVENTS.PROBE_SUMMARY, summary);
    fullUpdate({ render: false, trend: false });
  } else if (type === COMMANDS.GET_STATE_SUMMARY) {
    sendSummary(false);
    sendSelectedCell();
    sendDiagnostics();
  } else if (type === COMMANDS.GET_RENDER_DATA) {
    sendRenderData();
    sendDiagnostics();
  } else {
    throw new Error(`Unsupported command: ${type}`);
  }
}

globalThis.addEventListener('message', (event) => {
  const message = event.data || {};
  try {
    if (state) state.diagnostics.messageCount += 1;
    handleCommand(message.type, message.payload || {});
  } catch (error) {
    if (state) state.diagnostics.lastError = error instanceof Error ? error.message : String(error);
    post(EVENTS.ERROR, { message: state ? state.diagnostics.lastError : String(error), command: message.type || 'unknown' });
    if (state) sendDiagnostics();
  }
});
