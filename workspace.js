/* TripBridge workspace upgrades — Partnership Case, Market MI, CEPA/Invest, Meeting Pack */
(function () {
  if (!window.TBCase) {
    console.error('case-engine.js required');
    return;
  }
  const TB = window.TBCase;
  const STORAGE = 'tripbridge-poc-v2';
  const LEGACY = 'tripbridge-poc-v1';

  function migrateInto(s) {
    if (!s.cases) s.cases = [];
    if (!Array.isArray(s.cases)) s.cases = [];
    // Prefer v2 snapshot fields if present in localStorage and in-memory lacks cases
    if (!s.cases.length) {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(STORAGE)); } catch (e) { raw = null; }
      if (raw && Array.isArray(raw.cases) && raw.cases.length) {
        s.cases = raw.cases;
        s.activeCaseId = raw.activeCaseId || raw.cases[0].id;
      }
    }
    if (!s.cases.length && (s.case || s.profile)) {
      const p = s.profile || {};
      const legacy = s.case || {};
      const obj = mapGoalToObjective(p.goal, p.role || s.role);
      const c = TB.createCase({
        id: legacy.id || undefined,
        companyName: p.companyName || '',
        companyRole: p.companyRole || 'exporter',
        objective: obj,
        sector: legacy.sector || p.sector || null,
        productDescription: legacy.productDescription || legacy.product || p.productDescription || '',
        originCountry: s.role === 'indonesian' ? 'Indonesia' : 'Germany',
        targetCountry: s.role === 'indonesian' ? 'Germany' : 'Indonesia',
        targetCity: legacy.targetCity || p.targetCity || 'all',
        stage: p.stage || 'exploring'
      });
      if (legacy.partnerId) c.selectedPartners = [legacy.partnerId];
      if (Array.isArray(s.tradechecks) && s.tradechecks.length && c.path === 'trade') {
        s.tradechecks.forEach(i => {
          if (c.tradePreparation.checklist[i]) c.tradePreparation.checklist[i].status = 'completed';
        });
      }
      s.cases = [c];
      s.activeCaseId = c.id;
    }
    if (s.cases.length && !s.activeCaseId) s.activeCaseId = s.cases[0].id;
    return s;
  }

  function mapGoalToObjective(goal, role) {
    const g = String(goal || '');
    if (/invest|joint|JV/i.test(g)) return role === 'indonesian' ? 'attract_investment' : 'invest';
    if (/distribut/i.test(g)) return 'find_distributor';
    if (/supplier|manufacturer/i.test(g)) return 'find_supplier';
    if (/buyer/i.test(g)) return 'find_buyers';
    if (/technolog/i.test(g)) return 'find_tech_partner';
    if (/Attract foreign/i.test(g)) return 'attract_investment';
    return role === 'indonesian' ? 'find_buyers' : 'find_distributor';
  }

  function persist() {
    localStorage.setItem(STORAGE, JSON.stringify(window.state));
    // keep v1 mirror for older tabs (best-effort)
    try { localStorage.setItem(LEGACY, JSON.stringify(window.state)); } catch (e) {}
  }

  function activeCase() {
    const s = window.state;
    if (!s.cases) s.cases = [];
    let c = s.cases.find(x => x.id === s.activeCaseId);
    if (!c && s.cases.length) {
      s.activeCaseId = s.cases[0].id;
      c = s.cases[0];
    }
    return c || null;
  }

  function touchCase(c) {
    if (!c) return;
    c.updatedAt = new Date().toISOString();
    // mirror legacy fields for any leftover code
    window.state.case = {
      product: c.productDescription,
      productDescription: c.productDescription,
      sector: c.sector,
      targetCity: c.targetCity,
      partnerId: c.selectedPartners[0] || null,
      directionIndex: c.originCountry === 'Indonesia' ? 1 : 0,
      started: true,
      id: c.id
    };
  }

  function ensureCase() {
    let c = activeCase();
    if (!c) {
      const p = window.state.profile || {};
      c = TB.createCase({
        companyName: p.companyName || '',
        companyRole: p.companyRole || 'exporter',
        objective: mapGoalToObjective(p.goal, window.state.role),
        sector: p.sector || null,
        productDescription: p.productDescription || '',
        originCountry: window.state.role === 'indonesian' ? 'Indonesia' : 'Germany',
        targetCountry: window.state.role === 'indonesian' ? 'Germany' : 'Indonesia',
        targetCity: p.targetCity || 'all',
        stage: p.stage || 'exploring'
      });
      window.state.cases.push(c);
      window.state.activeCaseId = c.id;
    }
    touchCase(c);
    return c;
  }

  function setActiveCase(id) {
    if (!window.state.cases.find(x => x.id === id)) return;
    window.state.activeCaseId = id;
    touchCase(activeCase());
    persist();
    render();
  }

  function createNewCaseFromProfile(extra = {}) {
    const p = window.state.profile || {};
    const c = TB.createCase({
      companyName: extra.companyName || p.companyName || '',
      companyRole: extra.companyRole || p.companyRole || 'exporter',
      objective: extra.objective || mapGoalToObjective(p.goal, window.state.role),
      sector: extra.sector || p.sector || null,
      productDescription: extra.productDescription || p.productDescription || '',
      originCountry: window.state.role === 'indonesian' ? 'Indonesia' : 'Germany',
      targetCountry: window.state.role === 'indonesian' ? 'Germany' : 'Indonesia',
      targetCity: extra.targetCity || p.targetCity || 'all',
      stage: extra.stage || p.stage || 'exploring'
    });
    window.state.cases.push(c);
    window.state.activeCaseId = c.id;
    touchCase(c);
    persist();
    return c;
  }

  function casePartner() {
    const c = ensureCase();
    const id = c.selectedPartners[0];
    return id ? companies.find(x => x.id === id) : null;
  }

  function criticalTradeOpen() {
    const c = ensureCase();
    if (TB.isInvestmentPath(c)) {
      return (c.tradePreparation.checklist || [])
        .filter(x => x.applicable && !['completed', 'not_applicable'].includes(x.status))
        .filter(x => ['mandatory', 'critical', 'blocking'].includes((TB.investTaskMeta(x.id).sev || '')))
        .map(x => ({ id: x.id, sev: TB.investTaskMeta(x.id).sev, key: x.id }));
    }
    return (c.tradePreparation.checklist || [])
      .filter(x => x.applicable && !['completed', 'not_applicable'].includes(x.status))
      .filter(x => ['mandatory', 'critical', 'blocking'].includes((TB.tradeTaskMeta(x.id).sev || '')))
      .map(x => ({ id: x.id, sev: TB.tradeTaskMeta(x.id).sev, key: x.id }));
  }

  function cepaStats() {
    const c = ensureCase();
    const list = (c.tradePreparation.checklist || []).filter(x => x.applicable);
    const done = list.filter(x => x.status === 'completed' || x.status === 'not_applicable').length;
    const open = criticalTradeOpen();
    return { total: list.length, done, pct: list.length ? Math.round(done / list.length * 100) : 0, open };
  }

  function strategyLabel(id) {
    const map = {
      distributor: 'Local distributor', agent: 'Commercial agent', direct: 'Direct B2B sales',
      presence: 'Local presence / JV', minority: 'Minority investment', jv: 'Joint venture',
      fdi: 'Direct investment', acquire: 'Acquisition / strategic partnership'
    };
    return map[id] || id || 'Not selected';
  }

  function renderCaseStrip(nodeId) {
    const node = byId(nodeId);
    if (!node) return;
    const c = ensureCase();
    const partner = casePartner();
    const stats = cepaStats();
    const next = TB.nextAction(c);
    const product = c.productDescription || c.sector || 'Product TBD';
    const city = c.targetCity && c.targetCity !== 'all' ? c.targetCity : c.targetCountry;
    const tradeLbl = TB.isInvestmentPath(c)
      ? (stats.pct ? `Investment prep: ${stats.pct}%` : 'Investment prep: Not started')
      : (c.tradePreparation.classificationStatus === 'unverified' ? 'Trade prep: Classification unverified' : `Trade prep: ${stats.pct}%`);
    node.innerHTML = `<div class="case-strip">
      <div style="flex:1;min-width:220px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
          <span class="case-chip">Partnership Case</span>
          <select class="case-select" onchange="setActiveCase(this.value)" aria-label="Active case">
            ${window.state.cases.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${safe(x.companyName || x.sector || x.id)} · ${safe(x.productDescription || x.sector || '')}</option>`).join('')}
          </select>
          <button class="btn small outline" style="background:transparent;color:#fff;border-color:#ffffff55" onclick="newPartnershipCase()">+ New case</button>
        </div>
        <strong>${safe(product)}</strong>
        <span class="muted"> · ${safe(c.originCountry)} → ${safe(c.targetCountry)} · ${safe(city)} · Partner: ${partner ? safe(partner.name) : 'Not selected'} · ${tradeLbl}</span>
      </div>
      <button class="btn secondary" onclick="go('${next.page}')">${safe(next.label)} →</button>
    </div>`;
  }

  function renderCaseBar() {
    renderCaseStrip('caseBar');
    const node = byId('caseBar');
    if (node && (window.state.onboardingComplete || ensureCase())) node.style.display = 'block';
  }

  function renderTradeCaseStrip() { renderCaseStrip('tradeCaseStrip'); }
  function renderMarketCaseStrip() { renderCaseStrip('marketCaseStrip'); }

  function scoreClass(s) {
    if (s === 'favorable') return 'favorable';
    if (s === 'mixed') return 'mixed';
    if (s === 'challenging') return 'challenging';
    return 'insufficient';
  }

  function renderMarket() {
    renderMarketCaseStrip();
    const wrap = byId('marketWorkspace');
    if (!wrap) return;
    const c = ensureCase();
    const map = { Machinery: 'Machinery & manufacturing', 'Food technology': 'Food technology', 'Renewable energy': 'Renewable energy', Packaging: 'Packaging' };
    if (c.sector && map[c.sector]) byId('marketSector').value = map[c.sector];
    byId('marketDirection').selectedIndex = c.originCountry === 'Indonesia' ? 1 : 0;

    const pack = TB.getMarketPack(c);
    const invest = TB.isInvestmentPath(c);
    const strategies = invest ? [
      { id: 'minority', title: 'Minority investment', how: 'Acquire a non-controlling stake.', pros: 'Lower capital; local partner leads ops.', risks: 'Limited control; exit complexity.', investigate: ['Cap table', 'Shareholder agreement', 'KBLI fit'] },
      { id: 'jv', title: 'Joint venture', how: 'Create or join a shared entity.', pros: 'Shared risk and market access.', risks: 'Governance disputes; licensing.', investigate: ['Ownership caps', 'Board rights', 'IP'] },
      { id: 'fdi', title: 'Direct investment (PT PMA)', how: 'Establish foreign-owned presence.', pros: 'Control of operations.', risks: 'Licensing cost; time to operate.', investigate: ['BKPM conditions', 'Capital', 'Management'] },
      { id: 'acquire', title: 'Acquisition / strategic partnership', how: 'Buy or ally with an operating company.', pros: 'Speed to market.', risks: 'Due-diligence gaps; integration.', investigate: ['Financial DD', 'Licences', 'Liabilities'] }
    ] : pack.strategies;

    const criteria = c.partnerCriteria || [];
    const questions = c.marketResearch.questions.length ? c.marketResearch.questions : (pack.questions || []).slice(0, 4);
    const evidence = (pack.demandBullets || []).slice(0, 3);
    const barriers = (pack.barriers || []).concat(pack.competition || []).slice(0, 4);
    const city = c.targetCity && c.targetCity !== 'all' ? c.targetCity : c.targetCountry;
    const needsService = !criteria.some(x => /after-sales|install|service/i.test(x));

    wrap.innerHTML = `
      <div class="card mi-overview">
        <div class="split"><h2>${safe(c.productDescription || c.sector || 'Market opportunity')}</h2><span class="badge">${safe(c.sector || 'Sector')}</span></div>
        <p class="mi-kicker">${safe(c.companyName || 'Your company')} · ${safe(String(c.objective).replace(/_/g, ' '))} · ${safe(c.originCountry)} → ${safe(city)}</p>
        <p style="margin:0;line-height:1.65;color:#3d5163;max-width:820px">${safe(pack.overview)}</p>
        <div class="mi-meta"><span class="status-pill sourced">sourced</span> <a href="${pack.overviewSource.url}" target="_blank" rel="noopener">${safe(pack.overviewSource.name)}</a></div>
        <div class="mi-sources" aria-label="Validate with official sources">
          <a href="https://policy.trade.ec.europa.eu/eu-trade-relationships-country-and-region/countries-and-regions/indonesia/eu-indonesia-agreements_en" target="_blank" rel="noopener">EU–Indonesia agreements</a>
          <a href="https://trade.ec.europa.eu/access-to-markets/en/home" target="_blank" rel="noopener">Access2Markets</a>
          <a href="https://www.gtai.de/" target="_blank" rel="noopener">GTAI</a>
          <a href="https://www.insw.go.id/" target="_blank" rel="noopener">INSW</a>
        </div>
      </div>

      <div class="mi-grid">
        <div class="card">
          <h3 style="margin:0 0 4px;font-size:15px">Evidence of demand</h3>
          <p class="muted" style="margin:0 0 6px;font-size:12px">Attributed signals only — no invented statistics.</p>
          <ul class="mi-list">
            ${evidence.map(b => `<li><span class="mi-dot ${b.status === 'sourced' ? '' : b.status === 'unavailable' ? 'muted' : 'warn'}"></span><div>${safe(b.text)}<div class="mi-meta">${safe(b.source)} · <span class="status-pill ${b.status === 'sourced' ? 'sourced' : b.status === 'unavailable' ? 'unavailable' : 'hypothesis'}">${b.status}</span></div></div></li>`).join('')}
          </ul>
          <div class="mi-actions">
            <button class="btn small outline" onclick="saveKeyFindings()">Save evidence to case</button>
          </div>
        </div>
        <div class="card">
          <h3 style="margin:0 0 4px;font-size:15px">Barriers & structure</h3>
          <p class="muted" style="margin:0 0 6px;font-size:12px">What to validate before committing.</p>
          <ul class="mi-list">
            ${barriers.map(item => `<li><span class="mi-dot ${item.status === 'sourced' || item.status === 'sourced-task' ? '' : 'warn'}"></span><div><strong>${safe(item.title)}</strong><div style="color:#5a6f82;margin-top:2px">${safe(item.text)}</div></div></li>`).join('')}
          </ul>
          ${needsService ? `<div class="mi-actions"><button class="btn small outline" onclick="addPartnerCriterion('installation and after-sales service')">Add after-sales to partner criteria</button></div>` : `<div class="mi-actions"><span class="cp-pill">${safe(criteria.join(' · '))}</span></div>`}
        </div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 4px;font-size:15px">${invest ? 'Investment approach' : 'Market-entry strategy'}</h3>
        <p class="muted" style="margin:0 0 12px;font-size:12px">Select one preferred path. Legal feasibility still needs verification.</p>
        <div class="mi-cards">
          ${strategies.map(s => `
            <button type="button" class="strategy-opt ${c.entryStrategy === s.id ? 'selected' : ''}" onclick="selectEntryStrategy('${s.id}')" aria-pressed="${c.entryStrategy === s.id}">
              <h4>${safe(s.title)}</h4>
              <p>${safe(s.how)}</p>
              <div class="mi-more">
                <p><strong>Upside:</strong> ${safe(s.pros)}</p>
                <p><strong>Risk:</strong> ${safe(s.risks)}</p>
                <p><strong>Check:</strong> ${(s.investigate || []).map(safe).join('; ')}</p>
              </div>
            </button>`).join('')}
        </div>
      </div>

      <div class="mi-grid">
        <div class="card">
          <h3 style="margin:0 0 4px;font-size:15px">Opportunity assessment</h3>
          <p class="muted" style="margin:0 0 8px;font-size:12px">Qualitative labels — not scores.</p>
          <div class="mi-assess">
            ${(pack.assessment || []).map(a => `
              <div class="mi-assess-row">
                <div><strong>${safe(a.dim)}</strong><small>${safe(a.why)}</small></div>
                <span class="status-pill ${scoreClass(a.score)}">${safe(a.score)}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3 style="margin:0 0 4px;font-size:15px">Open questions</h3>
          <p class="muted" style="margin:0 0 8px;font-size:12px">Carry these into partner meetings.</p>
          ${questions.map(q => `<div class="mi-q"><span>${safe(q)}</span></div>`).join('')}
          <div class="mi-actions">
            <button class="btn small outline" onclick="addAllMeetingQuestions()">Add questions to Meeting Pack</button>
          </div>
        </div>
      </div>

      <div class="brief-box">
        <div>
          <h3>Next step</h3>
          <ul class="brief-lines">
            <li><strong>Entry:</strong> ${c.entryStrategy ? safe(strategyLabel(c.entryStrategy)) : 'Select a strategy above'}</li>
            <li><strong>Risk focus:</strong> ${(pack.barriers || []).slice(0, 2).map(b => b.title).join('; ') || 'Validate barriers'}</li>
            <li><strong>Criteria:</strong> ${criteria.length ? safe(criteria.join(', ')) : 'Optional — add partner requirements'}</li>
          </ul>
        </div>
        <button class="btn" onclick="continueFromMarket()">${invest ? 'Continue to Investment Preparation' : 'Continue to Trade Preparation'} →</button>
      </div>`;
  }

  function saveKeyFindings() {
    const c = ensureCase();
    const pack = TB.getMarketPack(c);
    (pack.demandBullets || []).filter(b => b.status === 'sourced').forEach(b => {
      if (!c.marketResearch.findings.includes(b.text)) c.marketResearch.findings.push(b.text);
    });
    touchCase(c); persist(); toast('Key evidence saved to case'); renderMarket();
  }

  function addAllMeetingQuestions() {
    const c = ensureCase();
    const pack = TB.getMarketPack(c);
    const qs = c.marketResearch.questions.length ? c.marketResearch.questions : (pack.questions || []);
    qs.slice(0, 4).forEach(q => {
      if (!c.tradePreparation.unresolvedQuestions.includes(q)) c.tradePreparation.unresolvedQuestions.push(q);
    });
    touchCase(c); persist(); toast('Questions added to Meeting Pack');
  }

  function selectEntryStrategy(id) {
    const c = ensureCase();
    c.entryStrategy = id;
    c.marketResearch.status = 'in_progress';
    touchCase(c); persist(); renderMarket(); toast('Entry strategy saved to case');
  }

  function saveFinding(text) {
    const c = ensureCase();
    if (!c.marketResearch.findings.includes(text)) c.marketResearch.findings.push(text);
    touchCase(c); persist(); toast('Saved to Partnership Case'); renderMarket();
  }

  function addResearchQuestion(q) {
    const c = ensureCase();
    if (!c.marketResearch.questions.includes(q)) c.marketResearch.questions.push(q);
    touchCase(c); persist(); toast('Research task added'); renderMarket();
  }

  function addPartnerCriterion(crit) {
    const c = ensureCase();
    if (!c.partnerCriteria.includes(crit)) c.partnerCriteria.push(crit);
    touchCase(c); persist(); toast('Added to partner criteria'); renderMarket(); renderPartners();
  }

  function addMeetingQuestion(q) {
    const c = ensureCase();
    if (!c.tradePreparation.unresolvedQuestions.includes(q)) c.tradePreparation.unresolvedQuestions.push(q);
    touchCase(c); persist(); toast('Added to meeting pack questions');
  }

  function continueFromMarket() {
    const c = ensureCase();
    if (TB.isInvestmentPath(c)) go('readiness');
    else go('trade');
  }

  function newPartnershipCase() {
    const name = prompt('New case — company or label?', window.state.profile?.companyName || 'New partnership');
    if (name === null) return;
    createNewCaseFromProfile({ companyName: name.trim() || 'New partnership' });
    go('market');
    toast('New Partnership Case created');
  }

  function syncCaseToTradeForm() {
    const c = ensureCase();
    if (byId('productName')) byId('productName').value = c.productDescription || '';
    if (byId('productUse')) byId('productUse').value = c.tradePreparation.productUse || '';
    if (byId('hsCodeInput')) byId('hsCodeInput').value = c.tradePreparation.hsCode || '';
    if (byId('tradeDirection')) byId('tradeDirection').selectedIndex = c.originCountry === 'Indonesia' ? 1 : 0;
  }

  function renderCepaStatusBoard() {
    const node = byId('cepaStatusBoard');
    if (!node) return;
    const c = ensureCase();
    if (TB.isInvestmentPath(c)) {
      node.innerHTML = `<div class="insight"><strong>Investment path active</strong> — shipment-specific CEPA tariff tasks are not forced. Use Investment Readiness for KBLI, FDI conditions and diligence. Official: <a href="https://www.investindonesia.go.id/" target="_blank" rel="noopener">InvestIndonesia / BKPM</a></div>`;
      return;
    }
    node.innerHTML = `<div class="mi-cards" style="margin-bottom:14px">
      <div class="mi-card"><h4>Negotiations</h4><p>Concluded (research baseline)</p><div class="mi-meta"><span class="status-pill sourced">sourced — verify latest EC page</span></div></div>
      <div class="mi-card"><h4>Signature</h4><p>Not assumed in this POC</p><div class="mi-meta"><span class="status-pill unavailable">confirm separately</span></div></div>
      <div class="mi-card"><h4>Ratification / EIF</h4><p>Not assumed as of 10 Nov 2026</p><div class="mi-meta"><span class="status-pill unavailable">not in force for duty claims</span></div></div>
      <div class="mi-card"><h4>Product tariff staging</h4><p>Do not claim preferential rates</p><div class="mi-meta"><span class="status-pill unavailable">unavailable until EIF + schedule</span></div></div>
    </div>`;
  }

  function renderClassificationBox() {
    const node = byId('classificationBox');
    if (!node) return;
    const c = ensureCase();
    if (TB.isInvestmentPath(c)) { node.style.display = 'none'; return; }
    node.style.display = 'block';
    const st = c.tradePreparation.classificationStatus || 'unverified';
    node.innerHTML = `<div class="split"><strong>Product classification</strong><span class="status-pill ${st === 'verified' ? 'sourced' : 'mixed'}">${st === 'verified' ? 'Verified (user)' : 'Classification not yet verified'}</span></div>
      <p style="margin:8px 0;font-size:13px">${safe(c.productDescription || 'No product description yet')} · Origin ${safe(c.originCountry)} → ${safe(c.targetCountry)}</p>
      <p style="margin:0;font-size:12px;color:#8c642c">EU CN (export reporting) and Indonesian BTKI (import) are separate. Industry selection alone does not determine HS. Proposed HS: <strong>${safe(c.tradePreparation.hsCode || '—')}</strong></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn small outline" onclick="markClassification('unverified')">Mark unverified</button>
        <button class="btn small outline" onclick="markClassification('needs_expert')">Needs expert verification</button>
        <button class="btn small" onclick="markClassification('verified')">Mark verified (user attestation)</button>
      </div>`;
  }

  function markClassification(status) {
    const c = ensureCase();
    c.tradePreparation.classificationStatus = status;
    const cls = c.tradePreparation.checklist.find(x => x.id === 'cls');
    if (cls) {
      if (status === 'verified') cls.status = 'completed';
      else if (status === 'needs_expert') cls.status = 'needs_expert';
      else cls.status = 'in_progress';
    }
    touchCase(c); persist(); renderChecks(); toast('Classification status updated');
  }

  function setTaskStatus(taskId, status) {
    const c = ensureCase();
    const item = c.tradePreparation.checklist.find(x => x.id === taskId);
    if (!item) return;
    item.status = status;
    if (status === 'in_progress') c.tradePreparation.status = 'in_progress';
    touchCase(c); persist(); renderChecks();
  }

  function setTaskNotes(taskId, notes) {
    const c = ensureCase();
    const item = c.tradePreparation.checklist.find(x => x.id === taskId);
    if (!item) return;
    item.notes = notes;
    touchCase(c); persist();
  }

  function renderChecks() {
    // readiness generic checks
    let p = Math.round(window.state.checks.length / checklistKeys.length * 100);
    byId('readyPercent').textContent = p + '%';
    byId('readyBar').style.width = p + '%';
    const c = ensureCase();
    const invest = TB.isInvestmentPath(c);

    if (invest) {
      byId('readychecks').innerHTML = (c.tradePreparation.checklist || []).map(item => {
        const meta = TB.investTaskMeta(item.id);
        return `<div class="tcheck-item" data-id="${item.id}">
          <div class="tcheck-row">
            <div class="tcheck-main"><div class="tcheck-title"><span>${safe(meta.title)}</span><span class="tcheck-sev ${meta.sev}">${meta.sev}</span></div>
            <select class="task-status" onchange="setTaskStatus('${item.id}', this.value)">
              ${['not_started','in_progress','needs_expert','completed','not_applicable'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
            </select>
            <button type="button" class="tcheck-toggle" onclick="this.closest('.tcheck-item').classList.toggle('open')">Why this matters ▾</button></div></div>
          <div class="tcheck-why">${safe(meta.why)}<br><em>Ask partner:</em> ${safe(meta.ask)}
          <div style="margin-top:8px"><input style="width:100%;padding:8px;border:1px solid #dbe4eb;border-radius:8px" placeholder="Notes" value="${safe(item.notes || '')}" onchange="setTaskNotes('${item.id}', this.value)">
          <button class="btn small outline" style="margin-top:6px" onclick="addMeetingQuestion('${safe(meta.ask).replace(/'/g, "\\'")}')">Add question to Meeting Pack</button></div></div></div>`;
      }).join('');
    } else {
      byId('readychecks').innerHTML = checklistKeys.map((k, i) => `<label class="check"><input type="checkbox" ${window.state.checks.includes(i) ? 'checked' : ''} onchange="toggleCheck(${i},this.checked)"><span>${t(k)}</span></label>`).join('');
    }

    renderCepaStatusBoard();
    renderClassificationBox();

    const list = c.tradePreparation.checklist || [];
    const metaFn = invest ? TB.investTaskMeta : TB.tradeTaskMeta;
    byId('tradechecks').innerHTML = list.filter(x => x.applicable).map(item => {
      const meta = metaFn(item.id);
      return `<div class="tcheck-item ${meta.sev === 'blocking' ? 'blocking' : ''}" data-id="${item.id}">
        <div class="tcheck-row">
          <div class="tcheck-main">
            <div class="tcheck-title"><span>${safe(meta.title)}</span><span class="tcheck-sev ${meta.sev}">${meta.sev}</span></div>
            <div class="tcheck-clause">${safe(meta.clause)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
              <select class="task-status" onchange="setTaskStatus('${item.id}', this.value)">
                ${['not_started','in_progress','needs_expert','completed','not_applicable'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
              </select>
              <button type="button" class="tcheck-toggle" onclick="this.closest('.tcheck-item').classList.toggle('open')">Details ▾</button>
            </div>
          </div>
        </div>
        <div class="tcheck-why">
          <p><strong>What / why:</strong> ${safe(meta.why)}</p>
          <p><strong>Ask partner:</strong> ${safe(meta.ask)}</p>
          <p style="font-size:11px;color:#8c642c">Completed by user ≠ legally verified.</p>
          <input style="width:100%;padding:8px;border:1px solid #dbe4eb;border-radius:8px;margin-top:6px" placeholder="Notes / evidence reference" value="${safe(item.notes || '')}" onchange="setTaskNotes('${item.id}', this.value)">
          <button class="btn small outline" style="margin-top:6px" onclick="addMeetingQuestion('${safe(meta.ask).replace(/'/g, "\\'")}')">Add to Meeting Pack</button>
        </div>
      </div>`;
    }).join('');

    const stats = cepaStats();
    const openQ = c.tradePreparation.unresolvedQuestions || [];
    const sum = byId('tradeSummary');
    if (sum) {
      sum.innerHTML = `<div class="brief-box"><h3>Trade / investment readiness summary</h3>
        <ul>
          <li>Applicable tasks: ${stats.total} · Marked complete/N/A: ${stats.done}</li>
          <li>Critical still open: ${stats.open.length}</li>
          <li>Classification: ${safe(c.tradePreparation.classificationStatus)}</li>
          <li>Questions for partner: ${openQ.length ? openQ.map(safe).join(' · ') : 'None saved yet'}</li>
        </ul>
        <p class="muted" style="font-size:12px;margin:0">A completed checklist never means a shipment or investment is compliant.</p>
        <button class="btn" style="margin-top:10px" onclick="go('partners')">Continue to Partner Discovery →</button>
      </div>`;
    }

    if (byId('tradeChecksTitle')) {
      byId('tradeChecksTitle').textContent = invest ? 'Investment preparation checklist' : 'Trade readiness checklist';
    }
  }

  function tradeResult() {
    const name = byId('productName').value.trim();
    if (!name) { toast(t('toast_product')); return; }
    const c = ensureCase();
    c.productDescription = name;
    c.tradePreparation.productUse = byId('productUse')?.value.trim() || '';
    const hs = byId('hsCodeInput')?.value.trim() || null;
    c.tradePreparation.hsCode = hs;
    if (hs) c.tradePreparation.classificationStatus = 'needs_expert';
    else c.tradePreparation.classificationStatus = 'unverified';
    const toId = byId('tradeDirection').selectedIndex === 0;
    c.originCountry = toId ? 'Germany' : 'Indonesia';
    c.targetCountry = toId ? 'Indonesia' : 'Germany';
    c.tradePreparation.status = 'in_progress';
    touchCase(c); persist();
    renderCaseBar(); renderTradeCaseStrip(); renderClassificationBox();
    byId('tradeResult').innerHTML = `<div class="insight"><strong>Classification research plan — ${safe(name)}</strong>
      <ol class="research-steps">
        <li>Confirm product use and technical characteristics with engineering.</li>
        <li>Propose EU CN code for export reporting (Germany/EU side) — still unverified.</li>
        <li>Propose Indonesian BTKI code for import clearance — still unverified.</li>
        <li>Look up <em>current</em> MFN/applied duty in Access2Markets / INSW (not CEPA preference).</li>
        <li>Screen Lartas / licences / standards for that BTKI code on INSW.</li>
        <li>Track IEU–CEPA signature / ratification / EIF separately before any preference claim.</li>
      </ol>
      <small>No preferential tariff is calculated. Classification remains <strong>${safe(c.tradePreparation.classificationStatus)}</strong>.</small>
    </div>`;
  }

  function renderPartners() {
    const c = ensureCase();
    let sec = byId('partnerSector').value, city = byId('partnerCity').value;
    // Prefer case filters
    if (c.sector && sec === 'all') {
      /* keep user choice */ }
    let rows = companies.filter(co => co.country === (window.state.role === 'indonesian' ? 'Germany' : 'Indonesia')
      && (sec === 'all' || co.sector === sec)
      && (city === 'all' || co.city === city));
    // Sort by case fit
    rows = rows.map(co => ({ co, fit: TB.partnerFit(co, c) }))
      .sort((a, b) => b.fit.rank - a.fit.rank || Number(b.co.sector === c.sector) - Number(a.co.sector === c.sector));
    byId('companyGrid').innerHTML = rows.length ? rows.map(({ co, fit }) => {
      const fitClass = fit.rank >= 3 ? '' : fit.rank === 2 ? 'partial' : 'more';
      return `<div class="card companycard" onclick="openCompany(${co.id})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')openCompany(${co.id})">
        <div class="company"><div class="company-logo">${co.initials}</div><div class="info"><strong>${co.name}</strong><small>${co.city}, ${countryLabel(co.country)}</small></div></div>
        <span class="tag">${sectorLabel(co.sector)}</span> <span class="fit-tag ${fitClass}">${fit.label}</span> <span class="demo-tag">FICTIONAL</span>
        <p>${co.desc}</p>
        <div class="metricrow"><span>Type<br><b>${co.type}</b></span><span>Match rationale<br><b>${c.sector === co.sector ? 'Same sector' : 'Broader'}${c.partnerCriteria?.length ? ' · criteria set' : ''}</b></span></div>
        <div class="bottom" onclick="event.stopPropagation()">
          <button class="btn small outline" onclick="selectPartnerForCase(${co.id})">Link to case</button>
          <button class="btn small" onclick="openCompany(${co.id})">${t('view_entreprise')}</button>
        </div></div>`;
    }).join('') : `<div class="empty">${t('no_profiles')}</div>`;
  }

  function selectPartnerForCase(id) {
    const c = ensureCase();
    c.selectedPartners = [id];
    touchCase(c); persist();
    toast('Partner linked to Partnership Case');
    openCompany(id);
  }

  function openCepaForPartner(id) {
    const company = companies.find(x => x.id === id);
    const c = ensureCase();
    c.selectedPartners = [id];
    if (company?.sector) c.sector = company.sector;
    touchCase(c); persist();
    if (TB.isInvestmentPath(c)) go('readiness');
    else go('trade');
    toast(t('toast_case_partner'));
  }

  function openCepaFromMarket() { continueFromMarket(); }

  function startOrOpenCase(opts = {}) {
    const c = ensureCase();
    if (opts.partnerId != null) c.selectedPartners = [opts.partnerId];
    if (opts.product != null) c.productDescription = opts.product;
    if (opts.sector != null) c.sector = opts.sector;
    if (opts.directionIndex != null) {
      c.originCountry = opts.directionIndex === 0 ? 'Germany' : 'Indonesia';
      c.targetCountry = opts.directionIndex === 0 ? 'Indonesia' : 'Germany';
    }
    touchCase(c); persist();
    syncCaseToTradeForm();
    go(TB.isInvestmentPath(c) ? 'readiness' : 'trade');
  }

  function meetingPackHtml(company) {
    const c = ensureCase();
    const qs = [
      ...(c.tradePreparation.unresolvedQuestions || []).slice(0, 4),
      ...criticalTradeOpen().slice(0, 3).map(o => (TB.isInvestmentPath(c) ? TB.investTaskMeta(o.id) : TB.tradeTaskMeta(o.id)).ask)
    ].filter(Boolean);
    return `<div class="meeting-pack">
      <h4>Meeting Pack (from Partnership Case)</h4>
      <div><strong>${safe(c.companyName || 'Your company')}</strong> ↔ <strong>${safe(company?.name || 'Partner')}</strong></div>
      <div>Product: ${safe(c.productDescription || c.sector || 'TBD')} · Relationship: ${safe(strategyLabel(c.entryStrategy) || String(c.objective).replace(/_/g, ' '))}</div>
      <div>Market findings saved: ${(c.marketResearch.findings || []).length} · Entry: ${safe(strategyLabel(c.entryStrategy) || 'Not selected')}</div>
      <div style="margin-top:8px"><strong>Open questions</strong><ul>${(qs.length ? qs : ['Confirm importer capability and after-sales coverage.']).slice(0, 5).map(q => `<li>${safe(q)}</li>`).join('')}</ul></div>
      <div><strong>Documents to prepare</strong><ul><li>Company / product one-pager</li><li>Technical specifications</li><li>Draft commercial terms (non-binding)</li>${TB.isInvestmentPath(c) ? '<li>Investment teaser / NDA</li>' : '<li>Provisional HS/BTKI research notes</li>'}</ul></div>
      <p class="muted" style="margin:0">Meeting request ≠ confirmed appointment.</p>
    </div>`;
  }

  let pendingMeetingId = null;
  function openMeeting(id) {
    const c = ensureCase();
    c.selectedPartners = [id];
    touchCase(c); persist();
    const open = criticalTradeOpen();
    pendingMeetingId = id;
    window.pendingMeetingId = id;
    const company = companies.find(x => x.id === id);
    byId('gateTitle').textContent = 'Meeting Pack preview';
    byId('gateLead').textContent = open.length
      ? `${open.length} preparation items are still open. You may continue and request a meeting anyway.`
      : `Review the case Meeting Pack before sending a demo request to ${company?.name || 'partner'}.`;
    const gateList = byId('gateList');
    gateList.className = '';
    gateList.innerHTML = `${meetingPackHtml(company)}${open.length ? `<ul class="gate-list">${open.slice(0, 5).map(o => `<li><strong>${o.sev}</strong> — ${safe((TB.isInvestmentPath(c) ? TB.investTaskMeta(o.id) : TB.tradeTaskMeta(o.id)).title)}</li>`).join('')}</ul>` : ''}`;
    byId('gateFinish').textContent = TB.isInvestmentPath(c) ? 'Open investment prep' : 'Open trade prep';
    byId('gateAnyway').textContent = 'Continue to request';
    byId('gateback').classList.add('show');
  }

  function goCepaFromGate() {
    byId('gateback').classList.remove('show');
    const c = ensureCase();
    if (pendingMeetingId) c.selectedPartners = [pendingMeetingId];
    go(TB.isInvestmentPath(c) ? 'readiness' : 'trade');
  }

  function confirmMeetingAnyway() {
    byId('gateback').classList.remove('show');
    if (pendingMeetingId) showMeetingModal(pendingMeetingId);
    pendingMeetingId = null;
  }

  function submitMeeting() {
    let date = byId('meetingDate').value;
    if (!date || date < new Date().toISOString().slice(0, 10)) { toast(t('toast_date')); return; }
    let obj = byId('meetingObjective').value.trim();
    if (!obj) { toast(t('toast_obj')); return; }
    const c = ensureCase();
    const openGaps = criticalTradeOpen().map(o => o.id);
    const meeting = {
      id: Date.now(),
      caseId: c.id,
      companyId: meetingCompany,
      date, time: byId('meetingTime').value,
      objective: obj,
      status: 'Requested',
      notes: '',
      decisions: '',
      tasks: [],
      pack: {
        product: c.productDescription,
        strategy: c.entryStrategy,
        questions: [...(c.tradePreparation.unresolvedQuestions || [])],
        findings: [...(c.marketResearch.findings || [])].slice(0, 5)
      },
      cepaOpen: openGaps
    };
    window.state.meetings.push(meeting);
    c.meetings = c.meetings || [];
    c.meetings.push(meeting.id);
    c.selectedPartners = [meetingCompany];
    touchCase(c); persist();
    closeModal(); go('meetings'); toast(t('toast_meeting'));
  }

  function confirmMeeting(id) {
    const m = window.state.meetings.find(x => x.id === id);
    if (!m) return;
    m.status = 'Confirmed';
    persist(); renderMeetings(); toast('Meeting confirmed (demo)');
  }

  function renderMeetings() {
    const c = ensureCase();
    const rows = window.state.meetings.filter(m => !m.caseId || m.caseId === c.id);
    byId('meetingList').innerHTML = rows.length ? rows.slice().sort((a, b) => a.date.localeCompare(b.date)).map(m => {
      let co = companies.find(x => x.id === m.companyId);
      return `<div class="listrow"><div>
        <strong>${safe(co?.name || 'Company')}</strong>
        <small>${safe(m.date)} at ${safe(m.time)} · ${safe(co?.city || '')} · ${safe(m.status)}</small>
        <div style="font-size:12px;margin-top:5px">${safe(m.objective)}</div>
        <span class="tag amber">${safe(m.status)}</span>
        ${m.pack ? `<div class="meeting-pack"><h4>Attached Meeting Pack</h4>
          <div>Product: ${safe(m.pack.product || '—')} · Strategy: ${safe(strategyLabel(m.pack.strategy) || '—')}</div>
          ${(m.pack.questions || []).length ? `<ul>${m.pack.questions.slice(0, 3).map(q => `<li>${safe(q)}</li>`).join('')}</ul>` : ''}
        </div>` : ''}
        ${m.notes ? `<p style="font-size:12px">Notes: ${safe(m.notes)}</p>` : ''}
        ${m.cepaOpen?.length ? `<p style="font-size:11px;color:#a66b22;margin:6px 0 0">Open prep items: ${m.cepaOpen.length}</p>` : ''}
      </div><div style="display:grid;gap:7px">
        ${m.status === 'Requested' ? `<button class="btn small" onclick="confirmMeeting(${m.id})">Confirm meeting</button>` : ''}
        <button class="btn small outline" onclick="addNote(${m.id})">${t('follow_up')}</button>
        <button class="btn small outline" onclick="deleteMeeting(${m.id})">${t('remove')}</button>
      </div></div>`;
    }).join('') : `<div class="empty">${t('no_meetings')}</div>`;
  }

  function addNote(id) {
    const m = window.state.meetings.find(x => x.id === id);
    if (!m) return;
    let note = prompt('Meeting notes / decisions / next steps:', m.notes || '');
    if (note !== null) {
      m.notes = note.slice(0, 4000);
      const c = ensureCase();
      if (!c.followUpTasks) c.followUpTasks = [];
      c.followUpTasks.push({ id: Date.now(), meetingId: id, text: m.notes.slice(0, 200), status: 'open' });
      touchCase(c); persist(); renderMeetings(); toast(t('toast_follow'));
    }
  }

  function makeTrip() {
    let date = byId('tripDate').value;
    if (!date) { toast(t('toast_trip')); return; }
    let days = Number(byId('tripDays').value), city = byId('tripCity').value;
    const c = ensureCase();
    // Only confirmed meetings appear as scheduled appointments
    let ms = window.state.meetings.filter(m => (!m.caseId || m.caseId === c.id) && m.status === 'Confirmed' && companies.find(co => co.id === m.companyId)?.city === city);
    let requested = window.state.meetings.filter(m => (!m.caseId || m.caseId === c.id) && m.status === 'Requested' && companies.find(co => co.id === m.companyId)?.city === city);
    let html = '';
    for (let i = 0; i < days; i++) {
      let d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + i);
      let day = d.toISOString().slice(0, 10);
      let matches = ms.filter(m => m.date === day);
      html += `<h4>${t('day')} ${i + 1} · ${day}</h4><div class="timeline">
        <div class="event"><small>09:00</small><strong>${t('review_obj')}</strong><small>Case: ${safe(c.productDescription || c.sector || '')} · ${safe(strategyLabel(c.entryStrategy) || '')}</small></div>
        ${matches.map(m => {
          const co = companies.find(x => x.id === m.companyId);
          return `<div class="event"><small>${safe(m.time)}</small><strong>${safe(co?.name)}</strong>
            <small>Confirmed · ${safe(m.objective)}</small>
            <div class="meeting-pack"><strong>Preparation</strong>
              <div>Open compliance Qs: ${(m.pack?.questions || []).length || m.cepaOpen?.length || 0}</div>
              <div>Docs: product sheet, specs, draft terms</div>
              ${m.notes ? `<div>Follow-up notes: ${safe(m.notes)}</div>` : ''}
            </div></div>`;
        }).join('')}
        ${matches.length ? '' : `<div class="event"><small>${t('to_arrange')}</small><strong>${t('partner_slots')}</strong><small>Only confirmed meetings are scheduled here. Requested: ${requested.length}</small></div>`}
        <div class="event"><small>${t('after_meetings')}</small><strong>${t('doc_decisions')}</strong><small>${t('confirm_next')}</small></div>
      </div>`;
    }
    const open = criticalTradeOpen().slice(0, 4);
    const cepaBlock = open.length ? `<div class="case-gap"><strong>Open preparation before travel</strong><ul>${open.map(o => '<li>' + safe((TB.isInvestmentPath(c) ? TB.investTaskMeta(o.id) : TB.tradeTaskMeta(o.id)).title) + '</li>').join('')}</ul><button class="btn small" style="margin-top:8px" onclick="go('${TB.isInvestmentPath(c) ? 'readiness' : 'trade'}')">Open preparation</button></div>` : '';
    byId('tripOutput').innerHTML = html + cepaBlock + `<div class="notice">${t('trip_buffer')}</div>`;
  }

  // —— Onboarding enrichment ——
  const stages = [
    { id: 'exploring', label: 'Exploring' },
    { id: 'researching', label: 'Researching' },
    { id: 'seeking_partners', label: 'Actively seeking partners' },
    { id: 'operating', label: 'Already operating' }
  ];
  const companyRolesDE = [
    { id: 'exporter', label: 'Exporter' },
    { id: 'importer', label: 'Importer' },
    { id: 'investor', label: 'Investor' },
    { id: 'service_provider', label: 'Service provider' }
  ];

  const _renderOnboarding = window.renderOnboarding;
  window.renderOnboarding = function () {
    const d = onboardingDraft;
    byId('onboardStepLabel').textContent = t('ob_step', { n: onboardingStep + 1 });
    byId('onboardProgress').setAttribute('aria-valuenow', String(onboardingStep + 1));
    byId('onboardProgress').innerHTML = [0, 1, 2, 3].map(i => '<span class="' + (i <= onboardingStep ? 'done' : '') + '"></span>').join('');
    let body = '';
    if (onboardingStep === 0) {
      body = `<div class="onboard-kicker">${t('ob_k1')}</div><h1 id="onboardingTitle">${t('ob_t1')}</h1><p id="onboardingSubtitle" class="onboard-lead">${t('ob_l1')}</p>
      <div class="onboard-choices role-options">
        <button class="onboard-option ${d.role === 'german' ? 'selected' : ''}" aria-pressed="${d.role === 'german'}" onclick="onboardSelectRole('german')"><span class="symbol">🇩🇪</span><span><strong>${t('ob_role_de')}</strong><small>${t('ob_role_de_s')}</small></span></button>
        <button class="onboard-option ${d.role === 'indonesian' ? 'selected' : ''}" aria-pressed="${d.role === 'indonesian'}" onclick="onboardSelectRole('indonesian')"><span class="symbol">🇮🇩</span><span><strong>${t('ob_role_id')}</strong><small>${t('ob_role_id_s')}</small></span></button>
      </div><div class="onboard-choice-note">${t('ob_note')}</div>`;
    } else if (onboardingStep === 1) {
      body = `<div class="onboard-kicker">${t('ob_k2')}</div><h1 id="onboardingTitle">${t('ob_t2')}</h1><p id="onboardingSubtitle" class="onboard-lead">${t('ob_l2')}</p>
       <div class="onboard-choices">${obGoals[d.role].map(g => `<button class="onboard-option ${d.goal === g.id ? 'selected' : ''}" aria-pressed="${d.goal === g.id}" onclick="onboardSelectGoal('${g.id}')"><span class="symbol">${g.symbol}</span><span><strong>${t(g.titleKey)}</strong><small>${t(g.textKey)}</small></span></button>`).join('')}</div>
       ${d.role === 'german' ? `<label class="onboard-select-label">Business role</label><select class="onboard-select" onchange="onboardingDraft.companyRole=this.value">${companyRolesDE.map(r => `<option value="${r.id}" ${d.companyRole === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select>` : ''}`;
    } else if (onboardingStep === 2) {
      body = `<div class="onboard-kicker">${t('ob_k3')}</div><h1 id="onboardingTitle">${t('ob_t3')}</h1><p id="onboardingSubtitle" class="onboard-lead">Choose your industry, then describe the specific product or service (separate fields).</p>
      <div class="onboard-sectorgrid">${obSectors.map(s => `<button class="onboard-option ${d.sector === s.id ? 'selected' : ''}" aria-pressed="${d.sector === s.id}" onclick="onboardSelectSector('${s.id}')"><span class="symbol">${s.symbol}</span><span><strong>${t(s.textKey)}</strong></span></button>`).join('')}</div>
      <div class="onboard-inputs" style="margin-top:16px">
        <div><label>Specific product or service</label><input maxlength="120" value="${safe(d.productDescription || '')}" placeholder="e.g. Industrial packaging machinery" oninput="onboardingDraft.productDescription=this.value"></div>
      </div>
      <label class="onboard-select-label" for="onboardCity">${t('ob_city_label')}</label><select class="onboard-select" id="onboardCity" onchange="onboardingDraft.targetCity=this.value">${obCityChoices().map(([v, label]) => `<option value="${v}" ${d.targetCity === v ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <label class="onboard-select-label">Market-entry stage</label><select class="onboard-select" onchange="onboardingDraft.stage=this.value">${stages.map(s => `<option value="${s.id}" ${d.stage === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select>`;
    } else {
      const goalLabel = obGoals[d.role].find(g => g.id === d.goal);
      body = `<div class="onboard-kicker">${t('ob_k4')}</div><h1 id="onboardingTitle">${t('ob_t4')}</h1><p id="onboardingSubtitle" class="onboard-lead">${t('ob_l4')}</p>
      <div class="onboard-inputs"><div><label for="onboardCompany">${t('ob_company')}</label><input id="onboardCompany" maxlength="80" value="${safe(d.companyName)}" placeholder="e.g. Berlin Industrial Packaging GmbH" oninput="onboardingDraft.companyName=this.value"></div>
      <div><label for="onboardHomeCity">${t('ob_home')} <span class="optional">${t('ob_optional')}</span></label><input id="onboardHomeCity" maxlength="60" value="${safe(d.homeCity)}" placeholder="${d.role === 'german' ? 'e.g. Berlin' : 'e.g. Jakarta'}" oninput="onboardingDraft.homeCity=this.value"></div></div>
      <div class="onboard-summary">
        <div class="srow"><span>${t('ob_sum_ws')}</span><strong>${d.role === 'german' ? t('ob_role_de') : t('ob_role_id')}</strong></div>
        <div class="srow"><span>${t('ob_sum_goal')}</span><strong>${goalLabel ? t(goalLabel.titleKey) : t('explore_opp')}</strong></div>
        <div class="srow"><span>Industry</span><strong>${d.sector ? sectorLabel(d.sector) : t('ob_any_sector')}</strong></div>
        <div class="srow"><span>Product</span><strong>${safe(d.productDescription || '—')}</strong></div>
        <div class="srow"><span>${t('ob_sum_target')}</span><strong>${safe(obCityChoices().find(x => x[0] === d.targetCity)?.[1] || '')}</strong></div>
        <div class="srow"><span>Stage</span><strong>${safe(stages.find(s => s.id === d.stage)?.label || 'Exploring')}</strong></div>
      </div>`;
    }
    byId('onboardBody').innerHTML = body;
    byId('onboardBack').disabled = onboardingStep === 0;
    byId('onboardNext').innerHTML = (onboardingStep === 3 ? 'Create case & open Market' : t('ob_continue')) + ' <span aria-hidden="true">→</span>';
    byId('onboardNext').disabled = (onboardingStep === 1 && !d.goal) || (onboardingStep === 2 && !d.sector);
  };

  const _openOnboarding = window.openOnboarding;
  window.openOnboarding = function (edit = false) {
    onboardingEditMode = Boolean(edit && window.state.onboardingComplete);
    document.querySelector('.onboard-skip').textContent = onboardingEditMode ? t('ob_cancel') : t('ob_skip');
    if (byId('modalback').classList.contains('show')) closeModal();
    const p = window.state.profile || {};
    onboardingDraft = {
      role: p.role || window.state.role || 'german',
      goal: p.goal || null,
      sector: p.sector || null,
      targetCity: p.targetCity || 'all',
      companyName: p.companyName || '',
      homeCity: p.homeCity || '',
      productDescription: p.productDescription || '',
      companyRole: p.companyRole || 'exporter',
      stage: p.stage || 'exploring'
    };
    onboardingStep = 0;
    byId('onboarding').classList.add('show');
    byId('onboarding').setAttribute('aria-hidden', 'false');
    document.body.classList.add('onboarding-open');
    byId('sidebar').classList.remove('open');
    renderOnboarding();
    byId('onboardNext').focus();
  };

  window.completeOnboarding = function (skipped) {
    const d = { ...onboardingDraft };
    window.state.role = d.role;
    window.state.profile = {
      role: d.role,
      goal: d.goal || 'Explore opportunities',
      sector: d.sector || null,
      targetCity: d.targetCity || 'all',
      companyName: (d.companyName || '').trim(),
      homeCity: (d.homeCity || '').trim(),
      productDescription: (d.productDescription || '').trim(),
      companyRole: d.companyRole || 'exporter',
      stage: d.stage || 'exploring'
    };
    window.state.onboardingComplete = true;
    window.state.onboardingSkipped = skipped;
    byId('role').value = window.state.role;

    const objective = mapGoalToObjective(window.state.profile.goal, d.role);
    // New case on complete (or update active if editing same company)
    const c = TB.createCase({
      companyName: window.state.profile.companyName || (d.role === 'german' ? 'German company' : 'Indonesian company'),
      companyRole: window.state.profile.companyRole,
      objective,
      sector: window.state.profile.sector,
      productDescription: window.state.profile.productDescription,
      originCountry: d.role === 'indonesian' ? 'Indonesia' : 'Germany',
      targetCountry: d.role === 'indonesian' ? 'Germany' : 'Indonesia',
      targetCity: window.state.profile.targetCity,
      stage: window.state.profile.stage
    });
    if (!window.state.cases) window.state.cases = [];
    // If editing, or a blank placeholder case exists, update in place to avoid duplicates
    const blank = window.state.cases.find(x => !x.productDescription && !x.companyName);
    if (onboardingEditMode && activeCase()) {
      const cur = activeCase();
      Object.assign(cur, {
        companyName: c.companyName,
        companyRole: c.companyRole,
        objective: c.objective,
        path: c.path,
        sector: c.sector,
        productDescription: c.productDescription,
        originCountry: c.originCountry,
        targetCountry: c.targetCountry,
        targetCity: c.targetCity,
        stage: c.stage,
        tradePreparation: {
          ...cur.tradePreparation,
          checklist: c.path !== cur.path ? c.tradePreparation.checklist : cur.tradePreparation.checklist
        }
      });
      touchCase(cur);
    } else if (blank) {
      Object.assign(blank, c, { id: blank.id, tradePreparation: c.tradePreparation });
      window.state.activeCaseId = blank.id;
      touchCase(blank);
    } else {
      window.state.cases.push(c);
      window.state.activeCaseId = c.id;
      touchCase(c);
    }
    persist();
    closeOnboarding();
    syncOnboardingPreferences();
    // Prefill partner filters from case
    if (window.state.profile.sector) byId('partnerSector').value = window.state.profile.sector;
    if (window.state.profile.targetCity && window.state.profile.targetCity !== 'all') byId('partnerCity').value = window.state.profile.targetCity;
    go('market');
    toast(skipped ? t('toast_skip') : 'Partnership Case created — Market Intelligence ready');
  };

  // Patch company profile CEPA / select partner
  const _companyCepaGapsHtml = window.companyCepaGapsHtml;
  window.companyCepaGapsHtml = function (company) {
    const c = ensureCase();
    const fit = TB.partnerFit(company, c);
    const open = criticalTradeOpen().slice(0, 3);
    const linked = c.selectedPartners[0] === company.id;
    return `<div class="case-gap"><strong>Partnership Case fit</strong>
      <p style="margin:6px 0 0"><span class="fit-tag">${fit.label}</span> ${linked ? '· Linked to active case' : ''} · <span class="demo-tag">FICTIONAL PROFILE</span></p>
      <p style="margin:6px 0 0">Criteria: ${(c.partnerCriteria || []).join(', ') || 'None saved yet'}</p>
      ${open.length ? `<ul>${open.map(o => `<li>${safe((TB.isInvestmentPath(c) ? TB.investTaskMeta(o.id) : TB.tradeTaskMeta(o.id)).title)}</li>`).join('')}</ul>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn small" onclick="selectPartnerForCase(${company.id})">Select for case</button>
        <button class="btn small outline" onclick="openCepaForPartner(${company.id})">${TB.isInvestmentPath(c) ? 'Open investment prep' : 'Open trade prep'}</button>
      </div></div>`;
  };

  // Override render wrapper additions
  const prevRender = window.render;
  window.render = function () {
    prevRender();
    renderCaseBar();
    if (currentPage === 'market') renderMarket();
    if (currentPage === 'trade') { renderTradeCaseStrip(); renderChecks(); }
    if (currentPage === 'readiness' && TB.isInvestmentPath(ensureCase())) renderChecks();
  };

  // Init migration — mutate the same state object the page script closed over
  (function initUpgrade() {
    const s = window.state || {};
    migrateInto(s);
    window.state = s;
    persist = function () {
      localStorage.setItem(STORAGE, JSON.stringify(window.state));
      try { localStorage.setItem(LEGACY, JSON.stringify(window.state)); } catch (e) {}
    };
    window.persist = persist;
    if (s.onboardingComplete) ensureCase();
    persist();
  })();

  // Expose
  Object.assign(window, {
    ensureCase, activeCase, setActiveCase, createNewCaseFromProfile, newPartnershipCase,
    criticalTradeOpen, cepaStats, casePartner, renderCaseBar, renderTradeCaseStrip,
    renderMarket, renderMarketCaseCta: renderMarketCaseStrip, selectEntryStrategy,
    saveFinding, addResearchQuestion, addPartnerCriterion, addMeetingQuestion,
    saveKeyFindings, addAllMeetingQuestions,
    continueFromMarket, syncCaseToTradeForm, renderChecks, tradeResult,
    renderPartners, selectPartnerForCase, openCepaForPartner, openCepaFromMarket,
    startOrOpenCase, openMeeting, goCepaFromGate, confirmMeetingAnyway, submitMeeting,
    confirmMeeting, renderMeetings, addNote, makeTrip, markClassification,
    setTaskStatus, setTaskNotes, persist
  });

  // Re-bind partner filters
  ['partnerSector', 'partnerCity'].forEach(id => {
    const el = byId(id);
    if (el) { el.onchange = renderPartners; el.oninput = renderPartners; }
  });
  byId('marketSector').onchange = () => {
    const c = ensureCase();
    const val = byId('marketSector').value;
    const short = Object.entries({ 'Machinery & manufacturing': 'Machinery', 'Food technology': 'Food technology', 'Renewable energy': 'Renewable energy', Packaging: 'Packaging' }).find(([k]) => k === val)?.[1];
    if (short) c.sector = short;
    touchCase(c); persist(); renderMarket();
  };
  byId('marketDirection').onchange = () => {
    const c = ensureCase();
    const gi = byId('marketDirection').selectedIndex === 0;
    c.originCountry = gi ? 'Germany' : 'Indonesia';
    c.targetCountry = gi ? 'Indonesia' : 'Germany';
    touchCase(c); persist(); renderMarket();
  };

  // Refresh UI once overrides are live
  if (window.state.onboardingComplete) {
    syncOnboardingPreferences();
    render();
  } else if (byId('onboarding')?.classList.contains('show')) {
    renderOnboarding();
  }
})();
