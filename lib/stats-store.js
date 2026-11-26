'use strict';

const https = require('https');

const MAX_STORED_RESULTS = 5000;

const COUNTRY_CONFIGS = {
  es: {
    country: 'es',
    seedCount: 21224,
    seedAvgScore: 48.4,
    redisKeys: {
      count: 'pf29n:quiz_count',
      scoreSum: 'pf29n:quiz_score_sum',
      partyCounts: 'pf29n:party_counts',
      resultsList: 'pf29n:quiz_results',
    },
    allowedPartyIds: [
      'podemos',
      'frente-amplio',
      'psoe',
      'pp',
      'vox',
      'salf',
    ],
  },
  ar: {
    country: 'ar',
    seedCount: 0,
    seedAvgScore: 50.0,
    redisKeys: {
      count: 'pf:ar:quiz_count',
      scoreSum: 'pf:ar:quiz_score_sum',
      partyCounts: 'pf:ar:party_counts',
      resultsList: 'pf:ar:quiz_results',
    },
    allowedPartyIds: [
      'fit-u',
      'fuerza-patria',
      'ucr',
      'provincias-unidas',
      'pro',
      'lla',
    ],
  },
};

function resolveCountryKey(raw) {
  const token = String(raw || '').trim().toLowerCase();
  if (token && Object.prototype.hasOwnProperty.call(COUNTRY_CONFIGS, token)) {
    return token;
  }
  return 'es';
}

function getCountryStoreConfig(raw) {
  return COUNTRY_CONFIGS[resolveCountryKey(raw)];
}

// Compatibilidad con constantes previas de España 29-N
const SEED_COUNT = COUNTRY_CONFIGS.es.seedCount;
const SEED_AVG_SCORE = COUNTRY_CONFIGS.es.seedAvgScore;
const REDIS_KEYS = COUNTRY_CONFIGS.es.redisKeys;
const ALLOWED_PARTY_IDS = COUNTRY_CONFIGS.es.allowedPartyIds;

// Respaldo en memoria separado por país para desarrollo local sin Redis configurado
const fallbackStateByCountry = {
  es: { count: 0, scoreSum: 0, partyCounts: {}, results: [] },
  ar: { count: 0, scoreSum: 0, partyCounts: {}, results: [] },
};
const fallbackState = fallbackStateByCountry.es;

function getFallbackState(countryKey = 'es') {
  return fallbackStateByCountry[resolveCountryKey(countryKey)];
}

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

function buildPartyRanking(partyCounts, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const safeCounts = partyCounts && typeof partyCounts === 'object' ? partyCounts : {};
  const totalPartyVotes = cfg.allowedPartyIds.reduce(
    (acc, pid) => acc + Math.max(0, Number(safeCounts[pid]) || 0),
    0
  );

  const partyRanking = cfg.allowedPartyIds
    .map((pid) => {
      const count = Math.max(0, Number(safeCounts[pid]) || 0);
      const pct = totalPartyVotes > 0 ? Number(((count / totalPartyVotes) * 100).toFixed(1)) : 0;
      return { partyId: pid, count, pct };
    })
    .sort((a, b) => b.count - a.count);

  return { partyRanking, totalPartyVotes };
}

function buildPublicStats(realCount, realSum, source, partyCounts = null, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const safeRealCount = Math.max(0, Math.round(Number(realCount) || 0));
  const safeRealSum = Math.max(0, Number(realSum) || 0);
  const totalParticipants = cfg.seedCount + safeRealCount;
  const isRealAverage = safeRealCount > 0;
  const averageScore = isRealAverage
    ? Number((safeRealSum / safeRealCount).toFixed(1))
    : cfg.seedAvgScore;

  const payload = {
    ok: true,
    country: cfg.country,
    source,
    totalParticipants,
    realParticipants: safeRealCount,
    averageScore,
    isRealAverage,
  };

  if (partyCounts && typeof partyCounts === 'object') {
    const { partyRanking, totalPartyVotes } = buildPartyRanking(partyCounts, cfg.country);
    payload.totalPartyVotes = totalPartyVotes;
    payload.partyRanking = partyRanking;
  }

  return payload;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    ...extraHeaders,
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
      if (totalBytes <= 16384) {
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

function clampInt(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function sanitizePartyId(raw, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const val = typeof raw === 'string' ? raw.trim() : '';
  return cfg.allowedPartyIds.includes(val) ? val : '';
}

function sanitizeQuizEntry(body, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const score = clampInt(body?.score, 0, 100);
  if (score === null) {
    return null;
  }

  const zoneLabel =
    typeof body?.zoneLabel === 'string'
      ? body.zoneLabel.trim().slice(0, 80)
      : '';

  const topPartyId = sanitizePartyId(body?.topPartyId, cfg.country);
  const topAffinity = clampInt(body?.topAffinity, 0, 100);
  const secondPartyId = sanitizePartyId(body?.secondPartyId, cfg.country);
  const secondAffinity = clampInt(body?.secondAffinity, 0, 100);

  const affinities = {};
  if (body?.affinities && typeof body.affinities === 'object') {
    cfg.allowedPartyIds.forEach((pid) => {
      const val = clampInt(body.affinities[pid], 0, 100);
      if (val !== null) {
        affinities[pid] = val;
      }
    });
  }

  const answers = {};
  if (body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
    for (let i = 1; i <= 10; i += 1) {
      const qid = `q${i}`;
      const ans = body.answers[qid];
      if (ans && typeof ans === 'object') {
        const optionIndex = clampInt(ans.optionIndex, 0, 4);
        if (optionIndex !== null) {
          answers[qid] = {
            optionIndex,
            priority: Boolean(ans.priority),
          };
        }
      }
    }
  }

  const entry = {
    timestamp: new Date().toISOString(),
    country: cfg.country,
    score,
  };

  if (zoneLabel) entry.zoneLabel = zoneLabel;
  if (topPartyId) entry.topPartyId = topPartyId;
  if (topAffinity !== null) entry.topAffinity = topAffinity;
  if (secondPartyId) entry.secondPartyId = secondPartyId;
  if (secondAffinity !== null) entry.secondAffinity = secondAffinity;
  if (Object.keys(affinities).length > 0) entry.affinities = affinities;
  if (Object.keys(answers).length > 0) entry.answers = answers;

  return entry;
}

function parseRedisHashArray(rawResult, countryKey = 'es') {
  const cfg = getCountryStoreConfig(countryKey);
  const allowedSet = new Set(cfg.allowedPartyIds);
  const counts = {};
  cfg.allowedPartyIds.forEach((pid) => {
    counts[pid] = 0;
  });

  if (Array.isArray(rawResult)) {
    for (let i = 0; i + 1 < rawResult.length; i += 2) {
      const key = String(rawResult[i] || '').trim();
      const val = Math.max(0, parseInt(rawResult[i + 1] ?? '0', 10) || 0);
      if (allowedSet.has(key)) {
        counts[key] = val;
      }
    }
  } else if (rawResult && typeof rawResult === 'object') {
    Object.entries(rawResult).forEach(([key, val]) => {
      if (allowedSet.has(key)) {
        counts[key] = Math.max(0, parseInt(val ?? '0', 10) || 0);
      }
    });
  }

  return counts;
}

module.exports = {
  SEED_COUNT,
  SEED_AVG_SCORE,
  MAX_STORED_RESULTS,
  REDIS_KEYS,
  ALLOWED_PARTY_IDS,
  COUNTRY_CONFIGS,
  fallbackState,
  fallbackStateByCountry,
  resolveCountryKey,
  getCountryStoreConfig,
  getFallbackState,
  getRedisConfig,
  buildPublicStats,
  buildPartyRanking,
  sendJson,
  readJsonBody,
  runRedisPipeline,
  sanitizeQuizEntry,
  parseRedisHashArray,
};
