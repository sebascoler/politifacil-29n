const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_PATH = path.join(PUBLIC_DIR, 'data', 'electionData.js');

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

function loadElectionData() {
  if (!fs.existsSync(DATA_PATH)) {
    return null;
  }
  try {
    delete require.cache[require.resolve(DATA_PATH)];
    return require(DATA_PATH);
  } catch (err) {
    console.error('Error cargando electionData.js:', err.message);
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
  const data = loadElectionData();
  if (!data) {
    return sendJson(res, 503, { error: 'Base de datos electoral no disponible aún.' });
  }

  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      electionDate: data.meta?.electionDate || '2026-11-29',
      partiesCount: Array.isArray(data.parties) ? data.parties.length : 0,
      interviewsCount: Array.isArray(data.interviews) ? data.interviews.length : 0,
      quizQuestionsCount: Array.isArray(data.quizQuestions) ? data.quizQuestions.length : 0,
    });
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
    return sendJson(res, 200, { total: list.length, interviews: list });
  }

  if (pathname === '/api/quiz') {
    return sendJson(res, 200, {
      total: (data.quizQuestions || []).length,
      questions: data.quizQuestions || [],
    });
  }

  return sendJson(res, 404, { error: 'Endpoint no encontrado' });
}

function isInsidePublicDir(targetPath) {
  return targetPath === PUBLIC_DIR || targetPath.startsWith(PUBLIC_DIR + path.sep);
}

function resolveStaticFile(filePath) {
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

  const filePath = resolveStaticFile(requestedPath);
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
  console.log(`PolitiFácil 29-N corriendo en http://${HOST}:${PORT}`);
});
