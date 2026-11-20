'use strict';

const crypto = require('crypto');
const {
  SEED_COUNT,
  SEED_AVG_SCORE,
  REDIS_KEYS,
  ALLOWED_PARTY_IDS,
  fallbackState,
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

function buildCsvDocument(results) {
  const headers = [
    'timestamp',
    'score',
    'zoneLabel',
    'topPartyId',
    'topAffinity',
    'secondPartyId',
    'secondAffinity',
    ...ALLOWED_PARTY_IDS,
    'answers',
  ];

  const rows = results.map((entry) => {
    const affinities = entry.affinities || {};
    const cells = [
      entry.timestamp || '',
      entry.score ?? '',
      entry.zoneLabel || '',
      entry.topPartyId || '',
      entry.topAffinity ?? '',
      entry.secondPartyId || '',
      entry.secondAffinity ?? '',
      ...ALLOWED_PARTY_IDS.map((pid) => affinities[pid] ?? ''),
      formatAnswersCompact(entry.answers),
    ];
    return cells.map(escapeCsvCell).join(',');
  });

  return `\uFEFF${headers.join(',')}\n${rows.join('\n')}\n`;
}

function buildPartyRanking(partyCounts) {
  const totalWinners = ALLOWED_PARTY_IDS.reduce(
    (acc, pid) => acc + (Number(partyCounts[pid]) || 0),
    0
  );

  return ALLOWED_PARTY_IDS.map((pid) => {
    const count = Number(partyCounts[pid]) || 0;
    const pct = totalWinners > 0 ? Number(((count / totalWinners) * 100).toFixed(1)) : 0;
    return { partyId: pid, count, pct };
  }).sort((a, b) => b.count - a.count);
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

  const rawLimit = parseInt(reqUrl.searchParams.get('limit') || '200', 10);
  const limit = Number.isNaN(rawLimit) ? 200 : Math.max(1, Math.min(2000, rawLimit));
  const format = (reqUrl.searchParams.get('format') || 'json').trim().toLowerCase();

  let source = 'seed';
  let realParticipants = fallbackState.count;
  let realSum = fallbackState.scoreSum;
  let partyCounts = parseRedisHashArray(fallbackState.partyCounts);
  let storedResultsCount = fallbackState.results.length;
  let results = fallbackState.results.slice(0, limit);

  try {
    const pipelineRes = await runRedisPipeline([
      ['GET', REDIS_KEYS.count],
      ['GET', REDIS_KEYS.scoreSum],
      ['HGETALL', REDIS_KEYS.partyCounts],
      ['LLEN', REDIS_KEYS.resultsList],
      ['LRANGE', REDIS_KEYS.resultsList, 0, limit - 1],
    ]);

    if (Array.isArray(pipelineRes)) {
      source = 'redis';
      realParticipants = Math.max(0, parseInt(pipelineRes[0]?.result ?? '0', 10) || 0);
      realSum = Math.max(0, parseInt(pipelineRes[1]?.result ?? '0', 10) || 0);
      partyCounts = parseRedisHashArray(pipelineRes[2]?.result);
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
    console.error('Error leyendo listado de resultados en Upstash Redis:', err.message);
  }

  if (format === 'csv') {
    const csvBody = buildCsvDocument(results);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="politifacil-29n-resultados.csv"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    return res.end(csvBody);
  }

  const isRealAverage = realParticipants > 0;
  const realAverageScore = isRealAverage
    ? Number((realSum / realParticipants).toFixed(1))
    : SEED_AVG_SCORE;

  return sendJson(res, 200, {
    ok: true,
    source,
    summary: {
      realParticipants,
      displayParticipants: SEED_COUNT + realParticipants,
      realAverageScore,
      isRealAverage,
      storedResultsCount,
      partyCounts,
      partyRanking: buildPartyRanking(partyCounts),
    },
    returnedCount: results.length,
    results,
  });
}

module.exports = handler;
