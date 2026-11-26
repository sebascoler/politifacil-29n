const http = require('http');
const fs = require('fs');
const path = require('path');
const statsHandler = require('./api/stats');
const resultsHandler = require('./api/results');
const { getCountryConfig, getActiveCountries } = require('./config/portal');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const CALENDAR_DATA_PATH = path.join(PUBLIC_DIR, 'data', 'calendarData.js');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function resolveCountryDataPath(countryId) {
  const cfg = getCountryConfig(String(countryId || 'es').toLowerCase());
  if (cfg && cfg.dataFile) {
    return path.join(__dirname, cfg.dataFile);
  }
  return path.join(PUBLIC_DIR, 'data', 'electionData.js');
}

function loadElectionData(countryId = 'es') {
  const dataPath = resolveCountryDataPath(countryId);
  if (!fs.existsSync(dataPath)) {
    return null;
  }
  try {
    delete require.cache[require.resolve(dataPath)];
    return require(dataPath);
  } catch (err) {
    console.error(`Error cargando datos electorales (${countryId}):`, err.message);
    return null;
  }
}

function loadCalendarData() {
  if (!fs.existsSync(CALENDAR_DATA_PATH)) {
    return null;
  }
  try {
    delete require.cache[require.resolve(CALENDAR_DATA_PATH)];
    return require(CALENDAR_DATA_PATH);
  } catch (err) {
    console.error('Error cargando calendarData.js:', err.message);
    return null;
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function handleApi(req, res, pathname, searchParams) {
  if (pathname === '/api/stats') {
    return statsHandler(req, res);
  }
  if (pathname === '/api/results') {
    return resultsHandler(req, res);
  }

  if (pathname === '/api/calendar') {
    const calendar = loadCalendarData();
    if (!calendar) {
      return sendJson(res, 503, { error: 'Calendario electoral no disponible aún.' });
    }
    const region = searchParams.get('region');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    let events = calendar.events || [];
    if (region && region !== 'all') {
      events = events.filter((e) => e.region === region);
    }
    if (year && year !== 'all') {
      events = events.filter((e) => String(e.year) === String(year));
    }
    if (type && type !== 'all') {
      events = events.filter((e) => e.type === type);
    }
    return sendJson(res, 200, {
      meta: calendar.meta,
      total: events.length,
      events,
    });
  }

  const countryParam = (searchParams.get('country') || 'es').toLowerCase();

  if (pathname === '/api/health') {
    const active = getActiveCountries().map((c) => {
      const d = loadElectionData(c.id);
      return {
        country: c.id,
        electionDate: d?.meta?.electionDate || c.electionDate,
        partiesCount: Array.isArray(d?.parties) ? d.parties.length : 0,
        interviewsCount: Array.isArray(d?.interviews) ? d.interviews.length : 0,
        quizQuestionsCount: Array.isArray(d?.quizQuestions) ? d.quizQuestions.length : 0,
      };
    });
    const calendar = loadCalendarData();
    const esData = loadElectionData('es');
    return sendJson(res, 200, {
      status: 'ok',
      electionDate: esData?.meta?.electionDate || '2026-11-29',
      partiesCount: Array.isArray(esData?.parties) ? esData.parties.length : 0,
      interviewsCount: Array.isArray(esData?.interviews) ? esData.interviews.length : 0,
      quizQuestionsCount: Array.isArray(esData?.quizQuestions) ? esData.quizQuestions.length : 0,
      activeCountries: active,
      calendarEventsCount: Array.isArray(calendar?.events) ? calendar.events.length : 0,
    });
  }

  const data = loadElectionData(countryParam);
  if (!data) {
    return sendJson(res, 503, { error: 'Base de datos electoral no disponible aún.' });
  }

  if (pathname === '/api/election-data') {
    return sendJson(res, 200, data);
  }

  if (pathname === '/api/parties') {
    const id = searchParams.get('id');
    if (id) {
      const found = data.parties.find((p) => p.id === id);
      return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'Partido no encontrado' });
    }
    return sendJson(res, 200, {
      country: countryParam,
      parties: data.parties,
      territorialParties: data.territorialParties || [],
    });
  }

  if (pathname === '/api/proposals') {
    const axis = searchParams.get('axis');
    const partyId = searchParams.get('party');
    let parties = data.parties || [];
    if (partyId) {
      parties = parties.filter((p) => p.id === partyId);
    }
    const result = parties.map((p) => ({
      id: p.id,
      shortName: p.shortName,
      proposals: axis && p.proposals?.[axis] ? { [axis]: p.proposals[axis] } : p.proposals,
    }));
    return sendJson(res, 200, {
      country: countryParam,
      axes: axis ? (data.axes || []).filter((a) => a.id === axis) : data.axes || [],
      axisComparisons: axis && data.axisComparisons?.[axis] ? { [axis]: data.axisComparisons[axis] } : data.axisComparisons || {},
      parties: result,
    });
  }

  if (pathname === '/api/interviews') {
    const party = searchParams.get('party');
    const format = searchParams.get('format');
    const topic = searchParams.get('topic');
    let list = data.interviews || [];
    if (party && party !== 'all') {
      list = list.filter((item) => item.partyId === party);
    }
    if (format && format !== 'all') {
      list = list.filter((item) => item.formatType === format);
    }
    if (topic && topic !== 'all') {
      list = list.filter((item) => item.topic === topic);
    }
    return sendJson(res, 200, { country: countryParam, total: list.length, interviews: list });
  }

  if (pathname === '/api/quiz') {
    return sendJson(res, 200, {
      country: countryParam,
      total: (data.quizQuestions || []).length,
      questions: data.quizQuestions || [],
    });
  }

  return sendJson(res, 404, { error: 'Endpoint no encontrado' });
}

function isInsidePublicDir(targetPath) {
  return targetPath === PUBLIC_DIR || targetPath.startsWith(PUBLIC_DIR + path.sep);
}

function resolveStaticFile(filePath, relativePath = '') {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  const trimmedPath = filePath.length > PUBLIC_DIR.length && filePath.endsWith(path.sep)
    ? filePath.slice(0, -1)
    : filePath;

  if (!path.extname(trimmedPath)) {
    const htmlCandidate = `${trimmedPath}.html`;
    if (isInsidePublicDir(htmlCandidate) && fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
      return htmlCandidate;
    }

    const indexCandidate = path.join(trimmedPath, 'index.html');
    if (isInsidePublicDir(indexCandidate) && fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate;
    }

    const seg = relativePath.split('/').filter(Boolean)[0];
    if (seg === 'ar' || seg === 'es') {
      const countryIndex = path.join(PUBLIC_DIR, seg, 'index.html');
      if (fs.existsSync(countryIndex)) {
        return countryIndex;
      }
    }

    return path.join(PUBLIC_DIR, 'index.html');
  }

  return null;
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  try {
    relativePath = decodeURIComponent(relativePath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Ruta inválida');
  }

  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = path.join(PUBLIC_DIR, safePath);

  if (!isInsidePublicDir(requestedPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acceso denegado');
  }

  const filePath = resolveStaticFile(requestedPath, relativePath);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Archivo no encontrado');
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  const contentType = (baseName === 'llms.txt' || baseName === 'llms-full.txt')
    ? 'text/markdown; charset=utf-8'
    : (MIME_TYPES[ext] || 'application/octet-stream');

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Error interno del servidor');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url.pathname, url.searchParams);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`PolitiFácil corriendo en http://${HOST}:${PORT}`);
});
