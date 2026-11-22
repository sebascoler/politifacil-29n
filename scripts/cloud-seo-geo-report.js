'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const HISTORY_PATH = path.join(REPORTS_DIR, 'seo-geo-history.json');
const EMAIL_MD_PATH = path.join(REPORTS_DIR, 'latest-email-summary.md');
const EMAIL_HTML_PATH = path.join(REPORTS_DIR, 'latest-email-summary.html');
const DASHBOARD_SCRIPT = path.join(__dirname, 'update-seo-dashboard.js');

const AI_DOMAINS = [
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
  'meta.ai',
];

const TRACKED_EVENT_NAMES = [
  'quiz_complete',
  'quiz_start',
  'quiz_step_answer',
  'blind_reveal',
  'blind_pick_toggle',
  'share_result',
  'ai_referral_visit',
  'section_view',
  'comparator_interaction',
  'party_inspect',
  'interview_filter',
  'static_cta_click',
  'official_source_click',
];

function getMadridDate(offsetDays = 0) {
  const target = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target);
}

function getLast24DateHours() {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const nowMs = Date.now();
  const hours = [];
  for (let i = 23; i >= 0; i -= 1) {
    const parts = fmt.formatToParts(new Date(nowMs - i * 3600000));
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    hours.push(`${map.year}${map.month}${map.day}${map.hour}`);
  }
  return hours;
}

function getMadridIsoNow() {
  const now = new Date();
  const datePart = getMadridDate(0);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return `${datePart}T${timePart}`;
}

function formatDurationLabel(totalSeconds) {
  const secs = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins === 0) return `${rem} s`;
  if (rem === 0) return `${mins} min`;
  return `${mins} min ${String(rem).padStart(2, '0')} s`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadServiceAccountCredentials() {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) {
    throw new Error(
      'Falta GOOGLE_SERVICE_ACCOUNT_JSON. Configura el secret en GitHub Actions o la variable de entorno local.'
    );
  }
  let parsed;
  if (raw.startsWith('{')) {
    parsed = JSON.parse(raw);
  } else {
    parsed = JSON.parse(fs.readFileSync(raw, 'utf8'));
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no contiene client_email o private_key válidos.');
  }
  return parsed;
}

async function getGoogleAccessToken(creds) {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimSet = Buffer.from(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    })
  ).toString('base64url');

  const unsigned = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(creds.private_key).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Error OAuth Google (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function apiJson(url, token, options = {}) {
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} en ${url}: ${JSON.stringify(json)}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

async function runGa4Report(propertyId, token, body) {
  return apiJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, token, {
    method: 'POST',
    body,
  });
}

function metricNum(row, idx) {
  const val = row && row.metricValues && row.metricValues[idx] ? row.metricValues[idx].value : '0';
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

function dimVal(row, idx) {
  return row && row.dimensionValues && row.dimensionValues[idx] ? row.dimensionValues[idx].value : '';
}

function matchAiDomain(sourceMedium) {
  const lower = String(sourceMedium || '').toLowerCase();
  for (const domain of AI_DOMAINS) {
    const tok = domain.split('.')[0];
    if (lower.includes(domain) || lower.startsWith(`${tok} `) || lower.includes(`/${tok}`)) {
      return domain;
    }
  }
  return null;
}

async function fetchGa4Metrics(propertyId, token, startDate, endDate, options = {}) {
  const dateRanges = [{ startDate, endDate }];
  const filterClause = options.dimensionFilter ? { dimensionFilter: options.dimensionFilter } : {};

  const [overviewRes, channelRes, landingRes, screenRes, eventsRes] = await Promise.all([
    runGa4Report(propertyId, token, {
      dateRanges,
      ...filterClause,
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'screenPageViews' },
        { name: 'screenPageViewsPerUser' },
        { name: 'userEngagementDuration' },
        { name: 'eventCount' },
        { name: 'keyEvents' },
      ],
    }),
    runGa4Report(propertyId, token, {
      dateRanges,
      ...filterClause,
      dimensions: [{ name: 'sessionPrimaryChannelGroup' }, { name: 'sessionSourceMedium' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'userEngagementDuration' },
        { name: 'eventCount' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
    runGa4Report(propertyId, token, {
      dateRanges,
      ...filterClause,
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    runGa4Report(propertyId, token, {
      dateRanges,
      ...filterClause,
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
        { name: 'eventCount' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
    runGa4Report(propertyId, token, {
      dateRanges,
      ...filterClause,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      limit: 100,
    }),
  ]);

  const ovRow = (overviewRes.rows && overviewRes.rows[0]) || null;
  const activeUsers = Math.round(metricNum(ovRow, 0));
  const newUsers = Math.round(metricNum(ovRow, 1));
  const sessions = Math.round(metricNum(ovRow, 2));
  const engagedSessions = Math.round(metricNum(ovRow, 3));
  const engagementRatePct = Number((metricNum(ovRow, 4) * 100).toFixed(2));
  const views = Math.round(metricNum(ovRow, 5));
  const viewsPerUser = Number(metricNum(ovRow, 6).toFixed(2));
  const totalEngSec = metricNum(ovRow, 7);
  const avgEngagementTimeSec = activeUsers > 0 ? Math.round(totalEngSec / activeUsers) : 0;
  const totalEvents = Math.round(metricNum(ovRow, 8));
  const keyEvents = Math.round(metricNum(ovRow, 9));

  let organicSearchSessions = 0;
  let aiReferralSessions = 0;
  const aiMap = new Map();

  const channels = (channelRes.rows || []).map((row) => {
    const channel = dimVal(row, 0) || 'Unassigned';
    const sourceMedium = dimVal(row, 1) || '(sin definir)';
    const chSessions = Math.round(metricNum(row, 0));
    const chEngaged = Math.round(metricNum(row, 1));
    const chEngRate = Number((metricNum(row, 2) * 100).toFixed(2));
    const chDurSec = metricNum(row, 3);
    const chAvgDur = chSessions > 0 ? Math.round(chDurSec / chSessions) : 0;
    const chEvents = Math.round(metricNum(row, 4));
    const sharePct = sessions > 0 ? Number(((chSessions / sessions) * 100).toFixed(2)) : 0;

    if (channel === 'Organic Search') {
      organicSearchSessions += chSessions;
    }

    const aiDomain = matchAiDomain(sourceMedium);
    if (aiDomain) {
      aiReferralSessions += chSessions;
      const prevAi = aiMap.get(aiDomain) || { source: aiDomain, sessions: 0, engagedSessions: 0 };
      prevAi.sessions += chSessions;
      prevAi.engagedSessions += chEngaged;
      aiMap.set(aiDomain, prevAi);
    }

    return {
      channel,
      sourceMedium,
      sessions: chSessions,
      sharePct,
      engagedSessions: chEngaged,
      engagementRatePct: chEngRate,
      avgEngagementTime: formatDurationLabel(chAvgDur),
      events: chEvents,
    };
  });

  if (!channels.some((c) => c.channel.toLowerCase().includes('organic search'))) {
    channels.push({
      channel: 'Organic Search (SEO)',
      sourceMedium: 'google / organic',
      sessions: 0,
      sharePct: 0,
      engagedSessions: 0,
      engagementRatePct: 0,
      avgEngagementTime: '0 s',
      events: 0,
    });
  }

  if (aiReferralSessions === 0) {
    channels.push({
      channel: 'GEO / Motores de IA',
      sourceMedium: 'chatgpt / perplexity / gemini / claude',
      sessions: 0,
      sharePct: 0,
      engagedSessions: 0,
      engagementRatePct: 0,
      avgEngagementTime: '0 s',
      events: 0,
    });
  }

  const landingPages = (landingRes.rows || []).map((row) => {
    const lpSessions = Math.round(metricNum(row, 0));
    const lpUsers = Math.round(metricNum(row, 1));
    const lpNewUsers = Math.round(metricNum(row, 2));
    const lpDur = metricNum(row, 3);
    const avgSec = lpUsers > 0 ? Math.round(lpDur / lpUsers) : 0;
    return {
      path: dimVal(row, 0) || '(not set)',
      sessions: lpSessions,
      activeUsers: lpUsers,
      newUsers: lpNewUsers,
      avgEngagementTime: formatDurationLabel(avgSec),
    };
  });

  const pagesAndScreens = (screenRes.rows || []).map((row) => {
    const pViews = Math.round(metricNum(row, 0));
    const pUsers = Math.round(metricNum(row, 1));
    const pDur = metricNum(row, 2);
    const pEvents = Math.round(metricNum(row, 3));
    const avgSec = pUsers > 0 ? Math.round(pDur / pUsers) : 0;
    return {
      path: dimVal(row, 0) || '/',
      views: pViews,
      activeUsers: pUsers,
      avgEngagementTime: formatDurationLabel(avgSec),
      events: pEvents,
    };
  });

  const keyEventBreakdown = {};
  const allEventCounts = new Map();
  (eventsRes.rows || []).forEach((row) => {
    allEventCounts.set(dimVal(row, 0), Math.round(metricNum(row, 0)));
  });
  TRACKED_EVENT_NAMES.forEach((evName) => {
    keyEventBreakdown[evName] = allEventCounts.get(evName) || 0;
  });

  return {
    activeUsers,
    newUsers,
    sessions,
    engagedSessions,
    engagementRatePct,
    views,
    viewsPerUser,
    avgEngagementTimeLabel: formatDurationLabel(avgEngagementTimeSec),
    avgEngagementTimeSec,
    totalEvents,
    keyEvents,
    organicSearchSessions,
    aiReferralSessions,
    aiSources: Array.from(aiMap.values()).sort((a, b) => b.sessions - a.sessions),
    channels,
    landingPages,
    pagesAndScreens,
    keyEventBreakdown,
  };
}

async function fetchGa4Last24h(propertyId, token, yesterdayMadrid, todayMadrid) {
  try {
    const dateHours = getLast24DateHours();
    const metrics = await fetchGa4Metrics(propertyId, token, yesterdayMadrid, todayMadrid, {
      dimensionFilter: {
        filter: {
          fieldName: 'dateHour',
          inListFilter: { values: dateHours },
        },
      },
    });
    return {
      ...metrics,
      windowLabel: 'Últimas 24 horas',
      windowRange: `${dateHours[0]} – ${dateHours[dateHours.length - 1]}`,
    };
  } catch (err) {
    console.warn('Aviso: filtro dateHour no disponible en GA4, usando día completo de ayer:', err.message);
    const fallback = await fetchGa4Metrics(propertyId, token, yesterdayMadrid, yesterdayMadrid);
    return {
      ...fallback,
      windowLabel: 'Ayer (último día completo)',
      windowRange: yesterdayMadrid,
    };
  }
}

async function fetchGscLast24h(siteUrl, token, todayMadrid) {
  const encodedSite = encodeURIComponent(siteUrl);
  const baseUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}`;
  const startLookback = getMadridDate(-3);
  const res = await apiJson(`${baseUrl}/searchAnalytics/query`, token, {
    method: 'POST',
    body: { startDate: startLookback, endDate: todayMadrid, dimensions: ['date'], rowLimit: 10 },
  });
  const sorted = (res.rows || [])
    .slice()
    .sort((a, b) => String((b.keys && b.keys[0]) || '').localeCompare(String((a.keys && a.keys[0]) || '')));
  const latestRow = sorted[0] || null;
  const latestDate = latestRow && latestRow.keys ? latestRow.keys[0] : null;
  const hasData = Boolean(latestRow && (latestRow.impressions > 0 || latestRow.clicks > 0));
  return {
    date: latestDate,
    clicks: hasData ? Math.round(latestRow.clicks || 0) : null,
    impressions: hasData ? Math.round(latestRow.impressions || 0) : null,
    ctrPct: hasData ? Number(((latestRow.ctr || 0) * 100).toFixed(2)) : null,
    avgPosition: hasData && latestRow.position != null ? Number(latestRow.position.toFixed(1)) : null,
    hasData,
    windowLabel: latestDate
      ? `Último día con datos (${latestDate})`
      : 'Sin datos diarios consolidados aún',
  };
}

async function fetchGscMetrics(siteUrl, token, startDate, endDate, expectedSitemapUrls) {
  const encodedSite = encodeURIComponent(siteUrl);
  const baseUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}`;

  const [totalsRes, queriesRes, pagesRes, sitemapsRes] = await Promise.all([
    apiJson(`${baseUrl}/searchAnalytics/query`, token, {
      method: 'POST',
      body: { startDate, endDate },
    }),
    apiJson(`${baseUrl}/searchAnalytics/query`, token, {
      method: 'POST',
      body: { startDate, endDate, dimensions: ['query'], rowLimit: 15 },
    }),
    apiJson(`${baseUrl}/searchAnalytics/query`, token, {
      method: 'POST',
      body: { startDate, endDate, dimensions: ['page'], rowLimit: 15 },
    }),
    apiJson(`${baseUrl}/sitemaps`, token),
  ]);

  const totalRow = (totalsRes.rows && totalsRes.rows[0]) || null;
  const topQueries = (queriesRes.rows || []).map((r) => ({
    query: r.keys && r.keys[0] ? r.keys[0] : '',
    clicks: Math.round(r.clicks || 0),
    impressions: Math.round(r.impressions || 0),
    ctrPct: Number(((r.ctr || 0) * 100).toFixed(2)),
    position: r.position != null ? Number(r.position.toFixed(1)) : null,
  }));

  const topPages = (pagesRes.rows || []).map((r) => {
    const rawUrl = r.keys && r.keys[0] ? r.keys[0] : '';
    let pathOnly = rawUrl;
    try {
      pathOnly = new URL(rawUrl).pathname || '/';
    } catch {
      pathOnly = rawUrl;
    }
    return {
      page: pathOnly,
      clicks: Math.round(r.clicks || 0),
      impressions: Math.round(r.impressions || 0),
      ctrPct: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: r.position != null ? Number(r.position.toFixed(1)) : null,
    };
  });

  const sitemaps = sitemapsRes.sitemap || [];
  const mainSitemap = sitemaps.find((s) => String(s.path || '').includes('sitemap.xml')) || sitemaps[0] || null;
  const webContent =
    mainSitemap && Array.isArray(mainSitemap.contents)
      ? mainSitemap.contents.find((c) => c.type === 'web') || mainSitemap.contents[0]
      : null;

  const discoveredUrls =
    webContent && webContent.submitted != null ? Number(webContent.submitted) : expectedSitemapUrls || 40;
  const indexedFromSitemap =
    webContent && webContent.indexed != null && webContent.indexed !== '' ? Number(webContent.indexed) : null;

  const hasSearchData = Boolean(totalRow && (totalRow.impressions > 0 || totalRow.clicks > 0));
  const sitemapErrors = mainSitemap ? Number(mainSitemap.errors || 0) : 0;

  return {
    status: hasSearchData ? 'ready' : 'processing',
    statusMessage: hasSearchData
      ? 'Datos consolidados desde Google Search Console API'
      : 'Sin impresiones todavía o en procesamiento inicial en Google Search Console',
    clicks: hasSearchData ? Math.round(totalRow.clicks || 0) : null,
    impressions: hasSearchData ? Math.round(totalRow.impressions || 0) : null,
    ctrPct: hasSearchData ? Number(((totalRow.ctr || 0) * 100).toFixed(2)) : null,
    avgPosition: hasSearchData && totalRow.position != null ? Number(totalRow.position.toFixed(1)) : null,
    indexedPages: Number.isFinite(indexedFromSitemap) ? indexedFromSitemap : null,
    notIndexedPages:
      Number.isFinite(indexedFromSitemap) && discoveredUrls >= indexedFromSitemap
        ? discoveredUrls - indexedFromSitemap
        : null,
    indexingReasons: [],
    sitemap: {
      url: '/sitemap.xml',
      status: mainSitemap ? (sitemapErrors === 0 ? 'Correcto' : `${sitemapErrors} errores`) : 'No encontrado',
      submittedDate: mainSitemap && mainSitemap.lastSubmitted ? String(mainSitemap.lastSubmitted).slice(0, 10) : '',
      lastReadDate: mainSitemap && mainSitemap.lastDownloaded ? String(mainSitemap.lastDownloaded).slice(0, 10) : '',
      discoveredUrls,
    },
    robotsTxtStatus: 'Válidas',
    topQueries,
    topPages,
  };
}

function evaluateDailyDecision(ga4, gsc, prevEntry, project, todayDate, ga4Last24h = null) {
  const recommendations = [];
  const expectedUrls = project.expectedSitemapUrls || 40;
  const launchDate = process.env.LAUNCH_DATE || project.launchDate || '2026-11-17';

  const daysToElection = project.electionDate
    ? Math.ceil(
        (new Date(`${project.electionDate}T09:00:00+01:00`).getTime() -
          new Date(`${todayDate}T08:00:00+01:00`).getTime()) /
          86400000
      )
    : null;

  if (gsc.status === 'processing') {
    recommendations.push({
      priority: 'alta',
      area: 'SEO / Indexación',
      title: 'Acelerar indexación inicial en Search Console',
      detail:
        'Search Console aún no muestra impresiones consolidadas. Conviene solicitar indexación manual en Inspección de URLs para /, /test-afinidad, /comparador, /entrevistas y /territorios.',
    });
  } else if (gsc.indexedPages != null && gsc.indexedPages < expectedUrls) {
    const pending = expectedUrls - gsc.indexedPages;
    recommendations.push({
      priority: pending >= 10 ? 'alta' : 'media',
      area: 'SEO / Cobertura',
      title: `Faltan ${pending} páginas por indexar (${gsc.indexedPages}/${expectedUrls})`,
      detail:
        'Revisar en Search Console las URLs pendientes del sitemap (especialmente /propuestas/* y /comparar/*) y reforzar enlaces internos o indexación manual.',
    });
  }

  const lowCtrPages = (gsc.topPages || []).filter((p) => p.impressions >= 50 && p.ctrPct < 2.0);
  if (lowCtrPages.length > 0) {
    recommendations.push({
      priority: 'media',
      area: 'SEO / CTR',
      title: `Mejorar títulos y meta descripciones en ${lowCtrPages.length} página(s) con bajo CTR`,
      detail: `Páginas con impresiones >= 50 y CTR < 2 %: ${lowCtrPages
        .slice(0, 3)
        .map((p) => `${p.page} (${p.ctrPct} %)`)
        .join(', ')}.`,
    });
  }

  const quizStarts = (ga4.keyEventBreakdown && ga4.keyEventBreakdown.quiz_start) || 0;
  const quizCompletes = (ga4.keyEventBreakdown && ga4.keyEventBreakdown.quiz_complete) || 0;
  if (quizStarts >= 10 && quizCompletes / quizStarts < 0.4) {
    const compPct = Math.round((quizCompletes / quizStarts) * 100);
    recommendations.push({
      priority: 'media',
      area: 'Conversión Test',
      title: `Finalización del test por debajo del objetivo (${compPct} %)`,
      detail: `De ${quizStarts} usuarios que empiezan el test, lo completan ${quizCompletes}. Revisar fricción en los escenarios intermedios o la claridad de la barra de progreso.`,
    });
  }

  if (prevEntry && prevEntry.ga4 && prevEntry.ga4.engagementRatePct > 0) {
    const drop = prevEntry.ga4.engagementRatePct - ga4.engagementRatePct;
    if (drop >= 15) {
      recommendations.push({
        priority: 'alta',
        area: 'Experiencia de usuario',
        title: `Caída de interacción (${ga4.engagementRatePct} % vs ${prevEntry.ga4.engagementRatePct} % ayer)`,
        detail:
          'Revisar la fuente de tráfico principal del día para confirmar si entró tráfico poco cualificado o si alguna página de destino necesita mejorar el primer pantallazo.',
      });
    }
  }

  if (ga4.sessions > 0 && ga4.aiReferralSessions > 0) {
    const topAi = ga4.aiSources[0];
    recommendations.push({
      priority: 'baja',
      area: 'GEO / IA',
      title: `Ya llegan visitas desde IA (${ga4.aiReferralSessions} sesiones · líder: ${topAi.source})`,
      detail:
        'Mantener actualizados llms.txt, llms-full.txt y los datos estructurados con las citas de entrevistas más recientes para reforzar las citaciones.',
    });
  }

  const hasActionable = recommendations.some((r) => r.priority === 'alta' || r.priority === 'media');
  const status = hasActionable ? 'mejoras_propuestas' : 'monitoreo_estable';
  const statusLabel = hasActionable ? 'Mejoras propuestas' : 'Todo en orden · Monitoreo estable';

  const daysTxt = daysToElection != null && daysToElection > 0 ? `Faltan ${daysToElection} días para el 29-N. ` : '';
  const recentTxt = ga4Last24h
    ? `Últimas 24 h: ${ga4Last24h.sessions} sesiones (${ga4Last24h.engagementRatePct} % interacción, ${ga4Last24h.organicSearchSessions} SEO, ${ga4Last24h.aiReferralSessions} IA). `
    : '';
  const summary = hasActionable
    ? `${daysTxt}${recentTxt}Acumulado desde ${launchDate}: ${ga4.sessions} sesiones (${ga4.engagementRatePct} % interacción), ${ga4.organicSearchSessions} de SEO y ${ga4.aiReferralSessions} de IA. Hay ${recommendations.length} recomendación(es) prioritaria(s).`
    : `${daysTxt}${recentTxt}Acumulado desde ${launchDate}: ${ga4.sessions} sesiones (${ga4.engagementRatePct} % interacción, ${gsc.clicks || 0} clics en Google y ${ga4.aiReferralSessions} visitas desde IA). Se mantiene el monitoreo diario sin cambios necesarios.`;

  return { status, statusLabel, summary, recommendations };
}

function buildEmailReports(entry, prevEntry, project) {
  const { date, ga4, gsc, decision } = entry;
  const ga4_24h = entry.ga4Last24h || {
    activeUsers: 0,
    newUsers: 0,
    sessions: 0,
    engagedSessions: 0,
    engagementRatePct: 0,
    views: 0,
    avgEngagementTimeLabel: '0 s',
    organicSearchSessions: 0,
    aiReferralSessions: 0,
    aiSources: [],
    channels: [],
    keyEventBreakdown: {},
    windowLabel: 'Últimas 24 horas',
  };
  const gsc_24h = entry.gscLast24h || {
    date: null,
    clicks: null,
    impressions: null,
    ctrPct: null,
    avgPosition: null,
    hasData: false,
    windowLabel: 'Sin datos diarios consolidados aún',
  };

  const launchDate = process.env.LAUNCH_DATE || project.launchDate || '2026-11-17';
  const prevGa4 = prevEntry ? prevEntry.ga4 : null;
  const prevGsc = prevEntry ? prevEntry.gsc : null;

  const daysToElection = project.electionDate
    ? Math.ceil(
        (new Date(`${project.electionDate}T09:00:00+01:00`).getTime() -
          new Date(`${date}T08:00:00+01:00`).getTime()) /
          86400000
      )
    : null;

  const deltaSessionsTxt =
    prevGa4 && prevGa4.sessions != null
      ? ` (${ga4.sessions - prevGa4.sessions >= 0 ? '+' : ''}${ga4.sessions - prevGa4.sessions} respecto al último reporte)`
      : '';

  const bestChannel24h = (ga4_24h.channels || [])
    .filter((c) => c.sessions > 0)
    .sort((a, b) => b.engagementRatePct - a.engagementRatePct)[0];
  const bestChannelAll = (ga4.channels || [])
    .filter((c) => c.sessions > 0)
    .sort((a, b) => b.engagementRatePct - a.engagementRatePct)[0];
  const bestChannel = bestChannel24h || bestChannelAll;

  const google24hSentence = gsc_24h.hasData
    ? `En el último día con datos en Search Console (${gsc_24h.date}): **${gsc_24h.impressions} impresiones**, **${gsc_24h.clicks} clics** (CTR **${gsc_24h.ctrPct} %**, posición media **${gsc_24h.avgPosition}**) y **${ga4_24h.organicSearchSessions} visitas** desde buscadores en las últimas 24 h.`
    : `En las últimas 24 h se registraron **${ga4_24h.organicSearchSessions} visitas** desde buscadores (Search Console aún no consolida impresiones del último día).`;

  const googleAllSentence =
    gsc.status === 'processing'
      ? `Desde el inicio (${launchDate}), Google ya detectó tus **${gsc.sitemap.discoveredUrls} páginas**, aunque sigue procesando las impresiones acumuladas (**${ga4.organicSearchSessions} visitas** orgánicas en total).`
      : `Desde el inicio (${launchDate}), tu web apareció **${gsc.impressions} veces** en Google y sumó **${gsc.clicks} clics** (CTR **${gsc.ctrPct} %**, posición media **${gsc.avgPosition}**; **${ga4.organicSearchSessions} visitas** orgánicas y **${gsc.indexedPages != null ? gsc.indexedPages : '?'} de ${gsc.sitemap.discoveredUrls} páginas** indexadas).`;

  const aiSentence =
    ga4.aiReferralSessions > 0 || ga4_24h.aiReferralSessions > 0
      ? `Últimas 24 h: **${ga4_24h.aiReferralSessions} visitas** desde asistentes de IA. Acumulado desde ${launchDate}: **${ga4.aiReferralSessions} visitas** (${(ga4.aiSources || []).map((s) => `${s.source}: ${s.sessions}`).join(', ') || 'motores de IA'}).`
      : `Tanto en las últimas 24 h como en el acumulado desde el ${launchDate}, todavía hay **0 visitas** registradas desde ChatGPT, Perplexity, Gemini o Claude.`;

  const verdictHeading =
    decision.status === 'monitoreo_estable'
      ? 'Todo en orden, no hace falta tocar nada hoy. Seguimos monitoreando automáticamente.'
      : 'Conviene revisar estas mejoras puntuales hoy:';

  const simpleActionsMd =
    decision.recommendations.length > 0
      ? decision.recommendations.map((r, i) => `${i + 1}. **${r.title}:** ${r.detail}`).join('\n')
      : '- Sin cambios necesarios; las métricas evolucionan según lo esperado.';

  const ev24 = ga4_24h.keyEventBreakdown || {};
  const evAll = ga4.keyEventBreakdown || {};

  const quizStart24h = ev24.quiz_start || 0;
  const quizDone24h = ev24.quiz_complete || 0;
  const blindDone24h = ev24.blind_reveal || 0;
  const sharesDone24h = ev24.share_result || 0;

  const quizStartAll = evAll.quiz_start || 0;
  const quizDoneAll = evAll.quiz_complete || 0;
  const blindDoneAll = evAll.blind_reveal || 0;
  const sharesDoneAll = evAll.share_result || 0;

  const channel24Map = new Map();
  (ga4_24h.channels || []).forEach((c) => {
    channel24Map.set(`${c.channel}||${c.sourceMedium}`, c.sessions);
  });

  const gsc24Label = gsc_24h.hasData
    ? `${gsc_24h.clicks} / ${gsc_24h.impressions} (${gsc_24h.date})`
    : 'Sin datos nuevos';
  const gscAllLabel =
    gsc.clicks != null ? `${gsc.clicks} / ${gsc.impressions}` : 'Procesando';

  const comparisonRows = [
    ['Usuarios activos', ga4_24h.activeUsers, ga4.activeUsers],
    ['Sesiones (visitas)', ga4_24h.sessions, ga4.sessions],
    ['% Interacción', `${ga4_24h.engagementRatePct} %`, `${ga4.engagementRatePct} %`],
    ['Tiempo medio', ga4_24h.avgEngagementTimeLabel, ga4.avgEngagementTimeLabel],
    ['Vistas de página', ga4_24h.views, ga4.views],
    ['Tests iniciados / completados', `${quizStart24h} / ${quizDone24h}`, `${quizStartAll} / ${quizDoneAll}`],
    ['Compartidos (share_result)', sharesDone24h, sharesDoneAll],
    ['Organic Search SEO (GA4)', ga4_24h.organicSearchSessions, ga4.organicSearchSessions],
    ['GEO / Motores de IA (GA4)', ga4_24h.aiReferralSessions, ga4.aiReferralSessions],
    ['Search Console: Clics / Impresiones', gsc24Label, gscAllLabel],
  ];

  const md = `## Resumen ejecutivo (sin tecnicismos)

**1. Qué pasó en la web (Últimas 24 horas vs Acumulado desde el ${launchDate}):**
* **Últimas 24 horas (${ga4_24h.windowLabel}):** Entraron **${ga4_24h.activeUsers} personas** (**${ga4_24h.sessions} visitas**) y **el ${ga4_24h.engagementRatePct} % interactuó activamente**, pasando una media de **${ga4_24h.avgEngagementTimeLabel}** en la página.${quizDone24h || blindDone24h || sharesDone24h ? ` Se completaron **${quizDone24h} tests**, **${blindDone24h} lecturas a ciegas** y se compartió **${sharesDone24h} veces**.` : ''}${bestChannel24h ? ` El canal más comprometido de las últimas 24 h fue **${bestChannel24h.sourceMedium}** (${bestChannel24h.engagementRatePct} % de interacción).` : ''}
* **Acumulado desde el inicio (${launchDate} – ${date}):** Suman **${ga4.activeUsers} personas** (**${ga4.sessions} visitas**${deltaSessionsTxt}) con **${ga4.engagementRatePct} % de interacción** y **${ga4.avgEngagementTimeLabel}** de media.${quizDoneAll || blindDoneAll || sharesDoneAll ? ` En total van **${quizDoneAll} tests completados**, **${blindDoneAll} lecturas a ciegas** y **${sharesDoneAll} compartidos**.` : ''}${!bestChannel24h && bestChannel ? ` Canal destacado: **${bestChannel.sourceMedium}** (${bestChannel.engagementRatePct} %).` : ''}

**2. Cómo vamos en Google y en respuestas de IA (ChatGPT, Perplexity, Gemini):**
* **Google (último día):** ${google24hSentence}
* **Google (acumulado):** ${googleAllSentence}
* **Asistentes de IA:** ${aiSentence}

**3. Qué hay que hacer hoy:**
${verdictHeading}
${simpleActionsMd}

*(Más abajo tienes el anexo técnico completo con la comparativa de últimas 24 horas y acumulado).*

---

# Anexo técnico — ${project.name} (${date})

- **Web:** ${project.siteUrl}
- **Cuenta atrás 29-N:** ${daysToElection != null && daysToElection > 0 ? `Faltan ${daysToElection} días` : 'Elecciones Generales 29-N'}
- **Ventanas consultadas:** ${entry.dateRangeNote}

### Comparativa rápida: Últimas 24 horas vs Acumulado desde el inicio (${launchDate})
${comparisonRows.map(([label, v24, vAll]) => `- **${label}:** ${v24} *(últimas 24 h)* | **${vAll}** *(acumulado)*`).join('\n')}

### Canales (Últimas 24 h y Acumulado)
${(ga4.channels || [])
  .map((c) => {
    const s24 = channel24Map.get(`${c.channel}||${c.sourceMedium}`) || 0;
    return `  - \`${c.channel}\` (${c.sourceMedium}): **${s24}** *(24 h)* · **${c.sessions}** *(acum., ${c.sharePct} % · ${c.engagementRatePct} % interacción · ${c.avgEngagementTime})*`;
  })
  .join('\n')}

### Páginas de destino (Acumulado)
${(ga4.landingPages || [])
  .map((lp) => `  - \`${lp.path}\`: ${lp.sessions} sesiones (${lp.activeUsers} usuarios · ${lp.avgEngagementTime})`)
  .join('\n')}

### Google Search Console (${project.gscProperty})
- **Último día con datos:** ${gsc_24h.hasData ? `${gsc_24h.date} — ${gsc_24h.clicks} clics · ${gsc_24h.impressions} impresiones · CTR ${gsc_24h.ctrPct} % · Pos ${gsc_24h.avgPosition}` : gsc_24h.windowLabel}
- **Acumulado (${launchDate} – ${date}):** ${gsc.statusMessage}
- **Clics:** ${gsc.clicks != null ? gsc.clicks : 'Procesando'}${prevGsc && prevGsc.clicks != null && gsc.clicks != null ? ` (${gsc.clicks - prevGsc.clicks >= 0 ? '+' : ''}${gsc.clicks - prevGsc.clicks} vs previo)` : ''} | **Impresiones:** ${gsc.impressions != null ? gsc.impressions : 'Procesando'} | **CTR:** ${gsc.ctrPct != null ? `${gsc.ctrPct} %` : 'Procesando'} | **Posición media:** ${gsc.avgPosition != null ? gsc.avgPosition : 'Procesando'}
- **Sitemap:** ${gsc.sitemap.status} (${gsc.sitemap.discoveredUrls} URLs descubiertas${gsc.indexedPages != null ? `, ${gsc.indexedPages} indexadas` : ''})
- **Top consultas:**
${gsc.topQueries.length > 0 ? gsc.topQueries.slice(0, 8).map((q) => `  - "${q.query}": ${q.clicks} clics · ${q.impressions} imp · CTR ${q.ctrPct} % · Pos ${q.position}`).join('\n') : '  - Sin consultas consolidadas todavía.'}
`;

  const formatBoldMd = (str) => escapeHtml(str).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;line-height:1.55;max-width:740px;margin:0 auto;padding:16px;">
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${decision.status === 'monitoreo_estable' ? '#16a34a' : '#d97706'};border-radius:10px;padding:16px 18px;margin-bottom:20px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Resumen ejecutivo (sin tecnicismos) — ${escapeHtml(date)}</h2>
    <p style="margin:0 0 6px;"><strong>1. Qué pasó en la web:</strong></p>
    <ul style="margin:0 0 12px;padding-left:20px;">
      <li><strong>Últimas 24 horas (${escapeHtml(ga4_24h.windowLabel)}):</strong> Entraron <strong>${ga4_24h.activeUsers} personas</strong> (<strong>${ga4_24h.sessions} visitas</strong>) y <strong>el ${ga4_24h.engagementRatePct} % interactuó activamente</strong>, pasando una media de <strong>${escapeHtml(ga4_24h.avgEngagementTimeLabel)}</strong>.${quizDone24h || blindDone24h || sharesDone24h ? ` Se completaron <strong>${quizDone24h} tests</strong>, <strong>${blindDone24h} lecturas a ciegas</strong> y se compartió <strong>${sharesDone24h} veces</strong>.` : ''}${bestChannel24h ? ` Canal destacado: <strong>${escapeHtml(bestChannel24h.sourceMedium)}</strong> (${bestChannel24h.engagementRatePct} %).` : ''}</li>
      <li><strong>Acumulado desde el inicio (${escapeHtml(launchDate)}):</strong> Suman <strong>${ga4.activeUsers} personas</strong> (<strong>${ga4.sessions} visitas</strong>${escapeHtml(deltaSessionsTxt)}) con <strong>${ga4.engagementRatePct} % de interacción</strong> y <strong>${escapeHtml(ga4.avgEngagementTimeLabel)}</strong> de media.${quizDoneAll || blindDoneAll || sharesDoneAll ? ` En total van <strong>${quizDoneAll} tests completados</strong>, <strong>${blindDoneAll} lecturas a ciegas</strong> y <strong>${sharesDoneAll} compartidos</strong>.` : ''}</li>
    </ul>
    <p style="margin:0 0 6px;"><strong>2. Cómo vamos en Google y en respuestas de IA:</strong></p>
    <ul style="margin:0 0 12px;padding-left:20px;">
      <li><strong>Google (último día):</strong> ${formatBoldMd(google24hSentence)}</li>
      <li><strong>Google (acumulado):</strong> ${formatBoldMd(googleAllSentence)}</li>
      <li><strong>Asistentes de IA:</strong> ${formatBoldMd(aiSentence)}</li>
    </ul>
    <p style="margin:0 0 6px;"><strong>3. Qué hay que hacer hoy:</strong> ${escapeHtml(verdictHeading)}</p>
    ${
      decision.recommendations.length > 0
        ? `<ol style="margin:0;padding-left:20px;">${decision.recommendations
            .map((r) => `<li><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.detail)}</li>`)
            .join('')}</ol>`
        : '<p style="margin:0;color:#15803d;"><strong>Todo en orden.</strong> No hace falta aplicar cambios hoy; seguimos monitoreando.</p>'
    }
  </div>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />

  <h3 style="margin:0 0 6px;font-size:15px;color:#334155;">Anexo técnico — ${escapeHtml(project.name)} (${escapeHtml(date)})</h3>
  <p style="margin:0 0 14px;font-size:13px;color:#475569;">${escapeHtml(project.siteUrl)} · ${daysToElection != null && daysToElection > 0 ? `Faltan ${daysToElection} días para el 29-N` : '29-N'} · ${escapeHtml(entry.dateRangeNote)}</p>

  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;padding:8px;border:1px solid #cbd5e1;">Métrica</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">Últimas 24 horas</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">Acumulado (desde ${escapeHtml(launchDate)})</th>
      </tr>
    </thead>
    <tbody>
      ${comparisonRows
        .map(
          ([label, v24, vAll]) => `<tr>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(label)}</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${escapeHtml(String(v24))}</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${escapeHtml(String(vAll))}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;padding:8px;border:1px solid #cbd5e1;">Canal</th>
        <th style="text-align:left;padding:8px;border:1px solid #cbd5e1;">Fuente / Medio</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">Sesiones (24h)</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">Sesiones (Acum.)</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">% Interacción</th>
        <th style="text-align:right;padding:8px;border:1px solid #cbd5e1;">Tiempo</th>
      </tr>
    </thead>
    <tbody>
      ${(ga4.channels || [])
        .map((c) => {
          const s24 = channel24Map.get(`${c.channel}||${c.sourceMedium}`) || 0;
          return `<tr>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(c.channel)}</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;"><code>${escapeHtml(c.sourceMedium)}</code></td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${s24}</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${c.sessions}</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${c.engagementRatePct} %</td>
            <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${escapeHtml(c.avgEngagementTime)}</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <p style="font-size:13px;color:#334155;"><strong>Search Console:</strong> Último día: ${escapeHtml(gsc24Label)} · Acumulado: Clics: ${gsc.clicks != null ? gsc.clicks : 'Procesando'} · Impresiones: ${gsc.impressions != null ? gsc.impressions : 'Procesando'} · CTR: ${gsc.ctrPct != null ? `${gsc.ctrPct} %` : 'Procesando'} · Sitemap: ${escapeHtml(gsc.sitemap.status)} (${gsc.sitemap.discoveredUrls} URLs${gsc.indexedPages != null ? `, ${gsc.indexedPages} indexadas` : ''}).</p>
</body>
</html>`;

  return { md, html };
}

function writeGithubOutput(shouldSend, reportDate) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `should_send=${shouldSend ? 'true' : 'false'}\nreport_date=${reportDate}\n`,
    'utf8'
  );
}

async function main() {
  if (!fs.existsSync(HISTORY_PATH)) {
    throw new Error(`No existe ${HISTORY_PATH}`);
  }

  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  const project = history.project || {};
  const entries = Array.isArray(history.entries) ? history.entries.slice() : [];
  const todayMadrid = getMadridDate(0);
  const yesterdayMadrid = getMadridDate(-1);
  const launchDate = process.env.LAUNCH_DATE || project.launchDate || '2026-11-17';

  if (process.env.SKIP_IF_TODAY_EXISTS === 'true' && entries.some((e) => e.date === todayMadrid)) {
    console.log(`REPORTE DEL DÍA ${todayMadrid} YA EXISTE; SE OMITE ENVÍO DUPLICADO.`);
    writeGithubOutput(false, todayMadrid);
    return;
  }

  const propertyId = process.env.GA4_PROPERTY_ID || project.ga4PropertyId || '564800083';
  const siteUrl = process.env.GSC_SITE_URL || project.gscProperty || 'https://politifacil-29n.vercel.app/';

  const creds = loadServiceAccountCredentials();
  const token = await getGoogleAccessToken(creds);

  const [ga4, ga4Last24h, gsc, gscLast24h] = await Promise.all([
    fetchGa4Metrics(propertyId, token, launchDate, todayMadrid),
    fetchGa4Last24h(propertyId, token, yesterdayMadrid, todayMadrid),
    fetchGscMetrics(siteUrl, token, launchDate, todayMadrid, project.expectedSitemapUrls || 40),
    fetchGscLast24h(siteUrl, token, todayMadrid),
  ]);

  const prevEntry =
    entries
      .filter((e) => e.date !== todayMadrid)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .pop() || null;

  const decision = evaluateDailyDecision(ga4, gsc, prevEntry, project, todayMadrid, ga4Last24h);

  const newEntry = {
    date: todayMadrid,
    checkedAt: getMadridIsoNow(),
    dateRangeNote: `24h (${ga4Last24h.windowLabel}) · Acumulado (${launchDate} – ${todayMadrid})`,
    ga4,
    ga4Last24h,
    gsc,
    gscLast24h,
    decision,
  };

  const existingIdx = entries.findIndex((e) => e.date === todayMadrid);
  if (existingIdx >= 0) {
    entries[existingIdx] = newEntry;
  } else {
    entries.push(newEntry);
  }
  entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  history.entries = entries;

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n', 'utf8');

  execFileSync(process.execPath, [DASHBOARD_SCRIPT], { stdio: 'inherit' });

  const { md, html } = buildEmailReports(newEntry, prevEntry, project);
  fs.writeFileSync(EMAIL_MD_PATH, md, 'utf8');
  fs.writeFileSync(EMAIL_HTML_PATH, html, 'utf8');

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n', 'utf8');
  }

  writeGithubOutput(true, todayMadrid);

  console.log('CLOUD SEO/GEO REPORT COMPLETADO:', {
    date: todayMadrid,
    sessionsLast24h: ga4Last24h.sessions,
    sessionsCumulative: ga4.sessions,
    organicSearchSessions: ga4.organicSearchSessions,
    aiReferralSessions: ga4.aiReferralSessions,
    gscStatus: gsc.status,
    decisionStatus: decision.status,
  });
}

main().catch((err) => {
  console.error('ERROR EN REPORTE CLOUD SEO/GEO:', err.message || err);
  process.exit(1);
});
