'use strict';

const crypto = require('crypto');
const {
  resolveCountryKey,
  getCountryStoreConfig,
  getFallbackState,
  buildPartyRanking,
  sendJson,
  runRedisPipeline,
  parseRedisHashArray,
} = require('../lib/stats-store');

function sha256(str) {
  return crypto.createHash('sha256').update(String(str), 'utf8').digest();
}

function timingSafeMatch(provided, expected) {
  if (!provided || !expected) return false;
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}

function extractRequestToken(req, searchParams) {
  const authHeader = String(req.headers?.authorization || '');
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerToken = req.headers?.['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  const queryToken = searchParams.get('token');
  return typeof queryToken === 'string' ? queryToken.trim() : '';
}

function escapeCsvCell(value) {
  const raw = value == null ? '' : String(value);
  // Evitar inyección de fórmulas en Excel/Sheets sin alterar timestamps ni números
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatAnswersCompact(answers) {
  if (!answers || typeof answers !== 'object') return '';
  return Object.keys(answers)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .map((qid) => {
      const item = answers[qid];
      if (!item || typeof item.optionIndex !== 'number') return '';
      return `${qid}:${item.optionIndex}${item.priority ? '*' : ''}`;
    })
    .filter(Boolean)
    .join(';');
}

function buildCsvDocument(results, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const headers = [
    'timestamp',
    'country',
    'score',
    'zoneLabel',
    'topPartyId',
    'topAffinity',
    'secondPartyId',
    'secondAffinity',
    ...cfg.allowedPartyIds,
    'answers',
  ];

  const rows = results.map((entry) => {
    const affinities = entry.affinities || {};
    const cells = [
      entry.timestamp || '',
      entry.country || cfg.country,
      entry.score ?? '',
      entry.zoneLabel || '',
      entry.topPartyId || '',
      entry.topAffinity ?? '',
      entry.secondPartyId || '',
      entry.secondAffinity ?? '',
      ...cfg.allowedPartyIds.map((pid) => affinities[pid] ?? ''),
      formatAnswersCompact(entry.answers),
    ];
    return cells.map(escapeCsvCell).join(',');
  });

  return `\uFEFF${headers.join(',')}\n${rows.join('\n')}\n`;
}

async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Cache-Control': 'no-store',
    });
    return res.end();
  }

  if (method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Método no permitido' });
  }

  const expectedToken = (process.env.STATS_ADMIN_TOKEN || '').trim();
  if (!expectedToken) {
    return sendJson(res, 503, {
      ok: false,
      error: 'Falta configurar la variable de entorno STATS_ADMIN_TOKEN en Vercel.',
    });
  }

  const reqUrl = new URL(req.url || '/api/results', 'http://localhost');
  const providedToken = extractRequestToken(req, reqUrl.searchParams);
  if (!timingSafeMatch(providedToken, expectedToken)) {
    return sendJson(res, 401, {
      ok: false,
      error: 'No autorizado. Indica un token válido mediante Authorization: Bearer, X-Admin-Token o ?token=...',
    });
  }

  const countryKey = resolveCountryKey(reqUrl.searchParams.get('country'));
  const cfg = getCountryStoreConfig(countryKey);
  const fallback = getFallbackState(countryKey);

  const rawLimit = parseInt(reqUrl.searchParams.get('limit') || '200', 10);
  const limit = Number.isNaN(rawLimit) ? 200 : Math.max(1, Math.min(2000, rawLimit));
  const format = (reqUrl.searchParams.get('format') || 'json').trim().toLowerCase();

  let source = 'seed';
  let realParticipants = fallback.count;
  let realSum = fallback.scoreSum;
  let partyCounts = parseRedisHashArray(fallback.partyCounts, countryKey);
  let storedResultsCount = fallback.results.length;
  let results = fallback.results.slice(0, limit);

  try {
    const pipelineRes = await runRedisPipeline([
      ['GET', cfg.redisKeys.count],
      ['GET', cfg.redisKeys.scoreSum],
      ['HGETALL', cfg.redisKeys.partyCounts],
      ['LLEN', cfg.redisKeys.resultsList],
      ['LRANGE', cfg.redisKeys.resultsList, 0, limit - 1],
    ]);

    if (Array.isArray(pipelineRes)) {
      source = 'redis';
      realParticipants = Math.max(0, parseInt(pipelineRes[0]?.result ?? '0', 10) || 0);
      realSum = Math.max(0, parseInt(pipelineRes[1]?.result ?? '0', 10) || 0);
      partyCounts = parseRedisHashArray(pipelineRes[2]?.result, countryKey);
      storedResultsCount = Math.max(0, parseInt(pipelineRes[3]?.result ?? '0', 10) || 0);

      const rawItems = Array.isArray(pipelineRes[4]?.result) ? pipelineRes[4].result : [];
      results = rawItems
        .map((item) => {
          if (item && typeof item === 'object') return item;
          try {
            return JSON.parse(String(item));
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.error(`Error leyendo listado de resultados (${countryKey}) en Upstash Redis:`, err.message);
  }

  if (format === 'csv') {
    const csvBody = buildCsvDocument(results, countryKey);
    const filename = countryKey === 'es'
      ? 'politifacil-29n-resultados.csv'
      : `politifacil-${countryKey}-resultados.csv`;
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    return res.end(csvBody);
  }

  const isRealAverage = realParticipants > 0;
  const realAverageScore = isRealAverage
    ? Number((realSum / realParticipants).toFixed(1))
    : cfg.seedAvgScore;

  return sendJson(res, 200, {
    ok: true,
    country: countryKey,
    source,
    summary: {
      realParticipants,
      displayParticipants: cfg.seedCount + realParticipants,
      realAverageScore,
      isRealAverage,
      storedResultsCount,
      partyCounts,
      partyRanking: buildPartyRanking(partyCounts, countryKey).partyRanking,
    },
    returnedCount: results.length,
    results,
  });
}

module.exports = handler;
