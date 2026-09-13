const DAY = 86_400_000;

/** Calendar-day buckets match the models' ceil-to-day quantiles, in JST dates.
 * Stop only once the entire remaining tail cannot displace the fifth month.
 * The remainder includes unlisted months AND the unbounded future tail.
 */
export function forecastMonths(asOf: string, cdf: (days: number) => number) {
  const start = Date.parse(asOf);
  if (!Number.isFinite(start)) throw new Error("Invalid forecast date");
  const date = new Date(start);
  const months: { month: string; probability: number }[] = [];
  let previous = 0;
  for (let i = 0; i < 12000; i++) {
    const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + i, 1));
    const end = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1) - DAY;
    const cumulative = cdf(Math.max(0, (end - start) / DAY));
    if (!Number.isFinite(cumulative) || cumulative < previous - 1e-10 || cumulative > 1 + 1e-10) throw new Error("Invalid forecast CDF");
    months.push({ month: first.toISOString().slice(0, 10), probability: Math.max(0, cumulative - previous) });
    previous = cumulative;
    const top = [...months].sort((a, b) => b.probability - a.probability || a.month.localeCompare(b.month)).slice(0, 5);
    if (top.length === 5 && 1 - cumulative <= top[4].probability) {
      const other = Math.max(0, 1 - top.reduce((sum, m) => sum + m.probability, 0));
      // Largest remainders: displayed tenths of a percent sum to exactly 100%.
      const buckets = [...top, { month: "other", probability: other }];
      const units = buckets.map(m => Math.floor(m.probability * 1000));
      const order = buckets.map((m, index) => ({ index, fraction: m.probability * 1000 - units[index] })).sort((a, b) => b.fraction - a.fraction);
      const missing = 1000 - units.reduce((a, b) => a + b, 0);
      for (let j = 0; j < missing; j++) units[order[j % order.length].index]++;
      return buckets.map((m, i) => ({ ...m, displayProbability: units[i] / 1000 }));
    }
  }
  throw new Error("Forecast tail too broad to rank five months reliably");
}
