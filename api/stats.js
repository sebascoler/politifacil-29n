'use strict';

const {
  SEED_COUNT,
  SEED_AVG_SCORE,
  MAX_STORED_RESULTS,
  REDIS_KEYS,
  fallbackState,
  buildPublicStats,
  sendJson,
  readJsonBody,
  runRedisPipeline,
  sanitizeQuizEntry,
} = require('../lib/stats-store');

async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

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
    try {
      const results = await runRedisPipeline([
        ['GET', REDIS_KEYS.count],
        ['GET', REDIS_KEYS.scoreSum],
      ]);
      if (Array.isArray(results)) {
        const realCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const realSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        return sendJson(res, 200, buildPublicStats(realCount, realSum, 'redis'));
      }
    } catch (err) {
      console.error('Error leyendo estadísticas en Upstash Redis:', err.message);
    }

    return sendJson(
      res,
      200,
      buildPublicStats(fallbackState.count, fallbackState.scoreSum, 'seed')
    );
  }

  if (method === 'POST') {
    const body = await readJsonBody(req);
    const entry = sanitizeQuizEntry(body);
    if (!entry) {
      return sendJson(res, 400, {
        ok: false,
        error: 'El parámetro "score" debe ser un número entre 0 y 100.',
      });
    }

    try {
      const commands = [
        ['INCR', REDIS_KEYS.count],
        ['INCRBY', REDIS_KEYS.scoreSum, entry.score],
      ];
      if (entry.topPartyId) {
        commands.push(['HINCRBY', REDIS_KEYS.partyCounts, entry.topPartyId, 1]);
      }
      commands.push(['LPUSH', REDIS_KEYS.resultsList, JSON.stringify(entry)]);
      commands.push(['LTRIM', REDIS_KEYS.resultsList, 0, MAX_STORED_RESULTS - 1]);

      const results = await runRedisPipeline(commands);
      if (Array.isArray(results)) {
        const realCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const realSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        return sendJson(res, 200, buildPublicStats(realCount, realSum, 'redis'));
      }
    } catch (err) {
      console.error('Error actualizando estadísticas en Upstash Redis:', err.message);
    }

    fallbackState.count += 1;
    fallbackState.scoreSum += entry.score;
    if (entry.topPartyId) {
      fallbackState.partyCounts[entry.topPartyId] =
        (fallbackState.partyCounts[entry.topPartyId] || 0) + 1;
    }
    fallbackState.results.unshift(entry);
    if (fallbackState.results.length > MAX_STORED_RESULTS) {
      fallbackState.results.length = MAX_STORED_RESULTS;
    }

    return sendJson(
      res,
      200,
      buildPublicStats(fallbackState.count, fallbackState.scoreSum, 'seed')
    );
  }

  return sendJson(res, 405, { ok: false, error: 'Método no permitido' });
}

handler.SEED_COUNT = SEED_COUNT;
handler.SEED_AVG_SCORE = SEED_AVG_SCORE;

module.exports = handler;
