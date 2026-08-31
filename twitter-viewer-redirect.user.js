// ==UserScript==
// @name         Twitter/X to TwitterViewer Redirect
// @version      1.0
// @description  Redirect twitter.com/x.com profile and tweet links to twitterviewer.net (Nitter instances are effectively dead as of 2026).
// @match        *://twitter.com/*
// @match        *://www.twitter.com/*
// @match        *://x.com/*
// @match        *://www.x.com/*
// @grant        none
// @namespace    https://github.com/laforcem/dotfiles
// @downloadURL  https://raw.githubusercontent.com/laforcem/dotfiles/main/home/dot_config/userscripts/twitter-viewer-redirect.user.js
// @updateURL    https://raw.githubusercontent.com/laforcem/dotfiles/main/home/dot_config/userscripts/twitter-viewer-redirect.user.js
// ==/UserScript==

(function() {
    'use strict';
    const targetDomain = 'twitterviewer.net';
    const profileURLPattern = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)(\/[A-Za-z0-9_]+(?:\/.*)?)$/;
    const currentURL = window.location.href;

    const match = currentURL.match(profileURLPattern);
    if (match) {
        window.location.replace(`https://${targetDomain}${match[1]}`);
    }
})();
