/* Run with: npm test   (Node 18+, no dependencies) */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logic.js');

const S = { w: 0.1, pen: 0.1, denR: 365, denF: 360, dpm: 30, bonus: 5, minP: 100000, minMonths: 3, minDays: 90 };
const base = { P: 100000, T: 3, rate: 0.16, rt: 'Regular', tt: 'Months', pay: 'Maturity', S,
  elapsed: 0, topUp: 0, after: 0, extra: 0, cash: 0 };
const pyi = (o) => L.pyi({ ...base, ...o });

test('round2 rounds half away from zero', () => {
  assert.equal(L.round2(1.005), 1.01);
  assert.equal(L.round2(-1.005), -1.01);
  assert.equal(L.round2(2.675), 2.68);
});

test('PYI: 100,000 at 16%, 3 months, maturity', () => {
  const c = pyi({});
  assert.equal(c.ok, true);
  assert.equal(c.gross, 3945.21);
  assert.equal(c.wht, 394.52);
  assert.equal(c.net, 3550.68); // rounded once from full precision, not gross - WHT
});

test('PYI: 500m at 24%, 13 months, monthly (bonus in month 12)', () => {
  const c = pyi({ P: 500000000, T: 13, rate: 0.24, pay: 'Monthly' });
  assert.equal(c.gross, 129863013.70);
  assert.equal(c.net, 116876712.33);
  assert.equal(c.funds, 508876712.31);
});

test('PYI minimums', () => {
  assert.match(pyi({ T: 2 }).check, /Minimum tenor is 3 months/);
  assert.match(pyi({ tt: 'Days', T: 89 }).check, /Minimum tenor is 90 days/);
  assert.equal(pyi({ tt: 'Days', T: 90 }).ok, true);
  assert.match(pyi({ P: 99999 }).check, /Minimum investment/);
  assert.equal(pyi({ P: 100000 }).ok, true);
});

test('PYI tenor must suit the payment type', () => {
  assert.match(pyi({ T: 4, pay: 'Quarterly' }).check, /multiple of 3 months/);
  assert.match(pyi({ T: 9, pay: 'Biannual' }).check, /multiple of 6 months/);
});

test('EDI: $5,000 at 8%, 180 days, Regular', () => {
  const c = L.edi({ P: 5000, T: 180, rate: 0.08, flat: false, w: 0.1, pen: 0, elapsed: 0, top: 0, extra: 0, cash: 0 });
  assert.equal(c.gross, 197.26);
  assert.equal(c.wht, 19.73);
  assert.equal(c.net, 177.53);
});

test('Top-up replacement investment (Top-up Check sample)', () => {
  const t = pyi({ P: 1000000, T: 3, rate: 0.16, pay: 'Maturity', elapsed: 45, topUp: 50000 });
  assert.equal(t.tu.allowed, true);
  const r = L.replacement({ newP: t.tu.newP, rate: 0.16, tenure: 3, pay: 'Maturity', rt: 'Regular', S, topDate: '2026-02-12', matDate: '2026-05-13' });
  assert.equal(r.ok, true);
  assert.ok(r.newMaturity);
});

test('Replacement summary matches a full schedule built on the new principal', () => {
  const noMin = { ...S, minP: 0, minMonths: 0, minDays: 0 };
  for (const [pay, T] of [['Maturity', 3], ['Monthly', 13], ['Quarterly', 12], ['Biannual', 24], ['Monthly', 24]]) {
    const t = L.pyi({ ...base, P: 2000000, T: 24, rate: 0.23, pay: 'Biannual', elapsed: 45, topUp: 5000000 });
    const r = L.replacement({ newP: t.tu.newP, rate: 0.23, tenure: T, pay, rt: 'Regular', S: noMin });
    const p = L.pyi({ ...base, S: noMin, P: t.tu.newP, T, rate: 0.23, pay });
    assert.equal(r.ok, true);
    assert.equal(p.funds, r.funds, `${pay} ${T}m`);
    assert.equal(p.net, r.net, `${pay} ${T}m net`);
  }
});
