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
