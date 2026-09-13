# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are HUNTER×HUNTER fans checking the latest confirmed chapter release, whether the series is currently on hiatus, and what production progress Yoshihiro Togashi has publicly reported. Readers can use the site in English, French, Japanese, Spanish, Brazilian Portuguese, Simplified Chinese, and Arabic. Developers and fan-site maintainers can consume the same tracker data through the public API, feeds, calendar, and badges.

## Product Purpose

HxH Status gives readers a clear, sourced answer about publication and production progress. Success means a reader can tell what is confirmed, inspect the supporting source, and avoid mistaking an estimate or manuscript milestone for an official release announcement.

## Positioning

An unofficial, open-source HUNTER×HUNTER tracker that deliberately separates officially published or scheduled chapters, distinct manuscript-production milestones, and explicitly labelled statistical estimates. Its site and public API derive from the same recorded data.

## Operating Context

Readers check the current status, individual chapter records, Togashi's posts and translations, publication and hiatus history, and official reading options. They can opt into browser alerts for Togashi posts and share static tracker images. Contributors correct sourced data and translate interface copy through the public repository.

## Capabilities and Constraints

- A chapter's recorded production stage must come from a public source. A completed manuscript does not establish a publication date; an official announcement does.
- Historical publication figures describe past Weekly Shonen Jump issues. Double-numbered physical issues count as one issue.
- Next-chapter forecasts are exploratory model estimates, labelled as unofficial with assumptions and uncertainty; they do not set official dates.
- The seven published languages share the same underlying tracker data. Original Japanese posts are retained alongside available translations and image transcriptions.
- The site is statically exported with Next.js and served through Cloudflare assets; Workers handle automation, push functions, and the separate prediction-game API.
- An account-free community prediction game is implemented, but its production enablement and optional email delivery remain dependent on the documented deployment and provider setup. Fan predictions are not model probabilities or official release information.
- HxH Status is fan-made and unaffiliated with the HUNTER×HUNTER rights holders.

## Brand Commitments

The established name is HxH Status. The editorial voice distinguishes confirmed facts from uncertainty, points readers to sources, and labels unofficial or incomplete information plainly. The project is open source and invites evidence-backed corrections and reader-contributed translations.

## Evidence on Hand

- `app/data/status-data.json` records chapter status and source links; `app/data/publication-history.json` records Weekly Shonen Jump publication history.
- `app/data/togashi-posts.json` preserves archived posts. The archive is explicitly partial, not a claim of completeness.
- `FORECAST-MODEL.md` specifies the statistical models, checks, and limitations; `PREDICTION-GAME.md` documents the community game's behavior and production status.
- `README.md`, `API.md`, `AUTOMATION.md`, `TRANSLATING.md`, and the public source/correction links document operation and provenance.
- No official affiliation, guaranteed return date, or independently validated production-scenario forecast should be implied.

## Fan perspective

Think like a HUNTER×HUNTER fan waiting to read again: lead with the return, Togashi’s progress, and the anticipation of the next batch. Keep the tone warm, familiar, and respectful of Togashi’s pace. The community prediction game is exclusively about Chapter 421’s publication date in Japan, the return chapter for the next batch. It must not roll forward to 422 or become a prediction game for every chapter. Entries close when the official date is announced; results follow actual publication.

The prediction page is designed for fans arriving from Reddit: minimal copy, one obvious date-selection action, then immediate community comparison. A required nickname field is always visible before voting. Sharing comes next; reminders, friend challenges, and detailed statistics use progressive disclosure. Recovery stays prominent below the saved prediction. Keep Chapter 421 fixed in headings and links.

## Product Principles

1. Put the latest confirmed answer within easy reach, with its date and source.
2. Keep publication, production, historical statistics, model estimates, and fan predictions unmistakably distinct.
3. Show uncertainty and missing evidence instead of filling gaps with implied certainty.
4. Keep public-facing data consistent across pages, languages, feeds, and the API.
5. Preserve a path for readers to verify and correct the record.
