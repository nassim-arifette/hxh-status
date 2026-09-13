# Bayesian release forecasts

Version: `bayesian-lognormal-nig-v2`. Reproduce the full numerical report:

```sh
npm run forecast:report -- 2026-09-12
node --test automation/release-forecast.test.mjs
```

The chapter page renders two separate conditional models. Their probabilities
are not pooled: there is no evidence for selecting mixture weights. Both describe
a possible eventual return, not cancellation or indefinite non-publication.
Official schedules suppress the component. Neither model writes releaseAt,
calendar entries, structured-data release dates or notifications. The website is
static: the calculation date is a build snapshot. The report's optional date
filters observations; it does not reconstruct old tracker states.

## Historical reference: conjugate Bayesian log-normal survival

Observations T_i are days from the last chapter before an interruption to the
first chapter after it. Include every completed interruption, regardless of
length, starting in 2014 or later between consecutive numbered chapters. Exclude
specials, unfinished interruptions and rows without chapter continuity. In the
2026-09-12 snapshot this yields nine observations, including two short breaks.
This avoids the old model's outcome-dependent selection of only long pauses.
The target population is recorded interruptions, not all weekly chapter gaps.
The modern era cutoff is an assumption, not an estimated change point.

Use exact calendar differences where both endpoint dates exist (three records).
For six older records use `(missing issues + 1) × 365.2425 / 48`. This is an
approximation, not a reconstructed calendar or a measurement-error model.
Data inherit the repository publication-history provenance; inference does not
independently authenticate the entire chronology.

Let y_i = log(T_i). The generative model is:

```
y_i | μ, σ² ~ Normal(μ, σ²)
σ² ~ InverseGamma(α₀ = 2, scale β₀ = 1)
μ | σ² ~ Normal(μ₀ = log(365.2425), σ² / κ₀), κ₀ = 0.25
```

This proper, broad prior has E[σ²] = 1 and weak location shrinkage. It is a
judgmental prior, not independent editorial knowledge. The page also recomputes
medians with location centers of 180 and 730 days and eligible data since 1998.
These are sensitivity checks, not additional evidence.

The exact conjugate posterior is:

```
κₙ = κ₀ + n
μₙ = (κ₀ μ₀ + n ȳ) / κₙ
αₙ = α₀ + n/2
βₙ = β₀ + Σ(y_i − ȳ)²/2 + κ₀ n (ȳ − μ₀)²/(2κₙ)
y_new | D ~ StudentT(df = 2αₙ, location = μₙ,
                    scale = sqrt[βₙ(κₙ+1)/(αₙκₙ)])
```

The predictive distribution integrates both unknown parameters and future
observation noise; this is not an interval for a fitted mean. On the day scale
it is log-Student-t, with unbounded support. Its positive moments do not exist;
report medians and quantiles, never a mean release date.

At elapsed time e, the ongoing interruption contributes the censored likelihood
S_θ(e). For the same current interruption, integrating its conditional future
density against the reweighted parameter posterior cancels that factor once.
Therefore use the historical posterior predictive survival:

```
P(T ≤ t | T > e, D) = 1 − S_D(t) / S_D(e), t > e
```

Do not multiply by S(e) again or discard historical durations shorter than e.
The inverse CDF uses deterministic bisection in log-time. Student-t tails use the
regularized incomplete beta (continued fraction), a central series avoids loss
of precision, and log-gamma uses Lanczos. No Monte Carlo chain or convergence
diagnostic is necessary for an analytically integrated posterior.

## Production-informed scenario

Source: authenticated X timeline of account ID `1528978792617611264`, archived
in `app/data/togashi-posts.json`. Only explicit textual `No.N, 原稿完成` reports
count as completions; inking/background work is not completion. Use Japan dates,
earliest report per chapter, no future reports. The API check on 2026-09-12
returned the September 1 completion of chapter 427 as its newest post. Chapter
421 was reported at May 26 15:43 UTC, **May 27 in Japan**.

This scenario assumes a ten-chapter batch completed before an additional
editorial delay. Recent publication patterns motivate this, but Jump has not
announced it as a prerequisite. It may publish earlier, build a larger buffer,
overlap editorial preparation or change policy.

Condition on the first completion announcement in the batch. Let k be subsequent
consecutive reports and E the exposure in days through the snapshot, including
silence since the last report. Currently k=6, E=108:

```
λ ~ Gamma(shape = 1, rate = 30 days)
k | λ, E ~ Poisson(λ E)
λ | posts ~ Gamma(shape α = 1+k, rate β = 30+E)
W | λ ~ Gamma(shape r = manuscripts still unreported, rate λ)
P(W ≤ w | posts) = I_[w/(β+w)](r, α)
```

The rate prior has mean one announcement per 30 days and coefficient of
variation 100%. Constant intensity, complete timely reporting and exchangeable
remaining manuscripts are assumptions; posts measure a reporting process,
not drawing productivity. The first event is conditioned on, not also counted
as an interval. Nonconsecutive or out-of-order reports withhold the scenario.

After the hypothetical batch completes, let L be the editorial lag. Use the
same conjugate log-normal family with prior center 90 days and κ₀=.25, α₀=2,
β₀=1. Include only completed prior batches with an archived completion of their
last manuscript and an exact release date for their first chapter. There is
currently one independent cycle, not ten independent observations:

- Manuscript 420 complete: February 24, 2026, [Togashi's report](https://x.com/Un4v5s8bgsVk9Xp/status/2026231563562983740).
- First chapter 411 published: June 29, 2026, recorded publication history.
- Lag: 125 days.

Assuming W and L independent, R=W+L. Numerically integrate
`F_R(t)=∫ F_L(t−w)p(w|posts)dw` with 256 midpoint production quantiles. Tests
compare 1024 points: displayed date quantiles agree within one day and horizon
probabilities within 0.2 percentage points. If all ten announcements exist,
W=0 and L is conditioned on the elapsed editorial wait instead.
The page recomputes with editorial prior centers 30 and 180 days. With one cycle,
this scenario is not out-of-sample validated and is strongly prior-dependent.
No health inference or sentiment weighting is used.

## Validation and limitations

Chronological expanding-window tests start after three completed interruptions.
Each prediction is made at interruption origin using only records completed
before that origin. Tests are retrospective on today's historical dataset,
not archived real-time backtests. The era cutoff and model family were not
selected in a nested validation study.

Report MAE, central 80% interval coverage, mean log predictive density (higher
is better), and central interval score (lower is better). Compare MAE and log
score to a maximum-likelihood log-normal on the same training observations.
At 2026-09-12: six trials, Bayesian MAE 436 days versus baseline 442, coverage
5/6, mean log scores −7.899 versus −7.919. This tiny difference on six trials
does not establish an advantage. The report includes every trial and interval
scores. A single log-normal poorly represents the short/long interruption
mixture and changes in publication policy.

Tests cover independent closed-form distributions, a hand-calculated posterior,
sequential update equivalence, predictive quantile inversion, censoring without
double counting, future-data exclusion, official-state suppression, authentic
completion parsing, Japan dates and quadrature refinement.

Method references:

- [Lancaster: conjugate normal-gamma prediction](https://www.lancaster.ac.uk/~prendivs/accessible/math331/lectures.tex/Ch4.S2.html)
- [Stan: censored survival likelihoods](https://mc-stan.org/docs/stan-users-guide/survival.html)
- [Stan: posterior predictive uncertainty](https://mc-stan.org/docs/stan-users-guide/posterior-prediction.html)

These references justify mathematical constructions, not the accuracy of a
HUNTER×HUNTER release prediction.


## Reader-facing monthly probabilities

The central day is the existing rounded-up median, not a claim that publication
will occur on that day. Calendar-month probabilities are differences of the
active model CDF at successive month ends, using the same Japan-calendar day
rounding as the displayed quantiles. The current month includes only remaining
time. The top five are ranked by probability; enumeration stops only when the
entire remaining tail is smaller than the fifth-ranked probability, so a later
month cannot displace it. Other months includes every unlisted month and the
unbounded tail. Largest-remainder rounding to tenths of a percent makes the six
displayed values sum to 100%. Production remains the active scenario when
available, with the historical reference shown inside the method disclosure.
