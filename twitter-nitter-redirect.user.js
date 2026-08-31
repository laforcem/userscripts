// ==UserScript==
// @name         Twitter/X Nitter Configurable Redirect
// @version      1.0
// @description  Redirect twitter.com and x.com links to a healthy Nitter instance, trying a preferred priority list first before falling back to a random healthy instance. Forked from yodaluca23's Twitter/X Nitter Redirect (https://greasyfork.org/en/scripts/499523-twitter-x-nitter-redirect) to add configurable instance priority.
// @author       moggulus
// @license      GNU GPLv3
// @match        *://twitter.com/*
// @match        *://www.twitter.com/*
// @match        *://x.com/*
// @match        *://www.x.com/*
// @grant        GM_xmlhttpRequest
// @namespace    https://greasyfork.org/en/users/1620043-moggulus
// @downloadURL https://update.greasyfork.org/scripts/585632/TwitterX%20Nitter%20Configurable%20Redirect.user.js
// @updateURL https://update.greasyfork.org/scripts/585632/TwitterX%20Nitter%20Configurable%20Redirect.meta.js
// ==/UserScript==

(function() {
    'use strict';

    const staticURL = ''; // Set this to an instance if you always want to use a single Nitter instance instead of fetching from API.
    const priorityInstances = ['nitter.net', 'lightbrd.com']; // Tried in order before falling back to a random healthy instance.
    const apiUrl = 'https://status.d420.de/api/v1/instances';
    const profileURLPattern = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+(\/.*)?$/;
    let currentURL = window.location.href;

    function fetchNitterInstance(callback) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);

                    if (!data.hosts || !Array.isArray(data.hosts)) {
                        console.error('Unexpected API response format:', data);
                        return;
                    }

                    const healthyInstances = data.hosts.filter(host => host.healthy && !host.is_bad_host);

                    if (healthyInstances.length > 0) {
                        let chosenInstance = null;
                        for (const preferred of priorityInstances) {
                            chosenInstance = healthyInstances.find(host => host.domain === preferred);
                            if (chosenInstance) break;
                        }
                        if (!chosenInstance) {
                            chosenInstance = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
                        }
                        callback(chosenInstance.domain);
                    } else {
                        console.warn('No healthy Nitter instances found.');
                    }
                } catch (error) {
                    console.error('Failed to parse Nitter instance data:', error, response.responseText);
                }
            },
            onerror: function(error) {
                console.error('Error fetching Nitter instances:', error);
            }
        });
    }

    function redirectToNitter(nitterDomain) {
        if (profileURLPattern.test(currentURL)) {
            let newURL = currentURL.replace(/(twitter\.com|x\.com)/, nitterDomain);
            console.log('Redirecting to:', newURL);
            if (newURL !== currentURL) {
                window.location.replace(newURL);
            }
        } else {
            console.log('URL does not match profile pattern, no redirection.');
        }
    }
    if (staticURL.length > 1) {
      redirectToNitter(staticURL);
    } else {
      fetchNitterInstance(redirectToNitter);
    }
})();
