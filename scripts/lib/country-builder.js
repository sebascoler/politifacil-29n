'use strict';

const fs = require('fs');
const path = require('path');
const {
  GTM_HEAD_SNIPPET,
  writeFile,
  escapeHtml,
  safeJsonLd,
  scoreToArcPoint,
  buildPoliticalArcSvg,
  buildCtaBannerCard,
  renderPortalTopbar,
  buildInlineBootstrapScript,
} = require('./shared-render');

const SPAIN_FAQ_ITEMS = [
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

const AXIS_INTERVIEW_KEYWORDS = {
  // España
  vivienda: ['vivienda', 'alquiler', 'okupa', 'ocupación', 'turísticos', 'inmobiliario', 'fondos buitre', 'hipotequé', 'aticazos', 'propietario', 'pobreza', 'servicios', 'infraestructura', 'cloaca'],
  economia: ['autónomos', 'trabajadores', 'coste de la vida', 'costo de vida', 'carne', 'pescado', 'comida', 'huelga', 'fallo sistémico', 'fiscal', 'inflación', 'cepo', 'déficit', 'timba', 'economía', 'dólares', 'superávit', 'pymes', 'inversión'],
  empleo: ['autónomos', 'trabajadores', 'huelga', 'despido', 'jornada', 'paro', 'salario', 'reforma laboral', 'empleo', 'industria', 'reestructúrense'],
  servicios: ['pensiones', 'sanidad', 'educación', 'ferroviario', 'accidente', 'incendios', 'laicidad', 'oficios religiosos', 'huelga', 'jubilados', 'pobre'],
  territorial: ['cataluña', 'catalunya', 'parlamento', 'gobernabilidad', 'pactos', 'unidad de izquierdas'],
  seguridad: ['inmigración', 'ceuta', 'defensa', 'armas', 'pulseras', 'mafias', 'voto por correo', 'protesta', 'rebelión', 'calles', 'seguridad'],
  ecologia: ['incendios', 'ferroviario', 'transporte', 'carne', 'pescado', 'agua', 'campo', 'nuclear', 'climátic'],
  regeneracion: ['corrupción', 'igualdad', 'aborto', 'muerte digna', 'derechos', 'autocrítica', 'primarias', 'encuestas', 'voto por correo', 'institucional', 'pulseras', 'ábalos', 'marcial dorado'],
  // Argentina específicos
  federalismo: ['federal', 'provincia', 'buenos aires', 'interior', 'recursos', 'gobernadores', 'embestida'],
  produccion: ['campo', 'retenciones', 'industria', 'empresas', 'producción', 'timba', 'reestructúrense', 'dólares'],
  instituciones: ['congreso', 'estado', 'mercado', 'reforma', 'superávit', 'déficit', 'presupuesto', 'rebelión'],
};

function buildCountrySite(context) {
  const {
    countryConfig,
    data,
    siteUrl,
    rootMode,
    lastmod,
    publicDir,
    strings,
    portalHref,
    calendarHref,
    activeCountries,
    getCountryBasePath,
  } = context;

  const isSpain = countryConfig.id === 'es';
  const basePath = getCountryBasePath(countryConfig.id, rootMode).replace(/\/$/, '');
  const outputDir = basePath ? path.join(publicDir, basePath.replace(/^\//, '')) : publicDir;
  const storageKey = isSpain ? 'politifacil_29n_state_v1' : `politifacil_${countryConfig.id}_state_v1`;
  const aiRefKey = isSpain ? 'politifacil_29n_ai_ref_v1' : `politifacil_${countryConfig.id}_ai_ref_v1`;
  const statsCountry = countryConfig.statsNamespace || countryConfig.id;
  const faqItems = Array.isArray(data.faqItems) && data.faqItems.length > 0 ? data.faqItems : SPAIN_FAQ_ITEMS;

  const meta = data.meta || {};
  const seedStats = meta.seedStats || {
    totalParticipants: isSpain ? 21224 : 0,
    averageScore: isSpain ? 48.4 : 50.0,
  };
  const campaignTag = isSpain ? '29-N' : `${countryConfig.name} 2027`;
  const badgeText = meta.badge || countryConfig.badge;
  const brandTitleBase = isSpain ? 'PolitiFácil' : 'PolitiFácil';
  const brandSubtitle = meta.subtitle || `${countryConfig.name} · ${countryConfig.electionName}`;
  const ogBannerFile = countryConfig.ogBannerFile || 'og-banner.svg';
  const ogImageUrl = isSpain ? `${siteUrl}/og-banner.png` : `${siteUrl}${basePath}/${ogBannerFile}`;
  const ogImageMime = ogImageUrl.endsWith('.png') ? 'image/png' : 'image/svg+xml';
  const ogLocale = (countryConfig.locale || 'es-ES').replace('-', '_');
  const htmlLang = (countryConfig.lang || 'es').split('-')[0];
  const majoritySeats = meta.seatsCongressMajority || Math.floor((meta.seatsCongress || 350) / 2) + 1;

  const defaultSelectedId =
    meta.defaultSelectedPartyId && data.parties.some((p) => p.id === meta.defaultSelectedPartyId)
      ? meta.defaultSelectedPartyId
      : data.parties[0].id;
  const defaultAxisId =
    meta.defaultAxis && data.axes.some((a) => a.id === meta.defaultAxis)
      ? meta.defaultAxis
      : data.axes[0].id;
  const defaultLeftId =
    meta.defaultPairLeft && data.parties.some((p) => p.id === meta.defaultPairLeft)
      ? meta.defaultPairLeft
      : data.parties[0].id;
  const defaultRightId =
    meta.defaultPairRight && data.parties.some((p) => p.id === meta.defaultPairRight)
      ? meta.defaultPairRight
      : (data.parties[1] || data.parties[0]).id;

  function href(subpath) {
    if (subpath === '/' || subpath === '') {
      return basePath || '/';
    }
    const clean = subpath.startsWith('/') ? subpath : `/${subpath}`;
    return `${basePath}${clean}`;
  }

  function homeQueryUrl(queryString) {
    const base = basePath || '/';
    return basePath ? `${base}?${queryString}` : `/?${queryString}`;
  }

  function absUrl(subpath) {
    const p = href(subpath);
    return `${siteUrl}${p === '/' ? '/' : p}`;
  }

  function getParty(id) {
    return data.parties.find((p) => p.id === id) || data.parties[0];
  }

  function getAxis(id) {
    return data.axes.find((a) => a.id === id) || data.axes[0];
  }

  function findAnyParty(id) {
    return (
      data.parties.find((p) => p.id === id) ||
      (data.territorialParties || []).find((tp) => tp.id === id) || {
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
    for (let i = 0; i < data.parties.length; i += 1) {
      for (let j = i + 1; j < data.parties.length; j += 1) {
        pairs.push([data.parties[i], data.parties[j]]);
      }
    }
    return pairs;
  }

  function getDuelSlug(partyAId, partyBId) {
    const idxA = data.parties.findIndex((p) => p.id === partyAId);
    const idxB = data.parties.findIndex((p) => p.id === partyBId);
    if (idxA === -1 || idxB === -1 || idxA === idxB) return null;
    const [first, second] = idxA < idxB ? [partyAId, partyBId] : [partyBId, partyAId];
    return `${first}-vs-${second}`;
  }

  function getInterviewsForAxis(axisId) {
    const keywords = AXIS_INTERVIEW_KEYWORDS[axisId] || [axisId];
    return data.interviews.filter((iv) => {
      const haystack = [iv.topic, iv.questionContext, iv.quote].join(' ').toLowerCase();
      return keywords.some((kw) => haystack.includes(kw));
    });
  }

  function buildOgBannerSvg() {
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

    const partyDots = data.parties
      .map((party) => {
        const pt = scoreToArcPoint(party.spectrumScore, cx, cy, rMain);
        const outer = scoreToArcPoint(party.spectrumScore, cx, cy, rMain + 32);
        return `<g>
      <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="12" fill="${party.color}" stroke="#0f172a" stroke-width="3.5"/>
      <text x="${outer.x.toFixed(1)}" y="${outer.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="700" fill="#e2e8f0">${escapeHtml(party.shortName)}</text>
    </g>`;
      })
      .join('\n    ');

    const needleTip = scoreToArcPoint(48, cx, cy, rMain - 14);
    const needleTail = scoreToArcPoint(48, cx, cy, 18);
    const pillBannerText = isSpain
      ? 'ELECCIONES GENERALES ESPAÑA · 29-N 2026'
      : `RUMBO A PRESIDENCIALES Y LEGISLATIVAS ${countryConfig.name.toUpperCase()} · 2027`;
    const subBannerText = `Test a Ciegas y Comparador Electoral Neutral · ${countryConfig.name}`;
    const statsSummary = `${data.parties.length} ${isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales'} · ${data.axes.length} Ejes Oficiales · 0 Opinión · ${data.quizQuestions.length} Escenarios`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeHtml(meta.title)} — Test a Ciegas y Comparador Electoral Neutral">
  <defs>
    <radialGradient id="bgGlow" cx="78%" cy="48%" r="55%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#334155" stroke-width="1.5"/>

  <rect x="72" y="84" width="520" height="36" rx="18" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="94" y="107" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="13.5" font-weight="700" letter-spacing="1.2" fill="#93c5fd">${escapeHtml(pillBannerText)}</text>

  <text x="72" y="222" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="70" font-weight="800" letter-spacing="-1.5" fill="#f8fafc">${escapeHtml(meta.title)}</text>
  <text x="72" y="284" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="26" font-weight="500" fill="#cbd5e1">${escapeHtml(subBannerText)}</text>

  <line x1="72" y1="326" x2="680" y2="326" stroke="#334155" stroke-width="1.5"/>

  <text x="72" y="454" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="19" font-weight="600" fill="#94a3b8">${escapeHtml(statsSummary)}</text>
  <text x="72" y="544" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="17" font-weight="600" fill="#e2e8f0">Solo fuentes oficiales · Citas literales de entrevistas · ${escapeHtml(meta.decree)}</text>

  <g>
    <path d="M ${cx - rMain} ${cy} A ${rMain} ${rMain} 0 0 1 ${cx + rMain} ${cy}" fill="none" stroke="#1e293b" stroke-width="32"/>
    ${segmentPaths}
    ${partyDots}
    <line x1="${needleTail.x.toFixed(1)}" y1="${needleTail.y.toFixed(1)}" x2="${needleTip.x.toFixed(1)}" y2="${needleTip.y.toFixed(1)}" stroke="#fbbf24" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="14" fill="#fbbf24" stroke="#0f172a" stroke-width="4"/>
    <circle cx="${needleTip.x.toFixed(1)}" cy="${needleTip.y.toFixed(1)}" r="10" fill="#fbbf24" stroke="#0f172a" stroke-width="3"/>
    <text x="${cx - rMain}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">IZQ (0)</text>
    <text x="${cx}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#fbbf24">BRÚJULA</text>
    <text x="${cx + rMain}" y="${cy + 36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="700" fill="#94a3b8">DER (100)</text>
  </g>
</svg>
`;
  }

  function renderParticipantsPillHtml(isLink = true) {
    const countNum = seedStats.totalParticipants || 0;
    const countStr = countNum.toLocaleString('es-ES');
    const avgStr = Number(seedStats.averageScore || 50).toFixed(1).replace('.', ',');
    const inner =
      countNum > 0
        ? `🔥 <strong data-live-count>${countStr}</strong> personas ya han hecho el Test a Ciegas · Media: <strong data-live-avg>${avgStr}</strong>/100`
        : `🧭 Estrena el Test a Ciegas de ${escapeHtml(countryConfig.name)} · ${data.quizQuestions.length} escenarios sin siglas`;
    if (isLink) {
      return `<a href="${escapeHtml(homeQueryUrl('section=test-afinidad'))}" class="participants-pill" id="live-participants-pill" data-jump="test-afinidad" title="Ir al Test de 10 Escenarios">${inner}</a>`;
    }
    return `<div class="participants-pill" id="live-participants-pill">${inner}</div>`;
  }

  function renderQuizProofHtml() {
    const countNum = seedStats.totalParticipants || 0;
    const countStr = countNum.toLocaleString('es-ES');
    const avgStr = Number(seedStats.averageScore || 50).toFixed(1).replace('.', ',');
    if (countNum > 0) {
      return `🧭 <strong data-live-count>${countStr}</strong> participantes ya calcularon su posición sin siglas · Media en el arco: <strong data-live-avg>${avgStr}</strong>/100`;
    }
    return `🧭 Test ciudadano sin siglas ni colores · Tu resultado inaugura el termómetro de ${escapeHtml(countryConfig.name)}`;
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
          <p class="muted-text">${escapeHtml(strings.partyDetail.candidateLabel)} <strong>${escapeHtml(party.candidate)}</strong> · ${escapeHtml(party.ideologyLabel)}</p>
        </div>
        <a class="btn btn-sm" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.partyDetail.officialWeb)}</a>
      </div>

      <p style="margin:0 0 10px 0; font-size:0.9rem;">${escapeHtml(party.summary)}</p>

      <div class="axis-meter">
        <div class="meter-row">
          <span>${escapeHtml(strings.partyDetail.leftRightMeter)}</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${party.spectrumScore}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${party.spectrumScore}/100</strong>
        </div>
        <div class="meter-row">
          <span>${escapeHtml(strings.partyDetail.stateMeter)}</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${100 - party.economicAxis}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${100 - party.economicAxis}/100</strong>
        </div>
      </div>

      <div class="comm-box">
        <h4>${escapeHtml(strings.partyDetail.commHeading)}</h4>
        <ul class="comm-list">
          <li><strong>${escapeHtml(strings.partyDetail.slogansLabel)}</strong> ${comm.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
          <li><strong>${escapeHtml(strings.partyDetail.toneLabel)}</strong> ${escapeHtml(comm.tone)}</li>
          <li><strong>${escapeHtml(strings.partyDetail.framingLabel)}</strong> ${escapeHtml(comm.framing)}</li>
          <li><strong>${escapeHtml(strings.partyDetail.channelsLabel)}</strong> ${escapeHtml(comm.channels)}</li>
        </ul>
        <div class="tag-cloud">
          ${comm.keywords.map((kw) => `<span class="tag"># ${escapeHtml(kw)}</span>`).join('')}
        </div>
      </div>

      <div class="comm-box">
        <h4>${escapeHtml(strings.partyDetail.interviewHeading)}</h4>
        <p class="muted-text" style="font-size:0.84rem;">${escapeHtml(party.interviewStyle.summary)}</p>
      </div>

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <a class="btn btn-primary btn-sm" href="${escapeHtml(href(`/partidos/${party.id}`))}">${escapeHtml(strings.partyDetail.fullProfileBtn)}</a>
        <a class="btn btn-sm" href="${escapeHtml(homeQueryUrl(`section=comparador&left=${party.id}`))}">${escapeHtml(strings.partyDetail.openComparatorBtn)}</a>
      </div>
    `.trim();
  }

  function renderHomePartyGridHtml() {
    return data.parties
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
          <h4>${escapeHtml(strings.partyDetail.commStamp)}</h4>
          <p class="muted-text" style="font-size:0.82rem;">${escapeHtml(party.officialCommunication.tone)}</p>
        </div>
        <div class="party-card-actions">
          <a class="source-link" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.82rem;">${escapeHtml(strings.partyDetail.programLink)}</a>
          <a class="btn btn-sm" href="${escapeHtml(href(`/partidos/${party.id}`))}">${escapeHtml(strings.partyDetail.cardLink)}</a>
        </div>
      </article>`
      )
      .join('\n');
  }

  function renderHomeTerritorialGridHtml() {
    const roleTitle = isSpain ? 'Papel 29-N' : strings.vocab.territoriesRolePrefix;
    return (data.territorialParties || [])
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
        <p class="muted-text" style="font-size:0.79rem; margin-bottom:8px;"><strong>${escapeHtml(roleTitle)}:</strong> ${escapeHtml(tp.parliamentaryRole)}</p>
        <a class="source-link" href="${escapeHtml(href(`/territorios/${tp.id}`))}" style="font-size:0.8rem;">${escapeHtml(strings.vocab.territoriesLinkLabel)} →</a>
      </article>`
      )
      .join('\n');
  }

  function renderSimilarityPanelHtml(axisId, leftId = defaultLeftId, rightId = defaultRightId) {
    const axis = getAxis(axisId);
    const comp = data.axisComparisons[axisId] || { similarities: [], differences: [] };
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
            ${duelSlug ? `<a class="source-link" href="${escapeHtml(href(`/comparar/${duelSlug}`))}">Ver duelo completo →</a>` : ''}
          </p>
        </div>
      </div>
    `.trim();
  }

  function renderProposalsByAxisHtml(axisId) {
    return data.parties
      .slice()
      .sort((a, b) => a.spectrumScore - b.spectrumScore)
      .map((party) => {
        const prop = party.proposals[axisId];
        return `
      <article class="card proposal-card" style="--party-color:${escapeHtml(party.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <div class="party-badge-pill">
            <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
            <span><a class="source-link" href="${escapeHtml(href(`/partidos/${party.id}`))}">${escapeHtml(party.shortName)}</a></span>
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
    return data.parties
      .map(
        (p) => `
      <div class="expression-item" style="--party-color:${escapeHtml(p.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
          <strong><a class="source-link" href="${escapeHtml(href(`/partidos/${p.id}`))}">${escapeHtml(p.candidate)}</a></strong>
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
        const isTerritorial = (data.territorialParties || []).some((tp) => tp.id === iv.partyId);
        const partyHref = isTerritorial ? href(`/territorios/${iv.partyId}`) : href(`/partidos/${iv.partyId}`);
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
    const items = data.quizQuestions
      .map(
        (q, qi) => `
      <article class="scenario-box" style="margin-bottom:14px;">
        <span class="chip">Escenario ${qi + 1} · <a class="source-link" href="${escapeHtml(href(`/propuestas/${q.axisId}`))}">${escapeHtml(q.axisLabel)}</a></span>
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
          <span class="eyebrow">Vista Semántica de los ${data.quizQuestions.length} Escenarios</span>
          <p class="muted-text">Responde de forma interactiva para calcular tu posición 0–100 en el arco político sin sesgos partidistas.</p>
        </div>
        <a class="btn btn-primary btn-sm" href="${escapeHtml(href('/test-afinidad'))}">Ver guía metodológica del Test</a>
      </div>
      ${items}
    `.trim();
  }

  function renderSeoHubHtml() {
    const parties = data.parties;
    const duelPairs = getAllDuelPairs();

    const tldrCssVars = parties
      .map(
        (p, idx) =>
          `--label-${idx + 2}: '${p.shortName.replace(/'/g, "\\'")}'; --color-${idx + 2}: ${p.color}`
      )
      .join('; ');

    const tldrHeaderCols = parties
      .map(
        (p) =>
          `<th scope="col"><a class="source-link" href="${escapeHtml(href(`/partidos/${p.id}`))}" style="color:${escapeHtml(p.color)}">${escapeHtml(p.shortName)}</a><br/><small style="font-weight:500; color:var(--text-muted);">${escapeHtml(p.candidate)}</small></th>`
      )
      .join('');

    const tldrRows = data.axes
      .map((axis) => {
        const cells = parties
          .map((p) => {
            const prop = p.proposals[axis.id];
            return `<td>${escapeHtml(prop.headline)}</td>`;
          })
          .join('');
        return `
        <tr>
          <th scope="row"><a class="source-link" href="${escapeHtml(href(`/propuestas/${axis.id}`))}">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</a></th>
          ${cells}
        </tr>`;
      })
      .join('\n');

    const faqHtml = faqItems
      .map(
        (item) => `
      <details class="faq-item">
        <summary>${escapeHtml(item.question)}</summary>
        <div class="faq-answer">
          <p>${escapeHtml(item.answer)}</p>
        </div>
      </details>`
      )
      .join('\n');

    return `
    <section class="seo-hub-section" id="guia-completa-${escapeHtml(countryConfig.id)}" aria-labelledby="heading-seo-hub">
      <div class="section-header">
        <div>
          <span class="eyebrow">Síntesis Programática · Datos Verificados ${escapeHtml(campaignTag)}</span>
          <h2 id="heading-seo-hub">Tabla Comparativa Rápida (${data.axes.length} Ejes), Preguntas Frecuentes y Directorio (${escapeHtml(countryConfig.name)})</h2>
          <p class="section-lead">
            Resumen estructurado de las ${parties.length} ${escapeHtml(strings.vocab.partiesUnitPlural)} en los ${data.axes.length} bloques programáticos, respuestas directas sobre el ciclo ${escapeHtml(meta.electionDateDisplay || countryConfig.electionDateLabel)} (${escapeHtml(meta.decree)}) y acceso a todas las guías temáticas y duelos cara a cara.
          </p>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 id="tldr-table-heading">Tabla Resumen Comparativa (TL;DR ${escapeHtml(campaignTag)}): Fuerzas × ${data.axes.length} Ejes Oficiales</h3>
        <p class="muted-text" style="margin-bottom:12px;">Pulsa en cualquier eje temático o sigla para abrir su análisis completo con fuentes oficiales.</p>
        <div class="tldr-table-wrap" tabindex="0" role="region" aria-labelledby="tldr-table-heading">
          <table class="tldr-table" style="${escapeHtml(tldrCssVars)}">
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
        <h3>Preguntas Frecuentes sobre las Elecciones en ${escapeHtml(countryConfig.name)} (${escapeHtml(badgeText)})</h3>
        <p class="muted-text" style="margin-bottom:14px;">Respuestas contrastadas exclusivamente con los datos oficiales y ${escapeHtml(strings.vocab.programsWord)} recogidos en ${escapeHtml(meta.title)}.</p>
        <div class="faq-list">
          ${faqHtml}
        </div>
      </div>

      <div class="card">
        <h3>Directorio Completo de Guías, Fuerzas y Comparativas (${escapeHtml(countryConfig.name)})</h3>
        <p class="muted-text" style="margin-bottom:14px;">Explora páginas dedicadas e indexables para cada bloque temático, espacio político y duelo cara a cara.</p>
        <div class="internal-links-grid">
          <div class="internal-links-group">
            <h4>Secciones Principales</h4>
            <ul>
              <li><a href="${escapeHtml(href('/'))}">Inicio · Arco Político y Comunicación</a></li>
              <li><a href="${escapeHtml(href('/comparador'))}">Comparador de Propuestas (${data.axes.length} Ejes)</a></li>
              <li><a href="${escapeHtml(href('/entrevistas'))}">Hemeroteca de Entrevistas Literales</a></li>
              <li><a href="${escapeHtml(href('/test-afinidad'))}">Test de Afinidad de ${data.quizQuestions.length} Escenarios</a></li>
              <li><a href="${escapeHtml(href('/territorios'))}">${escapeHtml(strings.vocab.territoriesHeading)}</a></li>
              <li><a href="${escapeHtml(href('/comparar'))}">Todos los Duelos Cara a Cara (${duelPairs.length})</a></li>
              <li><a href="${escapeHtml(portalHref)}">🌐 PolitiFácil Portal Global</a></li>
              <li><a href="${escapeHtml(calendarHref)}">📅 Calendario Electoral 2026–2028</a></li>
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>${data.axes.length} ${escapeHtml(strings.vocab.axesLabel)}</h4>
            <ul>
              ${data.axes
                .map(
                  (axis) =>
                    `<li><a href="${escapeHtml(href(`/propuestas/${axis.id}`))}">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>${parties.length} ${escapeHtml(isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales')}</h4>
            <ul>
              ${parties
                .map(
                  (party) =>
                    `<li><a href="${escapeHtml(href(`/partidos/${party.id}`))}">${escapeHtml(party.shortName)} — ${escapeHtml(party.candidate)} (${party.spectrumScore}/100)</a></li>`
                )
                .join('\n              ')}
            </ul>
            <h4 style="margin-top:14px;">${(data.territorialParties || []).length} ${escapeHtml(isSpain ? 'Fuerzas Territoriales' : 'Bloques Provinciales')}</h4>
            <ul>
              ${(data.territorialParties || [])
                .map(
                  (tp) =>
                    `<li><a href="${escapeHtml(href(`/territorios/${tp.id}`))}">${escapeHtml(tp.shortName)} (${escapeHtml(tp.territory)})</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>

          <div class="internal-links-group">
            <h4>${duelPairs.length} ${escapeHtml(strings.vocab.duelsLabel)}</h4>
            <ul>
              ${duelPairs
                .map(
                  ([p1, p2]) =>
                    `<li><a href="${escapeHtml(href(`/comparar/${p1.id}-vs-${p2.id}`))}">${escapeHtml(p1.shortName)} vs ${escapeHtml(p2.shortName)}</a></li>`
                )
                .join('\n              ')}
            </ul>
          </div>
        </div>
      </div>
    </section>
    `.trim();
  }

  function buildHomeHeadBlock() {
    const title = isSpain
      ? 'PolitiFácil 29-N | Comparador Electoral Neutral y Test de Afinidad en España'
      : (meta.sectionTitles && meta.sectionTitles['arco-overview']) ||
        `${meta.title} | Comparador Electoral Neutral y Test de Afinidad en ${countryConfig.name}`;
    const description = isSpain
      ? 'Plataforma neutral, visual y sin sesgos para entender las propuestas oficiales, el estilo comunicativo y las entrevistas de los candidatos en las elecciones generales de España del 29 de noviembre de 2026.'
      : `Plataforma neutral, visual y sin sesgos para comparar las plataformas oficiales, el estilo comunicativo, las entrevistas literales y realizar el test de afinidad de 10 escenarios en ${countryConfig.name} rumbo a las elecciones de 2027.`;
    const canonicalHome = absUrl('/');

    const allPartiesForList = [
      ...data.parties.map((p) => ({
        name: p.name,
        shortName: p.shortName,
        url: absUrl(`/partidos/${p.id}`),
        sameAs: [p.officialUrl, p.secondaryUrl].filter(Boolean),
        description: p.summary,
        candidate: p.candidate,
      })),
      ...(data.territorialParties || []).map((tp) => ({
        name: tp.name,
        shortName: tp.shortName,
        url: absUrl(`/territorios/${tp.id}`),
        sameAs: [tp.officialUrl].filter(Boolean),
        description: tp.priorities,
        candidate: tp.candidate,
      })),
    ];

    const organizerMap = {
      es: {
        '@type': 'Organization',
        name: 'Junta Electoral Central (JEC)',
        url: 'https://www.juntaelectoralcentral.es/',
      },
      ar: {
        '@type': 'Organization',
        name: 'Cámara Nacional Electoral (CNE)',
        url: 'https://www.electoral.gob.ar/',
      },
    };
    const electoralOrganizer = organizerMap[countryConfig.id] || {
      '@type': 'Organization',
      name: 'PolitiFácil',
      url: siteUrl,
    };

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${canonicalHome}#website`,
          url: canonicalHome,
          name: meta.title,
          inLanguage: countryConfig.locale,
          description,
        },
        {
          '@type': 'WebApplication',
          '@id': `${canonicalHome}#webapp`,
          name: `${meta.title} — Comparador a Ciegas y Test Electoral`,
          url: canonicalHome,
          applicationCategory: 'ReferenceApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Requires JavaScript for interactive test and blind mode',
          inLanguage: countryConfig.locale,
          isAccessibleForFree: true,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: countryConfig.currency || 'EUR',
          },
          about: {
            '@type': 'Event',
            name: countryConfig.electionName,
            startDate: meta.electionDate,
            endDate: meta.electionDate,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            image: [ogImageUrl],
            location: {
              '@type': 'Place',
              name: countryConfig.name,
              address: {
                '@type': 'PostalAddress',
                addressCountry: (countryConfig.geoRegion || countryConfig.id || 'ES').toUpperCase(),
              },
            },
            organizer: electoralOrganizer,
            performer: data.parties.map((p) => ({
              '@type': 'Organization',
              name: p.name,
            })),
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: countryConfig.currency || 'EUR',
              availability: 'https://schema.org/InStock',
              url: canonicalHome,
            },
            description: `${meta.decree}. ${meta.seatsCongress} ${strings.vocab.seatUnit} en cámara baja y ${meta.seatsSenate} en Senado.`,
          },
        },
        {
          '@type': 'Dataset',
          '@id': `${canonicalHome}#dataset`,
          name: `Programas y Entrevistas — ${countryConfig.name} (${badgeText})`,
          description: `Base de datos estructurada y neutral sobre ${strings.vocab.programsWord}, estilo comunicativo y declaraciones literales en entrevistas para ${countryConfig.name} (${meta.decree}).`,
          url: canonicalHome,
          creator: {
            '@type': 'Organization',
            name: 'PolitiFácil',
            url: siteUrl,
          },
          spatialCoverage: countryConfig.name,
          temporalCoverage: meta.electionDate,
          license: 'https://creativecommons.org/licenses/by/4.0/',
          inLanguage: countryConfig.locale,
          keywords: [
            `Elecciones ${countryConfig.name}`,
            countryConfig.electionName,
            meta.decree,
            'Comparador electoral neutral',
            'Test de afinidad política',
          ],
          distribution: [
            {
              '@type': 'DataDownload',
              encodingFormat: 'application/json',
              contentUrl: `${siteUrl}${basePath}/data/election-data.json`,
            },
            {
              '@type': 'DataDownload',
              encodingFormat: 'text/markdown',
              contentUrl: `${siteUrl}${basePath}/llms-full.txt`,
            },
          ],
        },
        {
          '@type': 'ItemList',
          '@id': `${canonicalHome}#parties-list`,
          name: `Fuerzas políticas principales en ${countryConfig.name}`,
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
          '@id': `${canonicalHome}#faq`,
          mainEntity: faqItems.map((faq) => ({
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

    const twitterDesc = `${data.parties.length} ${isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales'} · ${data.axes.length} Ejes Oficiales · 0 Opinión · Test de ${data.quizQuestions.length} Escenarios en ${countryConfig.name}.`;

    return `  <link rel="canonical" href="${escapeHtml(canonicalHome)}" />
  <link rel="alternate" hreflang="${escapeHtml(countryConfig.locale)}" href="${escapeHtml(canonicalHome)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalHome)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="geo.region" content="${escapeHtml(countryConfig.geoRegion)}" />
  <meta name="geo.placename" content="${escapeHtml(countryConfig.name)}" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}${escapeHtml(basePath)}/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="${escapeHtml(ogLocale)}" />
  <meta property="og:site_name" content="${escapeHtml(meta.title)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalHome)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:type" content="${escapeHtml(ogImageMime)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(meta.title)}: arco político y comparador electoral neutral en ${escapeHtml(countryConfig.name)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(twitterDesc)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(meta.title)}: arco político y comparador electoral neutral en ${escapeHtml(countryConfig.name)}" />
${GTM_HEAD_SNIPPET}
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>`;
  }

  function generateCountryHomeIndexHtml() {
    const title = isSpain
      ? 'PolitiFácil 29-N | Comparador Electoral Neutral y Test de Afinidad en España'
      : (meta.sectionTitles && meta.sectionTitles['arco-overview']) ||
        `${meta.title} | Comparador Electoral Neutral y Test de Afinidad en ${countryConfig.name}`;
    const description = isSpain
      ? 'Plataforma neutral, visual y sin sesgos para entender las propuestas oficiales, el estilo comunicativo y las entrevistas de los candidatos en las elecciones generales de España del 29 de noviembre de 2026.'
      : `Plataforma neutral, visual y sin sesgos para entender las plataformas oficiales, el estilo comunicativo y las entrevistas de los referentes políticos de ${countryConfig.name} rumbo a 2027.`;

    const topbarHtml = renderPortalTopbar({
      activeKey: countryConfig.id,
      portalHref,
      calendarHref,
      activeCountries,
      getCountryBasePath,
      rootMode,
    });

    const countdownStatic = isSpain
      ? '29 de noviembre de 2026 · 350 escaños al Congreso'
      : `${meta.electionDateDisplay || '24 de octubre de 2027'} · ${meta.chamberSummary}`;
    const avgFormatted = Number(seedStats.averageScore || 50).toFixed(1).replace('.', ',');
    const countFormatted = (seedStats.totalParticipants || 0).toLocaleString('es-ES');

    const formatOptionsHtml = strings.interviews.formats
      .map((fmt) => `<option value="${escapeHtml(fmt)}">${escapeHtml(fmt)}</option>`)
      .join('\n            ');

    const html = `<!DOCTYPE html>
<html lang="${escapeHtml(htmlLang)}" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <!-- SSR_HEAD_START -->
${buildHomeHeadBlock()}
<!-- SSR_HEAD_END -->
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <a class="skip-link" href="#main-content">${escapeHtml(strings.skipLink)}</a>

  ${topbarHtml}

  <header class="site-header">
    <div class="container header-inner">
      <div class="brand-block">
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
          <span class="brand-title">${escapeHtml(brandTitleBase)} <span class="brand-badge">${escapeHtml(badgeText)}</span></span>
          <p class="brand-subtitle">${escapeHtml(brandSubtitle)}</p>
        </div>
      </div>

      <nav class="main-nav" aria-label="Secciones principales">
        <button class="nav-pill is-active" data-section="arco-overview" type="button">${escapeHtml(strings.nav.home)}</button>
        <button class="nav-pill" data-section="comparador" type="button">${escapeHtml(strings.nav.comparator)}</button>
        <button class="nav-pill" data-section="entrevistas" type="button">${escapeHtml(strings.nav.interviews)}</button>
        <button class="nav-pill nav-pill-accent" data-section="test-afinidad" type="button">${escapeHtml(strings.nav.test)}</button>
      </nav>

      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="${escapeHtml(strings.quiz.themeToggleLabel)}" title="${escapeHtml(strings.quiz.themeToggleLabel)}">
          <span id="theme-icon" aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </header>

  <section class="neutrality-banner" aria-label="Compromiso de neutralidad">
    <div class="container neutrality-inner">
      <div class="neutrality-chips">
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.officialSources)}</span>
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.zeroOpinion)}</span>
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.literalQuotes)}</span>
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.blindMode)}</span>
      </div>
      <div class="neutrality-meta">
        ${renderParticipantsPillHtml(true)}
        <div class="countdown-pill" id="election-countdown" aria-live="polite">
          ${escapeHtml(countdownStatic)}
        </div>
      </div>
    </div>
  </section>

  <main id="main-content" class="container main-shell">
    <!-- SECCIÓN 1: ARCO POLÍTICO Y COMUNICACIÓN -->
    <section id="arco-overview" class="view-section is-visible" aria-labelledby="heading-arco">
      <div class="section-header">
        <div>
          <span class="eyebrow">${escapeHtml(strings.arc.eyebrow)}</span>
          <h1 id="heading-arco">${escapeHtml(strings.arc.heading)}</h1>
          <p class="section-lead">
            ${escapeHtml(strings.arc.lead)}
          </p>
        </div>
        <div class="sort-control" role="group" aria-label="Orden de visualización de fuerzas">
          <span class="control-label">${escapeHtml(strings.arc.sortLabel)}</span>
          <button class="seg-btn is-active" data-sort="spectrum" type="button">${escapeHtml(strings.arc.sortSpectrum)}</button>
          <button class="seg-btn" data-sort="alpha" type="button">${escapeHtml(strings.arc.sortAlpha)}</button>
          <button class="seg-btn" data-sort="random" type="button">${escapeHtml(strings.arc.sortRandom)}</button>
        </div>
      </div>

      <div class="arc-card card">
        <div class="arc-card-header">
          <div>
            <h2>${escapeHtml(strings.arc.interactiveTitle)}</h2>
            <p class="muted-text">${escapeHtml(strings.arc.interactiveLead)}</p>
          </div>
          <div class="legend-inline">
            <span class="legend-item"><span class="dot" style="background:#6d28d9"></span>${escapeHtml(strings.arc.legend[0])}</span>
            <span class="legend-item"><span class="dot" style="background:#dc2626"></span>${escapeHtml(strings.arc.legend[1])}</span>
            <span class="legend-item"><span class="dot" style="background:#0284c7"></span>${escapeHtml(strings.arc.legend[2])}</span>
            <span class="legend-item"><span class="dot" style="background:#16a34a"></span>${escapeHtml(strings.arc.legend[3])}</span>
          </div>
        </div>

        <div class="arc-layout">
          <div class="arc-svg-wrap" id="overview-arc-container" aria-label="Arco político interactivo de izquierda a derecha">
            <!-- SSR_ARC_START -->
${buildPoliticalArcSvg(data.parties, { selectedPartyId: defaultSelectedId, interactive: true })}
<!-- SSR_ARC_END -->
          </div>
          <aside class="party-detail-panel" id="party-detail-panel" aria-live="polite">
            <!-- SSR_PARTY_DETAIL_START -->
${renderPartyDetailHtml(getParty(defaultSelectedId))}
<!-- SSR_PARTY_DETAIL_END -->
          </aside>
        </div>
      </div>

      <section class="card barometer-card" id="live-barometer-card" aria-labelledby="heading-barometer">
        <div class="barometer-header">
          <div>
            <span class="eyebrow">${escapeHtml(strings.barometer.eyebrow)}</span>
            <h2 id="heading-barometer">${escapeHtml(strings.barometer.heading)}</h2>
            <p class="muted-text">
              ${escapeHtml(strings.barometer.notePrefix)} <strong data-live-avg>${avgFormatted}</strong>/100.
            </p>
          </div>
          <a href="${escapeHtml(homeQueryUrl('section=test-afinidad'))}" class="btn btn-primary btn-sm" data-jump="test-afinidad">${escapeHtml(strings.barometer.cta)}</a>
        </div>
        <div class="barometer-bars" data-live-barometer aria-live="polite">
          <p class="muted-text">${escapeHtml(strings.barometer.loading)}</p>
        </div>
        <p class="barometer-note muted-text">
          Datos reales agregados de participantes voluntarios del Test a Ciegas de ${escapeHtml(meta.title)} (contador acumulado: <strong data-live-count>${countFormatted}</strong>). No constituye una encuesta probabilística ni intención de voto.
        </p>
      </section>

      <div class="subsection-header">
        <h2>${escapeHtml(strings.vocab.partiesAllHeading)}</h2>
        <p class="muted-text">${escapeHtml(strings.vocab.partiesAllSub)}</p>
      </div>
      <div class="party-grid" id="party-cards-grid">
        <!-- SSR_PARTY_GRID_START -->
${renderHomePartyGridHtml()}
<!-- SSR_PARTY_GRID_END -->
      </div>

      <div class="card territorial-card">
        <div class="territorial-header">
          <div>
            <span class="eyebrow">${escapeHtml(strings.vocab.territoriesEyebrow)}</span>
            <h2>${escapeHtml(strings.vocab.territoriesHeading)}</h2>
            <p class="muted-text">${escapeHtml(strings.vocab.territoriesLead)}</p>
          </div>
        </div>
        <div class="territorial-grid" id="territorial-grid">
          <!-- SSR_TERRITORIAL_GRID_START -->
${renderHomeTerritorialGridHtml()}
<!-- SSR_TERRITORIAL_GRID_END -->
        </div>
      </div>
    </section>

    <!-- SECCIÓN 2: COMPARADOR DE PROPUESTAS Y SIMILITUDES / DIFERENCIAS -->
    <section id="comparador" class="view-section" aria-labelledby="heading-comparador" hidden>
      <div class="section-header">
        <div>
          <span class="eyebrow">${escapeHtml(strings.comparator.eyebrow)}</span>
          <h2 id="heading-comparador" class="section-h1">${escapeHtml(strings.comparator.heading)}</h2>
          <p class="section-lead">
            ${strings.comparator.lead}
          </p>
        </div>
        <div class="blind-mode-box">
          <label class="toggle-switch" for="blind-mode-toggle">
            <input type="checkbox" id="blind-mode-toggle" checked />
            <span class="toggle-slider" aria-hidden="true"></span>
            <span class="toggle-text">
              <strong>${escapeHtml(strings.comparator.blindTitle)}</strong>
              <small>${escapeHtml(strings.comparator.blindSubtitle)}</small>
            </span>
          </label>
        </div>
      </div>

      <div class="card blind-intro-banner" id="blind-intro-banner">
        <div>
          <strong>${escapeHtml(strings.comparator.blindWhyTitle)}</strong>
          <p class="muted-text">
            ${strings.comparator.blindWhyText}
          </p>
        </div>
      </div>

      <div class="card controls-panel">
        <div class="control-row">
          <div class="control-group">
            <span class="control-label">${escapeHtml(strings.comparator.step1)}</span>
            <div class="axis-tabs" id="axis-tabs" role="tablist" aria-label="Ejes temáticos">
            </div>
          </div>
        </div>

        <div class="control-row split-controls">
          <div class="control-group">
            <span class="control-label">${escapeHtml(strings.comparator.step2)}</span>
            <div class="party-filter-pills" id="comparator-party-pills">
            </div>
          </div>
          <div class="control-group pair-selector-group">
            <span class="control-label">${escapeHtml(strings.comparator.step3)}</span>
            <div class="pair-selects">
              <select id="pair-left" aria-label="Primer espacio a contrastar"></select>
              <span class="vs-badge" aria-hidden="true">VS</span>
              <select id="pair-right" aria-label="Segundo espacio a contrastar"></select>
            </div>
          </div>
        </div>
      </div>

      <div class="similarity-grid" id="similarity-panel">
        <!-- SSR_SIMILARITY_PANEL_START -->
${renderSimilarityPanelHtml(defaultAxisId, defaultLeftId, defaultRightId)}
<!-- SSR_SIMILARITY_PANEL_END -->
      </div>

      <div class="blind-summary-bar card" id="blind-summary-bar" hidden>
        <div class="blind-summary-info">
          <strong>Modo Lectura a Ciegas activo:</strong> ${escapeHtml(strings.comparator.blindBarLead)}
          <span id="blind-picks-count" class="chip">0 preferencias marcadas</span>
        </div>
        <div class="blind-summary-actions">
          <button id="blind-reveal-btn" class="btn btn-primary" type="button">${escapeHtml(strings.comparator.revealBtn)}</button>
          <button id="blind-reset-btn" class="btn btn-ghost" type="button">${escapeHtml(strings.comparator.resetBtn)}</button>
        </div>
      </div>

      <div id="blind-reveal-results" class="card blind-reveal-card" hidden>
      </div>

      <div class="proposals-grid" id="proposals-grid">
        <!-- SSR_PROPOSALS_GRID_START -->
${renderProposalsByAxisHtml(defaultAxisId)}
<!-- SSR_PROPOSALS_GRID_END -->
      </div>
    </section>

    <!-- SECCIÓN 3: HEMEROTECA DE ENTREVISTAS SIN SESGO -->
    <section id="entrevistas" class="view-section" aria-labelledby="heading-entrevistas" hidden>
      <div class="section-header">
        <div>
          <span class="eyebrow">${escapeHtml(strings.interviews.eyebrow)}</span>
          <h2 id="heading-entrevistas" class="section-h1">${escapeHtml(strings.interviews.heading)}</h2>
          <p class="section-lead">
            ${escapeHtml(strings.interviews.lead)}
          </p>
        </div>
      </div>

      <div class="card expression-matrix-card">
        <div class="matrix-header">
          <h2>${escapeHtml(strings.interviews.matrixTitle)}</h2>
          <p class="muted-text">${escapeHtml(strings.interviews.matrixLead)}</p>
        </div>
        <div class="expression-grid" id="expression-grid">
          <!-- SSR_EXPRESSION_GRID_START -->
${renderExpressionGridHtml()}
<!-- SSR_EXPRESSION_GRID_END -->
        </div>
      </div>

      <div class="card filter-bar">
        <div class="filter-field">
          <label for="interview-party-filter">${escapeHtml(strings.interviews.filterParty)}</label>
          <select id="interview-party-filter">
            <option value="all">${escapeHtml(strings.interviews.allCandidates)}</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="interview-format-filter">${escapeHtml(strings.interviews.filterFormat)}</label>
          <select id="interview-format-filter">
            <option value="all">${escapeHtml(strings.interviews.allFormats)}</option>
            ${formatOptionsHtml}
          </select>
        </div>
        <div class="filter-field">
          <label for="interview-topic-filter">${escapeHtml(strings.interviews.filterTopic)}</label>
          <select id="interview-topic-filter">
            <option value="all">${escapeHtml(strings.interviews.allTopics)}</option>
          </select>
        </div>
        <div class="filter-field filter-search">
          <label for="interview-search-input">${escapeHtml(strings.interviews.filterSearch)}</label>
          <input id="interview-search-input" type="search" placeholder="${isSpain ? 'Ej: vivienda, Alsina, RTVE, Wild...' : 'Ej: inflación, reforma, federalismo, campo...'}" />
        </div>
      </div>

      <div class="results-meta" id="interviews-meta"></div>
      <div class="interviews-grid" id="interviews-grid">
        <!-- SSR_INTERVIEWS_GRID_START -->
${renderInterviewCardsHtml(data.interviews)}
<!-- SSR_INTERVIEWS_GRID_END -->
      </div>
    </section>

    <!-- SECCIÓN 4: TEST DE 10 ESCENARIOS CON ARCO POLÍTICO -->
    <section id="test-afinidad" class="view-section" aria-labelledby="heading-test" hidden>
      <div class="section-header">
        <div>
          <span class="eyebrow">Brújula Electoral ${escapeHtml(campaignTag)} · Sin Nombres de Partido</span>
          <h2 id="heading-test" class="section-h1">${escapeHtml(strings.quiz.heading)}</h2>
          <p class="section-lead">
            ${escapeHtml(strings.quiz.lead)}
          </p>
          <div class="quiz-social-proof" data-quiz-proof-dynamic aria-live="polite">
            ${renderQuizProofHtml()}
          </div>
        </div>
      </div>

      <div id="quiz-stage" class="card quiz-card">
        <!-- SSR_QUIZ_PREVIEW_START -->
${renderQuizSemanticPreviewHtml()}
<!-- SSR_QUIZ_PREVIEW_END -->
      </div>
    </section>

    <!-- SSR_SEO_HUB_START -->
${renderSeoHubHtml()}
<!-- SSR_SEO_HUB_END -->
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <strong>${escapeHtml(meta.title)}</strong> — ${escapeHtml(strings.quiz.footerTagline)}
        <p class="muted-text">Datos contrastados con ${escapeHtml(strings.vocab.programsWord)} y declaraciones literales en entrevistas periodísticas. Verifica siempre los documentos íntegros en las fuentes enlazadas.</p>
      </div>
      <div class="footer-links">
        <button class="btn btn-ghost btn-sm" data-jump="arco-overview" type="button">Arco</button>
        <button class="btn btn-ghost btn-sm" data-jump="comparador" type="button">Comparador</button>
        <button class="btn btn-ghost btn-sm" data-jump="entrevistas" type="button">Entrevistas</button>
        <button class="btn btn-ghost btn-sm" data-jump="test-afinidad" type="button">Test 10 Escenarios</button>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(portalHref)}">Portal Global</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(calendarHref)}">Calendario</a>
      </div>
    </div>
  </footer>

  <script src="${escapeHtml(basePath)}/data/electionData.js"></script>
  <script src="/app.js"></script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;

    writeFile(path.join(outputDir, 'index.html'), html);

    // En modo global, asegurarse de que public/es/data/electionData.js tenga basePath='/es'
    if (!isSpain || basePath !== '') {
      const targetJsPath = path.join(outputDir, 'data', 'electionData.js');
      if (isSpain && basePath !== '') {
        const srcJs = fs.readFileSync(path.join(publicDir, 'data', 'electionData.js'), 'utf8');
        const patched = srcJs.replace("basePath: '',", `basePath: '${basePath}',`);
        writeFile(targetJsPath, patched);
      }
    }
  }

  function renderStaticPage(opts) {
    const {
      subpath,
      title,
      description,
      ogType = 'article',
      activeNav = '',
      breadcrumbs = [],
      hero = {},
      mainHtml = '',
      extraSchemas = [],
    } = opts;

    const canonicalUrl = absUrl(subpath);
    const canonicalHome = absUrl('/');

    const breadcrumbListSchema = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((bc, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: bc.name,
        item: absUrl(bc.subpath),
      })),
    };

    const webPageSchema = {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: countryConfig.locale,
      isPartOf: { '@id': `${canonicalHome}#website` },
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
        return `<a href="${escapeHtml(href(bc.subpath))}">${escapeHtml(bc.name)}</a> <span aria-hidden="true">/</span>`;
      })
      .join(' ');

    const navItems = [
      { id: 'home', href: href('/'), label: strings.nav.home },
      { id: 'comparador', href: href('/comparador'), label: strings.nav.comparatorShort },
      { id: 'entrevistas', href: href('/entrevistas'), label: strings.nav.interviews },
      { id: 'territorios', href: href('/territorios'), label: strings.vocab.territoriesNavLabel },
      { id: 'test', href: href('/test-afinidad'), label: strings.nav.test, accent: true },
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

    const topbarHtml = renderPortalTopbar({
      activeKey: countryConfig.id,
      portalHref,
      calendarHref,
      activeCountries,
      getCountryBasePath,
      rootMode,
    });

    const countdownStatic = isSpain
      ? `29 de noviembre de 2026 · ${meta.seatsCongress} escaños al Congreso`
      : `${meta.electionDateDisplay || '24 de octubre de 2027'} · ${meta.chamberSummary}`;

    return `<!DOCTYPE html>
<html lang="${escapeHtml(htmlLang)}" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="${escapeHtml(countryConfig.locale)}" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="geo.region" content="${escapeHtml(countryConfig.geoRegion)}" />
  <meta name="geo.placename" content="${escapeHtml(countryConfig.name)}" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}${escapeHtml(basePath)}/llms.txt" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:locale" content="${escapeHtml(ogLocale)}" />
  <meta property="og:site_name" content="${escapeHtml(meta.title)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:type" content="${escapeHtml(ogImageMime)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
${GTM_HEAD_SNIPPET}
  <link rel="stylesheet" href="/styles.css" />
  <script>
    (function () {
      try {
        var raw = window.localStorage.getItem('${storageKey}');
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
  <a class="skip-link" href="#main-content">${escapeHtml(strings.skipLink)}</a>

  ${topbarHtml}

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand-block" href="${escapeHtml(href('/'))}" style="text-decoration:none; color:inherit;">
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
          <span class="brand-title">${escapeHtml(brandTitleBase)} <span class="brand-badge">${escapeHtml(badgeText)}</span></span>
          <p class="brand-subtitle">${escapeHtml(brandSubtitle)}</p>
        </div>
      </a>

      <nav class="main-nav" aria-label="Secciones principales">
        ${navHtml}
      </nav>

      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="${escapeHtml(strings.quiz.themeToggleLabel)}" title="${escapeHtml(strings.quiz.themeToggleLabel)}">
          <span id="theme-icon" aria-hidden="true">◐</span>
        </button>
      </div>
    </div>
  </header>

  <section class="neutrality-banner" aria-label="Compromiso de neutralidad">
    <div class="container neutrality-inner">
      <div class="neutrality-chips">
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.officialSources)}</span>
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.zeroOpinion)}</span>
        <span class="chip chip-neutral">✓ ${escapeHtml(strings.neutralityChips.literalQuotes)}</span>
        <span class="chip chip-neutral">✓ Datos verificados ${escapeHtml(badgeText)}</span>
      </div>
      <div class="neutrality-meta">
        ${renderParticipantsPillHtml(true)}
        <div class="countdown-pill">${escapeHtml(countdownStatic)}</div>
      </div>
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
        <strong>${escapeHtml(meta.title)}</strong> — ${escapeHtml(strings.quiz.footerTagline)}
        <p class="muted-text">Datos contrastados con ${escapeHtml(strings.vocab.programsWord)} y declaraciones literales en entrevistas periodísticas (${escapeHtml(meta.decree)}).</p>
      </div>
      <div class="footer-links">
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/'))}">Inicio</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/comparador'))}">Comparador</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/entrevistas'))}">Entrevistas</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/test-afinidad'))}">Test 10 Escenarios</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/territorios'))}">${escapeHtml(strings.vocab.territoriesNavLabel)}</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(href('/comparar'))}">Duelos VS</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(portalHref)}">Portal Global</a>
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(calendarHref)}">Calendario</a>
      </div>
    </div>
  </footer>

  ${buildInlineBootstrapScript({
    storageKey,
    aiRefKey,
    statsCountry,
    parties: data.parties,
    seedAvgScore: seedStats.averageScore || 50.0,
  })}
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
  }

  function generateComparadorLanding() {
    const axesBlocks = data.axes
      .map((axis) => {
        const comp = data.axisComparisons[axis.id];
        return `
      <article class="card" style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div>
            <span class="eyebrow">Eje Programático</span>
            <h2>${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</h2>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn-sm btn-primary" href="${escapeHtml(href(`/propuestas/${axis.id}`))}">Ver las ${data.parties.length} propuestas completas →</a>
            <a class="btn btn-sm" href="${escapeHtml(homeQueryUrl(`section=comparador&axis=${axis.id}`))}">Comparar a ciegas</a>
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

    const duelPairs = getAllDuelPairs();
    const cta = buildCtaBannerCard({
      eyebrow: 'Modo Sin Sesgos',
      title: 'Prueba el Comparador Interactivo a Ciegas',
      text: `Oculta los nombres y colores de las fuerzas, marca las medidas que más te convenzan en cada uno de los ${data.axes.length} ejes y descubre al final con qué programa coincides más.`,
      primaryHref: homeQueryUrl('section=comparador'),
      primaryLabel: 'Abrir Comparador Interactivo a Ciegas →',
      secondaryHref: href('/comparar'),
      secondaryLabel: `Ver los ${duelPairs.length} duelos cara a cara (VS)`,
    });

    const html = renderStaticPage({
      subpath: '/comparador',
      title: `Comparador de Programas ${campaignTag} (${data.axes.length} Ejes) | ${meta.title}`,
      description: `Índice completo de similitudes y diferencias entre ${data.parties.map((p) => p.shortName).join(', ')} en los ${data.axes.length} ejes oficiales de ${countryConfig.name} (${badgeText}).`,
      activeNav: 'comparador',
      breadcrumbs: [
        { name: 'Inicio', subpath: '/' },
        { name: 'Comparador de Propuestas', subpath: '/comparador' },
      ],
      hero: {
        eyebrow: `${strings.comparator.eyebrow} · ${countryConfig.name}`,
        h1: `Comparador de Programas ${campaignTag}: Similitudes y Diferencias`,
        lead: `Recorre los ${data.axes.length} bloques temáticos de ${countryConfig.name} con las convergencias y divergencias exactas entre las ${data.parties.length} ${strings.vocab.partiesUnitPlural}.`,
        chips: [
          `${data.parties.length} ${isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales'}`,
          `${data.axes.length} Ejes Temáticos`,
          'Fuentes Verificadas',
          'Modo a Ciegas Disponible',
        ],
      },
      mainHtml: `${axesBlocks}\n${cta}`,
    });

    writeFile(path.join(outputDir, 'comparador.html'), html);
  }

  function generateEntrevistasLanding() {
    const quotationSchemas = data.interviews.map((iv) => ({
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
        <h2>Radiografía Expresiva de los ${data.parties.length} Referentes en Entrevista</h2>
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
        <h2>${data.interviews.length} Declaraciones Literales en Prensa, Radio, TV y Pódcasts</h2>
        <p class="muted-text">Sin valoraciones ni tertulianos: pregunta o contexto de emisión, cita textual entrecomillada y enlace al medio original.</p>
      </div>
      <div class="interviews-grid">
        ${renderInterviewCardsHtml(data.interviews)}
      </div>
    </section>
    `.trim();

    const cta = buildCtaBannerCard({
      eyebrow: 'Filtro Interactivo',
      title: 'Filtra las Entrevistas por Referente, Formato o Tema',
      text: `Usa el buscador interactivo de ${meta.title} para cruzar declaraciones por medio o palabra clave.`,
      primaryHref: homeQueryUrl('section=entrevistas'),
      primaryLabel: 'Abrir Hemeroteca Interactiva →',
      secondaryHref: href('/test-afinidad'),
      secondaryLabel: 'Ir al Test de 10 Escenarios',
    });

    const html = renderStaticPage({
      subpath: '/entrevistas',
      title: `Entrevistas ${campaignTag}: Citas Literales Sin Opinión | ${meta.title}`,
      description: `Archivo neutral con ${data.interviews.length} declaraciones literales de los principales referentes políticos de ${countryConfig.name}.`,
      activeNav: 'entrevistas',
      breadcrumbs: [
        { name: 'Inicio', subpath: '/' },
        { name: 'Entrevistas (Sin Opinión)', subpath: '/entrevistas' },
      ],
      hero: {
        eyebrow: 'Cero Columnas de Opinión · Citas Textuales',
        h1: `En Sus Propias Palabras: Entrevistas Electorales ${campaignTag}`,
        lead: 'Recopilación de entrevistas reales en prensa escrita, radio, televisión y formatos digitales. Solo la pregunta, la respuesta literal y el estilo expresivo.',
        chips: [`${data.interviews.length} Declaraciones Literales`, 'Prensa, Radio, TV y Pódcasts', '0 Tertulias de Opinión'],
      },
      mainHtml: `${expSection}\n${quotesSection}\n${cta}`,
      extraSchemas: quotationSchemas,
    });

    writeFile(path.join(outputDir, 'entrevistas.html'), html);
  }

  function generateTestLanding() {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const avgStr = Number(seedStats.averageScore || 50).toFixed(1).replace('.', ',');
    const countStr = (seedStats.totalParticipants || 0).toLocaleString('es-ES');

    const methodologyHtml = `
    <section class="card" style="margin-bottom:20px;">
      <h2>Metodología Neutral de la Brújula Electoral ${escapeHtml(campaignTag)}</h2>
      <p class="muted-text" style="margin-bottom:12px;">
        El test plantea <strong>${data.quizQuestions.length} escenarios prácticos</strong> sin siglas ni colores para evitar sesgos de marca. Las 5 respuestas de cada escenario aparecen barajadas aleatoriamente en la versión interactiva y se corresponden con posiciones reales recogidas en los documentos oficiales.
      </p>
      <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:0;">
        <div class="sim-card">
          <h3>1. Escala 0–100</h3>
          <p class="muted-text">Cada elección sitúa tu preferencia en el arco continuo de Izquierda (0) a Centro (50) y Derecha (100).</p>
        </div>
        <div class="sim-card">
          <h3>2. Ponderación Transparente</h3>
          <p class="muted-text">La afinidad por fuerza combina en un 72 % la coincidencia directa con cada medida y en un 28 % la proximidad global en el arco.</p>
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
      text: 'Responde a los 10 escenarios paso a paso en tu navegador. Tus respuestas se calculan localmente sin enviar datos personales.',
      primaryHref: homeQueryUrl('section=test-afinidad'),
      primaryLabel: 'Comenzar Test Interactivo de 10 Escenarios →',
      secondaryHref: homeQueryUrl('section=comparador'),
      secondaryLabel: 'O probar el Comparador a Ciegas',
    });

    const socialProofHtml = `
    <div class="quiz-social-proof" data-quiz-proof-dynamic style="margin-bottom:18px;" aria-live="polite">
      ${renderQuizProofHtml()}
    </div>
    `.trim();

    const barometerHtml = `
    <section class="card barometer-card" style="margin-top:20px;" aria-labelledby="heading-barometer-test">
      <div class="barometer-header">
        <div>
          <span class="eyebrow">${escapeHtml(strings.barometer.eyebrow)}</span>
          <h2 id="heading-barometer-test">${escapeHtml(strings.barometer.heading)}</h2>
          <p class="muted-text">
            ${escapeHtml(strings.barometer.notePrefix)} <strong data-live-avg>${avgStr}</strong>/100.
          </p>
        </div>
        <a href="${escapeHtml(homeQueryUrl('section=test-afinidad'))}" class="btn btn-primary btn-sm">Hacer el Test ahora →</a>
      </div>
      <div class="barometer-bars" data-live-barometer aria-live="polite">
        <p class="muted-text">${escapeHtml(strings.barometer.loading)}</p>
      </div>
      <p class="barometer-note muted-text">
        Datos reales agregados de participantes voluntarios del Test a Ciegas de ${escapeHtml(meta.title)} (contador acumulado: <strong data-live-count>${countStr}</strong>). No constituye una encuesta probabilística ni intención de voto.
      </p>
    </section>
    `.trim();

    const scenariosHtml = `
    <section class="card" style="margin-top:20px;">
      <h2 style="margin-bottom:6px;">Los ${data.quizQuestions.length} Escenarios del Test (Sin Nombres de Partido)</h2>
      <p class="muted-text" style="margin-bottom:16px;">Consulta previamente los dilemas que aborda la brújula y los ejes programáticos vinculados.</p>
      ${data.quizQuestions
        .map(
          (q, qi) => `
        <article class="scenario-box" style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span class="chip">Escenario ${qi + 1} · ${escapeHtml(q.axisLabel)}</span>
            <a class="source-link" href="${escapeHtml(href(`/propuestas/${q.axisId}`))}" style="font-size:0.82rem;">Ver propuestas del eje →</a>
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
      subpath: '/test-afinidad',
      title: `Test Electoral ${campaignTag}: Brújula de ${data.quizQuestions.length} Escenarios | ${meta.title}`,
      description: `Metodología y guía completa de los ${data.quizQuestions.length} escenarios sin siglas del test de afinidad política para ${countryConfig.name} (${badgeText}).`,
      activeNav: 'test',
      breadcrumbs: [
        { name: 'Inicio', subpath: '/' },
        { name: 'Test de 10 Escenarios', subpath: '/test-afinidad' },
      ],
      hero: {
        eyebrow: 'Brújula Electoral · Escala 0–100',
        h1: `Test de Afinidad ${campaignTag}: ${data.quizQuestions.length} Escenarios Reales Sin Nombres de Partido`,
        lead: `Comprueba cómo calcula ${meta.title} tu afinidad programática en ${countryConfig.name} a lo largo de los ${data.axes.length} bloques temáticos.`,
        chips: [`${data.quizQuestions.length} Escenarios Sin Sesgos`, 'Escala 0 Izquierda — 100 Derecha', 'Cálculo 100 % Local'],
      },
      mainHtml: `${socialProofHtml}\n${methodologyHtml}\n${ctaTop}\n${barometerHtml}\n${scenariosHtml}`,
    });

    writeFile(path.join(outputDir, 'test-afinidad.html'), html);
  }

  function generateAxisLandings() {
    const proposalsDir = path.join(outputDir, 'propuestas');

    data.axes.forEach((axis) => {
      const comp = data.axisComparisons[axis.id];
      const axisInterviews = getInterviewsForAxis(axis.id);
      const axisQuestions = data.quizQuestions.filter((q) => q.axisId === axis.id);
      const otherAxes = data.axes.filter((a) => a.id !== axis.id);
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
          <h2>Propuestas de las ${data.parties.length} ${escapeHtml(isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales')} en ${escapeHtml(axis.label)}</h2>
          <p class="muted-text">Ordenadas de izquierda a derecha en el arco político, con enlace directo a la fuente oficial de cada fuerza.</p>
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
          <p class="muted-text">Extractos textuales verificados en medios de comunicación de ${escapeHtml(countryConfig.name)}.</p>
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
        <h2>Escenario del Test ${escapeHtml(campaignTag)} sobre ${escapeHtml(axis.label)}</h2>
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
        primaryHref: homeQueryUrl(`section=comparador&axis=${axis.id}`),
        primaryLabel: 'Comparar este eje en Modo a Ciegas →',
        secondaryHref: homeQueryUrl('section=test-afinidad'),
        secondaryLabel: 'Hacer el Test de 10 Escenarios',
      });

      const otherAxesHtml = `
      <section class="card" style="margin-top:24px;">
        <h3>Explorar los otros ${otherAxes.length} ejes (${escapeHtml(countryConfig.name)})</h3>
        <div class="tag-cloud" style="margin-top:10px;">
          ${otherAxes
            .map(
              (ax) =>
                `<a class="btn btn-sm" href="${escapeHtml(href(`/propuestas/${ax.id}`))}">${escapeHtml(ax.icon)} ${escapeHtml(ax.label)}</a>`
            )
            .join('\n          ')}
        </div>
      </section>
      `.trim();

      const html = renderStaticPage({
        subpath: `/propuestas/${axis.id}`,
        title: `${axis.label}: Qué propone cada fuerza (${campaignTag}) | ${meta.title}`,
        description: `Comparativa neutral de propuestas oficiales sobre ${axis.label} entre ${data.parties.map((p) => p.shortName).join(', ')} en ${countryConfig.name}.`,
        activeNav: 'comparador',
        breadcrumbs: [
          { name: 'Inicio', subpath: '/' },
          { name: 'Comparador', subpath: '/comparador' },
          { name: axis.label, subpath: `/propuestas/${axis.id}` },
        ],
        hero: {
          eyebrow: `${axis.icon} Eje Programático ${campaignTag}`,
          h1: `${axis.label}: Qué propone cada fuerza en ${countryConfig.name}`,
          lead: `Similitudes, diferencias y medidas oficiales de las ${data.parties.length} ${strings.vocab.partiesUnitPlural} en ${axis.label}, contrastadas con fuentes documentales y citas públicas.`,
          chips: [`${data.parties.length} Propuestas Oficiales`, 'Similitudes y Diferencias', '0 Opinión'],
        },
        mainHtml: `${simSection}\n${proposalsSection}\n${interviewsSection}\n${quizSection}\n${cta}\n${otherAxesHtml}`,
      });

      writeFile(path.join(proposalsDir, `${axis.id}.html`), html);
    });
  }

  function generatePartyLandings() {
    const partidosDir = path.join(outputDir, 'partidos');

    data.parties.forEach((party) => {
      const comm = party.officialCommunication;
      const partyInterviews = data.interviews.filter((iv) => iv.partyId === party.id);
      const otherParties = data.parties.filter((p) => p.id !== party.id);

      const profileCard = `
      <section class="card" style="margin-bottom:22px; border-top:4px solid ${escapeHtml(party.color)};">
        <div class="arc-layout">
          <div class="arc-svg-wrap">
            ${buildPoliticalArcSvg(data.parties, { selectedPartyId: party.id, interactive: false })}
          </div>
          <div>
            <div class="detail-header">
              <div>
                <div class="party-badge-pill">
                  <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
                  <span>${escapeHtml(party.name)} (${escapeHtml(party.shortName)})</span>
                </div>
                <p class="muted-text">Referente / Candidatura: <strong>${escapeHtml(party.candidate)}</strong> · ${escapeHtml(party.ideologyLabel)}</p>
              </div>
              <a class="btn btn-sm btn-primary" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.partyDetail.officialWeb)}</a>
            </div>
            <p style="margin:0 0 12px 0;">${escapeHtml(party.summary)}</p>
            <div class="axis-meter">
              <div class="meter-row">
                <span>${escapeHtml(strings.partyDetail.leftRightMeter)}</span>
                <div class="meter-track">
                  <div class="meter-fill" style="width:${party.spectrumScore}%; background:${escapeHtml(party.color)};"></div>
                </div>
                <strong>${party.spectrumScore}/100</strong>
              </div>
              <div class="meter-row">
                <span>${escapeHtml(strings.partyDetail.stateMeter)}</span>
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
          <h2>Comunicación Oficial</h2>
          <ul class="comm-list" style="margin-top:10px;">
            <li><strong>${escapeHtml(strings.partyDetail.slogansLabel)}</strong> ${comm.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
            <li><strong>${escapeHtml(strings.partyDetail.toneLabel)}</strong> ${escapeHtml(comm.tone)}</li>
            <li><strong>${escapeHtml(strings.partyDetail.framingLabel)}</strong> ${escapeHtml(comm.framing)}</li>
            <li><strong>${escapeHtml(strings.partyDetail.channelsLabel)}</strong> ${escapeHtml(comm.channels)}</li>
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
          <h2>Propuestas Completas de ${escapeHtml(party.shortName)} en los ${data.axes.length} Ejes Oficiales</h2>
          <p class="muted-text">Medidas detalladas bloque por bloque con enlace directo al eje comparado y a la fuente oficial.</p>
        </div>
        <div class="proposals-grid">
          ${data.axes
            .map((axis) => {
              const prop = party.proposals[axis.id];
              return `
            <article class="card proposal-card" style="--party-color:${escapeHtml(party.color)}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="chip">${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</span>
                <a class="source-link" href="${escapeHtml(href(`/propuestas/${axis.id}`))}" style="font-size:0.78rem;">Comparar eje →</a>
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
          <h2>Entrevistas Literales de ${escapeHtml(party.shortName)} (${partyInterviews.length})</h2>
          <p class="muted-text">Todas las declaraciones textuales recogidas en hemeroteca para este espacio político.</p>
        </div>
        <div class="interviews-grid">
          ${renderInterviewCardsHtml(partyInterviews)}
        </div>
      </section>`
          : '';

      const duelsSection = `
      <section class="card" style="margin-bottom:24px;">
        <h2>Duelos Cara a Cara de ${escapeHtml(party.shortName)} frente a Otras Fuerzas</h2>
        <p class="muted-text" style="margin-bottom:12px;">Contrasta bloque a bloque las propuestas de ${escapeHtml(party.shortName)} frente a cada una de las demás fuerzas de ${escapeHtml(countryConfig.name)}.</p>
        <div class="tag-cloud">
          ${otherParties
            .map((other) => {
              const slug = getDuelSlug(party.id, other.id);
              const dist = Math.abs(party.spectrumScore - other.spectrumScore);
              return `<a class="btn btn-sm" href="${escapeHtml(href(`/comparar/${slug}`))}">${escapeHtml(party.shortName)} vs ${escapeHtml(other.shortName)} (${dist} pts)</a>`;
            })
            .join('\n          ')}
        </div>
      </section>
      `.trim();

      const cta = buildCtaBannerCard({
        eyebrow: 'Contraste Sin Sesgos',
        title: `Compara a ${party.shortName} en la App Interactiva`,
        text: 'Pon a prueba tus prioridades en el Test de 10 Escenarios o compara los 8 ejes en Modo a Ciegas para contrastar afinidad sin etiquetas.',
        primaryHref: homeQueryUrl(`section=comparador&left=${party.id}&blind=0`),
        primaryLabel: `Comparar propuestas de ${party.shortName} →`,
        secondaryHref: homeQueryUrl('section=test-afinidad'),
        secondaryLabel: 'Hacer el Test de 10 Escenarios',
      });

      const partySchema = {
        '@type': 'PoliticalParty',
        name: party.name,
        alternateName: party.shortName,
        url: absUrl(`/partidos/${party.id}`),
        sameAs: [party.officialUrl, party.secondaryUrl].filter(Boolean),
        description: party.summary,
        member: {
          '@type': 'Person',
          name: party.candidate,
        },
      };

      const html = renderStaticPage({
        subpath: `/partidos/${party.id}`,
        title: `${party.shortName} (${party.candidate}): Propuestas ${campaignTag} y Entrevistas | ${meta.title}`,
        description: `Ficha completa de ${party.name} (${party.shortName}) y ${party.candidate} en ${countryConfig.name}: posición ${party.spectrumScore}/100 en el arco político, ${data.axes.length} ejes, estilo comunicativo y citas literales.`,
        activeNav: 'home',
        breadcrumbs: [
          { name: 'Inicio', subpath: '/' },
          { name: `${party.shortName} (${party.candidate})`, subpath: `/partidos/${party.id}` },
        ],
        hero: {
          eyebrow: `${party.ideologyLabel} · Arco ${party.spectrumScore}/100`,
          h1: `${party.name} (${party.shortName}) — Propuestas ${campaignTag} y Referente: ${party.candidate}`,
          lead: party.summary,
          chips: [
            `Referente: ${party.candidate}`,
            `Arco: ${party.spectrumScore}/100`,
            `${data.axes.length} Ejes Programáticos`,
            `${partyInterviews.length} Citas Literales`,
          ],
        },
        mainHtml: `${profileCard}\n${commSection}\n${proposalsSection}\n${interviewsSection}\n${duelsSection}\n${cta}`,
        extraSchemas: [partySchema],
      });

      writeFile(path.join(partidosDir, `${party.id}.html`), html);
    });
  }

  function generateTerritorialLandings() {
    const territoriosDir = path.join(outputDir, 'territorios');
    const roleTitle = isSpain ? 'Papel 29-N' : strings.vocab.territoriesRolePrefix;

    const arithmeticCard = isSpain
      ? `
    <section class="card" style="margin-bottom:22px;">
      <h2>Aritmética Parlamentaria del 29-N: Por qué Deciden los Partidos Territoriales</h2>
      <p style="margin:8px 0 14px 0;">
        De acuerdo con el <strong>${escapeHtml(meta.decree)}</strong>, el 29 de noviembre de 2026 están llamados a las urnas <strong>${meta.electoralCensus.toLocaleString('es-ES')} electores</strong> para elegir <strong>${meta.seatsCongress} escaños en el Congreso de los Diputados</strong> y <strong>${meta.seatsSenate} en el Senado</strong>.
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
    `.trim()
      : `
    <section class="card" style="margin-bottom:22px;">
      <h2>Aritmética Legislativa en ${escapeHtml(countryConfig.name)}: Bloques Provinciales y Gobernabilidad</h2>
      <p style="margin:8px 0 14px 0;">
        Bajo el <strong>${escapeHtml(meta.decree)}</strong>, el padrón electoral supera los <strong>${meta.electoralCensus.toLocaleString('es-ES')} electores habilitados</strong> y el Congreso Nacional se integra con <strong>${meta.seatsCongress} bancas en Diputados</strong> y <strong>${meta.seatsSenate} en el Senado</strong>.
      </p>
      <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom:0;">
        <div class="sim-card">
          <h3>Quórum y Mayoría: ${majoritySeats} Bancas</h3>
          <p class="muted-text">Para abrir sesión y aprobar leyes ordinarias en Diputados se requieren ${majoritySeats} votos sobre ${meta.seatsCongress} bancas (y 37 sobre 72 en el Senado).</p>
        </div>
        <div class="sim-card">
          <h3>Tercio de Vetos y Dos Tercios</h3>
          <p class="muted-text">Sostener un veto presidencial o insistir con una ley vetada depende de un tercio o dos tercios de los votos presentes, haciendo decisivo a cada bloque provincial.</p>
        </div>
        <div class="sim-card">
          <h3>Córdoba, Misiones, Patagonia y CABA</h3>
          <p class="muted-text">Los oficialismos provinciales y bloques republicanos autónomos definen quórum, leyes fiscales, coparticipación y marcos de hidrocarburos y agroindustria.</p>
        </div>
      </div>
    </section>
    `.trim();

    const listCards = `
    <section>
      <div style="margin-bottom:14px;">
        <h2>Las ${(data.territorialParties || []).length} ${escapeHtml(isSpain ? 'Formaciones Territoriales' : 'Fuerzas Provinciales y Bloques')} Analizados</h2>
        <p class="muted-text">Prioridades programáticas, referentes y rol declarado en el Congreso Nacional.</p>
      </div>
      <div class="territorial-grid">
        ${(data.territorialParties || [])
          .map(
            (tp) => `
          <article class="territorial-item" style="--party-color:${escapeHtml(tp.color)}; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <strong>${escapeHtml(tp.shortName)} · ${escapeHtml(tp.name)}</strong>
              <span class="chip">${escapeHtml(tp.territory)}</span>
            </div>
            <p class="muted-text" style="font-size:0.84rem;"><strong>Referente:</strong> ${escapeHtml(tp.candidate)} · ${escapeHtml(tp.spectrumLabel)}</p>
            <p style="margin:0; font-size:0.86rem;"><strong>Prioridades:</strong> ${escapeHtml(tp.priorities)}</p>
            <p class="muted-text" style="font-size:0.84rem;"><strong>${escapeHtml(roleTitle)}:</strong> ${escapeHtml(tp.parliamentaryRole)}</p>
            <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:8px; border-top:1px solid var(--border);">
              <a class="source-link" href="${escapeHtml(href(`/territorios/${tp.id}`))}">Ver ficha completa →</a>
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
      title: 'Explora el Arco Político Nacional y Bloques Territoriales',
      text: `Consulta en la vista principal la interacción entre las ${data.parties.length} fuerzas nacionales y el tablero parlamentario completo.`,
      primaryHref: homeQueryUrl('section=arco-overview'),
      primaryLabel: 'Ir al Arco Político Interactivo →',
      secondaryHref: href('/comparar'),
      secondaryLabel: 'Comparar fuerzas nacionales (VS)',
    });

    writeFile(
      path.join(territoriosDir, 'index.html'),
      renderStaticPage({
        subpath: '/territorios',
        title: `${strings.vocab.territoriesHeading} (${campaignTag}) | ${meta.title}`,
        description: `Análisis neutral de la aritmética parlamentaria (${meta.seatsCongress} ${strings.vocab.seatUnit}) y el papel de ${(data.territorialParties || []).map((t) => t.shortName).join(', ')} en ${countryConfig.name}.`,
        activeNav: 'territorios',
        breadcrumbs: [
          { name: 'Inicio', subpath: '/' },
          { name: strings.vocab.territoriesNavLabel, subpath: '/territorios' },
        ],
        hero: {
          eyebrow: `${strings.vocab.territoriesEyebrow} · ${meta.seatsCongress} ${strings.vocab.seatUnit}`,
          h1: `${strings.vocab.territoriesHeading} (${campaignTag})`,
          lead: strings.vocab.territoriesLead,
          chips: [
            `${meta.seatsCongress} ${strings.vocab.seatUnit}`,
            `Mayoría: ${majoritySeats}`,
            `${meta.seatsSenate} Senado`,
            `${(data.territorialParties || []).length} Fuerzas Analizadas`,
          ],
        },
        mainHtml: `${arithmeticCard}\n${listCards}\n${ctaIndex}`,
      })
    );

    const territorialAxisSlug = isSpain ? 'territorial' : 'federalismo';

    (data.territorialParties || []).forEach((tp) => {
      const relatedInterviews = data.interviews.filter((iv) => iv.partyId === tp.id);
      const otherTerritorial = (data.territorialParties || []).filter((x) => x.id !== tp.id);

      const detailHtml = `
      <section class="card" style="margin-bottom:22px; border-left:5px solid ${escapeHtml(tp.color)};">
        <div class="detail-header">
          <div>
            <div class="party-badge-pill">
              <span class="color-swatch" style="background:${escapeHtml(tp.color)}"></span>
              <span>${escapeHtml(tp.name)} (${escapeHtml(tp.shortName)})</span>
            </div>
            <p class="muted-text">Distrito / Territorio: <strong>${escapeHtml(tp.territory)}</strong> · Referente: <strong>${escapeHtml(tp.candidate)}</strong> · ${escapeHtml(tp.spectrumLabel)}</p>
          </div>
          <a class="btn btn-sm btn-primary" href="${escapeHtml(tp.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.partyDetail.officialWeb)}</a>
        </div>

        <div class="similarity-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom:0;">
          <div class="sim-card">
            <h2>Prioridades Programáticas</h2>
            <p style="margin-top:8px;">${escapeHtml(tp.priorities)}</p>
          </div>
          <div class="sim-card">
            <h2>${escapeHtml(roleTitle)}</h2>
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
        <h2>Fuentes y Hemeroteca</h2>
        <p class="muted-text">Las posiciones recogidas de ${escapeHtml(tp.shortName)} para esta guía proceden de su documentación oficial en <a class="source-link" href="${escapeHtml(tp.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tp.officialUrl)} ↗</a>. Puedes consultar declaraciones literales de otros líderes en la <a class="source-link" href="${escapeHtml(href('/entrevistas'))}">Hemeroteca de Entrevistas</a>.</p>
      </section>`;

      const navOthers = `
      <section class="card" style="margin-bottom:22px;">
        <h3>Otras fuerzas territoriales (${escapeHtml(countryConfig.name)})</h3>
        <div class="tag-cloud" style="margin-top:10px;">
          <a class="btn btn-sm" href="${escapeHtml(href('/territorios'))}">← Ver aritmética completa</a>
          ${otherTerritorial
            .map(
              (o) =>
                `<a class="btn btn-sm" href="${escapeHtml(href(`/territorios/${o.id}`))}">${escapeHtml(o.shortName)} (${escapeHtml(o.territory)})</a>`
            )
            .join('\n          ')}
        </div>
      </section>
      `.trim();

      const cta = buildCtaBannerCard({
        eyebrow: `Tablero ${campaignTag}`,
        title: 'Consulta el Arco Nacional y el Comparador de Propuestas',
        text: 'Contrasta cómo encajan las demandas provinciales o territoriales con las propuestas de las fuerzas nacionales.',
        primaryHref: href(`/propuestas/${territorialAxisSlug}`),
        primaryLabel: `Ver eje ${escapeHtml(getAxis(territorialAxisSlug).label)} →`,
        secondaryHref: homeQueryUrl(`section=comparador&axis=${territorialAxisSlug}`),
        secondaryLabel: 'Abrir eje en el Comparador',
      });

      const tpSchema = {
        '@type': 'PoliticalParty',
        name: tp.name,
        alternateName: tp.shortName,
        url: absUrl(`/territorios/${tp.id}`),
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
          subpath: `/territorios/${tp.id}`,
          title: `${tp.shortName} (${tp.territory}) — ${campaignTag} | ${meta.title}`,
          description: `Prioridades programáticas, referente (${tp.candidate}) y rol parlamentario de ${tp.name} (${tp.shortName}) en ${countryConfig.name}.`,
          activeNav: 'territorios',
          breadcrumbs: [
            { name: 'Inicio', subpath: '/' },
            { name: strings.vocab.territoriesNavLabel, subpath: '/territorios' },
            { name: tp.shortName, subpath: `/territorios/${tp.id}` },
          ],
          hero: {
            eyebrow: `${tp.territory} · ${tp.spectrumLabel}`,
            h1: `${tp.shortName} (${tp.name}) — ${tp.territory}`,
            lead: `Referente: ${tp.candidate}. Prioridades y rol parlamentario en un Congreso de ${meta.seatsCongress} ${strings.vocab.seatUnit}.`,
            chips: [tp.territory, tp.spectrumLabel, `Referente: ${tp.candidate}`],
          },
          mainHtml: `${detailHtml}\n${ivSection}\n${navOthers}\n${cta}`,
          extraSchemas: [tpSchema],
        })
      );
    });
  }

  function generateComparisonLandings() {
    const compararDir = path.join(outputDir, 'comparar');
    const pairs = getAllDuelPairs();

    const indexCards = `
    <section>
      <div style="margin-bottom:16px;">
        <h2>Los ${pairs.length} Duelos Cara a Cara entre ${escapeHtml(isSpain ? 'Partidos Estatales' : 'Fuerzas Nacionales')}</h2>
        <p class="muted-text">Cada comparativa enfrenta punto por punto las propuestas de los ${data.axes.length} ejes oficiales, el tono de comunicación y la distancia en el arco político.</p>
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
              ${escapeHtml(p1.candidate)} (${p1.spectrumScore}/100) frente a ${escapeHtml(p2.candidate)} (${p2.spectrumScore}/100) en los ${data.axes.length} ejes temáticos.
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <a class="btn btn-sm btn-primary" href="${escapeHtml(href(`/comparar/${slug}`))}">Ver comparativa completa →</a>
              <a class="btn btn-sm" href="${escapeHtml(homeQueryUrl(`section=comparador&left=${p1.id}&right=${p2.id}&blind=0`))}">Duelo interactivo</a>
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
      text: `Si no quieres dejarte influir por marcas partidistas, compara las ${data.parties.length} opciones mezcladas sin nombres y revela tus coincidencias al terminar.`,
      primaryHref: homeQueryUrl('section=comparador'),
      primaryLabel: 'Abrir Comparador a Ciegas →',
      secondaryHref: homeQueryUrl('section=test-afinidad'),
      secondaryLabel: 'Hacer el Test de 10 Escenarios',
    });

    writeFile(
      path.join(compararDir, 'index.html'),
      renderStaticPage({
        subpath: '/comparar',
        title: `Comparativas Cara a Cara ${campaignTag}: ${pairs.length} Duelos | ${meta.title}`,
        description: `Todas las comparativas cara a cara entre ${data.parties.map((p) => p.shortName).join(', ')} en los ${data.axes.length} ejes oficiales de ${countryConfig.name}.`,
        activeNav: 'comparador',
        breadcrumbs: [
          { name: 'Inicio', subpath: '/' },
          { name: 'Comparativas Cara a Cara', subpath: '/comparar' },
        ],
        hero: {
          eyebrow: `Frente a Frente · ${data.axes.length} Ejes`,
          h1: `Comparativas Cara a Cara ${campaignTag}: Los ${pairs.length} Duelos entre Fuerzas Principales`,
          lead: 'Selecciona cualquier pareja de candidaturas para contrastar su distancia ideológica, estrategia comunicativa y propuestas bloque por bloque.',
          chips: [`${pairs.length} Duelos Únicos`, `${data.axes.length} Ejes Lado a Lado`, 'Distancia en el Arco 0–100'],
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
            ${buildPoliticalArcSvg(data.parties, { highlightPartyIds: [p1.id, p2.id], interactive: false })}
          </div>
          <div>
            <h2>Distancia Ideológica y Posicionamiento</h2>
            <p class="muted-text" style="margin-bottom:14px;">
              Separación en el espectro general izquierda-derecha: <strong>${dist} puntos sobre 100</strong> (${econDiff} puntos en eje económico y ${socialDiff} puntos en eje social-territorial).
            </p>
            <div style="display:grid; gap:12px;">
              <div class="comm-box" style="margin-top:0; border-left:4px solid ${escapeHtml(p1.color)};">
                <h4><a class="source-link" href="${escapeHtml(href(`/partidos/${p1.id}`))}">${escapeHtml(p1.shortName)} — ${escapeHtml(p1.candidate)}</a> (${p1.spectrumScore}/100)</h4>
                <p class="muted-text">${escapeHtml(p1.summary)}</p>
              </div>
              <div class="comm-box" style="margin-top:0; border-left:4px solid ${escapeHtml(p2.color)};">
                <h4><a class="source-link" href="${escapeHtml(href(`/partidos/${p2.id}`))}">${escapeHtml(p2.shortName)} — ${escapeHtml(p2.candidate)}</a> (${p2.spectrumScore}/100)</h4>
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
          <h2>Comparativa Eje por Eje: ${escapeHtml(p1.shortName)} vs ${escapeHtml(p2.shortName)} (${data.axes.length} Ejes)</h2>
          <p class="muted-text">Contraste directo de titulares y medidas oficiales en cada bloque temático.</p>
        </div>
        <div class="vs-comparison-grid">
          ${data.axes
            .map((axis) => {
              const prop1 = p1.proposals[axis.id];
              const prop2 = p2.proposals[axis.id];
              return `
            <article class="vs-row-card">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                <h3>${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}</h3>
                <a class="source-link" href="${escapeHtml(href(`/propuestas/${axis.id}`))}" style="font-size:0.82rem;">Ver las ${data.parties.length} fuerzas →</a>
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
        text: `Explora esta pareja directamente dentro de la herramienta interactiva de ${meta.title} o cambia en un clic al Modo Sin Sesgos.`,
        primaryHref: homeQueryUrl(`section=comparador&left=${p1.id}&right=${p2.id}&blind=0`),
        primaryLabel: 'Abrir duelo interactivo en el Comparador →',
        secondaryHref: href('/comparar'),
        secondaryLabel: `Ver los otros ${pairs.length - 1} duelos VS`,
      });

      writeFile(
        path.join(compararDir, `${slug}.html`),
        renderStaticPage({
          subpath: `/comparar/${slug}`,
          title: `Programa Electoral ${p1.shortName} vs ${p2.shortName} (${campaignTag}): Comparativa | ${meta.title}`,
          description: `Compara el programa electoral oficial de ${p1.name} (${p1.candidate}) vs ${p2.name} (${p2.candidate}) en los ${data.axes.length} ejes clave, tono comunicativo y distancia de ${dist} puntos en ${countryConfig.name}.`,
          activeNav: 'comparador',
          breadcrumbs: [
            { name: 'Inicio', subpath: '/' },
            { name: 'Comparar', subpath: '/comparar' },
            { name: `${p1.shortName} vs ${p2.shortName}`, subpath: `/comparar/${slug}` },
          ],
          hero: {
            eyebrow: `Duelo Programático · Distancia ${dist} pts`,
            h1: `${p1.shortName} vs ${p2.shortName}: Comparativa de Propuestas y Discurso (${campaignTag})`,
            lead: `Contraste directo entre ${p1.candidate} (${p1.shortName}) y ${p2.candidate} (${p2.shortName}) en los ${data.axes.length} bloques oficiales, tono de campaña y posicionamiento izquierda-derecha.`,
            chips: [
              `${p1.shortName}: ${p1.spectrumScore}/100`,
              `${p2.shortName}: ${p2.spectrumScore}/100`,
              `Distancia: ${dist} pts`,
              `${data.axes.length} Ejes Lado a Lado`,
            ],
          },
          mainHtml: `${overviewHtml}\n${toneContrastHtml}\n${axesVsHtml}\n${cta}`,
        })
      );
    });
  }

  function generateCountryLlmsFiles() {
    const pairs = getAllDuelPairs();
    const llmsTxt = `# ${meta.title}

> Plataforma cívica neutral de información electoral sobre ${countryConfig.name} (${countryConfig.electionName} · ${meta.decree}). Reúne exclusivamente fuentes programáticas oficiales, análisis descriptivo de comunicación y citas literales en entrevistas periodísticas, sin columnas de opinión.

## Datos Electorales Clave (${countryConfig.name})
- **Fecha electoral**: ${meta.electionDate} (${meta.electionDateDisplay || countryConfig.electionDateLabel})
- **Marco legal**: ${meta.decree}
- **Cámara baja (${isSpain ? 'Congreso de los Diputados' : 'Cámara de Diputados'})**: ${meta.seatsCongress} ${strings.vocab.seatUnit} (mayoría / quórum: ${majoritySeats})
- **Senado**: ${meta.seatsSenate} ${strings.vocab.seatUnit}
- **Padrón / Censo electoral**: ${meta.electoralCensus.toLocaleString('es-ES')} ${strings.vocab.censusUnit}
- **Metodología**: Solo fuentes oficiales de partidos, cero columnas de opinión, citas literales verificadas y modo de lectura a ciegas por defecto.
- **Corpus completo para IA (Markdown)**: [${siteUrl}${basePath}/llms-full.txt](${siteUrl}${basePath}/llms-full.txt)
- **Dataset estructurado (JSON)**: [${siteUrl}${basePath}/data/election-data.json](${siteUrl}${basePath}/data/election-data.json)
- **Portal Global y Calendario**: [${siteUrl}${portalHref}](${siteUrl}${portalHref}) · [${siteUrl}${calendarHref}](${siteUrl}${calendarHref})

## Secciones Principales
- [Inicio · Arco Político y Comunicación](${absUrl('/')}): Vista general de izquierda (0) a derecha (100), tabla comparativa rápida y acceso interactivo.
- [Comparador de Propuestas (${data.axes.length} Ejes)](${absUrl('/comparador')}): Índice de similitudes y diferencias programáticas por bloque.
- [Hemeroteca de Entrevistas Literales](${absUrl('/entrevistas')}): ${data.interviews.length} declaraciones textuales en prensa, radio, TV y pódcasts.
- [Test de Afinidad de ${data.quizQuestions.length} Escenarios](${absUrl('/test-afinidad')}): Brújula electoral sin siglas ni nombres de partido sobre escala 0–100.
- [${strings.vocab.territoriesHeading}](${absUrl('/territorios')}): Aritmética legislativa y rol de las fuerzas territoriales/provinciales.
- [Comparativas Cara a Cara (${pairs.length} Duelos VS)](${absUrl('/comparar')}): Matriz de enfrentamientos directos entre fuerzas principales.

## Fuerzas Principales (${data.parties.length})
${data.parties
  .map(
    (p) =>
      `- [${p.shortName} — ${p.name} (${p.candidate})](${absUrl(`/partidos/${p.id}`)}): Arco ${p.spectrumScore}/100 · ${p.ideologyLabel}. Web oficial: ${p.officialUrl}`
  )
  .join('\n')}

## Fuerzas Territoriales / Provinciales (${(data.territorialParties || []).length})
${(data.territorialParties || [])
  .map(
    (tp) =>
      `- [${tp.shortName} — ${tp.name} (${tp.territory})](${absUrl(`/territorios/${tp.id}`)}): Referente ${tp.candidate} · ${tp.spectrumLabel}. Web oficial: ${tp.officialUrl}`
  )
  .join('\n')}

## Ejes Programáticos (${data.axes.length})
${data.axes
  .map(
    (ax) =>
      `- [${ax.label}](${absUrl(`/propuestas/${ax.id}`)}): Similitudes, diferencias y propuestas de las ${data.parties.length} fuerzas en ${ax.label}.`
  )
  .join('\n')}

## Comparativas Cara a Cara (${pairs.length})
${pairs
  .map(
    ([p1, p2]) =>
      `- [${p1.shortName} vs ${p2.shortName}](${absUrl(`/comparar/${p1.id}-vs-${p2.id}`)}): Distancia de ${Math.abs(p1.spectrumScore - p2.spectrumScore)} puntos y contraste en los ${data.axes.length} ejes.`
  )
  .join('\n')}

## Corpus Completo
- [${meta.title} — Corpus Íntegro (llms-full.txt)](${siteUrl}${basePath}/llms-full.txt): Contiene el 100 % de propuestas por eje y fuerza, similitudes, diferencias, entrevistas con cita literal y los ${data.quizQuestions.length} escenarios del test.
`;

    const sections = [];
    sections.push(`# ${meta.title} — Corpus Electoral Completo (${countryConfig.name})

- URL canónica: ${absUrl('/')}
- Fecha electoral: ${meta.electionDate}
- Marco: ${meta.decree}
- ${isSpain ? 'Congreso' : 'Cámara de Diputados'}: ${meta.seatsCongress} ${strings.vocab.seatUnit} (mayoría: ${majoritySeats})
- Senado: ${meta.seatsSenate} ${strings.vocab.seatUnit}
- Padrón / Censo: ${meta.electoralCensus.toLocaleString('es-ES')}
- Licencia de datos compilados: https://creativecommons.org/licenses/by/4.0/
`);

    sections.push(`## 1. Fuerzas Principales (${data.parties.length}) y Propuestas por ${data.axes.length} Ejes`);
    data.parties.forEach((p) => {
      const comm = p.officialCommunication;
      const axesText = data.axes
        .map((ax) => {
          const prop = p.proposals[ax.id];
          return `#### ${ax.label} (${absUrl(`/propuestas/${ax.id}`)})
- **Titular**: ${prop.headline}
${prop.points.map((pt) => `- ${pt}`).join('\n')}
- **Fuente**: ${prop.sourceLabel} (${prop.sourceUrl})`;
        })
        .join('\n\n');

      sections.push(`### ${p.name} (${p.shortName}) — Referente: ${p.candidate}
- URL en PolitiFácil: ${absUrl(`/partidos/${p.id}`)}
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

    sections.push(`## 2. Fuerzas Territoriales / Provinciales Clave (${(data.territorialParties || []).length})`);
    (data.territorialParties || []).forEach((tp) => {
      sections.push(`### ${tp.shortName} — ${tp.name} (${tp.territory})
- URL en PolitiFácil: ${absUrl(`/territorios/${tp.id}`)}
- Referente: ${tp.candidate}
- Espectro: ${tp.spectrumLabel}
- Web oficial: ${tp.officialUrl}
- Prioridades: ${tp.priorities}
- Rol parlamentario: ${tp.parliamentaryRole}`);
    });

    sections.push(`## 3. Similitudes y Diferencias por Eje Temático (${data.axes.length})`);
    data.axes.forEach((ax) => {
      const comp = data.axisComparisons[ax.id];
      sections.push(`### ${ax.label} (${absUrl(`/propuestas/${ax.id}`)})
**Similitudes:**
${comp.similarities.map((s) => `- ${s}`).join('\n')}

**Diferencias:**
${comp.differences.map((d) => `- ${d}`).join('\n')}`);
    });

    sections.push(`## 4. Hemeroteca de Entrevistas con Cita Literal (${data.interviews.length})`);
    data.interviews.forEach((iv, idx) => {
      const p = findAnyParty(iv.partyId);
      sections.push(`### [${idx + 1}] ${iv.candidate} (${p.shortName}) en ${iv.media} — ${iv.program} (${iv.date})
- Formato: ${iv.formatType}
- Tema: ${iv.topic}
- Contexto/Pregunta: ${iv.questionContext}
- Cita literal: "${iv.quote}"
- Estilo expresivo: ${iv.expressionStyle}
- Fuente del medio: ${iv.sourceUrl}`);
    });

    sections.push(`## 5. Test de Afinidad de ${data.quizQuestions.length} Escenarios`);
    data.quizQuestions.forEach((q, qi) => {
      sections.push(`### Escenario ${qi + 1}: ${q.title} [${q.axisLabel}]
${q.scenario}
${q.options
  .map(
    (o, oi) =>
      `${oi + 1}. (Arco ${o.spectrumScore}/100, alineado con: ${(o.alignedParties || []).join(', ')}) ${o.text}`
  )
  .join('\n')}`);
    });

    sections.push(`## 6. Preguntas Frecuentes Verificadas (${countryConfig.name})`);
    faqItems.forEach((faq) => {
      sections.push(`### ${faq.question}\n${faq.answer}`);
    });

    return { llmsTxt, llmsFullTxt: sections.join('\n\n') };
  }

  function getCountrySitemapEntries() {
    return [
      { path: href('/'), priority: isSpain ? '1.0' : '0.95' },
      { path: href('/comparador'), priority: '0.9' },
      { path: href('/entrevistas'), priority: '0.9' },
      { path: href('/test-afinidad'), priority: '0.9' },
      ...data.axes.map((ax) => ({ path: href(`/propuestas/${ax.id}`), priority: '0.9' })),
      ...data.parties.map((p) => ({ path: href(`/partidos/${p.id}`), priority: '0.9' })),
      { path: href('/territorios'), priority: '0.8' },
      ...(data.territorialParties || []).map((tp) => ({ path: href(`/territorios/${tp.id}`), priority: '0.8' })),
      { path: href('/comparar'), priority: '0.8' },
      ...getAllDuelPairs().map(([p1, p2]) => ({ path: href(`/comparar/${p1.id}-vs-${p2.id}`), priority: '0.8' })),
    ];
  }

  // Ejecutar generación completa para el país
  writeFile(path.join(outputDir, 'og-banner.svg'), buildOgBannerSvg());
  writeFile(path.join(outputDir, 'data', 'election-data.json'), JSON.stringify(data, null, 2));

  generateCountryHomeIndexHtml();
  generateComparadorLanding();
  generateEntrevistasLanding();
  generateTestLanding();
  generateAxisLandings();
  generatePartyLandings();
  generateTerritorialLandings();
  generateComparisonLandings();

  const { llmsTxt, llmsFullTxt } = generateCountryLlmsFiles();
  if (!isSpain || basePath !== '') {
    writeFile(path.join(outputDir, 'llms.txt'), llmsTxt);
  }
  writeFile(path.join(outputDir, 'llms-full.txt'), llmsFullTxt);

  const sitemapEntries = getCountrySitemapEntries();
  return {
    countryId: countryConfig.id,
    basePath: basePath || '/',
    sitemapEntries,
    llmsTxt,
    stats: {
      pagesGenerated: sitemapEntries.length,
      axesPages: data.axes.length,
      partyPages: data.parties.length,
      territorialPages: (data.territorialParties || []).length + 1,
      comparisonPages: getAllDuelPairs().length + 1,
      interviewsCount: data.interviews.length,
      quizQuestionsCount: data.quizQuestions.length,
    },
    lastmod,
  };
}

module.exports = {
  buildCountrySite,
};
