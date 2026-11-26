'use strict';

const fs = require('fs');
const path = require('path');
const { getActiveCountries } = require('../config/portal');
const { loadAllArticles } = require('./lib/articles-engine');

const ROOT_DIR = path.join(__dirname, '..');
const CALENDAR_PATH = path.join(ROOT_DIR, 'public', 'data', 'calendarData.js');

function assert(cond, msg) {
  if (!cond) {
    console.error('VALIDATION FAILED:', msg);
    process.exit(1);
  }
}

function validateCountry(countryConfig) {
  const dataPath = path.join(ROOT_DIR, countryConfig.dataFile);
  assert(fs.existsSync(dataPath), `No existe ${dataPath} para ${countryConfig.id}`);
  const data = require(dataPath);
  const tag = `[${countryConfig.id.toUpperCase()}]`;

  assert(Array.isArray(data.parties) && data.parties.length === 6, `${tag} Debe haber exactamente 6 fuerzas principales`);
  assert(Array.isArray(data.axes) && data.axes.length === 8, `${tag} Debe haber exactamente 8 ejes`);

  const partyIds = data.parties.map((p) => p.id);
  const axisIds = data.axes.map((a) => a.id);

  data.parties.forEach((p) => {
    assert(p.id && p.shortName && p.name && p.candidate, `${tag} Datos básicos incompletos en partido ${p.id}`);
    assert(p.officialUrl && p.officialUrl.startsWith('http'), `${tag} URL oficial inválida en ${p.id}`);
    assert(
      p.officialCommunication &&
        Array.isArray(p.officialCommunication.slogans) &&
        p.officialCommunication.slogans.length > 0,
      `${tag} Faltan eslóganes en ${p.id}`
    );
    assert(p.interviewStyle && p.interviewStyle.summary, `${tag} Falta interviewStyle en ${p.id}`);
    axisIds.forEach((ax) => {
      assert(p.proposals && p.proposals[ax], `${tag} Falta eje ${ax} en ${p.id}`);
      assert(
        p.proposals[ax].headline &&
          Array.isArray(p.proposals[ax].points) &&
          p.proposals[ax].points.length >= 2,
        `${tag} Propuestas insuficientes en ${p.id}.${ax}`
      );
    });
  });

  assert(
    Array.isArray(data.territorialParties) && data.territorialParties.length >= 5,
    `${tag} Debe haber al menos 5 fuerzas territoriales/provinciales`
  );

  axisIds.forEach((ax) => {
    assert(data.axisComparisons && data.axisComparisons[ax], `${tag} Falta axisComparisons para ${ax}`);
    assert(data.axisComparisons[ax].similarities.length >= 2, `${tag} Faltan similitudes en ${ax}`);
    assert(data.axisComparisons[ax].differences.length >= 2, `${tag} Faltan diferencias en ${ax}`);
  });

  assert(
    Array.isArray(data.interviews) && data.interviews.length >= 18,
    `${tag} Se requieren al menos 18 extractos de entrevistas (actual: ${data.interviews?.length})`
  );
  data.interviews.forEach((iv, i) => {
    assert(
      iv.candidate &&
        iv.media &&
        iv.formatType &&
        iv.questionContext &&
        iv.quote &&
        iv.expressionStyle &&
        iv.sourceUrl,
      `${tag} Entrevista #${i} incompleta`
    );
  });

  assert(
    Array.isArray(data.quizQuestions) && data.quizQuestions.length === 10,
    `${tag} Debe haber exactamente 10 preguntas tipo escenario (actual: ${data.quizQuestions?.length})`
  );
  data.quizQuestions.forEach((q, qi) => {
    assert(Array.isArray(q.options) && q.options.length === 5, `${tag} Pregunta #${qi + 1} debe tener 5 opciones`);
    q.options.forEach((o, oi) => {
      assert(
        typeof o.spectrumScore === 'number' && o.spectrumScore >= 0 && o.spectrumScore <= 100,
        `${tag} spectrumScore inválido en P${qi + 1}.O${oi + 1}`
      );
      assert(o.partyAlignment && typeof o.partyAlignment === 'object', `${tag} Falta partyAlignment en P${qi + 1}.O${oi + 1}`);
      partyIds.forEach((pid) => {
        assert(
          typeof o.partyAlignment[pid] === 'number',
          `${tag} Falta partyAlignment.${pid} en P${qi + 1}.O${oi + 1}`
        );
      });
    });
  });

  function simulateProfile(optIndex) {
    let sum = 0;
    data.quizQuestions.forEach((q) => {
      sum += q.options[optIndex].spectrumScore;
    });
    return sum / data.quizQuestions.length;
  }

  const scores = [0, 1, 2, 3, 4].map(simulateProfile);
  console.log(`${tag} Perfiles simulados (0->4):`, scores.map((s) => s.toFixed(1)));
  assert(
    scores[0] < 20 && scores[1] < 45 && scores[2] >= 40 && scores[2] <= 62 && scores[3] > 58 && scores[4] > 80,
    `${tag} La calibración izquierda->derecha del test no es monotónica o está desajustada`
  );

  return {
    country: countryConfig.id,
    parties: data.parties.length,
    territorialParties: data.territorialParties.length,
    axes: data.axes.length,
    interviews: data.interviews.length,
    quizQuestions: data.quizQuestions.length,
  };
}

function validateCalendar() {
  assert(fs.existsSync(CALENDAR_PATH), `No existe ${CALENDAR_PATH}`);
  const cal = require(CALENDAR_PATH);
  assert(Array.isArray(cal.events) && cal.events.length >= 15, 'El calendario debe tener al menos 15 eventos');

  const VALID_REGIONS = new Set(['es', 'latam', 'us']);
  const VALID_TYPES = new Set(['presidential', 'general', 'legislative', 'regional']);
  const seenIds = new Set();

  cal.events.forEach((ev, idx) => {
    assert(ev.id && !seenIds.has(ev.id), `Evento de calendario #${idx} sin id único`);
    seenIds.add(ev.id);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(ev.date || '')), `Fecha inválida en ${ev.id}: ${ev.date}`);
    assert(Number(ev.date.slice(0, 4)) === ev.year, `El año no coincide con la fecha en ${ev.id}`);
    assert(VALID_REGIONS.has(ev.region), `Región inválida en ${ev.id}: ${ev.region}`);
    assert(VALID_TYPES.has(ev.type), `Tipo inválido en ${ev.id}: ${ev.type}`);
    assert(ev.countryName && ev.title && ev.offices && ev.summary && ev.statusNote, `Campos incompletos en ${ev.id}`);
    assert(ev.officialSourceUrl && ev.officialSourceUrl.startsWith('http'), `Fuente oficial inválida en ${ev.id}`);
  });

  return { eventsCount: cal.events.length };
}

function validateArticles() {
  const articles = loadAllArticles(ROOT_DIR);
  const VALID_COUNTRIES = new Set(['es', 'ar', 'global', 'us', 'br', 'mx', 'co', 'cl', 'gt']);
  const VALID_CATEGORIES = new Set(['guia-voto', 'comparativa', 'calendario', 'metodologia', 'datos']);
  const seenSlugs = new Set();

  articles.forEach((art, idx) => {
    const label = art.slug || art.filePath || `#${idx}`;
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(art.slug), `Slug inválido en artículo ${label}`);
    assert(!seenSlugs.has(art.slug), `Slug duplicado en artículos: ${art.slug}`);
    seenSlugs.add(art.slug);
    assert(VALID_COUNTRIES.has(art.country), `País inválido en artículo ${art.slug}: ${art.country}`);
    assert(VALID_CATEGORIES.has(art.category), `Categoría inválida en artículo ${art.slug}: ${art.category}`);
    assert(art.title && art.title.length >= 12, `Título insuficiente en artículo ${art.slug}`);
    assert(art.description && art.description.length >= 40, `Descripción insuficiente en artículo ${art.slug}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(art.publishedAt), `publishedAt inválido en ${art.slug}: ${art.publishedAt}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(art.updatedAt), `updatedAt inválido en ${art.slug}: ${art.updatedAt}`);
    assert(art.body && art.body.length >= 150, `Cuerpo demasiado corto en artículo ${art.slug}`);
    assert(Array.isArray(art.sources) && art.sources.length >= 1, `Se requiere al menos 1 fuente oficial en ${art.slug}`);
    art.sources.forEach((s, si) => {
      assert(s.label && s.url && /^https?:\/\//i.test(s.url), `Fuente #${si} inválida en artículo ${art.slug}`);
    });
    (art.faq || []).forEach((f, fi) => {
      assert(f.q && f.a, `FAQ #${fi} incompleta en artículo ${art.slug}`);
    });
  });

  return { count: articles.length };
}

const countrySummaries = getActiveCountries().map(validateCountry);
const calendarSummary = validateCalendar();
const articlesSummary = validateArticles();

console.log('VALIDACIÓN COMPLETADA CON ÉXITO:', {
  countries: countrySummaries,
  calendar: calendarSummary,
  articles: articlesSummary,
});
