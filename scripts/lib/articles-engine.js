'use strict';

const fs = require('fs');
const path = require('path');
const {
  GTM_HEAD_SNIPPET,
  writeFile,
  escapeHtml,
  escapeXml,
  safeJsonLd,
} = require('./shared-render');

const CATEGORY_LABELS = {
  'guia-voto': 'Guía de Voto',
  comparativa: 'Comparativa por Eje',
  calendario: 'Calendario y Fechas',
  metodologia: 'Metodología',
  datos: 'Datos Oficiales',
};

const COUNTRY_META = {
  es: { flag: '🇪🇸', name: 'España', ogPath: '/og-banner.png' },
  ar: { flag: '🇦🇷', name: 'Argentina', ogPath: '/ar/og-banner.png' },
  global: { flag: '🌐', name: 'Global / Varios', ogPath: '/portal/og-banner.png' },
  us: { flag: '🇺🇸', name: 'Estados Unidos', ogPath: '/portal/og-banner.png' },
  br: { flag: '🇧🇷', name: 'Brasil', ogPath: '/portal/og-banner.png' },
  mx: { flag: '🇲🇽', name: 'México', ogPath: '/portal/og-banner.png' },
  co: { flag: '🇨🇴', name: 'Colombia', ogPath: '/portal/og-banner.png' },
  cl: { flag: '🇨🇱', name: 'Chile', ogPath: '/portal/og-banner.png' },
  gt: { flag: '🇬🇹', name: 'Guatemala', ogPath: '/portal/og-banner.png' },
};

function stripQuotes(val) {
  const s = String(val || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function slugifyHeading(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'seccion';
}

function parseFrontmatterValue(rawVal) {
  const trimmed = String(rawVal || '').trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((v) => stripQuotes(v))
        .filter(Boolean);
    }
  }
  return stripQuotes(trimmed);
}

/**
 * Parses a Markdown article with YAML-subset frontmatter (zero external deps).
 * Supports scalar fields, inline JSON arrays, bullet string arrays, and object lists (`sources`, `faq`).
 */
function parseArticleMarkdown(raw, filePath = '') {
  const normalized = String(raw || '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Falta bloque de frontmatter --- ... --- en ${filePath}`);
  }

  const fmLines = match[1].split('\n');
  const body = match[2].trim();
  const data = {};

  let activeArrayKey = null;
  let activeObject = null;

  function flushObject() {
    if (activeArrayKey && activeObject && Object.keys(activeObject).length > 0) {
      data[activeArrayKey].push(activeObject);
      activeObject = null;
    }
  }

  for (const line of fmLines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Top-level key: value (or key:)
    const topMatch = line.match(/^([a-zA-Z0-9_]+):(?:\s*(.*))?$/);
    if (topMatch) {
      flushObject();
      activeArrayKey = null;
      const key = topMatch[1];
      const val = (topMatch[2] || '').trim();
      if (!val) {
        data[key] = [];
        activeArrayKey = key;
      } else {
        data[key] = parseFrontmatterValue(val);
      }
      continue;
    }

    if (!activeArrayKey) continue;

    // Bullet item inside list: "- foo" or "- key: value"
    const itemMatch = line.match(/^\s*-\s+(.*)$/);
    if (itemMatch) {
      const rest = itemMatch[1].trim();
      const kv = rest.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (kv) {
        flushObject();
        activeObject = { [kv[1]]: stripQuotes(kv[2]) };
      } else {
        flushObject();
        data[activeArrayKey].push(stripQuotes(rest));
      }
      continue;
    }

    // Continuation property inside an object list item ("  url: ...")
    const subKv = line.match(/^\s+([a-zA-Z0-9_]+):\s*(.*)$/);
    if (subKv && activeObject) {
      activeObject[subKv[1]] = stripQuotes(subKv[2]);
    }
  }
  flushObject();

  const plainWords = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`|_\[\]()-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = plainWords.length;
  const readingMinutes = Number(data.readingMinutes) || Math.max(2, Math.ceil(wordCount / 220));

  return {
    slug: String(data.slug || '').trim(),
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    country: String(data.country || 'global').trim().toLowerCase(),
    category: String(data.category || 'guia-voto').trim().toLowerCase(),
    axisId: data.axisId ? String(data.axisId).trim() : '',
    relatedParties: Array.isArray(data.relatedParties) ? data.relatedParties : [],
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    publishedAt: String(data.publishedAt || '').trim(),
    updatedAt: String(data.updatedAt || data.publishedAt || '').trim(),
    lang: String(data.lang || 'es').trim(),
    featured: Boolean(data.featured),
    sources: Array.isArray(data.sources) ? data.sources : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
    readingMinutes,
    wordCount,
    body,
    filePath,
  };
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  // Protect inline code spans before processing links/emphasis
  const codeTokens = [];
  const withCodePlaceholders = escaped.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codeTokens.length;
    codeTokens.push(`<code>${code}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  const withLinks = withCodePlaceholders.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, rawUrl) => {
    const cleanUrl = rawUrl.replace(/&amp;/g, '&');
    const isExternal = /^https?:\/\//i.test(cleanUrl);
    const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer" class="inline-link"' : ' class="inline-link"';
    return `<a href="${escapeHtml(cleanUrl)}"${attrs}>${label}</a>`;
  });

  const withEmphasis = withLinks
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

  return withEmphasis.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeTokens[Number(i)]);
}

function parseTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Renders structured article Markdown to semantic HTML and builds an H2 Table of Contents.
 */
function renderMarkdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const toc = [];
  const usedIds = new Set();

  function uniqueId(title) {
    const base = slugifyHeading(title);
    let candidate = base;
    let counter = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.add(candidate);
    return candidate;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push('<hr class="prose-hr" />');
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawText = headingMatch[2].trim();
      const id = uniqueId(rawText);
      if (level === 2) {
        toc.push({ id, text: rawText });
      }
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInlineMarkdown(rawText)}</h${level}>`);
      i += 1;
      continue;
    }

    // Markdown table
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|/.test(lines[i + 1].trim())) {
      const headers = parseTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i].trim()));
        i += 1;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${renderInlineMarkdown(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${headers.map((_, ci) => `<td>${renderInlineMarkdown(r[ci] || '')}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      blocks.push(`<div class="table-scroll"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const qLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        qLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(`<blockquote class="prose-quote"><p>${renderInlineMarkdown(qLines.join(' '))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(`<ul class="prose-list">${items.map((it) => `<li>${renderInlineMarkdown(it)}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(`<ol class="prose-list">${items.map((it) => `<li>${renderInlineMarkdown(it)}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph (stop at blank line or structural prefix)
    const pLines = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^---+$/.test(cur) ||
        /^#{2,4}\s+/.test(cur) ||
        cur.startsWith('>') ||
        /^[-*]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur) ||
        (cur.startsWith('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|/.test(lines[i + 1].trim()))
      ) {
        break;
      }
      pLines.push(cur);
      i += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(pLines.join(' '))}</p>`);
  }

  return { html: blocks.join('\n'), toc };
}

function loadAllArticles(rootDir) {
  const baseDir = path.join(rootDir, 'content', 'articulos');
  if (!fs.existsSync(baseDir)) return [];

  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('_')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
        files.push(fullPath);
      }
    }
  }
  walk(baseDir);

  return files
    .map((fp) => parseArticleMarkdown(fs.readFileSync(fp, 'utf8'), fp))
    .sort((a, b) => {
      const d = (b.publishedAt || '').localeCompare(a.publishedAt || '');
      if (d !== 0) return d;
      const u = (b.updatedAt || '').localeCompare(a.updatedAt || '');
      if (u !== 0) return u;
      return a.slug.localeCompare(b.slug);
    });
}

function renderSwissShellCss() {
  return `    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    :root {
      --bg: #08151a;
      --panel: #0e2027;
      --panel-alt: #122830;
      --border: rgba(248, 250, 252, 0.14);
      --ivory: #f8fafc;
      --muted: #cbd5e1;
      --amber: #f59e0b;
      --amber-soft: rgba(245, 158, 11, 0.16);
      --green: #34d399;
      --green-soft: rgba(52, 211, 153, 0.14);
    }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ivory);
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.62;
      overflow-x: hidden;
    }
    .skip-link {
      position: absolute; left: -9999px; top: 0;
      background: var(--amber); color: #08151a; padding: 10px 16px; z-index: 1000;
      font-weight: 700; border-radius: 0 0 8px 0;
    }
    .skip-link:focus { left: 12px; }
    .swiss-bar {
      position: sticky; top: 0; z-index: 50;
      border-bottom: 1px solid var(--border);
      background: rgba(8, 21, 26, 0.92);
      backdrop-filter: blur(10px);
    }
    .swiss-bar-inner {
      max-width: 1200px; margin: 0 auto; padding: 13px 24px;
      display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .swiss-brand {
      font-weight: 800; letter-spacing: 0.1em; color: var(--ivory);
      text-decoration: none; font-size: 0.94rem;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .brand-dot {
      width: 9px; height: 9px; border-radius: 50%; background: var(--amber);
      box-shadow: 0 0 12px var(--amber);
    }
    .swiss-nav { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .swiss-nav a {
      color: var(--muted); text-decoration: none; font-size: 0.86rem; font-weight: 700;
      transition: color 0.14s ease;
    }
    .swiss-nav a:hover, .swiss-nav a.is-current { color: var(--amber); }
    .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px 0; }
    .breadcrumb-nav {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--muted);
      margin-bottom: 18px;
    }
    .breadcrumb-nav a { color: var(--amber); text-decoration: none; font-weight: 700; }
    .breadcrumb-nav a:hover { text-decoration: underline; }
    .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      display: block; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--amber); margin-bottom: 6px;
    }
    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .meta-chip {
      font-size: 0.76rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
      background: var(--panel-alt); border: 1px solid var(--border); color: var(--ivory);
    }
    .mono-pill {
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: rgba(248, 250, 252, 0.08); color: var(--ivory);
      border: 1px solid var(--border);
    }
    .amber-pill {
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700;
      padding: 3px 8px; border-radius: 6px;
      background: var(--amber-soft); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .sbtn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
      text-decoration: none; padding: 10px 15px; border-radius: 10px;
      font-family: inherit; font-weight: 700; font-size: 0.86rem;
      border: 1.5px solid var(--border); color: var(--ivory); background: rgba(14, 32, 39, 0.9);
      transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
    }
    .sbtn-sm { padding: 7px 12px; font-size: 0.8rem; border-radius: 8px; }
    .sbtn:hover { transform: translateY(-1px); border-color: var(--amber); }
    .sbtn-solid { background: var(--amber); color: #08151a; border-color: var(--amber); }
    .sbtn-solid:hover { background: #fbbf24; border-color: #fbbf24; }
    .inline-link { color: var(--amber); text-decoration: none; font-weight: 700; }
    .inline-link:hover { text-decoration: underline; }
    .site-footer {
      margin-top: 56px; border-top: 1px solid var(--border); background: #061014;
      padding: 28px 24px;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .footer-links { display: flex; gap: 8px; flex-wrap: wrap; }
    .card-sub { margin: 4px 0 0; font-size: 0.84rem; color: var(--muted); }
    @media (max-width: 768px) {
      .swiss-bar-inner { padding: 12px 16px; }
      .container { padding: 24px 16px 0; }
    }`;
}

function renderArticleHeaderAndHead({ siteUrl, canonicalUrl, title, description, lang, ogImage, jsonLd, extraCss }) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang || 'es')}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="${escapeHtml(lang || 'es')}" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content="#08151a" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" title="llms.txt" href="${escapeHtml(siteUrl)}/articulos/llms.txt" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="PolitiFácil" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700;800&display=swap" />
${GTM_HEAD_SNIPPET}
  <script type="application/ld+json">
${safeJsonLd(jsonLd)}
  </script>
  <style>
${renderSwissShellCss()}
${extraCss}
  </style>
</head>`;
}

function renderSwissTopbar({ portalHref, calendarHref, articlesHref, esHref, arHref, activeKey }) {
  return `  <a class="skip-link" href="#main-content">Saltar al contenido principal</a>
  <header class="swiss-bar">
    <div class="swiss-bar-inner">
      <a class="swiss-brand" href="${escapeHtml(portalHref)}">
        <span class="brand-dot" aria-hidden="true"></span>
        <span>POLITIFÁCIL // INTL</span>
      </a>
      <nav class="swiss-nav" aria-label="Navegación principal">
        <a href="${escapeHtml(portalHref)}">Portal Global</a>
        <a href="${escapeHtml(esHref)}">🇪🇸 España</a>
        <a href="${escapeHtml(arHref)}">🇦🇷 Argentina</a>
        <a href="${escapeHtml(calendarHref)}">📅 Calendario</a>
        <a class="${activeKey === 'articles' ? 'is-current' : ''}" href="${escapeHtml(articlesHref)}"${activeKey === 'articles' ? ' aria-current="page"' : ''}>📰 Artículos</a>
      </nav>
    </div>
  </header>`;
}

function buildRelatedToolsBox(article, context) {
  const { rootMode, portalHref, calendarHref, getCountryBasePath, countryBuilds } = context;
  const esHref = getCountryBasePath('es', rootMode) || '/';
  const arHref = getCountryBasePath('ar', rootMode) || '/ar';

  const countryBuild = countryBuilds.find((b) => b.countryId === article.country);
  if (!countryBuild) {
    return `
      <aside class="bridge-card">
        <span class="eyebrow">Herramientas Interactivas</span>
        <h3>Explora los comparadores y el calendario oficial</h3>
        <div class="bridge-links">
          <a class="sbtn sbtn-solid sbtn-sm" href="${escapeHtml(esHref)}">🇪🇸 Comparador España 29-N</a>
          <a class="sbtn sbtn-solid sbtn-sm" href="${escapeHtml(arHref)}">🇦🇷 Comparador Argentina 2027</a>
          <a class="sbtn sbtn-sm" href="${escapeHtml(calendarHref)}">📅 Calendario 2026–2028</a>
          <a class="sbtn sbtn-sm" href="${escapeHtml(portalHref)}">🌐 Portal Global</a>
        </div>
      </aside>`;
  }

  const meta = COUNTRY_META[article.country] || COUNTRY_META.global;
  const base = getCountryBasePath(article.country, rootMode);
  const homeHref = base || '/';
  const prefix = base || '';
  const data = countryBuild.data;

  const links = [
    `<a class="sbtn sbtn-solid sbtn-sm" href="${escapeHtml(homeHref)}">${escapeHtml(meta.flag)} Abrir PolitiFácil ${escapeHtml(meta.name)}</a>`,
    `<a class="sbtn sbtn-sm" href="${escapeHtml(`${homeHref}?section=test-afinidad`)}">🧭 Test de 10 Escenarios (sin siglas)</a>`,
    `<a class="sbtn sbtn-sm" href="${escapeHtml(`${prefix}/entrevistas`)}">🎙️ Hemeroteca de Citas Literales</a>`,
  ];

  if (article.axisId && data && Array.isArray(data.axes)) {
    const axis = data.axes.find((a) => a.id === article.axisId);
    if (axis) {
      links.splice(
        1,
        0,
        `<a class="sbtn sbtn-solid sbtn-sm" href="${escapeHtml(`${prefix}/propuestas/${axis.id}`)}">${escapeHtml(axis.icon)} Comparar: ${escapeHtml(axis.label)}</a>`
      );
    }
  }

  const partyChips =
    data && Array.isArray(data.parties)
      ? article.relatedParties
          .map((pid) => data.parties.find((p) => p.id === pid))
          .filter(Boolean)
          .map((p) => `<a class="sbtn sbtn-sm" href="${escapeHtml(`${prefix}/partidos/${p.id}`)}">${escapeHtml(p.shortName)}</a>`)
      : [];

  return `
    <aside class="bridge-card">
      <span class="eyebrow">Pasa de la guía a la comparación a ciegas</span>
      <h3>Herramientas oficiales de ${escapeHtml(meta.flag)} ${escapeHtml(meta.name)}</h3>
      <div class="bridge-links">${links.join('\n')}</div>
      ${
        partyChips.length
          ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
               <span class="control-label" style="display:block; margin-bottom:8px;">Perfiles programáticos citados:</span>
               <div class="bridge-links">${partyChips.join('\n')}</div>
             </div>`
          : ''
      }
    </aside>`;
}

function buildSingleArticlePage(article, allArticles, context) {
  const { siteUrl, rootMode, publicDir, portalHref, calendarHref, articlesHref, getCountryBasePath } = context;
  const esHref = getCountryBasePath('es', rootMode) || '/';
  const arHref = getCountryBasePath('ar', rootMode) || '/ar';
  const meta = COUNTRY_META[article.country] || COUNTRY_META.global;
  const catLabel = CATEGORY_LABELS[article.category] || article.category;
  const articlePath = `${articlesHref}/${article.slug}`;
  const canonicalUrl = `${siteUrl}${articlePath}`;
  const ogImage = `${siteUrl}${meta.ogPath || '/portal/og-banner.png'}`;

  const { html: bodyHtml, toc } = renderMarkdownToHtml(article.body);
  const relatedToolsHtml = buildRelatedToolsBox(article, context);

  const faqEntities = article.faq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  }));

  const graph = [
    {
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      inLanguage: article.lang || 'es',
      wordCount: article.wordCount,
      keywords: article.keywords.join(', '),
      image: ogImage,
      mainEntityOfPage: canonicalUrl,
      author: { '@type': 'Organization', name: 'PolitiFácil', url: siteUrl },
      publisher: { '@type': 'Organization', name: 'PolitiFácil', url: siteUrl },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Portal Global', item: `${siteUrl}${portalHref}` },
        { '@type': 'ListItem', position: 2, name: 'Artículos y Guías', item: `${siteUrl}${articlesHref}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
      ],
    },
  ];
  if (faqEntities.length > 0) {
    graph.push({ '@type': 'FAQPage', mainEntity: faqEntities });
  }

  const tocHtml = toc.length
    ? `<nav class="toc-card" aria-label="Índice del artículo">
         <span class="eyebrow">Contenido</span>
         <ul>${toc.map((t) => `<li><a href="#${escapeHtml(t.id)}">${escapeHtml(t.text)}</a></li>`).join('')}</ul>
       </nav>`
    : '';

  const sourcesHtml = article.sources.length
    ? `<section class="sources-card" id="fuentes-oficiales">
         <span class="eyebrow">Trazabilidad y Documentos Primarios</span>
         <h2>Fuentes oficiales y referencias</h2>
         <ul>${article.sources
           .map(
             (s) =>
               `<li><a class="inline-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)} ↗</a></li>`
           )
           .join('')}</ul>
       </section>`
    : '';

  const faqHtml = article.faq.length
    ? `<section class="faq-card" id="preguntas-frecuentes">
         <span class="eyebrow">Respuestas Directas</span>
         <h2>Preguntas frecuentes</h2>
         ${article.faq
           .map(
             (f, idx) => `<details class="faq-item"${idx === 0 ? ' open' : ''}>
               <summary>${escapeHtml(f.q)}</summary>
               <p>${escapeHtml(f.a)}</p>
             </details>`
           )
           .join('\n')}
       </section>`
    : '';

  const otherArticles = allArticles.filter((a) => a.slug !== article.slug).slice(0, 3);
  const moreHtml = otherArticles.length
    ? `<section class="more-articles">
         <span class="eyebrow">Seguir Leyendo</span>
         <h2>Otras guías verificadas en PolitiFácil</h2>
         <div class="more-grid">
           ${otherArticles
             .map((o) => {
               const om = COUNTRY_META[o.country] || COUNTRY_META.global;
               return `<a class="more-card" href="${escapeHtml(`${articlesHref}/${o.slug}`)}">
                 <div class="meta-row" style="margin-bottom:8px;">
                   <span class="mono-pill">${escapeHtml(om.flag)} ${escapeHtml(om.name)}</span>
                   <span class="amber-pill">${escapeHtml(CATEGORY_LABELS[o.category] || o.category)}</span>
                 </div>
                 <h3>${escapeHtml(o.title)}</h3>
                 <p>${escapeHtml(o.description)}</p>
               </a>`;
             })
             .join('\n')}
         </div>
       </section>`
    : '';

  const extraCss = `
    .article-hero {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--panel));
      border: 1px solid var(--border); border-top: 4px solid var(--amber);
      border-radius: 16px; padding: 28px; margin-bottom: 26px;
    }
    .article-hero h1 {
      margin: 0 0 12px; font-size: clamp(1.7rem, 3.6vw, 2.55rem); line-height: 1.12; letter-spacing: -0.025em;
    }
    .article-lead { margin: 0 0 16px; color: var(--muted); font-size: 1.04rem; max-width: 72ch; }
    .article-layout {
      display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 28px; align-items: start;
    }
    .prose-shell {
      background: var(--panel); border: 1px solid var(--border); border-radius: 16px;
      padding: 28px 32px; max-width: 100%;
    }
    .prose-shell h2 {
      margin: 28px 0 10px; font-size: 1.45rem; line-height: 1.2; color: #fef3c7;
      padding-top: 16px; border-top: 1px solid var(--border); scroll-margin-top: 76px;
    }
    .prose-shell h2:first-child { margin-top: 0; padding-top: 0; border-top: none; }
    .prose-shell h3 { margin: 20px 0 8px; font-size: 1.12rem; color: var(--ivory); scroll-margin-top: 76px; }
    .prose-shell p { margin: 0 0 14px; color: #e2e8f0; }
    .prose-list { margin: 0 0 16px; padding-left: 22px; color: #e2e8f0; }
    .prose-list li { margin-bottom: 7px; }
    .prose-quote {
      margin: 16px 0; padding: 14px 18px; border-left: 4px solid var(--amber);
      background: var(--panel-alt); border-radius: 0 10px 10px 0;
    }
    .prose-quote p { margin: 0; color: #fef3c7; font-style: italic; }
    .prose-hr { border: none; border-top: 1px solid var(--border); margin: 22px 0; }
    .table-scroll { overflow-x: auto; margin: 18px 0; border: 1px solid var(--border); border-radius: 12px; }
    .table-scroll table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .table-scroll th, .table-scroll td {
      padding: 11px 14px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top;
    }
    .table-scroll th { background: var(--panel-alt); color: var(--amber); font-weight: 700; }
    .table-scroll tr:last-child td { border-bottom: none; }
    .article-sidebar { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 16px; }
    .toc-card, .neutral-badge-card, .bridge-card, .sources-card, .faq-card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 20px;
    }
    .toc-card ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .toc-card a { color: var(--muted); text-decoration: none; font-size: 0.86rem; font-weight: 600; }
    .toc-card a:hover { color: var(--amber); }
    .bridge-card, .sources-card, .faq-card { margin-top: 22px; }
    .bridge-card h3, .sources-card h2, .faq-card h2, .more-articles h2 { margin: 0 0 12px; font-size: 1.25rem; }
    .bridge-links { display: flex; gap: 8px; flex-wrap: wrap; }
    .control-label {
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);
    }
    .sources-card ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    .faq-item {
      border-top: 1px solid var(--border); padding: 12px 0;
    }
    .faq-item:last-child { padding-bottom: 0; }
    .faq-item summary { cursor: pointer; font-weight: 700; color: var(--ivory); }
    .faq-item p { margin: 8px 0 0; color: var(--muted); font-size: 0.94rem; }
    .more-articles { margin-top: 32px; }
    .more-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .more-card {
      display: flex; flex-direction: column; text-decoration: none; color: inherit;
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px;
      transition: border-color 0.14s ease, transform 0.14s ease;
    }
    .more-card:hover { border-color: var(--amber); transform: translateY(-2px); }
    .more-card h3 { margin: 0 0 6px; font-size: 1rem; color: var(--ivory); }
    .more-card p { margin: 0; font-size: 0.85rem; color: var(--muted); }
    @media (max-width: 960px) {
      .article-layout { grid-template-columns: 1fr; }
      .article-sidebar { position: static; }
      .prose-shell { padding: 22px 18px; }
    }`;

  const html = `${renderArticleHeaderAndHead({
    siteUrl,
    canonicalUrl,
    title: `${article.title} | PolitiFácil`,
    description: article.description,
    lang: article.lang,
    ogImage,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
    extraCss,
  })}
<body>
${renderSwissTopbar({ portalHref, calendarHref, articlesHref, esHref, arHref, activeKey: 'articles' })}

  <main id="main-content" class="container">
    <nav class="breadcrumb-nav" aria-label="Migas de pan">
      <a href="${escapeHtml(portalHref)}">Portal Global</a> <span aria-hidden="true">/</span>
      <a href="${escapeHtml(articlesHref)}">Artículos</a> <span aria-hidden="true">/</span>
      <span aria-current="page">${escapeHtml(article.title)}</span>
    </nav>

    <header class="article-hero">
      <div class="meta-row" style="margin-bottom:10px;">
        <span class="mono-pill">${escapeHtml(meta.flag)} ${escapeHtml(meta.name)}</span>
        <span class="amber-pill">${escapeHtml(catLabel)}</span>
        <span class="mono-pill">⏱ ${article.readingMinutes} min lectura</span>
        <span class="mono-pill">Publicado: ${escapeHtml(article.publishedAt)}</span>
      </div>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="article-lead">${escapeHtml(article.description)}</p>
    </header>

    <div class="article-layout">
      <div>
        <article class="prose-shell">
          ${bodyHtml}
        </article>
        ${relatedToolsHtml}
        ${sourcesHtml}
        ${faqHtml}
      </div>

      <aside class="article-sidebar">
        ${tocHtml}
        <div class="neutral-badge-card">
          <span class="eyebrow">Estándar Editorial</span>
          <p style="margin:0 0 10px; font-size:0.86rem; color:var(--muted);">
            Artículo informativo basado exclusivamente en legislación electoral vigente y programas oficiales publicados. 0 % opiniones editoriales.
          </p>
          <a class="inline-link" href="/data/articles-index.json" style="font-size:0.82rem;">Índice abierto JSON →</a>
        </div>
      </aside>
    </div>

    ${moreHtml}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>PolitiFácil Artículos y Guías</strong> — Observatorio cívico neutral.
        <p class="card-sub">Índice abierto en <a class="inline-link" href="/data/articles-index.json">/data/articles-index.json</a> y <a class="inline-link" href="/articulos/llms.txt">/articulos/llms.txt</a>.</p>
      </div>
      <div class="footer-links">
        <a class="sbtn" href="${escapeHtml(articlesHref)}">Todos los Artículos</a>
        <a class="sbtn" href="${escapeHtml(esHref)}">🇪🇸 España</a>
        <a class="sbtn" href="${escapeHtml(arHref)}">🇦🇷 Argentina</a>
      </div>
    </div>
  </footer>

  <script src="/portal.js"></script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;

  writeFile(path.join(publicDir, 'articulos', article.slug, 'index.html'), html);
  return { path: articlePath, priority: article.featured ? '0.85' : '0.8' };
}

function buildArticlesIndexPage(articles, context) {
  const { siteUrl, rootMode, publicDir, portalHref, calendarHref, articlesHref, getCountryBasePath } = context;
  const esHref = getCountryBasePath('es', rootMode) || '/';
  const arHref = getCountryBasePath('ar', rootMode) || '/ar';
  const canonicalUrl = `${siteUrl}${articlesHref}`;
  const ogImage = `${siteUrl}/portal/og-banner.png`;
  const title = 'Artículos y Guías Electorales Neutrales | PolitiFácil';
  const description =
    'Guías prácticas de votación, comparativas programáticas eje a eje sin sesgos y explicadores electorales de España, Argentina, Latinoamérica y EE. UU.';

  const countriesPresent = Array.from(new Set(articles.map((a) => a.country)));
  const categoriesPresent = Array.from(new Set(articles.map((a) => a.category)));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: 'es',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Portal Global', item: `${siteUrl}${portalHref}` },
          { '@type': 'ListItem', position: 2, name: 'Artículos y Guías', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        numberOfItems: articles.length,
        itemListElement: articles.map((a, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${siteUrl}${articlesHref}/${a.slug}`,
          name: a.title,
        })),
      },
    ],
  };

  const cardsHtml = articles
    .map((a) => {
      const m = COUNTRY_META[a.country] || COUNTRY_META.global;
      const catLabel = CATEGORY_LABELS[a.category] || a.category;
      const searchBlob = `${a.title} ${a.description} ${m.name} ${catLabel} ${(a.keywords || []).join(' ')}`.toLowerCase();
      return `
        <article
          class="article-card"
          data-art-slug="${escapeHtml(a.slug)}"
          data-art-country="${escapeHtml(a.country)}"
          data-art-category="${escapeHtml(a.category)}"
          data-art-search="${escapeHtml(searchBlob)}"
        >
          <div class="meta-row">
            <span class="mono-pill">${escapeHtml(m.flag)} ${escapeHtml(m.name)}</span>
            <span class="amber-pill">${escapeHtml(catLabel)}</span>
            <span class="mono-pill">⏱ ${a.readingMinutes} min</span>
          </div>
          <h2><a href="${escapeHtml(`${articlesHref}/${a.slug}`)}">${escapeHtml(a.title)}</a></h2>
          <p class="card-desc">${escapeHtml(a.description)}</p>
          <div class="card-foot">
            <span class="mono-pill">${escapeHtml(a.publishedAt)}</span>
            <a class="inline-link" href="${escapeHtml(`${articlesHref}/${a.slug}`)}">Leer guía completa →</a>
          </div>
        </article>`;
    })
    .join('\n');

  const extraCss = `
    .hero-panel {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--panel));
      border: 1px solid var(--border); border-top: 4px solid var(--amber);
      border-radius: 16px; padding: 28px; margin-bottom: 20px;
    }
    .hero-panel h1 { margin: 0 0 10px; font-size: clamp(1.65rem, 3.4vw, 2.4rem); line-height: 1.12; }
    .section-lead { margin: 0 0 16px; color: var(--muted); font-size: 0.98rem; max-width: 72ch; }
    .articles-controls {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
      padding: 20px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;
    }
    .filter-row { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
    .sort-control { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .control-label {
      font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);
    }
    .seg-btn {
      font-family: inherit; font-size: 0.84rem; font-weight: 700; padding: 7px 13px; border-radius: 9px;
      cursor: pointer; background: var(--panel-alt); color: var(--ivory); border: 1px solid var(--border);
    }
    .seg-btn:hover { border-color: var(--amber); }
    .seg-btn.is-active { background: var(--amber); color: #08151a; border-color: var(--amber); }
    .search-field { display: flex; flex-direction: column; gap: 6px; }
    .search-field label {
      font-family: 'JetBrains Mono', monospace; font-size: 0.74rem; font-weight: 700; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .search-field input {
      width: 100%; padding: 10px 12px; border-radius: 9px;
      background: var(--bg); color: var(--ivory); border: 1px solid var(--border);
      font-family: inherit; font-size: 0.92rem;
    }
    .results-meta {
      font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #fde68a;
      padding-top: 8px; border-top: 1px solid var(--border);
    }
    .articles-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 16px;
    }
    .article-card {
      background: var(--panel); border: 1px solid var(--border); border-left: 4px solid var(--amber);
      border-radius: 14px; padding: 22px; display: flex; flex-direction: column; gap: 12px;
    }
    .article-card h2 { margin: 0; font-size: 1.18rem; line-height: 1.25; }
    .article-card h2 a { color: var(--ivory); text-decoration: none; }
    .article-card h2 a:hover { color: var(--amber); }
    .card-desc { margin: 0; font-size: 0.9rem; color: var(--muted); }
    .card-foot {
      margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
    }
    .empty-card {
      background: var(--panel); border: 1px dashed var(--amber); border-radius: 14px; padding: 24px; margin-top: 18px;
    }
    @media (max-width: 768px) { .articles-grid { grid-template-columns: 1fr; } }`;

  const html = `${renderArticleHeaderAndHead({
    siteUrl,
    canonicalUrl,
    title,
    description,
    lang: 'es',
    ogImage,
    jsonLd,
    extraCss,
  })}
<body>
${renderSwissTopbar({ portalHref, calendarHref, articlesHref, esHref, arHref, activeKey: 'articles' })}

  <main id="main-content" class="container">
    <nav class="breadcrumb-nav" aria-label="Migas de pan">
      <a href="${escapeHtml(portalHref)}">Portal Global</a> <span aria-hidden="true">/</span>
      <span aria-current="page">Artículos y Guías Electorales</span>
    </nav>

    <section class="hero-panel">
      <span class="eyebrow">Biblioteca Cívica SEO &amp; GEO · 0 % Opinión</span>
      <h1>Artículos, Guías de Voto y Comparativas Temáticas</h1>
      <p class="section-lead">
        Explicadores verificados sobre cómo funciona cada elección, comparativas eje a eje extraídas de programas registrados y hojas de ruta oficiales para decidir sin ruido partidista.
      </p>
      <div class="meta-row">
        <span class="meta-chip">${articles.length} Artículos Publicados</span>
        <span class="meta-chip">Schema Article + FAQPage</span>
        <span class="amber-pill">Solo fuentes oficiales</span>
      </div>
    </section>

    <section class="articles-controls" aria-label="Filtros de artículos">
      <div class="filter-row">
        <div class="sort-control" role="group" aria-label="Filtrar por país">
          <span class="control-label">País:</span>
          <button class="seg-btn is-active" data-art-filter-country="all" type="button">Todos</button>
          ${countriesPresent
            .map((cid) => {
              const m = COUNTRY_META[cid] || COUNTRY_META.global;
              return `<button class="seg-btn" data-art-filter-country="${escapeHtml(cid)}" type="button">${escapeHtml(m.flag)} ${escapeHtml(m.name)}</button>`;
            })
            .join('\n          ')}
        </div>

        <div class="sort-control" role="group" aria-label="Filtrar por categoría">
          <span class="control-label">Tema:</span>
          <button class="seg-btn is-active" data-art-filter-category="all" type="button">Todos</button>
          ${categoriesPresent
            .map(
              (cat) =>
                `<button class="seg-btn" data-art-filter-category="${escapeHtml(cat)}" type="button">${escapeHtml(CATEGORY_LABELS[cat] || cat)}</button>`
            )
            .join('\n          ')}
        </div>
      </div>

      <div class="search-field">
        <label for="articles-search-input">Buscar por palabra clave, propuesta o país</label>
        <input id="articles-search-input" type="search" placeholder="Ej: vivienda, 29-N, balotaje, senado, alquiler..." />
      </div>

      <div class="results-meta" id="articles-results-count">
        Mostrando ${articles.length} artículos publicados.
      </div>
    </section>

    <section class="articles-grid" id="articles-grid" aria-label="Listado de artículos">
      ${cardsHtml}
    </section>

    <div class="empty-card" id="articles-empty-state" hidden>
      <h3>Ningún artículo coincide con tu búsqueda</h3>
      <p class="card-desc" style="margin-bottom:14px;">Prueba limpiando el filtro de país, tema o búsqueda.</p>
      <button type="button" class="sbtn sbtn-solid sbtn-sm" id="articles-reset-btn">Restablecer filtros</button>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>PolitiFácil Artículos</strong> — Guías y comparativas sin sesgos.
        <p class="card-sub">Índice abierto en <a class="inline-link" href="/data/articles-index.json">/data/articles-index.json</a>.</p>
      </div>
      <div class="footer-links">
        <a class="sbtn" href="${escapeHtml(portalHref)}">Portal Global</a>
        <a class="sbtn" href="${escapeHtml(calendarHref)}">📅 Calendario</a>
        <a class="sbtn" href="/articulos/llms.txt">llms.txt</a>
      </div>
    </div>
  </footer>

  <script src="/portal.js"></script>
  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;

  writeFile(path.join(publicDir, 'articulos', 'index.html'), html);
}

function buildArticlesSection(context) {
  const { siteUrl, publicDir, articlesHref = '/articulos', articles = [], lastmod } = context;

  buildArticlesIndexPage(articles, { ...context, articlesHref });
  const articleEntries = articles.map((article) =>
    buildSingleArticlePage(article, articles, { ...context, articlesHref })
  );

  const sitemapEntries = [{ path: articlesHref, priority: '0.9' }, ...articleEntries];

  const jsonPayload = {
    meta: {
      updatedAt: lastmod,
      count: articles.length,
      url: `${siteUrl}${articlesHref}`,
    },
    articles: articles.map((a) => ({
      slug: a.slug,
      url: `${siteUrl}${articlesHref}/${a.slug}`,
      path: `${articlesHref}/${a.slug}`,
      title: a.title,
      description: a.description,
      country: a.country,
      category: a.category,
      categoryLabel: CATEGORY_LABELS[a.category] || a.category,
      axisId: a.axisId || null,
      relatedParties: a.relatedParties,
      keywords: a.keywords,
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt,
      readingMinutes: a.readingMinutes,
      sources: a.sources,
      faq: a.faq,
    })),
  };
  writeFile(path.join(publicDir, 'data', 'articles-index.json'), JSON.stringify(jsonPayload, null, 2));

  const llmsLines = [
    '# PolitiFácil — Artículos, Guías Electorales y Comparativas',
    '',
    `> Índice editorial SEO/GEO (${articles.length} artículos publicados). Solo fuentes oficiales, 0 % columnas de opinión.`,
    '',
    `- [Índice completo de artículos](${siteUrl}${articlesHref})`,
    `- [JSON estructurado](${siteUrl}/data/articles-index.json)`,
    '',
    '## Artículos publicados',
    ...articles.map((a) => {
      const m = COUNTRY_META[a.country] || COUNTRY_META.global;
      const faqs = a.faq.length ? ` · ${a.faq.length} FAQs` : '';
      return `- [${m.flag} ${a.title}](${siteUrl}${articlesHref}/${a.slug}) (${CATEGORY_LABELS[a.category] || a.category}, ${a.publishedAt}${faqs}): ${a.description}`;
    }),
    '',
  ];
  writeFile(path.join(publicDir, 'articulos', 'llms.txt'), llmsLines.join('\n'));

  const llmsAppendix = `
## Artículos y Guías Electorales (SEO/GEO)
- [PolitiFácil Artículos — Índice completo](${siteUrl}${articlesHref}): ${articles.length} guías verificadas ([llms.txt](${siteUrl}/articulos/llms.txt), [JSON](${siteUrl}/data/articles-index.json)).
${articles
  .map((a) => {
    const m = COUNTRY_META[a.country] || COUNTRY_META.global;
    return `- [${m.flag} ${a.title}](${siteUrl}${articlesHref}/${a.slug}): ${a.description}`;
  })
  .join('\n')}
`;

  return {
    count: articles.length,
    articles,
    sitemapEntries,
    llmsAppendix,
  };
}

module.exports = {
  CATEGORY_LABELS,
  COUNTRY_META,
  parseArticleMarkdown,
  renderMarkdownToHtml,
  loadAllArticles,
  buildArticlesSection,
};
