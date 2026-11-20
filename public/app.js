/* global window */
(function () {
  'use strict';

  const DATA = window.ELECTION_DATA;
  if (!DATA) {
    console.error('No se encontró window.ELECTION_DATA');
    return;
  }

  const STORAGE_KEY = 'politifacil_29n_state_v1';
  const QUIZ_COUNTED_KEY = 'politifacil_29n_quiz_counted_v1';
  const DEFAULT_LIVE_STATS = { totalParticipants: 21224, averageScore: 48.4 };
  const VALID_SECTIONS = ['arco-overview', 'comparador', 'entrevistas', 'test-afinidad'];
  const SECTION_TITLES = {
    'arco-overview': 'PolitiFácil 29-N | Comparador Electoral Neutral y Test de Afinidad en España',
    comparador: 'Comparador de Propuestas a Ciegas 29-N | PolitiFácil',
    entrevistas: 'Entrevistas a Candidatos 29-N (Sin Opinión) | PolitiFácil',
    'test-afinidad': 'Test de Afinidad 29-N (10 Escenarios Sin Siglas) | PolitiFácil',
  };

  const urlControlledFlags = {
    party: false,
    blind: false,
  };

  const state = {
    activeSection: 'arco-overview',
    sortMode: 'spectrum',
    selectedPartyId: 'psoe',
    activeAxis: 'vivienda',
    visiblePartyIds: DATA.parties.map((p) => p.id),
    pairLeft: 'psoe',
    pairRight: 'pp',
    blindMode: true,
    blindOrderMap: {},
    blindRevealed: false,
    blindPicks: {}, // { [axisId]: { [partyId]: true } }
    interviewParty: 'all',
    interviewFormat: 'all',
    interviewTopic: 'all',
    interviewSearch: '',
    quizIndex: 0,
    quizAnswers: {}, // { [questionId]: { optionIndex: number, priority: boolean } }
    quizOptionOrders: {}, // { [questionId]: number[] }
    quizCompleted: false,
    sharedResultPreview: null,
    liveStats: {
      totalParticipants: DEFAULT_LIVE_STATS.totalParticipants,
      realParticipants: null,
      averageScore: DEFAULT_LIVE_STATS.averageScore,
      isRealAverage: false,
      loaded: false,
    },
    theme: 'light',
  };

  function loadSavedState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.theme === 'dark' || parsed.theme === 'light') state.theme = parsed.theme;
      if (parsed.quizAnswers && typeof parsed.quizAnswers === 'object') {
        state.quizAnswers = parsed.quizAnswers;
      }
      if (parsed.quizOptionOrders && typeof parsed.quizOptionOrders === 'object') {
        state.quizOptionOrders = parsed.quizOptionOrders;
      }
      if (typeof parsed.quizCompleted === 'boolean') state.quizCompleted = parsed.quizCompleted;
      if (typeof parsed.quizIndex === 'number') state.quizIndex = parsed.quizIndex;
      if (parsed.blindPicks && typeof parsed.blindPicks === 'object') {
        state.blindPicks = parsed.blindPicks;
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: state.theme,
          quizAnswers: state.quizAnswers,
          quizOptionOrders: state.quizOptionOrders,
          quizCompleted: state.quizCompleted,
          quizIndex: state.quizIndex,
          blindPicks: state.blindPicks,
        })
      );
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  const AI_REFERRER_SOURCES = [
    'chatgpt.com',
    'chat.openai.com',
    'perplexity.ai',
    'gemini.google.com',
    'claude.ai',
    'copilot.microsoft.com',
    'grok.com',
    'deepseek.com',
    'you.com',
    'phind.com',
    'meta.ai',
  ];

  function trackEvent(eventName, params = {}) {
    const payload = params && typeof params === 'object' ? params : {};
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      } else {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName, ...payload });
      }
      if (typeof window.va === 'function') {
        window.va('event', { name: eventName, data: payload });
      }
    } catch {
      // Ignorar errores de analítica
    }
  }

  function detectAiSource() {
    const rawRef = (document.referrer || '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || '').toLowerCase();
    const refParam = (params.get('ref') || '').toLowerCase();

    let refHost = '';
    if (rawRef) {
      try {
        refHost = new URL(rawRef).hostname.toLowerCase();
      } catch {
        refHost = rawRef;
      }
    }

    for (const domain of AI_REFERRER_SOURCES) {
      const shortToken = domain.split('.')[0];
      if (
        (refHost && refHost.includes(domain)) ||
        (utmSource && (utmSource.includes(domain) || utmSource === shortToken)) ||
        (refParam && (refParam.includes(domain) || refParam === shortToken))
      ) {
        return domain;
      }
    }
    return '';
  }

  function trackAiReferralOnce() {
    const aiSource = detectAiSource();
    if (!aiSource) return;
    const sessionKey = 'politifacil_29n_ai_ref_v1';
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, aiSource);
    } catch {
      // Continuar aunque sessionStorage esté restringido
    }
    trackEvent('ai_referral_visit', {
      ai_source: aiSource,
      landing_path: window.location.pathname,
      landing_section: state.activeSection,
      referrer: document.referrer || '',
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumberEs(num) {
    const rounded = Math.max(0, Math.round(Number(num) || 0));
    return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function formatScoreEs(num) {
    return Number(num || 0).toFixed(1).replace('.', ',');
  }

  function renderNationalAvgComparisonHtml(roundedScore) {
    const totalCount = formatNumberEs(state.liveStats.totalParticipants);
    const avg = Number(state.liveStats.averageScore) || DEFAULT_LIVE_STATS.averageScore;
    const avgFormatted = formatScoreEs(avg);
    const diff = Number((roundedScore - avg).toFixed(1));
    const absDiffFormatted = formatScoreEs(Math.abs(diff));

    let positionNote = 'Coincides prácticamente exacto con la media de quienes han hecho el test.';
    if (diff <= -1) {
      positionNote = `Te sitúas <strong>${absDiffFormatted} puntos más a la izquierda</strong> que la media nacional de participantes.`;
    } else if (diff >= 1) {
      positionNote = `Te sitúas <strong>${absDiffFormatted} puntos más a la derecha</strong> que la media nacional de participantes.`;
    }

    return `
      <div class="national-avg-comparison" aria-live="polite">
        <div class="national-avg-head">
          <span class="chip chip-neutral">🔥 Participante #<strong data-live-count>${totalCount}</strong></span>
          <span class="national-avg-metrics">
            Tu posición: <strong>${roundedScore}/100</strong> · Media de <strong data-live-count>${totalCount}</strong> participantes: <strong data-live-avg>${avgFormatted}</strong>/100
          </span>
        </div>
        <p class="muted-text">${positionNote}</p>
      </div>
    `;
  }

  function updateLiveStatsDom() {
    const countText = formatNumberEs(state.liveStats.totalParticipants);
    const avgText = formatScoreEs(state.liveStats.averageScore);
    document.querySelectorAll('[data-live-count]').forEach((el) => {
      el.textContent = countText;
    });
    document.querySelectorAll('[data-live-avg]').forEach((el) => {
      el.textContent = avgText;
    });

    const avgSlot = document.getElementById('national-avg-comparison-slot');
    if (avgSlot) {
      const userScore = Number(avgSlot.dataset.userScore);
      if (!Number.isNaN(userScore)) {
        avgSlot.innerHTML = renderNationalAvgComparisonHtml(Math.round(userScore));
      }
    }
  }

  async function fetchLiveStats() {
    if (typeof window.fetch !== 'function') return;
    try {
      const res = await window.fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      if (payload && typeof payload.totalParticipants === 'number') {
        state.liveStats.totalParticipants = Math.max(DEFAULT_LIVE_STATS.totalParticipants, Math.round(payload.totalParticipants));
        if (typeof payload.realParticipants === 'number') {
          state.liveStats.realParticipants = Math.max(0, Math.round(payload.realParticipants));
        }
        if (typeof payload.averageScore === 'number' && !Number.isNaN(payload.averageScore)) {
          state.liveStats.averageScore = Number(payload.averageScore);
        }
        if (typeof payload.isRealAverage === 'boolean') {
          state.liveStats.isRealAverage = payload.isRealAverage;
        }
        state.liveStats.loaded = true;
        updateLiveStatsDom();
      }
    } catch {
      // Mantener valores semilla si falla la red
    }
  }

  async function submitQuizCompletionStats(res) {
    let alreadyCounted = false;
    try {
      alreadyCounted = window.localStorage.getItem(QUIZ_COUNTED_KEY) === '1';
      if (!alreadyCounted) {
        window.localStorage.setItem(QUIZ_COUNTED_KEY, '1');
      }
    } catch {
      alreadyCounted = false;
    }
    if (alreadyCounted) return;

    const rawScore = res && typeof res.userSpectrumScore === 'number' ? res.userSpectrumScore : 50;
    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const prevCount = state.liveStats.totalParticipants;
    state.liveStats.totalParticipants = prevCount + 1;

    if (typeof state.liveStats.realParticipants === 'number') {
      const prevReal = state.liveStats.realParticipants;
      const nextReal = prevReal + 1;
      state.liveStats.realParticipants = nextReal;
      state.liveStats.averageScore = prevReal > 0
        ? Number((((state.liveStats.averageScore * prevReal) + clampedScore) / nextReal).toFixed(1))
        : clampedScore;
      state.liveStats.isRealAverage = true;
    }
    updateLiveStatsDom();

    const rankings = Array.isArray(res?.rankings) ? res.rankings : [];
    const top1 = rankings[0];
    const top2 = rankings[1];
    const affinities = {};
    rankings.forEach((item) => {
      if (item && item.party && item.party.id) {
        affinities[item.party.id] = item.affinity;
      }
    });

    const answers = {};
    Object.entries(state.quizAnswers || {}).forEach(([qid, ans]) => {
      if (ans && typeof ans.optionIndex === 'number') {
        answers[qid] = {
          optionIndex: ans.optionIndex,
          priority: Boolean(ans.priority),
        };
      }
    });

    if (typeof window.fetch !== 'function') return;
    try {
      const response = await window.fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: clampedScore,
          zoneLabel: describeSpectrumZone(rawScore),
          topPartyId: top1 && top1.party ? top1.party.id : '',
          topAffinity: top1 ? top1.affinity : undefined,
          secondPartyId: top2 && top2.party ? top2.party.id : '',
          secondAffinity: top2 ? top2.affinity : undefined,
          affinities,
          answers,
        }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload && typeof payload.totalParticipants === 'number') {
        state.liveStats.totalParticipants = Math.max(DEFAULT_LIVE_STATS.totalParticipants, Math.round(payload.totalParticipants));
        if (typeof payload.realParticipants === 'number') {
          state.liveStats.realParticipants = Math.max(0, Math.round(payload.realParticipants));
        }
        if (typeof payload.averageScore === 'number' && !Number.isNaN(payload.averageScore)) {
          state.liveStats.averageScore = Number(payload.averageScore);
        }
        if (typeof payload.isRealAverage === 'boolean') {
          state.liveStats.isRealAverage = payload.isRealAverage;
        }
        state.liveStats.loaded = true;
        updateLiveStatsDom();
      }
    } catch {
      // Mantener actualización optimista
    }
  }

  function getParty(id) {
    return DATA.parties.find((p) => p.id === id) || DATA.parties[0];
  }

  function getAxis(id) {
    return DATA.axes.find((a) => a.id === id) || DATA.axes[0];
  }

  function shuffledCopy(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function getOrderedParties(mode) {
    const list = DATA.parties.slice();
    if (mode === 'alpha') {
      return list.sort((a, b) => a.shortName.localeCompare(b.shortName, 'es'));
    }
    if (mode === 'random') {
      return shuffledCopy(list);
    }
    return list.sort((a, b) => a.spectrumScore - b.spectrumScore);
  }

  function getShareOrigin() {
    if (window.location && window.location.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
    return 'https://politifacil-29n.vercel.app';
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback a execCommand
      }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(ta);
      return Boolean(copied);
    } catch {
      return false;
    }
  }

  function buildShareButtonsHtml(config) {
    const {
      shareUrl,
      shareText,
      copyBtnId,
      downloadBtnId = '',
      compact = false,
      shareContext = 'quiz',
    } = config;
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const sizeClass = compact ? ' btn-sm' : '';
    const rowClass = compact ? 'share-buttons-row share-buttons-row-compact' : 'share-buttons-row';

    return `
      <div class="${rowClass}">
        <a class="btn${sizeClass} btn-whatsapp" href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer" data-share-method="whatsapp" data-share-context="${escapeHtml(shareContext)}">WhatsApp</a>
        <a class="btn${sizeClass} btn-telegram" href="${escapeHtml(telegramHref)}" target="_blank" rel="noopener noreferrer" data-share-method="telegram" data-share-context="${escapeHtml(shareContext)}">Telegram</a>
        <a class="btn${sizeClass} btn-x" href="${escapeHtml(xHref)}" target="_blank" rel="noopener noreferrer" data-share-method="x" data-share-context="${escapeHtml(shareContext)}">Compartir en X</a>
        <button type="button" class="btn${sizeClass} btn-copy" id="${escapeHtml(copyBtnId)}">Copiar resumen</button>
        ${downloadBtnId ? `<button type="button" class="btn${sizeClass} btn-download-img" id="${escapeHtml(downloadBtnId)}">Descargar imagen PNG de mi Arco</button>` : ''}
      </div>
    `;
  }

  function bindCopyShareButton(buttonId, feedbackId, textToCopy, shareContext = 'quiz') {
    const btn = document.getElementById(buttonId);
    const feedback = document.getElementById(feedbackId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const ok = await copyTextToClipboard(textToCopy);
      trackEvent('share_result', { method: 'copy', context: shareContext });
      if (feedback) {
        feedback.textContent = ok
          ? '✓ Resumen copiado al portapapeles'
          : 'No se pudo copiar automáticamente; selecciona el enlace de la barra.';
      }
    });
    const row = btn.closest('.share-buttons-row') || btn.parentElement;
    if (row) {
      row.querySelectorAll('[data-share-method]').forEach((link) => {
        link.addEventListener('click', () => {
          trackEvent('share_result', {
            method: link.dataset.shareMethod,
            context: link.dataset.shareContext || shareContext,
          });
        });
      });
    }
  }

  /* ================= TEMA Y NAVEGACIÓN ================= */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = state.theme === 'dark' ? '☀' : '◐';
  }

  function parseUrlParams(isPopstate = false) {
    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || '').replace(/^#/, '').trim();
    const rawSection = params.get('section');

    let targetSection = 'arco-overview';
    if (rawSection && VALID_SECTIONS.includes(rawSection)) {
      targetSection = rawSection;
    } else if (!rawSection && VALID_SECTIONS.includes(hash)) {
      targetSection = hash;
    }

    const rawResult = params.get('resultado');
    if (rawResult !== null && rawResult !== '' && !Number.isNaN(Number(rawResult))) {
      const score = Math.max(0, Math.min(100, Math.round(Number(rawResult))));
      const rawTop = params.get('top');
      const partyId = rawTop && DATA.parties.some((p) => p.id === rawTop) ? rawTop : null;
      const rawAffinity = params.get('afinidad');
      const parsedAff = rawAffinity !== null && rawAffinity !== '' ? Number(rawAffinity) : NaN;
      const affinity = !Number.isNaN(parsedAff)
        ? Math.max(0, Math.min(100, Math.round(parsedAff)))
        : null;
      state.sharedResultPreview = { score, partyId, affinity };
      targetSection = 'test-afinidad';
    } else {
      state.sharedResultPreview = null;
    }

    state.activeSection = targetSection;

    const partyParam = params.get('party');
    const interviewSelect = document.getElementById('interview-party-filter');
    if (partyParam) {
      const existsInParties = DATA.parties.some((p) => p.id === partyParam);
      const hasInterviews = DATA.interviews.some((iv) => iv.partyId === partyParam);
      if (existsInParties) {
        state.selectedPartyId = partyParam;
      }
      if ((targetSection === 'entrevistas' && (existsInParties || hasInterviews)) || hasInterviews) {
        state.interviewParty = partyParam;
        urlControlledFlags.party = true;
        if (interviewSelect && Array.from(interviewSelect.options).some((o) => o.value === partyParam)) {
          interviewSelect.value = partyParam;
        }
      }
    } else if (isPopstate && urlControlledFlags.party) {
      state.interviewParty = 'all';
      urlControlledFlags.party = false;
      if (interviewSelect) interviewSelect.value = 'all';
    }

    const axisParam = params.get('axis');
    if (axisParam && DATA.axes.some((a) => a.id === axisParam)) {
      state.activeAxis = axisParam;
    }

    const leftParam = params.get('left');
    if (leftParam && DATA.parties.some((p) => p.id === leftParam)) {
      state.pairLeft = leftParam;
    }
    const rightParam = params.get('right');
    if (rightParam && DATA.parties.some((p) => p.id === rightParam)) {
      state.pairRight = rightParam;
    }

    if (params.get('blind') === '0') {
      state.blindMode = false;
      urlControlledFlags.blind = true;
    } else if (isPopstate && urlControlledFlags.blind) {
      state.blindMode = true;
      urlControlledFlags.blind = false;
    }

    if (state.blindMode) {
      ensureBlindOrderForAxis(state.activeAxis);
    }
  }

  function switchSection(sectionId, options = {}) {
    const { updateHistory = true, scroll = true } = options;
    const resolvedSection = VALID_SECTIONS.includes(sectionId) ? sectionId : 'arco-overview';
    state.activeSection = resolvedSection;

    document.querySelectorAll('.view-section').forEach((sec) => {
      const isMatch = sec.id === resolvedSection;
      sec.hidden = !isMatch;
      sec.classList.toggle('is-visible', isMatch);
    });
    document.querySelectorAll('.main-nav .nav-pill').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.section === resolvedSection);
    });

    if (SECTION_TITLES[resolvedSection]) {
      document.title = SECTION_TITLES[resolvedSection];
    }

    if (updateHistory && window.history && typeof window.history.pushState === 'function') {
      const pathname = window.location.pathname;
      if (pathname === '/' || pathname === '/index.html') {
        const params = new URLSearchParams(window.location.search);
        if (resolvedSection !== 'test-afinidad') {
          params.delete('resultado');
          params.delete('top');
          params.delete('afinidad');
        }
        if (resolvedSection !== 'comparador') {
          params.delete('axis');
          params.delete('left');
          params.delete('right');
          params.delete('blind');
        }
        if (resolvedSection !== 'arco-overview' && resolvedSection !== 'entrevistas') {
          params.delete('party');
        }
        if (resolvedSection === 'arco-overview') {
          params.delete('section');
        } else {
          params.set('section', resolvedSection);
        }
        const qs = params.toString();
        const nextUrl = qs ? `/?${qs}` : '/';
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextUrl !== currentUrl) {
          window.history.pushState({ section: resolvedSection }, '', nextUrl);
        }
      }
    }

    if (updateHistory) {
      trackEvent('section_view', {
        section_id: resolvedSection,
        page_path: window.location.pathname,
      });
    }

    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ================= SVG ARCO POLÍTICO ================= */
  function scoreToArcPoint(score, cx, cy, r) {
    const clamped = Math.max(0, Math.min(100, Number(score) || 0));
    const angle = Math.PI * (1 - clamped / 100); // 180° (izq) a 0° (der)
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
      angle,
    };
  }

  function buildPoliticalArcSvg(options) {
    const {
      selectedPartyId,
      userScore = null,
      interactive = true,
      width = 560,
      height = 310,
    } = options;

    const cx = width / 2;
    const cy = height - 48;
    const rMain = 185;
    const rOuter = 208;

    const segments = [
      { from: 0, to: 25, color: '#6d28d9' },
      { from: 25, to: 48, color: '#dc2626' },
      { from: 48, to: 75, color: '#0284c7' },
      { from: 75, to: 100, color: '#16a34a' },
    ];

    const arcPaths = segments
      .map((seg) => {
        const p1 = scoreToArcPoint(seg.from, cx, cy, rMain);
        const p2 = scoreToArcPoint(seg.to, cx, cy, rMain);
        return `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${rMain} ${rMain} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" stroke="${seg.color}" stroke-width="18" stroke-linecap="butt" opacity="0.22"/>`;
      })
      .join('');

    const sortedParties = DATA.parties.slice().sort((a, b) => a.spectrumScore - b.spectrumScore);

    const partyNodes = sortedParties
      .map((party, idx) => {
        const pt = scoreToArcPoint(party.spectrumScore, cx, cy, rMain);
        const labelRadius = idx % 2 === 0 ? rOuter + 24 : rMain - 36;
        const labelPt = scoreToArcPoint(party.spectrumScore, cx, cy, labelRadius);
        const isSelected = party.id === selectedPartyId;
        const radius = isSelected ? 15 : 11;
        const attrs = interactive
          ? `class="arc-node" tabindex="0" role="button" data-party-node="${escapeHtml(party.id)}" aria-label="Seleccionar ${escapeHtml(party.shortName)} (${party.spectrumScore}/100)"`
          : '';
        return `
          <g ${attrs}>
            <line x1="${pt.x.toFixed(1)}" y1="${pt.y.toFixed(1)}" x2="${labelPt.x.toFixed(1)}" y2="${labelPt.y.toFixed(1)}" stroke="${party.color}" stroke-width="1.4" opacity="0.55" />
            <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius + 5}" fill="${party.color}" opacity="${isSelected ? '0.24' : '0'}" />
            <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${radius}" fill="${party.color}" stroke="#ffffff" stroke-width="2.5" />
            <text x="${labelPt.x.toFixed(1)}" y="${labelPt.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11.5" font-weight="800" fill="currentColor">${escapeHtml(party.shortName)}</text>
          </g>
        `;
      })
      .join('');

    let userMarker = '';
    if (userScore !== null && !Number.isNaN(userScore)) {
      const uPt = scoreToArcPoint(userScore, cx, cy, rMain);
      const innerPt = scoreToArcPoint(userScore, cx, cy, 34);
      const tagPt = scoreToArcPoint(userScore, cx, cy, rMain - 64);
      userMarker = `
        <g aria-label="Tu posición en el arco político">
          <line x1="${innerPt.x.toFixed(1)}" y1="${innerPt.y.toFixed(1)}" x2="${uPt.x.toFixed(1)}" y2="${uPt.y.toFixed(1)}" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
          <circle cx="${cx}" cy="${cy}" r="8" fill="#f59e0b" />
          <circle cx="${uPt.x.toFixed(1)}" cy="${uPt.y.toFixed(1)}" r="11" fill="#f59e0b" stroke="#111827" stroke-width="2.5" />
          <rect x="${(tagPt.x - 58).toFixed(1)}" y="${(tagPt.y - 14).toFixed(1)}" width="116" height="26" rx="13" fill="#111827" stroke="#f59e0b" stroke-width="1.8" />
          <text x="${tagPt.x.toFixed(1)}" y="${(tagPt.y + 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" font-weight="800" fill="#fef3c7">TÚ: ${Math.round(userScore)}/100</text>
        </g>
      `;
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Arco político de izquierda a derecha">
        <path d="M ${cx - rMain} ${cy} A ${rMain} ${rMain} 0 0 1 ${cx + rMain} ${cy}" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="20" />
        ${arcPaths}
        <text x="${cx - rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">← Izquierda (0)</text>
        <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor" opacity="0.72">Centro (50)</text>
        <text x="${cx + rMain}" y="${cy + 26}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">Derecha (100) →</text>
        ${partyNodes}
        ${userMarker}
      </svg>
    `;
  }

  /* ================= SECCIÓN 1: ARCO Y COMUNICACIÓN ================= */
  function renderOverviewSection() {
    const arcWrap = document.getElementById('overview-arc-container');
    arcWrap.innerHTML = buildPoliticalArcSvg({
      selectedPartyId: state.selectedPartyId,
      interactive: true,
    });

    arcWrap.querySelectorAll('[data-party-node]').forEach((node) => {
      node.addEventListener('click', () => {
        state.selectedPartyId = node.dataset.partyNode;
        trackEvent('party_inspect', { party_id: state.selectedPartyId, action: 'arc_select' });
        renderOverviewSection();
      });
      node.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          state.selectedPartyId = node.dataset.partyNode;
          trackEvent('party_inspect', { party_id: state.selectedPartyId, action: 'arc_select' });
          renderOverviewSection();
        }
      });
    });

    renderPartyDetailPanel(getParty(state.selectedPartyId));
    renderPartyCardsGrid();
    renderTerritorialGrid();
  }

  function renderPartyDetailPanel(party) {
    const panel = document.getElementById('party-detail-panel');
    const comm = party.officialCommunication;
    panel.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="party-badge-pill">
            <span class="color-swatch" style="background:${escapeHtml(party.color)}"></span>
            <span>${escapeHtml(party.name)} (${escapeHtml(party.shortName)})</span>
          </div>
          <p class="muted-text">Candidato/a: <strong>${escapeHtml(party.candidate)}</strong> · ${escapeHtml(party.ideologyLabel)}</p>
        </div>
        <a class="btn btn-sm" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer">Web oficial ↗</a>
      </div>

      <p style="margin:0 0 10px 0; font-size:0.9rem;">${escapeHtml(party.summary)}</p>

      <div class="axis-meter">
        <div class="meter-row">
          <span>Eje Izq → Der</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${party.spectrumScore}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${party.spectrumScore}/100</strong>
        </div>
        <div class="meter-row">
          <span>Interv. Estatal</span>
          <div class="meter-track">
            <div class="meter-fill" style="width:${100 - party.economicAxis}%; background:${escapeHtml(party.color)};"></div>
          </div>
          <strong>${100 - party.economicAxis}/100</strong>
        </div>
      </div>

      <div class="comm-box">
        <h4>Estilo de comunicación oficial (Web y campaña)</h4>
        <ul class="comm-list">
          <li><strong>Eslóganes:</strong> ${comm.slogans.map((s) => `«${escapeHtml(s)}»`).join(' · ')}</li>
          <li><strong>Tono y registro:</strong> ${escapeHtml(comm.tone)}</li>
          <li><strong>Encuadre (framing):</strong> ${escapeHtml(comm.framing)}</li>
          <li><strong>Canales prioritarios:</strong> ${escapeHtml(comm.channels)}</li>
        </ul>
        <div class="tag-cloud">
          ${comm.keywords.map((kw) => `<span class="tag"># ${escapeHtml(kw)}</span>`).join('')}
        </div>
      </div>

      <div class="comm-box">
        <h4>Cómo se expresa en entrevistas</h4>
        <p class="muted-text" style="font-size:0.84rem;">${escapeHtml(party.interviewStyle.summary)}</p>
      </div>

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" type="button" data-action="inspect-proposals" data-id="${escapeHtml(party.id)}">Ver propuestas en comparador</button>
        <button class="btn btn-sm" type="button" data-action="inspect-interviews" data-id="${escapeHtml(party.id)}">Ver entrevistas</button>
      </div>
    `;

    panel.querySelector('[data-action="inspect-proposals"]').addEventListener('click', () => {
      if (!state.visiblePartyIds.includes(party.id)) {
        state.visiblePartyIds.push(party.id);
      }
      state.pairLeft = party.id;
      trackEvent('party_inspect', { party_id: party.id, action: 'inspect_proposals' });
      switchSection('comparador');
      renderComparatorSection();
    });

    panel.querySelector('[data-action="inspect-interviews"]').addEventListener('click', () => {
      state.interviewParty = party.id;
      const selectEl = document.getElementById('interview-party-filter');
      if (selectEl) selectEl.value = party.id;
      trackEvent('party_inspect', { party_id: party.id, action: 'inspect_interviews' });
      switchSection('entrevistas');
      renderInterviewsSection();
    });
  }

  function renderPartyCardsGrid() {
    const grid = document.getElementById('party-cards-grid');
    const ordered = getOrderedParties(state.sortMode);
    grid.innerHTML = ordered
      .map(
        (party) => `
      <article class="card party-card" style="--party-color:${escapeHtml(party.color)}">
        <div class="party-card-top">
          <div>
            <span class="chip">${escapeHtml(party.ideologyLabel)}</span>
            <h3 style="margin-top:8px;">${escapeHtml(party.shortName)} · ${escapeHtml(party.candidate)}</h3>
          </div>
          <span class="chip" title="Posición en escala 0 (izquierda) a 100 (derecha)">Arco: ${party.spectrumScore}/100</span>
        </div>
        <p class="muted-text">${escapeHtml(party.summary)}</p>
        <div class="comm-box" style="margin-top:4px;">
          <h4>Sello comunicativo</h4>
          <p class="muted-text" style="font-size:0.82rem;">${escapeHtml(party.officialCommunication.tone)}</p>
        </div>
        <div class="party-card-actions">
          <a class="source-link" href="${escapeHtml(party.officialUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:0.82rem;">Programa / Web oficial ↗</a>
          <button class="btn btn-sm" type="button" data-select-party="${escapeHtml(party.id)}">Analizar ficha</button>
        </div>
      </article>
    `
      )
      .join('');

    grid.querySelectorAll('[data-select-party]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedPartyId = btn.dataset.selectParty;
        trackEvent('party_inspect', { party_id: state.selectedPartyId, action: 'card_select' });
        renderOverviewSection();
        document.getElementById('overview-arc-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  function renderTerritorialGrid() {
    const grid = document.getElementById('territorial-grid');
    if (!grid) return;
    grid.innerHTML = (DATA.territorialParties || [])
      .map(
        (tp) => `
      <article class="territorial-item" style="--party-color:${escapeHtml(tp.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
          <strong>${escapeHtml(tp.shortName)}</strong>
          <span class="chip" style="font-size:0.72rem;">${escapeHtml(tp.territory)}</span>
        </div>
        <p class="muted-text" style="font-size:0.8rem; margin-bottom:6px;">
          <strong>Referente:</strong> ${escapeHtml(tp.candidate)} · ${escapeHtml(tp.spectrumLabel)}
        </p>
        <p style="margin:0 0 6px 0; font-size:0.84rem;">${escapeHtml(tp.priorities)}</p>
        <p class="muted-text" style="font-size:0.79rem;"><strong>Papel 29-N:</strong> ${escapeHtml(tp.parliamentaryRole)}</p>
      </article>
    `
      )
      .join('');
  }

  /* ================= SECCIÓN 2: COMPARADOR ================= */
  function ensureBlindOrderForAxis(axisId) {
    if (!state.blindOrderMap[axisId]) {
      state.blindOrderMap[axisId] = shuffledCopy(DATA.parties.map((p) => p.id));
    }
    return state.blindOrderMap[axisId];
  }

  function initComparatorControls() {
    const pairLeft = document.getElementById('pair-left');
    const pairRight = document.getElementById('pair-right');
    const optionsHtml = DATA.parties
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.shortName)} (${escapeHtml(p.candidate)})</option>`)
      .join('');
    pairLeft.innerHTML = optionsHtml;
    pairRight.innerHTML = optionsHtml;
    pairLeft.value = state.pairLeft;
    pairRight.value = state.pairRight;

    pairLeft.addEventListener('change', () => {
      state.pairLeft = pairLeft.value;
      trackEvent('comparator_interaction', {
        action: 'pair_change',
        pair_left: state.pairLeft,
        pair_right: state.pairRight,
        axis_id: state.activeAxis,
      });
      renderSimilarityPanel();
    });
    pairRight.addEventListener('change', () => {
      state.pairRight = pairRight.value;
      trackEvent('comparator_interaction', {
        action: 'pair_change',
        pair_left: state.pairLeft,
        pair_right: state.pairRight,
        axis_id: state.activeAxis,
      });
      renderSimilarityPanel();
    });

    const blindToggle = document.getElementById('blind-mode-toggle');
    blindToggle.checked = state.blindMode;
    if (state.blindMode) {
      ensureBlindOrderForAxis(state.activeAxis);
    }
    blindToggle.addEventListener('change', () => {
      state.blindMode = blindToggle.checked;
      state.blindRevealed = false;
      if (state.blindMode) {
        ensureBlindOrderForAxis(state.activeAxis);
      }
      trackEvent('comparator_interaction', {
        action: 'blind_mode_toggle',
        blind_mode: state.blindMode,
        axis_id: state.activeAxis,
      });
      renderComparatorSection();
    });

    document.getElementById('blind-reveal-btn').addEventListener('click', () => {
      state.blindRevealed = true;
      trackEvent('blind_reveal', { total_picks: countBlindPicks() });
      renderBlindRevealResults();
    });

    document.getElementById('blind-reset-btn').addEventListener('click', () => {
      state.blindPicks = {};
      state.blindRevealed = false;
      saveState();
      renderComparatorSection();
    });
  }

  function renderComparatorSection() {
    // 1. Tabs de ejes
    const axisTabs = document.getElementById('axis-tabs');
    axisTabs.innerHTML = DATA.axes
      .map(
        (axis) => `
      <button type="button" role="tab" aria-selected="${axis.id === state.activeAxis}" class="axis-tab ${axis.id === state.activeAxis ? 'is-active' : ''}" data-axis="${escapeHtml(axis.id)}">
        ${escapeHtml(axis.icon)} ${escapeHtml(axis.label)}
      </button>
    `
      )
      .join('');
    axisTabs.querySelectorAll('.axis-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeAxis = btn.dataset.axis;
        if (state.blindMode) ensureBlindOrderForAxis(state.activeAxis);
        trackEvent('comparator_interaction', {
          action: 'axis_change',
          axis_id: state.activeAxis,
          blind_mode: state.blindMode,
        });
        renderComparatorSection();
      });
    });

    // 2. Pills de partidos visibles
    const pillsEl = document.getElementById('comparator-party-pills');
    pillsEl.innerHTML = DATA.parties
      .map((party) => {
        const selected = state.visiblePartyIds.includes(party.id);
        return `
        <button type="button" class="party-toggle-pill ${selected ? 'is-selected' : ''}" style="--party-color:${escapeHtml(party.color)}" data-toggle-party="${escapeHtml(party.id)}">
          <span class="dot" style="background:${escapeHtml(party.color)}"></span>
          <span>${escapeHtml(party.shortName)}</span>
        </button>
      `;
      })
      .join('');
    pillsEl.querySelectorAll('[data-toggle-party]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleParty;
        if (state.visiblePartyIds.includes(id)) {
          if (state.visiblePartyIds.length > 1) {
            state.visiblePartyIds = state.visiblePartyIds.filter((x) => x !== id);
          }
        } else {
          state.visiblePartyIds.push(id);
        }
        renderComparatorSection();
      });
    });

    // Sincronizar selects
    document.getElementById('pair-left').value = state.pairLeft;
    document.getElementById('pair-right').value = state.pairRight;

    // 3. Similitudes y diferencias
    renderSimilarityPanel();

    // 4. Barra de modo ciego e intro
    const blindBar = document.getElementById('blind-summary-bar');
    const blindIntro = document.getElementById('blind-intro-banner');
    const revealCard = document.getElementById('blind-reveal-results');
    const blindToggle = document.getElementById('blind-mode-toggle');
    if (blindToggle) blindToggle.checked = state.blindMode;
    if (blindIntro) blindIntro.hidden = !state.blindMode;
    blindBar.hidden = !state.blindMode;
    if (!state.blindMode || !state.blindRevealed) {
      revealCard.hidden = true;
    } else {
      renderBlindRevealResults();
    }
    updateBlindPicksCounter();

    // 5. Tarjetas de propuestas
    renderProposalsGrid();
  }

  function renderSimilarityPanel() {
    const panel = document.getElementById('similarity-panel');
    const axis = getAxis(state.activeAxis);
    const comp = DATA.axisComparisons[state.activeAxis] || { similarities: [], differences: [] };
    const left = getParty(state.pairLeft);
    const right = getParty(state.pairRight);
    const leftProp = left.proposals[state.activeAxis];
    const rightProp = right.proposals[state.activeAxis];

    const pairDiffHtml = state.blindMode
      ? `<p class="muted-text" style="margin-top:8px;">Desactiva el <strong>Modo Sin Sesgos</strong> para ver el contraste nominal entre dos siglas concretas.</p>`
      : `
        <div style="margin-top:8px; display:grid; gap:8px; font-size:0.84rem;">
          <div>
            <strong style="color:${escapeHtml(left.color)}">${escapeHtml(left.shortName)}:</strong>
            <span>${escapeHtml(leftProp.headline)}</span>
          </div>
          <div>
            <strong style="color:${escapeHtml(right.color)}">${escapeHtml(right.shortName)}:</strong>
            <span>${escapeHtml(rightProp.headline)}</span>
          </div>
          <p class="muted-text" style="font-size:0.8rem;">
            Distancia en arco político: <strong>${Math.abs(left.spectrumScore - right.spectrumScore)} puntos</strong> (sobre 100).
          </p>
        </div>
      `;

    panel.innerHTML = `
      <div class="sim-card sim-card-converge">
        <h3>En qué se parecen (${escapeHtml(axis.label)})</h3>
        <ul>
          ${comp.similarities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="sim-card sim-card-diverge">
        <h3>En qué se diferencian</h3>
        <ul>
          ${comp.differences.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      <div class="sim-card sim-card-pair">
        <h3>Cara a cara rápido</h3>
        ${pairDiffHtml}
      </div>
    `;
  }

  function countBlindPicks() {
    let total = 0;
    Object.values(state.blindPicks).forEach((axisMap) => {
      Object.values(axisMap || {}).forEach((val) => {
        if (val) total += 1;
      });
    });
    return total;
  }

  function updateBlindPicksCounter() {
    const el = document.getElementById('blind-picks-count');
    if (!el) return;
    const n = countBlindPicks();
    el.textContent = `${n} ${n === 1 ? 'preferencia marcada' : 'preferencias marcadas'}`;
  }

  function renderBlindRevealResults() {
    const card = document.getElementById('blind-reveal-results');
    const counts = {};
    DATA.parties.forEach((p) => {
      counts[p.id] = 0;
    });
    let totalPicks = 0;
    Object.values(state.blindPicks).forEach((axisMap) => {
      Object.entries(axisMap || {}).forEach(([partyId, picked]) => {
        if (picked && counts[partyId] !== undefined) {
          counts[partyId] += 1;
          totalPicks += 1;
        }
      });
    });

    if (totalPicks === 0) {
      card.hidden = false;
      card.innerHTML = `
        <h3>Aún no has marcado ninguna opción</h3>
        <p class="muted-text">Pulsa el botón «★ Me convence» en las propuestas que prefieras (puedes cambiar de eje temático arriba) y vuelve a revelar.</p>
      `;
      return;
    }

    const ranked = DATA.parties
      .map((p) => ({
        party: p,
        picks: counts[p.id],
        pct: Math.round((counts[p.id] / totalPicks) * 100),
      }))
      .sort((a, b) => b.picks - a.picks);

    const blindShareUrl = `${getShareOrigin()}/?section=comparador`;
    const blindShareText = `He comparado las propuestas oficiales del 29-N SIN VER SIGLAS NI COLORES y mi mayor coincidencia fue con ${ranked[0].party.shortName} (${ranked[0].pct}% de ${totalPicks} selecciones). Haz la prueba a ciegas aquí:`;
    const blindFullShareText = `${blindShareText} ${blindShareUrl}`;

    card.hidden = false;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h3>Resultado de tu Lectura a Ciegas (${totalPicks} selecciones)</h3>
          <p class="muted-text">Estos son los partidos detrás de las propuestas que elegiste sin ver siglas:</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span class="chip chip-neutral">Mayor coincidencia: ${escapeHtml(ranked[0].party.shortName)} (${ranked[0].pct}%)</span>
          <button type="button" class="btn btn-sm" id="reveal-show-cards-btn">Mostrar siglas también en las tarjetas</button>
        </div>
      </div>
      <div class="reveal-bars">
        ${ranked
          .map(
            (r) => `
          <div class="affinity-row">
            <div class="affinity-row-head">
              <span>${escapeHtml(r.party.shortName)} · ${escapeHtml(r.party.candidate)}</span>
              <span>${r.picks} selecciones (${r.pct}%)</span>
            </div>
            <div class="affinity-bar-track">
              <div class="affinity-bar-fill" style="width:${r.pct}%; background:${escapeHtml(r.party.color)};"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="blind-share-wrap">
        <p class="muted-text" style="font-weight:700; font-size:0.84rem;">Comparte tu lectura a ciegas:</p>
        ${buildShareButtonsHtml({
          shareUrl: blindShareUrl,
          shareText: blindShareText,
          copyBtnId: 'blind-copy-share-btn',
          compact: true,
          shareContext: 'blind_comparator',
        })}
        <p class="share-feedback" id="blind-share-feedback" aria-live="polite"></p>
      </div>
    `;

    bindCopyShareButton('blind-copy-share-btn', 'blind-share-feedback', blindFullShareText, 'blind_comparator');

    const showCardsBtn = document.getElementById('reveal-show-cards-btn');
    if (showCardsBtn) {
      showCardsBtn.addEventListener('click', () => {
        state.blindMode = false;
        state.blindRevealed = false;
        renderComparatorSection();
      });
    }
  }

  function renderProposalsGrid() {
    const grid = document.getElementById('proposals-grid');
    const axisId = state.activeAxis;
    const axis = getAxis(axisId);
    const blindLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    let orderedIds = DATA.parties
      .filter((p) => state.visiblePartyIds.includes(p.id))
      .sort((a, b) => a.spectrumScore - b.spectrumScore)
      .map((p) => p.id);

    if (state.blindMode) {
      const blindOrder = ensureBlindOrderForAxis(axisId);
      orderedIds = blindOrder.filter((id) => state.visiblePartyIds.includes(id));
    }

    grid.innerHTML = orderedIds
      .map((partyId, index) => {
        const party = getParty(partyId);
        const prop = party.proposals[axisId];
        const isStarred = Boolean(state.blindPicks[axisId] && state.blindPicks[axisId][partyId]);
        const headerBadge = state.blindMode
          ? `<span class="chip">Opción ${blindLetters[index] || index + 1} · ${escapeHtml(axis.label)}</span>`
          : `<div class="party-badge-pill"><span class="color-swatch" style="background:${escapeHtml(party.color)}"></span><span>${escapeHtml(party.shortName)}</span></div>
             <span class="chip">${escapeHtml(party.candidate)}</span>`;

        const footerSource = state.blindMode
          ? `<span class="muted-text">Fuente oficial oculta en modo ciego</span>`
          : `<a class="source-link" href="${escapeHtml(prop.sourceUrl || party.officialUrl)}" target="_blank" rel="noopener noreferrer">Fuente: ${escapeHtml(prop.sourceLabel || party.officialUrl)} ↗</a>`;

        const starBtn = state.blindMode
          ? `<button type="button" class="star-btn ${isStarred ? 'is-starred' : ''}" data-star-party="${escapeHtml(partyId)}">${isStarred ? '★ Seleccionada' : '☆ Me convence'}</button>`
          : `<span class="chip" style="font-size:0.72rem;">Arco ${party.spectrumScore}/100</span>`;

        return `
          <article class="card proposal-card ${state.blindMode ? 'is-blind' : ''}" style="--party-color:${escapeHtml(party.color)}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              ${headerBadge}
            </div>
            <div class="proposal-headline">${escapeHtml(prop.headline)}</div>
            <ul class="proposal-points">
              ${prop.points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('')}
            </ul>
            <div class="proposal-footer">
              ${footerSource}
              ${starBtn}
            </div>
          </article>
        `;
      })
      .join('');

    grid.querySelectorAll('[data-star-party]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.starParty;
        if (!state.blindPicks[axisId]) state.blindPicks[axisId] = {};
        state.blindPicks[axisId][pid] = !state.blindPicks[axisId][pid];
        saveState();
        trackEvent('blind_pick_toggle', {
          axis_id: axisId,
          party_id: pid,
          selected: Boolean(state.blindPicks[axisId][pid]),
          total_picks: countBlindPicks(),
        });
        updateBlindPicksCounter();
        renderProposalsGrid();
        if (state.blindRevealed) renderBlindRevealResults();
      });
    });
  }

  /* ================= SECCIÓN 3: ENTREVISTAS SIN SESGO ================= */
  function initInterviewFilters() {
    const partySelect = document.getElementById('interview-party-filter');
    const formatSelect = document.getElementById('interview-format-filter');
    const topicSelect = document.getElementById('interview-topic-filter');
    const searchInput = document.getElementById('interview-search-input');

    const candidateParties = DATA.parties.concat(
      (DATA.territorialParties || []).filter((tp) =>
        DATA.interviews.some((iv) => iv.partyId === tp.id)
      )
    );

    partySelect.innerHTML =
      '<option value="all">Todos los candidatos</option>' +
      candidateParties
        .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.candidate)} (${escapeHtml(p.shortName)})</option>`)
        .join('');

    if (Array.from(partySelect.options).some((opt) => opt.value === state.interviewParty)) {
      partySelect.value = state.interviewParty;
    } else {
      state.interviewParty = 'all';
      partySelect.value = 'all';
    }

    const topics = Array.from(new Set(DATA.interviews.map((iv) => iv.topic))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    topicSelect.innerHTML =
      '<option value="all">Todos los temas</option>' +
      topics.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

    partySelect.addEventListener('change', () => {
      state.interviewParty = partySelect.value;
      trackEvent('interview_filter', { filter_type: 'party', filter_value: state.interviewParty });
      renderInterviewsSection();
    });
    formatSelect.addEventListener('change', () => {
      state.interviewFormat = formatSelect.value;
      trackEvent('interview_filter', { filter_type: 'format', filter_value: state.interviewFormat });
      renderInterviewsSection();
    });
    topicSelect.addEventListener('change', () => {
      state.interviewTopic = topicSelect.value;
      trackEvent('interview_filter', { filter_type: 'topic', filter_value: state.interviewTopic });
      renderInterviewsSection();
    });
    searchInput.addEventListener('input', () => {
      state.interviewSearch = searchInput.value.trim().toLowerCase();
      renderInterviewsSection();
    });
  }

  function findAnyParty(id) {
    return (
      DATA.parties.find((p) => p.id === id) ||
      (DATA.territorialParties || []).find((tp) => tp.id === id) ||
      { shortName: id.toUpperCase(), candidate: '', color: '#64748b' }
    );
  }

  function renderInterviewsSection() {
    const expGrid = document.getElementById('expression-grid');
    expGrid.innerHTML = DATA.parties
      .map(
        (p) => `
      <div class="expression-item" style="--party-color:${escapeHtml(p.color)}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
          <strong>${escapeHtml(p.candidate)}</strong>
          <span class="chip" style="font-size:0.72rem;">${escapeHtml(p.shortName)}</span>
        </div>
        <p class="muted-text" style="font-size:0.82rem; margin-bottom:8px;">${escapeHtml(p.interviewStyle.summary)}</p>
        <div style="font-size:0.78rem; color:var(--text);">
          <strong>Registro:</strong> ${escapeHtml(p.interviewStyle.register)}
        </div>
      </div>
    `
      )
      .join('');

    const filtered = DATA.interviews.filter((iv) => {
      if (state.interviewParty !== 'all' && iv.partyId !== state.interviewParty) return false;
      if (state.interviewFormat !== 'all' && iv.formatType !== state.interviewFormat) return false;
      if (state.interviewTopic !== 'all' && iv.topic !== state.interviewTopic) return false;
      if (state.interviewSearch) {
        const hay = [iv.candidate, iv.media, iv.program, iv.questionContext, iv.quote, iv.topic, iv.expressionStyle]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(state.interviewSearch)) return false;
      }
      return true;
    });

    const meta = document.getElementById('interviews-meta');
    meta.textContent = `Mostrando ${filtered.length} de ${DATA.interviews.length} declaraciones directas en entrevistas (0 columnas de opinión).`;

    const grid = document.getElementById('interviews-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="card">
          <h3>Sin resultados con estos filtros</h3>
          <p class="muted-text">Prueba cambiando el candidato, el tipo de medio o borrando el término de búsqueda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((iv) => {
        const p = findAnyParty(iv.partyId);
        return `
        <article class="card interview-card" style="--party-color:${escapeHtml(p.color)}">
          <div class="interview-meta">
            <div>
              <strong>${escapeHtml(iv.candidate)}</strong>
              <span class="muted-text"> · ${escapeHtml(p.shortName)}</span>
            </div>
            <span class="chip">${escapeHtml(iv.formatType)}</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.78rem;">
            <span class="chip">${escapeHtml(iv.media)} — ${escapeHtml(iv.program)}</span>
            <span class="chip">${escapeHtml(iv.date)}</span>
            <span class="chip">Tema: ${escapeHtml(iv.topic)}</span>
          </div>
          <div class="interview-question">
            <strong>Pregunta / Contexto:</strong> ${escapeHtml(iv.questionContext)}
          </div>
          <blockquote class="interview-quote">“${escapeHtml(iv.quote)}”</blockquote>
          <div class="interview-footer">
            <span class="tag">Estilo: ${escapeHtml(iv.expressionStyle)}</span>
            <a class="source-link" href="${escapeHtml(iv.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver medio ↗</a>
          </div>
        </article>
      `;
      })
      .join('');
  }

  /* ================= SECCIÓN 4: TEST DE 10 ESCENARIOS ================= */
  function calculateQuizResults() {
    const questions = DATA.quizQuestions;
    let weightedSum = 0;
    let totalWeight = 0;

    const partyDistances = {};
    const maxPossiblePartyDist = {};
    DATA.parties.forEach((p) => {
      partyDistances[p.id] = 0;
      maxPossiblePartyDist[p.id] = 0;
    });

    const breakdown = [];

    questions.forEach((q) => {
      const ans = state.quizAnswers[q.id];
      const optIdx = ans && typeof ans.optionIndex === 'number' ? ans.optionIndex : 2;
      const weight = ans && ans.priority ? 2 : 1;
      const opt = q.options[optIdx] || q.options[0];

      weightedSum += opt.spectrumScore * weight;
      totalWeight += weight;

      DATA.parties.forEach((p) => {
        const optAlignment = opt.partyAlignment && opt.partyAlignment[p.id] !== undefined
          ? opt.partyAlignment[p.id]
          : Math.max(0, 100 - Math.abs(opt.spectrumScore - p.spectrumScore));
        partyDistances[p.id] += optAlignment * weight;
        maxPossiblePartyDist[p.id] += 100 * weight;
      });

      breakdown.push({
        question: q,
        option: opt,
        priority: Boolean(ans && ans.priority),
      });
    });

    const userSpectrumScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

    const rankings = DATA.parties
      .map((p) => {
        const directFit = maxPossiblePartyDist[p.id] > 0
          ? (partyDistances[p.id] / maxPossiblePartyDist[p.id]) * 100
          : 0;
        const arcFit = Math.max(0, 100 - Math.abs(userSpectrumScore - p.spectrumScore) * 1.15);
        const combined = Math.round(directFit * 0.72 + arcFit * 0.28);
        return {
          party: p,
          affinity: Math.max(5, Math.min(99, combined)),
        };
      })
      .sort((a, b) => b.affinity - a.affinity);

    return {
      userSpectrumScore,
      rankings,
      breakdown,
    };
  }

  function describeSpectrumZone(score) {
    if (score < 18) return 'Izquierda transformadora / estatalista';
    if (score < 32) return 'Izquierda progresista y ecologista';
    if (score < 45) return 'Centro-izquierda socialdemócrata';
    if (score <= 57) return 'Centro pragmático / transversal';
    if (score <= 74) return 'Centro-derecha liberal-conservadora';
    if (score <= 86) return 'Derecha conservadora-soberanista';
    return 'Derecha soberanista / desreguladora';
  }

  function getQuestionOptionOrder(question) {
    const existing = state.quizOptionOrders[question.id];
    const valid =
      Array.isArray(existing) &&
      existing.length === question.options.length &&
      question.options.every((_, idx) => existing.includes(idx));
    if (valid) {
      return existing;
    }
    const indices = question.options.map((_, idx) => idx);
    const shuffled = shuffledCopy(indices);
    state.quizOptionOrders[question.id] = shuffled;
    saveState();
    return shuffled;
  }

  function buildTextProgressBar(pct, length = 10) {
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    const filled = Math.round((clamped / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function triggerImageDownload(url, filename, revokeAfter) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (revokeAfter) {
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function downloadQuizResultImage(res, zoneLabel) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const roundedScore = Math.round(res.userSpectrumScore);
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

    // 1. Fondo elegante oscuro con gradiente radial
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    const bgGrad = ctx.createRadialGradient(420, 260, 40, 560, 315, 760);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Tarjeta interior limpia
    drawRoundedRect(ctx, 34, 30, width - 68, height - 60, 24);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.stroke();

    // 3. Cabecera y título principal
    ctx.fillStyle = '#93c5fd';
    ctx.font = `700 16px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('PolitiFácil 29-N · Test a Ciegas (Sin siglas)', 66, 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 14px ${fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText('Elecciones Generales · 29 de noviembre de 2026', width - 66, 74);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `800 34px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(`Tu posición en el arco: ${roundedScore}/100`, 66, 122, width - 132);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 19px ${fontFamily}`;
    ctx.fillText(zoneLabel, 66, 154, width - 132);

    // 4. Semicircunferencia del arco político a la izquierda
    const cx = 335;
    const cy = 466;
    const rMain = 166;

    // Pista base del arco
    ctx.beginPath();
    ctx.arc(cx, cy, rMain, Math.PI, Math.PI * 2, false);
    ctx.lineWidth = 22;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.stroke();

    // 4 tramos de color
    const segments = [
      { from: 0, to: 25, color: '#6d28d9' },
      { from: 25, to: 48, color: '#dc2626' },
      { from: 48, to: 75, color: '#0284c7' },
      { from: 75, to: 100, color: '#16a34a' },
    ];
    ctx.save();
    ctx.globalAlpha = 0.42;
    segments.forEach((seg) => {
      const startA = Math.PI + (seg.from / 100) * Math.PI;
      const endA = Math.PI + (seg.to / 100) * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, rMain, startA, endA, false);
      ctx.lineWidth = 20;
      ctx.strokeStyle = seg.color;
      ctx.stroke();
    });
    ctx.restore();

    // Etiquetas de los extremos
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 13px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('← Izquierda (0)', cx - rMain, cy + 30);
    ctx.fillText('Centro (50)', cx, cy + 30);
    ctx.fillText('Derecha (100) →', cx + rMain, cy + 30);

    // Nodos de los 6 partidos y etiquetas sin solaparse
    const sortedParties = DATA.parties.slice().sort((a, b) => a.spectrumScore - b.spectrumScore);
    const labelAngleAdjustDeg = {
      vox: 5.5,
      salf: -5.5,
    };

    sortedParties.forEach((party) => {
      const pt = scoreToArcPoint(party.spectrumScore, cx, cy, rMain);
      const adjRad = ((labelAngleAdjustDeg[party.id] || 0) * Math.PI) / 180;
      const labelAngle = pt.angle + adjRad;
      const labelRadius = rMain + 44;
      const lx = cx + labelRadius * Math.cos(labelAngle);
      const ly = cy - labelRadius * Math.sin(labelAngle);

      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(lx, ly);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = party.color;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = party.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#f1f5f9';
      ctx.font = `700 13.5px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      if (Math.cos(labelAngle) < -0.25) {
        ctx.textAlign = 'right';
        ctx.fillText(party.shortName, lx - 6, ly);
      } else if (Math.cos(labelAngle) > 0.25) {
        ctx.textAlign = 'left';
        ctx.fillText(party.shortName, lx + 6, ly);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(party.shortName, lx, ly - 8);
      }
    });

    // Aguja dorada destacada del usuario
    const uPt = scoreToArcPoint(res.userSpectrumScore, cx, cy, rMain);
    const tagPt = scoreToArcPoint(res.userSpectrumScore, cx, cy, 92);
    const tagY = Math.min(cy - 34, tagPt.y);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(uPt.x, uPt.y);
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(uPt.x, uPt.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    const badgeW = 122;
    const badgeH = 30;
    drawRoundedRect(ctx, tagPt.x - badgeW / 2, tagY - badgeH / 2, badgeW, badgeH, 15);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = `800 13px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`TÚ: ${roundedScore}/100`, tagPt.x, tagY + 0.5);

    // 5. Top 4 de partidos a la derecha
    const rightX = 648;
    const rightW = 482;

    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 19px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Top 4 afinidad programática', rightX, 206);

    const top4 = res.rankings.slice(0, 4);
    top4.forEach((item, idx) => {
      const rowY = 224 + idx * 78;
      const rowH = 66;

      drawRoundedRect(ctx, rightX, rowY, rightW, rowH, 12);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightX + 20, rowY + 23, 6, 0, Math.PI * 2);
      ctx.fillStyle = item.party.color;
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 16px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${item.party.shortName} · ${item.affinity}%`, rightX + 34, rowY + 23);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 13px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(item.party.candidate, rightX + rightW - 16, rowY + 23);

      const barX = rightX + 16;
      const barY = rowY + 42;
      const barW = rightW - 32;
      const barH = 10;

      drawRoundedRect(ctx, barX, barY, barW, barH, 5);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.fill();

      const fillW = Math.max(12, Math.round((item.affinity / 100) * barW));
      drawRoundedRect(ctx, barX, barY, fillW, barH, 5);
      ctx.fillStyle = item.party.color;
      ctx.fill();
    });

    // 6. Pie inferior
    ctx.beginPath();
    ctx.moveTo(66, 548);
    ctx.lineTo(width - 66, 548);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 14.5px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Basado en programas oficiales · Haz tu test sin sesgos en politifacil-29n.vercel.app',
      width / 2,
      574
    );

    const feedbackEl = document.getElementById('quiz-share-feedback');
    const notifyDone = () => {
      if (feedbackEl) {
        feedbackEl.textContent = '✓ Imagen descargada (mi-arco-politico-29n.png)';
      }
    };

    trackEvent('share_result', {
      method: 'download_png',
      context: 'quiz',
      user_score: roundedScore,
      top_party: res.rankings[0].party.id,
    });

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          triggerImageDownload(objectUrl, 'mi-arco-politico-29n.png', true);
          notifyDone();
        } else {
          triggerImageDownload(canvas.toDataURL('image/png'), 'mi-arco-politico-29n.png', false);
          notifyDone();
        }
      }, 'image/png');
    } else {
      triggerImageDownload(canvas.toDataURL('image/png'), 'mi-arco-politico-29n.png', false);
      notifyDone();
    }
  }

  function renderQuizSection() {
    const stage = document.getElementById('quiz-stage');
    if (!stage) return;
    const questions = DATA.quizQuestions;

    if (state.quizCompleted) {
      renderQuizResults(stage);
      return;
    }

    let sharedBannerHtml = '';
    if (state.sharedResultPreview && !state.quizCompleted) {
      const preview = state.sharedResultPreview;
      const previewParty = preview.partyId ? getParty(preview.partyId) : null;
      let affinityText = '';
      if (previewParty && preview.affinity !== null) {
        affinityText = ` (mayor afinidad: <strong>${escapeHtml(previewParty.shortName)}</strong>, ${preview.affinity}%)`;
      } else if (previewParty) {
        affinityText = ` (mayor afinidad: <strong>${escapeHtml(previewParty.shortName)}</strong>)`;
      }
      sharedBannerHtml = `
        <div class="shared-result-banner" role="region" aria-label="Resultado compartido de un contacto">
          <div class="shared-result-banner-body">
            <span class="shared-banner-badge">🧭 Resultado compartido</span>
            <p>
              Tu contacto se sitúa en el punto <strong>${preview.score}/100</strong> del arco político${affinityText}.
              Responde estos 10 escenarios sin ver siglas y compara tu resultado.
            </p>
          </div>
          <button type="button" class="shared-banner-close" id="shared-banner-close-btn" aria-label="Ocultar aviso de resultado compartido">✕</button>
        </div>
      `;
    }

    const q = questions[state.quizIndex] || questions[0];
    const optionOrder = getQuestionOptionOrder(q);
    const currentAns = state.quizAnswers[q.id] || {};
    const selectedIdx = typeof currentAns.optionIndex === 'number' ? currentAns.optionIndex : null;
    const isPriority = Boolean(currentAns.priority);
    const pct = Math.round(((state.quizIndex + 1) / questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D', 'E'];

    stage.innerHTML = `
      ${sharedBannerHtml}

      <div class="quiz-progress-wrap">
        <div class="quiz-progress-meta">
          <span>Escenario ${state.quizIndex + 1} de ${questions.length} · ${escapeHtml(q.axisLabel)}</span>
          <span>${pct}% completado</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="scenario-box">
        <span class="chip">${escapeHtml(q.axisLabel)}</span>
        <h2 class="scenario-title">${escapeHtml(q.title)}</h2>
        <p style="margin:0; font-size:0.98rem;">${escapeHtml(q.scenario)}</p>
      </div>

      <div class="options-stack" role="radiogroup" aria-label="Opciones del escenario ${state.quizIndex + 1}">
        ${optionOrder
          .map((origIdx, visualPos) => {
            const opt = q.options[origIdx];
            const isSel = selectedIdx === origIdx;
            return `
          <button type="button" role="radio" aria-checked="${isSel}" class="option-btn ${isSel ? 'is-selected' : ''}" data-option-idx="${origIdx}">
            <span class="option-letter">${letters[visualPos] || visualPos + 1}</span>
            <span>${escapeHtml(opt.text)}</span>
          </button>
        `;
          })
          .join('')}
      </div>

      <div class="quiz-footer-bar">
        <label class="priority-check">
          <input type="checkbox" id="quiz-priority-check" ${isPriority ? 'checked' : ''} />
          <span>Este tema es prioritario para mi voto (peso x2)</span>
        </label>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-ghost" id="quiz-prev-btn" ${state.quizIndex === 0 ? 'disabled' : ''}>← Anterior</button>
          <button type="button" class="btn btn-primary" id="quiz-next-btn" ${selectedIdx === null ? 'disabled' : ''}>
            ${state.quizIndex === questions.length - 1 ? 'Ver mi posición en el arco →' : 'Siguiente escenario →'}
          </button>
        </div>
      </div>
    `;

    const closeBannerBtn = document.getElementById('shared-banner-close-btn');
    if (closeBannerBtn) {
      closeBannerBtn.addEventListener('click', () => {
        state.sharedResultPreview = null;
        renderQuizSection();
      });
    }

    stage.querySelectorAll('[data-option-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.optionIdx);
        const isFirstAnswer = Object.keys(state.quizAnswers).length === 0;
        const priorityChecked = Boolean(document.getElementById('quiz-priority-check').checked);
        if (isFirstAnswer) {
          trackEvent('quiz_start', {
            first_question_id: q.id,
            axis_label: q.axisLabel,
          });
        }
        state.quizAnswers[q.id] = {
          optionIndex: idx,
          priority: priorityChecked,
        };
        saveState();
        trackEvent('quiz_step_answer', {
          question_id: q.id,
          step_number: state.quizIndex + 1,
          axis_label: q.axisLabel,
          priority: priorityChecked,
        });
        renderQuizSection();
      });
    });

    const priorityCheckbox = document.getElementById('quiz-priority-check');
    priorityCheckbox.addEventListener('change', () => {
      if (state.quizAnswers[q.id]) {
        state.quizAnswers[q.id].priority = priorityCheckbox.checked;
        saveState();
      }
    });

    document.getElementById('quiz-prev-btn').addEventListener('click', () => {
      if (state.quizIndex > 0) {
        state.quizIndex -= 1;
        saveState();
        renderQuizSection();
      }
    });

    document.getElementById('quiz-next-btn').addEventListener('click', () => {
      if (selectedIdx === null) return;
      if (state.quizIndex < questions.length - 1) {
        state.quizIndex += 1;
      } else {
        state.quizCompleted = true;
        const res = calculateQuizResults();
        trackEvent('quiz_complete', {
          user_score: Math.round(res.userSpectrumScore),
          zone_label: describeSpectrumZone(res.userSpectrumScore),
          top_party: res.rankings[0].party.id,
          top_affinity: res.rankings[0].affinity,
          second_party: res.rankings[1].party.id,
          second_affinity: res.rankings[1].affinity,
        });
        submitQuizCompletionStats(res);
      }
      saveState();
      renderQuizSection();
    });
  }

  function renderQuizResults(stage) {
    const res = calculateQuizResults();
    const top1 = res.rankings[0];
    const top2 = res.rankings[1];
    const zoneLabel = describeSpectrumZone(res.userSpectrumScore);
    const roundedScore = Math.round(res.userSpectrumScore);

    const totalCountEs = formatNumberEs(state.liveStats.totalParticipants);
    const avgScoreEs = formatScoreEs(state.liveStats.averageScore);

    const shareUrl = `${getShareOrigin()}/?section=test-afinidad&resultado=${roundedScore}&top=${encodeURIComponent(top1.party.id)}&afinidad=${top1.affinity}`;
    const shareText = `He hecho el Test a Ciegas del 29-N (sin ver siglas) en PolitiFácil: me sitúa en el punto ${roundedScore}/100 (${zoneLabel}) frente a una media nacional de ${avgScoreEs}/100 entre ${totalCountEs} participantes. Mayor afinidad: ${top1.party.shortName} (${top1.affinity}%) y ${top2.party.shortName} (${top2.affinity}%). ¿Dónde te sitúa a ti? 👇`;
    const barsLines = res.rankings
      .map((item) => `${item.party.shortName.padEnd(14, ' ')} ${buildTextProgressBar(item.affinity)} ${item.affinity}%`)
      .join('\n');
    const copySummaryText = [
      '🧭 Mi Brújula Electoral 29-N (Test a Ciegas en PolitiFácil)',
      `Posición en el arco: ${roundedScore}/100 (${zoneLabel}) · Media de ${totalCountEs} participantes: ${avgScoreEs}/100`,
      '',
      'Afinidad programática (sin ver siglas):',
      barsLines,
      '',
      'Haz tu test sin sesgos y compara tu resultado:',
      shareUrl,
    ].join('\n');

    stage.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <span class="eyebrow">Resultado de tus 10 escenarios</span>
          <h2>Tu posición en el arco: ${roundedScore}/100 · ${escapeHtml(zoneLabel)}</h2>
          <p class="muted-text">Mayor afinidad programática con <strong>${escapeHtml(top1.party.shortName)} (${top1.affinity}%)</strong> y <strong>${escapeHtml(top2.party.shortName)} (${top2.affinity}%)</strong>.</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" id="compare-top2-btn">Comparar ${escapeHtml(top1.party.shortName)} vs ${escapeHtml(top2.party.shortName)}</button>
          <button type="button" class="btn" id="quiz-restart-btn">Repetir test</button>
        </div>
      </div>

      <div id="national-avg-comparison-slot" data-user-score="${roundedScore}">
        ${renderNationalAvgComparisonHtml(roundedScore)}
      </div>

      <div class="results-hero">
        <div class="arc-svg-wrap">
          ${buildPoliticalArcSvg({
            selectedPartyId: top1.party.id,
            userScore: res.userSpectrumScore,
            interactive: false,
          })}
        </div>

        <div>
          <h3 style="margin-bottom:10px;">Afinidad por partido (%)</h3>
          <div class="affinity-list">
            ${res.rankings
              .map(
                (item) => `
              <div class="affinity-row">
                <div class="affinity-row-head">
                  <span>${escapeHtml(item.party.shortName)} · ${escapeHtml(item.party.candidate)}</span>
                  <span>${item.affinity}%</span>
                </div>
                <div class="affinity-bar-track">
                  <div class="affinity-bar-fill" style="width:${item.affinity}%; background:${escapeHtml(item.party.color)};"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="viral-share-card">
        <h3>Comparte tu brújula 29-N (y reta a otros sin sesgos)</h3>
        <p class="muted-text">Envía tu enlace con tu puntuación en el arco para que tus contactos respondan los 10 escenarios sin ver siglas ni colores y comparen su posición contigo.</p>
        ${buildShareButtonsHtml({
          shareUrl,
          shareText,
          copyBtnId: 'quiz-copy-share-btn',
          downloadBtnId: 'quiz-download-png-btn',
          compact: false,
          shareContext: 'quiz',
        })}
        <p class="share-feedback" id="quiz-share-feedback" aria-live="polite"></p>
      </div>

      <div>
        <h3>Desglose escenario por escenario</h3>
        <p class="muted-text">Comprueba qué partidos defienden en su programa oficial la respuesta que elegiste en cada situación.</p>
        <div class="breakdown-table-wrap">
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Eje / Escenario</th>
                <th>Tu elección</th>
                <th>Partidos más cercanos en este punto</th>
              </tr>
            </thead>
            <tbody>
              ${res.breakdown
                .map((row, idx) => {
                  const alignedNames = (row.option.alignedParties || [])
                    .map((pid) => getParty(pid).shortName)
                    .join(', ');
                  return `
                  <tr>
                    <td><strong>${idx + 1}</strong>${row.priority ? ' ★' : ''}</td>
                    <td><strong>${escapeHtml(row.question.axisLabel)}</strong><br/><span class="muted-text">${escapeHtml(row.question.title)}</span></td>
                    <td>${escapeHtml(row.option.text)}</td>
                    <td><span class="chip">${escapeHtml(alignedNames || 'Transversal')}</span></td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindCopyShareButton('quiz-copy-share-btn', 'quiz-share-feedback', copySummaryText, 'quiz');

    const downloadPngBtn = document.getElementById('quiz-download-png-btn');
    if (downloadPngBtn) {
      downloadPngBtn.addEventListener('click', () => {
        downloadQuizResultImage(res, zoneLabel);
      });
    }

    document.getElementById('quiz-restart-btn').addEventListener('click', () => {
      state.quizAnswers = {};
      state.quizOptionOrders = {};
      state.quizIndex = 0;
      state.quizCompleted = false;
      try {
        window.localStorage.removeItem(QUIZ_COUNTED_KEY);
      } catch {
        // Ignorar errores de almacenamiento
      }
      saveState();
      trackEvent('quiz_restart', { action: 'restart' });
      renderQuizSection();
    });

    document.getElementById('compare-top2-btn').addEventListener('click', () => {
      state.blindMode = false;
      const blindToggle = document.getElementById('blind-mode-toggle');
      if (blindToggle) blindToggle.checked = false;
      state.pairLeft = top1.party.id;
      state.pairRight = top2.party.id;
      state.visiblePartyIds = [top1.party.id, top2.party.id];
      trackEvent('comparator_interaction', {
        action: 'compare_top2',
        pair_left: top1.party.id,
        pair_right: top2.party.id,
      });
      switchSection('comparador');
      renderComparatorSection();
    });
  }

  /* ================= INICIALIZACIÓN ================= */
  function bindGlobalEvents() {
    document.querySelectorAll('.main-nav .nav-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchSection(btn.dataset.section);
      });
    });

    document.querySelectorAll('[data-jump]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        if (btn.tagName === 'A') ev.preventDefault();
        switchSection(btn.dataset.jump);
      });
    });

    document.querySelectorAll('.sort-control .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.sortMode = btn.dataset.sort;
        document.querySelectorAll('.sort-control .seg-btn').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        renderPartyCardsGrid();
      });
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      saveState();
    });

    window.addEventListener('popstate', () => {
      parseUrlParams(true);
      renderOverviewSection();
      renderComparatorSection();
      renderInterviewsSection();
      renderQuizSection();
      switchSection(state.activeSection, { updateHistory: false, scroll: false });
    });
  }

  function updateCountdown() {
    const el = document.getElementById('election-countdown');
    if (!el) return;
    const election = new Date('2026-11-29T09:00:00+01:00');
    const now = new Date();
    const diffDays = Math.ceil((election.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      el.textContent = `Faltan ${diffDays} días para el 29-N · 350 escaños al Congreso`;
    } else if (diffDays === 0) {
      el.textContent = 'Hoy es la jornada electoral 29-N · Colegios de 9:00 a 20:00 h';
    } else {
      el.textContent = 'Elecciones Generales 29 de noviembre de 2026';
    }
  }

  function init() {
    loadSavedState();
    parseUrlParams(false);
    trackAiReferralOnce();
    applyTheme();
    updateCountdown();
    bindGlobalEvents();
    initComparatorControls();
    initInterviewFilters();

    renderOverviewSection();
    renderComparatorSection();
    renderInterviewsSection();
    renderQuizSection();
    updateLiveStatsDom();
    fetchLiveStats();
    switchSection(state.activeSection, { updateHistory: false, scroll: false });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
