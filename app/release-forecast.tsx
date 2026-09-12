import { formatMessage, type Locale, type Messages } from "@/lib/i18n";
import { localePath } from "@/lib/routes";
import { deriveReleaseForecast } from "./data/release-forecast";
import { deriveProductionForecast } from "./data/production-forecast";
import archive from "./data/togashi-posts.json";
import { hiatusStats } from "./data/summary";
import { nextChapter, publicationStatus, type ChapterRecord } from "./data/status";
import { formatDate } from "./status-presentation";

export function ReleaseForecast({ chapter, locale, messages }: { chapter: ChapterRecord; locale: Locale; messages: Messages }) {
  if (chapter.chapter !== nextChapter.chapter || ["scheduled", "published"].includes(chapter.status) || publicationStatus !== "hiatus") return null;
  const copy = messages.forecast;
  const records = hiatusStats.historicalHiatuses.completed;
  const estimate = deriveReleaseForecast({ records, chapter: chapter.chapter, nextChapter: nextChapter.chapter, chapterStatus: chapter.status, publicationStatus, sinceDate: hiatusStats.currentHiatus.sinceDate });
  if (!estimate) return <section className="content-section forecast"><h2>{formatMessage(copy.title, { chapter: chapter.chapter })}</h2><p>{copy.unavailable}</p></section>;
  const productionInput = { records, posts: archive.posts, chapter: chapter.chapter, asOf: estimate.asOf };
  const production = deriveProductionForecast(productionInput);
  const lagSensitivity = production ? [30, 180].map(lagPriorDays => deriveProductionForecast({ ...productionInput, lagPriorDays })!) : [];
  const month = (date: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
  const number = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  const percent = (p: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(p);
  const range = (model: { lowerDate: string; medianDate: string; upperDate: string }) => <dl className="forecast-grid">
    <div><dt>{copy.median}</dt><dd>{month(model.medianDate)}</dd></div>
    <div><dt>{copy.range}</dt><dd>{month(model.lowerDate)} – {month(model.upperDate)}</dd></div>
  </dl>;
  const active = production ?? estimate;
  const path = (curve: typeof estimate.curve) => curve.map((point, i) => `${i ? "L" : "M"}${50 + point.days / 730.485 * 510},${210 - point.probability * 180}`).join(" ");
  return <section className="content-section forecast" aria-labelledby="forecast-title">
    <p className="eyebrow">{copy.badge}</p>
    <h2 id="forecast-title">{formatMessage(copy.title, { chapter: chapter.chapter })}</h2>
    <p className="section-lede">{copy.intro}</p>
    {production && <div className="forecast-scenario">
      <h3>{copy.productionTitle}</h3>
      <p className="prose">{formatMessage(copy.productionBody, { count: production.batch.length, remaining: production.remaining })}</p>
      {range(production)}
    </div>}
    <h3>{copy.historyTitle}</h3>
    {range(estimate)}
    <p className="section-note">{formatMessage(copy.asOf, { date: formatDate(estimate.asOf, undefined, locale), count: estimate.exactDateCount, total: estimate.sampleCount })}</p>
    <p className="prose">{copy.caution}</p>
    <h3>{copy.probabilityTitle}</h3>
    <p className="section-note">{production ? copy.productionTitle : copy.historyTitle}</p>
    <dl className="forecast-probabilities">{active.horizons.map(h => <div key={h.days}><dt>{formatMessage(copy.horizon, { days: h.days })}</dt><dd>{percent(h.probability)}</dd></div>)}</dl>
    <figure className="forecast-chart">
      <figcaption>{copy.curveTitle}</figcaption>
      <svg viewBox="0 0 600 270" role="img" aria-label={copy.curveTitle}>
        {[0, .5, 1].map(p => <g key={p}><line x1="50" x2="560" y1={210 - p * 180} y2={210 - p * 180} className="forecast-chart-grid" /><text x="40" y={215 - p * 180} textAnchor="end">{percent(p)}</text></g>)}
        {[0, 6, 12, 18, 24].map(m => <text key={m} x={50 + m / 24 * 510} y="235" textAnchor="middle">{number(m)}</text>)}
        <text x="305" y="260" textAnchor="middle">{copy.curveAxis}</text>
        <path d={path(estimate.curve)} className="forecast-history-line" />
        {production && <path d={path(production.curve)} className="forecast-production-line" />}
      </svg>
      <div className="forecast-legend"><span>{production ? `━ ${copy.productionTitle}` : ""}</span><span>┄ {copy.historyTitle}</span></div>
    </figure>
    <details className="forecast-method">
      <summary>{copy.methodTitle}</summary>
      {production && <>
        <h3>{copy.productionTitle}</h3>
        <p className="prose">{formatMessage(copy.productionMethod, { count: production.lagSamples.length })}</p>
        <pre className="forecast-equations" dir="ltr">{`λ ~ Gamma(1, rate = 30)\nλ | posts ~ Gamma(${production.shape}, rate = ${production.rate})\nW | λ ~ Gamma(r = ${production.remaining}, rate = λ)\nP(W ≤ w | posts) = I[w/(β+w)](r, α)\nR = W + L ; log(L) | data ~ Student-t\nP(R ≤ t) = ∫ F_L(t − w) p(w | posts) dw`}</pre>
        {production.lagSamples.map(s => <p className="prose" key={s.chapter}><a href={s.url}>{formatMessage(copy.lagEvidence, { chapter: s.chapter, completed: formatDate(s.completedOn, undefined, locale), released: formatDate(s.resumedOn, undefined, locale), days: s.days })}</a></p>)}
        <p className="prose">{formatMessage(copy.lagSensitivity, { early: month(lagSensitivity[0].medianDate), late: month(lagSensitivity[1].medianDate) })}</p>
        <h4>{copy.sourcesTitle}</h4>
        <ul className="forecast-sources">{production.batch.map(s => <li key={s.chapter}><a href={s.url}>No. {s.chapter} · {formatDate(s.date, undefined, locale)}</a></li>)}</ul>
      </>}
      <h3>{copy.historyTitle}</h3>
      <p className="prose">{copy.method}</p><p className="prose">{copy.conditioning}</p>
      <pre className="forecast-equations" dir="ltr">{`yᵢ = log(Tᵢ) ~ Normal(μ, σ²)\nσ² ~ InvGamma(α₀, β₀) ; μ | σ² ~ Normal(μ₀, σ²/κ₀)\nκₙ = κ₀+n ; μₙ = (κ₀μ₀+nȳ)/κₙ\nαₙ = α₀+n/2\nβₙ = β₀ + Σ(yᵢ−ȳ)²/2 + κ₀n(ȳ−μ₀)²/(2κₙ)\nlog(Tnew) | data ~ t₂αₙ(μₙ, √[βₙ(κₙ+1)/(αₙκₙ)])\nP(T ≤ t | T > e, data) = 1 − S(t)/S(e)\n\nμₙ = ${estimate.posterior.mu.toFixed(4)} ; κₙ = ${estimate.posterior.kappa}\nαₙ = ${estimate.posterior.alpha} ; βₙ = ${estimate.posterior.beta.toFixed(4)}\ndf = ${estimate.posterior.df} ; scale = ${estimate.posterior.scale.toFixed(4)}`}</pre>
      <h4>{copy.priorTitle}</h4>
      <p className="prose">{formatMessage(copy.priorBody, { early: month(estimate.priorSensitivity[0].date!), late: month(estimate.priorSensitivity[1].date!) })}</p>
      <p className="prose">{formatMessage(copy.sensitivity, { date: month(estimate.allHistoryMedianDate!) })}</p>
      <p className="prose">{copy.limits}</p>
      {estimate.backtest.count > 0 && <>
        <p className="prose">{formatMessage(copy.backtest, { count: estimate.backtest.count, days: number(estimate.backtest.meanAbsoluteErrorDays!), covered: estimate.backtest.covered })}</p>
        <p className="prose">{formatMessage(copy.scores, { baseline: number(estimate.backtest.baselineErrorDays!), bayes: number(estimate.backtest.logScore!, 2), score: number(estimate.backtest.baselineLogScore!, 2) })}</p>
      </>}
      <div className="table-scroll"><table className="hiatus-table">
        <caption>{copy.sampleTitle}</caption><thead><tr><th scope="col">{copy.returnChapter}</th><th scope="col">{copy.period}</th><th scope="col">{copy.issues}</th></tr></thead>
        <tbody>{estimate.samples.map(s => <tr key={s.resumedWithChapter}><th scope="row">{s.resumedWithChapter}</th><td>{s.startYear} #{s.startIssue} – {s.endYear} #{s.endIssue}</td><td>{s.issues}</td></tr>)}</tbody>
      </table></div>
      <p className="section-note"><a href={localePath("/hiatus", locale)}>{copy.historyLink}</a></p>
    </details>
  </section>;
}
