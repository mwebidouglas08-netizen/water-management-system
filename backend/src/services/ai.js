// Explainable AI engine — no external API required.
// Leak / burst / shortage / purity / triage.

function purityScore({ tds_ppm = 0, turbidity_ntu = 0, ph = 7 }) {
  let score = 100;
  let issues = [];
  // TDS
  if (tds_ppm > 1200) { score -= 45; issues.push(`Very high TDS ${tds_ppm} ppm — salty/brackish, do not drink without RO treatment.`); }
  else if (tds_ppm > 1000) { score -= 32; issues.push(`High TDS ${tds_ppm} ppm — poor taste, check borehole intrusion.`); }
  else if (tds_ppm > 600) { score -= 18; issues.push(`Elevated TDS ${tds_ppm} ppm — fair, consider filtration.`); }
  else if (tds_ppm > 300) { score -= 7; issues.push(`Slightly elevated TDS ${tds_ppm} ppm — still good.`); }
  // Turbidity
  if (turbidity_ntu > 10) { score -= 40; issues.push(`Very cloudy water ${turbidity_ntu} NTU — possible runoff/contamination. Boil + filter.`); }
  else if (turbidity_ntu > 5) { score -= 25; issues.push(`Cloudy ${turbidity_ntu} NTU — filter and chlorinate.`); }
  else if (turbidity_ntu > 1) { score -= 10; issues.push(`Slight turbidity ${turbidity_ntu} NTU — monitor after rains.`); }
  // pH
  if (ph < 6.5 || ph > 8.5) { score -= 15; issues.push(`pH ${ph} outside WHO 6.5–8.5 — corrosive/scaling risk, test source.`); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : score >= 30 ? 'Poor' : 'Unsafe';
  let advice = 'Water is safe for drinking and cooking.';
  if (grade === 'Good') advice = 'Safe. Keep monitoring; flush tanks monthly.';
  if (grade === 'Fair') advice = 'Boil drinking water, clean tanks/filters, re-test in 48h.';
  if (grade === 'Poor') advice = 'Do NOT drink without treatment (filter + boil + chlorinate). Report as quality issue.';
  if (grade === 'Unsafe') advice = 'STOP drinking use. Switch to bowser/bottled, escalate to technician + admin immediately.';
  return { score, grade, issues, advice };
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function detectLeak(readings) {
  // readings: newest-first array of {flow_lpm, pressure_bar, ts}
  if (!readings || readings.length < 12) return { leak: false, burst: false, reason: 'Collecting baseline (need ~12 samples).' };
  const flows = readings.map(r => Number(r.flow_lpm) || 0);
  const med = median(flows) || 0.5;
  const latest = flows[0];
  const night = readings.filter(r => {
    const h = new Date(r.ts).getHours();
    return h >= 0 && h < 4;
  }).map(r => Number(r.flow_lpm) || 0);
  const nightAvg = night.length ? night.reduce((a, b) => a + b, 0) / night.length : 0;
  // burst: sudden spike
  if (latest > Math.max(12, med * 3.2)) {
    const pressures = readings.slice(0, 5).map(r => Number(r.pressure_bar) || 0);
    const drop = pressures.length > 1 ? pressures[pressures.length - 1] - pressures[0] : 0;
    return {
      burst: true, leak: true,
      reason: `Burst pattern: flow spiked to ${latest.toFixed(1)} L/min (median ${med.toFixed(1)}).` +
        (drop > 0.4 ? ` Pressure dropped ${drop.toFixed(2)} bar.` : ''),
      advice: 'Close the zonal valve immediately, photograph the site, file a BURST report. Technician: carry pipe cutter, couplings, PTFE, pressure gauge.'
    };
  }
  if (nightAvg > 2.0) {
    return {
      leak: true, burst: false,
      reason: `Night flow avg ${nightAvg.toFixed(1)} L/min (00–04h) — taps should be ~0. Likely hidden leak/cistern overflow.`,
      advice: 'Read the meter at 10pm and 5am with no use. If it moved, walk the line: listen for hissing, check toilets, roof tanks, meter box. Report as leakage.'
    };
  }
  // continuous low flow
  const last6h = readings.slice(0, 36);
  const allFlowing = last6h.length >= 12 && last6h.every(r => Number(r.flow_lpm) > 0.6);
  if (allFlowing) {
    return { leak: true, burst: false, reason: 'Continuous flow for 6h+ without pause — dripping leak or stuck float valve.', advice: 'Check float valves and overflow pipes first (cheapest fix). Then inspect joints.' };
  }
  return { leak: false, burst: false, reason: `Flow normal (median ${med.toFixed(1)} L/min). No leak signature.` };
}

function shortageForecast(latest, capacityLiters, avgDailyUse = 1500) {
  const vol = Number(latest?.volume_liters) || 0;
  const days = avgDailyUse > 0 ? vol / avgDailyUse : 99;
  let level = 'ok', msg = `${vol.toFixed(0)} L ≈ ${days.toFixed(1)} days at ${avgDailyUse} L/day.`;
  if (days < 1) { level = 'critical'; msg += ' CRITICAL: less than 1 day — ration now, order bowser.'; }
  else if (days < 2) { level = 'high'; msg += ' Low — schedule refill within 24–48h.'; }
  else if (days < 4) { level = 'medium'; msg += ' Plan refill this week.'; }
  const pct = capacityLiters ? (vol / capacityLiters) * 100 : 0;
  if (pct < 15 && level === 'ok') level = 'medium';
  return { daysLeft: Number(days.toFixed(2)), volume: vol, level, msg };
}

function triageReport({ category = 'leakage', title = '', description = '' }) {
  const text = `${title} ${description}`.toLowerCase();
  let priority = 'medium', cause = '', checklist = [];
  if (/(burst|gush|flood|road.*water|pipe.*burst)/.test(text) || category === 'burst') {
    priority = 'critical'; cause = 'Suspected burst main / joint failure.';
    checklist = ['Zonal valve key', 'Pipe cutter + couplings (32/50mm)', 'PTFE + glue', 'Pressure gauge', 'Safety cones', 'Camera for before/after'];
  } else if (/(no water|dry|empty|shortage|ration)/.test(text) || category === 'shortage') {
    priority = 'high'; cause = 'Tank empty / ration gap / pump failure.';
    checklist = ['Check pump power + float switch', 'Read tank gauge', 'Call bowser vendor', 'Ration schedule notice'];
  } else if (/(dirty|brown|smell|turbid|salty|tds|quality)/.test(text) || category === 'quality') {
    priority = 'high'; cause = 'Contamination / turbidity spike (post-rain or tank silt).';
    checklist = ['Turbidity + TDS meter', 'Chlorine tabs', 'Tank brushes', 'Sample bottles', 'Boil-water advisory template'];
  } else if (/(leak|drip|wet wall|meter|bill.*high)/.test(text) || category === 'leakage') {
    priority = /bill|underground|night/i.test(text) ? 'high' : 'medium'; cause = 'Dripping joint / cistern / hidden line leak.';
    checklist = ['Wrench set', 'Washer kit', 'Leak listening stick', 'Meter reading sheet'];
  } else {
    cause = 'General water issue — needs site visit.';
    checklist = ['Multimeter', 'Pressure gauge', 'Notebook + photos'];
  }
  return { priority, cause, checklist, note: `AI triage: ${cause} Suggested priority ${priority}.` };
}

module.exports = { purityScore, detectLeak, shortageForecast, triageReport };
