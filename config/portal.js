'use strict';

const ROOT_MODE = process.env.PORTAL_ROOT_MODE === 'global' ? 'global' : 'spain-legacy';

function getSiteUrl() {
  const rawUrl =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'https://politifacil-29n.vercel.app';
  return rawUrl.replace(/\/$/, '');
}

function getGlobalHomePath(rootMode = ROOT_MODE) {
  return rootMode === 'global' ? '/' : '/portal';
}

function getCountryBasePath(countryId, rootMode = ROOT_MODE) {
  if (countryId === 'es') {
    return rootMode === 'global' ? '/es' : '';
  }
  return `/${countryId}`;
}

const COUNTRIES = [
  {
    id: 'es',
    name: 'España',
    flag: '🇪🇸',
    locale: 'es-ES',
    lang: 'es',
    geoRegion: 'ES',
    currency: 'EUR',
    status: 'active',
    badge: '29-N',
    regionGroup: 'es',
    electionName: 'Elecciones Generales 29-N (2026)',
    electionDate: '2026-11-29',
    electionDateLabel: '29 de noviembre de 2026',
    tagline: '6 Partidos Estatales · 5 Fuerzas Territoriales · 8 Ejes · Test de 10 Escenarios',
    description:
      'Programas oficiales del Real Decreto 806/2026, comparador a ciegas, hemeroteca de citas literales y test de afinidad sin siglas.',
    dataFile: 'public/data/electionData.js',
    statsNamespace: 'es',
    ogBannerFile: 'og-banner.png',
    languageTag: 'ES',
  },
  {
    id: 'ar',
    name: 'Argentina',
    flag: '🇦🇷',
    locale: 'es-AR',
    lang: 'es',
    geoRegion: 'AR',
    currency: 'ARS',
    status: 'active',
    badge: '2027',
    regionGroup: 'latam',
    electionName: 'Rumbo a Presidenciales y Legislativas 2027',
    electionDate: '2027-10-24',
    electionDateLabel: '24 de octubre de 2027',
    tagline: '6 Fuerzas Nacionales · 5 Bloques Provinciales · 8 Ejes · Test de 10 Escenarios',
    description:
      'Plataformas ante la CNE y propuestas oficiales rumbo al ciclo 2027, comparador sin etiquetas, citas literales 2025–2026 y brújula electoral.',
    dataFile: 'public/ar/data/electionData.js',
    statsNamespace: 'ar',
    ogBannerFile: 'og-banner.png',
    languageTag: 'ES',
  },
  {
    id: 'us',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    locale: 'en-US',
    lang: 'en',
    geoRegion: 'US',
    currency: 'USD',
    status: 'coming_soon',
    badge: '2027–2028',
    regionGroup: 'us',
    electionName: 'Estatales 2027 · Presidenciales 7 nov 2028',
    electionDate: '2028-11-07',
    electionDateLabel: '7 de noviembre de 2028',
    tagline: 'Gobernadores 2027 (KY, MS, LA) · Primarias y Presidenciales 2028',
    description:
      'Plataforma bilingüe/en inglés sobre partidos Demócrata, Republicano e independientes, votos clave en el Congreso y test sin siglas.',
    dataFile: null,
    statsNamespace: 'us',
    languageTag: 'EN',
  },
  {
    id: 'br',
    name: 'Brasil',
    flag: '🇧🇷',
    locale: 'pt-BR',
    lang: 'pt',
    geoRegion: 'BR',
    currency: 'BRL',
    status: 'coming_soon',
    badge: '2028',
    regionGroup: 'latam',
    electionName: 'Municipales 1 oct 2028 · Ciclo Post-2026',
    electionDate: '2028-10-01',
    electionDateLabel: '1 de octubre de 2028',
    tagline: 'Edición en portugués · Alcaldías, cámaras municipales y mapa congresual',
    description:
      'Comparador en portugués (pt-BR) de programas oficiales ante el TSE, entrevistas literales y brújula cívica sin sesgos.',
    dataFile: null,
    statsNamespace: 'br',
    languageTag: 'PT',
  },
  {
    id: 'mx',
    name: 'México',
    flag: '🇲🇽',
    locale: 'es-MX',
    lang: 'es',
    geoRegion: 'MX',
    currency: 'MXN',
    status: 'coming_soon',
    badge: '2027',
    regionGroup: 'latam',
    electionName: 'Intermedias Federales · 6 de junio de 2027',
    electionDate: '2027-06-06',
    electionDateLabel: '6 de junio de 2027',
    tagline: '500 Diputaciones Federales · 17 Gubernaturas · Congresos Locales',
    description:
      'Cobertura de plataformas registradas ante el INE, contraste legislativo y test de afinidad sin nombres de partidos.',
    dataFile: null,
    statsNamespace: 'mx',
    languageTag: 'ES',
  },
  {
    id: 'co',
    name: 'Colombia',
    flag: '🇨🇴',
    locale: 'es-CO',
    lang: 'es',
    geoRegion: 'CO',
    currency: 'COP',
    status: 'coming_soon',
    badge: '2027',
    regionGroup: 'latam',
    electionName: 'Territoriales y Regionales · 31 de octubre de 2027',
    electionDate: '2027-10-31',
    electionDateLabel: '31 de octubre de 2027',
    tagline: '32 Gobernaciones · 1.103 Alcaldías · Asambleas y Concejos',
    description:
      'Comparador programático territorial, seguimiento legislativo y test ciudadano para autoridades locales 2028–2031.',
    dataFile: null,
    statsNamespace: 'co',
    languageTag: 'ES',
  },
  {
    id: 'cl',
    name: 'Chile',
    flag: '🇨🇱',
    locale: 'es-CL',
    lang: 'es',
    geoRegion: 'CL',
    currency: 'CLP',
    status: 'coming_soon',
    badge: '2028',
    regionGroup: 'latam',
    electionName: 'Municipales y Regionales · 29 de octubre de 2028',
    electionDate: '2028-10-29',
    electionDateLabel: '29 de octubre de 2028',
    tagline: 'Alcaldías · Gobernadores Regionales · CORE y Concejos',
    description:
      'Programas registrados ante el Servel, declaraciones textuales y test cívico neutral para el próximo ciclo regional.',
    dataFile: null,
    statsNamespace: 'cl',
    languageTag: 'ES',
  },
  {
    id: 'gt',
    name: 'Guatemala',
    flag: '🇬🇹',
    locale: 'es-GT',
    lang: 'es',
    geoRegion: 'GT',
    currency: 'GTQ',
    status: 'coming_soon',
    badge: '2027',
    regionGroup: 'latam',
    electionName: 'Elecciones Generales · 27 de junio de 2027',
    electionDate: '2027-06-27',
    electionDateLabel: '27 de junio de 2027',
    tagline: 'Presidencia · Congreso de la República · Corporaciones Municipales',
    description:
      'Planes de gobierno ante el TSE, comparador de ejes nacionales y test a ciegas de propuestas.',
    dataFile: null,
    statsNamespace: 'gt',
    languageTag: 'ES',
  },
];

function getCountryConfig(countryId) {
  return COUNTRIES.find((c) => c.id === countryId) || null;
}

function getActiveCountries() {
  return COUNTRIES.filter((c) => c.status === 'active');
}

function getUpcomingCountries() {
  return COUNTRIES.filter((c) => c.status === 'coming_soon');
}

// Redirecciones 301 listas para vercel.json al pasar a PORTAL_ROOT_MODE=global tras el 29-N
const GLOBAL_SWITCH_REDIRECTS = [
  { source: '/comparador', destination: '/es/comparador', permanent: true },
  { source: '/entrevistas', destination: '/es/entrevistas', permanent: true },
  { source: '/test-afinidad', destination: '/es/test-afinidad', permanent: true },
  { source: '/territorios', destination: '/es/territorios', permanent: true },
  { source: '/territorios/:slug', destination: '/es/territorios/:slug', permanent: true },
  { source: '/partidos/:slug', destination: '/es/partidos/:slug', permanent: true },
  { source: '/propuestas/:slug', destination: '/es/propuestas/:slug', permanent: true },
  { source: '/comparar', destination: '/es/comparar', permanent: true },
  { source: '/comparar/:slug', destination: '/es/comparar/:slug', permanent: true },
];

module.exports = {
  ROOT_MODE,
  COUNTRIES,
  GLOBAL_SWITCH_REDIRECTS,
  getSiteUrl,
  getGlobalHomePath,
  getCountryBasePath,
  getCountryConfig,
  getActiveCountries,
  getUpcomingCountries,
};
