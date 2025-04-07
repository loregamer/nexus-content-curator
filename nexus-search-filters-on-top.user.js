// ==UserScript==
// @name         Nexus Mods - Search Filters on Top
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Moves search filters to appear above search results instead of on the left side
// @author       loregamer
// @match        https://www.nexusmods.com/*/search/*
// @grant        GM_addStyle
// @icon         https://www.nexusmods.com/favicon.ico
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-filters-on-top.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-filters-on-top.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Search Filters on Top Started ===');

    // Stronger and more direct CSS rules
    const customCSS = `
        /* Force the flex container to use column direction */
        div.sm\\:flex {
            flex-direction: column !important;
            width: 100% !important;
        }
        
        /* Force the filters panel to be visible and horizontal */
        div[aria-label="Filters panel"],
        div.peer\\/filters,
        #filters-panel {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px 0 !important;
            margin-bottom: 20px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 15px !important;
            position: relative !important;
            flex-shrink: 0 !important;
        }
        
        /* Hide filters panel button adjustments */
        button[data-e2eid="hide-filters-panel"] {
            position: absolute !important;
            right: 0 !important;
            top: 0 !important;
            z-index: 10 !important;
        }
        
        /* Style filter sections */
        #filters-panel > button[aria-expanded],
        #filters-panel > button[id^="accordion-header"] {
            width: 250px !important;
            margin: 0 !important;
            border-top: none !important;
        }
        
        /* Style filter content sections */
        #filters-panel > div[aria-hidden],
        #filters-panel > div[aria-labelledby^="accordion-header"] {
            width: 250px !important;
            margin: 0 !important;
            padding-top: 0 !important;
        }
        
        /* Make scrollable areas more compact */
        #filters-panel .scrollbar,
        #filters-panel .max-h-96 {
            max-height: 200px !important;
        }
        
        /* Remove left padding for content area */
        .peer-data-\\[open\\=true\\]\\/filters\\:sm\\:pl-6,
        .peer-data-\\[open\\=true\\]\\/filters\\:md\\:pl-8,
        .peer-data-\\[open\\=false\\]\\/filters\\:sm\\:pl-6,
        .peer-data-\\[open\\=false\\]\\/filters\\:md\\:pl-8,
        div.w-full.pt-6 {
            padding-left: 0 !important;
            width: 100% !important;
        }
        
        /* Ensure mod results take full width */
        div.mods-grid {
            width: 100% !important;
        }
        
        /* Force creator banner to proper size */
        #filters-panel div.border-creator-subdued {
            width: 250px !important;
            margin-top: 0 !important;
        }
        
        /* Force show filters button to hide when panel is visible */
        #filters-panel[data-open="true"] ~ div button[data-e2eid="show-filters-panel"] {
            display: none !important;
        }
    `;

    // Apply CSS as soon as possible
    function injectCustomCSS() {
        GM_addStyle(customCSS);
    }

    // Execute immediately
    injectCustomCSS();
    
    // Additional post-load adjustments if needed
    function postLoadAdjustments() {
        // Force the filters panel to be open
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            filtersPanel.setAttribute('data-open', 'true');
        }
    }
    
    // Run adjustments after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', postLoadAdjustments);
    } else {
        postLoadAdjustments();
    }
})();