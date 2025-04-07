// ==UserScript==
// @name         Nexus Mods - Background and Layout Squeeze
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Applies a background image to Nexus Mods and squeezes the layout
// @author       loregamer
// @match        https://www.nexusmods.com/games/*
// @match        https://www.nexusmods.com/*/search/*
// @match        https://www.nexusmods.com/*/mods/*
// @grant        GM_addStyle
// @icon         https://www.nexusmods.com/favicon.ico
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-background-squeeze.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-background-squeeze.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Background and Layout Squeeze Started ===');

    // Custom CSS for background and layout
    const customCSS = `
        /* Remove background colors from all elements */
        html, body,
        .bg-surface-base\\/5, .bg-surface-base\\/10, .bg-surface-base\\/15, 
        .bg-surface-base\\/20, .bg-surface-base\\/25, .bg-surface-base\\/30,
        .bg-surface-base\\/35, .bg-surface-base\\/40, .bg-surface-base\\/45,
        .bg-surface-base\\/50, .bg-surface-base\\/55, .bg-surface-base\\/60,
        .bg-surface-base\\/65, .bg-surface-base\\/70, .bg-surface-base\\/75,
        .bg-surface-base\\/80, .bg-surface-base\\/85, .bg-surface-base\\/90,
        .bg-surface-base\\/95, .bg-surface-base\\/100,
        .to-surface-base, .via-surface-base, .from-surface-base\\/60,
        .bg-gradient-to-b,
        .bg-surface-low {
            background-color: transparent !important;
            background-image: none !important;
        }
        
        /* Remove gradient overlay */
        .absolute.inset-0.bg-gradient-to-b {
            display: none !important;
        }
        
        /* Hide the page's background image */
        #mainContent .absolute.inset-0.overflow-hidden {
            display: none !important;
        }
        
        /* Background image */
        body::before {
            content: "";
            position: fixed;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background-color: rgb(6, 7, 2);
            background-image: url("https://www.nexusmods.com/assets/images/default/bg_game_index.jpg");
            background-position: center top;
            background-size: cover;
            background-repeat: no-repeat;
            will-change: transform;
            z-index: -1;
            opacity: 0.9;
        }
        
        /* Layout squeeze */
        #mainContent,
        .page-container, 
        .container,
        .container-full,
        .main-container,
        .game-header-container {
            max-width: 90% !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        
        /* Mod Tile Styling - Classic Look */
        [class*="@container/mod-tile"] {
            background-color: #1a1a1a !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
            border: 1px solid #333 !important;
            margin-bottom: 10px !important;
        }
        
        .bg-surface-translucent-low {
            background-color: #252525 !important;
        }
        
        /* Title and headings styling */
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-title"] {
            color: rgb(255, 255, 255) !important;
            font-weight: bold !important;
        }
        
        /* Category styling */
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-category"] {
            color: #f1913c !important;
        }
        
        /* Author styling */
        [data-e2eid="user-link"] {
            color: #ddd !important;
        }
        
        /* Image container */
        [class*="@container/mod-tile"] .group\/image {
            border-radius: 0 !important;
            border-bottom: 1px solid #333 !important;
        }
        
        /* Endorsements and downloads */
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-endorsements"],
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-downloads"],
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-file-size"] {
            color: #bbb !important;
            font-weight: bold !important;
        }
    `;

    // Apply the CSS
    function injectCustomCSS() {
        GM_addStyle(customCSS);
    }

    // Initialize the script
    function initializeScript() {
        injectCustomCSS();
    }

    // Start the script
    initializeScript();
})();