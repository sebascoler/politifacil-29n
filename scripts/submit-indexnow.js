'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const INDEXNOW_KEY = 'politifacil29nindexnow2026';
const KEY_FILE_PATH = path.join(PUBLIC_DIR, `${INDEXNOW_KEY}.txt`);
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function decodeXmlEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractUrlsFromSitemap(xmlContent) {
  const urls = [];
  const regex = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let match;
  while ((match = regex.exec(xmlContent)) !== null) {
    urls.push(decodeXmlEntities(match[1].trim()));
  }
  return urls;
}

function postJsonWithHttps(urlString, payloadString) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlString);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payloadString, 'utf8'),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Tiempo de espera agotado al conectar con IndexNow'));
    });
    req.write(payloadString);
    req.end();
  });
}

async function submitPayload(payload) {
  const payloadString = JSON.stringify(payload, null, 2);

  if (typeof fetch === 'function') {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: payloadString,
    });
    const body = await res.text();
    return { status: res.status, body };
  }

  return postJsonWithHttps(INDEXNOW_ENDPOINT, payloadString);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`ERROR: No existe ${SITEMAP_PATH}. Ejecuta primero "npm run build".`);
    process.exit(1);
  }

  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error(`ERROR: Falta el archivo de verificación IndexNow en ${KEY_FILE_PATH}.`);
    process.exit(1);
  }

  const keyFileContent = fs.readFileSync(KEY_FILE_PATH, 'utf8').trim();
  if (keyFileContent !== INDEXNOW_KEY) {
    console.error('ERROR: El contenido del archivo IndexNow no coincide con la clave esperada.');
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urlList = extractUrlsFromSitemap(sitemapXml);

  if (urlList.length === 0) {
    console.error('ERROR: No se encontraron etiquetas <loc> en public/sitemap.xml.');
    process.exit(1);
  }

  const firstParsed = new URL(urlList[0]);
  const rawOverride =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');
  const origin = rawOverride ? rawOverride.replace(/\/$/, '') : firstParsed.origin;
  const host = new URL(origin).host;

  const normalizedUrlList =
    origin !== firstParsed.origin
      ? urlList.map((u) => {
          const parsed = new URL(u);
          return `${origin}${parsed.pathname}${parsed.search}`;
        })
      : urlList;

  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList: normalizedUrlList,
  };

  if (isDryRun) {
    console.log(`INDEXNOW DRY-RUN (${normalizedUrlList.length} URLs -> ${INDEXNOW_ENDPOINT}):`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    const result = await submitPayload(payload);
    console.log(`IndexNow respuesta HTTP ${result.status}:`, result.body || '(sin cuerpo)');
    if (result.status !== 200 && result.status !== 202) {
      console.error(`ERROR: IndexNow devolvió estado HTTP inesperado (${result.status}).`);
      process.exit(1);
    }
    console.log(`IndexNow completado con éxito: ${normalizedUrlList.length} URLs enviadas.`);
  } catch (err) {
    console.error('ERROR al enviar URLs a IndexNow:', err.message);
    process.exit(1);
  }
}

main();
