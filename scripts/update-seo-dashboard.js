'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const HISTORY_PATH = path.join(REPORTS_DIR, 'seo-geo-history.json');
const DASHBOARD_PATH = path.join(REPORTS_DIR, 'seo-geo-dashboard.html');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtNum(val, suffix = '') {
  if (val === null || val === undefined || val === '') return 'Procesando';
  return `${Number(val).toLocaleString('es-ES')}${suffix}`;
}

function fmtPct(val) {
  if (val === null || val === undefined || val === '') return 'Procesando';
  return `${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`;
}

function computeDelta(curr, prev, suffix = '') {
  if (curr === null || curr === undefined || prev === null || prev === undefined) return '';
  const diff = Number(curr) - Number(prev);
  if (Number.isNaN(diff) || diff === 0) return '<span class="delta delta-flat">= sin cambios</span>';
  const sign = diff > 0 ? '+' : '';
  const cls = diff > 0 ? 'delta-up' : 'delta-down';
  const formatted = Number.isInteger(diff) ? diff : diff.toFixed(2);
  return `<span class="delta ${cls}">${sign}${formatted}${escapeHtml(suffix)} vs ayer</span>`;
}

function renderHistorySparkline(entries, accessor, label, color) {
  const values = entries.map((e) => {
    const v = accessor(e);
    return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  });
  const maxVal = Math.max(1, ...values);
  const w = 260;
  const h = 56;
  const pad = 8;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = values.length > 1 ? pad + i * stepX : w / 2;
    const y = h - pad - (v / maxVal) * (h - pad * 2);
    return { x, y, v };
  });
  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots = points
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${escapeHtml(color)}"><title>${p.v}</title></circle>`
    )
    .join('');

  return `
    <div class="spark-card">
      <div class="spark-head">
        <span>${escapeHtml(label)}</span>
        <strong>${fmtNum(values[values.length - 1])}</strong>
      </div>
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Tendencia de ${escapeHtml(label)}">
        <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="rgba(148,163,184,0.22)" stroke-width="1" />
        ${values.length > 1 ? `<polyline fill="none" stroke="${escapeHtml(color)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />` : ''}
        ${dots}
      </svg>
    </div>
  `;
}

function buildDashboardHtml(data) {
  const project = data.project || {};
  const entries = (data.entries || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (entries.length === 0) {
    throw new Error('No hay registros en reports/seo-geo-history.json');
  }

  const latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const ga4 = latest.ga4 || {};
  const ga4_24h = latest.ga4Last24h || null;
  const gsc = latest.gsc || {};
  const gsc_24h = latest.gscLast24h || null;
  const decision = latest.decision || {};
  const isOkMode = decision.status === 'monitoreo_estable' || decision.status === 'ok';
  const launchDate = project.launchDate || '2026-11-17';

  const channel24Map = new Map();
  if (ga4_24h && Array.isArray(ga4_24h.channels)) {
    ga4_24h.channels.forEach((c) => {
      channel24Map.set(`${c.channel}||${c.sourceMedium}`, c.sessions);
    });
  }

  const daysToElection = (() => {
    if (!project.electionDate) return null;
    const target = new Date(`${project.electionDate}T09:00:00+01:00`).getTime();
    const ref = new Date(latest.checkedAt || `${latest.date}T08:00:00+01:00`).getTime();
    return Math.ceil((target - ref) / (1000 * 60 * 60 * 24));
  })();

  const channelsHtml = (ga4.channels || [])
    .map((ch) => {
      const s24 = ga4_24h ? channel24Map.get(`${ch.channel}||${ch.sourceMedium}`) || 0 : null;
      return `
      <tr>
        <td><strong>${escapeHtml(ch.channel)}</strong></td>
        <td><code>${escapeHtml(ch.sourceMedium || '')}</code></td>
        <td class="num"><strong>${s24 !== null ? fmtNum(s24) : '—'}</strong></td>
        <td class="num">${fmtNum(ch.sessions)}</td>
        <td class="num">${fmtPct(ch.sharePct)}</td>
        <td class="num">${fmtNum(ch.engagedSessions)}</td>
        <td class="num">${fmtPct(ch.engagementRatePct)}</td>
        <td class="num">${escapeHtml(ch.avgEngagementTime || '0 s')}</td>
        <td class="num">${fmtNum(ch.events)}</td>
      </tr>`;
    })
    .join('');

  const landingHtml = (ga4.landingPages || [])
    .map(
      (lp) => `
      <tr>
        <td><code>${escapeHtml(lp.path)}</code></td>
        <td class="num">${fmtNum(lp.sessions)}</td>
        <td class="num">${fmtNum(lp.activeUsers)}</td>
        <td class="num">${fmtNum(lp.newUsers)}</td>
        <td class="num">${escapeHtml(lp.avgEngagementTime || '-')}</td>
      </tr>`
    )
    .join('');

  const screensHtml = (ga4.pagesAndScreens || [])
    .map(
      (ps) => `
      <tr>
        <td><code>${escapeHtml(ps.path)}</code></td>
        <td class="num">${fmtNum(ps.views)}</td>
        <td class="num">${fmtNum(ps.activeUsers)}</td>
        <td class="num">${escapeHtml(ps.avgEngagementTime || '-')}</td>
        <td class="num">${fmtNum(ps.events)}</td>
      </tr>`
    )
    .join('');

  const aiSourcesHtml =
    Array.isArray(ga4.aiSources) && ga4.aiSources.length > 0
      ? `<ul>${ga4.aiSources
          .map(
            (s) =>
              `<li><strong>${escapeHtml(s.source)}</strong>: ${fmtNum(s.sessions)} sesiones · ${fmtNum(s.engagedSessions)} con interacción</li>`
          )
          .join('')}</ul>`
      : '<p class="muted">Sin sesiones de referencia desde motores de IA todavía (<code>chatgpt.com</code>, <code>perplexity.ai</code>, <code>gemini.google.com</code>, <code>claude.ai</code>, <code>copilot.microsoft.com</code>).</p>';

  const gscQueriesHtml =
    Array.isArray(gsc.topQueries) && gsc.topQueries.length > 0
      ? `<table>
          <thead><tr><th>Consulta</th><th class="num">Clics</th><th class="num">Impresiones</th><th class="num">CTR</th><th class="num">Posición</th></tr></thead>
          <tbody>
            ${gsc.topQueries
              .map(
                (q) =>
                  `<tr><td>${escapeHtml(q.query)}</td><td class="num">${fmtNum(q.clicks)}</td><td class="num">${fmtNum(q.impressions)}</td><td class="num">${fmtPct(q.ctrPct)}</td><td class="num">${q.position != null ? Number(q.position).toFixed(1) : '-'}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : `<div class="notice">${escapeHtml(gsc.statusMessage || 'Sin consultas disponibles todavía.')}</div>`;

  const gscPagesHtml =
    Array.isArray(gsc.topPages) && gsc.topPages.length > 0
      ? `<table>
          <thead><tr><th>Página</th><th class="num">Clics</th><th class="num">Impresiones</th><th class="num">CTR</th><th class="num">Posición</th></tr></thead>
          <tbody>
            ${gsc.topPages
              .map(
                (p) =>
                  `<tr><td><code>${escapeHtml(p.page)}</code></td><td class="num">${fmtNum(p.clicks)}</td><td class="num">${fmtNum(p.impressions)}</td><td class="num">${fmtPct(p.ctrPct)}</td><td class="num">${p.position != null ? Number(p.position).toFixed(1) : '-'}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : `<div class="notice">${escapeHtml(gsc.statusMessage || 'Sin páginas con impresiones disponibles todavía.')}</div>`;

  const indexingReasonsHtml =
    Array.isArray(gsc.indexingReasons) && gsc.indexingReasons.length > 0
      ? `<ul>${gsc.indexingReasons
          .map((r) => `<li><strong>${escapeHtml(r.reason)}</strong>: ${fmtNum(r.pages)} páginas</li>`)
          .join('')}</ul>`
      : '';

  const recsHtml =
    Array.isArray(decision.recommendations) && decision.recommendations.length > 0
      ? decision.recommendations
          .map(
            (r) => `
          <div class="rec-item rec-${escapeHtml(r.priority || 'media')}">
            <div class="rec-top">
              <span class="badge badge-${escapeHtml(r.priority || 'media')}">${escapeHtml((r.priority || 'media').toUpperCase())}</span>
              <span class="rec-area">${escapeHtml(r.area || 'SEO/GEO')}</span>
            </div>
            <h4>${escapeHtml(r.title)}</h4>
            <p>${escapeHtml(r.detail)}</p>
          </div>`
          )
          .join('')
      : '<p class="muted">Sin mejoras urgentes hoy. Se mantiene el monitoreo diario automático.</p>';

  const keyEventsMap = ga4.keyEventBreakdown || {};
  const keyEvents24Map = (ga4_24h && ga4_24h.keyEventBreakdown) || {};
  const eventsHtml = (data.instrumentedEvents || [])
    .map((ev) => {
      const count = keyEventsMap[ev.name];
      const count24 = ga4_24h ? keyEvents24Map[ev.name] || 0 : null;
      return `
        <tr>
          <td><code>${escapeHtml(ev.name)}</code></td>
          <td><span class="pill">${escapeHtml(ev.category)}</span></td>
          <td>${escapeHtml(ev.description)}</td>
          <td class="num"><strong>${count24 !== null ? fmtNum(count24) : '—'}</strong></td>
          <td class="num">${count !== undefined ? fmtNum(count) : '<span class="muted">0</span>'}</td>
        </tr>`;
    })
    .join('');

  const historyRowsHtml = entries
    .slice()
    .reverse()
    .map(
      (e) => `
      <tr>
        <td><strong>${escapeHtml(e.date)}</strong></td>
        <td class="num">${e.ga4Last24h ? fmtNum(e.ga4Last24h.sessions) : '—'}</td>
        <td class="num">${fmtNum(e.ga4 && e.ga4.sessions)}</td>
        <td class="num">${fmtPct(e.ga4 && e.ga4.engagementRatePct)}</td>
        <td class="num">${fmtNum(e.ga4 && e.ga4.organicSearchSessions)}</td>
        <td class="num">${fmtNum(e.ga4 && e.ga4.aiReferralSessions)}</td>
        <td class="num">${fmtNum(e.gsc && e.gsc.clicks)}</td>
        <td class="num">${fmtNum(e.gsc && e.gsc.impressions)}</td>
        <td class="num">${e.gsc && e.gsc.indexedPages != null ? `${fmtNum(e.gsc.indexedPages)} / ${fmtNum((e.gsc.sitemap && e.gsc.sitemap.discoveredUrls) || project.expectedSitemapUrls)}` : 'Procesando'}</td>
        <td><span class="pill">${escapeHtml((e.decision && e.decision.statusLabel) || 'Monitoreo')}</span></td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard SEO & GEO — ${escapeHtml(project.name || 'PolitiFácil 29-N')}</title>
  <style>
    :root {
      --bg: #0b1120;
      --surface: #111a2e;
      --surface-2: #17233c;
      --border: rgba(148, 163, 184, 0.18);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --green: #22c55e;
      --amber: #f59e0b;
      --red: #ef4444;
      --purple: #a78bfa;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap {
      max-width: 1220px;
      margin: 0 auto;
      padding: 28px 20px 56px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    h1 { margin: 0 0 6px; font-size: 1.65rem; letter-spacing: -0.02em; }
    h2 { margin: 0 0 12px; font-size: 1.1rem; }
    h3 { margin: 0 0 10px; font-size: 0.98rem; color: #e2e8f0; }
    h4 { margin: 6px 0 4px; font-size: 0.95rem; }
    p { margin: 0 0 8px; }
    .muted { color: var(--muted); font-size: 0.88rem; }
    code {
      background: rgba(148, 163, 184, 0.12);
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 0.84em;
      color: #cbd5e1;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.12);
      color: #bae6fd;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .status-banner {
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .status-banner.is-ok { border-left: 4px solid var(--green); }
    .status-banner.is-action { border-left: 4px solid var(--amber); }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(178px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .kpi-label {
      font-size: 0.78rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 1.48rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .kpi-sub {
      font-size: 0.79rem;
      color: var(--muted);
      margin-top: 4px;
    }
    .delta {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 4px;
    }
    .delta-up { color: var(--green); }
    .delta-down { color: var(--red); }
    .delta-flat { color: var(--muted); }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
      margin-bottom: 18px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 18px;
    }
    .spark-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .spark-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .spark-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.84rem;
      margin-bottom: 6px;
    }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.86rem;
    }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .notice {
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px dashed var(--border);
      color: var(--muted);
      font-size: 0.86rem;
    }
    .rec-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .rec-item {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
    }
    .rec-alta { border-left: 3px solid var(--amber); }
    .rec-media { border-left: 3px solid var(--accent); }
    .rec-baja { border-left: 3px solid var(--muted); }
    .rec-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .rec-area { font-size: 0.76rem; color: var(--muted); font-weight: 600; }
    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
    }
    .badge-alta { background: rgba(245, 158, 11, 0.18); color: #fde68a; }
    .badge-media { background: rgba(56, 189, 248, 0.16); color: #bae6fd; }
    .badge-baja { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>Dashboard SEO &amp; GEO — ${escapeHtml(project.name || 'PolitiFácil 29-N')}</h1>
        <p class="muted">${escapeHtml(project.siteUrl || '')} · GA4 Propiedad <code>${escapeHtml(project.ga4PropertyId || '')}</code> · GTM <code>${escapeHtml(project.gtmContainerId || '')}</code></p>
        <div class="meta-pills">
          <span class="pill">Último análisis: ${escapeHtml(latest.date)}</span>
          ${daysToElection !== null ? `<span class="pill">${daysToElection > 0 ? `Faltan ${daysToElection} días para el 29-N` : 'Elecciones 29-N'}</span>` : ''}
          <span class="pill">Rango: ${escapeHtml(latest.dateRangeNote || '')}</span>
        </div>
      </div>
      <div class="muted" style="text-align:right;">
        <div>Actualizado: ${escapeHtml(latest.checkedAt || latest.date)}</div>
        <div>Seguimiento diario automático: 08:00 Europe/Madrid</div>
      </div>
    </header>

    <section class="status-banner ${isOkMode ? 'is-ok' : 'is-action'}">
      <div>
        <div class="kpi-label">Estado del monitoreo diario</div>
        <h2 style="margin:0 0 4px;">${escapeHtml(decision.statusLabel || 'Monitoreo activo')}</h2>
        <p class="muted" style="margin:0;">${escapeHtml(decision.summary || '')}</p>
      </div>
      <span class="pill">${(decision.recommendations || []).length} acciones sugeridas</span>
    </section>

    <section aria-label="KPIs últimas 24 horas" style="margin-bottom:20px;">
      <h2 style="margin-bottom:10px;">Últimas 24 horas (${escapeHtml((ga4_24h && ga4_24h.windowLabel) || 'Pendiente de próximo corte')})</h2>
      <div class="kpi-grid" style="margin-bottom:0;">
        <div class="kpi-card">
          <div class="kpi-label">Sesiones (24h)</div>
          <div class="kpi-value">${ga4_24h ? fmtNum(ga4_24h.sessions) : '—'}</div>
          <div class="kpi-sub">${ga4_24h ? `${fmtNum(ga4_24h.activeUsers)} usuarios · ${fmtNum(ga4_24h.views)} vistas` : 'Se completará en el próximo corte'}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Interacción (24h)</div>
          <div class="kpi-value">${ga4_24h ? fmtPct(ga4_24h.engagementRatePct) : '—'}</div>
          <div class="kpi-sub">Media: ${escapeHtml((ga4_24h && ga4_24h.avgEngagementTimeLabel) || '—')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tests completados (24h)</div>
          <div class="kpi-value">${ga4_24h ? fmtNum((ga4_24h.keyEventBreakdown && ga4_24h.keyEventBreakdown.quiz_complete) || 0) : '—'}</div>
          <div class="kpi-sub">${ga4_24h ? `${fmtNum((ga4_24h.keyEventBreakdown && ga4_24h.keyEventBreakdown.quiz_start) || 0)} iniciados · ${fmtNum((ga4_24h.keyEventBreakdown && ga4_24h.keyEventBreakdown.share_result) || 0)} compartidos` : '—'}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">SEO &amp; GEO / IA (24h)</div>
          <div class="kpi-value">${ga4_24h ? `${fmtNum(ga4_24h.organicSearchSessions)} / ${fmtNum(ga4_24h.aiReferralSessions)}` : '—'}</div>
          <div class="kpi-sub">Sesiones Google / Motores de IA</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Search Console (último día)</div>
          <div class="kpi-value">${gsc_24h && gsc_24h.hasData ? `${fmtNum(gsc_24h.clicks)} / ${fmtNum(gsc_24h.impressions)}` : '0 / 0'}</div>
          <div class="kpi-sub">${escapeHtml((gsc_24h && gsc_24h.windowLabel) || 'Sin datos diarios aún')}</div>
        </div>
      </div>
    </section>

    <h2 style="margin-bottom:10px;">Acumulado desde el inicio (${escapeHtml(launchDate)} – ${escapeHtml(latest.date)})</h2>
    <section class="kpi-grid" aria-label="KPIs acumulados">
      <div class="kpi-card">
        <div class="kpi-label">Sesiones (Acum.)</div>
        <div class="kpi-value">${fmtNum(ga4.sessions)}</div>
        ${computeDelta(ga4.sessions, prev && prev.ga4 && prev.ga4.sessions)}
        <div class="kpi-sub">${fmtNum(ga4.activeUsers)} usuarios activos · ${fmtNum(ga4.views)} vistas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tasa de interacción</div>
        <div class="kpi-value">${fmtPct(ga4.engagementRatePct)}</div>
        ${computeDelta(ga4.engagementRatePct, prev && prev.ga4 && prev.ga4.engagementRatePct, ' %')}
        <div class="kpi-sub">Media: ${escapeHtml(ga4.avgEngagementTimeLabel || '-')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Organic Search (SEO)</div>
        <div class="kpi-value">${fmtNum(ga4.organicSearchSessions)}</div>
        ${computeDelta(ga4.organicSearchSessions, prev && prev.ga4 && prev.ga4.organicSearchSessions)}
        <div class="kpi-sub">Sesiones orgánicas en GA4</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tráfico GEO / IA</div>
        <div class="kpi-value">${fmtNum(ga4.aiReferralSessions)}</div>
        ${computeDelta(ga4.aiReferralSessions, prev && prev.ga4 && prev.ga4.aiReferralSessions)}
        <div class="kpi-sub">ChatGPT, Perplexity, Gemini, Claude</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Clics / Impresiones (GSC)</div>
        <div class="kpi-value">${gsc.clicks != null ? `${fmtNum(gsc.clicks)} / ${fmtNum(gsc.impressions)}` : 'Procesando'}</div>
        <div class="kpi-sub">CTR: ${fmtPct(gsc.ctrPct)} · Pos: ${gsc.avgPosition != null ? Number(gsc.avgPosition).toFixed(1) : 'Procesando'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Indexación y Sitemap</div>
        <div class="kpi-value">${gsc.indexedPages != null ? `${fmtNum(gsc.indexedPages)} / ${fmtNum((gsc.sitemap && gsc.sitemap.discoveredUrls) || 40)}` : `0 / ${fmtNum((gsc.sitemap && gsc.sitemap.discoveredUrls) || 40)}`}</div>
        <div class="kpi-sub">Sitemap: ${escapeHtml((gsc.sitemap && gsc.sitemap.status) || '-')} · robots.txt: ${escapeHtml(gsc.robotsTxtStatus || '-')}</div>
      </div>
    </section>

    <section class="spark-grid" aria-label="Tendencia histórica">
      ${renderHistorySparkline(entries, (e) => e.ga4 && e.ga4.sessions, 'Sesiones GA4', '#38bdf8')}
      ${renderHistorySparkline(entries, (e) => e.ga4 && e.ga4.organicSearchSessions, 'Tráfico SEO (GA4)', '#22c55e')}
      ${renderHistorySparkline(entries, (e) => e.ga4 && e.ga4.aiReferralSessions, 'Tráfico GEO / IA (GA4)', '#a78bfa')}
      ${renderHistorySparkline(entries, (e) => e.gsc && e.gsc.impressions, 'Impresiones (GSC)', '#f59e0b')}
    </section>

    <section class="card">
      <h2>Adquisición por Canal (SEO vs Social vs GEO/IA)</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Canal</th>
              <th>Fuente / Medio</th>
              <th class="num">Sesiones (24h)</th>
              <th class="num">Sesiones (Acum.)</th>
              <th class="num">Cuota</th>
              <th class="num">Con interacción</th>
              <th class="num">% Interacción</th>
              <th class="num">Tiempo medio</th>
              <th class="num">Eventos</th>
            </tr>
          </thead>
          <tbody>${channelsHtml}</tbody>
        </table>
      </div>
      <div style="margin-top:14px;">
        <h3>Detalle GEO · Referencias desde Motores de IA</h3>
        ${aiSourcesHtml}
      </div>
    </section>

    <div class="grid-2">
      <section class="card" style="margin-bottom:0;">
        <h2>Search Console · Consultas Principales</h2>
        <div class="table-wrap">${gscQueriesHtml}</div>
      </section>
      <section class="card" style="margin-bottom:0;">
        <h2>Search Console · Páginas Principales e Indexación</h2>
        <div class="table-wrap">${gscPagesHtml}</div>
        ${indexingReasonsHtml ? `<div style="margin-top:12px;"><h3>Motivos de no indexación</h3>${indexingReasonsHtml}</div>` : ''}
      </section>
    </div>

    <div class="grid-2" style="margin-top:18px;">
      <section class="card" style="margin-bottom:0;">
        <h2>GA4 · Páginas de Destino</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ruta</th><th class="num">Sesiones</th><th class="num">Usuarios</th><th class="num">Nuevos</th><th class="num">Tiempo medio</th></tr></thead>
            <tbody>${landingHtml}</tbody>
          </table>
        </div>
      </section>
      <section class="card" style="margin-bottom:0;">
        <h2>GA4 · Páginas y Pantallas</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ruta</th><th class="num">Vistas</th><th class="num">Usuarios</th><th class="num">Tiempo medio</th><th class="num">Eventos</th></tr></thead>
            <tbody>${screensHtml}</tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:18px;">
      <h2>Diagnóstico y Mejoras Propuestas (${escapeHtml(latest.date)})</h2>
      <div class="rec-grid">${recsHtml}</div>
    </section>

    <section class="card">
      <h2>Eventos Clave Instrumentados (GA4 / GTM + Vercel Analytics)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Evento</th><th>Tipo</th><th>Qué mide</th><th class="num">Últimas 24 h</th><th class="num">Acumulado</th></tr></thead>
          <tbody>${eventsHtml}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Histórico Diario de Seguimiento</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th class="num">Sesiones (24h)</th>
              <th class="num">Sesiones (Acum.)</th>
              <th class="num">% Interacción</th>
              <th class="num">SEO (GA4)</th>
              <th class="num">GEO / IA</th>
              <th class="num">Clics GSC</th>
              <th class="num">Impresiones GSC</th>
              <th class="num">Indexadas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>${historyRowsHtml}</tbody>
        </table>
      </div>
    </section>
  </div>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(HISTORY_PATH)) {
    throw new Error(`No existe ${HISTORY_PATH}`);
  }
  const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
  const data = JSON.parse(raw);
  const html = buildDashboardHtml(data);
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(DASHBOARD_PATH, html, 'utf8');
  const latest = data.entries[data.entries.length - 1];
  console.log('SEO/GEO DASHBOARD ACTUALIZADO:', {
    dashboardPath: DASHBOARD_PATH,
    entriesCount: data.entries.length,
    latestDate: latest ? latest.date : null,
  });
}

main();
