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

/*
 * Keyboard shortcuts:
 *   Control+.  — speed up: snaps to next .0/.5 if not on grid, else +0.5x (max 16x)
 *   Control+,  — slow down: always halves current speed (min 0.25x)
 *
 * A pill widget appears on each video showing current speed.
 * Hover over a video to show the widget again.
 */

'use strict';

const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const STEP = 0.5;
const DEFAULT_SPEED = 1;

// Tracks the user-intended rate per video element
const rateMap = new WeakMap();

let activeVideo = null;

function setSpeed(video, rate) {
  if (!isFinite(rate)) return;
  rate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, rate));
  rateMap.set(video, rate);
  video.playbackRate = rate;
  updateWidget(video);
}

function fasterSpeed(current) {
  // If not on a 0.5-step grid, snap up to the next .0 or .5
  if (current % 0.5 > 0.001) {
    return Math.ceil(current / 0.5) * 0.5;
  }
  return current + STEP;
}

function attachRateGuard(video) {
  video.addEventListener('ratechange', () => {
    const intended = rateMap.get(video);
    if (intended !== undefined && video.playbackRate !== intended) {
      video.playbackRate = intended;
    }
  });
}

function formatSpeed(rate) {
  // Show exact value: trim trailing zeros but always show at least one decimal
  const s = rate.toString();
  return s.includes('.') ? s + 'x' : s + '.0x';
}

function createWidget(video) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position:fixed;
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

  wrap.appendChild(btn('−', () => setSpeed(video, (rateMap.get(video) || DEFAULT_SPEED) / 2)));
  wrap.appendChild(display);
  wrap.appendChild(btn('+', () => setSpeed(video, fasterSpeed(rateMap.get(video) || DEFAULT_SPEED))));

  wrap._display = display;

  document.body.appendChild(wrap);

  return wrap;
}

function positionWidget(video, wrap) {
  const rect = video.getBoundingClientRect();
  wrap.style.top = (rect.top + 8) + 'px';
  wrap.style.left = (rect.left + 8) + 'px';
}

function updateWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
  wrap._display.textContent = formatSpeed(rateMap.get(video) || DEFAULT_SPEED);
  showWidget(video);
}

function showWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
  positionWidget(video, wrap);
  wrap.style.opacity = '1';
  clearTimeout(wrap._fadeTimer);
  wrap._fadeTimer = setTimeout(() => { wrap.style.opacity = '0'; }, 2000);
}

function attachToVideo(video) {
  if (video.dataset.speedControlled) return;
  video.dataset.speedControlled = '1';

  rateMap.set(video, DEFAULT_SPEED);
  attachRateGuard(video);

  const wrap = createWidget(video);
  video._speedWidget = wrap;

  showWidget(video);

  video.addEventListener('mouseenter', () => { activeVideo = video; showWidget(video); });
}

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

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

  const video = activeVideo || document.querySelector('video');
  if (!video) return;

  const current = rateMap.get(video) || DEFAULT_SPEED;

  if (e.ctrlKey && e.code === 'Period') {
    e.preventDefault();
    setSpeed(video, fasterSpeed(current));
  } else if (e.ctrlKey && e.code === 'Comma') {
    e.preventDefault();
    setSpeed(video, current / 2);
  }
});

init();
