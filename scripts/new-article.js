'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const VALID_TEMPLATES = new Set(['guia-voto', 'comparativa-eje', 'explicador-calendario']);

function parseArgs(argv) {
  const args = {};
  argv.forEach((raw) => {
    const clean = raw.replace(/^--/, '');
    const eqIdx = clean.indexOf('=');
    if (eqIdx === -1) {
      args[clean] = 'true';
    } else {
      args[clean.slice(0, eqIdx)] = clean.slice(eqIdx + 1);
    }
  });
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const template = args.template || 'guia-voto';
  const country = (args.country || 'es').toLowerCase();
  const slug = (args.slug || '').trim();
  const title = (args.title || 'Nuevo Artículo PolitiFácil').trim();

  if (!VALID_TEMPLATES.has(template)) {
    console.error(`Plantilla inválida: "${template}". Usa una de: ${Array.from(VALID_TEMPLATES).join(', ')}`);
    process.exit(1);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error(
      'Uso: npm run article:new -- --template=guia-voto --country=es --slug=mi-articulo-slug --title="Título del artículo"'
    );
    process.exit(1);
  }

  const templatePath = path.join(ROOT_DIR, 'content', 'articulos', '_templates', `${template}.md`);
  const outPath = path.join(ROOT_DIR, 'content', 'articulos', country, `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Ya existe un artículo en ${outPath}. Usa otro --slug.`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const raw = fs.readFileSync(templatePath, 'utf8');
  const rendered = raw
    .replace(/__SLUG__/g, slug)
    .replace(/__COUNTRY__/g, country)
    .replace(/__TITLE__/g, title.replace(/"/g, "'"))
    .replace(/__DATE__/g, today);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered, 'utf8');

  console.log('Artículo creado:', outPath);
  console.log('Siguiente paso: edita el contenido con fuentes oficiales y ejecuta `npm run build`.');
}

main();
