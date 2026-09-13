---
name: HxH Status
description: A source-led status desk for HUNTER×HUNTER publication and production.
colors:
  signal-green: "#78c963"
  signal-green-soft: "#1b2b1c"
  signal-green-border: "#315f32"
  published-field: "#172b18"
  scheduled-teal: "#50bcb2"
  delivered-blue: "#68a0ff"
  background-amber: "#d6aa4d"
  inking-orange: "#df824c"
  game-lime: "#b9f65d"
  error-red: "#ef6a6a"
  page-ink: "#0b0e0c"
  card-ink: "#111512"
  raised-ink: "#151916"
  hover-ink: "#1a201b"
  green-haze: "#1b241c"
  foreground: "#f3f6f3"
  text-secondary: "#a7aea8"
  text-muted: "#879189"
  border: "#252c27"
  game-field: "#0c130f"
  game-ink: "#10180d"
  game-foreground: "#f1f6ed"
  game-border: "#596852"
typography:
  display:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4vw, 3.25rem)"
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 3.4vw, 2.7rem)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 570
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.12em"
rounded:
  control: "8px"
  tile: "10px"
  small-panel: "12px"
  metric-panel: "16px"
  section: "18px"
  pill: "999px"
spacing:
  compact: "8px"
  control: "12px"
  standard: "16px"
  panel: "24px"
  section: "38px"
components:
  utility-button:
    backgroundColor: "{colors.raised-ink}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "44px"
  game-primary-button:
    backgroundColor: "{colors.game-lime}"
    textColor: "{colors.game-ink}"
    rounded: "{rounded.control}"
    padding: "0.85rem 1.1rem"
    height: "44px"
  game-input:
    backgroundColor: "{colors.game-field}"
    textColor: "{colors.game-foreground}"
    rounded: "{rounded.control}"
    padding: "0.85rem"
  section-card:
    backgroundColor: "{colors.card-ink}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.section}"
    padding: "38px"
  metric-panel:
    backgroundColor: "rgba(17, 21, 18, 0.75)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.metric-panel}"
  published-chapter-card:
    backgroundColor: "{colors.published-field}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.tile}"
  active-nav-link:
    textColor: "{colors.signal-green}"
  observation-badge:
    backgroundColor: "{colors.raised-ink}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
---

# Design System: HxH Status

## Overview

**Creative North Star: "The Signal Desk"**

HxH Status reads like a compact editorial instrument: a dark, quiet field that makes the latest signal and its provenance easy to spot. The interface is precise and restrained, with crisp green highlights, tabular numbers, and gently layered panels rather than fan-art decoration. The source code and current rendered tracker, not a hypothetical redesign, define this record.

The core tracker uses signal green sparingly for confirmed emphasis and actionable links. Other hues identify specific production stages or hiatus context, so color carries meaning rather than general excitement. The prediction game is a related but brighter participation surface with its own lime accent; it does not reset the global tracker palette.

**Key Characteristics:**
- Near-black green surfaces and pale text create a calm, high-contrast reading field.
- Geist Sans carries explanation; Geist Mono identifies dates, counts, labels, and status details.
- Thin borders, restrained shadows, and compact controls make dense information navigable.
- Responsive grids simplify without discarding the status hierarchy.

## Colors

The palette is dark and green-black, with a single recurring signal green and semantic stage colors.

### Primary

- **Signal Green** (`signal-green`): confirmed highlights, active navigation, source links, focus rings, and the current positive status. Its darker field and border companions (`signal-green-soft`, `signal-green-border`) support selected and published states.

### Secondary

- **Stage Teal, Blue, Amber, and Orange** (`scheduled-teal`, `delivered-blue`, `background-amber`, `inking-orange`): distinct production stages. Use them only with stage labels or explanatory context; the neutral unknown state remains subdued.
- **Game Lime** (`game-lime`): the prediction route's participation buttons, selected dates, and key totals. It is a scoped variation, not the tracker-wide primary.
- **Error Red** (`error-red`): destructive or failed states, never an informational highlight.

### Neutral

- **Page Ink** (`page-ink`), **Card Ink** (`card-ink`), **Raised Ink** (`raised-ink`), and **Hover Ink** (`hover-ink`): the layered dark surface sequence.
- **Foreground** (`foreground`), **Secondary Text** (`text-secondary`), and **Muted Text** (`text-muted`): the reading hierarchy.
- **Quiet Border** (`border`): dividers and control outlines that define structure without dominating it.

**The Semantic Signal Rule.** Green means a current signal or useful action; stage hues retain their specific meanings and are not interchangeable decoration.

## Typography

**Display Font:** Geist Sans (system sans fallback).
**Body Font:** Geist Sans (system sans fallback).
**Label/Mono Font:** Geist Mono (system monospace fallback).

**Character:** Close-set, confident sans headlines sit above measured explanatory copy. Mono is a data voice, not a second body font; it helps readers scan dates, chapter numbers, and compact status labels.

### Hierarchy

- **Display** (650, `clamp(2.1rem, 4vw, 3.25rem)`, 1.05): the home status answer.
- **Headline** (650, `clamp(1.8rem, 3.4vw, 2.7rem)`, 1.1): content-page headings.
- **Title** (570, `1.75rem`): section headings, reduced on narrow screens.
- **Body** (400, `1rem`, 1.5): readable explanation; longer page prose stays around 74 characters wide with a looser 1.7 line height.
- **Label** (600, `0.72rem`, `0.12em`, uppercase): eyebrow and small metadata; metrics and dates also use mono with tabular figures.

**The Data Voice Rule.** Reserve Geist Mono for data and navigation metadata; use Geist Sans for sentences. Arabic numeric displays use the sans fallback where Geist Mono lacks suitable glyphs.

## Layout

The main frame is capped at 1120px with 20px side gutters, narrowing to 14px at 720px and 11px at 390px. The header and primary navigation form two simple horizontal bands. The home snapshot pairs a status answer with four metrics on wide screens; it stacks below 980px. The metric panel changes from four columns to two at 720px. Chapter cards move from ten columns to six at 900px and five at 720px, while long history charts can scroll horizontally.

Content panels use generous section padding (38px on desktop; 24px block and 18px inline at 720px) against compact controls. Reading copy is width-limited, while charts and tabular data can use the full frame. Touch-target controls reach at least 44px in coarse-pointer contexts. RTL layouts use logical inline properties where the interface changes direction.

## Elevation & Depth

This is a subtly layered system, not a flat one. Depth comes first from the page/card/raised tonal sequence and quiet borders, then from diffuse shadows on major panels, popovers, tooltips, and sheets. The four-metric panel adds translucent fill, a light inset edge, and backdrop blur; chapter cards lift slightly on hover. A faint warm radial glow occasionally marks a status area, but does not become a general page texture.

**The Bordered Layer Rule.** Separate information with tonal steps and a fine border before adding shadow; reserve strong shadow for an overlay or a major surface.

## Shapes

Controls have compact rounded corners (8px), chapter cards and small panels sit near 10–12px, metric panels use 16px, and large content sections use 18px. Hairline borders and inset highlights keep edges legible on dark backgrounds. Pills are reserved for badges and status markers; dense information remains in rectangular grids and rows.

## Components

### Buttons

Utility actions are low-contrast raised-ink controls with quiet borders, 8px corners, and at least 44px height. Hover brightens their border, field, and text in about 130ms; focus is a 2px signal-green outline with offset. The prediction game uses a separate lime-filled primary button and an outlined secondary variant; disabled actions reduce opacity.

### Cards / Containers

Large sections are card-ink panels with 18px corners, a border, and a diffuse shadow. The four-cell metric container uses 16px corners and internal dividers; its first metric receives a green-tinted field. Chapter cards use status-colored borders and dark tinted backgrounds, then lift 2px on hover. Tooltips and sheets keep the same palette but receive stronger shadow to read as overlays.

### Inputs / Fields

The prediction route's text fields sit on a darker field with a visible muted border, 8px corners, and generous padding. Focus receives a 2px lime outline. The date picker is a disclosure control with the same field treatment, and selected days invert to lime on dark text.

### Chips / Badges

Observation and model-context badges are restrained raised-ink pills with a fine border, muted mono text, and uppercase tracking. Status-colored badges are reserved for a specific meaning, such as the current arc or chapter stage.

### Navigation

The primary navigation is a low-profile text row below the header. Inactive links use secondary text; the active page uses signal green and a thin underline. It wraps on narrow screens rather than becoming a new visual language. The language picker is a bordered raised-ink disclosure with mono text and a shadowed dark menu.

### Status Grid

The chapter grid is the signature data component: numbered, nearly square tiles carry semantic production color through border, field, and a small status icon. The legend repeats those colors with labels, and focus-visible preserves keyboard legibility. Do not rely on color alone to communicate stage.

## Do's and Don'ts

### Do:

- **Do** preserve the dark tonal sequence and use signal green for current emphasis, active states, links, and focus.
- **Do** pair compact mono data labels with readable sans explanation and explicit source context.
- **Do** simplify grids responsively while preserving stage labels and keyboard focus visibility.
- **Do** keep the prediction game's brighter lime scoped to its participation interface.

### Don't:

- **Don't** use stage colors as interchangeable accents or imply that a production milestone is a release date.
- **Don't** fill every panel with a glow or heavy shadow; the interface depends on quiet borders and selective depth.
- **Don't** replace the restrained tracker vocabulary with decorative fan-art motifs when extending an existing surface.
