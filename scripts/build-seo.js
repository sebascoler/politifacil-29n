'use strict';

const path = require('path');
const {
  ROOT_MODE,
  COUNTRIES,
  getSiteUrl,
  getGlobalHomePath,
  getCountryBasePath,
  getActiveCountries,
  getUpcomingCountries,
} = require('../config/portal');
const { getStrings } = require('../config/i18n');
const { buildCountrySite } = require('./lib/country-builder');
const {
  buildGlobalLandingPage,
  buildCalendarPage,
  buildRootDiscoveryFiles,
} = require('./lib/portal-builder');
const { loadAllArticles, buildArticlesSection } = require('./lib/articles-engine');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SITE_URL = getSiteUrl();
const LASTMOD = new Date().toISOString().slice(0, 10);

function main() {
  const activeCountries = getActiveCountries();
  const upcomingCountries = getUpcomingCountries();
  const portalHref = getGlobalHomePath(ROOT_MODE);
  const calendarHref = '/calendario';
  const articlesHref = '/articulos';
  const calendarData = require(path.join(PUBLIC_DIR, 'data', 'calendarData.js'));
  const articles = loadAllArticles(ROOT_DIR);

  const countryBuilds = activeCountries.map((countryConfig) => {
    const data = require(path.join(ROOT_DIR, countryConfig.dataFile));
    const strings = getStrings(countryConfig.locale);
    const built = buildCountrySite({
      countryConfig,
      data,
      siteUrl: SITE_URL,
      rootMode: ROOT_MODE,
      lastmod: LASTMOD,
      publicDir: PUBLIC_DIR,
      strings,
      portalHref,
      calendarHref,
      activeCountries,
      getCountryBasePath,
    });
    return { ...built, data };
  });

  const sharedContext = {
    siteUrl: SITE_URL,
    rootMode: ROOT_MODE,
    lastmod: LASTMOD,
    publicDir: PUBLIC_DIR,
    portalHref,
    calendarHref,
    articlesHref,
    countries: COUNTRIES,
    activeCountries,
    upcomingCountries,
    getCountryBasePath,
    countryBuilds,
    calendarData,
    articles,
  };

  const articlesBuild = buildArticlesSection(sharedContext);
  sharedContext.articlesBuild = articlesBuild;

  buildGlobalLandingPage(sharedContext);
  buildCalendarPage(sharedContext);
  const totalSitemapUrls = buildRootDiscoveryFiles(sharedContext);

  console.log('SEO/GEO/SSG MULTI-PAÍS BUILD COMPLETADO:', {
    rootMode: ROOT_MODE,
    siteUrl: SITE_URL,
    portalHref,
    calendarHref,
    articlesHref,
    calendarEvents: calendarData.events.length,
    articlesCount: articlesBuild.count,
    sitemapUrls: totalSitemapUrls,
    countries: countryBuilds.map((b) => ({
      country: b.countryId,
      basePath: b.basePath,
      ...b.stats,
    })),
  });
}

main();
