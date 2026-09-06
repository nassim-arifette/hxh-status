# Contributing to HxH Status

Thank you for your interest in contributing to HxH Status!

HxH Status is a minimal, factual, and strictly sourced publication and production tracker for HUNTER×HUNTER. We welcome community contributions that align with our principles of accuracy, performance, and accessibility.

## Accepted Scope

- **Sourced data updates**: We accept updates to `app/data/status-data.json` and `app/data/publication-history.json` backed by official sources (Yoshihiro Togashi's verified X account, Weekly Shonen Jump, VIZ Media, MANGA Plus).
- **Strictly factual**: We do **not** accept rumors, speculative return countdowns, unconfirmed leaks, or fan theories.
- **Translations**: We welcome translations and improvements to our localization catalogs (`messages/{locale}.json`). See [TRANSLATING.md](TRANSLATING.md) for detailed guidelines.
- **Bug fixes and improvements**: A11y improvements, bug fixes, performance optimizations, and documentation updates.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 22.0.0`
- [npm](https://www.npmjs.com/)

### Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/nassim-arifette/hxh-status.git
   cd hxh-status
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verification Commands

Before opening a pull request, run the following verification suite (identical to our CI checks):

```bash
# Check code style and formatting
npm run lint

# Check TypeScript types
npx tsc --noEmit

# Verify message catalogs (all locales must match messages/en.json)
npm run translations:check

# Run test suite
npm test

# Verify production static build
npm run build
```

## Updating Tracker Data

When submitting data updates:
1. Update `app/data/status-data.json` or `app/data/publication-history.json`.
2. Update the `lastUpdated` timestamp in `app/data/status-data.json`.
3. Ensure every entry has an official, verifiable source URL.

## Translating

See [TRANSLATING.md](TRANSLATING.md) for the translation workflow, placeholder rules, and starting a new language.

## Security

If you discover a security vulnerability, please refer to our [Security Policy](SECURITY.md) to report it privately.
