---
name: HxH Status
description: A HUNTER×HUNTER publication and production tracker, drawn like a manga page.
colors:
  dark:
    page: "#090909"
    raised: "#151514"
    hover: "#1d1d1b"
    text: "#ecebe6"
    text-soft: "#bdbcb6"
    tone: "#9a9993"
    tone-dim: "#5f5e5a"
    rule: "#2a2a28"
    hunter: "#3fae4f"
    hunter-text: "#6fd27c"
    on-hunter: "#06210d"
  light:
    page: "#f6f6f6"
    raised: "#ebebe8"
    hover: "#e2e2de"
    text: "#121212"
    text-soft: "#3d3c38"
    tone: "#5e5d58"
    tone-dim: "#a3a29c"
    rule: "#d8d7d2"
    hunter: "#3fae4f"
    hunter-text: "#1d7a2c"
    on-hunter: "#06210d"
typography:
  family: "Archivo (variable, width axis), via next/font"
  answer:
    fontSize: "clamp(3.25rem, 8.5vw, 7rem)"
    fontWeight: 900
    fontStretch: "62%"
    lineHeight: 0.86
  figure:
    fontSize: "clamp(2.5rem, 4.2vw, 3.5rem)"
    fontWeight: 850
    fontStretch: "62%"
    lineHeight: 0.9
  section-heading:
    fontSize: "clamp(1.6rem, 2.8vw, 2.25rem)"
    fontWeight: 850
    fontStretch: "70%"
    lineHeight: 1
  body:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontSize: "0.85–0.95rem"
    fontWeight: 400–600
rounded:
  tile: "2px"
  control: "4px"
  jump-link: "999px"
rules:
  section: "3px solid text"
  divider: "1px solid rule"
layout:
  frame: "1120px, 24px gutters (16px under 720px)"
  section-gap: "clamp(48px, 6vw, 72px)"
---

# Design System: HxH Status

## Overview

**Creative north star: "The manga page."**

HxH Status is drawn like a page of the manga it tracks: ink black, paper white, heavy panel rules, and Hunter green for what is finished and printed. The first screen gives the answer readers came for, set very large, and a figure from the series waits beside it. Everything below is quiet and ruled rather than boxed.

The whole system lives in one stylesheet, `app/globals.css`: palette tokens first, then base elements and components. The dark tokens are global, so the share-image capture routes use them too (always dark); light mode only applies inside `.site-shell`, which wraps the home page and every content page. Share images keep a few `.share-capture-page` rules of their own (a framed card instead of ruled sections).

**Key characteristics**

- One black, one white, one green. The black is sampled from the hero art (`#090909`) so the figure sits on the page without a seam.
- Light and dark modes follow the reader's system setting until they pick one with the header toggle. Light mode is the dark page inverted.
- One typeface, Archivo, used at two widths: condensed and heavy for answers and chapter numbers, normal width for reading.
- Sections are separated by a heavy 3px rule, like a panel border. There are no cards, glows or drop shadows.
- Short copy. The page states each fact once, in the place it belongs.

## Colors

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| page | `#090909` | `#f6f6f6` | Page background. Never a tinted near-black. |
| raised | `#151514` | `#ebebe8` | The few filled surfaces: the game prompt, tooltips, the chapter sheet. |
| text | `#ecebe6` | `#121212` | Headings, numbers, body copy, section rules. |
| text-soft | `#bdbcb6` | `#3d3c38` | Longer secondary copy. |
| tone | `#9a9993` | `#5e5d58` | Labels, notes, inactive navigation. Named after screentone grey. |
| tone-dim | `#5f5e5a` | `#a3a29c` | Decorative only: pencil outlines, hatching borders. Never text. |
| rule | `#2a2a28` | `#d8d7d2` | Hairline dividers and control borders. |
| hunter | `#3fae4f` | `#3fae4f` | Fills: published tiles, the primary button, the active nav underline, the publishing hero. |
| hunter-text | `#6fd27c` | `#1d7a2c` | Green as text: the day count, the latest chapter, links. Darker in light mode for contrast. |
| on-hunter | `#06210d` | `#06210d` | Text set on a hunter fill, in both modes. |

**The green rule.** Green means printed, current, or actionable. It is never a background wash or a glow, and the hero art stays black and white.

The older stage hues (teal, blue, amber, orange) are retired on the home page. Production stages are now told apart by texture, plus an icon and a label (see Status grid).

## Typography

**Family:** Archivo, loaded in `app/layout.tsx` with its `wdth` axis as `--font-archivo`. It is the only typeface the site ships; the `--font-geist-*` variables that `globals.css` still names are aliases for it. CJK and Arabic text falls back to system faces (Hiragino Sans, Yu Gothic, Noto Sans JP/SC/Arabic).

| Role | Size | Weight | Width | Use |
| --- | --- | --- | --- | --- |
| Answer | `clamp(3.25rem, 8.5vw, 7rem)` | 900 | 62% | "On hiatus" / "Publishing". Once per page. |
| Figure | `clamp(2.5rem, 4.2vw, 3.5rem)` | 850 | 62% | Chapter numbers in the facts row and the day count. |
| Section heading | `clamp(1.6rem, 2.8vw, 2.25rem)` | 850 | 70% | `h2` under each section rule. |
| Body | `1rem`, line-height 1.6 | 400 | 100% | Explanations, FAQ answers. Keep under ~60 characters a line. |
| Small | `0.85–0.95rem` | 400–600 | 100% | Labels, notes, navigation. |

Numbers use tabular figures throughout.

**Don'ts.** No monospace for data labels. No tracked-out all-caps eyebrows. No arrows appended to link text. No middle-dot or bullet separators ("A · B", "A • B"); use the locale's comma or separate lines. Japanese 「・」 between listed nouns is ordinary punctuation and stays.

## Layout

- **Frame:** 1120px max, 24px side gutters, 16px under 720px.
- **Header:** a single bar with the wordmark, the section links, then the date the status last changed, the theme toggle and language. Under 1100px the links drop to a second row. Under 560px the date gets its own line and the section links wrap onto a second line, so none is hidden off-screen. The current page is marked by a 3px green underline sitting on the bar's bottom rule.
- **Hero:** the question in tone, the answer at Answer size, then the day count above a 3px rule, linking to the hiatus page. Below it, one line on Togashi alerts with the alerts button (green outline, 44px): it is the hero's only action. While on hiatus, the cut-out figure sits on the right (above the answer on phones). While publishing, the hero becomes a solid hunter-green block with no art; the next chapter and its announced date (or its stage and "no official date") take the art's place, set large on the end side.
- **Facts row:** four chapter numbers (latest released, next, manuscripts complete, confirmed progress) under a 3px rule, divided by hairlines, like a table of contents. Two columns under 980px.
- **Jump links:** pill links to the production tracker, next chapter, latest Togashi post and FAQ, directly under the facts row. They scroll sideways on phones. Targets have `scroll-margin-top`.
- **Sections:** each opens with a 3px text-colour rule and a section heading. There is no box around them. The gap between sections is `clamp(48px, 6vw, 72px)`.
- Everything is left-aligned (start-aligned in RTL). Use logical properties so Arabic mirrors correctly.

## Hero art

`app/assets/as-long-as-it-takes.webp` is the "As long as it takes. I'll wait." panel, converted to greyscale and cut out of its black background so it works on both page colours. The original lettering stays in the image; each letter keeps a black outline so it still reads on the light page. Only show the art while the series is on hiatus. If you regenerate it, keep the same cut-out: flood-fill the background from the edges, and keep a ~6px black outline around the letters.

## Link preview

`app/opengraph-image.tsx` renders the image Reddit, Discord and X show for a shared link: the hero's question and answer, the latest, next and last-finished chapter numbers under a heavy rule, and the cut-out figure (`app/assets/as-long-as-it-takes-og.png`, a PNG because the renderer cannot read WebP). It uses vendored static Archivo cuts in `app/assets/fonts/` (SIL OFL). It is rebuilt on each data change, so it states nothing that goes stale between builds, such as a day count.

## Components

### Status grid (production tracker)

Ten columns, so each row is one ten-chapter batch (five columns on phones). Square tiles with 2px corners. Each stage is drawn as a step in making a manga page:

| Stage | Tile |
| --- | --- |
| No confirmed progress | Dashed tone-dim outline, number in tone. The pencil sketch. |
| Character inking complete | Diagonal hatching in text colour at 20%. |
| Background specifications complete | Screentone dots in text colour at ~40%, full text-colour border. |
| Delivered to Jump | Solid text-colour fill: the finished sheet. |
| Scheduled for release | The finished sheet with a 3px inset hunter border. |
| Published | Solid hunter fill. |

Every tile keeps its status icon, and the legend repeats the same swatches with labels, so colour is never the only cue. Below the legend, a quiet index lists every chapter that has its own page as plain links (the tiles open a sheet, which also links to the chapter page), so each chapter page is one step from the home page. Tiles lift 2px on hover; this is turned off under reduced motion.

### Theme toggle

A 36px utility button (44px on touch screens) whose icon is a moon in dark mode and opens into a sun in light mode: the moon's bite slides off, the disc shrinks and the rays rotate in, over ~480ms. Switching grows the new theme out of the button as a circle across the page, using the View Transitions API. Browsers without it, and readers with reduced motion, get an instant switch.

The button is plain HTML (`app/theme-toggle.tsx`). A small script in `<head>` (`app/theme.ts`) applies the stored choice (`localStorage`, key `hxh-theme`) as `data-theme` on `<html>` before the first paint, and handles every toggle's click by event delegation. That is what lets the toggle work on the content pages, which ship no React runtime. The script's bytes are the same on every page, so one CSP hash covers it, and the content-page stripper allows it. The icon is drawn with CSS from the same selectors as the palette, so the server render never shows the wrong one. Palette selectors therefore come in pairs: `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` and `:root[data-theme="light"]`.

### Buttons and controls

- **Primary** (the only one: "Pick your date"): hunter fill, on-hunter text, 4px corners, 48px tall.
- **Utility** (Share, Copy, alerts, language, the post links): transparent, 1px rule border, 4px corners. On hover the border goes to tone and the fill to raised.
- **Text link:** hunter-text, underlined 1px with a 4px offset.
- **Focus:** a 2px hunter-text outline with a 3px offset, on every interactive element.

### Next chapter

Two columns: the model estimate ("Unofficial estimate: March 2027") with a link to its method, and the community game prompt on a raised panel with a 3px hunter border on the start side. The caveats live on the chapter page; the home page labels the estimate as unofficial and links to them.

### Prediction game

The game uses the same tokens: 4px panels, square-ish day cells on the page colour, a solid text-colour fill for the picked day (the "finished sheet"), and hunter fills for the primary button and the heat scale. Headings and big dates use the condensed display cut. The downloadable share card (`card()` in `app/prediction-game.tsx`) is drawn on a canvas in the same palette with the page's Archivo.

### Answer sections on content pages

Where readers type a question the page already answers (the arc's length, start, whether it is over), the page states it as a plain question heading and a one-or-two sentence answer built from the same data. These are text, not FAQPage markup.

### 404

`app/not-found.tsx`: the site header, a condensed title, one sentence, and a ruled list of the pages people most often arrive looking for (hiatus answer, next chapter's release date, Togashi's updates, where to read). English only, since it answers every path.

### Latest Togashi post, FAQ, footer

These use the same section rule and heading, with hairline dividers between items. The FAQ is a list of disclosure rows with no surrounding box.

### Content pages

Every content page shares the home header (with the theme toggle), a breadcrumb in tone, and a page title at Answer style (condensed, 900) with a short lede. Below that:

- Sections open with the 3px rule and a condensed heading; no cards.
- Tables have a 2px text-colour rule under the header row and hairlines between rows. The current row gets a raised fill and a 3px hunter mark on its start edge.
- Fact lists and statistics are ruled rows: a 2px rule on top, hairline dividers, labels in sentence case, figures condensed.
- Togashi updates are a ruled list; a post's quote is marked by a 3px hunter bar, not a box.
- Code (endpoints, the badge snippet) keeps a monospace face; every other label uses Archivo.
- When a section heading repeats the page title (the history chart), it is visually hidden but kept for the outline and the share image.

## Copy

- Say each fact once. The hero says the status and the day count; the facts row gives the chapter numbers; nothing repeats them in a paragraph. The full status sentences still feed the page title, meta description, feed and structured data.
- Labels are plain nouns in sentence case ("Next chapter", not "NEXT CHAPTER").
- Estimates always carry the word "unofficial" (or its translation) next to the number.

## Do's and don'ts

**Do**

- Keep pure page black/white and one green; add a new colour only if it carries a meaning no texture or label can.
- Put a 3px rule above each section instead of a box.
- Check both colour modes, a 390px phone, and Arabic (RTL) before shipping a change.

**Don't**

- Add cards, shadows, gradients or glows.
- Use green for decoration.
- Set long explanations on the home page; link to the page that holds them.
