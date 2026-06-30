'use strict';

/* Compact classic Worker. No module imports. No DOM access. */



/* ============================================================
   Protocol constants
   Source section: message-protocol.js
   Compacted for Engine v2 0.1.7.
   ============================================================ */

const BUILD_LABEL = 'WSG Engine v2 Build 0.1.7 - Classic Parity Functional Hotfix';

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
  { id: 'cloudCover', label: 'Cloud Cover' }
]);

const TOOLS = Object.freeze([
  { id: 'inspect_world', label: 'Inspect World' },
  { id: 'comet_delivery', label: 'Comet Delivery' },
  { id: 'volcanic_outgassing', label: 'Volcanic Outgassing' },
  { id: 'orbital_shade', label: 'Orbital Shade' },
  { id: 'mineral_seeding', label: 'Mineral Seeding' },
  { id: 'seed_primitive_life', label: 'Seed Primitive Life' },
  { id: 'planetary_stabilisation', label: 'Planetary Stabilisation' },
  { id: 'seed_early_settlers', label: 'Seed Early Settlers' }
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
  { id: 'no_dom_in_worker', label: 'No UI access in worker probe' },
  { id: 'render_data_finite', label: 'Render-data finite/bounded probe' }
]);

function makeEnvelope(type, payload = {}) {
  return { type, payload };
}


/* ============================================================
   Utility math
   Source section: util/math.js
   Compacted for Engine v2 0.1.7.
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
   Compacted for Engine v2 0.1.7.
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
   Compacted for Engine v2 0.1.7.
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
   Compacted for Engine v2 0.1.7.
   ============================================================ */

const STATE_SCHEMA_VERSION = 'engine-v2-state-schema-0.1.0';

const DEFAULT_CONFIG = Object.freeze({
  subdivisions: 3,
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
  'nutrientLevel'
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
  'nutrientLevel'
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
    stepCount: 0,
    year: 0,
    speed: DEFAULT_CONFIG.defaultSpeed,
    selectedCell: -1,
    lastAction: 'No action yet.',
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
      neighbourLinks: mesh.neighbourLinkCount
    }
  };

  for (const field of SIM_ARRAY_FIELDS) {
    if (field === 'biomeClass' || field === 'terrainClass') {
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
    stepCount: state.stepCount,
    year: state.year,
    speed: state.speed,
    selectedCell: state.selectedCell,
    lastAction: state.lastAction,
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
  target.stepCount = snapshot.stepCount;
  target.year = snapshot.year;
  target.speed = snapshot.speed;
  target.selectedCell = snapshot.selectedCell;
  target.lastAction = snapshot.lastAction;
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
   Compacted for Engine v2 0.1.7.
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

function createIcosphereMesh(options = {}) {
  const subdivisions = clamp(options.subdivisions ?? 3, 0, 5) | 0;
  const phi = (1 + Math.sqrt(5)) / 2;
  let vertices = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ].map(normalizeVertex);

  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  for (let level = 0; level < subdivisions; level += 1) {
    const midpointCache = new Map();
    const getMidpointIndex = (a, b) => {
      const key = edgeKey(a, b);
      if (midpointCache.has(key)) return midpointCache.get(key);
      const index = vertices.length;
      vertices.push(midpoint(vertices[a], vertices[b]));
      midpointCache.set(key, index);
      return index;
    };

    const nextFaces = [];
    for (const [a, b, c] of faces) {
      const ab = getMidpointIndex(a, b);
      const bc = getMidpointIndex(b, c);
      const ca = getMidpointIndex(c, a);
      nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = nextFaces;
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
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0]
    ];
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
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0]
    ];
    areaWeight[id] = Math.max(1e-6, Math.hypot(cross[0], cross[1], cross[2]) * 0.5);

    for (let k = 0; k < 3; k += 1) {
      const aIndex = face[k];
      const bIndex = face[(k + 1) % 3];
      const key = edgeKey(aIndex, bIndex);
      const other = faceEdges.get(key);
      if (other === undefined) {
        faceEdges.set(key, id);
      } else {
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
  const areaMean = areaSum / count;
  for (let i = 0; i < count; i += 1) {
    areaWeight[i] = areaWeight[i] / areaMean;
  }

  return {
    type: 'icosphere-triangle-faces',
    subdivisions,
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
  return `${mesh.type}|F${mesh.subdivisions}|cells:${mesh.count}|vertices:${mesh.vertexCount}|links:${mesh.neighbourLinkCount}`;
}


/* ============================================================
   Summaries and signatures
   Source section: sim/summaries.js
   Compacted for Engine v2 0.1.7.
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
    lastLimitingFactor: state.lastLimitingFactor,
    generationSignature: state.generationSignature,
    averageTemperature: temp,
    averageTemperatureC: toCelsius(temp),
    waterShare,
    iceShare,
    habitableShare: habShare,
    primitiveLifeCoverage: weightedShare(state.primitiveLife, weights, 0.05),
    primitiveLifeMean: life,
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
    lifeStatus: localLifeStatus(state, id),
    limitingFactor: localLimitingFactor(state, id)
  };
}

function buildRenderData(state, mesh) {
  const payload = {
    meshType: mesh.type,
    subdivisions: mesh.subdivisions,
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
  const fields = ['elevation', 'water', 'temperature', 'ice', 'habitability', 'primitiveLife', 'producerMats', 'settlements', 'populationIndex'];
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
   Compacted for Engine v2 0.1.7.
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
  state.stepCount = 0;
  state.year = 0;
  state.selectedCell = -1;
  state.lastAction = `Generated ${templateId.replaceAll('_', ' ')} with ${archetypeId.replaceAll('_', ' ')} archetype.`;
  state.lastLimitingFactor = 'new world';

  for (let i = 0; i < mesh.count; i += 1) {
    const x = mesh.centerX[i];
    const y = mesh.centerY[i];
    const z = mesh.centerZ[i];
    const latAbs = Math.abs(mesh.latitude[i]) / 90;
    const lon = mesh.longitude[i];
    const lat = mesh.latitude[i];
    state.craterPressure[i] = 0;
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
    state.civilisationSuitability[i] = clamp01(state.habitability[i] * 0.52 + (1 - ocean) * 0.20 + state.waterAccess[i] * 0.15);
    state.settlements[i] = 0;
    state.populationIndex[i] = 0;
    state.foodSupport[i] = clamp01(state.habitability[i] * 0.60 + state.producerMats[i] * 0.20);
    state.waterAccess[i] = clamp01(state.water[i] * 0.65 + state.rainfall[i] * 0.25 + state.runoff[i] * 0.15);
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
   Compacted for Engine v2 0.1.7.
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
   Compacted for Engine v2 0.1.7.
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
  }
}


/* ============================================================
   Primitive life
   Source section: sim/life.js
   Compacted for Engine v2 0.1.7.
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
  }

  return { spreadCount, dormancyTransitions, recoveryTransitions, localExtinctions };
}


/* ============================================================
   Ecosystems
   Source section: sim/ecosystems.js
   Compacted for Engine v2 0.1.7.
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
  }
}


/* ============================================================
   Stewardship
   Source section: sim/stewardship.js
   Compacted for Engine v2 0.1.7.
   ============================================================ */


function stepStewardship(state) {
  for (let i = 0; i < state.cellCount; i += 1) {
    const pressureDecay = state.stewardshipPressure[i] * 0.985;
    const restorationEffect = pressureDecay * state.restorationPriority[i] * 0.018;
    state.stewardshipPressure[i] = clamp01(pressureDecay);
    state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - restorationEffect);
    state.recoveryCapacity[i] = clamp01(state.recoveryCapacity[i] * 0.98 + (state.ecosystemResilience[i] + restorationEffect) * 0.02);
  }
}


/* ============================================================
   Civilisation diagnostics
   Source section: sim/civilisation.js
   Compacted for Engine v2 0.1.7.
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
   Compacted for Engine v2 0.1.7.
   ============================================================ */


function applyTool(state, mesh, request = {}) {
  const tool = request.tool;
  const origin = request.cellId | 0;
  const strength = Math.max(0.1, Math.min(2, Number(request.strength ?? 1)));
  const radius = Math.max(0, Math.min(6, Number(request.radius ?? 1) | 0));
  if (origin < 0 || origin >= state.cellCount) {
    return { success: false, mutated: false, message: 'Invalid target cell.', affected: 0 };
  }
  const cells = expandRadius(mesh, origin, radius);
  if (tool === 'inspect_world') {
    state.selectedCell = origin;
    state.lastAction = `Inspected cell ${origin}.`;
    return { success: true, mutated: false, message: state.lastAction, affected: 1 };
  }

  const before = localMutationSignature(state, cells);
  let affected = 0;
  let message = '';

  if (tool === 'comet_delivery') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      state.water[i] = clamp01(state.water[i] + 0.16 * strength * falloff);
      state.humidity[i] = clamp01(state.humidity[i] + 0.10 * strength * falloff);
      state.rainfall[i] = clamp01(state.rainfall[i] + 0.08 * strength * falloff);
      if (state.temperature[i] < 0.34) state.ice[i] = clamp01(state.ice[i] + 0.04 * strength * falloff);
      affected += 1;
    }
    message = `Comet delivery added water to ${affected} cells.`;
  } else if (tool === 'volcanic_outgassing') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      state.greenhousePressure[i] = clamp01(state.greenhousePressure[i] + 0.08 * strength * falloff);
      state.temperature[i] = clamp01(state.temperature[i] + 0.06 * strength * falloff);
      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.05 * strength * falloff);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + 0.06 * strength * falloff);
      affected += 1;
    }
    message = `Volcanic outgassing warmed and mineralised ${affected} cells.`;
  } else if (tool === 'orbital_shade') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      state.temperature[i] = clamp01(state.temperature[i] - 0.08 * strength * falloff);
      state.cloudCover[i] = clamp01(state.cloudCover[i] + 0.03 * strength * falloff);
      if (state.water[i] > 0.12) state.ice[i] = clamp01(state.ice[i] + 0.04 * strength * falloff);
      affected += 1;
    }
    message = `Orbital shade cooled ${affected} cells.`;
  } else if (tool === 'mineral_seeding') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.18 * strength * falloff);
      state.recoveryPotential[i] = clamp01(state.recoveryPotential[i] + 0.08 * strength * falloff);
      affected += 1;
    }
    message = `Mineral seeding improved nutrient potential in ${affected} cells.`;
  } else if (tool === 'seed_primitive_life') {
    let blocked = 0;
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      if (state.habitability[i] > 0.46 && state.ice[i] < 0.65 && state.waterAccess[i] > 0.25 && state.nutrientLevel[i] > 0.24) {
        state.primitiveLife[i] = clamp01(state.primitiveLife[i] + 0.22 * strength * falloff);
        state.biomass[i] = clamp01(state.biomass[i] + 0.10 * strength * falloff);
        affected += 1;
      } else if (state.habitability[i] > 0.32 && state.ice[i] < 0.78) {
        state.dormantLife[i] = clamp01(state.dormantLife[i] + 0.08 * strength * falloff);
        affected += 1;
      } else {
        blocked += 1;
      }
    }
    if (affected === 0) {
      const reason = limitingFactor(state, origin);
      return { success: false, mutated: false, message: `Seed Primitive Life failed: ${reason}.`, affected: 0 };
    }
    message = `Seeded primitive life in ${affected} cells; ${blocked} cells were too hostile.`;
  } else if (tool === 'planetary_stabilisation') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - 0.10 * strength * falloff);
      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] - 0.10 * strength * falloff);
      state.ecosystemResilience[i] = clamp01(state.ecosystemResilience[i] + 0.08 * strength * falloff);
      state.stewardshipPressure[i] = clamp01(state.stewardshipPressure[i] + 0.05 * strength * falloff);
      state.temperature[i] = clamp01(state.temperature[i] * 0.96 + 0.55 * 0.04);
      affected += 1;
    }
    message = `Planetary stabilisation reduced stress across ${affected} cells.`;
  } else if (tool === 'seed_early_settlers') {
    for (const i of cells) {
      const falloff = localFalloff(mesh, origin, i, radius);
      const allowed = state.primitiveLife[i] > 0.35 && state.civilisationSuitability[i] > 0.58 && state.waterAccess[i] > 0.35 && state.foodSupport[i] > 0.35;
      if (allowed) {
        state.settlements[i] = clamp01(state.settlements[i] + 0.18 * strength * falloff);
        state.populationIndex[i] = clamp01(state.populationIndex[i] + 0.10 * strength * falloff);
        state.socialComplexity[i] = clamp01(state.socialComplexity[i] + 0.05 * strength * falloff);
        affected += 1;
      }
    }
    if (affected === 0) {
      return { success: false, mutated: false, message: 'Seed Early Settlers failed: world is lifeless or locally unsuitable.', affected: 0 };
    }
    message = `Seeded early settlers in ${affected} suitable cells.`;
  } else {
    return { success: false, mutated: false, message: `Unsupported tool: ${tool}`, affected: 0 };
  }

  const after = localMutationSignature(state, cells);
  const mutated = before !== after;
  state.selectedCell = origin;
  state.lastAction = message;
  state.lastLimitingFactor = mutated ? 'tool applied' : 'no material change';
  state.renderDirty = mutated;
  state.trendDirty = mutated;
  return { success: mutated, mutated, message, affected };
}

function localFalloff(mesh, origin, cell, radius) {
  if (cell === origin || radius <= 0) return 1;
  const dot = mesh.centerX[origin] * mesh.centerX[cell] + mesh.centerY[origin] * mesh.centerY[cell] + mesh.centerZ[origin] * mesh.centerZ[cell];
  return clamp01(0.45 + 0.55 * dot);
}

function localMutationSignature(state, cells) {
  let h = 2166136261 >>> 0;
  for (const i of cells) {
    h ^= Math.round(state.water[i] * 1000) + i;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= Math.round(state.temperature[i] * 1000);
    h = Math.imul(h, 16777619) >>> 0;
    h ^= Math.round(state.primitiveLife[i] * 1000);
    h = Math.imul(h, 16777619) >>> 0;
    h ^= Math.round(state.settlements[i] * 1000);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function limitingFactor(state, i) {
  if (state.waterAccess[i] < 0.25) return 'too dry';
  if (state.temperature[i] > 0.78) return 'too hot';
  if (state.temperature[i] < 0.30) return 'too cold';
  if (state.ice[i] > 0.65) return 'too icy';
  if (state.nutrientLevel[i] < 0.24) return 'too nutrient-poor';
  if (state.ecosystemStress[i] > 0.70) return 'too stressed';
  return 'insufficient habitability';
}


/* ============================================================
   Probes
   Source section: sim/probes.js
   Compacted for Engine v2 0.1.7.
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
    const result = applyTool(ctx.state, ctx.mesh, { tool: 'seed_early_settlers', cellId: 0, radius: 2, strength: 1 });
    return { status: result.success ? 'fail' : 'pass', detail: result.message };
  }

  if (probeId === 'no_dom_in_worker') {
    const ok = ctx.uiSurface === undefined && ctx.state && ctx.mesh;
    return { status: ok ? 'pass' : 'fail', detail: ok ? 'Probe found simulation-only context.' : 'Unexpected UI surface detected.' };
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
  archetype: DEFAULT_CONFIG.defaultArchetype
};
let pendingTemplate = DEFAULT_CONFIG.defaultTemplate;
let pendingArchetype = DEFAULT_CONFIG.defaultArchetype;

function post(type, payload = {}, transfer = []) {
  globalThis.postMessage({ type, payload }, transfer);
}

function ensureState() {
  if (!mesh) mesh = createIcosphereMesh({ subdivisions: DEFAULT_CONFIG.subdivisions });
  if (!state) {
    state = createSimulationState(mesh, lastGenerateOptions);
    generateWithOptions(lastGenerateOptions);
  }
}

function generateWithOptions(options) {
  ensureMeshOnly();
  const start = nowMs();
  if (!state) state = createSimulationState(mesh, options);
  lastGenerateOptions = {
    seed: options.seed || lastGenerateOptions.seed || DEFAULT_CONFIG.initialSeed,
    template: options.template || pendingTemplate || lastGenerateOptions.template || DEFAULT_CONFIG.defaultTemplate,
    archetype: options.archetype || pendingArchetype || lastGenerateOptions.archetype || DEFAULT_CONFIG.defaultArchetype,
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
  state.diagnostics.lastGenerationMs = nowMs() - start;
  state.diagnostics.workerStatus = 'READY';
}

function ensureMeshOnly() {
  if (!mesh) mesh = createIcosphereMesh({ subdivisions: DEFAULT_CONFIG.subdivisions });
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
    post(EVENTS.READY, { status: 'READY', meshType: mesh.type, cellCount: mesh.count });
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
    fullUpdate({ render: true });
  } else if (type === COMMANDS.SET_SPEED) {
    state.speed = Math.max(0, Math.min(10, Number(payload.speed ?? 1)));
    sendSummary(false);
    sendDiagnostics();
  } else if (type === COMMANDS.APPLY_TOOL) {
    const start = nowMs();
    const result = applyTool(state, mesh, payload || {});
    state.diagnostics.lastToolMs = nowMs() - start;
    state.lastAction = result.message;
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
