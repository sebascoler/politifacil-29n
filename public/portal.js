/* global window */
(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'politifacil_theme_v1';
  const LEGACY_STATE_KEY = 'politifacil_29n_state_v1';

  function readPreferredTheme() {
    try {
      const explicit = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (explicit === 'dark' || explicit === 'light') return explicit;
      const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STATE_KEY) || '{}');
      if (legacy && (legacy.theme === 'dark' || legacy.theme === 'light')) return legacy.theme;
    } catch {
      // Ignorar errores de almacenamiento
    }
    return 'light';
  }

  function persistTheme(theme) {
    const norm = theme === 'dark' ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, norm);
      const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STATE_KEY) || '{}');
      if (legacy && typeof legacy === 'object') {
        legacy.theme = norm;
        window.localStorage.setItem(LEGACY_STATE_KEY, JSON.stringify(legacy));
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  function applyTheme(theme) {
    const norm = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', norm);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = norm === 'dark' ? '☀' : '◐';
  }

  function initThemeToggle() {
    applyTheme(readPreferredTheme());
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      persistTheme(next);
    });
  }

  function parseIsoDateStart(isoDate) {
    const parts = String(isoDate || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  function computeCountdownText(isoDate, isTentative) {
    const target = parseIsoDateStart(isoDate);
    if (!target) return '';
    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const diffDays = Math.round((target.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Celebrada';
    if (diffDays === 0) return '¡Hoy!';
    if (diffDays === 1) return 'Mañana';
    if (diffDays <= 60) return `${isTentative ? '~' : ''}En ${diffDays} días`;
    const months = Math.round(diffDays / 30.4);
    return `${isTentative ? '~' : ''}En ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  function updateAllCountdowns() {
    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    document.querySelectorAll('[data-countdown-date]').forEach((el) => {
      const iso = el.getAttribute('data-countdown-date');
      const tentative = el.getAttribute('data-countdown-tentative') === '1';
      const prefix = el.getAttribute('data-countdown-prefix') || '';
      const label = computeCountdownText(iso, tentative);
      if (label) {
        el.textContent = prefix ? `${prefix} · ${label}` : label;
      }
      const target = parseIsoDateStart(iso);
      if (target) {
        const isPast = target.getTime() < todayNoon.getTime();
        el.classList.toggle('is-past', isPast);
        el.classList.toggle('is-imminent', !isPast && (target.getTime() - todayNoon.getTime()) <= 1000 * 60 * 60 * 24 * 30);
      }
    });
  }

  function initCalendarFilters() {
    const timeline = document.getElementById('calendar-timeline');
    if (!timeline) return;

    const cards = Array.from(timeline.querySelectorAll('[data-cal-event]'));
    const yearGroups = Array.from(timeline.querySelectorAll('[data-cal-year-group]'));
    const countLabel = document.getElementById('calendar-results-count');
    const emptyState = document.getElementById('calendar-empty-state');
    const searchInput = document.getElementById('calendar-search-input');
    const typeSelect = document.getElementById('calendar-type-filter');
    const showPastToggle = document.getElementById('calendar-show-past');

    const filterState = {
      region: 'all',
      year: 'all',
      type: 'all',
      search: '',
      showPast: showPastToggle ? showPastToggle.checked : false,
    };

    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    // Marcar tarjetas celebradas según fecha del navegador
    cards.forEach((card) => {
      const iso = card.getAttribute('data-cal-date');
      const target = parseIsoDateStart(iso);
      if (target && target.getTime() < todayNoon.getTime()) {
        card.setAttribute('data-cal-past', '1');
        card.classList.add('is-past-event');
      } else {
        card.setAttribute('data-cal-past', '0');
      }
    });

    function applyFilters() {
      let visibleCount = 0;
      cards.forEach((card) => {
        const region = card.getAttribute('data-cal-region') || '';
        const year = card.getAttribute('data-cal-year') || '';
        const type = card.getAttribute('data-cal-type') || '';
        const isPast = card.getAttribute('data-cal-past') === '1';
        const hay = (card.getAttribute('data-cal-search') || '').toLowerCase();

        let show = true;
        if (filterState.region !== 'all' && region !== filterState.region) show = false;
        if (filterState.year !== 'all' && year !== filterState.year) show = false;
        if (filterState.type !== 'all' && type !== filterState.type) show = false;
        if (!filterState.showPast && isPast && filterState.year !== '2026') show = false;
        if (filterState.search && !hay.includes(filterState.search)) show = false;

        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      yearGroups.forEach((group) => {
        const groupCards = Array.from(group.querySelectorAll('[data-cal-event]'));
        const anyVisible = groupCards.some((c) => !c.hidden);
        group.hidden = !anyVisible;
      });

      if (countLabel) {
        countLabel.textContent = `Mostrando ${visibleCount} ${visibleCount === 1 ? 'proceso electoral' : 'procesos electorales'} en calendario.`;
      }
      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
    }

    document.querySelectorAll('[data-cal-filter-region]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.region = btn.getAttribute('data-cal-filter-region') || 'all';
        document.querySelectorAll('[data-cal-filter-region]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        applyFilters();
      });
    });

    document.querySelectorAll('[data-cal-filter-year]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.year = btn.getAttribute('data-cal-filter-year') || 'all';
        document.querySelectorAll('[data-cal-filter-year]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        applyFilters();
      });
    });

    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        filterState.type = typeSelect.value;
        applyFilters();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterState.search = searchInput.value.trim().toLowerCase();
        applyFilters();
      });
    }

    if (showPastToggle) {
      showPastToggle.addEventListener('change', () => {
        filterState.showPast = showPastToggle.checked;
        applyFilters();
      });
    }

    const resetBtn = document.getElementById('calendar-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filterState.region = 'all';
        filterState.year = 'all';
        filterState.type = 'all';
        filterState.search = '';
        filterState.showPast = true;
        if (typeSelect) typeSelect.value = 'all';
        if (searchInput) searchInput.value = '';
        if (showPastToggle) showPastToggle.checked = true;
        document.querySelectorAll('[data-cal-filter-region]').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-cal-filter-region') === 'all');
        });
        document.querySelectorAll('[data-cal-filter-year]').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-cal-filter-year') === 'all');
        });
        applyFilters();
      });
    }

    applyFilters();
  }

  function initArticleFilters() {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('[data-art-slug]'));
    const countLabel = document.getElementById('articles-results-count');
    const emptyState = document.getElementById('articles-empty-state');
    const searchInput = document.getElementById('articles-search-input');

    const filterState = {
      country: 'all',
      category: 'all',
      search: '',
    };

    function applyFilters() {
      let visibleCount = 0;
      cards.forEach((card) => {
        const country = card.getAttribute('data-art-country') || '';
        const category = card.getAttribute('data-art-category') || '';
        const hay = (card.getAttribute('data-art-search') || '').toLowerCase();

        let show = true;
        if (filterState.country !== 'all' && country !== filterState.country) show = false;
        if (filterState.category !== 'all' && category !== filterState.category) show = false;
        if (filterState.search && !hay.includes(filterState.search)) show = false;

        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      if (countLabel) {
        countLabel.textContent = `Mostrando ${visibleCount} ${visibleCount === 1 ? 'artículo publicado' : 'artículos publicados'}.`;
      }
      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
    }

    document.querySelectorAll('[data-art-filter-country]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.country = btn.getAttribute('data-art-filter-country') || 'all';
        document.querySelectorAll('[data-art-filter-country]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        applyFilters();
      });
    });

    document.querySelectorAll('[data-art-filter-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.category = btn.getAttribute('data-art-filter-category') || 'all';
        document.querySelectorAll('[data-art-filter-category]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterState.search = searchInput.value.trim().toLowerCase();
        applyFilters();
      });
    }

    const resetBtn = document.getElementById('articles-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        filterState.country = 'all';
        filterState.category = 'all';
        filterState.search = '';
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('[data-art-filter-country]').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-art-filter-country') === 'all');
        });
        document.querySelectorAll('[data-art-filter-category]').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-art-filter-category') === 'all');
        });
        applyFilters();
      });
    }

    applyFilters();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    updateAllCountdowns();
    initCalendarFilters();
    initArticleFilters();
  });
})();
