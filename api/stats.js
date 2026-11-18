'use strict';

const https = require('https');

const SEED_COUNT = 21224;
const SEED_AVG_SCORE = 48.4;
const SEED_SCORE_SUM = Math.round(SEED_COUNT * SEED_AVG_SCORE); // 1027242

const REDIS_KEYS = {
  count: 'pf29n:quiz_count',
  scoreSum: 'pf29n:quiz_score_sum',
  partyCounts: 'pf29n:party_counts',
};

const ALLOWED_PARTY_IDS = new Set([
  'podemos',
  'frente-amplio',
  'psoe',
  'pp',
  'vox',
  'salf',
]);

// Respaldo en memoria cuando aún no está configurado Upstash Redis (útil en desarrollo local)
let fallbackExtraCount = 0;
let fallbackExtraSum = 0;

function getRedisConfig() {
  const url = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  const token = (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ''
  ).trim();

  return { url, token };
}

function buildStatsPayload(extraCount, extraSum, source) {
  const safeExtraCount = Math.max(0, Number(extraCount) || 0);
  const safeExtraSum = Math.max(0, Number(extraSum) || 0);
  const totalParticipants = SEED_COUNT + safeExtraCount;
  const averageScore = Number(
    ((SEED_SCORE_SUM + safeExtraSum) / totalParticipants).toFixed(1)
  );

  return {
    ok: true,
    source,
    totalParticipants,
    averageScore,
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === 'string') {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const finish = (obj) => {
      if (!settled) {
        settled = true;
        resolve(obj);
      }
    };

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes <= 8192) {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        return finish({});
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        finish(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        finish({});
      }
    });

    req.on('error', () => finish({}));
  });
}

function postRedisWithHttps(endpointUrl, token, bodyString) {
  return new Promise((resolve, reject) => {
    const target = new URL(endpointUrl);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(bodyString, 'utf8'),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
            return reject(new Error(`Upstash HTTP ${res.statusCode}: ${raw}`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Tiempo de espera agotado conectando con Upstash Redis'));
    });
    req.write(bodyString);
    req.end();
  });
}

async function runRedisPipeline(commands) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return null;
  }

  const endpoint = `${url}/pipeline`;
  const bodyString = JSON.stringify(commands);

  if (typeof fetch === 'function') {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: bodyString,
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) {
        throw new Error(`Upstash HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return postRedisWithHttps(endpoint, token, bodyString);
}

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
        const extraCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const extraSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        return sendJson(res, 200, buildStatsPayload(extraCount, extraSum, 'redis'));
      }
    } catch (err) {
      console.error('Error leyendo estadísticas en Upstash Redis:', err.message);
    }

    return sendJson(
      res,
      200,
      buildStatsPayload(fallbackExtraCount, fallbackExtraSum, 'seed')
    );
  }

  if (method === 'POST') {
    const body = await readJsonBody(req);
    const rawScore = Number(body.score);
    if (Number.isNaN(rawScore) || rawScore < 0 || rawScore > 100) {
      return sendJson(res, 400, {
        ok: false,
        error: 'El parámetro "score" debe ser un número entre 0 y 100.',
      });
    }

    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const rawParty = typeof body.topPartyId === 'string' ? body.topPartyId.trim() : '';
    const safePartyId = ALLOWED_PARTY_IDS.has(rawParty) ? rawParty : '';

    try {
      const commands = [
        ['INCR', REDIS_KEYS.count],
        ['INCRBY', REDIS_KEYS.scoreSum, clampedScore],
      ];
      if (safePartyId) {
        commands.push(['HINCRBY', REDIS_KEYS.partyCounts, safePartyId, 1]);
      }

      const results = await runRedisPipeline(commands);
      if (Array.isArray(results)) {
        const extraCount = Math.max(0, parseInt(results[0]?.result ?? '0', 10) || 0);
        const extraSum = Math.max(0, parseInt(results[1]?.result ?? '0', 10) || 0);
        return sendJson(res, 200, buildStatsPayload(extraCount, extraSum, 'redis'));
      }
    } catch (err) {
      console.error('Error actualizando estadísticas en Upstash Redis:', err.message);
    }

    fallbackExtraCount += 1;
    fallbackExtraSum += clampedScore;
    return sendJson(
      res,
      200,
      buildStatsPayload(fallbackExtraCount, fallbackExtraSum, 'seed')
    );
  }

  return sendJson(res, 405, { ok: false, error: 'Método no permitido' });
}

handler.SEED_COUNT = SEED_COUNT;
handler.SEED_AVG_SCORE = SEED_AVG_SCORE;
handler.SEED_SCORE_SUM = SEED_SCORE_SUM;

module.exports = handler;
