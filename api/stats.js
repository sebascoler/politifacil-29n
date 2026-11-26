'use strict';

const {
  SEED_COUNT,
  SEED_AVG_SCORE,
  MAX_STORED_RESULTS,
  resolveCountryKey,
  getCountryStoreConfig,
  getFallbackState,
  buildPublicStats,
  sendJson,
  readJsonBody,
  runRedisPipeline,
  sanitizeQuizEntry,
  parseRedisHashArray,
} = require('../lib/stats-store');

async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  const reqUrl = new URL(req.url || '/api/stats', 'http://localhost');

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    });
    return res.end();
  }

  if (method === 'GET') {
    const countryKey = resolveCountryKey(reqUrl.searchParams.get('country'));
    const cfg = getCountryStoreConfig(countryKey);
    const fallback = getFallbackState(countryKey);

    try {
      const results = await runRedisPipeline([
        ['GET', cfg.redisKeys.count],
        ['GET', cfg.redisKeys.scoreSum],
        ['HGETALL', cfg.redisKeys.partyCounts],
      ]);
      if (Array.isArray(results)) {
        const realCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const realSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        const partyCounts = parseRedisHashArray(results[2]?.result, countryKey);
        return sendJson(res, 200, buildPublicStats(realCount, realSum, 'redis', partyCounts, countryKey));
      }
    } catch (err) {
      console.error(`Error leyendo estadísticas (${countryKey}) en Upstash Redis:`, err.message);
    }

    return sendJson(
      res,
      200,
      buildPublicStats(
        fallback.count,
        fallback.scoreSum,
        'seed',
        parseRedisHashArray(fallback.partyCounts, countryKey),
        countryKey
      )
    );
  }

  if (method === 'POST') {
    const body = await readJsonBody(req);
    const countryKey = resolveCountryKey(body?.country || reqUrl.searchParams.get('country'));
    const cfg = getCountryStoreConfig(countryKey);
    const fallback = getFallbackState(countryKey);

    const entry = sanitizeQuizEntry(body, countryKey);
    if (!entry) {
      return sendJson(res, 400, {
        ok: false,
        error: 'El parámetro "score" debe ser un número entre 0 y 100.',
      });
    }

    try {
      const commands = [
        ['INCR', cfg.redisKeys.count],
        ['INCRBY', cfg.redisKeys.scoreSum, entry.score],
      ];
      if (entry.topPartyId) {
        commands.push(['HINCRBY', cfg.redisKeys.partyCounts, entry.topPartyId, 1]);
      }
      commands.push(['LPUSH', cfg.redisKeys.resultsList, JSON.stringify(entry)]);
      commands.push(['LTRIM', cfg.redisKeys.resultsList, 0, MAX_STORED_RESULTS - 1]);
      commands.push(['HGETALL', cfg.redisKeys.partyCounts]);

      const results = await runRedisPipeline(commands);
      if (Array.isArray(results)) {
        const realCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const realSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        const hashResult = results[results.length - 1]?.result;
        const partyCounts = parseRedisHashArray(hashResult, countryKey);
        return sendJson(res, 200, buildPublicStats(realCount, realSum, 'redis', partyCounts, countryKey));
      }
    } catch (err) {
      console.error(`Error actualizando estadísticas (${countryKey}) en Upstash Redis:`, err.message);
    }

    fallback.count += 1;
    fallback.scoreSum += entry.score;
    if (entry.topPartyId) {
      fallback.partyCounts[entry.topPartyId] =
        (fallback.partyCounts[entry.topPartyId] || 0) + 1;
    }
    fallback.results.unshift(entry);
    if (fallback.results.length > MAX_STORED_RESULTS) {
      fallback.results.length = MAX_STORED_RESULTS;
    }

    return sendJson(
      res,
      200,
      buildPublicStats(
        fallback.count,
        fallback.scoreSum,
        'seed',
        parseRedisHashArray(fallback.partyCounts, countryKey),
        countryKey
      )
    );
  }

  return sendJson(res, 405, { ok: false, error: 'Método no permitido' });
}

handler.SEED_COUNT = SEED_COUNT;
handler.SEED_AVG_SCORE = SEED_AVG_SCORE;

module.exports = handler;
