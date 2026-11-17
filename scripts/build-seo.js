'use strict';

const fs = require('fs');
const path = require('path');

const DATA = require('../public/data/electionData.js');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html');
const INDEXNOW_KEY = 'politifacil29nindexnow2026';

const rawUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  'https://politifacil-29n.vercel.app';
const SITE_URL = rawUrl.replace(/\/$/, '');
const LASTMOD = new Date().toISOString().slice(0, 10);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeJsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

function replaceMarkerBlock(html, markerName, newContent) {
  const startTag = `<!-- ${markerName}_START -->`;
  const endTag = `<!-- ${markerName}_END -->`;
  const startIdx = html.indexOf(startTag);
  const endIdx = html.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Marcadores no encontrados o mal ordenados para ${markerName} en public/index.html`);
  }
  const before = html.slice(0, startIdx + startTag.length);
  const after = html.slice(endIdx);
  return `${before}\n${newContent}\n${after}`;
}

function getParty(id) {
  return DATA.parties.find((p) => p.id === id) || DATA.parties[0];
}

function getAxis(id) {
  return DATA.axes.find((a) => a.id === id) || DATA.axes[0];
}

function findAnyParty(id) {
  return (
    DATA.parties.find((p) => p.id === id) ||
    (DATA.territorialParties || []).find((tp) => tp.id === id) || {
      id,
      shortName: String(id).toUpperCase(),
      name: String(id).toUpperCase(),
      candidate: '',
      color: '#64748b',
    }
  );
}

function getAllDuelPairs() {
  const pairs = [];
  for (let i = 0; i < DATA.parties.length; i += 1) {
    for (let j = i + 1; j < DATA.parties.length; j += 1) {
      pairs.push([DATA.parties[i], DATA.parties[j]]);
    }
  }
  return pairs;
}

function getDuelSlug(partyAId, partyBId) {
  const idxA = DATA.parties.findIndex((p) => p.id === partyAId);
  const idxB = DATA.parties.findIndex((p) => p.id === partyBId);
  if (idxA === -1 || idxB === -1 || idxA === idxB) return null;
  const [first, second] = idxA < idxB ? [partyAId, partyBId] : [partyBId, partyAId];
  return `${first}-vs-${second}`;
}

function scoreToArcPoint(score, cx, cy, r) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const angle = Math.PI * (1 - clamped / 100);
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
    angle,
  };
}

function buildPoliticalArcSvg(options = {}) {
  const {
    selectedPartyId = 'psoe',
    highlightPartyIds = null,
    userScore = null,
    interactive = false,
    width = 560,
    height = 310,
  } = options;

  const cx = width / 2;
  const cy = height - 48;
  const rMain = 185;
  const rOuter = 208;

  const segments = [
    { from: 0, to: 25, color: '#6d28d9' },
    { from: 25, to: 48, color: '#dc2626' },
    { from: 48, to: 75, color: '#0284c7' },
    { from: 75, to: 100, color: '#16a34a' },
  ];

  const arcPaths = segments
    .map((seg) => {
      const p1 = scoreToArcPoint(seg.from, cx, cy, rMain);
      const p2 = scoreToArcPoint(seg.to, cx, cy, rMain);
      return `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${rMain} ${rMain} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" stroke="${seg.color}" stroke-width="18" stroke-linecap="butt" opacity="0.22"/>`;
    })
    .join('');

  const sortedParties = DATA.parties.slice().sort((a, b) => a.spectrumScore - b.spectrumScore);
  const highlightedSet = Array.isArray(highlightPartyIds)
    ? new Set(highlightPartyIds)
    : new Set([selectedPartyId]);

  const partyNodes = sortedParties
    .map((party, idx) => {
      const pt = scoreToArcPoint(party.spectrumScore, cx, cy, rMain);
      const labelRadius = idx % 2 === 0 ? rOuter + 24 : rMain - 36;
      const labelPt = scoreToArcPoint(party.spectrumScore, cx, cy, labelRadius);
      const isSelected = highlightedSet.has(party.id);
      const radius = isSelected ? 15 : 11;
      const attrs = interactive
        ? `class="arc-node" tabindex="0" role="button" data-party-node="${escapeHtml(party.id)}" aria-label="Seleccionar ${escapeHtml(party.shortName)} (${party.spectrumScore}/100)"`
        : '';
      return `
        <g ${attrs}>
          <line x1="${pt.x.toFixed(1)}" y1="${pt.y.toFixed(1)}" x2="${labelPt.x.toFixed(1)}" y2="${labelPt.y.toFixed(1)}" stroke="${party.color}" stroke-width="1.4" opacity="0.55" />
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius + 5}" fill="${party.color}" opacity="${isSelected ? '0.24' : '0'}" />
          <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius}" fill="${party.color}" stroke="#ffffff" stroke-width="2.5" />
          <text x="${labelPt.x.toFixed(1)}" y="${labelPt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11.5" font-weight="800" fill="currentColor">${escapeHtml(party.shortName)}</text>
        </g>
      `;
    })
    .join('');

  let userMarker = '';
  if (userScore !== null && !Number.isNaN(userScore)) {
    const uPt = scoreToArcPoint(userScore, cx, cy, rMain);
    const innerPt = scoreToArcPoint(userScore, cx, cy, 34);
    const tagPt = scoreToArcPoint(userScore, cx, cy, rMain - 64);
    userMarker = `
      <g aria-label="Referencia en el arco político">
        <line x1="${innerPt.x.toFixed(1)}" y1="${innerPt.y.toFixed(1)}" x2="${uPt.x.toFixed(1)}" y2="${uPt.y.toFixed(1)}" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
        <circle cx="${cx}" cy="${cy}" r="8" fill="#f59e0b" />
        <circle cx="${uPt.x.toFixed(1)}" cy="${uPt.y.toFixed(1)}" r="11" fill="#f59e0b" stroke="#111827" stroke-width="2.5" />
        <rect x="${(tagPt.x - 58).toFixed(1)}" y="${(tagPt.y - 14).toFixed(1)}" width="116" height="26" rx="13" fill="#111827" stroke="#f59e0b" stroke-width="1.8" />
        <text x="${tagPt.x.toFixed(1)}" y="${(tagPt.y + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" font-weight="800" fill="#fef3c7">POS: ${Math.round(userScore)}/100</text>
      </g>
    `;
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Arco político de izquierda a derecha">
      <path d="M ${cx - rMain} ${cy} A ${rMain} ${rMain} 0 0 1 ${cx + rMain} ${cy}" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="20" />
      ${arcPaths}
      <text x="${cx - rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">← Izquierda (0)</text>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor" opacity="0.72">Centro (50)</text>
      <text x="${cx + rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Derecha (100) →</text>
      ${partyNodes}
      ${userMarker}
    </svg>
  `.trim();
}

const FAQ_ITEMS = [
  {
    question: '¿Cuándo se celebran las elecciones generales en España 2026 y cuántos escaños se eligen?',
    answer:
      'Las elecciones generales en España están convocadas para el domingo 29 de noviembre de 2026 (29-N) mediante el Real Decreto 806/2026, de 5 de octubre. Se eligen 350 escaños al Congreso de los Diputados (mayoría absoluta en 176 escaños) y 208 escaños al Senado, con un censo electoral de 38.728.356 electores.',
  },
  {
    question: '¿Qué propone cada partido sobre vivienda y alquiler en el 29-N?',
    answer:
      'Podemos propone una bajada legal forzosa del 40 % en los alquileres, tope del 30 % de ingresos y expropiación de uso del 50 % de pisos a grandes tenedores. Frente Amplio plantea destinar el 1 % del PIB anual para crear 1,5 millones de pisos públicos y topar alquileres al 25 % de la renta. El PSOE propone 1 % del PIB, 100.000 viviendas en CASA 47 y préstamos TUCASA de 50.000 € sin intereses. El PP propone construir 1 millón de viviendas, derogar los topes de alquiler, avales del 20 % con Hucha Hogar Joven y desalojo exprés en 48 h. VOX plantea IVA 0 % e ITP bonificado al 100 % en primera vivienda, prioridad nacional y desalojo en menos de 24 h. SALF propone abaratar un 35 % la primera vivienda, eliminar ITP/AJD, liberalizar suelo y desalojo en 48 h.',
  },
  {
    question: '¿Qué partidos apoyan reducir la jornada laboral a 37,5h, 32h o 30h semanales?',
    answer:
      'Podemos defiende una jornada máxima de 30 horas semanales (6 h/día) y un SMI de 1.800 € en 14 pagas. Frente Amplio propone pasar de 37,5 h hacia 32 horas semanales sin recorte salarial y repartir el 10 % de beneficios en empresas de más de 50 empleados. El PSOE propone 37,5 horas semanales por ley (abriendo la vía en convenios hacia 35 h) y blindar el SMI al 60 % del salario medio. El PP rechaza imponer las 37,5 h por ley y apuesta por bancos de horas flexibles y mochila austriaca voluntaria. VOX vota en contra de las 37,5 h y suprime el control horario obligatorio. SALF propone un contrato único con mochila austriaca y bajar la cuña fiscal del 41 % al 29 %.',
  },
  {
    question: '¿Qué proponen los programas sobre impuestos, IRPF y cuota de autónomos?',
    answer:
      'Podemos plantea un gravamen del 50 % a beneficios extraordinarios de banca, energéticas e IBEX 35, banca pública y supermercado público. Frente Amplio fija un tipo mínimo del 20 % en Sociedades, impuesto de hasta el 3 % a fortunas superiores a 50 M€ y tipo marginal del 100 % a herencias de más de 10 M€. El PSOE consolida recargos a banca, energéticas y jets privados/megayates, exime el SMI del IRPF y crea una ayuda por crianza de 200 €/mes por hijo. El PP deflacta el IRPF, exime progresivamente 4 años a jóvenes de 18 a 35 años, aplica IVA 0 % en básicos y cuota cero el primer año a nuevos autónomos sin liquidar IVA por debajo de 85.000 €. VOX rebaja el IRPF según hijos, aplica cuota cero a autónomos por debajo del SMI y grava las remesas al exterior. SALF exime de IRPF los primeros 35.000 €, suprime la cuota fija de autónomos y recorta de 22 a 10 ministerios.',
  },
  {
    question: '¿Cuál es la postura de cada candidatura sobre sanidad pública, educación y pensiones?',
    answer:
      'Podemos propone 80.000 nuevas plazas entre sanidad y educación, suprimir conciertos privados y bajar la jubilación a los 63 años. Frente Amplio eleva la sanidad al 8 % del PIB con dentista, gafas y salud mental universal, educación al 7 % del PIB y jubilación a los 65 años. El PSOE sitúa la sanidad en el 7 % del PIB con psicólogo en 30 días, gratuidad del primer curso universitario y blindaje constitucional de pensiones según el IPC. El PP propone 4.500 médicos en Primaria, sustituir la LOMLOE con EBAU común y castellano vehicular, y revalorizar pensiones con el IPC. VOX devuelve Sanidad y Educación al Estado con tarjeta única, limita la atención gratuita a irregulares a urgencias graves y elimina el requisito de lengua cooficial. SALF crea una central única sanitaria con derivación privada si se superan 60/30/7 días, cheque escolar con PIN parental y cuentas individuales de pensión para menores de 45 años.',
  },
  {
    question: '¿Qué proponen los partidos en inmigración, defensa (OTAN) y seguridad?',
    answer:
      'Podemos exige salir de la OTAN, cerrar Rota y Morón, embargar armas a Israel, regularizar personas migrantes y derogar la Ley Mordaza. Frente Amplio rechaza subir el gasto militar al 5 %, pide reconvertir Rota y Morón y un reparto solidario obligatorio de menores migrantes. El PSOE mantiene el gasto en defensa en el 2 %–2,1 % del PIB rechazando el 5 %, destina 500 M€ a un Plan de Integración sin nueva regularización extraordinaria y reforma la LeCrim. El PP prohíbe regularizaciones masivas, exige identificación en 7 días, pide que los jueces elijan a los 12 vocales judiciales del CGPJ y amplía la prisión permanente. VOX propone la remigración, suprimir el arraigo, expulsar a delincuentes extranjeros y elegir judicialmente el CGPJ. SALF plantea una macrocárcel de 3.000 M€, expulsión en 48 h, despliegue militar permanente en el Estrecho y presunción de legítima defensa.',
  },
  {
    question: '¿Qué partidos quieren cerrar las centrales nucleares y cuáles prorrogarlas?',
    answer:
      'El PSOE mantiene el calendario pactado de cierre nuclear hasta 2035 y exige energía renovable a centros de datos. Podemos acelera el cierre nuclear, crea una eléctrica pública y fija el sistema 100 % renovable en 2040. Frente Amplio invierte el 3,5 % del PIB anual en transición verde manteniendo el cierre nuclear y prohibiendo vuelos cortos con alternativa ferroviaria inferior a 2h30. El PP frena el cierre nuclear en sus primeros 100 días (Almaraz, Ascó, Vandellós, Cofrentes y Trillo), elimina el impuesto del 7 % a la generación eléctrica y lanza un Pacto Nacional del Agua de 40.000 M€. VOX anula el cierre nuclear, estudia instalar nuevas centrales, deroga el Pacto Verde Europeo y veta el acuerdo UE-Mercosur. SALF rechaza la Agenda Verde europea y apuesta por mantener la energía nuclear.',
  },
  {
    question: '¿Qué papel juegan ERC, Junts, EAJ-PNV, EH Bildu y BNG en la gobernabilidad del 29-N?',
    answer:
      'Dado que el Congreso tiene 350 escaños repartidos por circunscripciones provinciales con la Ley D’Hondt y la mayoría absoluta exige 176 diputados, las fuerzas territoriales resultan decisivas para formar gobierno y aprobar presupuestos. ERC y EH Bildu descartan investir a PP o Vox y condicionan su apoyo a un gobierno progresista a la financiación singular de Cataluña, el traspaso de Rodalies, la regulación de alquileres y mejoras laborales y sociales. EAJ-PNV actúa como dique explícito frente a mayorías con Vox y exige el cumplimiento íntegro del Estatuto de Gernika y el Concierto Económico. El BNG condiciona su respaldo al bloque progresista a la «Axenda Galega» ferroviaria, energética y pesquera. Junts opera como actor bisagra exigiendo concierto catalán y competencias integrales en inmigración sin dar cheques en blanco.',
  },
];

/* ================= ACTIVOS VISUALES Y PLATAFORMA ================= */

function generateFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="PolitiFácil 29-N">
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M12 44 A20 20 0 0 1 52 44" fill="none" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
  <circle cx="15" cy="36" r="4.2" fill="#7c3aed"/>
  <circle cx="21" cy="27" r="4.2" fill="#e11d48"/>
  <circle cx="29" cy="23" r="4.2" fill="#dc2626"/>
  <circle cx="38" cy="23" r="4.2" fill="#0284c7"/>
  <circle cx="45" cy="29" r="4.2" fill="#16a34a"/>
  <circle cx="49" cy="37" r="4.2" fill="#b45309"/>
  <line x1="32" y1="44" x2="32" y2="21" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="44" r="4" fill="#f59e0b"/>
</svg>
`;
}

function generateOgBannerSvg() {
  const cx = 945;
  const cy = 365;
  const rMain = 160;

  const arcSegments = [
    { from: 0, to: 18, color: '#7c3aed' },
    { from: 18, to: 32, color: '#e11d48' },
    { from: 32, to: 52, color: '#dc2626' },
    { from: 52, to: 78, color: '#0284c7' },
    { from: 78, to: 90, color: '#16a34a' },
    { from: 90, to: 100, color: '#78350f' },
  ];

  const segmentPaths = arcSegments
    .map((seg) => {
      const p1 = scoreToArcPoint(seg.from, cx, cy, rMain);
      const p2 = scoreToArcPoint(seg.to, cx, cy, rMain);
      return `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${rMain} ${rMain} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" stroke="${seg.color}" stroke-width="26" stroke-linecap="butt" opacity="0.92"/>`;
    })
    .join('\n    ');

  const partyDots = DATA.parties
    .map((party) => {
      const pt = scoreToArcPoint(party.spectrumScore, cx, cy, rMain);
      const outer = scoreToArcPoint(party.spectrumScore, cx, cy, rMain + 32);
      return `<g>
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="12" fill="${party.color}" stroke="#0f172a" stroke-width="3.5"/>
      <text x="${outer.x.toFixed(1)}" y="${outer.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="700" fill="#e2e8f0">${escapeXml(party.shortName)}</text>
    </g>`;
    })
    .join('\n    ');

  const needleTip = scoreToArcPoint(48, cx, cy, rMain - 14);
  const needleTail = scoreToArcPoint(48, cx, cy, 18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PolitiFácil 29-N — Test a Ciegas y Comparador Electoral Neutral">
  <defs>
    <radialGradient id="bgGlow" cx="78%" cy="48%" r="55%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#334155" stroke-width="1.5"/>

  <rect x="72" y="84" width="440" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="94" y="107" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" letter-spacing="1.4" fill="#93c5fd">ELECCIONES GENERALES ESPAÑA · 29-N 2026</text>

  <text x="72" y="222" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="78" font-weight="800" letter-spacing="-1.5" fill="#f8fafc">PolitiFácil 29-N</text>
  <text x="72" y="284" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="27" font-weight="500" fill="#cbd5e1">Test a Ciegas y Comparador Electoral Neutral · España</text>

  <line x1="72" y1="326" x2="680" y2="326" stroke="#334155" stroke-width="1.5"/>

  <g font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="16" font-weight="700" fill="#f8fafc">
    <rect x="72" y="362" width="198" height="42" rx="21" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <text x="171" y="388" text-anchor="middle">6 Partidos Estatales</text>

    <rect x="284" y="362" width="168" height="42" rx="21" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <text x="368" y="388" text-anchor="middle">8 Ejes Oficiales</text>

    <rect x="466" y="362" width="118" height="42" rx="21" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
    <text x="525" y="388" text-anchor="middle">0 Opinión</text>

    <rect x="598" y="362" width="148" height="42" rx="21" fill="#f59e0b"/>
    <text x="672" y="388" text-anchor="middle" fill="#0f172a">10 Escenarios</text>
  </g>

  <text x="72" y="454" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="18" font-weight="600" fill="#94a3b8">6 Partidos Estatales · 8 Ejes Oficiales · 0 Opinión · 10 Escenarios</text>

  <text x="72" y="544" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="18" font-weight="600" fill="#e2e8f0">Solo programas oficiales · Citas literales de entrevistas · Real Decreto 806/2026</text>

  <g>
    <path d="M ${cx - rMain} ${cy} A ${rMain} ${rMain} 0 0 1 ${cx + rMain} ${cy}" fill="none" stroke="#1e293b" stroke-width="32"/>
    ${segmentPaths}
    ${partyDots}
    <line x1="${needleTail.x.toFixed(1)}" y1="${needleTail.y.toFixed(1)}" x2="${needleTip.x.toFixed(1)}" y2="${needleTip.y.toFixed(1)}" stroke="#fbbf24" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="14" fill="#fbbf24" stroke="#0f172a" stroke-width="4"/>
    <circle cx="${needleTip.x.toFixed(1)}" cy="${needleTip.y.toFixed(1)}" r="10" fill="#fbbf24" stroke="#0f172a" stroke-width="3"/>
    <text x="${cx - rMain}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">IZQ (0)</text>
    <text x="${cx}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#fbbf24">BRÚJULA 29-N</text>
    <text x="${cx + rMain}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">DER (100)</text>
  </g>
</svg>
`;
}

function generateManifest() {
  return JSON.stringify(
    {
      name: 'PolitiFácil 29-N — Comparador Electoral Neutral',
      short_name: 'PolitiFácil 29-N',
      description:
        'Plataforma interactiva y neutral para comparar programas oficiales, entrevistas literales y realizar el test de afinidad de 10 escenarios para las Elecciones Generales de España del 29 de noviembre de 2026.',
      lang: 'es-ES',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f6f7fb',
      theme_color: '#0f172a',
      icons: [
        {
          src: '/favicon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
    },
    null,
    2
  );
}

/* ================= PRE-RENDERIZADO DE HOME (index.html) ================= */

function buildHomeHeadBlock() {
  const title = 'PolitiFácil 29-N | Comparador Electoral Neutral y Test de Afinidad en España';
  const description =
    'Plataforma neutral, visual y sin sesgos para entender las propuestas oficiales, el estilo comunicativo y las entrevistas de los candidatos en las elecciones generales de España del 29 de noviembre de 2026.';
  const ogImage = `${SITE_URL}/og-banner.png`;

  const allPartiesForList = [
    ...DATA.parties.map((p) => ({
      name: p.name,
      shortName: p.shortName,
      url: `${SITE_URL}/partidos/${p.id}`,
      sameAs: [p.officialUrl, p.secondaryUrl].filter(Boolean),
      description: p.summary,
      candidate: p.candidate,
    })),
    ...(DATA.territorialParties || []).map((tp) => ({
      name: tp.name,
      shortName: tp.shortName,
      url: `${SITE_URL}/territorios/${tp.id}`,
      sameAs: [tp.officialUrl].filter(Boolean),
      description: tp.priorities,
      candidate: tp.candidate,
    })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'PolitiFácil 29-N',
        inLanguage: 'es-ES',
        description,
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#webapp`,
        name: 'PolitiFácil 29-N — Comparador a Ciegas y Test Electoral',
        url: `${SITE_URL}/`,
        applicationCategory: 'ReferenceApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript for interactive test and blind mode',
        inLanguage: 'es-ES',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        about: {
          '@type': 'Event',
          name: 'Elecciones Generales de España 29-N (2026)',
          startDate: DATA.meta.electionDate,
          location: {
            '@type': 'Country',
            name: 'España',
          },
          description: `${DATA.meta.decree}. ${DATA.meta.seatsCongress} escaños al Congreso y ${DATA.meta.seatsSenate} al Senado.`,
        },
      },
      {
        '@type': 'Dataset',
        '@id': `${SITE_URL}/#dataset`,
        name: 'Programas Electorales y Entrevistas — Elecciones Generales España 29-N (2026)',
        description: `Base de datos estructurada y neutral sobre programas electorales oficiales, estilo comunicativo y declaraciones literales en entrevistas para las elecciones generales de España del 29 de noviembre de 2026 (${DATA.meta.decree}).`,
        url: `${SITE_URL}/`,
        spatialCoverage: 'Spain',
        temporalCoverage: '2026-11-29',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        inLanguage: 'es-ES',
        keywords: [
          'Elecciones Generales España 2026',
          '29-N',
          DATA.meta.decree,
          'Programas electorales',
          'Comparador electoral neutral',
          'Test de afinidad política',
        ],
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_URL}/data/election-data.json`,
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'text/markdown',
            contentUrl: `${SITE_URL}/llms-full.txt`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/#parties-list`,
        name: 'Partidos estatales y fuerzas territoriales en las Elecciones Generales 29-N (España)',
        numberOfItems: allPartiesForList.length,
        itemListElement: allPartiesForList.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'PoliticalParty',
            name: item.name,
            alternateName: item.shortName,
            url: item.url,
            sameAs: item.sameAs,
            description: item.description,
            member: {
              '@type': 'Person',
              name: item.candidate,
            },
          },
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQ_ITEMS.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return `  <link rel="canonical" href="${escapeHtml(SITE_URL)}/" />
  <link rel="alternate" hreflang="es-ES" href="${escapeHtml(SITE_URL)}/" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(SITE_URL)}/" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="geo.region" content="ES" />
  <meta name="geo.placename" content="España" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(SITE_URL)}/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="PolitiFácil 29-N" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(SITE_URL)}/" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="PolitiFácil 29-N: arco parlamentario multicolor y comparador electoral neutral en España" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="6 Partidos Estatales · 8 Ejes Oficiales · 0 Opinión · Test de 10 Escenarios en el arco político de España (29-N)." />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:image:alt" content="PolitiFácil 29-N: arco parlamentario multicolor y comparador electoral neutral en España" />
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>`;
}

function renderPartyDetailHtml(party) {
  const comm = party.officialCommunication;
  return `
      <div class="detail-header">
        <div>
          <div class="party-badge-pill">
            <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
            <span>${escapeHtml(party.name)} (${escapeHtml(party.shortName)})</span>
          </div>
          <p class="muted-text">Candidato/a: <strong>${escapeHtml(party.candidate)}</strong> · ${escapeHtml(party.ideologyLabel)}</p>
        </div>
        <a class="btn btn-sm" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer">Web oficial ↗</a>
      </div>

      <p style="margin:0 0 10px 0; font-size:0.9rem;">${escapeHtml(party.summary)}</p>

      <div class="axis-meter">
        <div class="meter-row">
          <span>Eje Izq → Der</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${party.spectrumScore}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${party.spectrumScore}/100</strong>
        </div>
        <div class="meter-row">
          <span>Interv. Estatal</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${100 - party.economicAxis}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${100 - party.economicAxis}/100</strong>
        </div>
      </div>

      <div class="comm-box">
        <h4>Estilo de comunicación oficial (Web y campaña)</h4>
        <ul class="comm-list">
          <li><strong>Eslóganes:</strong> ${comm.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
          <li><strong>Tono y registro:</strong> ${escapeHtml(comm.tone)}</li>
          <li><strong>Encuadre (framing):</strong> ${escapeHtml(comm.framing)}</li>
          <li><strong>Canales prioritarios:</strong> ${escapeHtml(comm.channels)}</li>
        </ul>
        <div class="tag-cloud">
          ${comm.keywords.map((kw) => `<span class="tag"># ${escapeHtml(kw)}</span>`).join('')}
        </div>
      </div>

      <div class="comm-box">
        <h4>Cómo se expresa en entrevistas</h4>
        <p class="muted-text" style="font-size:0.84rem;">${escapeHtml(party.interviewStyle.summary)}</p>
      </div>

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <a class="btn btn-primary btn-sm" href="/partidos/${escapeHtml(party.id)}">Ver ficha completa y 8 ejes</a>
        <a class="btn btn-sm" href="/?section=comparador&amp;left=${escapeHtml(party.id)}">Abrir en comparador</a>
      </div>
  `.trim();
}

function renderHomePartyGridHtml() {
  return DATA.parties
    .slice()
    .sort((a, b) => a.spectrumScore - b.spectrumScore)
    .map(
      (party) => `
      <article class="card party-card" style="--party-color:${escapeHtml(party.color)}">
        <div class="party-card-top">
          <div>
            <span class="chip">${escapeHtml(party.ideologyLabel)}</span>
            <h3 style="margin-top:8px;">${escapeHtml(party.shortName)} · ${escapeHtml(party.candidate)}</h3>
          </div>
          <span class="chip" title="Posición en escala 0 (izquierda) a 100 (derecha)">Arco: ${party.spectrumScore}/100</span>
        </div>
        <p class="muted-text">${escapeHtml(party.summary)}</p>
        <div class="comm-box" style="margin-top:4px;">
          <h4>Sello comunicativo</h4>
          <p class="muted-text" style="font-size:0.82rem;">${escapeHtml(party.officialCommunication.tone)}</p>
        </div>
        <div class="party-card-actions">
          <a class="source-link" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.82rem;">Programa / Web oficial ↗</a>
          <a class="btn btn-sm" href="/partidos/${escapeHtml(party.id)}">Ficha y 8 ejes</a>
        </div>
      </article>`
    )
    .join('\n');
}

function renderHomeTerritorialGridHtml() {
  return (DATA.territorialParties || [])
    .map(
      (tp) => `
      <article class="territorial-item" style="--party-color:${escapeHtml(tp.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
          <strong>${escapeHtml(tp.shortName)}</strong>
          <span class="chip" style="font-size:0.72rem;">${escapeHtml(tp.territory)}</span>
        </div>
        <p class="muted-text" style="font-size:0.8rem; margin-bottom:6px;">
          <strong>Referente:</strong> ${escapeHtml(tp.candidate)} · ${escapeHtml(tp.spectrumLabel)}
        </p>
        <p style="margin:0 0 6px 0; font-size:0.84rem;">${escapeHtml(tp.priorities)}</p>
        <p class="muted-text" style="font-size:0.79rem; margin-bottom:8px;"><strong>Papel 29-N:</strong> ${escapeHtml(tp.parliamentaryRole)}</p>
        <a class="source-link" href="/territorios/${escapeHtml(tp.id)}" style="font-size:0.8rem;">Ver ficha territorial 29-N →</a>
      </article>`
    )
    .join('\n');
}

function renderSimilarityPanelHtml(axisId, leftId = 'psoe', rightId = 'pp') {
  const axis = getAxis(axisId);
  const comp = DATA.axisComparisons[axisId] || { similarities: [], differences: [] };
  const left = getParty(leftId);
  const right = getParty(rightId);
  const leftProp = left.proposals[axisId];
  const rightProp = right.proposals[axisId];
  const duelSlug = getDuelSlug(left.id, right.id);

  return `
      <div class="sim-card sim-card-converge">
        <h3>En qué se parecen (${escapeHtml(axis.label)})</h3>
        <ul>
          ${comp.similarities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="sim-card sim-card-diverge">
        <h3>En qué se diferencian</h3>
        <ul>
          ${comp.differences.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="sim-card sim-card-pair">
        <h3>Cara a cara rápido</h3>
        <div style="margin-top:8px; display:grid; gap:8px; font-size:0.84rem;">
          <div>
            <strong style="color:${escapeHtml(left.color)}">${escapeHtml(left.shortName)}:</strong>
            <span>${escapeHtml(leftProp.headline)}</span>
          </div>
          <div>
            <strong style="color:${escapeHtml(right.color)}">${escapeHtml(right.shortName)}:</strong>
            <span>${escapeHtml(rightProp.headline)}</span>
          </div>
          <p class="muted-text" style="font-size:0.8rem;">
            Distancia en arco político: <strong>${Math.abs(left.spectrumScore - right.spectrumScore)} puntos</strong> (sobre 100).
            ${duelSlug ? `<a class="source-link" href="/comparar/${escapeHtml(duelSlug)}">Ver duelo completo →</a>` : ''}
          </p>
        </div>
      </div>
  `.trim();
}

function renderProposalsByAxisHtml(axisId) {
  return DATA.parties
    .slice()
    .sort((a, b) => a.spectrumScore - b.spectrumScore)
    .map((party) => {
      const prop = party.proposals[axisId];
      return `
      <article class="card proposal-card" style="--party-color:${escapeHtml(party.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <div class="party-badge-pill">
            <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
            <span><a class="source-link" href="/partidos/${escapeHtml(party.id)}">${escapeHtml(party.shortName)}</a></span>
          </div>
          <span class="chip">${escapeHtml(party.candidate)}</span>
        </div>
        <div class="proposal-headline">${escapeHtml(prop.headline)}</div>
        <ul class="proposal-points">
          ${prop.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
        </ul>
        <div class="proposal-footer">
          <a class="source-link" href="${escapeHtml(prop.sourceUrl || party.officialUrl)}" target="_blank" rel="noopener noreferrer">Fuente: ${escapeHtml(prop.sourceLabel || party.officialUrl)} ↗</a>
          <span class="chip" style="font-size:0.72rem;">Arco ${party.spectrumScore}/100</span>
        </div>
      </article>`;
    })
    .join('\n');
}

function renderExpressionGridHtml() {
  return DATA.parties
    .map(
      (p) => `
      <div class="expression-item" style="--party-color:${escapeHtml(p.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
          <strong><a class="source-link" href="/partidos/${escapeHtml(p.id)}">${escapeHtml(p.candidate)}</a></strong>
          <span class="chip" style="font-size:0.72rem;">${escapeHtml(p.shortName)}</span>
        </div>
        <p class="muted-text" style="font-size:0.82rem; margin-bottom:8px;">${escapeHtml(p.interviewStyle.summary)}</p>
        <div style="font-size:0.78rem; color:var(--text);">
          <strong>Registro:</strong> ${escapeHtml(p.interviewStyle.register)}
        </div>
      </div>`
    )
    .join('\n');
}

function renderInterviewCardsHtml(interviews) {
  return interviews
    .map((iv) => {
      const p = findAnyParty(iv.partyId);
      const isTerritorial = (DATA.territorialParties || []).some((tp) => tp.id === iv.partyId);
      const partyHref = isTerritorial ? `/territorios/${iv.partyId}` : `/partidos/${iv.partyId}`;
      return `
      <article class="card interview-card" style="--party-color:${escapeHtml(p.color)}">
        <div class="interview-meta">
          <div>
            <strong>${escapeHtml(iv.candidate)}</strong>
            <span class="muted-text"> · <a class="source-link" href="${escapeHtml(partyHref)}">${escapeHtml(p.shortName)}</a></span>
          </div>
          <span class="chip">${escapeHtml(iv.formatType)}</span>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.78rem;">
          <span class="chip">${escapeHtml(iv.media)} — ${escapeHtml(iv.program)}</span>
          <span class="chip">${escapeHtml(iv.date)}</span>
          <span class="chip">Tema: ${escapeHtml(iv.topic)}</span>
        </div>
        <div class="interview-question">
          <strong>Pregunta / Contexto:</strong> ${escapeHtml(iv.questionContext)}
        </div>
        <blockquote class="interview-quote">“${escapeHtml(iv.quote)}”</blockquote>
        <div class="interview-footer">
          <span class="tag">Estilo: ${escapeHtml(iv.expressionStyle)}</span>
          <a class="source-link" href="${escapeHtml(iv.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver medio ↗</a>
        </div>
      </article>`;
    })
    .join('\n');
}

function renderQuizSemanticPreviewHtml() {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const items = DATA.quizQuestions
    .map(
      (q, qi) => `
      <article class="scenario-box" style="margin-bottom:14px;">
        <span class="chip">Escenario ${qi + 1} · <a class="source-link" href="/propuestas/${escapeHtml(q.axisId)}">${escapeHtml(q.axisLabel)}</a></span>
        <h3 class="scenario-title">${escapeHtml(q.title)}</h3>
        <p style="margin:0 0 10px 0; font-size:0.94rem;">${escapeHtml(q.scenario)}</p>
        <ol style="margin:0; padding-left:20px; display:grid; gap:6px; font-size:0.86rem; color:var(--text-muted);">
          ${q.options.map((opt, oi) => `<li><strong>Opción ${letters[oi] || oi + 1}:</strong> ${escapeHtml(opt.text)}</li>`).join('')}
        </ol>
      </article>`
    )
    .join('\n');

  return `
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <span class="eyebrow">Vista Semántica de los ${DATA.quizQuestions.length} Escenarios</span>
          <p class="muted-text">Responde de forma interactiva para calcular tu posición 0–100 en el arco político sin sesgos partidistas.</p>
        </div>
        <a class="btn btn-primary btn-sm" href="/test-afinidad">Ver guía metodológica del Test</a>
      </div>
      ${items}
  `.trim();
}

function renderSeoHubHtml() {
  const parties = DATA.parties;
  const duelPairs = getAllDuelPairs();

  const tldrHeaderCols = parties
    .map(
      (p) =>
        `<th scope="col"><a class="source-link" href="/partidos/${escapeHtml(p.id)}" style="color:${escapeHtml(p.color)}">${escapeHtml(p.shortName)}</a><br/><small style="font-weight:500; color:var(--text-muted);">${escapeHtml(p.candidate)}</small></th>`
    )
    .join('');

  const tldrRows = DATA.axes
    .map((axis) => {
      const cells = parties
        .map((p) => {
          const prop = p.proposals[axis.id];
          return `<td>${escapeHtml(prop.headline)}</td>`;
        })
        .join('');
      return `
        <tr>
          <th scope="row"><a class="source-link" href="/propuestas/${escapeHtml(axis.id)}">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</a></th>
          ${cells}
        </tr>`;
    })
    .join('\n');

  const faqHtml = FAQ_ITEMS.map(
    (item) => `
      <details class="faq-item">
        <summary>${escapeHtml(item.question)}</summary>
        <div class="faq-answer">
          <p>${escapeHtml(item.answer)}</p>
        </div>
      </details>`
  ).join('\n');

  return `
    <section class="seo-hub-section" id="guia-completa-29n" aria-labelledby="heading-seo-hub">
      <div class="section-header">
        <div>
          <span class="eyebrow">Síntesis Programática · Datos Verificados 29-N</span>
          <h2 id="heading-seo-hub">Tabla Comparativa Rápida (8 Ejes), Preguntas Frecuentes y Directorio 29-N</h2>
          <p class="section-lead">
            Resumen estructurado de los 6 partidos estatales en los 8 bloques programáticos, respuestas directas sobre las elecciones generales del 29 de noviembre de 2026 (${escapeHtml(DATA.meta.decree)}) y acceso a todas las guías temáticas y duelos cara a cara.
          </p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3>Tabla Resumen Comparativa (TL;DR 29-N): Partidos × 8 Ejes Oficiales</h3>
        <p class="muted-text" style="margin-bottom:12px;">Pulsa en cualquier eje temático o sigla para abrir su análisis completo con fuentes oficiales.</p>
        <div class="tldr-table-wrap">
          <table class="tldr-table">
            <thead>
              <tr>
                <th scope="col">Eje Temático</th>
                ${tldrHeaderCols}
              </tr>
            </thead>
            <tbody>
              ${tldrRows}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3>Preguntas Frecuentes sobre las Elecciones Generales 29-N (FAQ)</h3>
        <p class="muted-text" style="margin-bottom:14px;">Respuestas contrastadas exclusivamente con los datos censales y los programas oficiales recogidos en PolitiFácil 29-N.</p>
        <div class="faq-list">
          ${faqHtml}
        </div>
      </div>

      <div class="card">
        <h3>Directorio Completo de Guías, Partidos y Comparativas 29-N</h3>
        <p class="muted-text" style="margin-bottom:14px;">Explora páginas dedicadas e indexables para cada bloque temático, formación política y duelo cara a cara.</p>
        <div class="internal-links-grid">
          <div class="internal-links-group">
            <h4>Secciones Principales</h4>
            <ul>
              <li><a href="/">Inicio · Arco Político y Comunicación</a></li>
              <li><a href="/comparador">Comparador de Propuestas (8 Ejes)</a></li>
              <li><a href="/entrevistas">Hemeroteca de Entrevistas Literales</a></li>
              <li><a href="/test-afinidad">Test de Afinidad de 10 Escenarios</a></li>
              <li><a href="/territorios">Aritmética Parlamentaria y Partidos Territoriales</a></li>
              <li><a href="/comparar">Todos los Duelos Cara a Cara (15)</a></li>
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>8 Ejes Programáticos</h4>
            <ul>
              ${DATA.axes
                .map(
                  (axis) =>
                    `<li><a href="/propuestas/${escapeHtml(axis.id)}">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>6 Partidos Estatales</h4>
            <ul>
              ${DATA.parties
                .map(
                  (party) =>
                    `<li><a href="/partidos/${escapeHtml(party.id)}">${escapeHtml(party.shortName)} — ${escapeHtml(party.candidate)} (${party.spectrumScore}/100)</a></li>`
                )
                .join('\n              ')}
            </ul>
            <h4 style="margin-top:14px;">5 Fuerzas Territoriales</h4>
            <ul>
              ${(DATA.territorialParties || [])
                .map(
                  (tp) =>
                    `<li><a href="/territorios/${escapeHtml(tp.id)}">${escapeHtml(tp.shortName)} (${escapeHtml(tp.territory)})</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>15 Comparativas Cara a Cara (VS)</h4>
            <ul>
              ${duelPairs
                .map(
                  ([p1, p2]) =>
                    `<li><a href="/comparar/${escapeHtml(p1.id)}-vs-${escapeHtml(p2.id)}">${escapeHtml(p1.shortName)} vs ${escapeHtml(p2.shortName)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>
        </div>
      </div>
    </section>
  `.trim();
}

function updateHomeIndexHtml() {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = replaceMarkerBlock(html, 'SSR_HEAD', buildHomeHeadBlock());
  html = replaceMarkerBlock(
    html,
    'SSR_ARC',
    buildPoliticalArcSvg({ selectedPartyId: 'psoe', interactive: true })
  );
  html = replaceMarkerBlock(html, 'SSR_PARTY_DETAIL', renderPartyDetailHtml(getParty('psoe')));
  html = replaceMarkerBlock(html, 'SSR_PARTY_GRID', renderHomePartyGridHtml());
  html = replaceMarkerBlock(html, 'SSR_TERRITORIAL_GRID', renderHomeTerritorialGridHtml());
  html = replaceMarkerBlock(html, 'SSR_SIMILARITY_PANEL', renderSimilarityPanelHtml('vivienda', 'psoe', 'pp'));
  html = replaceMarkerBlock(html, 'SSR_PROPOSALS_GRID', renderProposalsByAxisHtml('vivienda'));
  html = replaceMarkerBlock(html, 'SSR_EXPRESSION_GRID', renderExpressionGridHtml());
  html = replaceMarkerBlock(html, 'SSR_INTERVIEWS_GRID', renderInterviewCardsHtml(DATA.interviews));
  html = replaceMarkerBlock(html, 'SSR_QUIZ_PREVIEW', renderQuizSemanticPreviewHtml());
  html = replaceMarkerBlock(html, 'SSR_SEO_HUB', renderSeoHubHtml());
  writeFile(INDEX_PATH, html);
}

/* ================= PLANTILLA COMPARTIDA DE LANDINGS ESTÁTICAS ================= */

function renderStaticPage(opts) {
  const {
    urlPath,
    title,
    description,
    ogType = 'article',
    activeNav = '',
    breadcrumbs = [],
    hero = {},
    mainHtml = '',
    extraSchemas = [],
  } = opts;

  const normalizedPath = urlPath === '/' ? '/' : urlPath.replace(/\/$/, '');
  const canonicalUrl = `${SITE_URL}${normalizedPath}`;
  const ogImage = `${SITE_URL}/og-banner.png`;

  const breadcrumbListSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((bc, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: bc.name,
      item: `${SITE_URL}${bc.url === '/' ? '/' : bc.url}`,
    })),
  };

  const webPageSchema = {
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    inLanguage: 'es-ES',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [webPageSchema, breadcrumbListSchema, ...extraSchemas],
  };

  const breadcrumbHtml = breadcrumbs
    .map((bc, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      if (isLast) {
        return `<span aria-current="page">${escapeHtml(bc.name)}</span>`;
      }
      return `<a href="${escapeHtml(bc.url)}">${escapeHtml(bc.name)}</a> <span aria-hidden="true">/</span>`;
    })
    .join(' ');

  const navItems = [
    { id: 'home', href: '/', label: 'Arco y Comunicación' },
    { id: 'comparador', href: '/comparador', label: 'Comparador (8 Ejes)' },
    { id: 'entrevistas', href: '/entrevistas', label: 'Entrevistas (Sin Opinión)' },
    { id: 'territorios', href: '/territorios', label: 'Territorios' },
    { id: 'test', href: '/test-afinidad', label: 'Test 10 Escenarios', accent: true },
  ];

  const navHtml = navItems
    .map((item) => {
      const classes = ['nav-pill'];
      if (item.accent) classes.push('nav-pill-accent');
      if (activeNav === item.id) classes.push('is-active');
      return `<a class="${classes.join(' ')}" href="${escapeHtml(item.href)}" style="text-decoration:none;">${escapeHtml(item.label)}</a>`;
    })
    .join('\n        ');

  const heroChipsHtml =
    Array.isArray(hero.chips) && hero.chips.length > 0
      ? `<div class="neutrality-chips" style="margin-top:12px;">${hero.chips
          .map((ch) => `<span class="chip">${escapeHtml(ch)}</span>`)
          .join('')}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="es-ES" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="geo.region" content="ES" />
  <meta name="geo.placename" content="España" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(SITE_URL)}/llms.txt" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="PolitiFácil 29-N" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  <link rel="stylesheet" href="/styles.css" />
  <script>
    (function () {
      try {
        var raw = window.localStorage.getItem('politifacil_29n_state_v1');
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (parsed && parsed.theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch (e) {}
    })();
  </script>
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand-block" href="/" style="text-decoration:none; color:inherit;">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 36 24" width="36" height="24" fill="none">
            <path d="M4 20 A14 14 0 0 1 32 20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
            <circle cx="9" cy="14" r="2.2" fill="#7c3aed"/>
            <circle cx="13" cy="9" r="2.2" fill="#d97706"/>
            <circle cx="18" cy="7" r="2.2" fill="#dc2626"/>
            <circle cx="24" cy="9" r="2.2" fill="#0284c7"/>
            <circle cx="28" cy="14" r="2.2" fill="#16a34a"/>
          </svg>
        </div>
        <div>
          <span class="brand-title">PolitiFácil <span class="brand-badge">29-N</span></span>
          <p class="brand-subtitle">España · Elecciones Generales 29 de noviembre de 2026</p>
        </div>
      </a>

      <nav class="main-nav" aria-label="Secciones principales">
        ${navHtml}
      </nav>

      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="Cambiar tema claro u oscuro" title="Cambiar tema claro u oscuro">
          <span id="theme-icon" aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </header>

  <section class="neutrality-banner" aria-label="Compromiso de neutralidad">
    <div class="container neutrality-inner">
      <div class="neutrality-chips">
        <span class="chip chip-neutral">✓ Solo fuentes oficiales de partidos</span>
        <span class="chip chip-neutral">✓ Cero columnas de opinión</span>
        <span class="chip chip-neutral">✓ Citas textuales de entrevistas</span>
        <span class="chip chip-neutral">✓ Datos verificados 29-N</span>
      </div>
      <div class="countdown-pill">29 de noviembre de 2026 · ${DATA.meta.seatsCongress} escaños al Congreso</div>
    </div>
  </section>

  <main id="main-content" class="container main-shell">
    <nav class="breadcrumb-nav" aria-label="Migas de pan">
      ${breadcrumbHtml}
    </nav>

    <section class="static-page-hero">
      ${hero.eyebrow ? `<span class="eyebrow">${escapeHtml(hero.eyebrow)}</span>` : ''}
      <h1>${escapeHtml(hero.h1 || title)}</h1>
      ${hero.lead ? `<p class="section-lead">${escapeHtml(hero.lead)}</p>` : ''}
      ${heroChipsHtml}
    </section>

    ${mainHtml}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <strong>PolitiFácil 29-N</strong> — Herramienta cívica informativa sin afiliación partidista.
        <p class="muted-text">Datos contrastados con programas oficiales y declaraciones literales en entrevistas periodísticas (${escapeHtml(DATA.meta.decree)}).</p>
      </div>
      <div class="footer-links">
        <a class="btn btn-ghost btn-sm" href="/">Inicio</a>
        <a class="btn btn-ghost btn-sm" href="/comparador">Comparador</a>
        <a class="btn btn-ghost btn-sm" href="/entrevistas">Entrevistas</a>
        <a class="btn btn-ghost btn-sm" href="/test-afinidad">Test 10 Escenarios</a>
        <a class="btn btn-ghost btn-sm" href="/territorios">Territorios</a>
        <a class="btn btn-ghost btn-sm" href="/comparar">Duelos VS</a>
      </div>
    </div>
  </footer>

  <script>
    (function () {
      var KEY = 'politifacil_29n_state_v1';
      function readState() {
        try {
          var parsed = JSON.parse(window.localStorage.getItem(KEY) || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
          return {};
        }
      }
      function applyTheme(theme) {
        var norm = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', norm);
        var icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = norm === 'dark' ? '☀' : '◐';
      }
      var st = readState();
      applyTheme(st.theme);
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', function () {
          var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
          var next = current === 'dark' ? 'light' : 'dark';
          var latest = readState();
          latest.theme = next;
          try {
            window.localStorage.setItem(KEY, JSON.stringify(latest));
          } catch (e) {}
          applyTheme(next);
        });
      }
    })();
  </script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

/* ================= GENERADORES DE LANDINGS ESTÁTICAS ================= */

function buildCtaBannerCard({ eyebrow, title, text, primaryHref, primaryLabel, secondaryHref, secondaryLabel }) {
  return `
    <section class="cta-banner-card">
      <div>
        ${eyebrow ? `<span class="eyebrow">${escapeHtml(eyebrow)}</span>` : ''}
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn btn-primary" href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a>
        ${secondaryHref ? `<a class="btn" href="${escapeHtml(secondaryHref)}">${escapeHtml(secondaryLabel)}</a>` : ''}
      </div>
    </section>
  `.trim();
}

function generateComparadorLanding() {
  const axesBlocks = DATA.axes
    .map((axis) => {
      const comp = DATA.axisComparisons[axis.id];
      return `
      <article class="card" style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div>
            <span class="eyebrow">Eje Programático</span>
            <h2>${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</h2>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn-sm btn-primary" href="/propuestas/${escapeHtml(axis.id)}">Ver las 6 propuestas completas →</a>
            <a class="btn btn-sm" href="/?section=comparador&amp;axis=${escapeHtml(axis.id)}">Comparar a ciegas</a>
          </div>
        </div>
        <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom:0;">
          <div class="sim-card sim-card-converge">
            <h3>Similitudes principales</h3>
            <ul>
              ${comp.similarities.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="sim-card sim-card-diverge">
            <h3>Diferencias clave</h3>
            <ul>
              ${comp.differences.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </article>`;
    })
    .join('\n');

  const cta = buildCtaBannerCard({
    eyebrow: 'Modo Sin Sesgos',
    title: 'Prueba el Comparador Interactivo a Ciegas',
    text: 'Oculta los nombres y colores de los partidos, marca las medidas que más te convenzan en cada uno de los 8 ejes y descubre al final con qué programa coincides más.',
    primaryHref: '/?section=comparador',
    primaryLabel: 'Abrir Comparador Interactivo a Ciegas →',
    secondaryHref: '/comparar',
    secondaryLabel: 'Ver los 15 duelos cara a cara (VS)',
  });

  const html = renderStaticPage({
    urlPath: '/comparador',
    title: 'Comparador de Programas Electorales 29-N (8 Ejes) | PolitiFácil 29-N',
    description:
      'Índice completo de similitudes y diferencias entre Podemos, Frente Amplio, PSOE, PP, VOX y SALF en los 8 ejes oficiales de las Elecciones Generales 29-N en España.',
    activeNav: 'comparador',
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Comparador de Propuestas', url: '/comparador' },
    ],
    hero: {
      eyebrow: 'Programas Oficiales · 8 Ejes Temáticos',
      h1: 'Comparador de Programas Electorales 29-N: Similitudes y Diferencias',
      lead: 'Recorre los 8 bloques temáticos oficiales de la campaña del 29 de noviembre de 2026 con las convergencias y divergencias exactas entre los 6 partidos de ámbito estatal.',
      chips: ['6 Partidos Estatales', '8 Ejes Temáticos', 'Fuentes Verificadas', 'Modo a Ciegas Disponible'],
    },
    mainHtml: `${axesBlocks}\n${cta}`,
  });

  writeFile(path.join(PUBLIC_DIR, 'comparador.html'), html);
}

function generateEntrevistasLanding() {
  const quotationSchemas = DATA.interviews.map((iv) => ({
    '@type': 'Quotation',
    text: iv.quote,
    spokenByCharacter: {
      '@type': 'Person',
      name: iv.candidate,
    },
    citation: `${iv.media} (${iv.program}, ${iv.date})`,
    url: iv.sourceUrl,
  }));

  const expSection = `
    <section class="card expression-matrix-card">
      <div class="matrix-header">
        <h2>Radiografía Expresiva de los 6 Candidatos en Entrevista</h2>
        <p class="muted-text">Análisis descriptivo y neutral de tono, registro y estrategia comunicativa ante periodistas y entrevistadores.</p>
      </div>
      <div class="expression-grid">
        ${renderExpressionGridHtml()}
      </div>
    </section>
  `.trim();

  const quotesSection = `
    <section aria-label="Archivo completo de citas literales">
      <div style="margin-bottom:14px;">
        <h2>${DATA.interviews.length} Declaraciones Literales en Prensa, Radio, TV y Pódcasts</h2>
        <p class="muted-text">Sin valoraciones ni tertulianos: pregunta o contexto de emisión, cita textual entrecomillada y enlace al medio original.</p>
      </div>
      <div class="interviews-grid">
        ${renderInterviewCardsHtml(DATA.interviews)}
      </div>
    </section>
  `.trim();

  const cta = buildCtaBannerCard({
    eyebrow: 'Filtro Interactivo',
    title: 'Filtra las Entrevistas por Candidato, Formato o Tema',
    text: 'Usa el buscador interactivo de PolitiFácil 29-N para cruzar declaraciones por medio (Prensa Escrita, Radio/TV o Pódcast/Entretenimiento) o palabra clave.',
    primaryHref: '/?section=entrevistas',
    primaryLabel: 'Abrir Hemeroteca Interactiva →',
    secondaryHref: '/test-afinidad',
    secondaryLabel: 'Ir al Test de 10 Escenarios',
  });

  const html = renderStaticPage({
    urlPath: '/entrevistas',
    title: 'Entrevistas a Candidatos 29-N: Citas Literales Sin Opinión | PolitiFácil 29-N',
    description: `Archivo neutral con ${DATA.interviews.length} declaraciones literales de Pedro Sánchez, Feijóo, Abascal, Ada Colau, Irene Montero, Alvise Pérez, Rufián y Aitor Esteban en las elecciones del 29-N.`,
    activeNav: 'entrevistas',
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Entrevistas (Sin Opinión)', url: '/entrevistas' },
    ],
    hero: {
      eyebrow: 'Cero Columnas de Opinión · Citas Textuales',
      h1: 'En Sus Propias Palabras: Entrevistas Electorales 29-N',
      lead: 'Recopilación de entrevistas reales en prensa escrita, radio, televisión y pódcasts de campaña. Solo la pregunta, la respuesta literal y el estilo expresivo.',
      chips: [`${DATA.interviews.length} Declaraciones Literales`, 'Prensa, Radio, TV y Pódcasts', '0 Tertulias de Opinión'],
    },
    mainHtml: `${expSection}\n${quotesSection}\n${cta}`,
    extraSchemas: quotationSchemas,
  });

  writeFile(path.join(PUBLIC_DIR, 'entrevistas.html'), html);
}

function generateTestLanding() {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const methodologyHtml = `
    <section class="card" style="margin-bottom:20px;">
      <h2>Metodología Neutral de la Brújula Electoral 29-N</h2>
      <p class="muted-text" style="margin-bottom:12px;">
        El test plantea <strong>${DATA.quizQuestions.length} escenarios prácticos</strong> sin siglas ni colores para evitar sesgos de marca. Las 5 respuestas de cada escenario aparecen barajadas aleatoriamente en la versión interactiva y se corresponden con posiciones reales recogidas en los programas oficiales.
      </p>
      <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:0;">
        <div class="sim-card">
          <h3>1. Escala 0–100</h3>
          <p class="muted-text">Cada elección sitúa tu preferencia en el arco continuo de Izquierda (0) a Centro (50) y Derecha (100).</p>
        </div>
        <div class="sim-card">
          <h3>2. Ponderación Transparente</h3>
          <p class="muted-text">La afinidad por partido combina en un 72 % la coincidencia directa con cada medida y en un 28 % la proximidad global en el arco.</p>
        </div>
        <div class="sim-card">
          <h3>3. Temas Prioritarios (×2)</h3>
          <p class="muted-text">Puedes marcar cualquier escenario como prioritario para tu voto, duplicando su peso en el cálculo final.</p>
        </div>
      </div>
    </section>
  `.trim();

  const ctaTop = buildCtaBannerCard({
    eyebrow: 'Sin Siglas · Sin Registro',
    title: 'Realiza el Test Interactivo y Descubre tu Posición en el Arco',
    text: 'Responde a los 10 escenarios paso a paso en tu navegador. Tus respuestas se calculan localmente sin enviar datos personales a ningún servidor.',
    primaryHref: '/?section=test-afinidad',
    primaryLabel: 'Comenzar Test Interactivo de 10 Escenarios →',
    secondaryHref: '/?section=comparador',
    secondaryLabel: 'O probar el Comparador a Ciegas',
  });

  const scenariosHtml = `
    <section class="card" style="margin-top:20px;">
      <h2 style="margin-bottom:6px;">Los ${DATA.quizQuestions.length} Escenarios del Test (Sin Nombres de Partido)</h2>
      <p class="muted-text" style="margin-bottom:16px;">Consulta previamente los dilemas que aborda la brújula y los ejes programáticos vinculados.</p>
      ${DATA.quizQuestions
        .map(
          (q, qi) => `
        <article class="scenario-box" style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span class="chip">Escenario ${qi + 1} · ${escapeHtml(q.axisLabel)}</span>
            <a class="source-link" href="/propuestas/${escapeHtml(q.axisId)}" style="font-size:0.82rem;">Ver propuestas del eje →</a>
          </div>
          <h3 class="scenario-title">${escapeHtml(q.title)}</h3>
          <p style="margin:0 0 10px 0;">${escapeHtml(q.scenario)}</p>
          <ol style="margin:0; padding-left:20px; display:grid; gap:6px; font-size:0.86rem; color:var(--text-muted);">
            ${q.options.map((o, oi) => `<li><strong>Opción ${letters[oi] || oi + 1}:</strong> ${escapeHtml(o.text)}</li>`).join('')}
          </ol>
        </article>`
        )
        .join('\n')}
    </section>
  `.trim();

  const html = renderStaticPage({
    urlPath: '/test-afinidad',
    title: 'Test Electoral 29-N: Brújula de 10 Escenarios en España | PolitiFácil 29-N',
    description:
      'Metodología y guía completa de los 10 escenarios sin siglas del test de afinidad política para las Elecciones Generales en España del 29 de noviembre de 2026.',
    activeNav: 'test',
    breadcrumbs: [
      { name: 'Inicio', url: '/' },
      { name: 'Test de 10 Escenarios', url: '/test-afinidad' },
    ],
    hero: {
      eyebrow: 'Brújula Electoral · Escala 0–100',
      h1: 'Test de Afinidad 29-N: 10 Escenarios Reales Sin Nombres de Partido',
      lead: 'Comprueba cómo calcula PolitiFácil 29-N tu afinidad programática en vivienda, economía, empleo, sanidad, pensiones, modelo territorial, defensa, ecología e igualdad.',
      chips: ['10 Escenarios Sin Sesgos', 'Escala 0 Izquierda — 100 Derecha', 'Cálculo 100 % Local'],
    },
    mainHtml: `${methodologyHtml}\n${ctaTop}\n${scenariosHtml}`,
  });

  writeFile(path.join(PUBLIC_DIR, 'test-afinidad.html'), html);
}

const AXIS_INTERVIEW_KEYWORDS = {
  vivienda: ['vivienda', 'alquiler', 'okupa', 'ocupación', 'turísticos', 'inmobiliario', 'fondos buitre', 'hipotequé', 'aticazos', 'propietario'],
  economia: ['autónomos', 'trabajadores', 'coste de la vida', 'carne', 'pescado', 'comida', 'huelga', 'fallo sistémico', 'fiscal'],
  empleo: ['autónomos', 'trabajadores', 'huelga', 'despido', 'jornada', 'paro', 'salario'],
  servicios: ['pensiones', 'sanidad', 'educación', 'ferroviario', 'accidente', 'incendios', 'laicidad', 'oficios religiosos', 'huelga'],
  territorial: ['cataluña', 'catalunya', 'parlamento', 'gobernabilidad', 'pactos', 'unidad de izquierdas'],
  seguridad: ['inmigración', 'ceuta', 'defensa', 'armas', 'pulseras', 'mafias', 'voto por correo'],
  ecologia: ['incendios', 'ferroviario', 'transporte', 'carne', 'pescado', 'agua', 'campo', 'nuclear', 'climátic'],
  regeneracion: ['corrupción', 'igualdad', 'aborto', 'muerte digna', 'derechos', 'autocrítica', 'primarias', 'encuestas', 'voto por correo', 'institucional', 'pulseras', 'ábalos', 'marcial dorado'],
};

function getInterviewsForAxis(axisId) {
  const keywords = AXIS_INTERVIEW_KEYWORDS[axisId] || [];
  return DATA.interviews.filter((iv) => {
    const haystack = [iv.topic, iv.questionContext, iv.quote].join(' ').toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });
}

function generateAxisLandings() {
  const proposalsDir = path.join(PUBLIC_DIR, 'propuestas');
  ensureDir(proposalsDir);

  DATA.axes.forEach((axis) => {
    const comp = DATA.axisComparisons[axis.id];
    const axisInterviews = getInterviewsForAxis(axis.id);
    const axisQuestions = DATA.quizQuestions.filter((q) => q.axisId === axis.id);
    const otherAxes = DATA.axes.filter((a) => a.id !== axis.id);
    const letters = ['A', 'B', 'C', 'D', 'E'];

    const simSection = `
      <section class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="sim-card sim-card-converge">
          <h2>En qué se parecen (${escapeHtml(axis.label)})</h2>
          <ul>
            ${comp.similarities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="sim-card sim-card-diverge">
          <h2>En qué se diferencian</h2>
          <ul>
            ${comp.differences.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      </section>
    `.trim();

    const proposalsSection = `
      <section style="margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <h2>Propuestas de los 6 Partidos Estatales en ${escapeHtml(axis.label)}</h2>
          <p class="muted-text">Ordenadas de izquierda a derecha en el arco parlamentario, con enlace directo a la fuente oficial de cada programa.</p>
        </div>
        <div class="proposals-grid">
          ${renderProposalsByAxisHtml(axis.id)}
        </div>
      </section>
    `.trim();

    const interviewsSection =
      axisInterviews.length > 0
        ? `
      <section style="margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <h2>Declaraciones Literales en Entrevistas Relacionadas con ${escapeHtml(axis.label)}</h2>
          <p class="muted-text">Extractos textuales verificados en medios de comunicación durante la campaña 29-N.</p>
        </div>
        <div class="interviews-grid">
          ${renderInterviewCardsHtml(axisInterviews)}
        </div>
      </section>`
        : '';

    const quizSection =
      axisQuestions.length > 0
        ? `
      <section class="card" style="margin-bottom:24px;">
        <h2>Escenario del Test 29-N sobre ${escapeHtml(axis.label)}</h2>
        <p class="muted-text" style="margin-bottom:14px;">Así se plantea este bloque en el test a ciegas sin siglas ni colores de partido.</p>
        ${axisQuestions
          .map(
            (q) => `
          <article class="scenario-box" style="margin-bottom:12px;">
            <span class="chip">${escapeHtml(q.axisLabel)}</span>
            <h3 class="scenario-title">${escapeHtml(q.title)}</h3>
            <p style="margin:0 0 10px 0;">${escapeHtml(q.scenario)}</p>
            <ol style="margin:0; padding-left:20px; display:grid; gap:5px; font-size:0.86rem; color:var(--text-muted);">
              ${q.options.map((o, oi) => `<li><strong>Opción ${letters[oi] || oi + 1}:</strong> ${escapeHtml(o.text)}</li>`).join('')}
            </ol>
          </article>`
          )
          .join('\n')}
      </section>`
        : '';

    const cta = buildCtaBannerCard({
      eyebrow: `Lectura a Ciegas · ${axis.label}`,
      title: `Compara ${axis.label} en Modo a Ciegas`,
      text: 'Abre directamente este eje en el comparador interactivo ocultando siglas y colores para evaluar las medidas sin prejuicios.',
      primaryHref: `/?section=comparador&axis=${axis.id}`,
      primaryLabel: 'Comparar este eje en Modo a Ciegas →',
      secondaryHref: '/?section=test-afinidad',
      secondaryLabel: 'Hacer el Test de 10 Escenarios',
    });

    const otherAxesHtml = `
      <section class="card" style="margin-top:24px;">
        <h3>Explorar los otros 7 ejes del 29-N</h3>
        <div class="tag-cloud" style="margin-top:10px;">
          ${otherAxes
            .map(
              (ax) =>
                `<a class="btn btn-sm" href="/propuestas/${escapeHtml(ax.id)}">${escapeHtml(ax.icon)} ${escapeHtml(ax.label)}</a>`
            )
            .join('\n          ')}
        </div>
      </section>
    `.trim();

    const html = renderStaticPage({
      urlPath: `/propuestas/${axis.id}`,
      title: `${axis.label}: Qué propone cada partido (Elecciones 29-N) | PolitiFácil 29-N`,
      description: `Comparativa neutral de propuestas oficiales sobre ${axis.label} entre Podemos, Frente Amplio, PSOE, PP, VOX y SALF para las Elecciones Generales del 29 de noviembre de 2026.`,
      activeNav: 'comparador',
      breadcrumbs: [
        { name: 'Inicio', url: '/' },
        { name: 'Comparador', url: '/comparador' },
        { name: axis.label, url: `/propuestas/${axis.id}` },
      ],
      hero: {
        eyebrow: `${axis.icon} Eje Programático 29-N`,
        h1: `${axis.label}: Qué propone cada partido en las Elecciones 29-N`,
        lead: `Similitudes, diferencias y medidas oficiales de las 6 formaciones estatales en ${axis.label}, contrastadas con sus fuentes documentales y citas en campaña.`,
        chips: ['6 Propuestas Oficiales', 'Similitudes y Diferencias', '0 Opinión'],
      },
      mainHtml: `${simSection}\n${proposalsSection}\n${interviewsSection}\n${quizSection}\n${cta}\n${otherAxesHtml}`,
    });

    writeFile(path.join(proposalsDir, `${axis.id}.html`), html);
  });
}

function generatePartyLandings() {
  const partidosDir = path.join(PUBLIC_DIR, 'partidos');
  ensureDir(partidosDir);

  DATA.parties.forEach((party) => {
    const comm = party.officialCommunication;
    const partyInterviews = DATA.interviews.filter((iv) => iv.partyId === party.id);
    const otherParties = DATA.parties.filter((p) => p.id !== party.id);

    const profileCard = `
      <section class="card" style="margin-bottom:22px; border-top:4px solid ${escapeHtml(party.color)};">
        <div class="arc-layout">
          <div class="arc-svg-wrap">
            ${buildPoliticalArcSvg({ selectedPartyId: party.id, interactive: false })}
          </div>
          <div>
            <div class="detail-header">
              <div>
                <div class="party-badge-pill">
                  <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
                  <span>${escapeHtml(party.name)} (${escapeHtml(party.shortName)})</span>
                </div>
                <p class="muted-text">Candidatura: <strong>${escapeHtml(party.candidate)}</strong> · ${escapeHtml(party.ideologyLabel)}</p>
              </div>
              <a class="btn btn-sm btn-primary" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer">Web oficial ↗</a>
            </div>
            <p style="margin:0 0 12px 0;">${escapeHtml(party.summary)}</p>
            <div class="axis-meter">
              <div class="meter-row">
                <span>Eje Izq → Der</span>
                <div class="meter-track">
                  <div class="meter-fill" style="width:${party.spectrumScore}%; background:${escapeHtml(party.color)};"></div>
                </div>
                <strong>${party.spectrumScore}/100</strong>
              </div>
              <div class="meter-row">
                <span>Interv. Estatal</span>
                <div class="meter-track">
                  <div class="meter-fill" style="width:${100 - party.economicAxis}%; background:${escapeHtml(party.color)};"></div>
                </div>
                <strong>${100 - party.economicAxis}/100</strong>
              </div>
              <div class="meter-row">
                <span>Eje Social-Terr.</span>
                <div class="meter-track">
                  <div class="meter-fill" style="width:${party.socialTerritorialAxis}%; background:${escapeHtml(party.color)};"></div>
                </div>
                <strong>${party.socialTerritorialAxis}/100</strong>
              </div>
            </div>
            ${
              party.secondaryUrl
                ? `<p class="muted-text" style="margin-top:8px;">Portal institucional secundario: <a class="source-link" href="${escapeHtml(party.secondaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(party.secondaryUrl)} ↗</a></p>`
                : ''
            }
          </div>
        </div>
      </section>
    `.trim();

    const commSection = `
      <section class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); margin-bottom:24px;">
        <div class="card">
          <h2>Comunicación Oficial de Campaña</h2>
          <ul class="comm-list" style="margin-top:10px;">
            <li><strong>Eslóganes:</strong> ${comm.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
            <li><strong>Tono y registro:</strong> ${escapeHtml(comm.tone)}</li>
            <li><strong>Encuadre (framing):</strong> ${escapeHtml(comm.framing)}</li>
            <li><strong>Canales prioritarios:</strong> ${escapeHtml(comm.channels)}</li>
          </ul>
          <div class="tag-cloud" style="margin-top:12px;">
            ${comm.keywords.map((kw) => `<span class="tag"># ${escapeHtml(kw)}</span>`).join('')}
          </div>
        </div>
        <div class="card">
          <h2>Estilo de Expresión de ${escapeHtml(party.candidate)} en Entrevistas</h2>
          <p style="margin-top:10px;">${escapeHtml(party.interviewStyle.summary)}</p>
          <div class="comm-box">
            <h4>Registro discursivo</h4>
            <p class="muted-text">${escapeHtml(party.interviewStyle.register)}</p>
          </div>
        </div>
      </section>
    `.trim();

    const proposalsSection = `
      <section style="margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <h2>Programa Completo de ${escapeHtml(party.shortName)} en los 8 Ejes Oficiales</h2>
          <p class="muted-text">Medidas detalladas bloque por bloque con enlace directo al eje comparado y a la fuente oficial del partido.</p>
        </div>
        <div class="proposals-grid">
          ${DATA.axes
            .map((axis) => {
              const prop = party.proposals[axis.id];
              return `
            <article class="card proposal-card" style="--party-color:${escapeHtml(party.color)}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="chip">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</span>
                <a class="source-link" href="/propuestas/${escapeHtml(axis.id)}" style="font-size:0.78rem;">Comparar eje →</a>
              </div>
              <div class="proposal-headline">${escapeHtml(prop.headline)}</div>
              <ul class="proposal-points">
                ${prop.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
              </ul>
              <div class="proposal-footer">
                <a class="source-link" href="${escapeHtml(prop.sourceUrl || party.officialUrl)}" target="_blank" rel="noopener noreferrer">Fuente: ${escapeHtml(prop.sourceLabel || party.officialUrl)} ↗</a>
              </div>
            </article>`;
            })
            .join('\n')}
        </div>
      </section>
    `.trim();

    const interviewsSection =
      partyInterviews.length > 0
        ? `
      <section style="margin-bottom:24px;">
        <div style="margin-bottom:14px;">
          <h2>Entrevistas Literales de ${escapeHtml(party.candidate)} (${partyInterviews.length})</h2>
          <p class="muted-text">Todas las declaraciones textuales recogidas en hemeroteca para esta candidatura.</p>
        </div>
        <div class="interviews-grid">
          ${renderInterviewCardsHtml(partyInterviews)}
        </div>
      </section>`
        : '';

    const duelsSection = `
      <section class="card" style="margin-bottom:24px;">
        <h2>Duelos Cara a Cara de ${escapeHtml(party.shortName)} frente a Otros Partidos</h2>
        <p class="muted-text" style="margin-bottom:12px;">Contrasta bloque a bloque el programa de ${escapeHtml(party.shortName)} frente a cada una de las demás candidaturas estatales.</p>
        <div class="tag-cloud">
          ${otherParties
            .map((other) => {
              const slug = getDuelSlug(party.id, other.id);
              const dist = Math.abs(party.spectrumScore - other.spectrumScore);
              return `<a class="btn btn-sm" href="/comparar/${escapeHtml(slug)}">${escapeHtml(party.shortName)} vs ${escapeHtml(other.shortName)} (${dist} pts)</a>`;
            })
            .join('\n          ')}
        </div>
      </section>
    `.trim();

    const cta = buildCtaBannerCard({
      eyebrow: 'Contraste Sin Sesgos',
      title: `Compara a ${party.shortName} en la App Interactiva`,
      text: 'Pon a prueba tus prioridades en el Test de 10 Escenarios o compara los 8 ejes en Modo a Ciegas para contrastar afinidad sin etiquetas.',
      primaryHref: `/?section=comparador&left=${party.id}&blind=0`,
      primaryLabel: `Comparar propuestas de ${party.shortName} →`,
      secondaryHref: '/?section=test-afinidad',
      secondaryLabel: 'Hacer el Test de 10 Escenarios',
    });

    const partySchema = {
      '@type': 'PoliticalParty',
      name: party.name,
      alternateName: party.shortName,
      url: `${SITE_URL}/partidos/${party.id}`,
      sameAs: [party.officialUrl, party.secondaryUrl].filter(Boolean),
      description: party.summary,
      member: {
        '@type': 'Person',
        name: party.candidate,
      },
    };

    const html = renderStaticPage({
      urlPath: `/partidos/${party.id}`,
      title: `${party.shortName} (${party.candidate}): Programa 29-N y Entrevistas | PolitiFácil 29-N`,
      description: `Ficha completa de ${party.name} (${party.shortName}) y ${party.candidate} para las Elecciones Generales 29-N: posición ${party.spectrumScore}/100 en el arco político, propuestas en 8 ejes, estilo comunicativo y citas literales.`,
      activeNav: 'home',
      breadcrumbs: [
        { name: 'Inicio', url: '/' },
        { name: `${party.shortName} (${party.candidate})`, url: `/partidos/${party.id}` },
      ],
      hero: {
        eyebrow: `${party.ideologyLabel} · Arco ${party.spectrumScore}/100`,
        h1: `${party.name} (${party.shortName}) — Programa 29-N y Candidatura de ${party.candidate}`,
        lead: party.summary,
        chips: [`Candidato/a: ${party.candidate}`, `Arco: ${party.spectrumScore}/100`, '8 Ejes Programáticos', `${partyInterviews.length} Citas Literales`],
      },
      mainHtml: `${profileCard}\n${commSection}\n${proposalsSection}\n${interviewsSection}\n${duelsSection}\n${cta}`,
      extraSchemas: [partySchema],
    });

    writeFile(path.join(partidosDir, `${party.id}.html`), html);
  });
}

function generateTerritorialLandings() {
  const territoriosDir = path.join(PUBLIC_DIR, 'territorios');
  ensureDir(territoriosDir);

  const arithmeticCard = `
    <section class="card" style="margin-bottom:22px;">
      <h2>Aritmética Parlamentaria del 29-N: Por qué Deciden los Partidos Territoriales</h2>
      <p style="margin:8px 0 14px 0;">
        De acuerdo con el <strong>${escapeHtml(DATA.meta.decree)}</strong>, el 29 de noviembre de 2026 están llamados a las urnas <strong>${DATA.meta.electoralCensus.toLocaleString('es-ES')} electores</strong> para elegir <strong>${DATA.meta.seatsCongress} escaños en el Congreso de los Diputados</strong> y <strong>${DATA.meta.seatsSenate} en el Senado</strong>.
      </p>
      <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:0;">
        <div class="sim-card">
          <h3>Mayoría Absoluta: 176 Escaños</h3>
          <p class="muted-text">Para superar una investidura en primera votación hacen falta 176 votos afirmativos sobre 350 diputados (o más síes que noes en segunda votación).</p>
        </div>
        <div class="sim-card">
          <h3>Ley D’Hondt Provincial</h3>
          <p class="muted-text">Los escaños se asignan en 52 circunscripciones provinciales con barrera mínima del 3 %, favoreciendo a partidos fuertemente concentrados en un territorio.</p>
        </div>
        <div class="sim-card">
          <h3>Cataluña, Euskadi, Navarra y Galicia</h3>
          <p class="muted-text">ERC, Junts, EAJ-PNV, EH Bildu y BNG concentran representación decisiva tanto en la investidura como en cada votación presupuestaria o de leyes orgánicas.</p>
        </div>
      </div>
    </section>
  `.trim();

  const listCards = `
    <section>
      <div style="margin-bottom:14px;">
        <h2>Las ${(DATA.territorialParties || []).length} Formaciones Territoriales Analizadas</h2>
        <p class="muted-text">Prioridades programáticas, referentes y posición declarada ante la investidura del 29-N.</p>
      </div>
      <div class="territorial-grid">
        ${(DATA.territorialParties || [])
          .map(
            (tp) => `
          <article class="territorial-item" style="--party-color:${escapeHtml(tp.color)}; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <strong>${escapeHtml(tp.shortName)} · ${escapeHtml(tp.name)}</strong>
              <span class="chip">${escapeHtml(tp.territory)}</span>
            </div>
            <p class="muted-text" style="font-size:0.84rem;"><strong>Referente:</strong> ${escapeHtml(tp.candidate)} · ${escapeHtml(tp.spectrumLabel)}</p>
            <p style="margin:0; font-size:0.86rem;"><strong>Prioridades:</strong> ${escapeHtml(tp.priorities)}</p>
            <p class="muted-text" style="font-size:0.84rem;"><strong>Papel 29-N:</strong> ${escapeHtml(tp.parliamentaryRole)}</p>
            <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:8px; border-top:1px solid var(--border);">
              <a class="source-link" href="/territorios/${escapeHtml(tp.id)}">Ver ficha completa →</a>
              <a class="source-link" href="${escapeHtml(tp.officialUrl)}" target="_blank" rel="noopener noreferrer">Web oficial ↗</a>
            </div>
          </article>`
          )
          .join('\n')}
      </div>
    </section>
  `.trim();

  const ctaIndex = buildCtaBannerCard({
    eyebrow: 'Panorama Completo',
    title: 'Explora el Arco Político Estatal y Territoriales',
    text: 'Consulta en la vista principal la interacción entre las 6 candidaturas estatales y el tablero parlamentario completo.',
    primaryHref: '/?section=arco-overview',
    primaryLabel: 'Ir al Arco Político Interactivo →',
    secondaryHref: '/comparar',
    secondaryLabel: 'Comparar partidos estatales (VS)',
  });

  writeFile(
    path.join(territoriosDir, 'index.html'),
    renderStaticPage({
      urlPath: '/territorios',
      title: 'Partidos Territoriales y Aritmética Parlamentaria 29-N | PolitiFácil 29-N',
      description:
        'Análisis neutral de la Ley D’Hondt, los 350 escaños del Congreso y el papel decisivo de ERC, Junts, EAJ-PNV, EH Bildu y BNG en las elecciones del 29 de noviembre de 2026.',
      activeNav: 'territorios',
      breadcrumbs: [
        { name: 'Inicio', url: '/' },
        { name: 'Fuerzas Territoriales', url: '/territorios' },
      ],
      hero: {
        eyebrow: 'Aritmética Parlamentaria · Congreso 350 Escaños',
        h1: 'Partidos Territoriales Clave en las Elecciones Generales 29-N',
        lead: 'Cómo operan la mayoría absoluta de 176 escaños, la Ley D’Hondt y las prioridades de las formaciones de Cataluña, Euskadi, Navarra y Galicia.',
        chips: ['350 Escaños Congreso', 'Mayoría Absoluta: 176', 'Ley D’Hondt Provincial', '5 Fuerzas Territoriales'],
      },
      mainHtml: `${arithmeticCard}\n${listCards}\n${ctaIndex}`,
    })
  );

  (DATA.territorialParties || []).forEach((tp) => {
    const relatedInterviews = DATA.interviews.filter((iv) => iv.partyId === tp.id);
    const otherTerritorial = (DATA.territorialParties || []).filter((x) => x.id !== tp.id);

    const detailHtml = `
      <section class="card" style="margin-bottom:22px; border-left:5px solid ${escapeHtml(tp.color)};">
        <div class="detail-header">
          <div>
            <div class="party-badge-pill">
              <span class="color-swatch" style="background:${escapeHtml(tp.color)}"></span>
              <span>${escapeHtml(tp.name)} (${escapeHtml(tp.shortName)})</span>
            </div>
            <p class="muted-text">Territorio: <strong>${escapeHtml(tp.territory)}</strong> · Referente: <strong>${escapeHtml(tp.candidate)}</strong> · ${escapeHtml(tp.spectrumLabel)}</p>
          </div>
          <a class="btn btn-sm btn-primary" href="${escapeHtml(tp.officialUrl)}" target="_blank" rel="noopener noreferrer">Web oficial ↗</a>
        </div>

        <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom:0;">
          <div class="sim-card">
            <h2>Prioridades Programáticas</h2>
            <p style="margin-top:8px;">${escapeHtml(tp.priorities)}</p>
          </div>
          <div class="sim-card">
            <h2>Papel Decisivo en la Investidura 29-N</h2>
            <p style="margin-top:8px;">${escapeHtml(tp.parliamentaryRole)}</p>
          </div>
        </div>
      </section>
    `.trim();

    const ivSection =
      relatedInterviews.length > 0
        ? `
      <section style="margin-bottom:22px;">
        <h2 style="margin-bottom:12px;">Declaraciones Literales Recogidas de ${escapeHtml(tp.shortName)}</h2>
        <div class="interviews-grid">
          ${renderInterviewCardsHtml(relatedInterviews)}
        </div>
      </section>`
        : `
      <section class="card" style="margin-bottom:22px;">
        <h2>Declaraciones en Hemeroteca</h2>
        <p class="muted-text">Las posiciones recogidas de ${escapeHtml(tp.shortName)} para esta guía proceden de su documentación programática oficial en <a class="source-link" href="${escapeHtml(tp.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tp.officialUrl)} ↗</a>. Puedes consultar declaraciones literales de otros líderes en la <a class="source-link" href="/entrevistas">Hemeroteca de Entrevistas</a>.</p>
      </section>`;

    const navOthers = `
      <section class="card" style="margin-bottom:22px;">
        <h3>Otras fuerzas territoriales del 29-N</h3>
        <div class="tag-cloud" style="margin-top:10px;">
          <a class="btn btn-sm" href="/territorios">← Ver aritmética completa</a>
          ${otherTerritorial
            .map(
              (o) =>
                `<a class="btn btn-sm" href="/territorios/${escapeHtml(o.id)}">${escapeHtml(o.shortName)} (${escapeHtml(o.territory)})</a>`
            )
            .join('\n          ')}
        </div>
      </section>
    `.trim();

    const cta = buildCtaBannerCard({
      eyebrow: 'Tablero Electoral 29-N',
      title: 'Consulta el Arco Estatal y el Comparador de Propuestas',
      text: 'Contrasta cómo encajan las demandas territoriales con los programas de los 6 partidos estatales en el eje de Modelo Territorial y Financiación.',
      primaryHref: '/propuestas/territorial',
      primaryLabel: 'Ver eje Modelo Territorial y Financiación →',
      secondaryHref: '/?section=comparador&axis=territorial',
      secondaryLabel: 'Abrir eje en el Comparador',
    });

    const tpSchema = {
      '@type': 'PoliticalParty',
      name: tp.name,
      alternateName: tp.shortName,
      url: `${SITE_URL}/territorios/${tp.id}`,
      sameAs: [tp.officialUrl],
      description: `${tp.priorities} ${tp.parliamentaryRole}`,
      member: {
        '@type': 'Person',
        name: tp.candidate,
      },
    };

    writeFile(
      path.join(territoriosDir, `${tp.id}.html`),
      renderStaticPage({
        urlPath: `/territorios/${tp.id}`,
        title: `${tp.shortName} (${tp.territory}) en las Elecciones 29-N | PolitiFácil 29-N`,
        description: `Prioridades programáticas, referente (${tp.candidate}) y papel parlamentario de ${tp.name} (${tp.shortName}) en la investidura de las Elecciones Generales 29-N.`,
        activeNav: 'territorios',
        breadcrumbs: [
          { name: 'Inicio', url: '/' },
          { name: 'Territorios', url: '/territorios' },
          { name: tp.shortName, url: `/territorios/${tp.id}` },
        ],
        hero: {
          eyebrow: `${tp.territory} · ${tp.spectrumLabel}`,
          h1: `${tp.shortName} (${tp.name}) en las Elecciones 29-N — ${tp.territory}`,
          lead: `Referente: ${tp.candidate}. Prioridades territoriales y papel ante la investidura en un Congreso de ${DATA.meta.seatsCongress} escaños.`,
          chips: [tp.territory, tp.spectrumLabel, `Referente: ${tp.candidate}`],
        },
        mainHtml: `${detailHtml}\n${ivSection}\n${navOthers}\n${cta}`,
        extraSchemas: [tpSchema],
      })
    );
  });
}

function generateComparisonLandings() {
  const compararDir = path.join(PUBLIC_DIR, 'comparar');
  ensureDir(compararDir);
  const pairs = getAllDuelPairs();

  const indexCards = `
    <section>
      <div style="margin-bottom:16px;">
        <h2>Los ${pairs.length} Duelos Cara a Cara entre Partidos Estatales</h2>
        <p class="muted-text">Cada comparativa enfrenta punto por punto las propuestas de los 8 ejes oficiales, el tono de campaña y la distancia en el arco político.</p>
      </div>
      <div class="vs-comparison-grid">
        ${pairs
          .map(([p1, p2]) => {
            const dist = Math.abs(p1.spectrumScore - p2.spectrumScore);
            const slug = `${p1.id}-vs-${p2.id}`;
            return `
          <article class="vs-row-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="party-badge-pill"><span class="color-swatch" style="background:${escapeHtml(p1.color)}"></span>${escapeHtml(p1.shortName)}</span>
                <span class="vs-badge">VS</span>
                <span class="party-badge-pill"><span class="color-swatch" style="background:${escapeHtml(p2.color)}"></span>${escapeHtml(p2.shortName)}</span>
              </div>
              <span class="chip">Distancia: ${dist} pts</span>
            </div>
            <p class="muted-text" style="margin-bottom:12px;">
              ${escapeHtml(p1.candidate)} (${p1.spectrumScore}/100) frente a ${escapeHtml(p2.candidate)} (${p2.spectrumScore}/100) en vivienda, empleo, impuestos, sanidad, territorio, seguridad, ecología y regeneración.
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <a class="btn btn-sm btn-primary" href="/comparar/${escapeHtml(slug)}">Ver comparativa completa →</a>
              <a class="btn btn-sm" href="/?section=comparador&amp;left=${escapeHtml(p1.id)}&amp;right=${escapeHtml(p2.id)}&amp;blind=0">Duelo interactivo</a>
            </div>
          </article>`;
          })
          .join('\n')}
      </div>
    </section>
  `.trim();

  const indexCta = buildCtaBannerCard({
    eyebrow: 'Prefieres Decidir Sin Siglas',
    title: 'Abre el Comparador en Modo a Ciegas',
    text: 'Si no quieres dejarte influir por marcas partidistas, compara las 6 opciones mezcladas sin nombres y revela tus coincidencias al terminar.',
    primaryHref: '/?section=comparador',
    primaryLabel: 'Abrir Comparador a Ciegas →',
    secondaryHref: '/?section=test-afinidad',
    secondaryLabel: 'Hacer el Test de 10 Escenarios',
  });

  writeFile(
    path.join(compararDir, 'index.html'),
    renderStaticPage({
      urlPath: '/comparar',
      title: 'Comparativas Cara a Cara 29-N: 15 Duelos entre Partidos | PolitiFácil 29-N',
      description:
        'Todas las comparativas cara a cara entre Podemos, Frente Amplio, PSOE, PP, VOX y SALF en los 8 ejes oficiales de las Elecciones Generales 29-N.',
      activeNav: 'comparador',
      breadcrumbs: [
        { name: 'Inicio', url: '/' },
        { name: 'Comparativas Cara a Cara', url: '/comparar' },
      ],
      hero: {
        eyebrow: 'Programas Frente a Frente · 8 Ejes',
        h1: 'Comparativas Cara a Cara 29-N: Los 15 Duelos entre Partidos Estatales',
        lead: 'Selecciona cualquier pareja de candidaturas para contrastar su distancia ideológica, su estrategia comunicativa y sus propuestas bloque por bloque.',
        chips: ['15 Duelos Únicos', '8 Ejes Lado a Lado', 'Distancia en el Arco 0–100'],
      },
      mainHtml: `${indexCards}\n${indexCta}`,
    })
  );

  pairs.forEach(([p1, p2]) => {
    const slug = `${p1.id}-vs-${p2.id}`;
    const dist = Math.abs(p1.spectrumScore - p2.spectrumScore);
    const econDiff = Math.abs(p1.economicAxis - p2.economicAxis);
    const socialDiff = Math.abs(p1.socialTerritorialAxis - p2.socialTerritorialAxis);

    const overviewHtml = `
      <section class="card" style="margin-bottom:22px;">
        <div class="arc-layout">
          <div class="arc-svg-wrap">
            ${buildPoliticalArcSvg({ highlightPartyIds: [p1.id, p2.id], interactive: false })}
          </div>
          <div>
            <h2>Distancia Ideológica y Posicionamiento</h2>
            <p class="muted-text" style="margin-bottom:14px;">
              Separación en el espectro general izquierda-derecha: <strong>${dist} puntos sobre 100</strong> (${econDiff} puntos en eje económico y ${socialDiff} puntos en eje social-territorial).
            </p>
            <div style="display:grid; gap:12px;">
              <div class="comm-box" style="margin-top:0; border-left:4px solid ${escapeHtml(p1.color)};">
                <h4><a class="source-link" href="/partidos/${escapeHtml(p1.id)}">${escapeHtml(p1.shortName)} — ${escapeHtml(p1.candidate)}</a> (${p1.spectrumScore}/100)</h4>
                <p class="muted-text">${escapeHtml(p1.summary)}</p>
              </div>
              <div class="comm-box" style="margin-top:0; border-left:4px solid ${escapeHtml(p2.color)};">
                <h4><a class="source-link" href="/partidos/${escapeHtml(p2.id)}">${escapeHtml(p2.shortName)} — ${escapeHtml(p2.candidate)}</a> (${p2.spectrumScore}/100)</h4>
                <p class="muted-text">${escapeHtml(p2.summary)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `.trim();

    const toneContrastHtml = `
      <section class="card" style="margin-bottom:22px;">
        <h2 style="margin-bottom:12px;">Contraste de Comunicación Oficial y Entrevistas</h2>
        <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom:0;">
          <div class="sim-card" style="border-left:4px solid ${escapeHtml(p1.color)};">
            <h3>${escapeHtml(p1.shortName)} (${escapeHtml(p1.candidate)})</h3>
            <ul>
              <li><strong>Eslóganes:</strong> ${p1.officialCommunication.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
              <li><strong>Tono:</strong> ${escapeHtml(p1.officialCommunication.tone)}</li>
              <li><strong>Framing:</strong> ${escapeHtml(p1.officialCommunication.framing)}</li>
              <li><strong>En entrevistas:</strong> ${escapeHtml(p1.interviewStyle.summary)}</li>
            </ul>
          </div>
          <div class="sim-card" style="border-left:4px solid ${escapeHtml(p2.color)};">
            <h3>${escapeHtml(p2.shortName)} (${escapeHtml(p2.candidate)})</h3>
            <ul>
              <li><strong>Eslóganes:</strong> ${p2.officialCommunication.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
              <li><strong>Tono:</strong> ${escapeHtml(p2.officialCommunication.tone)}</li>
              <li><strong>Framing:</strong> ${escapeHtml(p2.officialCommunication.framing)}</li>
              <li><strong>En entrevistas:</strong> ${escapeHtml(p2.interviewStyle.summary)}</li>
            </ul>
          </div>
        </div>
      </section>
    `.trim();

    const axesVsHtml = `
      <section style="margin-bottom:22px;">
        <div style="margin-bottom:14px;">
          <h2>Comparativa Eje por Eje: ${escapeHtml(p1.shortName)} vs ${escapeHtml(p2.shortName)} (8 Ejes)</h2>
          <p class="muted-text">Contraste directo de titulares y medidas oficiales en cada bloque temático.</p>
        </div>
        <div class="vs-comparison-grid">
          ${DATA.axes
            .map((axis) => {
              const prop1 = p1.proposals[axis.id];
              const prop2 = p2.proposals[axis.id];
              return `
            <article class="vs-row-card">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                <h3>${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</h3>
                <a class="source-link" href="/propuestas/${escapeHtml(axis.id)}" style="font-size:0.82rem;">Ver los 6 partidos →</a>
              </div>
              <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:0;">
                <div class="sim-card" style="border-left:4px solid ${escapeHtml(p1.color)};">
                  <div class="party-badge-pill" style="margin-bottom:6px;">
                    <span class="color-swatch" style="background:${escapeHtml(p1.color)}"></span>
                    <span>${escapeHtml(p1.shortName)}</span>
                  </div>
                  <div class="proposal-headline">${escapeHtml(prop1.headline)}</div>
                  <ul class="proposal-points" style="margin-top:8px;">
                    ${prop1.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
                  </ul>
                  <p style="margin:8px 0 0 0; font-size:0.78rem;">
                    <a class="source-link" href="${escapeHtml(prop1.sourceUrl || p1.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(prop1.sourceLabel || p1.officialUrl)} ↗</a>
                  </p>
                </div>
                <div class="sim-card" style="border-left:4px solid ${escapeHtml(p2.color)};">
                  <div class="party-badge-pill" style="margin-bottom:6px;">
                    <span class="color-swatch" style="background:${escapeHtml(p2.color)}"></span>
                    <span>${escapeHtml(p2.shortName)}</span>
                  </div>
                  <div class="proposal-headline">${escapeHtml(prop2.headline)}</div>
                  <ul class="proposal-points" style="margin-top:8px;">
                    ${prop2.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
                  </ul>
                  <p style="margin:8px 0 0 0; font-size:0.78rem;">
                    <a class="source-link" href="${escapeHtml(prop2.sourceUrl || p2.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(prop2.sourceLabel || p2.officialUrl)} ↗</a>
                  </p>
                </div>
              </div>
            </article>`;
            })
            .join('\n')}
        </div>
      </section>
    `.trim();

    const cta = buildCtaBannerCard({
      eyebrow: 'Comparador Interactivo',
      title: `Abrir duelo ${p1.shortName} vs ${p2.shortName} en el Comparador`,
      text: 'Explora esta pareja directamente dentro de la herramienta interactiva de PolitiFácil 29-N o cambia en un clic al Modo Sin Sesgos.',
      primaryHref: `/?section=comparador&left=${p1.id}&right=${p2.id}&blind=0`,
      primaryLabel: 'Abrir duelo interactivo en el Comparador →',
      secondaryHref: '/comparar',
      secondaryLabel: 'Ver los otros 14 duelos VS',
    });

    writeFile(
      path.join(compararDir, `${slug}.html`),
      renderStaticPage({
        urlPath: `/comparar/${slug}`,
        title: `${p1.shortName} vs ${p2.shortName}: Comparativa de Programas 29-N | PolitiFácil 29-N`,
        description: `Comparativa cara a cara entre ${p1.name} (${p1.candidate}) y ${p2.name} (${p2.candidate}) en los 8 ejes oficiales, tono comunicativo y distancia de ${dist} puntos en el arco político del 29-N.`,
        activeNav: 'comparador',
        breadcrumbs: [
          { name: 'Inicio', url: '/' },
          { name: 'Comparar', url: '/comparar' },
          { name: `${p1.shortName} vs ${p2.shortName}`, url: `/comparar/${slug}` },
        ],
        hero: {
          eyebrow: `Duelo Programático · Distancia ${dist} pts`,
          h1: `${p1.shortName} vs ${p2.shortName}: Comparativa de Programas y Discurso (29-N)`,
          lead: `Contraste directo entre ${p1.candidate} (${p1.shortName}) y ${p2.candidate} (${p2.shortName}) en los 8 bloques oficiales, tono de campaña y posicionamiento izquierda-derecha.`,
          chips: [`${p1.shortName}: ${p1.spectrumScore}/100`, `${p2.shortName}: ${p2.spectrumScore}/100`, `Distancia: ${dist} pts`, '8 Ejes Lado a Lado'],
        },
        mainHtml: `${overviewHtml}\n${toneContrastHtml}\n${axesVsHtml}\n${cta}`,
      })
    );
  });
}

/* ================= GEO & RASTREO (llms.txt, llms-full.txt, robots.txt, sitemap.xml) ================= */

function generateLlmsTxt() {
  const pairs = getAllDuelPairs();
  const content = `# PolitiFácil 29-N

> Plataforma cívica neutral de información electoral sobre las Elecciones Generales de España del 29 de noviembre de 2026 (${DATA.meta.decree}). Reúne exclusivamente fuentes programáticas oficiales, análisis descriptivo de comunicación y citas literales en entrevistas periodísticas, sin columnas de opinión.

## Datos Electorales Clave
- **Fecha electoral**: ${DATA.meta.electionDate} (29 de noviembre de 2026)
- **Convocatoria oficial**: ${DATA.meta.decree}
- **Congreso de los Diputados**: ${DATA.meta.seatsCongress} escaños (mayoría absoluta: 176)
- **Senado**: ${DATA.meta.seatsSenate} escaños electivos
- **Censo electoral**: ${DATA.meta.electoralCensus.toLocaleString('es-ES')} electores
- **Metodología**: Solo fuentes oficiales de partidos, cero columnas de opinión, citas literales verificadas y modo de lectura a ciegas por defecto.
- **Corpus completo para IA (Markdown)**: [${SITE_URL}/llms-full.txt](${SITE_URL}/llms-full.txt)
- **Dataset estructurado (JSON)**: [${SITE_URL}/data/election-data.json](${SITE_URL}/data/election-data.json)

## Secciones Principales
- [Inicio · Arco Político y Comunicación](${SITE_URL}/): Vista general de izquierda (0) a derecha (100), tabla comparativa rápida y acceso interactivo.
- [Comparador de Propuestas (8 Ejes)](${SITE_URL}/comparador): Índice de similitudes y diferencias programáticas por bloque.
- [Hemeroteca de Entrevistas Literales](${SITE_URL}/entrevistas): ${DATA.interviews.length} declaraciones textuales de candidatos en prensa, radio, TV y pódcasts.
- [Test de Afinidad de 10 Escenarios](${SITE_URL}/test-afinidad): Brújula electoral sin siglas ni nombres de partido sobre escala 0–100.
- [Aritmética Parlamentaria y Partidos Territoriales](${SITE_URL}/territorios): Reglas de la Ley D'Hondt y papel de las fuerzas autonómicas.
- [Comparativas Cara a Cara (15 Duelos VS)](${SITE_URL}/comparar): Matriz de enfrentamientos directos entre candidaturas estatales.

## Partidos Estatales (${DATA.parties.length})
${DATA.parties
  .map(
    (p) =>
      `- [${p.shortName} — ${p.name} (${p.candidate})](${SITE_URL}/partidos/${p.id}): Arco ${p.spectrumScore}/100 · ${p.ideologyLabel}. Web oficial: ${p.officialUrl}`
  )
  .join('\n')}

## Fuerzas Territoriales (${(DATA.territorialParties || []).length})
${(DATA.territorialParties || [])
  .map(
    (tp) =>
      `- [${tp.shortName} — ${tp.name} (${tp.territory})](${SITE_URL}/territorios/${tp.id}): Referente ${tp.candidate} · ${tp.spectrumLabel}. Web oficial: ${tp.officialUrl}`
  )
  .join('\n')}

## Ejes Programáticos (${DATA.axes.length})
${DATA.axes
  .map((ax) => `- [${ax.label}](${SITE_URL}/propuestas/${ax.id}): Similitudes, diferencias y propuestas de los 6 partidos en ${ax.label}.`)
  .join('\n')}

## Comparativas Cara a Cara (${pairs.length})
${pairs
  .map(
    ([p1, p2]) =>
      `- [${p1.shortName} vs ${p2.shortName}](${SITE_URL}/comparar/${p1.id}-vs-${p2.id}): Distancia de ${Math.abs(p1.spectrumScore - p2.spectrumScore)} puntos y contraste en los 8 ejes.`
  )
  .join('\n')}

## Corpus Completo
- [PolitiFácil 29-N — Corpus Íntegro (llms-full.txt)](${SITE_URL}/llms-full.txt): Contiene el 100 % de propuestas por eje y partido, similitudes, diferencias, entrevistas con cita literal y los 10 escenarios del test.
`;
  writeFile(path.join(PUBLIC_DIR, 'llms.txt'), content);
}

function generateLlmsFullTxt() {
  const sections = [];

  sections.push(`# PolitiFácil 29-N — Corpus Electoral Completo (España 2026)

- URL canónica: ${SITE_URL}/
- Fecha de elecciones: ${DATA.meta.electionDate}
- Convocatoria: ${DATA.meta.decree}
- Escaños Congreso: ${DATA.meta.seatsCongress} (mayoría absoluta: 176)
- Escaños Senado: ${DATA.meta.seatsSenate}
- Censo electoral: ${DATA.meta.electoralCensus.toLocaleString('es-ES')}
- Licencia de datos compilados: https://creativecommons.org/licenses/by/4.0/
`);

  sections.push(`## 1. Partidos Estatales (${DATA.parties.length}) y Programas por 8 Ejes`);
  DATA.parties.forEach((p) => {
    const comm = p.officialCommunication;
    const axesText = DATA.axes
      .map((ax) => {
        const prop = p.proposals[ax.id];
        return `#### ${ax.label} (${SITE_URL}/propuestas/${ax.id})
- **Titular**: ${prop.headline}
${prop.points.map((pt) => `- ${pt}`).join('\n')}
- **Fuente**: ${prop.sourceLabel} (${prop.sourceUrl})`;
      })
      .join('\n\n');

    sections.push(`### ${p.name} (${p.shortName}) — Candidato/a: ${p.candidate}
- URL en PolitiFácil: ${SITE_URL}/partidos/${p.id}
- Web oficial: ${p.officialUrl}${p.secondaryUrl ? ` · ${p.secondaryUrl}` : ''}
- Etiqueta ideológica: ${p.ideologyLabel}
- Puntuación en arco (0 izq - 100 der): ${p.spectrumScore}/100 (Eje económico: ${p.economicAxis}/100, Social-territorial: ${p.socialTerritorialAxis}/100)
- Resumen: ${p.summary}
- Eslóganes: ${comm.slogans.join(' | ')}
- Tono oficial: ${comm.tone}
- Framing: ${comm.framing}
- Canales: ${comm.channels}
- Palabras clave: ${comm.keywords.join(', ')}
- Estilo en entrevistas: ${p.interviewStyle.summary} (Registro: ${p.interviewStyle.register})

${axesText}`);
  });

  sections.push(`## 2. Fuerzas Territoriales Clave (${(DATA.territorialParties || []).length})`);
  (DATA.territorialParties || []).forEach((tp) => {
    sections.push(`### ${tp.shortName} — ${tp.name} (${tp.territory})
- URL en PolitiFácil: ${SITE_URL}/territorios/${tp.id}
- Referente: ${tp.candidate}
- Espectro: ${tp.spectrumLabel}
- Web oficial: ${tp.officialUrl}
- Prioridades: ${tp.priorities}
- Papel parlamentario 29-N: ${tp.parliamentaryRole}`);
  });

  sections.push(`## 3. Similitudes y Diferencias por Eje Temático (${DATA.axes.length})`);
  DATA.axes.forEach((ax) => {
    const comp = DATA.axisComparisons[ax.id];
    sections.push(`### ${ax.label} (${SITE_URL}/propuestas/${ax.id})
**Similitudes:**
${comp.similarities.map((s) => `- ${s}`).join('\n')}

**Diferencias:**
${comp.differences.map((d) => `- ${d}`).join('\n')}`);
  });

  sections.push(`## 4. Hemeroteca de Entrevistas con Cita Literal (${DATA.interviews.length})`);
  DATA.interviews.forEach((iv, idx) => {
    const p = findAnyParty(iv.partyId);
    sections.push(`### [${idx + 1}] ${iv.candidate} (${p.shortName}) en ${iv.media} — ${iv.program} (${iv.date})
- Formato: ${iv.formatType}
- Tema: ${iv.topic}
- Contexto/Pregunta: ${iv.questionContext}
- Cita literal: "${iv.quote}"
- Estilo expresivo: ${iv.expressionStyle}
- Fuente del medio: ${iv.sourceUrl}`);
  });

  sections.push(`## 5. Test de Afinidad de 10 Escenarios (${DATA.quizQuestions.length})`);
  DATA.quizQuestions.forEach((q, qi) => {
    sections.push(`### Escenario ${qi + 1}: ${q.title} [${q.axisLabel}]
${q.scenario}
${q.options
  .map(
    (o, oi) =>
      `${oi + 1}. (Arco ${o.spectrumScore}/100, alineado con: ${(o.alignedParties || []).join(', ')}) ${o.text}`
  )
  .join('\n')}`);
  });

  sections.push(`## 6. Preguntas Frecuentes Verificadas (FAQ 29-N)`);
  FAQ_ITEMS.forEach((faq) => {
    sections.push(`### ${faq.question}\n${faq.answer}`);
  });

  writeFile(path.join(PUBLIC_DIR, 'llms-full.txt'), sections.join('\n\n'));
}

function generateRobotsTxt() {
  const bots = [
    '*',
    'Googlebot',
    'Bingbot',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
  ];

  const blocks = bots.map(
    (bot) => `User-agent: ${bot}\nAllow: /\nDisallow: /api/`
  );

  const content = `${blocks.join('\n\n')}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  writeFile(path.join(PUBLIC_DIR, 'robots.txt'), content);
}

function getAllSitemapEntries() {
  const entries = [
    { path: '/', priority: '1.0' },
    { path: '/comparador', priority: '0.9' },
    { path: '/entrevistas', priority: '0.9' },
    { path: '/test-afinidad', priority: '0.9' },
    ...DATA.axes.map((ax) => ({ path: `/propuestas/${ax.id}`, priority: '0.9' })),
    ...DATA.parties.map((p) => ({ path: `/partidos/${p.id}`, priority: '0.9' })),
    { path: '/territorios', priority: '0.8' },
    ...(DATA.territorialParties || []).map((tp) => ({ path: `/territorios/${tp.id}`, priority: '0.8' })),
    { path: '/comparar', priority: '0.8' },
    ...getAllDuelPairs().map(([p1, p2]) => ({ path: `/comparar/${p1.id}-vs-${p2.id}`, priority: '0.8' })),
  ];
  return entries;
}

function generateSitemapXml() {
  const entries = getAllSitemapEntries();
  const urlNodes = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;
  writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
  return entries.length;
}

function main() {
  writeFile(path.join(PUBLIC_DIR, 'favicon.svg'), generateFaviconSvg());
  writeFile(path.join(PUBLIC_DIR, 'og-banner.svg'), generateOgBannerSvg());
  writeFile(path.join(PUBLIC_DIR, 'manifest.webmanifest'), generateManifest());
  writeFile(path.join(PUBLIC_DIR, 'data', 'election-data.json'), JSON.stringify(DATA, null, 2));
  writeFile(path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);

  updateHomeIndexHtml();
  generateComparadorLanding();
  generateEntrevistasLanding();
  generateTestLanding();
  generateAxisLandings();
  generatePartyLandings();
  generateTerritorialLandings();
  generateComparisonLandings();

  generateLlmsTxt();
  generateLlmsFullTxt();
  generateRobotsTxt();
  const totalUrls = generateSitemapXml();

  console.log('SEO/GEO/SSG BUILD COMPLETADO:', {
    siteUrl: SITE_URL,
    lastmod: LASTMOD,
    sitemapUrls: totalUrls,
    axesPages: DATA.axes.length,
    partyPages: DATA.parties.length,
    territorialPages: (DATA.territorialParties || []).length + 1,
    comparisonPages: getAllDuelPairs().length + 1,
    interviewsCount: DATA.interviews.length,
    quizQuestionsCount: DATA.quizQuestions.length,
  });
}

main();
