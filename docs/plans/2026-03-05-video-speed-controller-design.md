# Video Speed Controller — Design Doc

**Date:** 2026-03-05
**Target:** All pages with `<video>` elements (Tampermonkey userscript)

## Summary

A Tampermonkey userscript that overrides the playback speed of any `<video>` element on any page, supporting speeds from 0.25x to 16x in 0.5x steps.

## Architecture

Single `.user.js` file. No external dependencies. Runs at `document-idle` on `*://*/*`.

## Components

### Speed Engine
- Set `video.playbackRate` directly on the HTMLVideoElement
- Track last user-set rate per video element (via WeakMap)
- Listen for `ratechange` events to detect external resets; re-apply user value if overridden
- `MutationObserver` on `document.body` to detect dynamically added `<video>` elements (SPAs, lazy-loaded players)

### UI Widget
- Pill-shaped overlay: `[ − | 1.0x | + ]`
- Positioned top-left of each video, using absolute positioning relative to the video's nearest positioned ancestor
- Fades out (opacity → 0) after 2s of inactivity; reappears on hover or keypress
- One widget per video element; cleaned up if video is removed from DOM

### Keyboard Shortcuts
Fires on the video currently hovered or last interacted with:
- `]` — increase speed by 0.5x (max 16x)
- `[` — decrease speed by 0.5x (min 0.25x)
- `\` — reset to 1x

## Data Flow

1. Script loads → scan for existing `<video>` elements → attach widget + listeners to each
2. MutationObserver fires → new `<video>` found → attach widget + listeners
3. User presses `]`/`[`/`\` or clicks widget button → update rate via WeakMap → set `video.playbackRate`
4. Site resets `playbackRate` → `ratechange` fires → compare to stored value → re-apply if mismatch

## Error Handling

- Clamp all rates to [0.25, 16] before applying
- No-op if no video is active/hovered on keypress
- Guard against duplicate widget attachment with a data attribute flag
