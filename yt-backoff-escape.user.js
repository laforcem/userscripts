// ==UserScript==
// @name         YT backoff escape
// @namespace    https://github.com/laforcem/userscripts
// @version      1.0
// @description  Escapes YouTube's SABR backoff (4-24 s fake buffering on ad-blocked sessions) when the uBO/Brave filter rescue misses it, by reloading with the "lactmilli" client tag. Needs the uBO/Brave Shields YouTube filters.
// @match        https://www.youtube.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/laforcem/userscripts/main/yt-backoff-escape.user.js
// @updateURL    https://raw.githubusercontent.com/laforcem/userscripts/main/yt-backoff-escape.user.js
// ==/UserScript==

(() => {
  const GRACE_MS = 700; // head start for the filter's own rescue
  const MIN_BACKOFF_MS = 3000; // ignore the routine ~2 s pacing replies during playback
  const TAGS = ['lactmilli', 'inline', 'yahi']; // "channel" skipped: YouTube answers it with UNPLAYABLE
  const DEBUG = false;

  const now = () => performance.now();
  const log = (...a) => DEBUG && console.debug('[yt-backoff-escape]', ...a);
  const player = () => document.querySelector('#movie_player');

  // backoff_time_ms is protobuf field 4 (varint) of NextRequestPolicy, inside a small UMP reply
  const backoffOf = (b) => {
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i] !== 0x20) continue;
      let v = 0, s = 0, x, j = i + 1;
      do { x = b[j++]; v += (x & 127) * 2 ** s; s += 7; } while (x & 128 && j < b.length);
      if (v >= 500 && v <= 120000) return v;
    }
    return null;
  };

  const setTag = (tag) => {
    const c = window.ytcfg?.data_?.INNERTUBE_CONTEXT?.client;
    if (!c?.userAgent) return false;
    const base = c.userAgent.replace(/; (adunit|channel|lactmilli|instream|inline|yahi|eafg)\b/g, '');
    c.userAgent = base.replace(/Mozilla\/5\.0 \([^)]+/, (m) => m + '; ' + tag);
    return true;
  };

  let lastFilterReload = -1, ownReload = false, wrapped = null;
  const tried = new Map(); // videoId -> tags used

  const escape = (backoff) => {
    const p = player();
    const id = p?.getVideoData?.()?.video_id;
    if (!id || !p.loadVideoById) return;
    const used = tried.get(id) || [];
    const tag = TAGS.find((t) => !used.includes(t));
    if (!tag || !setTag(tag)) return;
    tried.set(id, [...used, tag]);
    log(`backoff ${backoff} ms on ${id}; reloading with ${tag}`);
    ownReload = true;
    try { p.loadVideoById(id, p.getCurrentTime?.() || 0); } finally { ownReload = false; }
  };

  const onBackoff = (backoff) => {
    if (backoff < MIN_BACKOFF_MS || document.querySelector('video')?.currentTime) return;
    const seen = now();
    setTimeout(() => { if (lastFilterReload < seen) escape(backoff); }, GRACE_MS);
  };

  const origFetch = window.fetch;
  window.fetch = async function (input) {
    const res = await origFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (/videoplayback/.test(url)) {
      res.clone().arrayBuffer().then((ab) => {
        if (ab.byteLength >= 2000) return;
        const b = backoffOf(new Uint8Array(ab));
        if (b) onBackoff(b);
      }).catch(() => {});
    }
    return res;
  };

  // Notice reloads made by the filter's rescue so we don't double up.
  setInterval(() => {
    const p = player();
    if (!p?.loadVideoById || wrapped === p) return;
    const orig = p.loadVideoById;
    p.loadVideoById = function (...a) { if (!ownReload) lastFilterReload = now(); return orig.apply(this, a); };
    wrapped = p;
  }, 250);
})();
