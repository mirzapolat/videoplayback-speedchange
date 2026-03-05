# Video Speed Controller Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tampermonkey userscript that lets users control `<video>` playback speed on any webpage beyond the default 2x cap, up to 16x, via keyboard shortcuts and an on-screen widget.

**Architecture:** Directly set `video.playbackRate` on HTMLVideoElements, track user-set values in a WeakMap, re-apply on external resets, and attach a floating pill UI to each video. A MutationObserver handles dynamically added videos.

**Tech Stack:** Vanilla JS, Tampermonkey userscript API (`@grant none`), no dependencies.

---

### Task 1: Userscript scaffold + metadata

**Files:**
- Create: `video-speed-controller.user.js`

**Step 1: Write the file with only the Tampermonkey header block**

```js
// ==UserScript==
// @name         Video Speed Controller
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Control video playback speed beyond 2x on any site (up to 16x)
// @author       you
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

'use strict';
```

**Step 2: Verify it loads in Tampermonkey**

- Open Tampermonkey dashboard → "Create a new script"
- Paste the file contents
- Save. The script should appear as "Video Speed Controller" with status Enabled.
- Open any webpage — no errors in browser console.

**Step 3: Commit**

```bash
git init
git add video-speed-controller.user.js
git commit -m "feat: add userscript scaffold with Tampermonkey metadata"
```

---

### Task 2: Speed engine — WeakMap + core rate setter

**Files:**
- Modify: `video-speed-controller.user.js`

**Step 1: Add constants and WeakMap below the `'use strict'` line**

```js
const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const STEP = 0.5;
const DEFAULT_SPEED = 1;

// Tracks the user-intended rate per video element
const rateMap = new WeakMap();
```

**Step 2: Add the core `setSpeed` function**

```js
function setSpeed(video, rate) {
  rate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, rate));
  rateMap.set(video, rate);
  video.playbackRate = rate;
  updateWidget(video); // defined in Task 3
}
```

**Step 3: Add the `ratechange` guard**

This prevents YouTube or other sites from resetting the rate:

```js
function attachRateGuard(video) {
  video.addEventListener('ratechange', () => {
    const intended = rateMap.get(video);
    if (intended !== undefined && video.playbackRate !== intended) {
      video.playbackRate = intended;
    }
  });
}
```

**Step 4: Verify in browser console**

Open any page with a video (e.g. youtube.com). In the console:
```js
// Get the video element
const v = document.querySelector('video');
// Manually test clamping
v.playbackRate = 5; // YouTube will reset this immediately without the guard
```
We'll fully verify this after the guard is wired up in Task 4.

**Step 5: Commit**

```bash
git add video-speed-controller.user.js
git commit -m "feat: add speed engine with WeakMap rate tracking and ratechange guard"
```

---

### Task 3: UI widget — pill overlay per video

**Files:**
- Modify: `video-speed-controller.user.js`

**Step 1: Add `createWidget` function**

This builds the DOM for the pill (`[ − | 1.0x | + ]`) and attaches it near the video:

```js
function createWidget(video) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:absolute;
    top:8px;
    left:8px;
    z-index:2147483647;
    display:flex;
    align-items:center;
    background:rgba(0,0,0,0.65);
    color:#fff;
    font:bold 13px/1 monospace;
    border-radius:999px;
    padding:4px 2px;
    gap:0;
    pointer-events:auto;
    transition:opacity 0.3s;
    opacity:0;
  `;

  const btn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `
      background:none;
      border:none;
      color:#fff;
      font:bold 13px/1 monospace;
      cursor:pointer;
      padding:2px 8px;
    `;
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    return b;
  };

  const display = document.createElement('span');
  display.style.cssText = 'padding:2px 6px;min-width:3.5ch;text-align:center;';
  display.textContent = '1.0x';

  wrap.appendChild(btn('−', () => setSpeed(video, (rateMap.get(video) || DEFAULT_SPEED) - STEP)));
  wrap.appendChild(display);
  wrap.appendChild(btn('+', () => setSpeed(video, (rateMap.get(video) || DEFAULT_SPEED) + STEP)));

  // Store reference to display span for updates
  wrap._display = display;

  return wrap;
}
```

**Step 2: Add `positionWidget` — find the nearest positioned ancestor**

```js
function positionWidget(video, wrap) {
  let parent = video.parentElement;
  while (parent && getComputedStyle(parent).position === 'static') {
    parent = parent.parentElement;
  }
  if (!parent) parent = video.parentElement;

  parent.style.position = parent.style.position || 'relative';
  parent.appendChild(wrap);
}
```

**Step 3: Add `updateWidget` — called by `setSpeed` to refresh the display**

```js
function updateWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
  wrap._display.textContent = (rateMap.get(video) || DEFAULT_SPEED).toFixed(1) + 'x';
  showWidget(video);
}
```

**Step 4: Add fade-in / fade-out logic**

```js
function showWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
  wrap.style.opacity = '1';
  clearTimeout(wrap._fadeTimer);
  wrap._fadeTimer = setTimeout(() => { wrap.style.opacity = '0'; }, 2000);
}
```

**Step 5: Commit**

```bash
git add video-speed-controller.user.js
git commit -m "feat: add pill widget with speed display and fade behavior"
```

---

### Task 4: Wire up — attach engine + widget to video elements

**Files:**
- Modify: `video-speed-controller.user.js`

**Step 1: Add `attachToVideo` — guard against duplicate attachment**

```js
function attachToVideo(video) {
  if (video.dataset.speedControlled) return;
  video.dataset.speedControlled = '1';

  rateMap.set(video, DEFAULT_SPEED);
  attachRateGuard(video);

  const wrap = createWidget(video);
  positionWidget(video, wrap);
  video._speedWidget = wrap;

  // Show widget briefly on attach
  showWidget(video);

  // Show widget on video hover
  video.addEventListener('mouseenter', () => showWidget(video));
}
```

**Step 2: Add `init` — scan existing videos and set up MutationObserver**

```js
function init() {
  document.querySelectorAll('video').forEach(attachToVideo);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'VIDEO') attachToVideo(node);
        node.querySelectorAll?.('video').forEach(attachToVideo);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

init();
```

**Step 3: Verify in browser**

- Navigate to any page with a video (e.g. a YouTube video, an HTML5 video on any site)
- The pill widget should appear briefly in the top-left corner of the video
- Hovering over the video should show the pill again
- Clicking `+` should increase the playback rate and update the display
- Clicking `−` should decrease it (clamped at 0.25x)

**Step 4: Commit**

```bash
git add video-speed-controller.user.js
git commit -m "feat: wire up video attachment, MutationObserver for dynamic videos"
```

---

### Task 5: Keyboard shortcuts

**Files:**
- Modify: `video-speed-controller.user.js`

**Step 1: Track the "active" video (last hovered)**

Add near the top of the script (after constants):

```js
let activeVideo = null;
```

In `attachToVideo`, add:

```js
video.addEventListener('mouseenter', () => { activeVideo = video; });
```

**Step 2: Add keyboard listener**

```js
document.addEventListener('keydown', (e) => {
  // Don't fire if user is typing in an input/textarea
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

  const video = activeVideo || document.querySelector('video');
  if (!video) return;

  const current = rateMap.get(video) || DEFAULT_SPEED;

  if (e.key === ']') {
    e.preventDefault();
    setSpeed(video, current + STEP);
  } else if (e.key === '[') {
    e.preventDefault();
    setSpeed(video, current - STEP);
  } else if (e.key === '\\') {
    e.preventDefault();
    setSpeed(video, DEFAULT_SPEED);
  }
});
```

**Step 3: Verify in browser**

- Navigate to a page with a video and hover over it
- Press `]` repeatedly — speed should increase 0.5x per press, up to 16x
- Press `[` — speed should decrease 0.5x per press, down to 0.25x
- Press `\` — speed should reset to 1.0x
- The pill widget should appear and fade after each keypress

**Step 4: Verify rate guard on YouTube**

- Go to youtube.com, play a video
- Press `]` until speed shows e.g. `3.0x` in the widget
- YouTube will try to reset the rate — the guard should re-apply `3.0x`

**Step 5: Commit**

```bash
git add video-speed-controller.user.js
git commit -m "feat: add keyboard shortcuts ] [ \\ for speed control"
```

---

### Task 6: Final polish + README

**Files:**
- Modify: `video-speed-controller.user.js`
- Create: `README.md`

**Step 1: Add version comment block to script**

Below the `==/UserScript==` line, add:

```js
/*
 * Keyboard shortcuts:
 *   ]  — speed up 0.5x (max 16x)
 *   [  — slow down 0.5x (min 0.25x)
 *   \  — reset to 1x
 *
 * A pill widget appears on each video showing current speed.
 * Hover over a video to show the widget again.
 */
```

**Step 2: Write README.md**

```markdown
# Video Speed Controller

Tampermonkey userscript that enables playback speeds beyond 2x on any site with HTML5 video.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open `video-speed-controller.user.js` and click "Raw" — Tampermonkey will prompt to install

## Usage

| Key | Action |
|-----|--------|
| `]` | Speed up 0.5x |
| `[` | Slow down 0.5x |
| `\` | Reset to 1x |

Range: 0.25x → 16x. A speed indicator appears on each video and fades after 2 seconds.

Works on YouTube, Vimeo, Twitter, and any site using HTML5 `<video>`.
```

**Step 3: Final end-to-end verification**

Test on at least two sites:
- **YouTube**: play video, use `]`/`[`/`\`, verify rate guard prevents YouTube from resetting speed
- **Any other HTML5 video page**: verify widget appears and keyboard shortcuts work

**Step 4: Commit**

```bash
git add video-speed-controller.user.js README.md
git commit -m "docs: add usage comments and README"
```
