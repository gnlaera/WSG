'use strict';



/* ============================================================
   Protocol constants
   Source: src/message-protocol.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */

const BUILD_LABEL = 'WSG Engine v2 Build 0.1.1 - Compact Static Worker Build';

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
   Source: src/util/math.js
   Compacted for Engine v2 0.1.1.
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
   UI references and renderers
   Source: src/ui.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */


function getUi() {
  return {
    buildLabel: byId('build-label'),
    workerStatus: byId('worker-status'),
    template: byId('world-template'),
    archetype: byId('world-archetype'),
    seed: byId('seed-input'),
    generate: byId('generate-button'),
    reset: byId('reset-button'),
    step: byId('step-button'),
    runPause: byId('run-pause-button'),
    advanceYears: byId('advance-years-button'),
    advanceYearsInput: byId('advance-years-input'),
    speed: byId('speed-select'),
    tool: byId('tool-select'),
    toolStrength: byId('tool-strength'),
    toolRadius: byId('tool-radius'),
    applyTool: byId('apply-tool-button'),
    visualMode: byId('visual-mode'),
    layer: byId('layer-select'),
    overlayOpacity: byId('overlay-opacity'),
    clouds: byId('cloud-toggle'),
    rotateLeft: byId('rotate-left'),
    rotateRight: byId('rotate-right'),
    resetView: byId('reset-view'),
    canvas: byId('planet-canvas'),
    stats: byId('stats-panel'),
    selected: byId('selected-panel'),
    trends: byId('trends-panel'),
    diagnostics: byId('diagnostics-panel'),
    probeSelect: byId('probe-select'),
    runProbe: byId('run-probe-button'),
    runAllProbes: byId('run-all-probes-button'),
    probes: byId('probe-output'),
    ledger: byId('migration-ledger'),
    eventLog: byId('event-log'),
    statusLine: byId('status-line'),
    summaryLine: byId('summary-line')
  };
}

function initialiseUi(ui) {
  ui.buildLabel.textContent = BUILD_LABEL;
  fillSelect(ui.template, TEMPLATES);
  fillSelect(ui.archetype, ARCHETYPES);
  fillSelect(ui.visualMode, VISUAL_MODES);
  fillSelect(ui.layer, LAYERS);
  fillSelect(ui.tool, TOOLS);
  fillSelect(ui.probeSelect, PROBES);
  ui.seed.value = 'ENGINE-V2-001';
  ui.ledger.innerHTML = migrationLedgerHtml();
}

function renderSummary(ui, summary) {
  const warnings = summary.warnings && summary.warnings.length ? summary.warnings : ['None'];
  ui.workerStatus.textContent = summary.diagnostics?.workerStatus || 'READY';
  ui.summaryLine.textContent = `${summary.template} | ${summary.archetype} | year ${summary.year} | cells ${summary.cellCount}`;
  ui.stats.innerHTML = `
    <div class="metric"><span>Year</span><strong>${summary.year}</strong></div>
    <div class="metric"><span>Tick</span><strong>${summary.stepCount}</strong></div>
    <div class="metric"><span>Average temperature</span><strong>${formatNum(summary.averageTemperatureC, 1)} °C</strong></div>
    <div class="metric"><span>Water share</span><strong>${formatPct(summary.waterShare)}</strong></div>
    <div class="metric"><span>Ice share</span><strong>${formatPct(summary.iceShare)}</strong></div>
    <div class="metric"><span>Habitable share</span><strong>${formatPct(summary.habitableShare)}</strong></div>
    <div class="metric"><span>Primitive life mean</span><strong>${formatNum(summary.primitiveLifeMean, 3)}</strong></div>
    <div class="metric"><span>Biodiversity Index</span><strong>${formatNum(summary.biodiversityMean, 3)}</strong></div>
    <div class="metric"><span>Ecosystem resilience</span><strong>${formatNum(summary.resilienceMean, 3)}</strong></div>
    <div class="metric"><span>Stewardship pressure</span><strong>${formatNum(summary.stewardshipPressureMean, 3)}</strong></div>
    <div class="metric"><span>Civilisation suitability</span><strong>${formatNum(summary.civilisationSuitabilityMean, 3)}</strong></div>
    <div class="metric"><span>Settlement share</span><strong>${formatPct(summary.settlementShare)}</strong></div>
    <div class="metric"><span>Collapse risk</span><strong>${formatNum(summary.collapseRiskMean, 3)}</strong></div>
    <div class="metric wide"><span>Last action</span><strong>${escapeHtml(summary.lastAction)}</strong></div>
    <div class="metric wide"><span>Warnings</span><strong>${warnings.map(escapeHtml).join('<br>')}</strong></div>
  `;
}

function renderSelected(ui, selected) {
  if (!selected || selected.cellId < 0) {
    ui.selected.innerHTML = '<p>No cell selected. Click the planet, or select Inspect World and click a visible cell.</p>';
    return;
  }
  ui.selected.innerHTML = `
    <div class="metric"><span>Cell</span><strong>${selected.cellId}</strong></div>
    <div class="metric"><span>Latitude</span><strong>${formatNum(selected.latitude, 1)}°</strong></div>
    <div class="metric"><span>Longitude</span><strong>${formatNum(selected.longitude, 1)}°</strong></div>
    <div class="metric"><span>Neighbours</span><strong>${selected.neighbours.join(', ')}</strong></div>
    <div class="metric"><span>Elevation</span><strong>${formatNum(selected.elevation, 3)}</strong></div>
    <div class="metric"><span>Water</span><strong>${formatNum(selected.water, 3)}</strong></div>
    <div class="metric"><span>Temperature</span><strong>${formatNum(selected.temperatureC, 1)} °C</strong></div>
    <div class="metric"><span>Ice</span><strong>${formatNum(selected.ice, 3)}</strong></div>
    <div class="metric"><span>Habitability</span><strong>${formatNum(selected.habitability, 3)}</strong></div>
    <div class="metric"><span>Primitive life</span><strong>${formatNum(selected.primitiveLife, 3)}</strong></div>
    <div class="metric"><span>Producer mats</span><strong>${formatNum(selected.producerMats, 3)}</strong></div>
    <div class="metric"><span>Biodiversity</span><strong>${formatNum(selected.biodiversityIndex, 3)}</strong></div>
    <div class="metric"><span>Stewardship</span><strong>${formatNum(selected.stewardshipPressure, 3)}</strong></div>
    <div class="metric"><span>Civ suitability</span><strong>${formatNum(selected.civilisationSuitability, 3)}</strong></div>
    <div class="metric"><span>Settlements</span><strong>${formatNum(selected.settlements, 3)}</strong></div>
    <div class="metric wide"><span>Life status</span><strong>${escapeHtml(selected.lifeStatus)}</strong></div>
    <div class="metric wide"><span>Limiting factor</span><strong>${escapeHtml(selected.limitingFactor)}</strong></div>
  `;
}

function renderDiagnostics(ui, diagnostics, mainMetrics) {
  const data = diagnostics || {};
  ui.diagnostics.innerHTML = `
    <div class="metric"><span>Worker status</span><strong>${escapeHtml(data.workerStatus || 'unknown')}</strong></div>
    <div class="metric"><span>Worker tick</span><strong>${formatNum(data.lastWorkerTickMs, 2)} ms</strong></div>
    <div class="metric"><span>Generation</span><strong>${formatNum(data.lastGenerationMs, 2)} ms</strong></div>
    <div class="metric"><span>Tool application</span><strong>${formatNum(data.lastToolApplicationMs, 2)} ms</strong></div>
    <div class="metric"><span>Probe</span><strong>${formatNum(data.lastProbeMs, 2)} ms</strong></div>
    <div class="metric"><span>Render-data build</span><strong>${formatNum(data.lastRenderDataBuildMs, 2)} ms</strong></div>
    <div class="metric"><span>Main render</span><strong>${formatNum(mainMetrics.lastRenderMs, 2)} ms</strong></div>
    <div class="metric"><span>DOM update</span><strong>${formatNum(mainMetrics.lastDomMs, 2)} ms</strong></div>
    <div class="metric"><span>Render dirty</span><strong>${String(data.renderDirty)}</strong></div>
    <div class="metric"><span>Cells</span><strong>${data.cellCount || 0}</strong></div>
    <div class="metric"><span>Neighbour links</span><strong>${data.neighbourLinks || 0}</strong></div>
    <div class="metric"><span>Last transfer</span><strong>${formatBytes(data.bytesTransferredLastRenderUpdate || 0)}</strong></div>
    <div class="metric"><span>Worker messages</span><strong>${data.workerMessageCount || 0}</strong></div>
    <div class="metric wide"><span>Last worker error</span><strong>${escapeHtml(data.lastWorkerError || 'None')}</strong></div>
  `;
}

function renderProbeResult(ui, payload) {
  if (!payload) return;
  if (payload.results) {
    ui.probes.innerHTML = payload.results.map(renderProbeLine).join('');
  } else {
    ui.probes.innerHTML = renderProbeLine(payload) + ui.probes.innerHTML;
  }
}

function addEvent(ui, text) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `${time} | ${text}`;
  ui.eventLog.prepend(entry);
  while (ui.eventLog.children.length > 40) ui.eventLog.removeChild(ui.eventLog.lastChild);
}

function setStatus(ui, text) {
  ui.statusLine.textContent = text;
}

function fillSelect(select, items) {
  select.innerHTML = '';
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.label;
    select.appendChild(option);
  }
}

function byId(id) {
  return document.getElementById(id);
}

function formatNum(value, digits = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : 'n/a';
}

function formatPct(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function renderProbeLine(item) {
  const statusClass = item.status === 'pass' ? 'pass' : item.status === 'warn' ? 'warn' : 'fail';
  return `<div class="probe ${statusClass}"><strong>${escapeHtml(item.status || 'unknown').toUpperCase()}</strong> ${escapeHtml(item.label || item.id)}<br><span>${escapeHtml(item.detail || '')}</span></div>`;
}

function migrationLedgerHtml() {
  return `
    <h3>Migration ledger</h3>
    <p><strong>Status:</strong> Engine v2 0.1.0 is not a replacement for Classic yet. It is an architecture proof of concept.</p>
    <div class="ledger-grid">
      <section><h4>Ported from Classic</h4><p>Generate, Reset, Step, Run/Pause, Advance Years, seed, template and archetype controls, representative tools, major layers, selected-cell inspection, trends, probes, and diagnostics.</p></section>
      <section><h4>Simplified</h4><p>Planet generation, climate, hydrology, primitive life, ecosystem state, stewardship, and early settlements are compact deterministic approximations.</p></section>
      <section><h4>Stubbed for future migration</h4><p>Drainage basins, lake overflow, erosion, sediment, ocean heat transport, richer probes, richer hydrology, and deeper ecosystem transitions.</p></section>
      <section><h4>Intentionally deferred</h4><p>Full Classic parity, full Earth matching, all Classic panels, save/load, scenarios, advanced graphics backends, imported data, and external assets.</p></section>
      <section><h4>Known behavioural differences</h4><p>The proof uses a compact icosphere triangle-face mesh and worker-owned state. It prioritises clean boundaries over visual or balance parity.</p></section>
    </div>
  `;
}


/* ============================================================
   Canvas 2D renderer
   Source: src/renderer2d.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */


function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let data = null;
  let rotation = 0.0;
  let tilt = 0.0;
  let lastProjection = [];
  let lastRenderMs = 0;

  function setRenderData(nextData) {
    data = nextData;
  }

  function rotate(delta) {
    rotation += delta;
  }

  function resetView() {
    rotation = 0;
    tilt = 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
    const width = Math.max(320, Math.floor(rect.width * scale));
    const height = Math.max(260, Math.floor(rect.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function render(settings = {}) {
    const start = performance.now();
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, canvas.width, canvas.height);
    lastProjection = [];

    if (!data) {
      drawEmpty(ctx, canvas.width, canvas.height);
      lastRenderMs = performance.now() - start;
      return lastRenderMs;
    }

    const mode = settings.visualMode || 'natural';
    const layer = settings.layer || 'elevation';
    const overlayOpacity = clamp01(Number(settings.overlayOpacity ?? 0.65));
    const cloudsEnabled = settings.clouds !== false;
    const radius = Math.min(canvas.width, canvas.height) * 0.43;
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.51;

    drawPlanetDisc(ctx, cx, cy, radius);
    drawCells(ctx, cx, cy, radius, 'natural', layer, 1, cloudsEnabled);
    if (mode === 'overlay') {
      drawCells(ctx, cx, cy, radius, 'layer', layer, overlayOpacity, cloudsEnabled);
    } else if (mode === 'diagnostic') {
      drawCells(ctx, cx, cy, radius, 'diagnostic', layer, 1, cloudsEnabled);
    }
    drawAtmosphere(ctx, cx, cy, radius);
    drawSelectedCell(ctx, lastProjection, radius, settings.selectedCell ?? data.selectedCell, settings.hoverCell, Number(settings.toolRadius ?? 1));

    lastRenderMs = performance.now() - start;
    return lastRenderMs;
  }

  function drawCells(context, cx, cy, radius, pass, layer, alpha, cloudsEnabled) {
    context.save();
    context.globalAlpha = alpha;
    if (pass === 'diagnostic') context.lineWidth = Math.max(0.5, radius / 420);
    const order = [];
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    for (let i = 0; i < data.count; i += 1) {
      const c = projectVector(data.centerX[i], data.centerY[i], data.centerZ[i], cosR, sinR, cosT, sinT);
      if (c.depth <= -0.04) continue;
      order.push([i, c.depth]);
    }
    order.sort((a, b) => a[1] - b[1]);

    for (const [i] of order) {
      const p0 = projectVector(data.triangleX[i * 3], data.triangleY[i * 3], data.triangleZ[i * 3], cosR, sinR, cosT, sinT);
      const p1 = projectVector(data.triangleX[i * 3 + 1], data.triangleY[i * 3 + 1], data.triangleZ[i * 3 + 1], cosR, sinR, cosT, sinT);
      const p2 = projectVector(data.triangleX[i * 3 + 2], data.triangleY[i * 3 + 2], data.triangleZ[i * 3 + 2], cosR, sinR, cosT, sinT);
      if (p0.depth < -0.20 || p1.depth < -0.20 || p2.depth < -0.20) continue;
      const centre = projectVector(data.centerX[i], data.centerY[i], data.centerZ[i], cosR, sinR, cosT, sinT);
      const light = clamp01(0.52 + centre.depth * 0.42);
      const x0 = cx + p0.x * radius;
      const y0 = cy + p0.y * radius;
      const x1 = cx + p1.x * radius;
      const y1 = cy + p1.y * radius;
      const x2 = cx + p2.x * radius;
      const y2 = cy + p2.y * radius;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.lineTo(x2, y2);
      context.closePath();
      context.fillStyle = pass === 'natural' ? naturalColor(data, i, light, cloudsEnabled) : layerColor(data, i, layer, light, pass === 'diagnostic');
      context.fill();
      if (pass === 'diagnostic') {
        context.strokeStyle = 'rgba(255,255,255,0.20)';
        context.stroke();
      }
      lastProjection[i] = { x: cx + centre.x * radius, y: cy + centre.y * radius, depth: centre.depth };
    }
    context.restore();
  }

  function pick(clientX, clientY) {
    if (!data) return -1;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lastProjection.length; i += 1) {
      const p = lastProjection[i];
      if (!p || p.depth <= -0.04) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return bestDist < Math.max(160, (canvas.width * 0.020) ** 2) ? best : -1;
  }

  function getLastRenderMs() {
    return lastRenderMs;
  }

  return { setRenderData, render, pick, rotate, resetView, getLastRenderMs };
}

function projectVector(x, y, z, cosR, sinR, cosT, sinT) {
  const xr = x * cosR + z * sinR;
  const zr = -x * sinR + z * cosR;
  const yt = y * cosT - xr * sinT;
  const depth = xr * cosT + y * sinT;
  return { x: zr, y: -yt, depth };
}

function drawBackground(ctx, width, height) {
  const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
  g.addColorStop(0, '#122031');
  g.addColorStop(1, '#05080d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

function drawEmpty(ctx, width, height) {
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.font = `${Math.max(14, width * 0.018)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('Waiting for worker render data', width / 2, height / 2);
}

function drawPlanetDisc(ctx, cx, cy, radius) {
  const g = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.25, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, '#26394a');
  g.addColorStop(1, '#05090f');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawAtmosphere(ctx, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.01, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(120,185,255,0.28)';
  ctx.lineWidth = Math.max(2, radius * 0.015);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.04, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160,215,255,0.08)';
  ctx.lineWidth = Math.max(8, radius * 0.035);
  ctx.stroke();
  ctx.restore();
}

function drawSelectedCell(ctx, projection, radius, selectedCell, hoverCell, toolRadius) {
  if (selectedCell >= 0 && projection[selectedCell] && projection[selectedCell].depth > -0.05) {
    const p = projection[selectedCell];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1.5, radius * 0.008);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(5, radius * 0.025), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (hoverCell >= 0 && projection[hoverCell] && projection[hoverCell].depth > -0.05) {
    const p = projection[hoverCell];
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,120,0.65)';
    ctx.lineWidth = Math.max(1, radius * 0.006);
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(8, radius * (0.025 + toolRadius * 0.018)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function naturalColor(data, i, light, cloudsEnabled) {
  const water = data.water[i];
  const ice = data.ice[i];
  const life = data.primitiveLife[i];
  const mats = data.producerMats[i];
  const elev = data.elevation[i];
  const temp = data.temperature[i];
  const settlements = data.settlements[i];
  const clouds = cloudsEnabled ? data.cloudCover[i] : 0;
  let r;
  let g;
  let b;
  if (water > 0.45) {
    r = lerp(18, 36, water);
    g = lerp(62, 118, water);
    b = lerp(110, 190, water);
  } else {
    const dry = clamp01(1 - data.habitability[i]);
    r = lerp(90, 178, dry) + elev * 40;
    g = lerp(108, 120, dry) + life * 80 + mats * 40;
    b = lerp(72, 58, dry);
  }
  if (life > 0.03) {
    r = lerp(r, 50, clamp01(life * 0.8));
    g = lerp(g, 150, clamp01(life * 0.9));
    b = lerp(b, 76, clamp01(life * 0.6));
  }
  if (ice > 0.20) {
    const a = clamp01(ice);
    r = lerp(r, 220, a);
    g = lerp(g, 236, a);
    b = lerp(b, 245, a);
  }
  if (temp > 0.74 && water < 0.40) {
    r = lerp(r, 218, 0.25);
    g = lerp(g, 110, 0.20);
    b = lerp(b, 50, 0.20);
  }
  if (settlements > 0.04) {
    r = lerp(r, 255, settlements * 0.45);
    g = lerp(g, 205, settlements * 0.25);
    b = lerp(b, 92, settlements * 0.20);
  }
  if (clouds > 0.12) {
    const a = clamp01(clouds * 0.45);
    r = lerp(r, 232, a);
    g = lerp(g, 236, a);
    b = lerp(b, 238, a);
  }
  return rgb(r * light, g * light, b * light);
}

function layerColor(data, i, layer, light, diagnostic) {
  const v = clamp01(data[layer]?.[i] ?? 0);
  let color;
  if (layer === 'water' || layer === 'waterFlow' || layer === 'cloudCover') color = ramp(v, [15, 34, 66], [62, 162, 225]);
  else if (layer === 'temperature') color = tempRamp(v);
  else if (layer === 'ice') color = ramp(v, [35, 70, 92], [236, 248, 255]);
  else if (layer === 'primitiveLife' || layer === 'producerMats' || layer === 'habitability' || layer === 'biodiversityIndex' || layer === 'ecosystemResilience') color = ramp(v, [38, 40, 34], [60, 190, 95]);
  else if (layer === 'stewardshipPressure' || layer === 'restorationPriority') color = ramp(v, [50, 42, 68], [170, 225, 120]);
  else if (layer === 'civilisationSuitability' || layer === 'settlements') color = ramp(v, [32, 32, 42], [255, 196, 76]);
  else if (layer === 'runoff' || layer === 'rainfall' || layer === 'humidity') color = ramp(v, [52, 48, 42], [90, 190, 210]);
  else color = ramp(v, [42, 36, 34], [216, 224, 160]);
  const multiplier = diagnostic ? 1 : light;
  return rgb(color[0] * multiplier, color[1] * multiplier, color[2] * multiplier);
}

function ramp(v, a, b) {
  return [lerp(a[0], b[0], v), lerp(a[1], b[1], v), lerp(a[2], b[2], v)];
}

function tempRamp(v) {
  if (v < 0.5) return ramp(v / 0.5, [42, 88, 180], [222, 220, 170]);
  return ramp((v - 0.5) / 0.5, [222, 220, 170], [210, 64, 42]);
}

function rgb(r, g, b) {
  return `rgb(${Math.round(clamp01(r / 255) * 255)},${Math.round(clamp01(g / 255) * 255)},${Math.round(clamp01(b / 255) * 255)})`;
}


/* ============================================================
   Controls
   Source: src/controls.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */


function bindControls(ui, actions) {
  ui.generate.addEventListener('click', () => actions.command(COMMANDS.GENERATE, collectGenerationOptions(ui)));
  ui.reset.addEventListener('click', () => actions.command(COMMANDS.RESET, {}));
  ui.step.addEventListener('click', () => actions.command(COMMANDS.STEP, {}));
  ui.runPause.addEventListener('click', () => actions.toggleRun());
  ui.advanceYears.addEventListener('click', () => actions.command(COMMANDS.ADVANCE_YEARS, { years: Number(ui.advanceYearsInput.value || 1) }));
  ui.speed.addEventListener('change', () => actions.command(COMMANDS.SET_SPEED, { speed: Number(ui.speed.value) }));
  ui.template.addEventListener('change', () => actions.command(COMMANDS.SET_TEMPLATE, { template: ui.template.value }));
  ui.archetype.addEventListener('change', () => actions.command(COMMANDS.SET_ARCHETYPE, { archetype: ui.archetype.value }));
  ui.applyTool.addEventListener('click', () => actions.applyToolToSelected());
  ui.runProbe.addEventListener('click', () => actions.command(COMMANDS.RUN_PROBE, { probeId: ui.probeSelect.value }));
  ui.runAllProbes.addEventListener('click', () => actions.command(COMMANDS.RUN_ALL_PROBES, {}));

  ui.visualMode.addEventListener('change', () => actions.redraw());
  ui.layer.addEventListener('change', () => actions.redraw());
  ui.overlayOpacity.addEventListener('input', () => actions.redraw());
  ui.clouds.addEventListener('change', () => actions.redraw());
  ui.toolRadius.addEventListener('input', () => actions.redraw());
  ui.rotateLeft.addEventListener('click', () => { actions.rotate(-0.22); actions.redraw(); });
  ui.rotateRight.addEventListener('click', () => { actions.rotate(0.22); actions.redraw(); });
  ui.resetView.addEventListener('click', () => { actions.resetView(); actions.redraw(); });

  let dragging = false;
  let lastX = 0;
  let downX = 0;
  let downY = 0;
  let moved = false;
  ui.canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    downX = event.clientX;
    downY = event.clientY;
    moved = false;
    ui.canvas.setPointerCapture(event.pointerId);
  });
  ui.canvas.addEventListener('pointermove', (event) => {
    if (dragging && event.buttons) {
      moved = moved || Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 6;
      const dx = event.clientX - lastX;
      if (Math.abs(dx) > 1) {
        actions.rotate(dx * 0.006);
        actions.redraw();
      }
      lastX = event.clientX;
    } else {
      actions.hover(event.clientX, event.clientY);
    }
  });
  ui.canvas.addEventListener('pointerup', (event) => {
    ui.canvas.releasePointerCapture(event.pointerId);
    dragging = false;
    if (!moved) actions.clickCanvas(event.clientX, event.clientY);
  });
  ui.canvas.addEventListener('pointerleave', () => actions.hover(null, null));
}

function collectGenerationOptions(ui) {
  return {
    seed: ui.seed.value || 'ENGINE-V2-001',
    template: ui.template.value,
    archetype: ui.archetype.value
  };
}

function collectToolOptions(ui, cellId) {
  return {
    tool: ui.tool.value,
    cellId,
    strength: Number(ui.toolStrength.value || 1),
    radius: Number(ui.toolRadius.value || 1)
  };
}


/* ============================================================
   Trends
   Source: src/trends.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */

const MAX_SAMPLES = 48;
const samples = [];

function updateTrends(container, sample) {
  if (!sample) return;
  samples.push(sample);
  while (samples.length > MAX_SAMPLES) samples.shift();
  const latest = samples[samples.length - 1];
  const first = samples[0] || latest;
  container.innerHTML = `
    <div class="trend-row"><span>Samples</span><strong>${samples.length}/${MAX_SAMPLES}</strong></div>
    <div class="trend-row"><span>Year range</span><strong>${first.year} to ${latest.year}</strong></div>
    <div class="trend-row"><span>Temperature</span><strong>${formatDelta(first.tempC, latest.tempC, ' °C')}</strong></div>
    <div class="trend-row"><span>Water share</span><strong>${formatDelta(first.waterShare, latest.waterShare, '', true)}</strong></div>
    <div class="trend-row"><span>Ice share</span><strong>${formatDelta(first.iceShare, latest.iceShare, '', true)}</strong></div>
    <div class="trend-row"><span>Habitability</span><strong>${formatDelta(first.habitability, latest.habitability, '', true)}</strong></div>
    <div class="trend-row"><span>Primitive life</span><strong>${formatDelta(first.primitiveLife, latest.primitiveLife, '', false)}</strong></div>
    <div class="trend-row"><span>Biodiversity</span><strong>${formatDelta(first.biodiversity, latest.biodiversity, '', false)}</strong></div>
    <div class="trend-row"><span>Settlement</span><strong>${formatDelta(first.settlement, latest.settlement, '', false)}</strong></div>
    <div class="trend-row"><span>Collapse risk</span><strong>${formatDelta(first.collapseRisk, latest.collapseRisk, '', false)}</strong></div>
  `;
}

function formatDelta(first, latest, suffix, percent = false) {
  const f = Number(first);
  const l = Number(latest);
  if (!Number.isFinite(f) || !Number.isFinite(l)) return 'n/a';
  const delta = l - f;
  if (percent) {
    return `${(l * 100).toFixed(1)}% (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pp)`;
  }
  return `${l.toFixed(3)}${suffix} (${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`;
}


/* ============================================================
   Diagnostics helpers
   Source: src/diagnostics.js
   Compacted for Engine v2 0.1.1.
   ============================================================ */

function classifyTiming(ms, warnMs = 20, failMs = 60) {
  if (!Number.isFinite(ms)) return 'unknown';
  if (ms >= failMs) return 'fail';
  if (ms >= warnMs) return 'warn';
  return 'pass';
}

function diagnosticSnapshot(summary, diagnostics, mainMetrics) {
  return {
    year: summary?.year ?? 0,
    tick: summary?.stepCount ?? 0,
    workerStatus: diagnostics?.workerStatus ?? 'unknown',
    tickTiming: classifyTiming(diagnostics?.lastWorkerTickMs ?? 0),
    renderTiming: classifyTiming(mainMetrics?.lastRenderMs ?? 0),
    domTiming: classifyTiming(mainMetrics?.lastDomMs ?? 0),
    cellCount: diagnostics?.cellCount ?? 0,
    neighbourLinks: diagnostics?.neighbourLinks ?? 0
  };
}


/* ============================================================
   Bootstrapping and worker lifecycle
   Source: src/main.js
   ============================================================ */


const ui = getUi();
initialiseUi(ui);
const renderer = createRenderer(ui.canvas);
const mainMetrics = { lastRenderMs: 0, lastDomMs: 0 };
let worker = null;
let running = false;
let runTimer = null;
let selectedCell = -1;
let hoverCell = -1;
let lastDiagnostics = null;
let lastSummary = null;

function createWorker() {
  try {
    worker = new Worker('./simulation-worker.js');
    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', (event) => {
      setStatus(ui, `Worker error: ${event.message}`);
      addEvent(ui, `Worker failed: ${event.message}`);
    });
    command(COMMANDS.INIT, collectGenerationOptions(ui), false);
  } catch (error) {
    setStatus(ui, `Worker creation failed: ${error.message}`);
    addEvent(ui, `Worker creation failed: ${error.message}`);
  }
}

function command(type, payload = {}, log = true) {
  if (!worker) return;
  worker.postMessage({ type, payload });
  if (log) addEvent(ui, `Command sent: ${type}`);
}

function onWorkerMessage(event) {
  const { type, payload } = event.data || {};
  if (type === EVENTS.READY) {
    setStatus(ui, `Worker READY | ${payload.meshType} | ${payload.cellCount} cells`);
    addEvent(ui, 'Worker reported READY.');
  } else if (type === EVENTS.STATE_SUMMARY) {
    lastSummary = payload;
    const start = performance.now();
    renderSummary(ui, payload);
    mainMetrics.lastDomMs = performance.now() - start;
  } else if (type === EVENTS.SELECTED_CELL_SUMMARY) {
    selectedCell = payload.cellId ?? -1;
    const start = performance.now();
    renderSelected(ui, payload);
    mainMetrics.lastDomMs = Math.max(mainMetrics.lastDomMs, performance.now() - start);
    redraw();
  } else if (type === EVENTS.RENDER_DATA) {
    renderer.setRenderData(payload);
    redraw();
  } else if (type === EVENTS.TREND_SAMPLE) {
    updateTrends(ui.trends, payload);
  } else if (type === EVENTS.PROBE_RESULT || type === EVENTS.PROBE_SUMMARY) {
    renderProbeResult(ui, payload);
    addEvent(ui, type === EVENTS.PROBE_SUMMARY ? 'Worker probes completed.' : `Worker probe completed: ${payload.id}`);
  } else if (type === EVENTS.DIAGNOSTIC_SUMMARY) {
    lastDiagnostics = payload;
    renderDiagnostics(ui, payload, mainMetrics);
  } else if (type === EVENTS.ERROR) {
    setStatus(ui, `Worker command error: ${payload.message}`);
    addEvent(ui, `Worker command error on ${payload.command}: ${payload.message}`);
  }
}

function redraw() {
  mainMetrics.lastRenderMs = renderer.render(currentRenderSettings());
  if (lastDiagnostics) renderDiagnostics(ui, lastDiagnostics, mainMetrics);
}

function currentRenderSettings() {
  return {
    visualMode: ui.visualMode.value,
    layer: ui.layer.value,
    overlayOpacity: Number(ui.overlayOpacity.value || 0.65),
    clouds: ui.clouds.checked,
    selectedCell,
    hoverCell,
    toolRadius: Number(ui.toolRadius.value || 1)
  };
}

function toggleRun() {
  running = !running;
  ui.runPause.textContent = running ? 'Pause' : 'Run';
  addEvent(ui, running ? 'Run started.' : 'Run paused.');
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
  }
  if (running) {
    const startLoop = () => {
      const speed = Math.max(1, Number(ui.speed.value || 1));
      const cadenceMs = Math.max(140, 900 / speed);
      runTimer = setInterval(() => command(COMMANDS.STEP, {}, false), cadenceMs);
    };
    startLoop();
  }
}

function applyToolToSelected() {
  if (selectedCell < 0) {
    setStatus(ui, 'No selected cell. Inspect a cell first.');
    return;
  }
  command(COMMANDS.APPLY_TOOL, collectToolOptions(ui, selectedCell));
}

function clickCanvas(clientX, clientY) {
  const cellId = renderer.pick(clientX, clientY);
  if (cellId < 0) return;
  selectedCell = cellId;
  if (ui.tool.value === 'inspect_world') {
    command(COMMANDS.SELECT_CELL, { cellId });
  } else {
    command(COMMANDS.APPLY_TOOL, collectToolOptions(ui, cellId));
  }
}

function hover(clientX, clientY) {
  if (clientX === null || clientY === null) {
    hoverCell = -1;
  } else {
    hoverCell = renderer.pick(clientX, clientY);
  }
  redraw();
}

function rotate(delta) {
  renderer.rotate(delta);
}

function resetView() {
  renderer.resetView();
}

bindControls(ui, { command, toggleRun, applyToolToSelected, clickCanvas, hover, rotate, resetView, redraw });
createWorker();

addEvent(ui, 'Engine v2 compact main thread initialised. Deploy the three files together to GitHub Pages or another static host.');
