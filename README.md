# Video Speed Controller

Tampermonkey userscript that enables playback speeds beyond 2x on any site with HTML5 video.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Open `video-speed-controller.user.js` and click "Raw" — Tampermonkey will prompt to install

## Usage

| Key | Action |
|-----|--------|
| `Control+.` | Speed up (snaps to next 0.5 step if not on grid, else +0.5x) |
| `Control+,` | Slow down (halves current speed) |

Range: 0.1x → 100x. A speed indicator appears on each video and fades after 2 seconds.

The `+` and `−` buttons on the widget follow the same logic as the keyboard shortcuts.

Works on YouTube, Vimeo, Twitter, and any site using HTML5 `<video>`.
