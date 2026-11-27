'use strict';

const path = require('path');
const {
  INDEXNOW_KEY,
  GTM_HEAD_SNIPPET,
  writeFile,
  escapeHtml,
  escapeXml,
  safeJsonLd,
  renderPortalTopbar,
} = require('./shared-render');
const { buildDisintegratingGridMapSvg } = require('./map-geometry');

function buildFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="PolitiFácil">
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

function buildManifest(globalHomePath) {
  return JSON.stringify(
    {
      name: 'PolitiFácil — Comparador Electoral Neutral Internacional',
      short_name: 'PolitiFácil',
      description:
        'Portal cívico neutral y sin sesgos para comparar propuestas oficiales, entrevistas literales y tests a ciegas en España, Latinoamérica y Estados Unidos.',
      lang: 'es',
      start_url: globalHomePath,
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

const TYPE_LABELS = {
  presidential: 'Presidencial',
  general: 'Generales',
  legislative: 'Legislativas / Primarias',
  regional: 'Regionales / Municipales',
};

const REGION_LABELS = {
  es: 'España',
  latam: 'Latinoamérica',
  us: 'Estados Unidos',
};

function renderSharedHead({ siteUrl, canonicalPath, title, description, jsonLd }) {
  const canonicalUrl = `${siteUrl}${canonicalPath === '/' ? '/' : canonicalPath}`;
  const ogImage = `${siteUrl}/portal/og-banner.png`;

  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="es" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="PolitiFácil" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
${GTM_HEAD_SNIPPET}
  <link rel="stylesheet" href="/styles.css" />
  <script>
    (function () {
      try {
        var t = window.localStorage.getItem('politifacil_theme_v1');
        if (!t) {
          var legacy = JSON.parse(window.localStorage.getItem('politifacil_29n_state_v1') || '{}');
          if (legacy && legacy.theme) t = legacy.theme;
        }
        if (t === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch (e) {}
    })();
  </script>
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>`;
}

function buildPortalOgBannerSvg() {
  const tileCoords = [
    [820, 120, 0.9, '#f59e0b'], [852, 120, 0.55, '#1e3a46'], [884, 136, 0.85, '#34d399'], [916, 152, 0.45, '#1e3a46'],
    [836, 168, 0.75, '#1e3a46'], [868, 168, 0.95, '#f59e0b'], [900, 184, 0.65, '#38bdf8'], [932, 184, 0.8, '#1e3a46'], [964, 200, 0.5, '#f59e0b'],
    [852, 216, 0.85, '#1e3a46'], [884, 216, 0.7, '#34d399'], [916, 232, 0.9, '#f59e0b'], [948, 232, 0.6, '#1e3a46'], [980, 248, 0.75, '#38bdf8'], [1012, 248, 0.4, '#1e3a46'],
    [868, 264, 0.5, '#1e3a46'], [900, 264, 0.85, '#1e3a46'], [932, 280, 0.95, '#f59e0b'], [964, 280, 0.7, '#34d399'], [996, 296, 0.55, '#1e3a46'], [1028, 296, 0.85, '#f59e0b'],
    [916, 312, 0.65, '#38bdf8'], [948, 328, 0.9, '#1e3a46'], [980, 328, 0.8, '#f59e0b'], [1012, 344, 0.6, '#1e3a46'], [1044, 344, 0.45, '#34d399'],
    [932, 376, 0.75, '#1e3a46'], [964, 376, 0.85, '#f59e0b'], [996, 392, 0.5, '#38bdf8'], [1028, 408, 0.7, '#1e3a46'],
    [948, 424, 0.9, '#34d399'], [980, 440, 0.65, '#1e3a46'], [964, 472, 0.85, '#f59e0b'], [996, 488, 0.45, '#1e3a46'],
    [1060, 148, 0.45, '#f59e0b'], [1092, 180, 0.35, '#38bdf8'], [1076, 236, 0.5, '#34d399'], [1092, 300, 0.4, '#f59e0b'], [1076, 420, 0.35, '#1e3a46'],
  ];
  const tiles = tileCoords
    .map(([x, y, op, fill]) => `<rect x="${x}" y="${y}" width="22" height="22" rx="4" fill="${fill}" opacity="${op}"/>`)
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PolitiFácil — Portal Electoral Neutral Internacional">
  <defs>
    <radialGradient id="petrolGlow" cx="76%" cy="46%" r="58%">
      <stop offset="0%" stop-color="#122830"/>
      <stop offset="100%" stop-color="#08151a"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#petrolGlow)"/>
  <rect x="28" y="28" width="1144" height="574" rx="22" fill="none" stroke="rgba(248,250,252,0.14)" stroke-width="1.5"/>
  <rect x="72" y="76" width="8" height="478" rx="4" fill="#f59e0b"/>
  ${tiles}
  <rect x="108" y="88" width="470" height="38" rx="8" fill="rgba(245,158,11,0.16)" stroke="rgba(245,158,11,0.45)" stroke-width="1.5"/>
  <text x="128" y="112" font-family="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" font-weight="700" letter-spacing="1.6" fill="#fde68a">ESPAÑA · LATINOAMÉRICA · ESTADOS UNIDOS</text>
  <text x="108" y="246" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="108" font-weight="800" letter-spacing="-3" fill="#ffffff">POLITIFÁCIL</text>
  <text x="108" y="308" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="30" font-weight="700" fill="#fef3c7">Un continente polarizado. Una brújula neutral.</text>
  <text x="108" y="370" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="#cbd5e1">Programas oficiales a ciegas · Citas literales · Tests sin siglas</text>
  <line x1="108" y1="436" x2="780" y2="436" stroke="rgba(248,250,252,0.16)" stroke-width="1.5"/>
  <rect x="108" y="468" width="180" height="44" rx="10" fill="#f59e0b"/>
  <text x="198" y="496" text-anchor="middle" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="#08151a">España (29-N)</text>
  <rect x="304" y="468" width="206" height="44" rx="10" fill="#f59e0b"/>
  <text x="407" y="496" text-anchor="middle" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="#08151a">Argentina (2027)</text>
  <rect x="526" y="468" width="234" height="44" rx="10" fill="#0e2027" stroke="rgba(248,250,252,0.2)" stroke-width="1.5"/>
  <text x="643" y="496" text-anchor="middle" font-family="'Space Grotesk', system-ui, -apple-system, sans-serif" font-size="17" font-weight="700" fill="#f8fafc">Calendario 2026–2028</text>
  <text x="108" y="556" font-family="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="600" fill="#cbd5e1">0% columnas de opinión · Solo fuentes electorales oficiales · politifacil.com</text>
</svg>
`;
}

function buildGlobalLandingPage(context) {
  const {
    siteUrl,
    rootMode,
    publicDir,
    portalHref,
    calendarHref,
    articlesHref = '/articulos',
    countries,
    activeCountries,
    upcomingCountries,
    getCountryBasePath,
    countryBuilds,
    calendarData,
    articlesBuild,
    lastmod,
  } = context;

  const isGlobalRoot = portalHref === '/';
  const outFile = isGlobalRoot ? path.join(publicDir, 'index.html') : path.join(publicDir, 'portal', 'index.html');
  const canonicalUrl = `${siteUrl}${portalHref === '/' ? '/' : portalHref}`;
  const ogImage = `${siteUrl}/portal/og-banner.png`;
  writeFile(path.join(publicDir, 'portal', 'og-banner.svg'), buildPortalOgBannerSvg());

  const title = 'POLITIFÁCIL | Portal Electoral Neutral de España, Latinoamérica y EE. UU.';
  const description =
    'Programas oficiales comparados a ciegas, citas literales sin opiniones de terceros y tests de afinidad sin siglas. Elige país y comprueba qué propone realmente cada fuerza.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonicalUrl}#website`,
        url: canonicalUrl,
        name: 'PolitiFácil Internacional',
        inLanguage: 'es',
        description,
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'PolitiFácil',
        url: canonicalUrl,
        description:
          'Observatorio cívico neutral que traduce programas electorales oficiales, citas literales en medios y tests de afinidad sin sesgos partidistas.',
      },
      {
        '@type': 'ItemList',
        name: 'Cobertura Electoral por País en PolitiFácil',
        numberOfItems: countries.length,
        itemListElement: countries.map((c, idx) => {
          const base = getCountryBasePath(c.id, rootMode) || '/';
          return {
            '@type': 'ListItem',
            position: idx + 1,
            name: `${c.name} — ${c.electionName}`,
            url: c.status === 'active' ? `${siteUrl}${base}` : `${siteUrl}${calendarHref}`,
          };
        }),
      },
    ],
  };

  const esHref = getCountryBasePath('es', rootMode) || '/';
  const arHref = getCountryBasePath('ar', rootMode) || '/ar';
  const esBuild = countryBuilds.find((b) => b.countryId === 'es');
  const arBuild = countryBuilds.find((b) => b.countryId === 'ar');

  const totalParties = countryBuilds.reduce((acc, b) => acc + (b.stats?.partyPages || 0), 0);
  const totalAxes = countryBuilds.reduce((acc, b) => acc + (b.stats?.axesPages || 0), 0);
  const totalQuotes = countryBuilds.reduce((acc, b) => acc + (b.stats?.interviewsCount || 0), 0);

  const mapSvg = buildDisintegratingGridMapSvg();

  const activeCardsHtml = activeCountries
    .map((c) => {
      const base = getCountryBasePath(c.id, rootMode);
      const homeHref = base || '/';
      const buildInfo = countryBuilds.find((b) => b.countryId === c.id);
      const stats = buildInfo?.stats;
      const metricsText = stats
        ? `${stats.partyPages} fuerzas · ${stats.axesPages} ejes · ${stats.interviewsCount} citas literales · ${stats.quizQuestionsCount} escenarios`
        : c.tagline;

      return `
      <article class="showcase-card is-active">
        <div class="card-head">
          <div class="country-title-wrap">
            <span class="country-flag" aria-hidden="true">${escapeHtml(c.flag)}</span>
            <div>
              <h3>${escapeHtml(c.name)}</h3>
              <p class="card-sub">${escapeHtml(c.electionName)}</p>
            </div>
          </div>
          <div class="badge-row">
            <span class="mono-pill">${escapeHtml(c.languageTag)}</span>
            <span class="live-pill">● Activo</span>
          </div>
        </div>

        <p class="card-desc">${escapeHtml(c.description)}</p>

        <div class="meta-row">
          <span class="meta-chip">${escapeHtml(c.electionDateLabel)}</span>
          <span class="countdown-chip" data-countdown-date="${escapeHtml(c.electionDate)}">${escapeHtml(c.badge)}</span>
        </div>

        <p class="metrics-line">${escapeHtml(metricsText)}</p>

        <div class="card-actions">
          <a class="sbtn sbtn-solid" href="${escapeHtml(homeHref)}">Entrar en ${escapeHtml(c.name)} →</a>
          <a class="sbtn" href="${escapeHtml(base ? `${base}?section=comparador` : '/?section=comparador')}">Comparador a Ciegas</a>
          <a class="sbtn" href="${escapeHtml(base ? `${base}?section=test-afinidad` : '/?section=test-afinidad')}">Test 10 Escenarios</a>
          <a class="sbtn" href="${escapeHtml(base ? `${base}/entrevistas` : '/entrevistas')}">Entrevistas</a>
        </div>
      </article>`;
    })
    .join('\n');

  const upcomingCardsHtml = upcomingCountries
    .map(
      (c) => `
      <article class="roadmap-card">
        <div class="card-head">
          <div class="country-title-wrap">
            <span class="country-flag" aria-hidden="true">${escapeHtml(c.flag)}</span>
            <div>
              <h3>${escapeHtml(c.name)}</h3>
              <p class="card-sub">${escapeHtml(c.electionName)}</p>
            </div>
          </div>
          <div class="badge-row">
            <span class="mono-pill">${escapeHtml(c.languageTag)}</span>
            <span class="soon-pill">Próximamente</span>
          </div>
        </div>
        <p class="card-desc">${escapeHtml(c.description)}</p>
        <div class="roadmap-foot">
          <span><strong>Próxima cita:</strong> ${escapeHtml(c.electionDateLabel)}</span>
          <a class="inline-link" href="${escapeHtml(calendarHref)}">Ver en calendario →</a>
        </div>
      </article>`
    )
    .join('\n');

  const previewEvents = (calendarData.events || [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((ev) => ev.date >= lastmod || ev.highlight)
    .slice(0, 6);

  const previewCalendarHtml = previewEvents
    .map((ev) => {
      const targetHref = ev.portalCountryId
        ? (getCountryBasePath(ev.portalCountryId, rootMode) || '/')
        : calendarHref;
      return `
      <article class="cal-card${ev.highlight ? ' is-highlighted' : ''}">
        <div class="cal-top">
          <span class="meta-chip">${escapeHtml(ev.flag)} ${escapeHtml(ev.dateDisplay)}</span>
          <span class="countdown-chip" data-countdown-date="${escapeHtml(ev.date)}" data-countdown-tentative="${ev.dateTentative ? '1' : '0'}">${ev.year}</span>
        </div>
        <div>
          <h3>${escapeHtml(ev.title)}</h3>
          <p class="card-sub">${escapeHtml(ev.offices)}</p>
        </div>
        <div class="cal-foot">
          <span class="mono-pill">${escapeHtml(TYPE_LABELS[ev.type] || ev.type)}</span>
          <a class="inline-link" href="${escapeHtml(targetHref)}">${ev.portalCountryId ? 'Abrir portal del país →' : 'Ver detalle →'}</a>
        </div>
      </article>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="es" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content="#08151a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="PolitiFácil" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700;800&display=swap" />
${GTM_HEAD_SNIPPET}
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --bg: #08151a;
      --panel: #0e2027;
      --panel-alt: #122830;
      --border: rgba(248, 250, 252, 0.14);
      --ivory: #f8fafc;
      --muted: #cbd5e1;
      --amber: #f59e0b;
      --amber-soft: rgba(245, 158, 11, 0.16);
      --green: #34d399;
      --green-soft: rgba(52, 211, 153, 0.14);
    }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ivory);
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.55;
      overflow-x: hidden;
    }
    .skip-link {
      position: absolute; left: -9999px; top: 0;
      background: var(--amber); color: #08151a; padding: 10px 16px; z-index: 1000;
      font-weight: 700; border-radius: 0 0 8px 0;
    }
    .skip-link:focus { left: 12px; }
    .swiss-bar {
      position: sticky; top: 0; z-index: 50;
      border-bottom: 1px solid var(--border);
      background: rgba(8, 21, 26, 0.92);
      backdrop-filter: blur(10px);
    }
    .swiss-bar-inner {
      max-width: 1200px; margin: 0 auto; padding: 13px 24px;
      display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .swiss-brand {
      font-weight: 800; letter-spacing: 0.1em; color: var(--ivory);
      text-decoration: none; font-size: 0.94rem;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .brand-dot {
      width: 9px; height: 9px; border-radius: 50%; background: var(--amber);
      box-shadow: 0 0 12px var(--amber);
    }
    .swiss-nav { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .swiss-nav a {
      color: var(--muted); text-decoration: none; font-size: 0.86rem; font-weight: 700;
      transition: color 0.14s ease;
    }
    .swiss-nav a:hover { color: var(--amber); }

    .hero {
      position: relative;
      min-height: 92svh;
      display: grid; place-items: center;
      padding: 64px 24px;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }
    .map-grid-bg { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
    .hero-map-svg { width: 100%; height: 100%; display: block; }
    .swiss-vignette {
      position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: radial-gradient(circle at 50% 50%, rgba(8, 21, 26, 0.86) 0%, rgba(8, 21, 26, 0.56) 50%, rgba(8, 21, 26, 0.9) 100%);
    }
    .hero-box {
      position: relative; z-index: 3; text-align: center; max-width: 980px; width: 100%;
    }
    .mono-badge {
      font-family: 'JetBrains Mono', monospace;
      display: inline-block; padding: 6px 14px; border-radius: 6px;
      background: var(--amber-soft); border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fde68a; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em;
    }
    .wordmark {
      margin: 16px 0 8px;
      font-size: clamp(3.2rem, 11.4vw, 8.6rem);
      font-weight: 800; line-height: 0.9; letter-spacing: -0.045em;
      color: #ffffff;
    }
    .claim {
      margin: 10px auto 12px;
      font-size: clamp(1.3rem, 2.8vw, 2rem);
      font-weight: 700; color: #fef3c7;
    }
    .desc {
      margin: 0 auto 28px; max-width: 62ch; color: var(--muted); font-size: 1.02rem; font-weight: 500;
    }
    .hero-ctas { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }

    .sbtn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      text-decoration: none; padding: 11px 16px; border-radius: 10px;
      font-weight: 700; font-size: 0.88rem;
      border: 1.5px solid var(--border); color: var(--ivory); background: rgba(14, 32, 39, 0.9);
      transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
    }
    .hero-ctas .sbtn { padding: 14px 22px; font-size: 0.95rem; }
    .sbtn:hover { transform: translateY(-2px); border-color: var(--amber); }
    .sbtn-solid { background: var(--amber); color: #08151a; border-color: var(--amber); }
    .sbtn-solid:hover { background: #fbbf24; border-color: #fbbf24; }

    .kpi-band {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    .kpi-cell {
      padding: 22px 24px; border-right: 1px solid var(--border); text-align: center;
    }
    .kpi-cell:last-child { border-right: none; }
    .kpi-cell strong { display: block; font-size: 1.85rem; color: var(--amber); line-height: 1.1; }
    .kpi-cell span {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 52px 24px 0; }
    .section-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      display: block; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--amber); margin-bottom: 4px;
    }
    .section-head h2 { margin: 0; font-size: clamp(1.4rem, 2.8vw, 1.95rem); letter-spacing: -0.02em; }
    .section-lead { margin: 6px 0 0; color: var(--muted); font-size: 0.96rem; max-width: 68ch; }

    .dual-showcase {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px;
    }
    .showcase-card, .roadmap-card, .cal-card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
      padding: 22px; display: flex; flex-direction: column; gap: 12px;
    }
    .showcase-card.is-active { border-top: 4px solid var(--amber); }
    .roadmap-card { background: rgba(14, 32, 39, 0.56); border-style: dashed; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .country-title-wrap { display: flex; align-items: center; gap: 10px; }
    .country-flag { font-size: 1.9rem; line-height: 1; }
    .card-head h3 { margin: 0; font-size: 1.25rem; }
    .card-sub { margin: 2px 0 0; font-size: 0.83rem; color: var(--muted); }
    .card-desc { margin: 0; font-size: 0.92rem; color: #e2e8f0; }
    .metrics-line { margin: 0; font-size: 0.8rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
    .badge-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .mono-pill {
      font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: rgba(248, 250, 252, 0.08); color: var(--ivory);
      border: 1px solid var(--border);
    }
    .live-pill {
      font-size: 0.72rem; font-weight: 800; padding: 3px 9px; border-radius: 999px;
      background: var(--green-soft); color: var(--green);
    }
    .soon-pill {
      font-size: 0.72rem; font-weight: 700; padding: 3px 9px; border-radius: 999px;
      background: rgba(248, 250, 252, 0.06); color: var(--muted); border: 1px solid var(--border);
    }
    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .meta-chip {
      font-size: 0.76rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      background: var(--panel-alt); border: 1px solid var(--border); color: var(--ivory);
    }
    .countdown-chip {
      font-family: 'JetBrains Mono', monospace; font-size: 0.73rem; font-weight: 700;
      padding: 4px 10px; border-radius: 999px;
      background: var(--amber-soft); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .card-actions {
      display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 10px;
      border-top: 1px solid var(--border);
    }

    .mission-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px;
    }
    .mission-card {
      background: var(--panel); border: 1px solid var(--border); border-top: 3px solid var(--amber);
      border-radius: 14px; padding: 18px;
    }
    .mission-card h3 { margin: 0 0 6px; font-size: 1.02rem; }
    .mission-card p { margin: 0; font-size: 0.88rem; color: var(--muted); }
    .mission-card code { color: #fde68a; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; }

    .roadmap-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px;
    }
    .roadmap-foot, .cal-foot {
      margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;
      font-size: 0.8rem; color: var(--muted);
    }
    .inline-link { color: var(--amber); text-decoration: none; font-weight: 700; }
    .inline-link:hover { text-decoration: underline; }

    .cal-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px;
    }
    .cal-card { border-left: 4px solid var(--border); padding: 18px; }
    .cal-card.is-highlighted { border-left-color: var(--amber); }
    .cal-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .cal-card h3 { margin: 0 0 4px; font-size: 1rem; }

    .sustainability-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), var(--panel));
      border: 1px solid var(--border); border-radius: 16px; padding: 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap;
    }

    .site-footer {
      margin-top: 56px; border-top: 1px solid var(--border); background: #061014;
      padding: 28px 24px;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .footer-links { display: flex; gap: 8px; flex-wrap: wrap; }

    @media (max-width: 768px) {
      .swiss-bar-inner { padding: 12px 16px; }
      .hero { padding: 48px 16px; }
      .container { padding: 40px 16px 0; }
      .kpi-cell { border-right: none; border-bottom: 1px solid var(--border); }
      .dual-showcase, .roadmap-grid, .cal-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

  <header class="swiss-bar">
    <div class="swiss-bar-inner">
      <a class="swiss-brand" href="${escapeHtml(portalHref)}">
        <span class="brand-dot" aria-hidden="true"></span>
        <span>POLITIFÁCIL // INTL</span>
      </a>
      <nav class="swiss-nav" aria-label="Navegación global">
        <a href="#paises-activos">Países</a>
        <a href="${escapeHtml(esHref)}">🇪🇸 España</a>
        <a href="${escapeHtml(arHref)}">🇦🇷 Argentina</a>
        <a href="${escapeHtml(calendarHref)}">📅 Calendario (${calendarData.events.length})</a>
        <a href="${escapeHtml(articlesHref)}">📰 Artículos (${articlesBuild ? articlesBuild.count : 0})</a>
        <a href="#mision">Misión</a>
      </nav>
    </div>
  </header>

  <main id="main-content">
    <section class="hero">
      <div class="map-grid-bg">${mapSvg}</div>
      <div class="swiss-vignette"></div>
      <div class="hero-box">
        <span class="mono-badge">ESPAÑA · LATINOAMÉRICA · ESTADOS UNIDOS</span>
        <h1 class="wordmark">POLITIFÁCIL</h1>
        <p class="claim">Un continente polarizado. Una brújula neutral.</p>
        <p class="desc">${escapeHtml(description)}</p>
        <div class="hero-ctas">
          <a class="sbtn sbtn-solid" href="${escapeHtml(esHref)}">🇪🇸 Ir a España (29-N) →</a>
          <a class="sbtn sbtn-solid" href="${escapeHtml(arHref)}">🇦🇷 Ir a Argentina (2027) →</a>
          <a class="sbtn" href="${escapeHtml(calendarHref)}">📅 Calendario 2026–2028</a>
        </div>
      </div>
    </section>

    <section class="kpi-band" aria-label="Cifras verificadas del observatorio">
      <div class="kpi-cell"><strong>${activeCountries.length}</strong><span>Países Activos</span></div>
      <div class="kpi-cell"><strong>${totalParties}</strong><span>Fuerzas Nacionales</span></div>
      <div class="kpi-cell"><strong>${totalAxes}</strong><span>Ejes Programáticos</span></div>
      <div class="kpi-cell"><strong>${totalQuotes}</strong><span>Citas Literales</span></div>
      <div class="kpi-cell"><strong>0</strong><span>Columnas de Opinión</span></div>
    </section>

    <section id="paises-activos" class="container" aria-labelledby="heading-countries">
      <div class="section-head">
        <div>
          <span class="eyebrow">Cobertura Disponible Hoy</span>
          <h2 id="heading-countries">Elige tu País</h2>
          <p class="section-lead">Mercados principales publicados con comparador a ciegas, hemeroteca literal, bloques territoriales y test de 10 escenarios.</p>
        </div>
      </div>
      <div class="dual-showcase">
        ${activeCardsHtml}
      </div>
    </section>

    <section id="mision" class="container" aria-labelledby="heading-mission">
      <div class="section-head">
        <div>
          <span class="eyebrow">Por qué existe PolitiFácil</span>
          <h2 id="heading-mission">Nuestra Misión y Estándar de Neutralidad</h2>
        </div>
      </div>
      <div class="mission-grid">
        <article class="mission-card">
          <h3>1. Solo fuentes oficiales</h3>
          <p>Cada propuesta enlaza directamente al programa registrado, documento partidario o portal electoral oficial del país (JEC, CNE, INE, FEC, TSE).</p>
        </article>
        <article class="mission-card">
          <h3>2. Cero tertulias ni opinión</h3>
          <p>No publicamos editoriales ni valoraciones subjetivas. Las entrevistas muestran exclusivamente pregunta de contexto, cita textual y medio original.</p>
        </article>
        <article class="mission-card">
          <h3>3. Comparación sin siglas</h3>
          <p>Tanto el comparador por ejes como el test de 10 escenarios ocultan nombres y colores por defecto para evitar prejuicios de marca partidista.</p>
        </article>
        <article class="mission-card">
          <h3>4. Datos abiertos y GEO</h3>
          <p>Toda la información se publica estructurada en HTML semántico, JSON abierto y archivos <code>llms.txt</code> para ciudadanía, investigadores e IA.</p>
        </article>
      </div>
    </section>

    <section id="proximos-paises" class="container" aria-labelledby="heading-upcoming">
      <div class="section-head">
        <div>
          <span class="eyebrow">Expansión América &amp; Multilingüe</span>
          <h2 id="heading-upcoming">Próximos Países en Hoja de Ruta</h2>
          <p class="section-lead">Arquitectura preparada en español (ES), inglés (EN) y portugués (PT) para cubrir las próximas elecciones de Latinoamérica y Estados Unidos.</p>
        </div>
      </div>
      <div class="roadmap-grid">
        ${upcomingCardsHtml}
      </div>
    </section>

    <section class="container" aria-labelledby="heading-cal-preview">
      <div class="section-head">
        <div>
          <span class="eyebrow">Agenda Democrática 2026–2028</span>
          <h2 id="heading-cal-preview">Próximas Elecciones Clave</h2>
        </div>
        <a class="sbtn sbtn-solid" href="${escapeHtml(calendarHref)}">Abrir Calendario Completo (${calendarData.events.length} citas) →</a>
      </div>
      <div class="cal-grid">
        ${previewCalendarHtml}
      </div>
    </section>

    <section class="container" aria-labelledby="heading-articles-preview">
      <div class="section-head">
        <div>
          <span class="eyebrow">Biblioteca Cívica SEO &amp; GEO</span>
          <h2 id="heading-articles-preview">Artículos y Guías Electorales</h2>
          <p class="section-lead">Guías de votación verificadas y comparativas eje a eje extraídas de programas oficiales, sin opiniones de terceros.</p>
        </div>
        <a class="sbtn sbtn-solid" href="${escapeHtml(articlesHref)}">Ver Todos los Artículos (${articlesBuild ? articlesBuild.count : 0}) →</a>
      </div>
      <div class="cal-grid">
        ${(articlesBuild?.articles || [])
          .slice(0, 3)
          .map((art) => {
            const flagMap = { es: '🇪🇸 España', ar: '🇦🇷 Argentina', global: '🌐 Global' };
            return `
        <article class="cal-card is-highlighted">
          <div class="cal-top">
            <span class="meta-chip">${escapeHtml(flagMap[art.country] || art.country.toUpperCase())}</span>
            <span class="countdown-chip">⏱ ${art.readingMinutes} min</span>
          </div>
          <div>
            <h3>${escapeHtml(art.title)}</h3>
            <p class="card-sub">${escapeHtml(art.description)}</p>
          </div>
          <div class="cal-foot">
            <span class="mono-pill">${escapeHtml(art.publishedAt)}</span>
            <a class="inline-link" href="${escapeHtml(`${articlesHref}/${art.slug}`)}">Leer guía →</a>
          </div>
        </article>`;
          })
          .join('\n')}
      </div>
    </section>

    <section class="container" aria-label="Independencia editorial y sostenibilidad">
      <div class="sustainability-card">
        <div style="max-width:66ch;">
          <span class="eyebrow">Modelo de Independencia</span>
          <h2 style="margin:0 0 6px;">0 € de partidos políticos ni gobiernos</h2>
          <p style="margin:0; color:var(--muted); font-size:0.92rem;">
            PolitiFácil es un proyecto independiente. La expansión hacia nuevos países, guías cívicas y cobertura informativa se sostendrá mediante publicidad programática transparente (AdSense) y aportes voluntarios de lectores, sin financiamiento ni acuerdos editoriales con fuerzas políticas.
          </p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="sbtn" href="${escapeHtml(calendarHref)}">Calendario Electoral</a>
          <a class="sbtn" href="/llms.txt">Datos Abiertos (llms.txt)</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>PolitiFácil Internacional</strong> — Comparador electoral neutral sin afiliación partidista.
        <p class="card-sub">Cobertura activa en España y Argentina · Próximamente Estados Unidos, Brasil, México, Colombia, Chile y Guatemala.</p>
      </div>
      <div class="footer-links">
        <a class="sbtn" href="${escapeHtml(esHref)}">🇪🇸 España (29-N)</a>
        <a class="sbtn" href="${escapeHtml(arHref)}">🇦🇷 Argentina (2027)</a>
        <a class="sbtn" href="${escapeHtml(calendarHref)}">📅 Calendario 2026–2028</a>
        <a class="sbtn" href="${escapeHtml(articlesHref)}">📰 Artículos</a>
      </div>
    </div>
  </footer>

  <script src="/portal.js"></script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;

  writeFile(outFile, html);
}

function buildCalendarPage(context) {
  const {
    siteUrl,
    rootMode,
    publicDir,
    portalHref,
    calendarHref,
    articlesHref = '/articulos',
    activeCountries,
    getCountryBasePath,
    calendarData,
  } = context;

  const events = (calendarData.events || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const years = Array.from(new Set(events.map((e) => e.year))).sort((a, b) => a - b);

  const title = 'Calendario Electoral 2026–2028: España, Latinoamérica y EE. UU. | PolitiFácil';
  const description =
    'Fechas oficiales y previstas de elecciones presidenciales, generales, legislativas y regionales en España, Argentina, Estados Unidos, Brasil, México, Colombia, Chile y toda Latinoamérica (2026–2028).';
  const canonicalUrl = `${siteUrl}${calendarHref}`;
  const ogImage = `${siteUrl}/portal/og-banner.png`;
  const esHref = getCountryBasePath('es', rootMode) || '/';
  const arHref = getCountryBasePath('ar', rootMode) || '/ar';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'es',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Portal Global', item: `${siteUrl}${portalHref}` },
          { '@type': 'ListItem', position: 2, name: 'Calendario Electoral', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Elecciones en España, Latinoamérica y Estados Unidos (2026–2028)',
        numberOfItems: events.length,
        itemListElement: events.map((ev, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Event',
            name: ev.title,
            startDate: ev.date,
            endDate: ev.date,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            image: [ogImage],
            location: {
              '@type': 'Place',
              name: ev.countryName,
              address: {
                '@type': 'PostalAddress',
                addressCountry: String(ev.countryCode || '').toUpperCase(),
              },
            },
            organizer: {
              '@type': 'Organization',
              name: ev.officialSourceLabel || 'PolitiFácil',
              url: ev.officialSourceUrl || siteUrl,
            },
            performer: {
              '@type': 'Organization',
              name: `Candidaturas oficiales — ${ev.countryName}`,
            },
            description: `${ev.offices}. ${ev.summary}`,
          },
        })),
      },
    ],
  };

  const yearGroupsHtml = years
    .map((yr) => {
      const yearEvents = events.filter((e) => e.year === yr);
      const cardsHtml = yearEvents
        .map((ev) => {
          const searchBlob = `${ev.countryName} ${ev.title} ${ev.offices} ${ev.summary} ${ev.statusNote} ${REGION_LABELS[ev.region] || ''}`;
          const portalLink = ev.portalCountryId
            ? `<a class="sbtn sbtn-solid sbtn-sm" href="${escapeHtml(getCountryBasePath(ev.portalCountryId, rootMode) || '/')}">Abrir portal ${escapeHtml(ev.countryName)} →</a>`
            : '';
          return `
        <article
          class="calendar-card${ev.highlight ? ' is-highlighted' : ''}"
          data-cal-event="${escapeHtml(ev.id)}"
          data-cal-region="${escapeHtml(ev.region)}"
          data-cal-year="${ev.year}"
          data-cal-type="${escapeHtml(ev.type)}"
          data-cal-date="${escapeHtml(ev.date)}"
          data-cal-search="${escapeHtml(searchBlob)}"
        >
          <div class="calendar-card-top">
            <span class="meta-chip">${escapeHtml(ev.flag)} ${escapeHtml(ev.dateDisplay)}</span>
            <span class="countdown-chip" data-countdown-date="${escapeHtml(ev.date)}" data-countdown-tentative="${ev.dateTentative ? '1' : '0'}">${ev.year}</span>
          </div>

          <div class="calendar-card-body">
            <div class="badge-row" style="margin-bottom:8px;">
              <span class="mono-pill">${escapeHtml(REGION_LABELS[ev.region] || ev.region)}</span>
              <span class="mono-pill">${escapeHtml(TYPE_LABELS[ev.type] || ev.type)}</span>
              ${ev.dateTentative ? '<span class="tentative-pill">Estimada / Sujeta a Congreso</span>' : ''}
            </div>
            <h3>${escapeHtml(ev.title)}</h3>
            <p class="card-offices"><strong>Cargos en juego:</strong> ${escapeHtml(ev.offices)}</p>
            <p class="card-desc">${escapeHtml(ev.summary)}</p>
          </div>

          <div class="calendar-card-footer">
            <a class="inline-link" href="${escapeHtml(ev.officialSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ev.officialSourceLabel)} ↗</a>
            ${portalLink || `<span class="status-note">${escapeHtml(ev.statusNote)}</span>`}
          </div>
        </article>`;
        })
        .join('\n');

      return `
      <section class="calendar-year-group" data-cal-year-group="${yr}">
        <h2 class="calendar-year-heading">
          <span>Año ${yr}</span>
          <span class="mono-pill">${yearEvents.length} procesos</span>
        </h2>
        <div class="calendar-cards-grid">
          ${cardsHtml}
        </div>
      </section>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="es" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content="#08151a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}/llms.txt" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="PolitiFácil" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700;800&display=swap" />
${GTM_HEAD_SNIPPET}
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    :root {
      --bg: #08151a;
      --panel: #0e2027;
      --panel-alt: #122830;
      --border: rgba(248, 250, 252, 0.14);
      --ivory: #f8fafc;
      --muted: #cbd5e1;
      --amber: #f59e0b;
      --amber-soft: rgba(245, 158, 11, 0.16);
      --green: #34d399;
      --green-soft: rgba(52, 211, 153, 0.14);
    }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ivory);
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.55;
      overflow-x: hidden;
    }
    .skip-link {
      position: absolute; left: -9999px; top: 0;
      background: var(--amber); color: #08151a; padding: 10px 16px; z-index: 1000;
      font-weight: 700; border-radius: 0 0 8px 0;
    }
    .skip-link:focus { left: 12px; }
    .swiss-bar {
      position: sticky; top: 0; z-index: 50;
      border-bottom: 1px solid var(--border);
      background: rgba(8, 21, 26, 0.92);
      backdrop-filter: blur(10px);
    }
    .swiss-bar-inner {
      max-width: 1200px; margin: 0 auto; padding: 13px 24px;
      display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .swiss-brand {
      font-weight: 800; letter-spacing: 0.1em; color: var(--ivory);
      text-decoration: none; font-size: 0.94rem;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .brand-dot {
      width: 9px; height: 9px; border-radius: 50%; background: var(--amber);
      box-shadow: 0 0 12px var(--amber);
    }
    .swiss-nav { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .swiss-nav a {
      color: var(--muted); text-decoration: none; font-size: 0.86rem; font-weight: 700;
      transition: color 0.14s ease;
    }
    .swiss-nav a:hover, .swiss-nav a.is-current { color: var(--amber); }

    .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px 0; }
    .breadcrumb-nav {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--muted);
      margin-bottom: 18px;
    }
    .breadcrumb-nav a { color: var(--amber); text-decoration: none; font-weight: 700; }
    .breadcrumb-nav a:hover { text-decoration: underline; }

    .hero-panel {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--panel));
      border: 1px solid var(--border);
      border-top: 4px solid var(--amber);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 20px;
    }
    .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      display: block; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--amber); margin-bottom: 6px;
    }
    .hero-panel h1 {
      margin: 0 0 10px;
      font-size: clamp(1.65rem, 3.4vw, 2.4rem);
      line-height: 1.12;
      letter-spacing: -0.025em;
    }
    .section-lead { margin: 0 0 16px; color: var(--muted); font-size: 0.98rem; max-width: 74ch; }
    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .meta-chip {
      font-size: 0.76rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      background: var(--panel-alt); border: 1px solid var(--border); color: var(--ivory);
    }
    .mono-pill {
      font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: rgba(248, 250, 252, 0.08); color: var(--ivory);
      border: 1px solid var(--border);
    }
    .tentative-pill {
      font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: var(--amber-soft); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .countdown-chip {
      font-family: 'JetBrains Mono', monospace; font-size: 0.73rem; font-weight: 700;
      padding: 4px 10px; border-radius: 999px;
      background: var(--amber-soft); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .countdown-chip.is-past {
      background: rgba(248, 250, 252, 0.06); color: var(--muted); border-color: var(--border);
    }
    .countdown-chip.is-imminent {
      background: var(--green-soft); color: var(--green); border-color: rgba(52, 211, 153, 0.45);
    }

    .calendar-controls {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }
    .calendar-filter-row {
      display: flex; gap: 18px; flex-wrap: wrap; align-items: center; justify-content: space-between;
    }
    .sort-control { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .control-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--muted);
    }
    .seg-btn {
      font-family: inherit; font-size: 0.84rem; font-weight: 700;
      padding: 7px 13px; border-radius: 9px; cursor: pointer;
      background: var(--panel-alt); color: var(--ivory); border: 1px solid var(--border);
      transition: border-color 0.14s ease, background 0.14s ease, color 0.14s ease;
    }
    .seg-btn:hover { border-color: var(--amber); }
    .seg-btn.is-active {
      background: var(--amber); color: #08151a; border-color: var(--amber);
    }

    .filter-grid {
      display: grid; grid-template-columns: minmax(200px, 260px) 1fr auto; gap: 14px; align-items: end;
    }
    .filter-field { display: flex; flex-direction: column; gap: 6px; }
    .filter-field label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em;
    }
    .filter-field select, .filter-field input[type="search"] {
      width: 100%; padding: 10px 12px; border-radius: 9px;
      background: var(--bg); color: var(--ivory); border: 1px solid var(--border);
      font-family: inherit; font-size: 0.9rem;
    }
    .filter-field select:focus, .filter-field input[type="search"]:focus {
      outline: 2px solid var(--amber); border-color: var(--amber);
    }
    .priority-check {
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
      padding: 10px 12px; border-radius: 9px; background: var(--panel-alt); border: 1px solid var(--border);
      font-size: 0.85rem; color: var(--ivory); font-weight: 600;
    }
    .priority-check input { accent-color: var(--amber); width: 16px; height: 16px; }
    .results-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem; color: #fde68a; padding-top: 8px; border-top: 1px solid var(--border);
    }

    .calendar-timeline { display: flex; flex-direction: column; gap: 34px; }
    .calendar-year-heading {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin: 0 0 16px; padding-bottom: 10px;
      border-bottom: 2px solid rgba(245, 158, 11, 0.45);
      font-size: 1.45rem;
    }
    .calendar-cards-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 16px;
    }
    .calendar-card {
      background: var(--panel); border: 1px solid var(--border); border-left: 4px solid var(--border);
      border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
    }
    .calendar-card.is-highlighted { border-left-color: var(--amber); }
    .calendar-card.is-past-event { opacity: 0.82; }
    .calendar-card-top {
      display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .badge-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .calendar-card-body h3 { margin: 0 0 6px; font-size: 1.1rem; line-height: 1.25; }
    .card-offices { margin: 0 0 6px; font-size: 0.85rem; color: #e2e8f0; }
    .card-desc { margin: 0; font-size: 0.88rem; color: var(--muted); }
    .calendar-card-footer {
      margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;
      font-size: 0.8rem;
    }
    .status-note { color: var(--muted); font-size: 0.78rem; }
    .inline-link { color: var(--amber); text-decoration: none; font-weight: 700; }
    .inline-link:hover { text-decoration: underline; }

    .sbtn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
      text-decoration: none; padding: 10px 15px; border-radius: 10px;
      font-family: inherit; font-weight: 700; font-size: 0.86rem;
      border: 1.5px solid var(--border); color: var(--ivory); background: rgba(14, 32, 39, 0.9);
      transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
    }
    .sbtn-sm { padding: 7px 12px; font-size: 0.8rem; border-radius: 8px; }
    .sbtn:hover { transform: translateY(-1px); border-color: var(--amber); }
    .sbtn-solid { background: var(--amber); color: #08151a; border-color: var(--amber); }
    .sbtn-solid:hover { background: #fbbf24; border-color: #fbbf24; }

    .empty-card {
      background: var(--panel); border: 1px dashed var(--amber); border-radius: 14px;
      padding: 24px; margin-top: 18px;
    }
    .empty-card h3 { margin: 0 0 6px; }
    .empty-card p { margin: 0 0 14px; color: var(--muted); }
    .verification-note {
      margin-top: 26px; padding: 16px 18px; border-radius: 12px;
      background: var(--panel); border: 1px solid var(--border);
      font-size: 0.84rem; color: var(--muted);
    }

    .site-footer {
      margin-top: 56px; border-top: 1px solid var(--border); background: #061014;
      padding: 28px 24px;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .footer-links { display: flex; gap: 8px; flex-wrap: wrap; }
    .card-sub { margin: 4px 0 0; font-size: 0.84rem; color: var(--muted); }

    @media (max-width: 820px) {
      .filter-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .swiss-bar-inner { padding: 12px 16px; }
      .container { padding: 24px 16px 0; }
      .hero-panel { padding: 20px; }
      .calendar-cards-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

  <header class="swiss-bar">
    <div class="swiss-bar-inner">
      <a class="swiss-brand" href="${escapeHtml(portalHref)}">
        <span class="brand-dot" aria-hidden="true"></span>
        <span>POLITIFÁCIL // INTL</span>
      </a>
      <nav class="swiss-nav" aria-label="Navegación calendario">
        <a href="${escapeHtml(portalHref)}">Portal Global</a>
        <a href="${escapeHtml(esHref)}">🇪🇸 España</a>
        <a href="${escapeHtml(arHref)}">🇦🇷 Argentina</a>
        <a class="is-current" href="${escapeHtml(calendarHref)}" aria-current="page">📅 Calendario (${events.length})</a>
        <a href="${escapeHtml(articlesHref)}">📰 Artículos</a>
      </nav>
    </div>
  </header>

  <main id="main-content" class="container">
    <nav class="breadcrumb-nav" aria-label="Migas de pan">
      <a href="${escapeHtml(portalHref)}">Portal Global</a> <span aria-hidden="true">/</span>
      <span aria-current="page">Calendario Electoral 2026–2028</span>
    </nav>

    <section class="hero-panel">
      <span class="eyebrow">Hoja de Ruta Electoral · Fuentes Oficiales</span>
      <h1>Calendario Electoral de España, Latinoamérica y Estados Unidos (2026–2028)</h1>
      <p class="section-lead">
        Consulta las fechas oficiales y estimadas de las principales elecciones presidenciales, generales, legislativas y regionales. Filtra por región, año, tipo de elección o país y accede directamente a los portales activos de PolitiFácil.
      </p>
      <div class="meta-row">
        <span class="meta-chip">${events.length} Elecciones Registradas</span>
        <span class="meta-chip">España · Latinoamérica · EE. UU.</span>
        <span class="countdown-chip">Actualizado: ${escapeHtml(calendarData.meta.updatedAt)}</span>
      </div>
    </section>

    <section class="calendar-controls" aria-label="Filtros del calendario electoral">
      <div class="calendar-filter-row">
        <div class="sort-control" role="group" aria-label="Filtrar por región">
          <span class="control-label">Región:</span>
          <button class="seg-btn is-active" data-cal-filter-region="all" type="button">Todas</button>
          <button class="seg-btn" data-cal-filter-region="es" type="button">🇪🇸 España</button>
          <button class="seg-btn" data-cal-filter-region="latam" type="button">🌎 Latinoamérica</button>
          <button class="seg-btn" data-cal-filter-region="us" type="button">🇺🇸 EE. UU.</button>
        </div>

        <div class="sort-control" role="group" aria-label="Filtrar por año">
          <span class="control-label">Año:</span>
          <button class="seg-btn is-active" data-cal-filter-year="all" type="button">Todos</button>
          ${years.map((y) => `<button class="seg-btn" data-cal-filter-year="${y}" type="button">${y}</button>`).join('\n          ')}
        </div>
      </div>

      <div class="filter-grid">
        <div class="filter-field">
          <label for="calendar-type-filter">Tipo de elección</label>
          <select id="calendar-type-filter">
            <option value="all">Todos los tipos</option>
            <option value="presidential">Presidenciales</option>
            <option value="general">Generales</option>
            <option value="legislative">Legislativas / Primarias</option>
            <option value="regional">Regionales / Municipales</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="calendar-search-input">Buscar país, elección o cargo</label>
          <input id="calendar-search-input" type="search" placeholder="Ej: Argentina, México, 350 escaños, gobernadores..." />
        </div>
        <div class="filter-field">
          <label class="priority-check">
            <input type="checkbox" id="calendar-show-past" />
            <span>Incluir elecciones ya celebradas en 2026</span>
          </label>
        </div>
      </div>

      <div class="results-meta" id="calendar-results-count">
        Mostrando ${events.length} procesos electorales en calendario.
      </div>
    </section>

    <div class="calendar-timeline" id="calendar-timeline">
      ${yearGroupsHtml}
    </div>

    <div class="empty-card" id="calendar-empty-state" hidden>
      <h3>Ningún proceso electoral coincide con estos filtros</h3>
      <p>Prueba ampliando la región, el año o activando las elecciones ya celebradas.</p>
      <button type="button" class="sbtn sbtn-solid sbtn-sm" id="calendar-reset-btn">Restablecer filtros</button>
    </div>

    <p class="verification-note">
      <strong>Nota de verificación:</strong> ${escapeHtml(calendarData.meta.disclaimer)}
    </p>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>PolitiFácil Calendario Electoral</strong> — Seguimiento cronológico 2026–2028.
        <p class="card-sub">Datos abiertos en <a class="inline-link" href="/data/calendar-data.json">/data/calendar-data.json</a>.</p>
      </div>
      <div class="footer-links">
        <a class="sbtn" href="${escapeHtml(portalHref)}">Portal Global</a>
        <a class="sbtn" href="${escapeHtml(articlesHref)}">📰 Artículos</a>
        ${activeCountries
          .map((c) => {
            const href = getCountryBasePath(c.id, rootMode) || '/';
            return `<a class="sbtn" href="${escapeHtml(href)}">${escapeHtml(c.flag)} ${escapeHtml(c.name)}</a>`;
          })
          .join('\n        ')}
      </div>
    </div>
  </footer>

  <script src="/portal.js"></script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;

  writeFile(path.join(publicDir, 'calendario', 'index.html'), html);
  writeFile(path.join(publicDir, 'data', 'calendar-data.json'), JSON.stringify(calendarData, null, 2));
}

function buildRootDiscoveryFiles(context) {
  const {
    siteUrl,
    rootMode,
    publicDir,
    portalHref,
    calendarHref,
    activeCountries,
    getCountryBasePath,
    countryBuilds,
    calendarData,
    articlesBuild,
    lastmod,
  } = context;

  writeFile(path.join(publicDir, 'favicon.svg'), buildFaviconSvg());
  writeFile(path.join(publicDir, 'manifest.webmanifest'), buildManifest(portalHref));
  writeFile(path.join(publicDir, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);

  // robots.txt
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
  const robotsBlocks = bots.map((bot) => `User-agent: ${bot}\nAllow: /\nDisallow: /api/`);
  writeFile(path.join(publicDir, 'robots.txt'), `${robotsBlocks.join('\n\n')}\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

  // sitemap.xml deduplicado combinando Portal Global + Calendario + países activos + Artículos
  const rawEntries = [
    { path: portalHref, priority: rootMode === 'global' ? '1.0' : '0.9' },
    { path: calendarHref, priority: '0.9' },
    ...(articlesBuild?.sitemapEntries || []),
    ...countryBuilds.flatMap((b) => b.sitemapEntries),
  ];

  const seenPaths = new Set();
  const uniqueEntries = [];
  rawEntries.forEach((entry) => {
    if (!seenPaths.has(entry.path)) {
      seenPaths.add(entry.path);
      uniqueEntries.push(entry);
    }
  });

  const urlNodes = uniqueEntries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(`${siteUrl}${entry.path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;
  writeFile(path.join(publicDir, 'sitemap.xml'), sitemapXml);

  // llms.txt raíz
  const spainBuild = countryBuilds.find((b) => b.countryId === 'es');
  const articlesLlms = articlesBuild?.llmsAppendix || '';
  if (rootMode === 'spain-legacy' && spainBuild) {
    const portalAppendix = `
## Red Internacional PolitiFácil (Nuevo)
- [PolitiFácil — Portal Global Multi-País](${siteUrl}${portalHref}): Misión del observatorio, mercados activos (España y Argentina) y próximos lanzamientos (EE. UU., Brasil, México, Colombia, Chile, Guatemala).
- [Calendario Electoral 2026–2028 (España, Latam y EE. UU.)](${siteUrl}${calendarHref}): ${calendarData.events.length} citas electorales verificadas ([JSON](${siteUrl}/data/calendar-data.json)).
- [PolitiFácil Argentina (Rumbo 2027)](${siteUrl}${getCountryBasePath('ar', rootMode)}): Fuerzas nacionales, bloques provinciales, entrevistas literales y test de 10 escenarios ([llms.txt](${siteUrl}/ar/llms.txt), [llms-full.txt](${siteUrl}/ar/llms-full.txt), [JSON](${siteUrl}/ar/data/election-data.json)).
${articlesLlms}`;
    writeFile(path.join(publicDir, 'llms.txt'), `${spainBuild.llmsTxt}\n${portalAppendix}`);
  } else {
    const countrySections = activeCountries
      .map((c) => {
        const base = getCountryBasePath(c.id, rootMode) || '/';
        const b = countryBuilds.find((item) => item.countryId === c.id);
        return `- [${c.flag} ${c.name} — ${c.electionName}](${siteUrl}${base}): ${b ? b.stats.pagesGenerated : 40} páginas · [llms.txt](${siteUrl}${base === '/' ? '' : base}/llms.txt) · [llms-full.txt](${siteUrl}${base === '/' ? '' : base}/llms-full.txt) · [JSON](${siteUrl}${base === '/' ? '' : base}/data/election-data.json)`;
      })
      .join('\n');

    const rootLlms = `# PolitiFácil Internacional

> Portal cívico neutral para comparar programas electorales oficiales, declaraciones literales en entrevistas y tests a ciegas en España, Latinoamérica y Estados Unidos.

## Portal y Calendario Global
- [Inicio Global](${siteUrl}${portalHref}): Visión general de países activos y próximos lanzamientos.
- [Calendario Electoral 2026–2028](${siteUrl}${calendarHref}): ${calendarData.events.length} elecciones verificadas ([JSON](${siteUrl}/data/calendar-data.json)).

## Países Activos
${countrySections}
${articlesLlms}`;
    writeFile(path.join(publicDir, 'llms.txt'), rootLlms);
  }

  return uniqueEntries.length;
}

module.exports = {
  buildGlobalLandingPage,
  buildCalendarPage,
  buildRootDiscoveryFiles,
};
