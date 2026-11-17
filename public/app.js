/* global window */
(function () {
  'use strict';

  const DATA = window.ELECTION_DATA;
  if (!DATA) {
    console.error('No se encontró window.ELECTION_DATA');
    return;
  }

  const STORAGE_KEY = 'politifacil_29n_state_v1';

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

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  /* ================= TEMA Y NAVEGACIÓN ================= */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = state.theme === 'dark' ? '☀' : '◐';
  }

  function switchSection(sectionId) {
    state.activeSection = sectionId;
    document.querySelectorAll('.view-section').forEach((sec) => {
      const isMatch = sec.id === sectionId;
      sec.hidden = !isMatch;
      sec.classList.toggle('is-visible', isMatch);
    });
    document.querySelectorAll('.main-nav .nav-pill').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.section === sectionId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        renderOverviewSection();
      });
      node.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          state.selectedPartyId = node.dataset.partyNode;
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
      switchSection('comparador');
      renderComparatorSection();
    });

    panel.querySelector('[data-action="inspect-interviews"]').addEventListener('click', () => {
      state.interviewParty = party.id;
      const selectEl = document.getElementById('interview-party-filter');
      if (selectEl) selectEl.value = party.id;
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
      renderSimilarityPanel();
    });
    pairRight.addEventListener('change', () => {
      state.pairRight = pairRight.value;
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
      renderComparatorSection();
    });

    document.getElementById('blind-reveal-btn').addEventListener('click', () => {
      state.blindRevealed = true;
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
    `;

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

    const topics = Array.from(new Set(DATA.interviews.map((iv) => iv.topic))).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    topicSelect.innerHTML =
      '<option value="all">Todos los temas</option>' +
      topics.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

    partySelect.addEventListener('change', () => {
      state.interviewParty = partySelect.value;
      renderInterviewsSection();
    });
    formatSelect.addEventListener('change', () => {
      state.interviewFormat = formatSelect.value;
      renderInterviewsSection();
    });
    topicSelect.addEventListener('change', () => {
      state.interviewTopic = topicSelect.value;
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

  function renderQuizSection() {
    const stage = document.getElementById('quiz-stage');
    const questions = DATA.quizQuestions;

    if (state.quizCompleted) {
      renderQuizResults(stage);
      return;
    }

    const q = questions[state.quizIndex] || questions[0];
    const optionOrder = getQuestionOptionOrder(q);
    const currentAns = state.quizAnswers[q.id] || {};
    const selectedIdx = typeof currentAns.optionIndex === 'number' ? currentAns.optionIndex : null;
    const isPriority = Boolean(currentAns.priority);
    const pct = Math.round(((state.quizIndex + 1) / questions.length) * 100);
    const letters = ['A', 'B', 'C', 'D', 'E'];

    stage.innerHTML = `
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

    stage.querySelectorAll('[data-option-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.optionIdx);
        state.quizAnswers[q.id] = {
          optionIndex: idx,
          priority: Boolean(document.getElementById('quiz-priority-check').checked),
        };
        saveState();
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

    stage.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <span class="eyebrow">Resultado de tus 10 escenarios</span>
          <h2>Tu posición en el arco: ${Math.round(res.userSpectrumScore)}/100 · ${escapeHtml(zoneLabel)}</h2>
          <p class="muted-text">Mayor afinidad programática con <strong>${escapeHtml(top1.party.shortName)} (${top1.affinity}%)</strong> y <strong>${escapeHtml(top2.party.shortName)} (${top2.affinity}%)</strong>.</p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" id="compare-top2-btn">Comparar ${escapeHtml(top1.party.shortName)} vs ${escapeHtml(top2.party.shortName)}</button>
          <button type="button" class="btn" id="quiz-restart-btn">Repetir test</button>
        </div>
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

    document.getElementById('quiz-restart-btn').addEventListener('click', () => {
      state.quizAnswers = {};
      state.quizOptionOrders = {};
      state.quizIndex = 0;
      state.quizCompleted = false;
      saveState();
      renderQuizSection();
    });

    document.getElementById('compare-top2-btn').addEventListener('click', () => {
      state.blindMode = false;
      const blindToggle = document.getElementById('blind-mode-toggle');
      if (blindToggle) blindToggle.checked = false;
      state.pairLeft = top1.party.id;
      state.pairRight = top2.party.id;
      state.visiblePartyIds = [top1.party.id, top2.party.id];
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
      btn.addEventListener('click', () => {
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
    applyTheme();
    updateCountdown();
    bindGlobalEvents();
    initComparatorControls();
    initInterviewFilters();

    renderOverviewSection();
    renderComparatorSection();
    renderInterviewsSection();
    renderQuizSection();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
