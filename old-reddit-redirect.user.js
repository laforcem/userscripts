// ==UserScript==
// @name         Old Reddit Redirect
// @version      1.1.2
// @description  Converts reddit.com links to old.reddit.com, but handles /s/ shortlinks and unsupported pages correctly
// @author       idk
// @match        *://*.reddit.com/*
// @exclude      *://www.reddit.com/poll/*
// @exclude      *://i.redd.it/*
// @exclude      *://www.reddit.com/media*
// @exclude      *://www.reddit.com/message/compose*
// @grant        none
// @run-at       document-start
// @license      MIT
// @namespace https://github.com/laforcem/userscripts
// @downloadURL https://raw.githubusercontent.com/laforcem/userscripts/main/old-reddit-redirect.user.js
// @updateURL https://raw.githubusercontent.com/laforcem/userscripts/main/old-reddit-redirect.user.js
// ==/UserScript==

const use_optimization = true;
const opti_threshold = 250;
const opti_dataname = 'orp40897';
const clean_interval = 1000;

const log = (msg) => console.log(`[old-reddit-please] ${msg}`);
log("Loaded");

function isShortLink(url) {
    return url.match(/\/r\/[^\/]+\/s\/[^\/]+/);
}

// These pages only exist on the new Reddit site. Redirecting them to old
// Reddit makes old Reddit send the browser back to www.reddit.com, which
// causes an infinite redirect loop.
function isUnsupportedOnOldReddit(url) {
    return url.pathname === '/message/compose' || url.pathname.startsWith('/message/compose/');
}

function updateLink(url) {
    try {
        const target = new URL(url);
        if (
            target.hostname === 'www.reddit.com' &&
            !isShortLink(target.pathname) &&
            !isUnsupportedOnOldReddit(target)
        ) {
            target.hostname = 'old.reddit.com';
            return target.href;
        }
        return url;
    } catch (e) {
        return url;
    }
}

// --- Main ---
(() => {
    let ready = true;
    let last_count = 0;
    let selector = 'a';

    const update_links = () => {
        if (!ready) return;
        ready = false;

        if (use_optimization && last_count >= opti_threshold) {
            selector = `a:not([data-${opti_dataname}])`;
        }

        const links = document.querySelectorAll(selector);
        last_count = links.length;

        if (last_count > 0) log('Updated ' + links.length + ' links');

        for (const link of links) {
            if (use_optimization && selector !== 'a') {
                link.setAttribute(`data-${opti_dataname}`, '1');
            }
            const updated = updateLink(link.href);
            if (updated !== link.href) link.setAttribute('href', updated);
        }
        setTimeout(() => (ready = true), clean_interval);
    };

    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    const observer = new MutationObserver(update_links);
    observer.observe(document, { childList: true, subtree: true });
    window.addEventListener('load', () => setInterval(update_links, clean_interval));
    update_links();
})();

// --- Redirect if NOT a shortlink or a page unavailable on old Reddit ---
const newUrl = updateLink(window.location.href);
if (newUrl !== window.location.href) {
    window.location.replace(newUrl);
}
