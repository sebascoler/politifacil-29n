'use strict';

// Coordenadas proyectadas en viewBox="0 0 1200 680" (América a la izquierda/centro, Atlántico en medio, España a la derecha)
const REGIONS = [
  {
    id: 'us',
    name: 'Estados Unidos',
    group: 'us',
    active: false,
    points: [
      [78, 74], [148, 70], [238, 70], [320, 74], [362, 92], [392, 88],
      [428, 96], [462, 82], [492, 72], [506, 92], [488, 118], [464, 140],
      [446, 168], [434, 198], [420, 200], [412, 174], [382, 174], [348, 186],
      [320, 212], [302, 202], [282, 186], [242, 180], [202, 174], [156, 166],
      [124, 152], [96, 134], [80, 108],
    ],
  },
  {
    id: 'mexico',
    name: 'México y Centroamérica',
    group: 'latam',
    active: false,
    points: [
      [152, 166], [204, 174], [244, 180], [278, 188], [274, 210], [286, 226],
      [318, 222], [332, 232], [318, 246], [326, 256], [356, 266], [386, 282],
      [414, 294], [434, 304], [426, 312], [396, 302], [366, 288], [342, 276],
      [304, 266], [268, 250], [232, 232], [204, 214], [184, 194], [192, 224],
      [176, 226], [160, 194],
    ],
  },
  {
    id: 'cuba',
    name: 'Caribe',
    group: 'latam',
    active: false,
    points: [
      [348, 212], [388, 212], [418, 222], [412, 232], [374, 226], [344, 222],
    ],
  },
  {
    id: 'hispaniola',
    name: 'República Dominicana y Haití',
    group: 'latam',
    active: false,
    points: [
      [428, 226], [462, 224], [468, 236], [434, 238],
    ],
  },
  {
    id: 'andes',
    name: 'Colombia, Venezuela, Ecuador y Perú',
    group: 'latam',
    active: false,
    points: [
      [432, 302], [464, 286], [516, 286], [558, 300], [566, 326], [534, 354],
      [510, 384], [496, 412], [472, 428], [442, 416], [414, 388], [398, 356],
      [410, 326],
    ],
  },
  {
    id: 'brazil',
    name: 'Brasil',
    group: 'latam',
    active: false,
    points: [
      [558, 302], [608, 310], [656, 328], [712, 344], [748, 368], [742, 404],
      [718, 444], [690, 478], [654, 502], [628, 526], [606, 514], [592, 476],
      [574, 448], [546, 426], [514, 410], [500, 382], [532, 354],
    ],
  },
  {
    id: 'chile',
    name: 'Chile y Bolivia Sur',
    group: 'latam',
    active: false,
    points: [
      [472, 428], [508, 422], [518, 456], [510, 504], [498, 560], [492, 616],
      [506, 642], [486, 644], [474, 608], [476, 548], [478, 488],
    ],
  },
  {
    id: 'argentina',
    name: 'Argentina',
    group: 'ar',
    active: true,
    points: [
      [512, 424], [556, 434], [594, 456], [616, 472], [604, 504], [616, 528],
      [598, 550], [572, 566], [558, 594], [544, 624], [536, 646], [510, 644],
      [500, 610], [504, 558], [514, 504], [518, 458],
    ],
  },
  {
    id: 'europe-context',
    name: 'Europa Occidental (contexto)',
    group: 'context',
    active: false,
    points: [
      [942, 38], [1032, 34], [1114, 48], [1152, 92], [1124, 128], [1072, 134],
      [998, 126], [964, 108], [932, 74],
    ],
  },
  {
    id: 'spain',
    name: 'España y Península Ibérica',
    group: 'es',
    active: true,
    points: [
      [898, 146], [936, 132], [998, 128], [1068, 136], [1106, 150], [1096, 176],
      [1062, 206], [1052, 238], [1024, 266], [978, 278], [946, 268], [934, 246],
      [912, 244], [906, 210], [894, 176],
    ],
  },
  {
    id: 'balearic',
    name: 'Islas Baleares',
    group: 'es',
    active: true,
    points: [
      [1086, 204], [1110, 200], [1114, 214], [1090, 216],
    ],
  },
  {
    id: 'canaries',
    name: 'Islas Canarias',
    group: 'es',
    active: true,
    points: [
      [826, 294], [862, 290], [866, 304], [830, 308],
    ],
  },
];

const BEACONS = [
  { id: 'es', label: 'España · Madrid', short: 'ES 29-N', x: 996, y: 196, active: true, color: '#f59e0b' },
  { id: 'ar', label: 'Argentina · Buenos Aires', short: 'AR 2027', x: 594, y: 526, active: true, color: '#38bdf8' },
  { id: 'us', label: 'Estados Unidos · Washington', short: 'EE. UU.', x: 438, y: 138, active: false, color: '#94a3b8' },
  { id: 'mx', label: 'México · CDMX', short: 'MX 2027', x: 280, y: 242, active: false, color: '#94a3b8' },
  { id: 'co', label: 'Colombia · Bogotá', short: 'CO 2027', x: 468, y: 318, active: false, color: '#94a3b8' },
  { id: 'br', label: 'Brasil · Brasilia', short: 'BR 2028', x: 668, y: 422, active: false, color: '#94a3b8' },
];

function pointsToPath(points) {
  if (!points || points.length === 0) return '';
  return (
    points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`)
      .join(' ') + ' Z'
  );
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function hitRegion(px, py) {
  for (const reg of REGIONS) {
    if (reg.group === 'context') continue;
    if (pointInPolygon(px, py, reg.points)) return reg;
  }
  return null;
}

function buildJitteredGridShards(cols, rows, x0, y0, x1, y1, jitter = 18) {
  const dx = (x1 - x0) / cols;
  const dy = (y1 - y0) / rows;
  const vertices = [];

  for (let r = 0; r <= rows; r += 1) {
    const row = [];
    for (let c = 0; c <= cols; c += 1) {
      const isBorder = r === 0 || r === rows || c === 0 || c === cols;
      const seed = Math.sin((r * 73 + c * 137) * 1.13);
      const seed2 = Math.cos((r * 41 + c * 97) * 0.91);
      const jx = isBorder ? 0 : seed * jitter;
      const jy = isBorder ? 0 : seed2 * jitter;
      row.push([
        Number((x0 + c * dx + jx).toFixed(1)),
        Number((y0 + r * dy + jy).toFixed(1)),
      ]);
    }
    vertices.push(row);
  }

  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const p00 = vertices[r][c];
      const p10 = vertices[r][c + 1];
      const p11 = vertices[r + 1][c + 1];
      const p01 = vertices[r + 1][c];
      const cx = (p00[0] + p10[0] + p11[0] + p01[0]) / 4;
      const cy = (p00[1] + p10[1] + p11[1] + p01[1]) / 4;
      cells.push({ r, c, poly: [p00, p10, p11, p01], cx, cy });
    }
  }
  return cells;
}

function cellTouchesLand(cell) {
  const samples = [
    [cell.cx, cell.cy],
    ...cell.poly,
    [(cell.poly[0][0] + cell.cx) / 2, (cell.poly[0][1] + cell.cy) / 2],
    [(cell.poly[1][0] + cell.cx) / 2, (cell.poly[1][1] + cell.cy) / 2],
    [(cell.poly[2][0] + cell.cx) / 2, (cell.poly[2][1] + cell.cy) / 2],
    [(cell.poly[3][0] + cell.cx) / 2, (cell.poly[3][1] + cell.cy) / 2],
  ];
  for (const [sx, sy] of samples) {
    if (hitRegion(sx, sy)) return true;
  }
  return false;
}

function renderAllLandmassPaths({
  fillDefault = '#1e293b',
  fillSpain = '#f59e0b',
  fillArgentina = '#38bdf8',
  fillContext = 'none',
  stroke = 'rgba(148,163,184,0.35)',
  strokeWidth = 1.2,
  contextStroke = 'rgba(148,163,184,0.14)',
} = {}) {
  return REGIONS.map((reg) => {
    const d = pointsToPath(reg.points);
    if (reg.group === 'context') {
      if (fillContext === 'none' && !contextStroke) return '';
      return `<path d="${d}" fill="${fillContext}" stroke="${contextStroke}" stroke-width="1" stroke-dasharray="4 4"/>`;
    }
    let fill = fillDefault;
    if (reg.group === 'es') fill = fillSpain;
    else if (reg.group === 'ar') fill = fillArgentina;
    return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
  }).join('\n    ');
}

/* 1. V1: Tectónica Dark — fragmentos poligonales fracturados desprendiéndose */
function buildShatteredShardsMapSvg() {
  const americasCells = buildJitteredGridShards(7, 6, 40, 45, 780, 660, 22).filter(cellTouchesLand);
  const iberiaCells = buildJitteredGridShards(3, 3, 810, 105, 1140, 325, 14).filter(cellTouchesLand);
  const allCells = [...americasCells, ...iberiaCells];

  const defs = allCells
    .map(
      (cell, idx) =>
        `<clipPath id="v1-shard-${idx}"><polygon points="${cell.poly.map((p) => p.join(',')).join(' ')}"/></clipPath>`
    )
    .join('\n    ');

  const seamLines = allCells
    .map((cell) => {
      const pts = cell.poly.map((p) => p.join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(56, 189, 248, 0.12)" stroke-width="0.9"/>`;
    })
    .join('\n    ');

  const landPaths = renderAllLandmassPaths({
    fillDefault: 'rgba(30, 41, 59, 0.92)',
    fillSpain: 'rgba(245, 158, 11, 0.34)',
    fillArgentina: 'rgba(56, 189, 248, 0.32)',
    stroke: 'rgba(148, 163, 184, 0.45)',
    strokeWidth: 1.4,
    contextStroke: 'rgba(148, 163, 184, 0.16)',
  });

  const shardGroups = allCells
    .map((cell, idx) => {
      const isIberia = cell.cx > 800;
      const anchorX = isIberia ? 996 : 460;
      const anchorY = isIberia ? 200 : 350;
      const vx = cell.cx - anchorX;
      const vy = cell.cy - anchorY;
      const dist = Math.hypot(vx, vy) || 1;
      const normDist = Math.min(1, dist / (isIberia ? 170 : 360));
      const push = 3 + normDist * 26;
      const dx = ((vx / dist) * push).toFixed(1);
      const dy = ((vy / dist) * push).toFixed(1);
      const rot = (Math.sin(idx * 2.17) * (1.5 + normDist * 7.5)).toFixed(2);
      const delay = ((idx % 9) * 0.45).toFixed(2);
      const dur = (7 + (idx % 5) * 1.4).toFixed(1);

      return `<g class="shard-piece" clip-path="url(#v1-shard-${idx})" style="--tx:${dx}px; --ty:${dy}px; --rot:${rot}deg; --delay:${delay}s; --dur:${dur}s; transform-origin:${cell.cx.toFixed(1)}px ${cell.cy.toFixed(1)}px;">
      ${landPaths}
      <polygon points="${cell.poly.map((p) => p.join(',')).join(' ')}" fill="none" stroke="rgba(148, 163, 184, 0.25)" stroke-width="1"/>
    </g>`;
    })
    .join('\n    ');

  const arcLink = `
    <path d="M 594 526 Q 765 295 996 196" fill="none" stroke="url(#v1-arc-grad)" stroke-width="2" stroke-dasharray="6 6" opacity="0.65"/>
    <path d="M 438 138 Q 715 95 996 196" fill="none" stroke="rgba(148,163,184,0.35)" stroke-width="1.3" stroke-dasharray="4 6"/>
  `;

  const beaconSvg = BEACONS.map((b) => {
    if (b.active) {
      return `
      <g class="map-beacon is-active">
        <circle cx="${b.x}" cy="${b.y}" r="18" fill="${b.color}" opacity="0.18"/>
        <circle cx="${b.x}" cy="${b.y}" r="9" fill="${b.color}" opacity="0.35"/>
        <circle cx="${b.x}" cy="${b.y}" r="4.5" fill="${b.color}" stroke="#060913" stroke-width="1.5"/>
        <text x="${b.x}" y="${b.y - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#f8fafc" letter-spacing="0.06em">${b.short}</text>
      </g>`;
    }
    return `
      <g class="map-beacon">
        <circle cx="${b.x}" cy="${b.y}" r="3.2" fill="#64748b"/>
      </g>`;
  }).join('\n    ');

  return `<svg class="hero-map-svg" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="v1-arc-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      ${defs}
    </defs>
    <g opacity="0.92">
      ${seamLines}
      ${shardGroups}
      ${arcLink}
      ${beaconSvg}
    </g>
  </svg>`;
}

/* 2. V2: Payload ligero de polígonos y balizas para el motor <canvas> 60fps */
function buildCanvasParticleMapPayload() {
  return {
    width: 1200,
    height: 680,
    regions: REGIONS.filter((r) => r.group !== 'context').map((r) => ({
      id: r.id,
      group: r.group,
      active: r.active,
      points: r.points,
    })),
    beacons: BEACONS,
  };
}

/* 3. V3: Editorial Luz / Papel Rasgado — franjas horizontales y diagonales desplazadas */
function buildEditorialSlicedMapSvg() {
  const sliceCount = 17;
  const yStart = 30;
  const yEnd = 655;
  const step = (yEnd - yStart) / sliceCount;

  const defs = [];
  const sliceGroups = [];

  const landLight = renderAllLandmassPaths({
    fillDefault: '#e2ddd1',
    fillSpain: 'rgba(220, 38, 38, 0.22)',
    fillArgentina: 'rgba(29, 78, 216, 0.22)',
    stroke: '#1e293b',
    strokeWidth: 1.5,
    contextStroke: 'rgba(15, 23, 42, 0.18)',
  });

  for (let i = 0; i < sliceCount; i += 1) {
    const ya = (yStart + i * step).toFixed(1);
    const yb = (yStart + (i + 1) * step).toFixed(1);
    const tilt = ((i % 2 === 0 ? 1 : -1) * 7).toFixed(1);
    const yaRight = (Number(ya) + Number(tilt)).toFixed(1);
    const ybRight = (Number(yb) + Number(tilt)).toFixed(1);
    const polyPts = `0,${ya} 1200,${yaRight} 1200,${ybRight} 0,${yb}`;

    defs.push(`<clipPath id="v3-slice-${i}"><polygon points="${polyPts}"/></clipPath>`);

    const offsetPattern = [-22, 16, -8, 26, -18, 12, -26, 20, -10];
    const shiftX = offsetPattern[i % offsetPattern.length];
    const shiftY = (i % 3 === 0 ? -2 : i % 3 === 1 ? 2 : 0);

    sliceGroups.push(`
    <g clip-path="url(#v3-slice-${i})" transform="translate(${shiftX} ${shiftY})">
      ${landLight}
      <line x1="0" y1="${ya}" x2="1200" y2="${yaRight}" stroke="rgba(16, 18, 22, 0.16)" stroke-width="0.9"/>
    </g>`);
  }

  const beacons = BEACONS.filter((b) => b.active)
    .map(
      (b) => `
    <g>
      <circle cx="${b.x}" cy="${b.y}" r="14" fill="none" stroke="${b.id === 'es' ? '#dc2626' : '#1d4ed8'}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="${b.x}" cy="${b.y}" r="4.5" fill="${b.id === 'es' ? '#dc2626' : '#1d4ed8'}"/>
      <text x="${b.x + 10}" y="${b.y + 4}" font-size="11" font-weight="700" fill="#101216">${b.short}</text>
    </g>`
    )
    .join('\n');

  return `<svg class="hero-map-svg" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      ${defs.join('\n      ')}
    </defs>
    <g opacity="0.82">
      ${sliceGroups.join('\n')}
      ${beacons}
    </g>
  </svg>`;
}

/* 4. V4: Fractura 3D Prismática — capas inclinadas y espectro del arco político */
function buildIsometricGlassMapSvg() {
  const spectrumPalette = ['#7c3aed', '#e11d48', '#dc2626', '#0284c7', '#0d9488', '#f59e0b'];
  const americasCells = buildJitteredGridShards(6, 5, 45, 50, 770, 655, 24).filter(cellTouchesLand);
  const iberiaCells = buildJitteredGridShards(3, 3, 815, 110, 1135, 320, 14).filter(cellTouchesLand);
  const allCells = [...americasCells, ...iberiaCells];

  const baseWireframe = renderAllLandmassPaths({
    fillDefault: 'rgba(15, 23, 42, 0.45)',
    fillSpain: 'rgba(245, 158, 11, 0.25)',
    fillArgentina: 'rgba(56, 189, 248, 0.25)',
    stroke: 'rgba(167, 139, 250, 0.4)',
    strokeWidth: 1.4,
    contextStroke: 'rgba(148, 163, 184, 0.15)',
  });

  const defs = allCells
    .map(
      (cell, idx) =>
        `<clipPath id="v4-glass-${idx}"><polygon points="${cell.poly.map((p) => p.join(',')).join(' ')}"/></clipPath>`
    )
    .join('\n    ');

  const floatingGlass = allCells
    .map((cell, idx) => {
      const tint = spectrumPalette[idx % spectrumPalette.length];
      const dx = (Math.sin(idx * 1.7) * 18).toFixed(1);
      const dy = (Math.cos(idx * 2.3) * 14).toFixed(1);
      const rot = (Math.sin(idx * 3.1) * 5.5).toFixed(2);
      return `<g clip-path="url(#v4-glass-${idx})" transform="translate(${dx} ${dy}) rotate(${rot} ${cell.cx.toFixed(1)} ${cell.cy.toFixed(1)})">
      <polygon points="${cell.poly.map((p) => p.join(',')).join(' ')}" fill="${tint}" fill-opacity="0.16" stroke="${tint}" stroke-opacity="0.48" stroke-width="1.1"/>
    </g>`;
    })
    .join('\n    ');

  const arcs = `
    <path d="M 594 526 Q 775 270 996 196" fill="none" stroke="url(#v4-link-grad)" stroke-width="2.4" opacity="0.82"/>
    <path d="M 438 138 Q 720 65 996 196" fill="none" stroke="#a78bfa" stroke-width="1.4" stroke-dasharray="5 5" opacity="0.55"/>
    <path d="M 280 242 Q 430 390 594 526" fill="none" stroke="#38bdf8" stroke-width="1.4" stroke-dasharray="4 6" opacity="0.5"/>
  `;

  const beacons = BEACONS.filter((b) => b.active)
    .map(
      (b) => `
    <g>
      <circle cx="${b.x}" cy="${b.y}" r="16" fill="${b.color}" opacity="0.22"/>
      <circle cx="${b.x}" cy="${b.y}" r="5" fill="${b.color}" stroke="#ffffff" stroke-width="1.5"/>
      <text x="${b.x}" y="${b.y - 16}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#f8fafc">${b.short}</text>
    </g>`
    )
    .join('\n');

  return `<svg class="hero-map-svg" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="v4-link-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="50%" stop-color="#e11d48"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      ${defs}
    </defs>
    ${baseWireframe}
    ${floatingGlass}
    ${arcs}
    ${beacons}
  </svg>`;
}

/* 5. V5: Pulso Hemisférico — teselas geométricas desintegrándose hacia el Atlántico */
function buildDisintegratingGridMapSvg() {
  const step = 15;
  const rects = [];

  for (let y = 40; y <= 650; y += step) {
    for (let x = 60; x <= 1135; x += step) {
      const reg = hitRegion(x + step / 2, y + step / 2);
      if (!reg) continue;

      // Detectar si es celda de borde (alguno de los 4 vecinos fuera de masa terrestre)
      const isEdge =
        !hitRegion(x + step / 2 - step, y + step / 2) ||
        !hitRegion(x + step / 2 + step, y + step / 2) ||
        !hitRegion(x + step / 2, y + step / 2 - step) ||
        !hitRegion(x + step / 2, y + step / 2 + step);

      const isDeepEdge =
        isEdge ||
        !hitRegion(x + step / 2 - step * 2, y + step / 2) ||
        !hitRegion(x + step / 2 + step * 2, y + step / 2);

      const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      let dx = 0;
      let dy = 0;
      let rot = 0;
      let size = step - 2.6;
      let opacity = 0.72;

      if (isEdge) {
        const pushDir = reg.group === 'es' ? -1 : 1;
        dx = Number((pushDir * (6 + hash * 28)).toFixed(1));
        dy = Number(((hash - 0.45) * 22).toFixed(1));
        rot = Number(((hash - 0.5) * 44).toFixed(1));
        size = Number((size * (0.55 + hash * 0.45)).toFixed(1));
        opacity = Number((0.35 + hash * 0.45).toFixed(2));
      } else if (isDeepEdge) {
        const pushDir = reg.group === 'es' ? -1 : 1;
        dx = Number((pushDir * (hash * 7)).toFixed(1));
        dy = Number(((hash - 0.5) * 6).toFixed(1));
        rot = Number(((hash - 0.5) * 10).toFixed(1));
        opacity = 0.62;
      }

      let fill = '#334155';
      if (reg.group === 'es' || reg.group === 'ar') {
        fill = isEdge && hash > 0.5 ? '#fbbf24' : '#f59e0b';
        opacity = isEdge ? 0.68 : 0.85;
      } else if (isEdge && hash > 0.72) {
        fill = '#38bdf8';
      }

      const cx = (x + step / 2 + dx).toFixed(1);
      const cy = (y + step / 2 + dy).toFixed(1);
      const rx = (x + dx + (step - size) / 2).toFixed(1);
      const ry = (y + dy + (step - size) / 2).toFixed(1);

      const transformAttr = rot !== 0 ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
      rects.push(
        `<rect x="${rx}" y="${ry}" width="${size}" height="${size}" rx="2" fill="${fill}" opacity="${opacity}"${transformAttr}/>`
      );
    }
  }

  const beacons = BEACONS.filter((b) => b.active)
    .map(
      (b) => `
    <g>
      <circle cx="${b.x}" cy="${b.y}" r="18" fill="none" stroke="#f59e0b" stroke-width="1.6" opacity="0.65"/>
      <circle cx="${b.x}" cy="${b.y}" r="5" fill="#fef3c7"/>
      <text x="${b.x}" y="${b.y - 22}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fef3c7" letter-spacing="0.08em">${b.short}</text>
    </g>`
    )
    .join('\n');

  return `<svg class="hero-map-svg" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g>
      ${rects.join('\n      ')}
      ${beacons}
    </g>
  </svg>`;
}

module.exports = {
  REGIONS,
  BEACONS,
  buildShatteredShardsMapSvg,
  buildCanvasParticleMapPayload,
  buildEditorialSlicedMapSvg,
  buildIsometricGlassMapSvg,
  buildDisintegratingGridMapSvg,
};
