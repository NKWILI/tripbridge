/** Headless acceptance checks for Partnership Case engine (no browser DOM). */
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const engineSrc = readFileSync('./case-engine.js', 'utf8');
const ctx = { window: {}, console };
createContext(ctx);
runInContext(engineSrc, ctx);
const TB = ctx.window.TBCase;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log('OK', msg);
}

// Journey 1: Berlin packaging exporter
const c1 = TB.createCase({
  companyName: 'Berlin Industrial Packaging GmbH',
  companyRole: 'exporter',
  objective: 'find_distributor',
  sector: 'Packaging',
  productDescription: 'Industrial packaging machinery',
  originCountry: 'Germany',
  targetCountry: 'Indonesia',
  targetCity: 'Jakarta',
  stage: 'researching'
});
assert(c1.path === 'trade', 'Berlin case is trade path');
assert(c1.tradePreparation.classificationStatus === 'unverified', 'HS unverified by default');
assert(c1.tradePreparation.checklist.some(t => t.id === 'eif'), 'CEPA EIF task present');
const pack = TB.getMarketPack(c1);
assert(/food|packaging|machinery/i.test(pack.overview), 'Market pack overview relevant');
assert(pack.assessment.some(a => a.score === 'insufficient'), 'Insufficient evidence dimension exists');
c1.entryStrategy = 'distributor';
c1.partnerCriteria.push('installation and after-sales service');
const partner = {
  id: 7, sector: 'Packaging', city: 'Jakarta', type: 'Distribution partner',
  desc: 'installation and after-sales', valueProp: 'after-sales service'
};
const fit = TB.partnerFit(partner, c1);
assert(fit.rank >= 2, 'Jakarta packaging distributor is at least partial/strong fit');
assert(TB.nextAction(c1).page === 'trade', 'Next action after strategy is trade prep');

// Journey 2: Indonesian exporter seeking buyers
const c2 = TB.createCase({
  companyName: 'Surabaya Export Foods',
  objective: 'find_buyers',
  sector: 'Food technology',
  productDescription: 'Processed snack foods',
  originCountry: 'Indonesia',
  targetCountry: 'Germany',
  targetCity: 'Hamburg'
});
assert(c2.path === 'trade', 'ID exporter is trade path');
assert(c2.originCountry === 'Indonesia' && c2.targetCountry === 'Germany', 'ID→DE corridor');

// Journey 3: Investor JV
const c3 = TB.createCase({
  companyName: 'Rhine Capital Partners',
  companyRole: 'investor',
  objective: 'invest',
  sector: 'Renewable energy',
  productDescription: 'Industrial energy efficiency JV',
  originCountry: 'Germany',
  targetCountry: 'Indonesia',
  targetCity: 'Jakarta'
});
assert(c3.path === 'investment', 'Investor uses investment path');
assert(c3.tradePreparation.checklist.some(t => t.id === 'inv_kbli'), 'KBLI task present');
assert(!c3.tradePreparation.checklist.some(t => t.id === 'origin'), 'No shipment origin task on invest path');
assert(TB.nextAction(c3).page === 'market', 'Investor next action starts at market strategy');

// Case isolation
c1.marketResearch.findings.push('Only case 1');
c2.marketResearch.findings.push('Only case 2');
assert(c1.marketResearch.findings[0] !== c2.marketResearch.findings[0], 'Findings isolated per case object');
assert(c1.id !== c2.id && c2.id !== c3.id, 'Distinct case ids');

console.log('\nAll smoke checks passed.');
