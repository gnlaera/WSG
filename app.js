'use strict';



/* ============================================================
   Protocol constants
   Source: src/message-protocol.js
   Compacted for Engine v2 0.1.4.
   ============================================================ */

const BUILD_LABEL = 'WSG Engine v2 Build 0.1.4 - Hover-Stable Viewport Hotfix';

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
   Compacted for Engine v2 0.1.4.
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
   Compacted for Engine v2 0.1.4.
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
   Compacted for Engine v2 0.1.4.
   ============================================================ */


function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let data = null;
  let rotation = 0.0;
  let tilt = 0.0;
  let lastProjection = [];
  let lastRenderMs = 0;
  let viewport = { cssWidth: 0, cssHeight: 0, width: 0, height: 0, scale: 1, cx: 0, cy: 0, radius: 0 };

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

  function updateViewport(force = false) {
    const rect = canvas.getBoundingClientRect();
    const fallback = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : rect;
    const cssWidth = Math.max(320, Math.floor((rect.width || fallback.width || 640)));
    const cssHeight = Math.max(260, Math.floor((rect.height || fallback.height || 520)));
    const scale = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
    const width = Math.max(320, Math.floor(cssWidth * scale));
    const height = Math.max(260, Math.floor(cssHeight * scale));
    const changed = force || Math.abs(cssWidth - viewport.cssWidth) > 1 || Math.abs(cssHeight - viewport.cssHeight) > 1 || viewport.scale !== scale;
    if (!changed) return viewport;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const limiting = Math.max(1, Math.min(width, height));
    const padding = Math.max(24 * scale, limiting * 0.070);
    const radius = Math.max(36 * scale, limiting * 0.5 - padding);
    viewport = { cssWidth, cssHeight, width, height, scale, cx: width * 0.5, cy: height * 0.5, radius };
    return viewport;
  }

  function render(settings = {}) {
    const start = performance.now();
    const view = updateViewport(false);
    ctx.clearRect(0, 0, view.width, view.height);
    drawBackground(ctx, view.width, view.height);
    lastProjection = [];

    if (!data) {
      drawEmpty(ctx, view.width, view.height);
      lastRenderMs = performance.now() - start;
      return lastRenderMs;
    }

    const mode = settings.visualMode || 'natural';
    const layer = settings.layer || 'elevation';
    const overlayOpacity = clamp01(Number(settings.overlayOpacity ?? 0.65));
    const cloudsEnabled = settings.clouds !== false;
    const { cx, cy, radius } = view;

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
    const view = updateViewport(false);
    const scaleX = view.width / Math.max(1, rect.width);
    const scaleY = view.height / Math.max(1, rect.height);
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

  return { setRenderData, render, pick, rotate, resetView, getLastRenderMs, updateViewport };
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
   Compacted for Engine v2 0.1.4.
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
   Compacted for Engine v2 0.1.4.
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
   Compacted for Engine v2 0.1.4.
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
   Embedded Worker fallback source
   Used only if ./simulation-worker.js fails to answer READY.
   The external Worker file remains the primary deployment path.
   ============================================================ */

const EMBEDDED_WORKER_SOURCE = "'use strict';\n\n/* Compact classic Worker. No module imports. No DOM access. */\n\n\n\n/* ============================================================\n   Protocol constants\n   Source: src/message-protocol.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\nconst BUILD_LABEL = 'WSG Engine v2 Build 0.1.4 - Hover-Stable Viewport Hotfix';\n\nconst COMMANDS = Object.freeze({\n  INIT: 'INIT',\n  GENERATE: 'GENERATE',\n  RESET: 'RESET',\n  STEP: 'STEP',\n  ADVANCE_YEARS: 'ADVANCE_YEARS',\n  SET_SPEED: 'SET_SPEED',\n  APPLY_TOOL: 'APPLY_TOOL',\n  SELECT_CELL: 'SELECT_CELL',\n  SET_TEMPLATE: 'SET_TEMPLATE',\n  SET_ARCHETYPE: 'SET_ARCHETYPE',\n  RUN_PROBE: 'RUN_PROBE',\n  RUN_ALL_PROBES: 'RUN_ALL_PROBES',\n  GET_STATE_SUMMARY: 'GET_STATE_SUMMARY',\n  GET_RENDER_DATA: 'GET_RENDER_DATA'\n});\n\nconst EVENTS = Object.freeze({\n  READY: 'READY',\n  STATE_SUMMARY: 'STATE_SUMMARY',\n  RENDER_DATA: 'RENDER_DATA',\n  SELECTED_CELL_SUMMARY: 'SELECTED_CELL_SUMMARY',\n  TREND_SAMPLE: 'TREND_SAMPLE',\n  PROBE_RESULT: 'PROBE_RESULT',\n  PROBE_SUMMARY: 'PROBE_SUMMARY',\n  DIAGNOSTIC_SUMMARY: 'DIAGNOSTIC_SUMMARY',\n  ERROR: 'ERROR'\n});\n\nconst VISUAL_MODES = Object.freeze([\n  { id: 'natural', label: 'Natural Planet' },\n  { id: 'overlay', label: 'Layer Overlay' },\n  { id: 'diagnostic', label: 'Diagnostic' }\n]);\n\nconst TEMPLATES = Object.freeze([\n  { id: 'procedural_lifeless', label: 'Procedural Lifeless World' },\n  { id: 'earthlike', label: 'Earthlike Template' },\n  { id: 'water_world', label: 'Water World' },\n  { id: 'ice_world', label: 'Ice World' },\n  { id: 'greenhouse_world', label: 'Greenhouse World' }\n]);\n\nconst ARCHETYPES = Object.freeze([\n  { id: 'balanced', label: 'Balanced Primitive' },\n  { id: 'dry', label: 'Dry Basin' },\n  { id: 'icy', label: 'Icy Marginal' },\n  { id: 'oceanic', label: 'Oceanic' },\n  { id: 'greenhouse', label: 'Greenhouse' },\n  { id: 'rugged', label: 'Rugged Highlands' }\n]);\n\nconst LAYERS = Object.freeze([\n  { id: 'elevation', label: 'Elevation' },\n  { id: 'water', label: 'Water' },\n  { id: 'temperature', label: 'Temperature' },\n  { id: 'ice', label: 'Ice' },\n  { id: 'habitability', label: 'Habitability' },\n  { id: 'primitiveLife', label: 'Primitive Life' },\n  { id: 'producerMats', label: 'Producer Mats' },\n  { id: 'biodiversityIndex', label: 'Biodiversity Index' },\n  { id: 'ecosystemResilience', label: 'Ecosystem Resilience' },\n  { id: 'stewardshipPressure', label: 'Stewardship Pressure' },\n  { id: 'civilisationSuitability', label: 'Civilisation Suitability' },\n  { id: 'settlements', label: 'Settlements' },\n  { id: 'waterFlow', label: 'Water Flow' },\n  { id: 'cloudCover', label: 'Cloud Cover' }\n]);\n\nconst TOOLS = Object.freeze([\n  { id: 'inspect_world', label: 'Inspect World' },\n  { id: 'comet_delivery', label: 'Comet Delivery' },\n  { id: 'volcanic_outgassing', label: 'Volcanic Outgassing' },\n  { id: 'orbital_shade', label: 'Orbital Shade' },\n  { id: 'mineral_seeding', label: 'Mineral Seeding' },\n  { id: 'seed_primitive_life', label: 'Seed Primitive Life' },\n  { id: 'planetary_stabilisation', label: 'Planetary Stabilisation' },\n  { id: 'seed_early_settlers', label: 'Seed Early Settlers' }\n]);\n\nconst PROBES = Object.freeze([\n  { id: 'architecture_sanity', label: 'Architecture sanity probe' },\n  { id: 'deterministic_generation', label: 'Deterministic generation probe' },\n  { id: 'snapshot_restore', label: 'Worker snapshot/restore probe' },\n  { id: 'procedural_lifeless', label: 'Procedural lifeless world probe' },\n  { id: 'earthlike_template', label: 'Earthlike template probe' },\n  { id: 'ecosystem_growth', label: 'Ecosystem growth probe' },\n  { id: 'civilisation_gate', label: 'Civilisation emergence gate probe' },\n  { id: 'no_dom_in_worker', label: 'No UI access in worker probe' },\n  { id: 'render_data_finite', label: 'Render-data finite/bounded probe' }\n]);\n\nfunction makeEnvelope(type, payload = {}) {\n  return { type, payload };\n}\n\n\n/* ============================================================\n   Utility math\n   Source: src/util/math.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\nfunction clamp(value, min, max) {\n  return Math.max(min, Math.min(max, value));\n}\n\nfunction clamp01(value) {\n  return clamp(value, 0, 1);\n}\n\nfunction lerp(a, b, t) {\n  return a + (b - a) * t;\n}\n\nfunction smoothstep(edge0, edge1, x) {\n  const t = clamp01((x - edge0) / Math.max(1e-9, edge1 - edge0));\n  return t * t * (3 - 2 * t);\n}\n\nfunction weightedAverage(values, weights) {\n  let num = 0;\n  let den = 0;\n  for (let i = 0; i < values.length; i += 1) {\n    const v = values[i];\n    const w = weights[i];\n    if (Number.isFinite(v) && Number.isFinite(w) && w > 0) {\n      num += v * w;\n      den += w;\n    }\n  }\n  return den > 0 ? num / den : 0;\n}\n\nfunction toCelsius(indexValue) {\n  return -30 + indexValue * 75;\n}\n\nfunction finite01(value) {\n  return Number.isFinite(value) ? clamp01(value) : 0;\n}\n\n\n/* ============================================================\n   Deterministic random\n   Source: src/util/random.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\nfunction stringToSeed(input) {\n  const text = String(input ?? 'seed');\n  let h = 2166136261 >>> 0;\n  for (let i = 0; i < text.length; i += 1) {\n    h ^= text.charCodeAt(i);\n    h = Math.imul(h, 16777619) >>> 0;\n  }\n  return h >>> 0;\n}\n\nfunction mulberry32(seed) {\n  let t = seed >>> 0;\n  return function nextRandom() {\n    t += 0x6D2B79F5;\n    let r = t;\n    r = Math.imul(r ^ (r >>> 15), r | 1);\n    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);\n    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;\n  };\n}\n\nfunction hashUnit(seed, a = 0, b = 0) {\n  let x = (seed >>> 0) ^ Math.imul(a + 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(b + 0xC2B2AE35, 0x27D4EB2D);\n  x ^= x >>> 16;\n  x = Math.imul(x, 0x7FEB352D);\n  x ^= x >>> 15;\n  x = Math.imul(x, 0x846CA68B);\n  x ^= x >>> 16;\n  return (x >>> 0) / 4294967296;\n}\n\n\n/* ============================================================\n   Performance helpers\n   Source: src/util/perf.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\nfunction nowMs() {\n  return performance.now();\n}\n\nfunction timeBlock(fn) {\n  const start = nowMs();\n  const result = fn();\n  return { result, ms: nowMs() - start };\n}\n\nfunction estimateTypedPayloadBytes(payload) {\n  let bytes = 0;\n  for (const value of Object.values(payload)) {\n    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') {\n      bytes += value.byteLength;\n    }\n  }\n  return bytes;\n}\n\n\n/* ============================================================\n   State schema\n   Source: src/state-schema.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\nconst STATE_SCHEMA_VERSION = 'engine-v2-state-schema-0.1.0';\n\nconst DEFAULT_CONFIG = Object.freeze({\n  subdivisions: 3,\n  initialSeed: 'ENGINE-V2-001',\n  yearPerStep: 1,\n  maxAdvanceSteps: 250,\n  defaultTemplate: 'procedural_lifeless',\n  defaultArchetype: 'balanced',\n  defaultSpeed: 1,\n  defaultToolRadius: 2\n});\n\nconst SIM_ARRAY_FIELDS = Object.freeze([\n  'elevation',\n  'water',\n  'ice',\n  'temperature',\n  'humidity',\n  'rainfall',\n  'runoff',\n  'waterFlow',\n  'habitability',\n  'primitiveLife',\n  'dormantLife',\n  'biomass',\n  'producerMats',\n  'biomeClass',\n  'biodiversityIndex',\n  'ecosystemResilience',\n  'ecosystemStress',\n  'recoveryPotential',\n  'disturbancePressure',\n  'habitatContinuity',\n  'stewardshipPressure',\n  'restorationPriority',\n  'civilisationSuitability',\n  'settlements',\n  'populationIndex',\n  'foodSupport',\n  'waterAccess',\n  'socialComplexity',\n  'civilisationStress',\n  'collapseRisk',\n  'recoveryCapacity',\n  'cloudCover',\n  'terrainClass',\n  'craterPressure',\n  'greenhousePressure',\n  'nutrientLevel'\n]);\n\nconst RENDER_ARRAY_FIELDS = Object.freeze([\n  'elevation',\n  'water',\n  'ice',\n  'temperature',\n  'humidity',\n  'rainfall',\n  'runoff',\n  'waterFlow',\n  'habitability',\n  'primitiveLife',\n  'dormantLife',\n  'biomass',\n  'producerMats',\n  'biomeClass',\n  'biodiversityIndex',\n  'ecosystemResilience',\n  'ecosystemStress',\n  'recoveryPotential',\n  'disturbancePressure',\n  'habitatContinuity',\n  'stewardshipPressure',\n  'restorationPriority',\n  'civilisationSuitability',\n  'settlements',\n  'populationIndex',\n  'foodSupport',\n  'waterAccess',\n  'socialComplexity',\n  'civilisationStress',\n  'collapseRisk',\n  'recoveryCapacity',\n  'cloudCover',\n  'terrainClass',\n  'greenhousePressure',\n  'nutrientLevel'\n]);\n\nfunction createSimulationState(mesh, options = {}) {\n  const count = mesh.count;\n  const state = {\n    schemaVersion: STATE_SCHEMA_VERSION,\n    mesh,\n    cellCount: count,\n    seed: options.seed || DEFAULT_CONFIG.initialSeed,\n    template: options.template || DEFAULT_CONFIG.defaultTemplate,\n    archetype: options.archetype || DEFAULT_CONFIG.defaultArchetype,\n    stepCount: 0,\n    year: 0,\n    speed: DEFAULT_CONFIG.defaultSpeed,\n    selectedCell: -1,\n    lastAction: 'No action yet.',\n    lastLimitingFactor: 'none',\n    generationSignature: '',\n    renderDirty: true,\n    trendDirty: true,\n    scratchLife: new Float32Array(count),\n    scratchFlow: new Float32Array(count),\n    diagnostics: {\n      workerStatus: 'created',\n      lastTickMs: 0,\n      lastGenerationMs: 0,\n      lastToolMs: 0,\n      lastProbeMs: 0,\n      lastRenderBuildMs: 0,\n      lastRenderBytes: 0,\n      messageCount: 0,\n      lastError: '',\n      neighbourLinks: mesh.neighbourLinkCount\n    }\n  };\n\n  for (const field of SIM_ARRAY_FIELDS) {\n    if (field === 'biomeClass' || field === 'terrainClass') {\n      state[field] = new Uint8Array(count);\n    } else {\n      state[field] = new Float32Array(count);\n    }\n  }\n\n  return state;\n}\n\nfunction cloneState(state) {\n  const clone = {\n    schemaVersion: state.schemaVersion,\n    mesh: state.mesh,\n    cellCount: state.cellCount,\n    seed: state.seed,\n    template: state.template,\n    archetype: state.archetype,\n    stepCount: state.stepCount,\n    year: state.year,\n    speed: state.speed,\n    selectedCell: state.selectedCell,\n    lastAction: state.lastAction,\n    lastLimitingFactor: state.lastLimitingFactor,\n    generationSignature: state.generationSignature,\n    renderDirty: state.renderDirty,\n    trendDirty: state.trendDirty,\n    scratchLife: new Float32Array(state.scratchLife),\n    scratchFlow: new Float32Array(state.scratchFlow),\n    diagnostics: { ...state.diagnostics }\n  };\n\n  for (const field of SIM_ARRAY_FIELDS) {\n    const source = state[field];\n    clone[field] = source instanceof Uint8Array ? new Uint8Array(source) : new Float32Array(source);\n  }\n\n  return clone;\n}\n\nfunction restoreState(target, snapshot) {\n  target.seed = snapshot.seed;\n  target.template = snapshot.template;\n  target.archetype = snapshot.archetype;\n  target.stepCount = snapshot.stepCount;\n  target.year = snapshot.year;\n  target.speed = snapshot.speed;\n  target.selectedCell = snapshot.selectedCell;\n  target.lastAction = snapshot.lastAction;\n  target.lastLimitingFactor = snapshot.lastLimitingFactor;\n  target.generationSignature = snapshot.generationSignature;\n  target.renderDirty = snapshot.renderDirty;\n  target.trendDirty = snapshot.trendDirty;\n  target.scratchLife.set(snapshot.scratchLife);\n  target.scratchFlow.set(snapshot.scratchFlow);\n  target.diagnostics = { ...snapshot.diagnostics };\n\n  for (const field of SIM_ARRAY_FIELDS) {\n    target[field].set(snapshot[field]);\n  }\n}\n\nfunction validateArrayShape(state) {\n  const failures = [];\n  for (const field of SIM_ARRAY_FIELDS) {\n    if (!state[field] || state[field].length !== state.cellCount) {\n      failures.push(`${field}: expected ${state.cellCount}, got ${state[field] ? state[field].length : 'missing'}`);\n    }\n  }\n  return failures;\n}\n\n\n/* ============================================================\n   Mesh\n   Source: src/sim/mesh.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction normalizeVertex(v) {\n  const d = Math.hypot(v[0], v[1], v[2]) || 1;\n  return [v[0] / d, v[1] / d, v[2] / d];\n}\n\nfunction midpoint(a, b) {\n  return normalizeVertex([(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]);\n}\n\nfunction edgeKey(a, b) {\n  return a < b ? `${a}:${b}` : `${b}:${a}`;\n}\n\nfunction addNeighbour(neighbours, degrees, a, b) {\n  const offset = a * 3;\n  for (let i = 0; i < 3; i += 1) {\n    if (neighbours[offset + i] === b) return;\n  }\n  if (degrees[a] < 3) {\n    neighbours[offset + degrees[a]] = b;\n    degrees[a] += 1;\n  }\n}\n\nfunction createIcosphereMesh(options = {}) {\n  const subdivisions = clamp(options.subdivisions ?? 3, 0, 5) | 0;\n  const phi = (1 + Math.sqrt(5)) / 2;\n  let vertices = [\n    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],\n    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],\n    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]\n  ].map(normalizeVertex);\n\n  let faces = [\n    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],\n    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],\n    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],\n    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]\n  ];\n\n  for (let level = 0; level < subdivisions; level += 1) {\n    const midpointCache = new Map();\n    const getMidpointIndex = (a, b) => {\n      const key = edgeKey(a, b);\n      if (midpointCache.has(key)) return midpointCache.get(key);\n      const index = vertices.length;\n      vertices.push(midpoint(vertices[a], vertices[b]));\n      midpointCache.set(key, index);\n      return index;\n    };\n\n    const nextFaces = [];\n    for (const [a, b, c] of faces) {\n      const ab = getMidpointIndex(a, b);\n      const bc = getMidpointIndex(b, c);\n      const ca = getMidpointIndex(c, a);\n      nextFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);\n    }\n    faces = nextFaces;\n  }\n\n  const count = faces.length;\n  const triangleX = new Float32Array(count * 3);\n  const triangleY = new Float32Array(count * 3);\n  const triangleZ = new Float32Array(count * 3);\n  const centerX = new Float32Array(count);\n  const centerY = new Float32Array(count);\n  const centerZ = new Float32Array(count);\n  const latitude = new Float32Array(count);\n  const longitude = new Float32Array(count);\n  const areaWeight = new Float32Array(count);\n  const neighbours = new Int32Array(count * 3);\n  neighbours.fill(-1);\n  const degrees = new Uint8Array(count);\n  const faceEdges = new Map();\n\n  for (let id = 0; id < count; id += 1) {\n    let face = faces[id];\n    const a = vertices[face[0]];\n    const b = vertices[face[1]];\n    const c = vertices[face[2]];\n    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];\n    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];\n    const normal = [\n      ab[1] * ac[2] - ab[2] * ac[1],\n      ab[2] * ac[0] - ab[0] * ac[2],\n      ab[0] * ac[1] - ab[1] * ac[0]\n    ];\n    const centreRaw = normalizeVertex([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);\n    const outward = normal[0] * centreRaw[0] + normal[1] * centreRaw[1] + normal[2] * centreRaw[2];\n    if (outward < 0) face = [face[0], face[2], face[1]];\n    faces[id] = face;\n  }\n\n  for (let id = 0; id < count; id += 1) {\n    const face = faces[id];\n    for (let k = 0; k < 3; k += 1) {\n      const v = vertices[face[k]];\n      triangleX[id * 3 + k] = v[0];\n      triangleY[id * 3 + k] = v[1];\n      triangleZ[id * 3 + k] = v[2];\n    }\n\n    const a = vertices[face[0]];\n    const b = vertices[face[1]];\n    const c = vertices[face[2]];\n    const centre = normalizeVertex([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]);\n    centerX[id] = centre[0];\n    centerY[id] = centre[1];\n    centerZ[id] = centre[2];\n    latitude[id] = Math.asin(centre[1]) * 180 / Math.PI;\n    longitude[id] = Math.atan2(centre[2], centre[0]) * 180 / Math.PI;\n\n    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];\n    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];\n    const cross = [\n      ab[1] * ac[2] - ab[2] * ac[1],\n      ab[2] * ac[0] - ab[0] * ac[2],\n      ab[0] * ac[1] - ab[1] * ac[0]\n    ];\n    areaWeight[id] = Math.max(1e-6, Math.hypot(cross[0], cross[1], cross[2]) * 0.5);\n\n    for (let k = 0; k < 3; k += 1) {\n      const aIndex = face[k];\n      const bIndex = face[(k + 1) % 3];\n      const key = edgeKey(aIndex, bIndex);\n      const other = faceEdges.get(key);\n      if (other === undefined) {\n        faceEdges.set(key, id);\n      } else {\n        addNeighbour(neighbours, degrees, id, other);\n        addNeighbour(neighbours, degrees, other, id);\n      }\n    }\n  }\n\n  let areaSum = 0;\n  let neighbourLinkCount = 0;\n  for (let i = 0; i < count; i += 1) {\n    areaSum += areaWeight[i];\n    neighbourLinkCount += degrees[i];\n  }\n  const areaMean = areaSum / count;\n  for (let i = 0; i < count; i += 1) {\n    areaWeight[i] = areaWeight[i] / areaMean;\n  }\n\n  return {\n    type: 'icosphere-triangle-faces',\n    subdivisions,\n    vertexCount: vertices.length,\n    count,\n    triangleX,\n    triangleY,\n    triangleZ,\n    centerX,\n    centerY,\n    centerZ,\n    latitude,\n    longitude,\n    areaWeight,\n    neighbours,\n    degree: degrees,\n    neighbourLinkCount\n  };\n}\n\nfunction expandRadius(mesh, originCell, radius) {\n  const origin = originCell | 0;\n  const r = clamp(radius | 0, 0, 12);\n  if (origin < 0 || origin >= mesh.count) return [];\n  const result = [origin];\n  if (r === 0) return result;\n\n  const seen = new Uint8Array(mesh.count);\n  seen[origin] = 1;\n  let frontier = [origin];\n  for (let depth = 0; depth < r; depth += 1) {\n    const next = [];\n    for (const cell of frontier) {\n      const offset = cell * 3;\n      for (let k = 0; k < 3; k += 1) {\n        const n = mesh.neighbours[offset + k];\n        if (n >= 0 && seen[n] === 0) {\n          seen[n] = 1;\n          result.push(n);\n          next.push(n);\n        }\n      }\n    }\n    frontier = next;\n    if (frontier.length === 0) break;\n  }\n  return result;\n}\n\nfunction meshSignature(mesh) {\n  return `${mesh.type}|F${mesh.subdivisions}|cells:${mesh.count}|vertices:${mesh.vertexCount}|links:${mesh.neighbourLinkCount}`;\n}\n\n\n/* ============================================================\n   Summaries and signatures\n   Source: src/sim/summaries.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction weightedMean(values, weights) {\n  let num = 0;\n  let den = 0;\n  for (let i = 0; i < values.length; i += 1) {\n    const v = values[i];\n    const w = weights[i];\n    if (Number.isFinite(v) && Number.isFinite(w)) {\n      num += v * w;\n      den += w;\n    }\n  }\n  return den > 0 ? num / den : 0;\n}\n\nfunction weightedShare(values, weights, threshold) {\n  let num = 0;\n  let den = 0;\n  for (let i = 0; i < values.length; i += 1) {\n    const w = weights[i];\n    den += w;\n    if (values[i] >= threshold) num += w;\n  }\n  return den > 0 ? num / den : 0;\n}\n\nfunction computeSummary(state, mesh) {\n  const weights = mesh.areaWeight;\n  const temp = weightedMean(state.temperature, weights);\n  const life = weightedMean(state.primitiveLife, weights);\n  const civ = weightedMean(state.settlements, weights);\n  const stress = weightedMean(state.ecosystemStress, weights);\n  const collapse = weightedMean(state.collapseRisk, weights);\n  const waterShare = weightedShare(state.water, weights, 0.50);\n  const iceShare = weightedShare(state.ice, weights, 0.40);\n  const habShare = weightedShare(state.habitability, weights, 0.50);\n  const settlementShare = weightedShare(state.settlements, weights, 0.10);\n  const warnings = collectWarnings(state, mesh, { temp, waterShare, iceShare, life });\n\n  return {\n    schemaVersion: state.schemaVersion,\n    meshType: mesh.type,\n    meshSignature: meshSignature(mesh),\n    cellCount: state.cellCount,\n    neighbourLinks: mesh.neighbourLinkCount,\n    seed: state.seed,\n    template: state.template,\n    archetype: state.archetype,\n    stepCount: state.stepCount,\n    year: state.year,\n    speed: state.speed,\n    selectedCell: state.selectedCell,\n    lastAction: state.lastAction,\n    lastLimitingFactor: state.lastLimitingFactor,\n    generationSignature: state.generationSignature,\n    averageTemperature: temp,\n    averageTemperatureC: toCelsius(temp),\n    waterShare,\n    iceShare,\n    habitableShare: habShare,\n    primitiveLifeCoverage: weightedShare(state.primitiveLife, weights, 0.05),\n    primitiveLifeMean: life,\n    producerMatsMean: weightedMean(state.producerMats, weights),\n    biodiversityMean: weightedMean(state.biodiversityIndex, weights),\n    resilienceMean: weightedMean(state.ecosystemResilience, weights),\n    ecosystemStressMean: stress,\n    stewardshipPressureMean: weightedMean(state.stewardshipPressure, weights),\n    civilisationSuitabilityMean: weightedMean(state.civilisationSuitability, weights),\n    settlementShare,\n    settlementMean: civ,\n    populationMean: weightedMean(state.populationIndex, weights),\n    collapseRiskMean: collapse,\n    cloudMean: weightedMean(state.cloudCover, weights),\n    runoffMean: weightedMean(state.runoff, weights),\n    waterFlowMean: weightedMean(state.waterFlow, weights),\n    warnings,\n    renderDirty: state.renderDirty,\n    trendDirty: state.trendDirty,\n    diagnostics: { ...state.diagnostics }\n  };\n}\n\nfunction computeSelectedCellSummary(state, mesh, cellId = state.selectedCell) {\n  const id = cellId | 0;\n  if (id < 0 || id >= state.cellCount) {\n    return { cellId: -1, message: 'No cell selected.' };\n  }\n  return {\n    cellId: id,\n    latitude: mesh.latitude[id],\n    longitude: mesh.longitude[id],\n    neighbours: Array.from(mesh.neighbours.slice(id * 3, id * 3 + 3)).filter((v) => v >= 0),\n    elevation: state.elevation[id],\n    terrainClass: state.terrainClass[id],\n    water: state.water[id],\n    ice: state.ice[id],\n    temperature: state.temperature[id],\n    temperatureC: toCelsius(state.temperature[id]),\n    humidity: state.humidity[id],\n    rainfall: state.rainfall[id],\n    runoff: state.runoff[id],\n    waterFlow: state.waterFlow[id],\n    habitability: state.habitability[id],\n    primitiveLife: state.primitiveLife[id],\n    dormantLife: state.dormantLife[id],\n    biomass: state.biomass[id],\n    producerMats: state.producerMats[id],\n    biodiversityIndex: state.biodiversityIndex[id],\n    ecosystemResilience: state.ecosystemResilience[id],\n    ecosystemStress: state.ecosystemStress[id],\n    recoveryPotential: state.recoveryPotential[id],\n    stewardshipPressure: state.stewardshipPressure[id],\n    restorationPriority: state.restorationPriority[id],\n    civilisationSuitability: state.civilisationSuitability[id],\n    settlements: state.settlements[id],\n    populationIndex: state.populationIndex[id],\n    foodSupport: state.foodSupport[id],\n    waterAccess: state.waterAccess[id],\n    socialComplexity: state.socialComplexity[id],\n    civilisationStress: state.civilisationStress[id],\n    collapseRisk: state.collapseRisk[id],\n    cloudCover: state.cloudCover[id],\n    greenhousePressure: state.greenhousePressure[id],\n    nutrientLevel: state.nutrientLevel[id],\n    lifeStatus: localLifeStatus(state, id),\n    limitingFactor: localLimitingFactor(state, id)\n  };\n}\n\nfunction buildRenderData(state, mesh) {\n  const payload = {\n    meshType: mesh.type,\n    subdivisions: mesh.subdivisions,\n    count: mesh.count,\n    selectedCell: state.selectedCell,\n    tick: state.stepCount,\n    year: state.year,\n    layerIds: LAYERS.map((layer) => layer.id),\n    triangleX: new Float32Array(mesh.triangleX),\n    triangleY: new Float32Array(mesh.triangleY),\n    triangleZ: new Float32Array(mesh.triangleZ),\n    centerX: new Float32Array(mesh.centerX),\n    centerY: new Float32Array(mesh.centerY),\n    centerZ: new Float32Array(mesh.centerZ),\n    latitude: new Float32Array(mesh.latitude),\n    longitude: new Float32Array(mesh.longitude),\n    areaWeight: new Float32Array(mesh.areaWeight)\n  };\n\n  for (const field of RENDER_ARRAY_FIELDS) {\n    const source = state[field];\n    payload[field] = source instanceof Uint8Array ? new Uint8Array(source) : new Float32Array(source);\n  }\n\n  let bytes = 0;\n  for (const value of Object.values(payload)) {\n    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') bytes += value.byteLength;\n  }\n  payload.bytes = bytes;\n  state.diagnostics.lastRenderBytes = bytes;\n  state.renderDirty = false;\n  return payload;\n}\n\nfunction collectTransferables(payload) {\n  const buffers = [];\n  for (const value of Object.values(payload)) {\n    if (value && value.buffer instanceof ArrayBuffer && typeof value.byteLength === 'number') {\n      buffers.push(value.buffer);\n    }\n  }\n  return buffers;\n}\n\nfunction signatureState(state) {\n  let h = 2166136261 >>> 0;\n  const fields = ['elevation', 'water', 'temperature', 'ice', 'habitability', 'primitiveLife', 'producerMats', 'settlements', 'populationIndex'];\n  for (const field of fields) {\n    const arr = state[field];\n    const stride = Math.max(1, Math.floor(arr.length / 97));\n    for (let i = 0; i < arr.length; i += stride) {\n      h ^= Math.round(arr[i] * 100000) + i;\n      h = Math.imul(h, 16777619) >>> 0;\n    }\n  }\n  h ^= state.stepCount;\n  h = Math.imul(h, 16777619) >>> 0;\n  return `sig-${(h >>> 0).toString(16).padStart(8, '0')}`;\n}\n\nfunction trendSampleFromSummary(summary) {\n  return {\n    year: summary.year,\n    tick: summary.stepCount,\n    tempC: summary.averageTemperatureC,\n    waterShare: summary.waterShare,\n    iceShare: summary.iceShare,\n    habitability: summary.habitableShare,\n    primitiveLife: summary.primitiveLifeMean,\n    biodiversity: summary.biodiversityMean,\n    settlement: summary.settlementMean,\n    collapseRisk: summary.collapseRiskMean\n  };\n}\n\nfunction validateFiniteBounded(state) {\n  const failures = [];\n  for (const field of SIM_ARRAY_FIELDS) {\n    const arr = state[field];\n    if (!arr) {\n      failures.push(`${field}: missing`);\n      continue;\n    }\n    for (let i = 0; i < arr.length; i += 1) {\n      const value = arr[i];\n      if (!Number.isFinite(value)) {\n        failures.push(`${field}[${i}] non-finite`);\n        break;\n      }\n      if (value < -0.001 || value > 255.001) {\n        failures.push(`${field}[${i}] out of broad bounds: ${value}`);\n        break;\n      }\n    }\n  }\n  return failures;\n}\n\nfunction collectWarnings(state, mesh, metrics) {\n  const warnings = [];\n  if (metrics.waterShare < 0.03) warnings.push('Very low surface water coverage.');\n  if (metrics.waterShare > 0.96) warnings.push('Very high water coverage.');\n  if (metrics.temp < 0.18 || metrics.temp > 0.88) warnings.push('Extreme average temperature.');\n  if (metrics.life < 0.001 && state.template === 'earthlike') warnings.push('Earthlike template has unexpectedly low primitive life.');\n  const finiteFailures = validateFiniteBounded(state);\n  if (finiteFailures.length > 0) warnings.push(`State validation warning: ${finiteFailures[0]}`);\n  if (mesh.neighbourLinkCount < mesh.count * 2) warnings.push('Low neighbour-link count.');\n  return warnings;\n}\n\nfunction localLifeStatus(state, i) {\n  if (state.primitiveLife[i] > 0.45 && state.ecosystemStress[i] < 0.45) return 'expanding primitive life';\n  if (state.primitiveLife[i] > 0.08) return 'seeded active life';\n  if (state.dormantLife[i] > 0.06) return 'dormant life';\n  if (state.habitability[i] > 0.48) return 'viable but lifeless';\n  if (state.habitability[i] > 0.30) return 'marginal lifeless';\n  return 'hostile lifeless';\n}\n\nfunction localLimitingFactor(state, i) {\n  if (state.waterAccess[i] < 0.25) return 'water access';\n  if (state.temperature[i] > 0.78) return 'heat stress';\n  if (state.temperature[i] < 0.30) return 'cold stress';\n  if (state.ice[i] > 0.65) return 'ice cover';\n  if (state.nutrientLevel[i] < 0.24) return 'nutrients';\n  if (state.ecosystemStress[i] > 0.70) return 'ecosystem stress';\n  return 'none material';\n}\n\n\n/* ============================================================\n   Generation\n   Source: src/sim/generation.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nconst TEMPLATE_PROFILES = Object.freeze({\n  procedural_lifeless: { water: 0.45, temp: 0.50, greenhouse: 0.42, ice: 0.18, nutrient: 0.44, life: 0, civ: 0 },\n  earthlike: { water: 0.57, temp: 0.55, greenhouse: 0.55, ice: 0.15, nutrient: 0.66, life: 1, civ: 1 },\n  water_world: { water: 0.82, temp: 0.50, greenhouse: 0.48, ice: 0.12, nutrient: 0.42, life: 0, civ: 0 },\n  ice_world: { water: 0.50, temp: 0.25, greenhouse: 0.28, ice: 0.75, nutrient: 0.36, life: 0, civ: 0 },\n  greenhouse_world: { water: 0.38, temp: 0.82, greenhouse: 0.86, ice: 0.02, nutrient: 0.34, life: 0, civ: 0 }\n});\n\nconst ARCHETYPE_PROFILES = Object.freeze({\n  balanced: { rough: 0.50, waterShift: 0.00, tempShift: 0.00, nutrientShift: 0.04 },\n  dry: { rough: 0.46, waterShift: -0.20, tempShift: 0.09, nutrientShift: -0.08 },\n  icy: { rough: 0.42, waterShift: 0.02, tempShift: -0.20, nutrientShift: -0.03 },\n  oceanic: { rough: 0.28, waterShift: 0.22, tempShift: 0.00, nutrientShift: -0.02 },\n  greenhouse: { rough: 0.52, waterShift: -0.08, tempShift: 0.20, nutrientShift: -0.05 },\n  rugged: { rough: 0.78, waterShift: -0.04, tempShift: -0.02, nutrientShift: 0.02 }\n});\n\nfunction profileFor(options) {\n  const template = TEMPLATE_PROFILES[options.template] || TEMPLATE_PROFILES.procedural_lifeless;\n  const archetype = ARCHETYPE_PROFILES[options.archetype] || ARCHETYPE_PROFILES.balanced;\n  const water = clamp01((options.waterLevel ?? template.water) + archetype.waterShift);\n  const temp = clamp01((options.temperature ?? template.temp) + archetype.tempShift);\n  const greenhouse = clamp01(options.greenhouse ?? template.greenhouse);\n  const ice = clamp01(options.ice ?? template.ice);\n  const nutrient = clamp01((options.nutrients ?? template.nutrient) + archetype.nutrientShift);\n  const rough = clamp01(options.roughness ?? archetype.rough);\n  return { template, archetype, water, temp, greenhouse, ice, nutrient, rough };\n}\n\nfunction terrainNoise(seed, i, x, y, z, rough) {\n  const n1 = Math.sin(3.1 * x + 1.7 * y + seed * 0.000001);\n  const n2 = Math.sin(4.9 * z - 2.1 * x + seed * 0.000003);\n  const n3 = Math.cos(7.3 * y + 2.8 * z - seed * 0.000002);\n  const grain = hashUnit(seed, i, 17) * 2 - 1;\n  return 0.50 + 0.20 * n1 + 0.14 * n2 + 0.10 * n3 + (0.08 + 0.18 * rough) * grain;\n}\n\nfunction earthlikeMask(lonDeg, latDeg) {\n  const lon = lonDeg / 180;\n  const lat = latDeg / 90;\n  const americas = Math.exp(-((lon + 0.55) ** 2) / 0.045) * Math.exp(-((lat - 0.05) ** 2) / 0.75);\n  const africaEurasia = Math.exp(-((lon - 0.12) ** 2) / 0.14) * Math.exp(-((lat - 0.18) ** 2) / 0.42);\n  const asia = Math.exp(-((lon - 0.55) ** 2) / 0.08) * Math.exp(-((lat - 0.20) ** 2) / 0.36);\n  const australia = Math.exp(-((lon - 0.75) ** 2) / 0.025) * Math.exp(-((lat + 0.40) ** 2) / 0.04);\n  const antarctica = smoothstep(0.66, 0.92, -lat);\n  const oceanGap = Math.exp(-((lon + 0.10) ** 2) / 0.035) * Math.exp(-(lat ** 2) / 0.50);\n  return americas + africaEurasia + asia + australia + antarctica - 0.45 * oceanGap;\n}\n\nfunction generateWorld(state, mesh, options = {}) {\n  const seedText = String(options.seed || state.seed || 'ENGINE-V2-001');\n  const seed = stringToSeed(seedText);\n  const templateId = options.template || state.template || 'procedural_lifeless';\n  const archetypeId = options.archetype || state.archetype || 'balanced';\n  const profile = profileFor({ ...options, template: templateId, archetype: archetypeId });\n  const seaLevel = 0.54 + (profile.water - 0.50) * 0.42;\n\n  state.seed = seedText;\n  state.template = templateId;\n  state.archetype = archetypeId;\n  state.stepCount = 0;\n  state.year = 0;\n  state.selectedCell = -1;\n  state.lastAction = `Generated ${templateId.replaceAll('_', ' ')} with ${archetypeId.replaceAll('_', ' ')} archetype.`;\n  state.lastLimitingFactor = 'new world';\n\n  for (let i = 0; i < mesh.count; i += 1) {\n    const x = mesh.centerX[i];\n    const y = mesh.centerY[i];\n    const z = mesh.centerZ[i];\n    const latAbs = Math.abs(mesh.latitude[i]) / 90;\n    const lon = mesh.longitude[i];\n    const lat = mesh.latitude[i];\n    state.craterPressure[i] = 0;\n    let elevation = terrainNoise(seed, i, x, y, z, profile.rough);\n    if (templateId === 'earthlike') {\n      elevation = 0.42 + 0.32 * earthlikeMask(lon, lat) + 0.12 * (hashUnit(seed, i, 91) - 0.5);\n    }\n    elevation = clamp01((elevation - 0.18) / 0.82);\n    if (profile.archetype.rough > 0.65) {\n      elevation = clamp01(elevation + 0.14 * Math.sin(12 * x + 8 * z));\n    }\n    state.elevation[i] = elevation;\n\n    const ocean = elevation < seaLevel ? 1 : 0;\n    const coastPotential = 1 - Math.abs(elevation - seaLevel) / 0.16;\n    state.water[i] = ocean ? clamp01(0.66 + 0.30 * (seaLevel - elevation) / 0.40) : clamp01(Math.max(0, coastPotential) * 0.18 * profile.water);\n\n    const elevationCooling = elevation > seaLevel ? (elevation - seaLevel) * 0.35 : 0;\n    const baseTemp = profile.temp + (1 - latAbs) * 0.22 - latAbs * 0.26 + profile.greenhouse * 0.16 - elevationCooling;\n    const temp = clamp01(baseTemp + (hashUnit(seed, i, 31) - 0.5) * 0.08);\n    state.temperature[i] = temp;\n    state.greenhousePressure[i] = clamp01(profile.greenhouse + 0.10 * (hashUnit(seed, i, 57) - 0.5));\n\n    const polarFreeze = smoothstep(0.46, 0.92, latAbs);\n    const freeze = clamp01(profile.ice * 0.45 + polarFreeze * 0.45 + smoothstep(0.42, 0.12, temp) * 0.50);\n    state.ice[i] = clamp01(freeze * (0.25 + 0.75 * state.water[i]));\n\n    state.humidity[i] = clamp01(state.water[i] * 0.55 + (1 - latAbs) * 0.22 + profile.greenhouse * 0.12 - state.ice[i] * 0.22);\n    state.rainfall[i] = clamp01(state.humidity[i] * (0.55 + 0.35 * (1 - latAbs)) - Math.max(0, elevation - seaLevel) * 0.10);\n    state.runoff[i] = clamp01(Math.max(0, state.rainfall[i] - 0.20) * (0.30 + elevation * 0.55));\n    state.waterFlow[i] = clamp01(state.runoff[i] + state.water[i] * 0.28);\n    state.cloudCover[i] = clamp01(state.humidity[i] * 0.55 + state.rainfall[i] * 0.25);\n    state.nutrientLevel[i] = clamp01(profile.nutrient + 0.14 * state.runoff[i] + 0.08 * (1 - elevation) + (hashUnit(seed, i, 77) - 0.5) * 0.12);\n\n    const tempFit = 1 - Math.abs(temp - 0.55) / 0.42;\n    const waterFit = clamp01(state.water[i] * 0.68 + state.rainfall[i] * 0.38);\n    state.habitability[i] = clamp01(tempFit * 0.42 + waterFit * 0.28 + state.nutrientLevel[i] * 0.22 - state.ice[i] * 0.30);\n\n    state.primitiveLife[i] = 0;\n    state.dormantLife[i] = 0;\n    state.biomass[i] = 0;\n    state.producerMats[i] = 0;\n    state.biodiversityIndex[i] = 0;\n    state.ecosystemResilience[i] = clamp01(state.habitability[i] * 0.30);\n    state.ecosystemStress[i] = clamp01(1 - state.habitability[i] + state.ice[i] * 0.20);\n    state.recoveryPotential[i] = clamp01(state.habitability[i] * 0.55 + state.nutrientLevel[i] * 0.25);\n    state.disturbancePressure[i] = clamp01(state.craterPressure[i] * 0.3 + Math.abs(temp - 0.55) * 0.35);\n    state.habitatContinuity[i] = clamp01(state.habitability[i] * 0.40 + (1 - state.ice[i]) * 0.20);\n    state.stewardshipPressure[i] = 0;\n    state.restorationPriority[i] = clamp01((1 - state.habitability[i]) * 0.35);\n    state.civilisationSuitability[i] = clamp01(state.habitability[i] * 0.52 + (1 - ocean) * 0.20 + state.waterAccess[i] * 0.15);\n    state.settlements[i] = 0;\n    state.populationIndex[i] = 0;\n    state.foodSupport[i] = clamp01(state.habitability[i] * 0.60 + state.producerMats[i] * 0.20);\n    state.waterAccess[i] = clamp01(state.water[i] * 0.65 + state.rainfall[i] * 0.25 + state.runoff[i] * 0.15);\n    state.socialComplexity[i] = 0;\n    state.civilisationStress[i] = clamp01(1 - state.civilisationSuitability[i]);\n    state.collapseRisk[i] = state.civilisationStress[i] * 0.20;\n    state.recoveryCapacity[i] = clamp01(state.recoveryPotential[i] * 0.50);\n\n    if (state.water[i] > 0.55) state.terrainClass[i] = 0;\n    else if (elevation < seaLevel + 0.05) state.terrainClass[i] = 1;\n    else if (elevation < 0.62) state.terrainClass[i] = 2;\n    else if (elevation < 0.78) state.terrainClass[i] = 3;\n    else state.terrainClass[i] = 4;\n    state.biomeClass[i] = state.terrainClass[i];\n  }\n\n  if (profile.template.life > 0) {\n    seedEarthlikeLife(state, mesh);\n  }\n\n  state.generationSignature = signatureState(state);\n  state.renderDirty = true;\n  state.trendDirty = true;\n}\n\nfunction seedEarthlikeLife(state, mesh) {\n  for (let i = 0; i < mesh.count; i += 1) {\n    const viable = state.habitability[i];\n    const life = viable > 0.42 ? clamp01((viable - 0.30) * 1.05) : 0;\n    state.primitiveLife[i] = life;\n    state.dormantLife[i] = viable > 0.30 && life <= 0 ? 0.10 : 0;\n    state.biomass[i] = clamp01(life * (0.55 + state.nutrientLevel[i] * 0.25));\n    state.producerMats[i] = clamp01(life * 0.65 + state.rainfall[i] * 0.10);\n    state.biodiversityIndex[i] = clamp01(life * 0.45 + state.habitatContinuity[i] * 0.25);\n    state.ecosystemResilience[i] = clamp01(0.20 + life * 0.45 + state.recoveryPotential[i] * 0.20);\n    state.ecosystemStress[i] = clamp01(1 - state.ecosystemResilience[i]);\n    state.civilisationSuitability[i] = clamp01(state.habitability[i] * 0.50 + state.producerMats[i] * 0.22 + state.waterAccess[i] * 0.18);\n    if (state.civilisationSuitability[i] > 0.62 && state.water[i] < 0.55 && Math.abs(mesh.latitude[i]) < 62) {\n      state.settlements[i] = clamp01((state.civilisationSuitability[i] - 0.58) * 1.4);\n      state.populationIndex[i] = clamp01(state.settlements[i] * 0.75);\n      state.socialComplexity[i] = clamp01(state.settlements[i] * 0.45);\n      state.stewardshipPressure[i] = clamp01(state.settlements[i] * 0.30);\n    }\n  }\n}\n\n\n/* ============================================================\n   Physical systems\n   Source: src/sim/physical.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepPhysical(state, mesh) {\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const latAbs = Math.abs(mesh.latitude[i]) / 90;\n    const solar = 0.72 - 0.42 * latAbs;\n    const oceanBuffer = state.water[i] * 0.14;\n    const greenhouse = state.greenhousePressure[i] * 0.22;\n    const iceAlbedo = state.ice[i] * 0.18;\n    const elevationCooling = Math.max(0, state.elevation[i] - 0.55) * 0.18;\n    const target = clamp01(solar + greenhouse - iceAlbedo - elevationCooling + oceanBuffer);\n    state.temperature[i] = lerp(state.temperature[i], target, 0.035);\n\n    const freezePressure = clamp01((0.36 - state.temperature[i]) * 2.1 + latAbs * 0.35 + state.water[i] * 0.25);\n    const meltPressure = clamp01((state.temperature[i] - 0.42) * 1.7 + state.rainfall[i] * 0.12);\n    state.ice[i] = clamp01(state.ice[i] + freezePressure * 0.012 - meltPressure * 0.018);\n    state.cloudCover[i] = clamp01(state.cloudCover[i] * 0.96 + state.humidity[i] * 0.03 + state.water[i] * 0.01);\n    state.habitability[i] = clamp01(state.habitability[i] * 0.88 + computeHabitability(state, i) * 0.12);\n  }\n}\n\nfunction computeHabitability(state, i) {\n  const tempFit = 1 - Math.abs(state.temperature[i] - 0.55) / 0.42;\n  const waterFit = clamp01(state.water[i] * 0.62 + state.rainfall[i] * 0.36 + state.runoff[i] * 0.12);\n  const stable = clamp01(1 - state.disturbancePressure[i] * 0.55 - state.ice[i] * 0.25);\n  return clamp01(tempFit * 0.38 + waterFit * 0.28 + state.nutrientLevel[i] * 0.20 + stable * 0.14);\n}\n\n\n/* ============================================================\n   Water\n   Source: src/sim/water.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepWater(state, mesh) {\n  // This module is deliberately local in Build 0.1.0, but the state and API are\n  // prepared for later drainage direction, flow accumulation, basin filling,\n  // lake overflow, erosion, sediment, ocean heat transport, and climate-water feedback loops.\n  state.scratchFlow.fill(0);\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const latAbs = Math.abs(mesh.latitude[i]) / 90;\n    const evaporativeSupply = state.water[i] * clamp01(state.temperature[i] * 0.85 + 0.12) * (1 - state.ice[i] * 0.65);\n    const orographicLift = Math.max(0, state.elevation[i] - 0.50) * 0.16;\n    const cloudFeed = state.cloudCover[i] * 0.22;\n    state.humidity[i] = clamp01(state.humidity[i] * 0.86 + evaporativeSupply * 0.10 + cloudFeed * 0.04 - latAbs * 0.025);\n    state.rainfall[i] = clamp01(state.humidity[i] * (0.42 + (1 - latAbs) * 0.36) + orographicLift - state.ice[i] * 0.18);\n    state.runoff[i] = clamp01(Math.max(0, state.rainfall[i] - 0.18) * (0.30 + state.elevation[i] * 0.50) + state.ice[i] * Math.max(0, state.temperature[i] - 0.40) * 0.10);\n  }\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const offset = i * 3;\n    let best = -1;\n    let bestDrop = 0;\n    for (let k = 0; k < 3; k += 1) {\n      const n = mesh.neighbours[offset + k];\n      if (n >= 0) {\n        const drop = state.elevation[i] - state.elevation[n];\n        if (drop > bestDrop) {\n          bestDrop = drop;\n          best = n;\n        }\n      }\n    }\n    const localFlow = clamp01(state.runoff[i] + state.water[i] * 0.18);\n    if (best >= 0) {\n      state.scratchFlow[best] += localFlow * 0.28;\n      state.waterFlow[i] = clamp01(localFlow + bestDrop * 0.25);\n    } else {\n      state.waterFlow[i] = localFlow;\n    }\n  }\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    state.waterFlow[i] = clamp01(state.waterFlow[i] + state.scratchFlow[i] * 0.18);\n    state.waterAccess[i] = clamp01(state.water[i] * 0.50 + state.rainfall[i] * 0.25 + state.runoff[i] * 0.20 + state.waterFlow[i] * 0.18);\n  }\n}\n\n\n/* ============================================================\n   Primitive life\n   Source: src/sim/life.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepLife(state, mesh) {\n  state.scratchLife.fill(0);\n  let spreadCount = 0;\n  let dormancyTransitions = 0;\n  let recoveryTransitions = 0;\n  let localExtinctions = 0;\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const viability = state.habitability[i];\n    const stress = clamp01(1 - viability + state.ice[i] * 0.35 + Math.abs(state.temperature[i] - 0.55) * 0.32 + (1 - state.nutrientLevel[i]) * 0.18);\n    const active = state.primitiveLife[i];\n    const dormant = state.dormantLife[i];\n\n    if (viability > 0.55) {\n      const growth = (viability - 0.45) * 0.035 * (1 - active);\n      state.primitiveLife[i] = clamp01(active + growth + dormant * 0.010);\n      if (dormant > 0.01) recoveryTransitions += 1;\n      state.dormantLife[i] = clamp01(dormant * 0.985 - growth * 0.2);\n    } else if (viability > 0.34) {\n      const dorm = active * 0.012;\n      state.primitiveLife[i] = clamp01(active * 0.992 - stress * 0.004);\n      state.dormantLife[i] = clamp01(dormant + dorm);\n      if (dorm > 0.001) dormancyTransitions += 1;\n    } else {\n      const loss = stress * 0.025;\n      if (active > 0.01 || dormant > 0.01) localExtinctions += stress > 0.82 ? 1 : 0;\n      state.primitiveLife[i] = clamp01(active - loss);\n      state.dormantLife[i] = clamp01(dormant - loss * 0.35);\n    }\n  }\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const source = state.primitiveLife[i];\n    if (source <= 0.28) continue;\n    const offset = i * 3;\n    for (let k = 0; k < 3; k += 1) {\n      const n = mesh.neighbours[offset + k];\n      if (n >= 0 && state.habitability[n] > 0.48 && state.ice[n] < 0.55) {\n        const spread = source * state.habitability[n] * 0.006;\n        state.scratchLife[n] += spread;\n        spreadCount += spread > 0.0005 ? 1 : 0;\n      }\n    }\n  }\n\n  for (let i = 0; i < state.cellCount; i += 1) {\n    state.primitiveLife[i] = clamp01(state.primitiveLife[i] + state.scratchLife[i]);\n    state.biomass[i] = clamp01(state.primitiveLife[i] * 0.60 + state.dormantLife[i] * 0.18 + state.producerMats[i] * 0.20);\n    state.producerMats[i] = clamp01(state.producerMats[i] * 0.97 + state.primitiveLife[i] * state.nutrientLevel[i] * 0.035);\n  }\n\n  return { spreadCount, dormancyTransitions, recoveryTransitions, localExtinctions };\n}\n\n\n/* ============================================================\n   Ecosystems\n   Source: src/sim/ecosystems.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepEcosystems(state) {\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const living = clamp01(state.primitiveLife[i] * 0.65 + state.producerMats[i] * 0.25 + state.dormantLife[i] * 0.10);\n    const continuity = clamp01(state.habitatContinuity[i] * 0.92 + state.habitability[i] * 0.08);\n    state.biodiversityIndex[i] = clamp01(state.biodiversityIndex[i] * 0.96 + living * continuity * 0.035);\n    state.ecosystemResilience[i] = clamp01(state.ecosystemResilience[i] * 0.94 + (living * 0.36 + continuity * 0.25 + state.recoveryPotential[i] * 0.20) * 0.06);\n    state.ecosystemStress[i] = clamp01((1 - state.ecosystemResilience[i]) * 0.55 + (1 - state.habitability[i]) * 0.35 + state.disturbancePressure[i] * 0.22);\n    state.recoveryPotential[i] = clamp01(state.recoveryPotential[i] * 0.98 + (state.nutrientLevel[i] * 0.40 + state.habitability[i] * 0.35 + state.stewardshipPressure[i] * 0.10) * 0.02);\n    state.restorationPriority[i] = clamp01(state.ecosystemStress[i] * 0.50 + (1 - state.biodiversityIndex[i]) * 0.20 + state.disturbancePressure[i] * 0.20);\n  }\n}\n\n\n/* ============================================================\n   Stewardship\n   Source: src/sim/stewardship.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepStewardship(state) {\n  for (let i = 0; i < state.cellCount; i += 1) {\n    const pressureDecay = state.stewardshipPressure[i] * 0.985;\n    const restorationEffect = pressureDecay * state.restorationPriority[i] * 0.018;\n    state.stewardshipPressure[i] = clamp01(pressureDecay);\n    state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - restorationEffect);\n    state.recoveryCapacity[i] = clamp01(state.recoveryCapacity[i] * 0.98 + (state.ecosystemResilience[i] + restorationEffect) * 0.02);\n  }\n}\n\n\n/* ============================================================\n   Civilisation diagnostics\n   Source: src/sim/civilisation.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction stepCivilisation(state) {\n  for (let i = 0; i < state.cellCount; i += 1) {\n    state.foodSupport[i] = clamp01(state.habitability[i] * 0.38 + state.producerMats[i] * 0.24 + state.waterAccess[i] * 0.22 + state.biodiversityIndex[i] * 0.10);\n    state.civilisationSuitability[i] = clamp01(state.foodSupport[i] * 0.42 + state.waterAccess[i] * 0.20 + state.ecosystemResilience[i] * 0.16 + (1 - state.ice[i]) * 0.10);\n    if (state.settlements[i] > 0) {\n      const support = state.civilisationSuitability[i] - state.civilisationStress[i] * 0.30;\n      state.settlements[i] = clamp01(state.settlements[i] + (support - 0.45) * 0.010);\n      state.populationIndex[i] = clamp01(state.populationIndex[i] * 0.993 + state.settlements[i] * support * 0.010);\n      state.socialComplexity[i] = clamp01(state.socialComplexity[i] * 0.995 + state.settlements[i] * 0.006);\n      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + state.settlements[i] * 0.003);\n    }\n    state.civilisationStress[i] = clamp01(1 - state.civilisationSuitability[i] + state.disturbancePressure[i] * 0.20);\n    state.collapseRisk[i] = clamp01(state.populationIndex[i] * state.civilisationStress[i]);\n  }\n}\n\n\n/* ============================================================\n   Tools\n   Source: src/sim/tools.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction applyTool(state, mesh, request = {}) {\n  const tool = request.tool;\n  const origin = request.cellId | 0;\n  const strength = Math.max(0.1, Math.min(2, Number(request.strength ?? 1)));\n  const radius = Math.max(0, Math.min(6, Number(request.radius ?? 1) | 0));\n  if (origin < 0 || origin >= state.cellCount) {\n    return { success: false, mutated: false, message: 'Invalid target cell.', affected: 0 };\n  }\n  const cells = expandRadius(mesh, origin, radius);\n  if (tool === 'inspect_world') {\n    state.selectedCell = origin;\n    state.lastAction = `Inspected cell ${origin}.`;\n    return { success: true, mutated: false, message: state.lastAction, affected: 1 };\n  }\n\n  const before = localMutationSignature(state, cells);\n  let affected = 0;\n  let message = '';\n\n  if (tool === 'comet_delivery') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      state.water[i] = clamp01(state.water[i] + 0.16 * strength * falloff);\n      state.humidity[i] = clamp01(state.humidity[i] + 0.10 * strength * falloff);\n      state.rainfall[i] = clamp01(state.rainfall[i] + 0.08 * strength * falloff);\n      if (state.temperature[i] < 0.34) state.ice[i] = clamp01(state.ice[i] + 0.04 * strength * falloff);\n      affected += 1;\n    }\n    message = `Comet delivery added water to ${affected} cells.`;\n  } else if (tool === 'volcanic_outgassing') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      state.greenhousePressure[i] = clamp01(state.greenhousePressure[i] + 0.08 * strength * falloff);\n      state.temperature[i] = clamp01(state.temperature[i] + 0.06 * strength * falloff);\n      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.05 * strength * falloff);\n      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] + 0.06 * strength * falloff);\n      affected += 1;\n    }\n    message = `Volcanic outgassing warmed and mineralised ${affected} cells.`;\n  } else if (tool === 'orbital_shade') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      state.temperature[i] = clamp01(state.temperature[i] - 0.08 * strength * falloff);\n      state.cloudCover[i] = clamp01(state.cloudCover[i] + 0.03 * strength * falloff);\n      if (state.water[i] > 0.12) state.ice[i] = clamp01(state.ice[i] + 0.04 * strength * falloff);\n      affected += 1;\n    }\n    message = `Orbital shade cooled ${affected} cells.`;\n  } else if (tool === 'mineral_seeding') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      state.nutrientLevel[i] = clamp01(state.nutrientLevel[i] + 0.18 * strength * falloff);\n      state.recoveryPotential[i] = clamp01(state.recoveryPotential[i] + 0.08 * strength * falloff);\n      affected += 1;\n    }\n    message = `Mineral seeding improved nutrient potential in ${affected} cells.`;\n  } else if (tool === 'seed_primitive_life') {\n    let blocked = 0;\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      if (state.habitability[i] > 0.46 && state.ice[i] < 0.65 && state.waterAccess[i] > 0.25 && state.nutrientLevel[i] > 0.24) {\n        state.primitiveLife[i] = clamp01(state.primitiveLife[i] + 0.22 * strength * falloff);\n        state.biomass[i] = clamp01(state.biomass[i] + 0.10 * strength * falloff);\n        affected += 1;\n      } else if (state.habitability[i] > 0.32 && state.ice[i] < 0.78) {\n        state.dormantLife[i] = clamp01(state.dormantLife[i] + 0.08 * strength * falloff);\n        affected += 1;\n      } else {\n        blocked += 1;\n      }\n    }\n    if (affected === 0) {\n      const reason = limitingFactor(state, origin);\n      return { success: false, mutated: false, message: `Seed Primitive Life failed: ${reason}.`, affected: 0 };\n    }\n    message = `Seeded primitive life in ${affected} cells; ${blocked} cells were too hostile.`;\n  } else if (tool === 'planetary_stabilisation') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      state.ecosystemStress[i] = clamp01(state.ecosystemStress[i] - 0.10 * strength * falloff);\n      state.disturbancePressure[i] = clamp01(state.disturbancePressure[i] - 0.10 * strength * falloff);\n      state.ecosystemResilience[i] = clamp01(state.ecosystemResilience[i] + 0.08 * strength * falloff);\n      state.stewardshipPressure[i] = clamp01(state.stewardshipPressure[i] + 0.05 * strength * falloff);\n      state.temperature[i] = clamp01(state.temperature[i] * 0.96 + 0.55 * 0.04);\n      affected += 1;\n    }\n    message = `Planetary stabilisation reduced stress across ${affected} cells.`;\n  } else if (tool === 'seed_early_settlers') {\n    for (const i of cells) {\n      const falloff = localFalloff(mesh, origin, i, radius);\n      const allowed = state.primitiveLife[i] > 0.35 && state.civilisationSuitability[i] > 0.58 && state.waterAccess[i] > 0.35 && state.foodSupport[i] > 0.35;\n      if (allowed) {\n        state.settlements[i] = clamp01(state.settlements[i] + 0.18 * strength * falloff);\n        state.populationIndex[i] = clamp01(state.populationIndex[i] + 0.10 * strength * falloff);\n        state.socialComplexity[i] = clamp01(state.socialComplexity[i] + 0.05 * strength * falloff);\n        affected += 1;\n      }\n    }\n    if (affected === 0) {\n      return { success: false, mutated: false, message: 'Seed Early Settlers failed: world is lifeless or locally unsuitable.', affected: 0 };\n    }\n    message = `Seeded early settlers in ${affected} suitable cells.`;\n  } else {\n    return { success: false, mutated: false, message: `Unsupported tool: ${tool}`, affected: 0 };\n  }\n\n  const after = localMutationSignature(state, cells);\n  const mutated = before !== after;\n  state.selectedCell = origin;\n  state.lastAction = message;\n  state.lastLimitingFactor = mutated ? 'tool applied' : 'no material change';\n  state.renderDirty = mutated;\n  state.trendDirty = mutated;\n  return { success: mutated, mutated, message, affected };\n}\n\nfunction localFalloff(mesh, origin, cell, radius) {\n  if (cell === origin || radius <= 0) return 1;\n  const dot = mesh.centerX[origin] * mesh.centerX[cell] + mesh.centerY[origin] * mesh.centerY[cell] + mesh.centerZ[origin] * mesh.centerZ[cell];\n  return clamp01(0.45 + 0.55 * dot);\n}\n\nfunction localMutationSignature(state, cells) {\n  let h = 2166136261 >>> 0;\n  for (const i of cells) {\n    h ^= Math.round(state.water[i] * 1000) + i;\n    h = Math.imul(h, 16777619) >>> 0;\n    h ^= Math.round(state.temperature[i] * 1000);\n    h = Math.imul(h, 16777619) >>> 0;\n    h ^= Math.round(state.primitiveLife[i] * 1000);\n    h = Math.imul(h, 16777619) >>> 0;\n    h ^= Math.round(state.settlements[i] * 1000);\n    h = Math.imul(h, 16777619) >>> 0;\n  }\n  return h >>> 0;\n}\n\nfunction limitingFactor(state, i) {\n  if (state.waterAccess[i] < 0.25) return 'too dry';\n  if (state.temperature[i] > 0.78) return 'too hot';\n  if (state.temperature[i] < 0.30) return 'too cold';\n  if (state.ice[i] > 0.65) return 'too icy';\n  if (state.nutrientLevel[i] < 0.24) return 'too nutrient-poor';\n  if (state.ecosystemStress[i] > 0.70) return 'too stressed';\n  return 'insufficient habitability';\n}\n\n\n/* ============================================================\n   Probes\n   Source: src/sim/probes.js\n   Compacted for Engine v2 0.1.4.\n   ============================================================ */\n\n\nfunction runProbe(probeId, ctx) {\n  const probe = PROBES.find((item) => item.id === probeId);\n  if (!probe) return { id: probeId, label: probeId, status: 'fail', detail: 'Unknown probe.' };\n  const snapshot = cloneState(ctx.state);\n  const startSig = signatureState(ctx.state);\n  try {\n    const result = executeProbe(probeId, ctx, startSig);\n    restoreState(ctx.state, snapshot);\n    const restoredSig = signatureState(ctx.state);\n    if (restoredSig !== startSig) {\n      return { id: probeId, label: probe.label, status: 'fail', detail: `Probe did not restore active state: ${restoredSig} vs ${startSig}` };\n    }\n    return { id: probeId, label: probe.label, ...result };\n  } catch (error) {\n    restoreState(ctx.state, snapshot);\n    return { id: probeId, label: probe.label, status: 'fail', detail: error instanceof Error ? error.message : String(error) };\n  }\n}\n\nfunction runAllProbes(ctx) {\n  const results = PROBES.map((probe) => runProbe(probe.id, ctx));\n  const summary = {\n    total: results.length,\n    pass: results.filter((item) => item.status === 'pass').length,\n    warn: results.filter((item) => item.status === 'warn').length,\n    fail: results.filter((item) => item.status === 'fail').length,\n    results\n  };\n  return summary;\n}\n\nfunction executeProbe(probeId, ctx, startSig) {\n  if (probeId === 'architecture_sanity') {\n    const shapeFailures = validateArrayShape(ctx.state);\n    const ok = ctx.mesh.count > 0 && ctx.mesh.neighbourLinkCount > 0 && shapeFailures.length === 0;\n    return { status: ok ? 'pass' : 'fail', detail: ok ? 'Worker owns mesh and array state.' : shapeFailures.join('; ') };\n  }\n\n  if (probeId === 'deterministic_generation') {\n    generateWorld(ctx.state, ctx.mesh, { seed: 'determinism-probe', template: 'procedural_lifeless', archetype: 'balanced' });\n    const first = signatureState(ctx.state);\n    generateWorld(ctx.state, ctx.mesh, { seed: 'determinism-probe', template: 'procedural_lifeless', archetype: 'balanced' });\n    const second = signatureState(ctx.state);\n    return { status: first === second ? 'pass' : 'fail', detail: `First ${first}; second ${second}.` };\n  }\n\n  if (probeId === 'snapshot_restore') {\n    const internal = cloneState(ctx.state);\n    ctx.stepOnce();\n    restoreState(ctx.state, internal);\n    const restored = signatureState(ctx.state);\n    return { status: restored === startSig ? 'pass' : 'fail', detail: `Restored signature ${restored}.` };\n  }\n\n  if (probeId === 'procedural_lifeless') {\n    generateWorld(ctx.state, ctx.mesh, { seed: 'lifeless-probe', template: 'procedural_lifeless', archetype: 'dry' });\n    const summary = computeSummary(ctx.state, ctx.mesh);\n    const ok = summary.primitiveLifeMean < 0.0001 && summary.settlementMean < 0.0001;\n    return { status: ok ? 'pass' : 'fail', detail: `Primitive life mean ${summary.primitiveLifeMean.toFixed(4)}, settlement mean ${summary.settlementMean.toFixed(4)}.` };\n  }\n\n  if (probeId === 'earthlike_template') {\n    generateWorld(ctx.state, ctx.mesh, { seed: 'earthlike-probe', template: 'earthlike', archetype: 'balanced' });\n    const summary = computeSummary(ctx.state, ctx.mesh);\n    const ok = summary.primitiveLifeMean > 0.05 && summary.biodiversityMean > 0.02;\n    return { status: ok ? 'pass' : 'warn', detail: `Life ${summary.primitiveLifeMean.toFixed(3)}, biodiversity ${summary.biodiversityMean.toFixed(3)}.` };\n  }\n\n  if (probeId === 'ecosystem_growth') {\n    generateWorld(ctx.state, ctx.mesh, { seed: 'growth-probe', template: 'earthlike', archetype: 'balanced' });\n    const before = computeSummary(ctx.state, ctx.mesh).primitiveLifeMean;\n    for (let i = 0; i < 8; i += 1) ctx.stepOnce();\n    const afterSummary = computeSummary(ctx.state, ctx.mesh);\n    const ok = Number.isFinite(afterSummary.primitiveLifeMean) && afterSummary.primitiveLifeMean >= before * 0.75;\n    return { status: ok ? 'pass' : 'warn', detail: `Primitive life before ${before.toFixed(3)}, after ${afterSummary.primitiveLifeMean.toFixed(3)}.` };\n  }\n\n  if (probeId === 'civilisation_gate') {\n    generateWorld(ctx.state, ctx.mesh, { seed: 'civ-gate-probe', template: 'procedural_lifeless', archetype: 'icy' });\n    const result = applyTool(ctx.state, ctx.mesh, { tool: 'seed_early_settlers', cellId: 0, radius: 2, strength: 1 });\n    return { status: result.success ? 'fail' : 'pass', detail: result.message };\n  }\n\n  if (probeId === 'no_dom_in_worker') {\n    const ok = ctx.uiSurface === undefined && ctx.state && ctx.mesh;\n    return { status: ok ? 'pass' : 'fail', detail: ok ? 'Probe found simulation-only context.' : 'Unexpected UI surface detected.' };\n  }\n\n  if (probeId === 'render_data_finite') {\n    const render = buildRenderData(ctx.state, ctx.mesh);\n    const failures = [];\n    for (const [key, value] of Object.entries(render)) {\n      if (value && value.buffer instanceof ArrayBuffer) {\n        for (let i = 0; i < value.length; i += Math.max(1, Math.floor(value.length / 64))) {\n          if (!Number.isFinite(value[i])) {\n            failures.push(`${key}[${i}]`);\n            break;\n          }\n        }\n      }\n    }\n    const bounds = validateFiniteBounded(ctx.state);\n    const ok = failures.length === 0 && bounds.length === 0;\n    return { status: ok ? 'pass' : 'fail', detail: ok ? `Render payload ${render.bytes} bytes finite.` : [...failures, ...bounds].join('; ') };\n  }\n\n  return { status: 'fail', detail: 'Probe implementation missing.' };\n}\n\n\n/* ============================================================\n   Worker command dispatcher\n   Source: src/workers/simulation-worker.js\n   ============================================================ */\n\n\nlet mesh = null;\nlet state = null;\nlet lastGenerateOptions = {\n  seed: DEFAULT_CONFIG.initialSeed,\n  template: DEFAULT_CONFIG.defaultTemplate,\n  archetype: DEFAULT_CONFIG.defaultArchetype\n};\nlet pendingTemplate = DEFAULT_CONFIG.defaultTemplate;\nlet pendingArchetype = DEFAULT_CONFIG.defaultArchetype;\n\nfunction post(type, payload = {}, transfer = []) {\n  globalThis.postMessage({ type, payload }, transfer);\n}\n\nfunction ensureState() {\n  if (!mesh) mesh = createIcosphereMesh({ subdivisions: DEFAULT_CONFIG.subdivisions });\n  if (!state) {\n    state = createSimulationState(mesh, lastGenerateOptions);\n    generateWithOptions(lastGenerateOptions);\n  }\n}\n\nfunction generateWithOptions(options) {\n  ensureMeshOnly();\n  const start = nowMs();\n  if (!state) state = createSimulationState(mesh, options);\n  lastGenerateOptions = {\n    seed: options.seed || lastGenerateOptions.seed || DEFAULT_CONFIG.initialSeed,\n    template: options.template || pendingTemplate || lastGenerateOptions.template || DEFAULT_CONFIG.defaultTemplate,\n    archetype: options.archetype || pendingArchetype || lastGenerateOptions.archetype || DEFAULT_CONFIG.defaultArchetype,\n    waterLevel: options.waterLevel,\n    temperature: options.temperature,\n    greenhouse: options.greenhouse,\n    ice: options.ice,\n    nutrients: options.nutrients,\n    roughness: options.roughness\n  };\n  pendingTemplate = lastGenerateOptions.template;\n  pendingArchetype = lastGenerateOptions.archetype;\n  generateWorld(state, mesh, lastGenerateOptions);\n  state.diagnostics.lastGenerationMs = nowMs() - start;\n  state.diagnostics.workerStatus = 'READY';\n}\n\nfunction ensureMeshOnly() {\n  if (!mesh) mesh = createIcosphereMesh({ subdivisions: DEFAULT_CONFIG.subdivisions });\n}\n\nfunction stepOnce() {\n  ensureState();\n  const start = nowMs();\n  stepPhysical(state, mesh);\n  stepWater(state, mesh);\n  const lifeStats = stepLife(state, mesh);\n  stepEcosystems(state, mesh);\n  stepStewardship(state);\n  stepCivilisation(state);\n  state.stepCount += 1;\n  state.year += DEFAULT_CONFIG.yearPerStep;\n  state.renderDirty = true;\n  state.trendDirty = true;\n  state.lastAction = summariseStepChange(lifeStats);\n  state.diagnostics.lastTickMs = nowMs() - start;\n}\n\nfunction summariseStepChange(lifeStats) {\n  if (lifeStats.localExtinctions > 0) return `Time advanced. Primitive life suffered local extinction pressure in ${lifeStats.localExtinctions} cells.`;\n  if (lifeStats.recoveryTransitions > 0) return `Time advanced. Dormant primitive life recovered in ${lifeStats.recoveryTransitions} cells.`;\n  if (lifeStats.spreadCount > 0) return `Time advanced. Primitive life spread through ${lifeStats.spreadCount} neighbour links.`;\n  if (lifeStats.dormancyTransitions > 0) return `Time advanced. Some primitive life entered dormancy.`;\n  return 'Time advanced. Planet state updated inside the simulation worker.';\n}\n\nfunction sendSummary(includeTrend = true) {\n  const summary = computeSummary(state, mesh);\n  post(EVENTS.STATE_SUMMARY, summary);\n  if (includeTrend) {\n    post(EVENTS.TREND_SAMPLE, trendSampleFromSummary(summary));\n  }\n}\n\nfunction sendSelectedCell() {\n  post(EVENTS.SELECTED_CELL_SUMMARY, computeSelectedCellSummary(state, mesh));\n}\n\nfunction sendRenderData() {\n  const start = nowMs();\n  const renderData = buildRenderData(state, mesh);\n  state.diagnostics.lastRenderBuildMs = nowMs() - start;\n  const transfer = collectTransferables(renderData);\n  post(EVENTS.RENDER_DATA, renderData, transfer);\n}\n\nfunction sendDiagnostics() {\n  post(EVENTS.DIAGNOSTIC_SUMMARY, {\n    workerStatus: state ? state.diagnostics.workerStatus : 'not initialised',\n    lastWorkerTickMs: state ? state.diagnostics.lastTickMs : 0,\n    lastGenerationMs: state ? state.diagnostics.lastGenerationMs : 0,\n    lastToolApplicationMs: state ? state.diagnostics.lastToolMs : 0,\n    lastProbeMs: state ? state.diagnostics.lastProbeMs : 0,\n    lastRenderDataBuildMs: state ? state.diagnostics.lastRenderBuildMs : 0,\n    renderDirty: state ? state.renderDirty : false,\n    trendDirty: state ? state.trendDirty : false,\n    cellCount: mesh ? mesh.count : 0,\n    neighbourLinks: mesh ? mesh.neighbourLinkCount : 0,\n    bytesTransferredLastRenderUpdate: state ? state.diagnostics.lastRenderBytes : 0,\n    workerMessageCount: state ? state.diagnostics.messageCount : 0,\n    lastWorkerError: state ? state.diagnostics.lastError : ''\n  });\n}\n\nfunction fullUpdate(options = {}) {\n  const includeRender = options.render !== false;\n  sendSummary(options.trend !== false);\n  sendSelectedCell();\n  if (includeRender) sendRenderData();\n  sendDiagnostics();\n}\n\nfunction handleCommand(type, payload = {}) {\n  if (type === COMMANDS.INIT) {\n    ensureState();\n    post(EVENTS.READY, { status: 'READY', meshType: mesh.type, cellCount: mesh.count });\n    fullUpdate({ render: true });\n    return;\n  }\n\n  ensureState();\n\n  if (type === COMMANDS.GENERATE) {\n    generateWithOptions(payload || {});\n    fullUpdate({ render: true });\n  } else if (type === COMMANDS.RESET) {\n    generateWithOptions(lastGenerateOptions);\n    fullUpdate({ render: true });\n  } else if (type === COMMANDS.STEP) {\n    stepOnce();\n    fullUpdate({ render: true });\n  } else if (type === COMMANDS.ADVANCE_YEARS) {\n    const requested = Math.max(1, Math.min(DEFAULT_CONFIG.maxAdvanceSteps, Number(payload.years ?? 1) | 0));\n    for (let i = 0; i < requested; i += 1) stepOnce();\n    state.lastAction = `Advanced ${requested} years inside the simulation worker.`;\n    fullUpdate({ render: true });\n  } else if (type === COMMANDS.SET_SPEED) {\n    state.speed = Math.max(0, Math.min(10, Number(payload.speed ?? 1)));\n    sendSummary(false);\n    sendDiagnostics();\n  } else if (type === COMMANDS.APPLY_TOOL) {\n    const start = nowMs();\n    const result = applyTool(state, mesh, payload || {});\n    state.diagnostics.lastToolMs = nowMs() - start;\n    state.lastAction = result.message;\n    fullUpdate({ render: result.mutated || result.success });\n  } else if (type === COMMANDS.SELECT_CELL) {\n    const id = Number(payload.cellId);\n    state.selectedCell = Number.isFinite(id) ? Math.max(-1, Math.min(state.cellCount - 1, id | 0)) : -1;\n    sendSelectedCell();\n    sendSummary(false);\n    sendDiagnostics();\n  } else if (type === COMMANDS.SET_TEMPLATE) {\n    pendingTemplate = payload.template || pendingTemplate;\n    sendDiagnostics();\n  } else if (type === COMMANDS.SET_ARCHETYPE) {\n    pendingArchetype = payload.archetype || pendingArchetype;\n    sendDiagnostics();\n  } else if (type === COMMANDS.RUN_PROBE) {\n    const start = nowMs();\n    const result = runProbe(payload.probeId, { state, mesh, stepOnce });\n    state.diagnostics.lastProbeMs = nowMs() - start;\n    post(EVENTS.PROBE_RESULT, result);\n    fullUpdate({ render: false, trend: false });\n  } else if (type === COMMANDS.RUN_ALL_PROBES) {\n    const start = nowMs();\n    const summary = runAllProbes({ state, mesh, stepOnce });\n    state.diagnostics.lastProbeMs = nowMs() - start;\n    post(EVENTS.PROBE_SUMMARY, summary);\n    fullUpdate({ render: false, trend: false });\n  } else if (type === COMMANDS.GET_STATE_SUMMARY) {\n    sendSummary(false);\n    sendSelectedCell();\n    sendDiagnostics();\n  } else if (type === COMMANDS.GET_RENDER_DATA) {\n    sendRenderData();\n    sendDiagnostics();\n  } else {\n    throw new Error(`Unsupported command: ${type}`);\n  }\n}\n\nglobalThis.addEventListener('message', (event) => {\n  const message = event.data || {};\n  try {\n    if (state) state.diagnostics.messageCount += 1;\n    handleCommand(message.type, message.payload || {});\n  } catch (error) {\n    if (state) state.diagnostics.lastError = error instanceof Error ? error.message : String(error);\n    post(EVENTS.ERROR, { message: state ? state.diagnostics.lastError : String(error), command: message.type || 'unknown' });\n    if (state) sendDiagnostics();\n  }\n});";

/* ============================================================
   Bootstrapping and worker lifecycle
   Source: src/main.js
   ============================================================ */


const ui = getUi();
initialiseUi(ui);
const renderer = createRenderer(ui.canvas);
const mainMetrics = { lastRenderMs: 0, lastDomMs: 0 };
let worker = null;
let workerMode = 'external';
let workerStartupTimer = null;
let workerReady = false;
let running = false;
let runTimer = null;
let selectedCell = -1;
let hoverCell = -1;
let lastDiagnostics = null;
let lastSummary = null;

function createWorker() {
  startWorker('external');
}

function startWorker(mode) {
  try {
    if (worker) {
      try { worker.terminate(); } catch (_) {}
    }
    worker = null;
    workerMode = mode;
    workerReady = false;
    clearWorkerStartupTimer();

    if (mode === 'embedded') {
      const blob = new Blob([EMBEDDED_WORKER_SOURCE], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.__blobUrl = url;
      setStatus(ui, 'Worker fallback: embedded Blob Worker starting.');
      addEvent(ui, 'External Worker did not report READY. Starting embedded fallback Worker.');
    } else {
      worker = new Worker('./simulation-worker.js?v=0.1.4');
      setStatus(ui, 'Worker: external simulation-worker.js starting.');
    }

    worker.addEventListener('message', onWorkerMessage);
    worker.addEventListener('error', (event) => {
      const message = event.message || 'Worker script failed to load or execute.';
      setStatus(ui, `Worker error: ${message}`);
      addEvent(ui, `Worker failed in ${workerMode} mode: ${message}`);
      if (workerMode !== 'embedded') startWorker('embedded');
    });
    worker.addEventListener('messageerror', () => {
      setStatus(ui, 'Worker message error: payload could not be cloned.');
      addEvent(ui, `Worker message error in ${workerMode} mode.`);
    });

    command(COMMANDS.INIT, collectGenerationOptions(ui), false);
    workerStartupTimer = setTimeout(() => {
      if (!workerReady) {
        setStatus(ui, 'Worker startup timeout. Trying embedded fallback.');
        addEvent(ui, 'Worker startup timeout. Check that simulation-worker.js is in the same folder as index.html and app.js.');
        if (workerMode !== 'embedded') startWorker('embedded');
      }
    }, 2500);
  } catch (error) {
    setStatus(ui, `Worker creation failed: ${error.message}`);
    addEvent(ui, `Worker creation failed in ${mode} mode: ${error.message}`);
    if (mode !== 'embedded') startWorker('embedded');
  }
}

function clearWorkerStartupTimer() {
  if (workerStartupTimer) {
    clearTimeout(workerStartupTimer);
    workerStartupTimer = null;
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
    workerReady = true;
    clearWorkerStartupTimer();
    setStatus(ui, `Worker READY (${workerMode}) | ${payload.meshType} | ${payload.cellCount} cells`);
    addEvent(ui, `Worker reported READY using ${workerMode} mode.`);
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
  const nextHoverCell = clientX === null || clientY === null ? -1 : renderer.pick(clientX, clientY);
  if (nextHoverCell === hoverCell) return;
  hoverCell = nextHoverCell;
  redraw();
}

function rotate(delta) {
  renderer.rotate(delta);
}

function resetView() {
  renderer.resetView();
}

bindControls(ui, { command, toggleRun, applyToolToSelected, clickCanvas, hover, rotate, resetView, redraw });
globalThis.addEventListener('resize', () => { renderer.updateViewport(true); redraw(); });
createWorker();

addEvent(ui, 'Engine v2 compact main thread initialised. Deploy the three files together to GitHub Pages or another static host.');
