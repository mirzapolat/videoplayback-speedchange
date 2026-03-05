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
