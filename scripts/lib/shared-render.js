'use strict';

const fs = require('fs');
const path = require('path');

const INDEXNOW_KEY = 'politifacil29nindexnow2026';
const GTM_CONTAINER_ID = 'GTM-N2V3Q8RQ';

const GTM_HEAD_SNIPPET = `  <!-- Google Tag Manager / GA4 -->
  <script>
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
  </script>
  <script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}"></script>`;

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

function scoreToArcPoint(score, cx, cy, r) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const angle = Math.PI * (1 - clamped / 100);
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
    angle,
  };
}

function buildPoliticalArcSvg(parties, options = {}) {
  const {
    selectedPartyId = parties[0]?.id || '',
    highlightPartyIds = null,
    userScore = null,
    interactive = false,
    width = 560,
    height = 310,
    leftLabel = '← Izquierda (0)',
    centerLabel = 'Centro (50)',
    rightLabel = 'Derecha (100) →',
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

  const sortedParties = parties.slice().sort((a, b) => a.spectrumScore - b.spectrumScore);
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
      <text x="${cx - rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">${escapeHtml(leftLabel)}</text>
      <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor" opacity="0.72">${escapeHtml(centerLabel)}</text>
      <text x="${cx + rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">${escapeHtml(rightLabel)}</text>
      ${partyNodes}
      ${userMarker}
    </svg>
  `.trim();
}

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

function renderPortalTopbar({ activeKey, portalHref, calendarHref, activeCountries, getCountryBasePath, rootMode }) {
  const countryLinks = activeCountries
    .map((c) => {
      const base = getCountryBasePath(c.id, rootMode);
      const href = base || '/';
      const isCurrent = activeKey === c.id;
      return `<a class="portal-switch-link${isCurrent ? ' is-current' : ''}" href="${escapeHtml(href)}">${escapeHtml(c.flag)} ${escapeHtml(c.name)} <span style="opacity:0.75;">(${escapeHtml(c.badge)})</span></a>`;
    })
    .join('\n        ');

  return `
  <nav class="portal-topbar" aria-label="Selector de país y herramientas globales de PolitiFácil">
    <div class="container portal-topbar-inner">
      <a class="portal-topbar-brand" href="${escapeHtml(portalHref)}">
        <span>🌐</span>
        <span>PolitiFácil Internacional</span>
      </a>
      <div class="portal-topbar-links">
        <a class="portal-switch-link${activeKey === 'portal' ? ' is-current' : ''}" href="${escapeHtml(portalHref)}">Inicio Global</a>
        ${countryLinks}
        <a class="portal-switch-link${activeKey === 'calendar' ? ' is-current' : ''}" href="${escapeHtml(calendarHref)}">📅 Calendario 2026–2028</a>
        <a class="portal-switch-link${activeKey === 'articles' ? ' is-current' : ''}" href="/articulos">📰 Artículos</a>
      </div>
    </div>
  </nav>`.trim();
}

function buildInlineBootstrapScript({ storageKey, aiRefKey, statsCountry, parties, seedAvgScore = 48.4 }) {
  const partyMetaJson = JSON.stringify(
    parties.reduce((acc, p) => {
      acc[p.id] = { shortName: p.shortName, candidate: p.candidate, color: p.color };
      return acc;
    }, {})
  );

  return `
  <script>
    (function () {
      var KEY = '${storageKey}';
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

      function emitEvent(eventName, params) {
        var payload = params || {};
        payload.country = '${statsCountry}';
        try {
          if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, payload);
          } else {
            window.dataLayer = window.dataLayer || [];
            var dlPayload = { event: eventName };
            for (var k in payload) {
              if (Object.prototype.hasOwnProperty.call(payload, k)) {
                dlPayload[k] = payload[k];
              }
            }
            window.dataLayer.push(dlPayload);
          }
          if (typeof window.va === 'function') {
            window.va('event', { name: eventName, data: payload });
          }
        } catch (e) {}
      }

      (function detectAiReferral() {
        var aiDomains = [
          'chatgpt.com',
          'chat.openai.com',
          'perplexity.ai',
          'gemini.google.com',
          'claude.ai',
          'copilot.microsoft.com',
          'grok.com',
          'deepseek.com',
          'you.com',
          'phind.com',
          'meta.ai'
        ];
        var rawRef = (document.referrer || '').toLowerCase();
        var refHost = '';
        if (rawRef) {
          try {
            refHost = new URL(rawRef).hostname.toLowerCase();
          } catch (e) {
            refHost = rawRef;
          }
        }
        var params = new URLSearchParams(window.location.search);
        var utmSource = (params.get('utm_source') || '').toLowerCase();
        var refParam = (params.get('ref') || '').toLowerCase();
        var matched = '';
        for (var i = 0; i < aiDomains.length; i += 1) {
          var d = aiDomains[i];
          var tok = d.split('.')[0];
          if (
            (refHost && refHost.indexOf(d) !== -1) ||
            (utmSource && (utmSource.indexOf(d) !== -1 || utmSource === tok)) ||
            (refParam && (refParam.indexOf(d) !== -1 || refParam === tok))
          ) {
            matched = d;
            break;
          }
        }
        if (!matched) return;
        var sKey = '${aiRefKey}';
        try {
          if (window.sessionStorage.getItem(sKey)) return;
          window.sessionStorage.setItem(sKey, matched);
        } catch (e) {}
        emitEvent('ai_referral_visit', {
          ai_source: matched,
          landing_path: window.location.pathname,
          landing_section: 'static_page',
          referrer: document.referrer || ''
        });
      })();

      document.querySelectorAll('.cta-banner-card a.btn').forEach(function (ctaLink) {
        ctaLink.addEventListener('click', function () {
          emitEvent('static_cta_click', {
            cta_href: ctaLink.getAttribute('href') || '',
            page_path: window.location.pathname
          });
        });
      });

      document.querySelectorAll('.source-link').forEach(function (srcLink) {
        srcLink.addEventListener('click', function () {
          emitEvent('official_source_click', {
            source_url: srcLink.getAttribute('href') || '',
            page_path: window.location.pathname
          });
        });
      });

      if (typeof window.fetch === 'function') {
        var PARTY_META = ${partyMetaJson};
        window.fetch('/api/stats?country=${encodeURIComponent(statsCountry)}', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (stats) {
            if (!stats || typeof stats.totalParticipants !== 'number') return;
            var countStr = String(Math.round(stats.totalParticipants)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
            var avgStr = Number(stats.averageScore || ${seedAvgScore}).toFixed(1).replace('.', ',');
            document.querySelectorAll('[data-live-count]').forEach(function (el) {
              el.textContent = countStr;
            });
            document.querySelectorAll('[data-live-avg]').forEach(function (el) {
              el.textContent = avgStr;
            });
            if (stats.totalParticipants === 0) {
              document.querySelectorAll('[data-quiz-proof-dynamic]').forEach(function (el) {
                el.textContent = '🧭 Test ciudadano sin siglas ni colores · Tu resultado inaugura el termómetro en vivo.';
              });
            }
            if (Array.isArray(stats.partyRanking)) {
              document.querySelectorAll('[data-live-barometer]').forEach(function (box) {
                if (!stats.totalPartyVotes) {
                  box.innerHTML = '<p class="muted-text">Aún no hay resultados registrados. Completa el Test de 10 Escenarios para inaugurar el termómetro en vivo.</p>';
                  return;
                }
                box.innerHTML = stats.partyRanking.map(function (item) {
                  var meta = PARTY_META[item.partyId] || { shortName: item.partyId, candidate: '', color: '#64748b' };
                  var pctNum = Math.max(0, Math.min(100, Number(item.pct) || 0));
                  var pctStr = pctNum.toFixed(1).replace('.', ',');
                  var fillW = item.count > 0 ? Math.max(4, pctNum) : 0;
                  return '<div class="barometer-row">' +
                    '<div class="barometer-row-top">' +
                      '<span class="barometer-party-meta"><span class="color-swatch" style="background:' + meta.color + '"></span><strong>' + meta.shortName + '</strong> <span class="muted-text">· ' + meta.candidate + '</span></span>' +
                      '<span class="barometer-pct">' + pctStr + ' %</span>' +
                    '</div>' +
                    '<div class="barometer-track"><div class="barometer-fill" style="width:' + fillW + '%; background:' + meta.color + ';"></div></div>' +
                  '</div>';
                }).join('');
              });
            }
          })
          .catch(function () {});
      }
    })();
  </script>`.trim();
}

module.exports = {
  INDEXNOW_KEY,
  GTM_CONTAINER_ID,
  GTM_HEAD_SNIPPET,
  ensureDir,
  writeFile,
  escapeHtml,
  escapeXml,
  safeJsonLd,
  scoreToArcPoint,
  buildPoliticalArcSvg,
  buildCtaBannerCard,
  renderPortalTopbar,
  buildInlineBootstrapScript,
};
