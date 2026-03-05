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

const MIN_SPEED = 0.25;
const MAX_SPEED = 16;
const STEP = 0.5;
const DEFAULT_SPEED = 1;

// Tracks the user-intended rate per video element
const rateMap = new WeakMap();

function setSpeed(video, rate) {
  if (!isFinite(rate)) return;
  rate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, rate));
  rateMap.set(video, rate);
  video.playbackRate = rate;
  updateWidget(video); // defined later
}

function attachRateGuard(video) {
  video.addEventListener('ratechange', () => {
    const intended = rateMap.get(video);
    if (intended !== undefined && video.playbackRate !== intended) {
      video.playbackRate = intended;
    }
  });
}

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

  wrap._display = display;

  return wrap;
}

function positionWidget(video, wrap) {
  let parent = video.parentElement;
  while (parent && getComputedStyle(parent).position === 'static') {
    parent = parent.parentElement;
  }
  if (!parent) parent = video.parentElement;

  parent.style.position = parent.style.position || 'relative';
  parent.appendChild(wrap);
}

function updateWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
  wrap._display.textContent = (rateMap.get(video) || DEFAULT_SPEED).toFixed(1) + 'x';
  showWidget(video);
}

function showWidget(video) {
  const wrap = video._speedWidget;
  if (!wrap) return;
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
  positionWidget(video, wrap);
  video._speedWidget = wrap;

  showWidget(video);

  video.addEventListener('mouseenter', () => showWidget(video));
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

init();
