// IoT simulator — generates realistic readings when no hardware is attached.
// Day curve: morning + evening peaks, night trickle. Optional leak injection.

function rand(min, max) { return min + Math.random() * (max - min); }

function simulateReading(prev, opts = {}) {
  const now = opts.at ? new Date(opts.at) : new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  // base flow curve
  let base = 0.4;
  if (h >= 5 && h < 8) base = rand(6, 11);       // morning rush
  else if (h >= 11 && h < 14) base = rand(3, 6); // midday
  else if (h >= 17 && h < 21) base = rand(7, 12); // evening rush
  else if (h >= 21 || h < 5) base = rand(0, opts.leak ? 3.2 : 0.5); // night trickle / leak
  else base = rand(1, 3);

  const flow = Math.max(0, base + rand(-0.4, 0.4));
  const pressure = Math.max(0.4, 2.4 - flow * 0.08 + rand(-0.15, 0.15));
  const levelDrop = flow * 0.02; // % per tick
  let level = (prev ? Number(prev.level_percent) : 72) - levelDrop + (flow < 1 ? rand(0, 0.35) : 0); // refill trickle
  if (level > 100) level = 100;
  if (level < 4) level = rand(60, 88); // bowser refill event
  const tds = opts.tds ?? rand(180, 420);
  const turb = opts.turbidity ?? (rand(0, 1) > 0.93 ? rand(4, 9) : rand(0.2, 1.4));
  return {
    level_percent: Number(level.toFixed(2)),
    flow_lpm: Number(flow.toFixed(2)),
    pressure_bar: Number(pressure.toFixed(2)),
    tds_ppm: Number(tds.toFixed ? tds.toFixed(1) : tds),
    turbidity_ntu: Number((typeof turb === 'number' ? turb : 0.8).toFixed(2)),
    ph: Number(rand(6.9, 7.6).toFixed(2)),
    temp_c: Number(rand(20, 26).toFixed(1)),
    battery: Number(rand(86, 100).toFixed(0))
  };
}

module.exports = { simulateReading };
