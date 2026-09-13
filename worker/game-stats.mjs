const DAY = 86400000;
export const japanDay = (now = new Date()) => new Date(now.getTime() + 32400000).toISOString().slice(0, 10);
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function summarizeVotes(rows, myDate = null, actualDate = null) {
  const days = [...rows].sort((a,b) => a.predicted_date.localeCompare(b.predicted_date));
  const count = days.reduce((s,r) => s + r.votes, 0);
  if (!count) return { count: 0, median: null, mean: null, modes: [], lower: null, upper: null, months: [], earlierPercent: null, exact: 0 };
  const at = index => { let n = 0; for (const r of days) { n += r.votes; if(index < n) return Date.parse(r.predicted_date); } };
  const date = time => new Date(Math.round(time / DAY) * DAY).toISOString().slice(0,10);
  const max = Math.max(...days.map(r=>r.votes));
  const months = new Map();
  for (const r of days) months.set(r.predicted_date.slice(0,7), (months.get(r.predicted_date.slice(0,7)) ?? 0) + r.votes);
  return {
    count, median: date((at(Math.floor((count-1)/2)) + at(Math.floor(count/2))) / 2),
    mean: date(days.reduce((s,r)=>s + Date.parse(r.predicted_date) * r.votes,0) / count),
    modes: days.filter(r=>r.votes===max).map(r=>r.predicted_date),
    lower: date(at(Math.floor((count-1)*.25))), upper: date(at(Math.ceil((count-1)*.75))),
    months: [...months].map(([month,votes])=>({month,votes,percent:100*votes/count})),
    earlierPercent: myDate ? 100 * days.filter(r=>r.predicted_date>myDate).reduce((s,r)=>s+r.votes,0) / count : null,
    exact: actualDate ? days.find(r=>r.predicted_date===actualDate)?.votes ?? 0 : 0,
  };
}
