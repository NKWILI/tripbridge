/* TripBridge Partnership Case engine + market/CEPA content (POC) */
(function (global) {
  const uid = () => 'case-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const defaultTradeTasks = () => ([
    { id: 'cls', status: 'not_started', notes: '', applicable: true },
    { id: 'eif', status: 'not_started', notes: '', applicable: true },
    { id: 'tariff', status: 'not_started', notes: '', applicable: true },
    { id: 'origin', status: 'not_started', notes: '', applicable: true },
    { id: 'ntm', status: 'not_started', notes: '', applicable: true },
    { id: 'taxes', status: 'not_started', notes: '', applicable: true },
    { id: 'transit', status: 'not_started', notes: '', applicable: true },
    { id: 'docs', status: 'not_started', notes: '', applicable: true },
    { id: 'remedies', status: 'not_started', notes: '', applicable: true },
    { id: 'contract', status: 'not_started', notes: '', applicable: true },
    { id: 'retention', status: 'not_started', notes: '', applicable: true }
  ]);

  const defaultInvestTasks = () => ([
    { id: 'inv_obj', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_kbli', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_fdi', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_struct', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_dd', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_docs', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_risk', status: 'not_started', notes: '', applicable: true },
    { id: 'inv_meet', status: 'not_started', notes: '', applicable: true }
  ]);

  function createCase(seed = {}) {
    const role = seed.role || 'german';
    const isInvest = ['invest', 'joint_venture', 'attract_investment'].includes(seed.objective);
    return {
      id: seed.id || uid(),
      companyName: seed.companyName || '',
      companyRole: seed.companyRole || (role === 'german' ? 'exporter' : 'exporter'),
      objective: seed.objective || 'find_distributor',
      path: isInvest ? 'investment' : 'trade',
      sector: seed.sector || null,
      productDescription: seed.productDescription || '',
      originCountry: seed.originCountry || (role === 'german' ? 'Germany' : 'Indonesia'),
      targetCountry: seed.targetCountry || (role === 'german' ? 'Indonesia' : 'Germany'),
      targetCity: seed.targetCity || 'all',
      stage: seed.stage || 'exploring',
      entryStrategy: seed.entryStrategy || null,
      partnerCriteria: seed.partnerCriteria || [],
      marketResearch: {
        findings: [],
        sources: [],
        risks: [],
        opportunities: [],
        assumptions: [],
        questions: [],
        reviewed: {},
        status: 'in_progress'
      },
      tradePreparation: {
        hsCode: null,
        classificationStatus: 'unverified',
        productUse: '',
        checklist: isInvest ? defaultInvestTasks() : defaultTradeTasks(),
        unresolvedQuestions: [],
        status: 'not_started'
      },
      selectedPartners: [],
      meetings: [],
      tripPlan: null,
      followUpTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /* Sourced / labelled market packs — packaging DE→ID is the primary acceptance path */
  const marketPacks = {
    'Packaging|Germany|Indonesia': {
      overview: 'Indonesia’s food and consumer-goods producers continue to invest in processing and packaging capacity. For a German maker of industrial packaging machinery, research should focus on manufacturers upgrading lines, import channels for capital equipment, local competitors, and distributor networks that can support installation and after-sales service.',
      overviewSource: { name: 'GTAI — Indonesian food producers need machinery', url: 'https://www.gtai.de/de/trade/indonesien/branchen/indonesiens-nahrungsmittelproduzenten-brauchen-maschinen-1830958', date: 'GTAI sector report', status: 'sourced' },
      demandBullets: [
        { text: 'Sector signal: food processing / packaging machinery demand linked to domestic production growth.', source: 'GTAI', status: 'sourced' },
        { text: 'Buyer segments to validate: food & beverage manufacturers, contract packers, industrial converters.', source: 'Research task', status: 'hypothesis' },
        { text: 'Import values by HS for packaging machinery: Data not available in this POC — verify via Access2Markets / ITC / BPS.', source: 'Access2Markets / ITC', status: 'unavailable' }
      ],
      competition: [
        { title: 'International machinery brands already present', text: 'Expect competition from EU, Japanese, Chinese and local suppliers. Validate installed base with distributors and trade fairs.', status: 'hypothesis', source: 'To validate' },
        { title: 'Service capability is a buying factor', text: 'Buyers often weigh installation, spare parts and maintenance as heavily as machine price.', status: 'hypothesis', source: 'Common B2B practice — validate in meetings' },
        { title: 'Distribution models', text: 'Typical paths: exclusive/non-exclusive distributor, agent, or direct key-account sales with local service partner.', status: 'hypothesis', source: 'AHK market-entry patterns' }
      ],
      barriers: [
        { title: 'Import compliance & standards', text: 'Confirm Indonesian import procedures, possible licences and product standards via INSW/INTR before quoting.', source: 'INSW / DJBC', status: 'sourced-task' },
        { title: 'After-sales coverage', text: 'Without local service capacity, distributors may be weak partners for capital equipment.', source: 'Hypothesis', status: 'hypothesis' },
        { title: 'CEPA preferences not yet operational', text: 'As of 10 Nov 2026, do not assume IEU–CEPA preferential tariffs are claimable. Track signature/ratification/EIF separately.', source: 'European Commission trade pages', status: 'sourced' }
      ],
      strategies: [
        { id: 'distributor', title: 'Local distributor', how: 'Appoint a Jakarta-based partner to sell, install and service machines.', pros: 'Faster market access; local relationships.', risks: 'Margin share; control of brand/service quality.', investigate: ['Import capability', 'Service technicians', 'Territory coverage'] },
        { id: 'agent', title: 'Commercial agent', how: 'Commission-based representation without stock/import obligation.', pros: 'Lower commitment.', risks: 'Weaker after-sales; less exclusivity leverage.', investigate: ['Agent network', 'Who acts as importer of record'] },
        { id: 'direct', title: 'Direct B2B sales', how: 'Sell to factories with a contracted local service partner.', pros: 'Closer customer control.', risks: 'Higher sales cost; compliance still needed.', investigate: ['Key accounts', 'Service SLA partner'] },
        { id: 'presence', title: 'Local presence / JV', how: 'Later-stage option once volume justifies.', pros: 'Depth in market.', risks: 'Investment, licensing, governance.', investigate: ['BKPM / foreign investment rules'] }
      ],
      assessment: [
        { dim: 'Evidence of demand', score: 'mixed', why: 'GTAI indicates machinery need in food/packaging; product-level import stats not loaded in POC.' },
        { dim: 'Competitive intensity', score: 'challenging', why: 'Multiple international suppliers likely present — validate before pricing strategy.' },
        { dim: 'Regulatory complexity', score: 'challenging', why: 'Import licences, standards and (future) CEPA rules require expert verification.' },
        { dim: 'Partner availability', score: 'mixed', why: 'Distributor profiles exist in demo directory; real capability must be diligence-checked.' },
        { dim: 'Market-entry feasibility', score: 'favorable', why: 'Distributor-led entry is a common first step for capital equipment SMEs.' },
        { dim: 'Data confidence', score: 'insufficient', why: 'No live HS time-series in this POC — treat charts as DEMO unless sourced.' }
      ],
      questions: [
        'Which HS / BTKI codes apply to our industrial packaging machines?',
        'Which factories in Greater Jakarta are investing in packaging lines in the next 12–24 months?',
        'Do candidate distributors hold importer licences and service technicians?',
        'What is the current (non-preferential) duty treatment for our HS code?'
      ]
    }
  };

  function packKey(c) {
    return [c.sector || 'Packaging', c.originCountry || 'Germany', c.targetCountry || 'Indonesia'].join('|');
  }

  function getMarketPack(c) {
    return marketPacks[packKey(c)] || marketPacks['Packaging|Germany|Indonesia'];
  }

  function isInvestmentPath(c) {
    return c && c.path === 'investment';
  }

  function tradeTaskMeta(id) {
    const map = {
      cls: { title: 'Product classification (HS / BTKI)', sev: 'mandatory', clause: 'National tariff schedules · Access2Markets / INSW', why: 'Separate EU CN (export reporting) from Indonesian BTKI (import). Classification remains unverified until a specialist confirms it.', ask: 'Which BTKI code will you use to clear this machine?' },
      eif: { title: 'IEU–CEPA legal status (not EIF assumed)', sev: 'critical', clause: 'EC Indonesia agreements · Ch. 25 Final Provisions', why: 'Negotiations concluded ≠ signature ≠ ratification ≠ entry into force ≠ product staging. Do not claim preferential rates as available today (as of 10 Nov 2026).', ask: 'Are you planning quotes on MFN duties until CEPA is operational?' },
      tariff: { title: 'Current tariff treatment (MFN / applied)', sev: 'mandatory', clause: 'Access2Markets · INSW INTR', why: 'Look up applied duties for the verified HS/BTKI code. CEPA staging only matters after EIF and product eligibility.', ask: 'What duty and taxes do you currently budget for similar imports?' },
      origin: { title: 'Rules of origin & evidence (when CEPA applies)', sev: 'critical', clause: 'Draft Ch. 3 · Statement on Origin / importer’s knowledge', why: 'Only relevant for preferential claims after EIF. Check PSR, statement on origin, and non-alteration. Do not assume REX is always required for every direction.', ask: 'If preferences become available, who issues origin evidence?' },
      ntm: { title: 'Import licences, standards & NTMs', sev: 'blocking', clause: 'INSW Lartas · Ch. 2 Art. 2.12 · Ch. 7 TBT', why: 'Preference never waives licences/standards. Confirm whether PI/LS/SNI (or other) apply to this machine — do not auto-require CE/SNI/EUDR for all products.', ask: 'Can you act as importer of record and handle required approvals?' },
      taxes: { title: 'Domestic import taxes (not CEPA duties)', sev: 'mandatory', clause: 'National tax rules · Art. 2.4', why: 'CEPA may affect customs duty later; PPN / PPh 22 (ID) or import VAT (DE) still apply.', ask: 'How do you usually structure landed-cost quotes?' },
      transit: { title: 'Transit / non-alteration on sea hubs', sev: 'critical', clause: 'Draft Ch. 3 non-alteration · Art. 2.10', why: 'DE–ID shipments often transship. Keep evidence if preferential claims are ever made.', ask: 'Which routing and B/L practices do you use from EU ports?' },
      docs: { title: 'Commercial & customs documentation set', sev: 'mandatory', clause: 'Ch. 4 Customs facilitation', why: 'Invoice, packing list, transport docs, technical specs — prepare before first shipment quotes.', ask: 'What document pack do you need from the manufacturer?' },
      remedies: { title: 'Trade remedies screen', sev: 'recommended', clause: 'Ch. 5 Trade Remedies', why: 'Check anti-dumping/safeguards for the HS code so CEPA/MFN duty is not the only cost.', ask: 'Have you seen remedy duties on similar equipment?' },
      contract: { title: 'Contract: import liability & origin clawback', sev: 'recommended', clause: 'Commercial practice · draft Art. 2.15', why: 'Allocate who pays if origin claims fail post-clearance or licences delay clearance.', ask: 'Who bears customs delay and duty risk in the distribution agreement?' },
      retention: { title: 'Record retention (verify exact periods)', sev: 'recommended', clause: 'Draft Ch. 3 record-keeping · national law', why: 'Do not assume a single 3–5 year rule for all parties. Confirm importer vs exporter minima under final text and national customs law.', ask: 'How long do you retain import files for audits?' }
    };
    return map[id] || { title: id, sev: 'recommended', clause: '', why: '', ask: '' };
  }

  function investTaskMeta(id) {
    const map = {
      inv_obj: { title: 'Clarify investment objective', sev: 'mandatory', clause: 'Internal', why: 'Minority stake, JV, acquisition or greenfield imply different diligence.', ask: 'What ownership and control outcomes are acceptable?' },
      inv_kbli: { title: 'Identify KBLI / business line', sev: 'mandatory', clause: 'BKPM / OSS', why: 'Indonesian business classification drives licensing paths.', ask: 'Which KBLI codes cover the target activities?' },
      inv_fdi: { title: 'Foreign investment conditions', sev: 'critical', clause: 'BKPM / InvestIndonesia', why: 'Check sectoral foreign ownership limits and licences.', ask: 'Are there foreign ownership caps in this sector?' },
      inv_struct: { title: 'Corporate structure options', sev: 'mandatory', clause: 'AHK / local counsel', why: 'PT PMA vs contractual JV vs acquisition — map pros/cons.', ask: 'What entity form do similar foreign investors use?' },
      inv_dd: { title: 'Company due diligence plan', sev: 'critical', clause: 'Internal', why: 'Legal, financial, operational, ESG checks before term sheet.', ask: 'Which documents can you share under NDA?' },
      inv_docs: { title: 'Document request list', sev: 'mandatory', clause: 'Internal', why: 'Financials, licences, cap table, material contracts.', ask: 'What is the data-room timeline?' },
      inv_risk: { title: 'Investment risk register', sev: 'recommended', clause: 'Internal', why: 'Regulatory, FX, partner, market risks with mitigations.', ask: 'What risks worry your board most?' },
      inv_meet: { title: 'Investor meeting agenda', sev: 'mandatory', clause: 'Internal', why: 'Prepare questions and required attendees.', ask: 'Who are the decision-makers in the first meeting?' }
    };
    return map[id] || { title: id, sev: 'recommended', clause: '', why: '', ask: '' };
  }

  function nextAction(c) {
    if (!c) return { page: 'dashboard', label: 'Open workspace' };
    if (isInvestmentPath(c)) {
      if (!c.entryStrategy) return { page: 'market', label: 'Choose investment approach' };
      const open = (c.tradePreparation.checklist || []).filter(x => x.applicable && !['completed', 'not_applicable'].includes(x.status));
      if (open.length) return { page: 'readiness', label: 'Continue investment preparation' };
      if (!c.selectedPartners.length) return { page: 'partners', label: 'Find investment targets' };
      return { page: 'meetings', label: 'Prepare investor meeting' };
    }
    if (!c.entryStrategy) return { page: 'market', label: 'Select market-entry strategy' };
    const open = (c.tradePreparation.checklist || []).filter(x => x.applicable && !['completed', 'not_applicable'].includes(x.status) && ['mandatory', 'critical', 'blocking'].includes((tradeTaskMeta(x.id).sev)));
    if (c.tradePreparation.classificationStatus === 'unverified') return { page: 'trade', label: 'Start product classification' };
    if (open.length > 4) return { page: 'trade', label: 'Continue trade preparation' };
    if (!c.selectedPartners.length) return { page: 'partners', label: 'Find matching partners' };
    const hasConfirmed = (c.meetings || []).some(m => m.status === 'Confirmed');
    if (!(c.meetings || []).length) return { page: 'partners', label: 'Request a meeting' };
    if (!hasConfirmed) return { page: 'meetings', label: 'Confirm a meeting' };
    return { page: 'itinerary', label: 'Build trip agenda' };
  }

  function partnerFit(company, c) {
    if (!c) return { label: 'More information required', rank: 0 };
    let score = 0;
    if (c.sector && company.sector === c.sector) score += 2;
    if (c.targetCity && c.targetCity !== 'all' && company.city === c.targetCity) score += 2;
    if (c.entryStrategy === 'distributor' && /distribut|partner|supplier/i.test(company.type)) score += 1;
    if ((c.partnerCriteria || []).some(k => /after-sales|service|install/i.test(k)) && /service|install|after/i.test(company.desc + company.valueProp)) score += 1;
    if (score >= 4) return { label: 'Strong potential fit', rank: 3 };
    if (score >= 2) return { label: 'Partial fit', rank: 2 };
    return { label: 'More information required', rank: 1 };
  }

  global.TBCase = {
    createCase,
    getMarketPack,
    isInvestmentPath,
    tradeTaskMeta,
    investTaskMeta,
    nextAction,
    partnerFit,
    defaultTradeTasks,
    defaultInvestTasks
  };
})(window);
