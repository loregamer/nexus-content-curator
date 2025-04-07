// ==UserScript==
// @name         Nexus Mods - Background and Layout Squeeze
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Applies a background image to Nexus Mods and squeezes the layout
// @author       loregamer
// @match        https://www.nexusmods.com/games/*
// @match        https://www.nexusmods.com/*/search/*
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
        .bg-surface-low,
        .bg-surface-translucent-high,
        .bg-surface-translucent,
        .bg-white,
        .bg-slate-50,
        .bg-surface-raised,
        .bg-overlay,
        [class*="bg-surface-"] {
            background-color: transparent !important;
            background-image: none !important;
        }
        
        /* Remove all overlays */
        .absolute.inset-0.bg-gradient-to-b,
        .absolute.inset-0,
        .overlay,
        [class*="overlay-"],
        [class*="bg-overlay"] {
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
            opacity: 1.0;
        }
        
        /* Layout squeeze */
        #mainContent,
        .page-container, 
        .container,
        .container-full,
        .main-container,
        .game-header-container {
            max-width: 70% !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        
        /* Mod Tile Styling - Original Look */
        [class*="@container/mod-tile"] {
            background-color: #383838 !important;
            border: 1px solid #444 !important;
            margin-bottom: 15px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
        }
        
        /* Left side of mod tile - image container */
        [class*="@container/mod-tile"] .group\\/image {
            background: #2d2d2d !important;
            border-radius: 0 !important;
            border-bottom: 1px solid #444 !important;
        }
        
        /* Tile description */
        .bg-surface-translucent-low {
            background-color: #383838 !important;
        }
        
        /* Title and headings styling */
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-title"] {
            color: rgb(255, 255, 255) !important;
            font-weight: bold !important;
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.4) !important;
            margin: 0 !important;
        }
        
        /* Category styling */
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-category"] {
            color: #f1913c !important;
        }
        
        /* Author styling */
        [data-e2eid="user-link"] {
            color: #ddd !important;
            max-width: 230px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: inline-block !important;
        }
        
        /* Download status styles */
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-dl-status"] {
            font-family: Roboto, sans-serif !important;
            font-weight: 400 !important;
            font-size: 14px !important;
            color: rgb(255, 255, 255) !important;
            text-align: left !important;
            position: absolute !important;
            padding: 2px 5px !important;
            top: 8px !important;
        }
        
        /* Endorsements and downloads */
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-endorsements"],
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-downloads"],
        [class*="@container/mod-tile"] [data-e2eid="mod-tile-file-size"] {
            color: #bbb !important;
            font-weight: bold !important;
        }
        
        /* Remove underlines on hover and restore color change */
        a:hover {
            text-decoration: none !important;
        }
        
        /* Hover color effects */
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-title"]:hover {
            color: #da8e35 !important;
        }
        
        [class*="@container/mod-tile"] a[data-e2eid="mod-tile-category"]:hover {
            color: #f7aa5d !important;
        }
        
        [data-e2eid="user-link"]:hover {
            color: #f1913c !important;
        }
        
        /* Responsive styling - based on original */
        @media (max-width: 1460px) {
            [class*="@container/mod-tile"] .tile-desc {
                padding-top: 0 !important;
            }
        }
        
        @media (max-width: 800px) {
            .mod-tile-desc {
                display: none !important;
            }
        }
        
        .relative {
            background-color: #363737 !important;
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