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
            opacity: 0.8;
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
        
        /* Game header adjustments */
        .game-header {
            background-color: rgba(24, 24, 24, 0.7) !important;
            border-radius: 8px;
            margin-top: 1rem;
            padding: 1rem !important;
        }
        
        /* Mod tiles/cards */
        .tile-container {
            background-color: rgba(42, 42, 42, 0.9) !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        
        .tile-container:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
        }
        
        /* Make text more readable on dark background */
        .tile-desc, .tile-name a {
            color: #e0e0e0 !important;
        }
        
        /* Style filter boxes */
        .filter-block {
            background-color: rgba(24, 24, 24, 0.8) !important;
            border-radius: 6px !important;
            padding: 1rem !important;
            margin-bottom: 1rem !important;
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