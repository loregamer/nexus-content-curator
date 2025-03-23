// ==UserScript==
// @name         Nexus Mods - Content Curator
// @namespace    http://tampermonkey.net/
// @version      1.12.1
// @description  Adds warning labels to mods and their authors
// @author       loregamer
// @match        https://www.nexusmods.com/*
// @match        https://next.nexusmods.com/profile/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @connect      rpghq.org
// @connect      github.com
// @icon         https://www.nexusmods.com/favicon.ico
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-content-curator.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-content-curator.user.js
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // Configuration - Replace with your GitHub raw JSON URL
  const MOD_STATUS_URL =
    "https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/Resources/mod-status.json";

  const AUTHOR_STATUS_URL =
    "https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/Resources/author-status.json";

  // Flag to track if we've checked the current mod
  let hasCheckedCurrentMod = false;
  let lastUrl = window.location.href;

  // Storage keys
  const STORAGE_KEYS = {
    MOD_STATUS: "nexus_mod_status_data",
    AUTHOR_STATUS: "nexus_author_status_data",
    LAST_UPDATE: "nexus_data_last_update",
  };

  // Cache duration in milliseconds (24 hours)
  const CACHE_DURATION = 24 * 60 * 60 * 1000;

  // Function to store data with timestamp
  function storeData(key, data) {
    GM_setValue(key, JSON.stringify(data));
    GM_setValue(STORAGE_KEYS.LAST_UPDATE, Date.now());
  }

  // Function to get stored data
  function getStoredData(key) {
    try {
      const data = GM_getValue(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[Debug] Error parsing stored data for ${key}:`, error);
      return null;
    }
  }

  // Function to check if cache is valid
  function isCacheValid() {
    const lastUpdate = GM_getValue(STORAGE_KEYS.LAST_UPDATE, 0);
    return Date.now() - lastUpdate < CACHE_DURATION;
  }

  // Function to fetch and store JSON data
  function fetchAndStoreJSON(url, storageKey, callback) {
    console.log(`[Debug] Fetching JSON from ${url}`);

    // Fetch fresh data first
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function (response) {
        try {
          const data = JSON.parse(response.responseText);
          console.log(`[Debug] Successfully fetched and parsed JSON from ${url}`);
          storeData(storageKey, data);
          if (callback && typeof callback === "function") {
            callback(data);
          }
        } catch (error) {
          console.error(`[Debug] Error parsing JSON from ${url}:`, error);
          // Try to use cached data as fallback
          const cachedData = getStoredData(storageKey);
          if (cachedData && callback && typeof callback === "function") {
            console.log(`[Debug] Using cached data as fallback for ${storageKey}`);
            callback(cachedData);
          }
        }
      },
      onerror: function (error) {
        console.error(`[Debug] Error fetching JSON from ${url}:`, error);
        // Try to use cached data as fallback
        const cachedData = getStoredData(storageKey);
        if (cachedData && callback && typeof callback === "function") {
          console.log(`[Debug] Using cached data as fallback for ${storageKey}`);
          callback(cachedData);
        }
      },
    });
  }

  // Enhanced warning styles
  const styles = `
    .tiles .author {
      overflow: visible !important;
    }

    .mod-warning-banner {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
      padding: 15px;
      border-radius: 0;
      display: flex;
      align-items: center;
      gap: 15px;
      pointer-events: none;
      z-index: 5;
    }

    .mod-warning-banner.severe {
      background: linear-gradient(45deg, rgba(255, 0, 0, 0.05), rgba(255, 0, 0, 0.1));
      border: 2px solid rgba(255, 0, 0, 0.3);
      box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.1);
      pointer-events: none;
    }

    .mod-warning-banner.warning {
      background: linear-gradient(45deg, rgba(255, 165, 0, 0.05), rgba(255, 165, 0, 0.1));
      border: 2px solid rgba(255, 165, 0, 0.3);
      box-shadow: inset 0 0 20px rgba(255, 165, 0, 0.1);
    }

    .mod-warning-banner.info {
      background: linear-gradient(45deg, rgba(0, 136, 255, 0.05), rgba(0, 136, 255, 0.1));
      border: 2px solid rgba(0, 136, 255, 0.3);
      box-shadow: inset 0 0 20px rgba(0, 136, 255, 0.1);
    }

    /* Apply gradient styles to both #featured and #nofeature */
    #featured, #nofeature {
      position: relative;
      overflow: hidden; /* Contain the gradient effect */
    }

    /* Container for warning banners */
    .mod-warning-banners {
      position: absolute;
      z-index: 10;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    /* Individual warning text containers */
    .warning-text-container {
      position: relative;
      z-index: 10;
      width: 100%;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      margin-bottom: 5px;
      pointer-events: auto;
    }

    .mod-warning-banner {
      position: relative;
      width: 100%;
      margin: 0;
      padding: 10px;
      border-radius: 0;
      display: flex;
      align-items: center;
      gap: 15px;
      z-index: 5;
    }

    /* Gradient overlays for both #featured and #nofeature */
    #featured.has-severe-warning, #nofeature.has-severe-warning {
      background: linear-gradient(45deg, rgba(255, 0, 0, 0.05), rgba(255, 0, 0, 0.1));
      border: 2px solid rgba(255, 0, 0, 0.3);
      box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.1);
    }

    #featured.has-warning, #nofeature.has-warning {
      background: linear-gradient(45deg, rgba(255, 165, 0, 0.05), rgba(255, 165, 0, 0.1));
      border: 2px solid rgba(255, 165, 0, 0.3);
      box-shadow: inset 0 0 20px rgba(255, 165, 0, 0.1);
    }

    #featured.has-caution, #nofeature.has-caution {
      background: linear-gradient(45deg, rgba(255, 165, 0, 0.03), rgba(255, 165, 0, 0.06));
      border: 2px solid rgba(255, 165, 0, 0.2);
      box-shadow: inset 0 0 20px rgba(255, 165, 0, 0.05);
    }

    #featured.has-info, #nofeature.has-info {
      background: linear-gradient(45deg, rgba(0, 136, 255, 0.05), rgba(0, 136, 255, 0.1));
      border: 2px solid rgba(0, 136, 255, 0.3);
      box-shadow: inset 0 0 20px rgba(0, 136, 255, 0.1);
    }

    /* Make warning gradients more visible on nofeature */
    #nofeature.has-warning {
      background: linear-gradient(45deg, rgba(255, 165, 0, 0.08), rgba(255, 165, 0, 0.15));
      border: 2px solid rgba(255, 165, 0, 0.4);
      box-shadow: inset 0 0 30px rgba(255, 165, 0, 0.15);
    }

    #nofeature.has-severe-warning {
      background: linear-gradient(45deg, rgba(255, 0, 0, 0.08), rgba(255, 0, 0, 0.15));
      border: 2px solid rgba(255, 0, 0, 0.4);
      box-shadow: inset 0 0 30px rgba(255, 0, 0, 0.15);
    }

    /* Make info gradient more visible on nofeature */
    #nofeature.has-info {
      background: linear-gradient(45deg, rgba(0, 136, 255, 0.08), rgba(0, 136, 255, 0.15));
      border: 2px solid rgba(0, 136, 255, 0.4);
      box-shadow: inset 0 0 30px rgba(0, 136, 255, 0.15);
    }

    .warning-icon-container {
      display: flex;
      gap: 5px;
      pointer-events: auto;
    }

    .warning-icon {
      font-size: 24px;
      animation: bounce 1s infinite;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    .warning-text {
      flex-grow: 1;
      color: white;
      text-shadow: -1px -1px 0 #000,  
                   1px -1px 0 #000,
                   -1px 1px 0 #000,
                   1px 1px 0 #000,
                   2px 2px 4px rgba(0, 0, 0, 0.8);
      font-size: 1.2em;
      pointer-events: auto;
    }

    .warning-actions {
      display: flex;
      gap: 10px;
      pointer-events: auto;
    }

    .warning-button {
      padding: 5px 10px;
      border-radius: 3px;
      color: white;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.2);
      transition: all 0.3s;
      backdrop-filter: blur(5px);
    }

    .warning-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    @keyframes warning-pulse {
      0% { opacity: 1; }
      50% { opacity: 0.8; }
      100% { opacity: 1; }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .mod-tile {
      position: relative;
    }

    .mod-tile .mod-warning-banner {
      font-size: 0.9em;
      padding: 10px;
      z-index: 10;
    }

    .mod-tile .warning-icon {
      font-size: 18px;
    }
    .mod-tile .warning-text {
      font-size: 1em;
    }

    .mod-tile .warning-button {
      font-size: 0.9em;
      padding: 3px 8px;
    }

    /* Smaller author icons in tiles */
    .mod-tile .author-status-container {
      transform: scale(0.8);
      transform-origin: left center;
      margin-left: 3px !important;
    }

    /* Red highlight for broken mods */
    .mod-tile.has-broken-warning {
      position: relative;
    }

    .mod-tile.has-broken-warning::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, rgba(255, 0, 0, 0.03), rgba(255, 0, 0, 0.08));
      border: 2px solid rgba(255, 0, 0, 0.2);
      pointer-events: none;
      z-index: 1;
    }

    /* Blue highlight for informative mods */
    .mod-tile.has-informative-warning {
      position: relative;
    }

    .mod-tile.has-informative-warning::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, rgba(0, 136, 255, 0.03), rgba(0, 136, 255, 0.08));
      border: 2px solid rgba(0, 136, 255, 0.2);
      pointer-events: none;
      z-index: 1;
    }

    .mod-tile.has-broken-warning .mod-image {
      position: relative;
    }

    .mod-tile.has-informative-warning .mod-image {
      position: relative;
    }

    .mod-tile.has-broken-warning .mod-warning-banner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
    }

    .mod-tile.has-broken-warning .warning-text {
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      font-weight: bold;
      color: white;
      font-size: 1.2em;
    }

    .mod-tile.has-informative-warning .mod-warning-banner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
    }

    .mod-tile.has-informative-warning .warning-text {
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      font-weight: bold;
      color: white;
      font-size: 1.2em;
    }

    /* Title warning icons styles */
    .title-warning-icons {
      display: inline-flex;
      gap: 5px;
      margin-right: 10px;
      vertical-align: middle;
    }

    .title-warning-icon {
      font-size: 24px;
      animation: bounce 1s infinite;
      cursor: help;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      transition: transform 0.2s;
    }

    .title-warning-icon:hover {
      transform: scale(1.2);
    }

    /* Title tooltip styles */
    .title-tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      max-width: 300px;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      left: 50%;
      transform: translateX(-50%);
      top: 100%;
      margin-top: 5px;
      white-space: nowrap;
    }

    .title-warning-icon:hover .title-tooltip {
      opacity: 1;
      visibility: visible;
    }

    @keyframes reportButtonPulse {
        0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(245, 87, 93, 0.4);
        }
        50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(245, 87, 93, 0);
        }
        100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(245, 87, 93, 0);
        }
    }

    /* Make warning tags match regular tag sizes */
    .tags li {
      display: inline-flex !important;
      margin: 0 4px 4px 0 !important;
    }

    .tags .btn.inline-flex {
      height: 24px !important;
      padding: 0 8px !important;
      font-size: 12px !important;
      line-height: 24px !important;
      white-space: nowrap !important;
    }

    .tags .icon.icon-tag {
      width: 12px !important;
      height: 12px !important;
      margin-right: 4px !important;
    }

    .tags span:first-child {
      display: inline-flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      margin: -2px !important;
      padding: 2px !important;
    }

    /* Ensure warning tags align with regular tags */
    .tags li[data-warning-tag] {
      order: -1;
    }

    .tags li[data-warning-tag] .btn.inline-flex {
      display: inline-flex !important;
      align-items: center !important;
    }

    .tags li[data-warning-tag] .flex-label {
      line-height: 24px !important;
    }

    /* Copy link button styles */
    .comment-actions .copy-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: transparent;
      color: #888;
      transition: all 0.2s;
      text-decoration: none;
      border: 1px solid #444;
    }

    .comment-actions .copy-link-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .comment-actions .copy-link-btn .icon {
      width: 16px;
      height: 16px;
      fill: white;
      stroke: white;
      stroke-width: 1.5;
      margin-right: 2px;
    }

    .comment-actions .copy-link-btn .flex-label {
      font-size: 12px;
      line-height: 1;
    }

    /* Copy success animation */
    @keyframes copySuccess {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .copy-success {
      animation: copySuccess 0.3s ease;
    }
  `;

  // Add form styles
  const formStyles = `
    .mod-report-form {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 10000;
      width: 550px;
      max-width: 90vw;
      color: white;
      font-size: 14px;
      border: 1px solid #333;
    }

    .mod-report-form.active {
      display: block;
      animation: formFadeIn 0.3s ease;
    }

    @keyframes formFadeIn {
      from { opacity: 0; transform: translate(-50%, -48%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }

    .mod-report-form h2 {
      margin: 0 0 24px;
      color: white;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 12px;
    }

    .mod-report-form h2 svg {
      width: 24px;
      height: 24px;
      fill: #C62D51;
    }

    .mod-report-form .form-group {
      margin-bottom: 18px;
    }

    .mod-report-form label {
      display: block;
      margin-bottom: 8px;
      color: #ddd;
      font-size: 14px;
      font-weight: 500;
    }

    .mod-report-form input[type="text"],
    .mod-report-form textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2a2a2a;
      color: white;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      word-wrap: break-word;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .mod-report-form input[type="text"]:focus,
    .mod-report-form textarea:focus,
    .mod-report-form select:focus {
      border-color: #C62D51;
      outline: none;
      box-shadow: 0 0 0 2px rgba(198, 45, 81, 0.25);
    }

    .mod-report-form select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #2a2a2a;
      color: white;
      font-size: 13px;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 12px top 50%;
      background-size: 12px auto;
      padding-right: 30px;
    }

    .mod-report-form .status-options {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
    }

    .mod-report-form .status-option {
      flex: 1;
      position: relative;
    }

    .mod-report-form .status-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .mod-report-form .status-option label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      margin: 0;
    }

    .mod-report-form .status-option input[type="radio"]:checked + label {
      background: #3a2a2a;
      border-color: #C62D51;
      box-shadow: 0 0 0 2px rgba(198, 45, 81, 0.25);
    }

    .mod-report-form .status-option label:hover {
      background: #333;
    }

    .mod-report-form .status-option .status-icon {
      font-size: 24px;
      margin-bottom: 4px;
    }

    .mod-report-form .status-option .status-name {
      font-weight: 500;
      font-size: 14px;
    }

    .mod-report-form .status-option .status-desc {
      font-size: 12px;
      color: #aaa;
      margin-top: 4px;
    }

    .mod-report-form .buttons {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      justify-content: flex-end;
    }

    .mod-report-form button {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .mod-report-form button svg {
      width: 16px;
      height: 16px;
    }

    .mod-report-form button.secondary {
      background: #333;
      color: white;
    }

    .mod-report-form button.secondary:hover {
      background: #444;
    }

    .mod-report-form button.primary {
      background: #C62D51;
      color: white;
    }

    .mod-report-form button.primary:hover {
      background: #d13359;
      transform: translateY(-1px);
    }

    .mod-report-form .close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .mod-report-form .close:hover {
      color: white;
      background: rgba(255,255,255,0.1);
    }

    .form-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .form-overlay.active {
      display: block;
      animation: overlayFadeIn 0.3s ease;
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .mod-report-form .readonly-input {
      background: #222;
      cursor: default;
      user-select: all;
      color: #aaa;
    }

    .mod-report-form .readonly-input:focus {
      outline: 1px solid #444;
    }

    .mod-report-form textarea {
      min-height: 100px;
      resize: vertical;
      line-height: 1.5;
    }

    .mod-report-form .form-info {
      background: #2a2a2a;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 18px;
      border-left: 3px solid #C62D51;
    }

    .mod-report-form .form-info p {
      margin: 0;
      font-size: 13px;
      color: #ccc;
    }

    .mod-report-form .form-row {
      display: flex;
      gap: 12px;
    }

    .mod-report-form .form-row .form-group {
      flex: 1;
    }

    .mod-report-form .input-icon {
      position: relative;
    }

    .mod-report-form .input-icon svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      fill: #777;
    }

    .mod-report-form .input-icon input {
      padding-left: 36px;
    }
  `;

  // Add new styles for the author report button and form
  const authorReportStyles = `
    .author-report-button {
      position: relative;
      transition: all 0.2s;
      white-space: nowrap;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 0.25rem;
      min-height: 2.25rem;
      padding: 0 0.75rem;
      min-width: 6rem;
      cursor: pointer;
      background: #242A36;
      color: white;
      border: 1px solid #C62D51;
      transition: all 0.3s ease;
      animation: reportButtonPulse 2s infinite;
    }

    .author-report-button:hover {
      background: #2d3545;
    }

    .author-report-button span {
      align-items: center;
      gap: 0.375rem;
    }

    .author-report-form {
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }

    .author-report-form textarea {
      min-height: 120px;
    }

    .author-report-form .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
    }

    .author-report-form .evidence-field {
      margin-top: 10px;
    }

    .author-report-form .evidence-field input {
      margin-bottom: 5px;
    }

    .author-report-form .add-evidence {
      background: #444;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      margin-top: 5px;
      cursor: pointer;
    }

    .author-report-form .add-evidence:hover {
      background: #555;
    }

    .label-selections {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px;
      background: #333;
      border-radius: 4px;
    }

    .label-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .label-row:hover {
      background: #333;
    }

    .label-row > .label-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .label-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
    }

    .label-row label {
      cursor: pointer;
      user-select: none;
      flex-grow: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .label-details {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-left: 24px;
      margin-top: 5px;
    }

    .label-details input {
      width: 100%;
      padding: 6px;
      background: #444;
      border: 1px solid #555;
      border-radius: 3px;
      color: white;
    }

    .label-details input::placeholder {
      color: #888;
    }

    .label-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .label-icon {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
    
    .label-image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .label-image-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    
    .label-image-item:hover {
      background: #333;
    }
    
    .label-image-item.selected {
      border-color: #C62D51;
      background: #3a2a2a;
    }
    
    .label-image-item img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    
    /* Remove label name display */
  `;

  // Add Nexusmods style fixes
  const nexusmodsStyleFixes = `
    /* Nexusmods 2025 update style fixes */
    @import url('https://fonts.googleapis.com/css2?family=Cabin+Condensed:wght@400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@100;200;300;400;500;600;700;800;900&display=swap');

    /* Awful big game-name header below breadcrumbs */
    #mainContent nav:first-child + div {
      display: none;
    }

    /* Get rid of egregious vertical padding */
    .pt-4, .pt-6, .py-4, .py-6 {padding-top: 0.5rem;}
    .pb-4, .pb-6, .py-4, .py-6 {padding-bottom: 0.5rem;}
    .mt-4, .mt-6, .my-4, .my-6 {margin-top: 0.5rem;}
    .mb-4, .mb-6, .my-4, .my-6 {margin-bottom: 0.5rem;}

    .pt-8, .py-8 {padding-top: 1rem;}
    .pb-8, .py-8 {padding-bottom: 1rem;}
    .pt-10, .py-10 {padding-top: 1.5rem;}
    .pb-10, .py-10 {padding-bottom: 1.5rem;}
    .mt-8, .my-8 {margin-top: 1rem;}
    .mb-8, .my-8 {margin-bottom: 1rem;}
    .mt-10, .my-10 {margin-top: 1.5rem;}
    .mb-10, .my-10 {margin-bottom: 1.5rem;}

    /* Holy frell, dudes, WHY? */
    .pt-20, .py-20 {padding-top: 1.5rem;}
    .pb-20, .pb-20 {padding-bottom: 1.5rem;}

    /* Get rid of egregious spacers */
    .space-y-6 > :not([hidden]) ~ :not([hidden]) {margin-top: 0.5rem; margin-bottom: 0.5rem;}
    .space-y-5 > :not([hidden]) ~ :not([hidden]) {margin-top: 0.5rem; margin-bottom: 0.5rem;}

    .space-y-5 > :last-child, .space-y-6 > :last-child {margin-bottom: 0;}

    /* Mod list has a ton of wasted vertical space */
    .group\\/mod-tile {
      /* Don't enforce tile min-height */
      &.min-h-\\[28rem\\] {min-height: unset;}

      /* Radically reduce egregious padding */
      & > :nth-child(2) {padding-top: 0.2rem; padding-bottom: 0.2rem;}
      .py-2 {padding-top: 0.2rem; padding-bottom: 0.2rem;}

      /* Mod title font was too big */
      .typography-body-xl {font-size: 1rem;}

      /* Smaller text for author/category/times */
      .typography-body-sm {font-size: 0.7rem;}

      /* 5 lines of description, not 4 */
      .line-clamp-4 {-webkit-line-clamp: 5;}

      /* 1.5 line-height wasted space */
      .typography-body-md {line-height: 1.35;}
      
      /* Bottom box with endorsements/downloads/size */
      .min-h-8 {min-height: 1.5rem;}
    }
    
    .mods-grid, .profile-mods-grid {
      row-gap: 1rem;
    }

    /* Too much space between mods-grid and pagination */
    .xs\\:mb-10 {margin-bottom: 1.5rem;}

    /* Remove wide gutters, but make allowances for very wide screens */
    .next-container {width: min(max(90%, 2000px), 100%);}
    
    /* Title on mod page */
    #featured h1 {
      /* Use a nice condensed font */
      font-family: 'Saira Condensed','Cabin Condensed',sans-serif;
      margin-bottom: 0.5rem;
    }
    
    /* Gradient on mod page covers too much of the header image */
    #featured #feature .gradient {height: 200px;}
    /* Too much padding at bottom of header */
    #featured #pagetitle {padding-bottom: 0.5rem;}

    /* Description tab of mod page has way too much padding */
    .tab-description {padding-top: 1rem; padding-bottom: 1rem;}
    .tab-description ~ .mod_description_container {padding-top: 0;}

    /* "About this mod" text is useless and wastes space */
    #description_tab_h2 {display: none;}

    /* Mod image gallery doesn't need the counter unless we hover */
    #sidebargallery.modimages .counter {transition: opacity 0.33s;}
    #sidebargallery.modimages:not(:hover) .counter {opacity: 0;}

    /* Too much vertical padding around thumbnail gallery */
    #sidebargallery ul.thumbgallery {padding-top: 0.5rem; padding-bottom: 0.5rem;}

    /* File info area has too much vertical padding; SHOULD BE ZERO! */
    /* Only do this after thumbnail gallery because this is also used for article info that does need padding */
    .modpage .info-details .sidebargallery + #fileinfo {padding-top: 0; padding-bottom: 0;}

    /* Antivirus status has bogus inline styles that add vertical size */
    .modpage #fileinfo .sideitem:last-child > div {height: auto !important; top: unset !important;}
    
    /* Too much padding for tags and we don't need a header */
    .modpage .sideitems.side-tags {padding-top: 0.5rem; padding-bottom: 0.5rem;}
    .modpage .sideitems.side-tags h2 {display: none;}

    /* Keep the same color as other links */
    .modtabs .alert {
      color: var(--theme-primary);
      display: inline-block;
      font-size: 11px;
      color: #fff;
      padding: 2px 4px;
      text-align: center;
      border-radius: 2px;
      position: relative;
      margin: 0 0 0 5px;
      top: -1px;
      background-color: var(--theme-primary, #da8e35);
    }

    /*
      Share and report buttons should be up in the header, not in the middle of the page wasting
      space. Until these are moved, hide them. (Yes, it does mean you need to turn off the styles
      to report a mod or use the share button. Keep pestering Nexus, politely, to move them.)
     */
    .tabcontent .report-abuse-btn, .tabcontent .button-share {display: none !important;}
    
    /* Why is there a margin here? Why? */
    .tab-description .accordionitems {margin-bottom: 0;}
    
    /* Comment count on posts tab has needless top padding */
    #comment-count {padding-top: 0;}
    /* Too big a margin below comment page nav */
    .comments .comment-nav {margin-bottom: 0.5rem;}

    /* Article page title area has too much bottom padding, inconsistent with mod page */
    #featured #feature.blank #pagetitle {padding-bottom: 0.5rem;}

    /* Article page background is weirdly bright compared to description */
    .articlepage article {background-color: var(--surface-mid);}

    /* Make numerical lists more like bullet lists so they indent properly */
    ul.content_list_ordered > li {margin-left: 20px;}

    /* Comments below article have extra space they don't need */
    .container ~ #comment-container {padding-top: 0;}

    /* Give back the nice background image */
    body::before {
      background-image: url('/assets/images/default/bg_game_index.jpg');
      height: 100%;
      filter: none;
    }

    /* Game overview page */

    /* Trending Mods section is huge and needs tweaking */
    section[aria-labelledby="trending-mods-header"] {
      /* 2nd div has the content; 1st has the header */
      & > div:nth-of-type(2) {
        display: grid;
        grid-template-columns: auto 30%;
        grid-column-gap: 1.5rem;
        /* Divider we don't need or want */
        hr {display: none;}
        /* Smaller section below the two big tiles */
        & > div:nth-of-type(2) {
          margin: 0;
          grid-template-columns: repeat(2, minmax(0,1fr));
          grid-auto-rows: minmax(min-content, 1fr);
          grid-column-gap: 1.5rem;
          grid-row-gap: 1rem;
        }
      }
    }

    /* LOL bye */
    section[aria-labelledby="popular-collections-header"] {
      display: none;
    }

    section[aria-labelledby="more-mods-header"] {
      /* Move the time button in More Mods next to the other buttons */
      div.flex.sm\\:flex-row {
        div:first-child {width: auto;}
        button:nth-child(2) {margin-left: unset;}
      }
    }

    .news-grid {
      /* What's up with those huge titles? */
      .typography-heading-sm {font-size: 1.2rem;}
    }
    
    
    /* Theme colors Nexus wanted to remove for some reason */
    body.scheme-theme-ReskinBlue {
      --theme-primary: #57a5cc !important;
      --theme-primary-translucent: #57a5ccd8 !important;
      --theme-secondary: #4584a3 !important;
      --theme-dark: #356983 !important
    }
    body.scheme-theme-Fallout {
      --theme-primary: #92ab20 !important;
      --theme-primary-translucent: #92ab20d8 !important;
      --theme-secondary: #a4c21e !important;
      --theme-dark: #545e24 !important
    }
    body.scheme-theme-Purple {
      --theme-primary: #9561de !important;
      --theme-primary-translucent: #9561ded8 !important;
      --theme-secondary: #a275d3 !important;
      --theme-dark: #4700aa !important
    }
    body.scheme-theme-LighterBlue {
      --theme-primary: #679fd6 !important;
      --theme-primary-translucent: #679fd6d8 !important;
      --theme-secondary: #7ab1e8 !important;
      --theme-dark: #4475a6 !important
    }
    body.scheme-theme-BatmanBlue {
      --theme-primary: #7495b0 !important;
      --theme-primary-translucent: #7495b0d8 !important;
      --theme-secondary: #86aece !important;
      --theme-dark: #296291 !important
    }
    body.scheme-theme-Burgundy {
      --theme-primary: #bf4848 !important;
      --theme-primary-translucent: #bf4848d8 !important;
      --theme-secondary: #e27171;
      --theme-dark: #9d3939
    }
    body.scheme-theme-Teal {
      --theme-primary: #598a9f !important;
      --theme-primary-translucent: #598a9fd8 !important;
      --theme-secondary: #76a3b7 !important;
      --theme-dark: #184a60 !important
    }
    body.scheme-theme-Sepia {
      --theme-primary: #a5704f !important;
      --theme-primary-translucent: #a5704fd8 !important;
      --theme-secondary: #9a7d6b !important;
      --theme-dark: #604331 !important
    }
    body.scheme-theme-Gold {
      --theme-primary: #b99d3e !important;
      --theme-primary-translucent: #b99d3ed8 !important;
      --theme-secondary: #dfba3b !important;
      --theme-dark: #c77f18 !important
    }
    body.scheme-theme-PaleBrown {
      --theme-primary: #8e7f5f !important;
      --theme-primary-translucent: #8e7f5fd8 !important;
      --theme-secondary: #a68f5e !important;
      --theme-dark: #584a2d !important
    }
    body.scheme-theme-DeepOrange {
      --theme-primary: #e6832b !important;
      --theme-primary-translucent: #e6832bd8 !important;
      --theme-secondary: #faa431 !important;
      --theme-dark: #a7540a !important
    }
    body.scheme-theme-DarkYellow {
      --theme-primary: #b7b60f !important;
      --theme-primary-translucent: #b7b60fd8 !important;
      --theme-secondary: #e7d528 !important;
      --theme-dark: #e09d05 !important
    }
    body.scheme-theme-DarkRose {
      --theme-primary: #976060 !important;
      --theme-primary-translucent: #976060d8 !important;
      --theme-secondary: #bf8282 !important;
      --theme-dark: #6a1f1f !important
    }
    body.scheme-theme-VioletBlue {
      --theme-primary: #576eca !important;
      --theme-primary-translucent: #576ecad8 !important;
      --theme-secondary: #a4a9e1 !important;
      --theme-dark: #4955da !important
    }
    body.scheme-theme-Brown {
      --theme-primary: #502c15 !important;
      --theme-primary-translucent: #502c15d8 !important;
      --theme-secondary: #996240 !important;
      --theme-dark: #3a1b07 !important
    }
    body.scheme-theme-Sienna {
      --theme-primary: #8f482c !important;
      --theme-primary-translucent: #8f482cd8 !important;
      --theme-secondary: #bc6d4e !important;
      --theme-dark: #531f0b !important
    }
    body.scheme-theme-TankGrey {
      --theme-primary: #a7a785 !important;
      --theme-primary-translucent: #a7a785d8 !important;
      --theme-secondary: #969673 !important;
      --theme-dark: #41412c !important
    }
    body.scheme-theme-MossGreen {
      --theme-primary: #9d9d5a !important;
      --theme-primary-translucent: #9d9d5ad8 !important;
      --theme-secondary: #c6c665 !important;
      --theme-dark: #426535 !important
    }
    body.scheme-theme-DeepBlue {	/* Skyrim SE */
      --theme-primary: #8197ec !important;
      --theme-primary-translucent: #8197ecd8 !important;
      --theme-secondary: #a4b7ff !important;
      --theme-dark: #0e37da !important
    }
    body.scheme-theme-MediumBrown {
      --theme-primary: #b36f3a !important;
      --theme-primary-translucent: #b36f3ad8 !important;
      --theme-secondary: #7f613a !important;
      --theme-dark: #502706 !important
    }
    body.scheme-theme-Salmon {
      --theme-primary: #fc4f49 !important;
      --theme-primary-translucent: #fc4f49d8 !important;
      --theme-secondary: #ff5f54 !important;
      --theme-dark: #ee0013 !important
    }
    body.scheme-theme-RDR2Red {
      --theme-primary: #dc1a0e !important;
      --theme-primary-translucent: #dc1a0ed8 !important;
      --theme-secondary: #cc0019 !important;
      --theme-dark: #cc0019 !important
    }
    .btn.inline-flex .icon {
        display: block !important;
    }
  `;

  // Add styles to document
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles + formStyles + authorReportStyles + nexusmodsStyleFixes;

  // Insert styles as soon as possible
  if (document.head) {
    document.head.appendChild(styleSheet);
  } else {
    // If head doesn't exist yet, wait for it
    document.addEventListener("DOMContentLoaded", () => {
      document.head.appendChild(styleSheet);
    });
  }

  // Create tooltip element early
  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: fixed;
    display: none;
    background: #000;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    max-width: min(600px, 80vw);
    min-width: 200px;
    width: auto;
    box-shadow: 0 3px 12px rgba(0,0,0,0.5);
    z-index: 10000;
    pointer-events: none;
    border: 1px solid #333;
    line-height: 1.3;
    white-space: pre-line;
    word-wrap: break-word;
    overflow-wrap: break-word;
  `;

  // Add tooltip when body is available
  if (document.body) {
    document.body.appendChild(tooltip);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(tooltip);
    });
  }

  // Initialize main functionality when DOM is ready
  function init() {
    checkModStatus();
    hasCheckedCurrentMod = true;
    checkAuthorStatus();
    
    // Process all mod tiles on page load
    const cachedData = getStoredData(STORAGE_KEYS.MOD_STATUS);
    if (cachedData) {
      addModStatusToTiles(cachedData);
    } else {
      fetchAndStoreJSON(
        MOD_STATUS_URL,
        STORAGE_KEYS.MOD_STATUS,
        addModStatusToTiles
      );
    }
    
    // Replace file icons in any file lists already on the page
    replaceFileIcons();
    
    setupDOMObserver();
    addCopyLinkButtons();
    addModManagerDownloadButtons(); // Add this line to call our new function
  }

  // Run init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Helper function to format tooltip text
  function formatTooltipText(text, additionalInfo = "") {
    // Split very long words
    const wordWrapText = text.replace(/(\S{30})/g, "$1\u200B");

    const formattedText = wordWrapText
      .replace(/\\n/g, "\n")
      .replace(/\((.*?)\)/g, '<span style="font-size: 0.85em;">($1)</span>');

    return (
      additionalInfo
        ? `<div style="font-size: 14px; margin: 0; padding: 0;">${formattedText}</div><div style="font-size: 12px; color: #aaa; margin-top: 4px; border-top: 1px solid #444; padding-top: 4px;">${additionalInfo}</div>`
        : `<div style="font-size: 14px; margin: 0; padding: 0;">${formattedText}</div>`
    ).trim();
  }

  // Handle tooltip positioning
  function updateTooltipPosition(e) {
    const offset = 15; // Distance from cursor
    const padding = 20; // Padding from viewport edges

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get tooltip dimensions
    const tooltipRect = tooltip.getBoundingClientRect();

    // Calculate initial position
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // If tooltip is wider than half the viewport, center it horizontally
    if (tooltipRect.width > viewportWidth / 2) {
      x = Math.max(padding, (viewportWidth - tooltipRect.width) / 2);
    }
    // Otherwise, check horizontal positioning
    else if (x + tooltipRect.width > viewportWidth - padding) {
      x = e.clientX - tooltipRect.width - offset;
      if (x < padding) {
        x = padding;
      }
    }

    // If tooltip is taller than half the viewport, position at top
    if (tooltipRect.height > viewportHeight / 2) {
      y = padding;
    }
    // Otherwise, check vertical positioning
    else if (y + tooltipRect.height > viewportHeight - padding) {
      y = e.clientY - tooltipRect.height - offset;
      if (y < padding) {
        y = padding;
      }
    }

    // Apply final position
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  // Extract game and mod ID from URL
  function getGameAndModId() {
    const match = window.location.href.match(
      /nexusmods\.com\/([^\/]+)\/mods\/(\d+)/
    );
    if (!match) {
      console.warn("[Debug] Could not parse game/mod ID from URL");
      return {};
    }
    return { gameId: match[1], modId: match[2] };
  }

  // Default icons for different status types
  const DEFAULT_ICONS = {
    MALICIOUS: "⛔",
    WARNING: "⚡",
    INFORMATIVE: "ℹ️",
    CAUTION: "ℹ️",
  };

  // Add status indicator to author name
  function addAuthorStatusIndicator(authorElement, authorInfo) {
    const container = document.createElement("span");
    container.style.cssText = `
      margin-left: 5px;
      display: inline-flex;
      gap: 4px;
      align-items: center;
      vertical-align: middle;
      line-height: 1;
      height: 16px;
    `;
    container.classList.add("author-status-container");

    authorInfo.labels.forEach((label) => {
      const wrapper = label.url
        ? document.createElement("a")
        : document.createElement("span");
      wrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        height: 16px;
        vertical-align: middle;
      `;

      if (label.url) {
        wrapper.href = label.url;
        wrapper.target = "_blank";
        wrapper.rel = "noopener noreferrer";
        wrapper.style.textDecoration = "none";
      }

      const indicator = document.createElement("span");
      indicator.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 24px;
        cursor: ${label.url && label.url !== null ? "pointer" : "help"};
        vertical-align: middle;
        line-height: 1;
      `;

      // Create either an image or fallback text icon
      if (label.icon && label.icon.startsWith("http")) {
        const img = document.createElement("img");
        img.style.cssText = `
          width: 16px;
          height: 16px;
          vertical-align: middle;
          object-fit: contain;
          display: block;
        `;
        img.src = label.icon;

        // Fallback to emoji if image fails to load
        img.onerror = () => {
          indicator.textContent = DEFAULT_ICONS[label.type] || "⚠️";
          indicator.style.color = label.color || "orange";
          indicator.style.fontSize = "14px"; // Adjust emoji size to match image height
        };

        indicator.appendChild(img);
      } else {
        indicator.textContent = DEFAULT_ICONS[label.type] || "⚠️";
        indicator.style.color = label.color || "orange";
        indicator.style.fontSize = "14px"; // Adjust emoji size to match image height
      }

      // Add hover effect
      indicator.style.transition = "transform 0.2s";

      // Custom tooltip handlers
      const showTooltip = (e) => {
        console.log("[Debug] Showing tooltip for label:", label);
        indicator.style.transform = "scale(1.2)";
        tooltip.innerHTML = formatTooltipText(
          label.tooltip,
          label.url ? "Click to learn more" : ""
        );
        tooltip.style.display = "block";
        console.log("[Debug] Tooltip text set to:", tooltip.innerHTML);
        updateTooltipPosition(e);
      };

      const hideTooltip = () => {
        indicator.style.transform = "scale(1)";
        tooltip.style.display = "none";
      };

      indicator.addEventListener("mouseover", showTooltip);
      indicator.addEventListener("mousemove", updateTooltipPosition);
      indicator.addEventListener("mouseout", hideTooltip);

      wrapper.appendChild(indicator);
      container.appendChild(wrapper);
    });

    authorElement.insertAdjacentElement("afterend", container);
  }

  // Check author status
  function checkAuthorStatus() {
    const authorLinks = document.querySelectorAll("a[href*='/users/']");

    // Function to process author status data
    function processAuthorStatus(authorStatus) {
      if (!authorStatus) return;

      authorLinks.forEach((authorLink) => {
        const authorName = authorLink.textContent.trim();

        // Skip if this author link already has status indicators
        if (
          authorLink.nextElementSibling?.classList.contains(
            "author-status-container"
          )
        ) {
          return;
        }

        // Build array of labels for this author
        const authorLabels = [];

        // Check each label to see if this author is included
        for (const [labelKey, labelData] of Object.entries(
          authorStatus.Labels
        )) {
          if (labelData.authors.includes(authorName)) {
            const label = {
              label: labelData.label,
              icon: labelData.icon,
            };

            // Check if there's a custom tooltip for this author and label
            if (authorStatus.Tooltips?.[authorName]?.[labelKey]) {
              const tooltip = authorStatus.Tooltips[authorName][labelKey];
              // Use default label if tooltip.label is null
              label.tooltip = tooltip.label === null ? labelData.label : tooltip.label;
              // Only set URL if referenceLink is not null
              label.url = tooltip.referenceLink === null ? null : tooltip.referenceLink;
            } else {
              label.tooltip = labelData.label;
            }

            authorLabels.push(label);
          }
        }

        // If we found any labels, add them to the author element
        if (authorLabels.length > 0) {
          addAuthorStatusIndicator(authorLink, { labels: authorLabels });
        }
      });
    }

    // Always fetch fresh data first
    fetchAndStoreJSON(
      AUTHOR_STATUS_URL,
      STORAGE_KEYS.AUTHOR_STATUS,
      processAuthorStatus
    );
  }

  // Enhanced status types and icons
  const STATUS_TYPES = {
    BROKEN: {
      icons: ["⛔"],
      color: "#ff0000",
      class: "severe",
    },
    LAME: {
      icons: ["👎"],
      color: "#ff0000",
      class: "severe",
    },
    CLOSED_PERMISSIONS: {
      icons: ["🔒"],
      color: "#ff4400",
      class: "warning",
    },
    OPEN_PERMISSIONS: {
      icons: ["🔓"],
      color: "#00aa00",
      class: "success",
    },
    CUSTOM_PERMISSIONS: {
      icons: ["⚖️"],
      color: "#888888",
      class: "info",
    },
    AUTHOR_SUCKS: {
      icons: ["👿"],
      color: "#ff4400",
      class: "warning",
    },
    // Change CAUTION to INFORMATIVE
    INFORMATIVE: {
      icons: ["ℹ️"],
      color: "#0088ff",
      class: "info",
    },
  };

  // Create warning banner
  function createWarningBanner(status) {
    console.log("[Debug] Creating warning banner with status:", status);
    const banner = document.createElement("div");

    // Map CAUTION to INFORMATIVE for backwards compatibility
    if (status.type === "CAUTION") {
      status.type = "INFORMATIVE";
    }

    const statusType = STATUS_TYPES[status.type] || STATUS_TYPES.WARNING;
    console.log("[Debug] Using status type:", statusType);

    banner.className = `mod-warning-banner ${statusType.class}`;
    console.log("[Debug] Banner class:", banner.className);

    const iconContainer = document.createElement("div");
    iconContainer.className = "warning-icon-container";
    statusType.icons.forEach((icon) => {
      const span = document.createElement("span");
      span.className = "warning-icon";
      span.textContent = icon;
      if (status.type === "CLOSED_PERMISSIONS") {
        // Add tooltip handlers
        const showTooltip = (e) => {
          tooltip.innerHTML = formatTooltipText(
            `This mod has closed ${status.reason.toLowerCase()}`
          );
          tooltip.style.display = "block";
          updateTooltipPosition(e);
        };

        const hideTooltip = () => {
          tooltip.style.display = "none";
        };

        span.addEventListener("mouseover", showTooltip);
        span.addEventListener("mousemove", updateTooltipPosition);
        span.addEventListener("mouseout", hideTooltip);
        span.style.cursor = "help";
      }
      iconContainer.appendChild(span);
    });

    const textContainer = document.createElement("div");
    textContainer.className = "warning-text";

    // Count line breaks and adjust featured div height if needed
    const lineBreakCount = (status.reason.match(/\n/g) || []).length;
    if (lineBreakCount > 2) {
      const featured = document.querySelector("#featured");
      if (featured) {
        const extraHeight = (lineBreakCount - 2) * 20; // 20px per extra line break
        featured.style.minHeight = `calc(400px + ${extraHeight}px)`; // 400px is default height
      }
    }

    // Format parenthetical text in warning banner and handle line breaks
    const formattedReason = status.reason
      .replace(/\((.*?)\)/g, '<span style="font-size: 0.85em;">($1)</span>')
      .replace(/\n/g, "<br>"); // Replace actual newlines with <br> tags
    // Replace underscores with spaces in status type
    const formattedType = status.type.replace(/_/g, " ");
    textContainer.innerHTML = `${formattedReason}`;

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "warning-actions";

    if (status.alternative) {
      const altLink = document.createElement("a");
      altLink.href = `${status.alternative}`;
      altLink.className = "warning-button";
      altLink.textContent = "View Alternative";
      altLink.target = "_blank";
      actionsContainer.appendChild(altLink);
    }

    banner.appendChild(iconContainer);
    banner.appendChild(textContainer);
    banner.appendChild(actionsContainer);

    return banner;
  }

  // Add warning banner to page
  function addWarningBanner(status) {
    if (!status || !status.type) {
      console.warn("[Debug] Invalid status object:", status);
      return;
    }

    console.log("[Debug] Adding warning banner to page");
    const featured = document.querySelector("#featured");
    if (!featured) {
      console.warn("[Debug] Featured element not found");
      return;
    }

    // Create a container for all banners if it doesn't exist
    let bannerContainer = document.querySelector(".mod-warning-banners");
    if (!bannerContainer) {
      bannerContainer = document.createElement("div");
      bannerContainer.className = "mod-warning-banners";
      featured.insertBefore(bannerContainer, featured.firstChild);
    }

    // Check for existing banner of the same type
    const existingBanner = document.querySelector(
      `.mod-warning-banner.${status.type.toLowerCase()}`
    );
    if (existingBanner) {
      console.log("[Debug] Removing existing banner of same type");
      existingBanner.closest(".warning-text-container").remove();
    }

    const banner = createWarningBanner(status);
    if (!banner) {
      console.warn("[Debug] Failed to create warning banner");
      return;
    }

    banner.classList.add(status.type.toLowerCase());

    // Create a container for the warning text
    const textContainer = document.createElement("div");
    textContainer.className = "warning-text-container";
    textContainer.appendChild(banner);

    // Update the featured class based on warning type
    if (status.type === "BROKEN" || status.type === "LAME" || status.type === "INFORMATIVE") {
      featured.className = "has-severe-warning";
    } else if (status.type === "CLOSED_PERMISSIONS") {
      if (!featured.className.includes("has-severe-warning")) {
        featured.className = "has-warning";
      }
    } else {
      if (!featured.className.includes("has-severe-warning")) {
        featured.className =
          status.type === "CAUTION" ? "has-caution" : "has-warning";
      }
    }

    // Always append to maintain the order from the sorting
    bannerContainer.appendChild(textContainer);

    console.log("[Debug] Banner added to featured element");
  }

  // Add warning banner to mod tile
  function addWarningBannerToTile(modTile, status) {
    console.log("[Debug] Adding warning banner to mod tile");

    // Check for existing banner
    const existingBanner = modTile.querySelector(".mod-warning-banner");
    if (existingBanner) {
      console.log("[Debug] Removing existing banner");
      existingBanner.remove();
    }

    // Map CAUTION to INFORMATIVE for tiles
    if (status.type === "CAUTION") {
      status.type = "INFORMATIVE";
    }

    // Add highlight styling to the mod tile itself
    modTile.style.border = `2px solid ${status.color || STATUS_TYPES[status.type]?.color || "#ff0000"}`;
    modTile.style.boxShadow = `0 0 8px ${status.color || STATUS_TYPES[status.type]?.color || "#ff0000"}`;
    
    // Add status class to the tile
    modTile.classList.add(`status-${status.type.toLowerCase()}`);
    modTile.classList.add('status-processed');

    // Remove the title emoji code section - as requested

    // Create a simplified banner for tiles (icon only, no text)
    const banner = document.createElement("div");
    banner.className = `mod-warning-banner ${status.type.toLowerCase()}`;
    banner.style.position = "absolute";
    banner.style.zIndex = "11"; // Set higher than the existing elements to ensure visibility
    banner.style.top = "5px"; // Changed from bottom to top for better visibility
    banner.style.right = "5px"; // Changed from left to right for better visibility
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.justifyContent = "center";
    banner.style.borderRadius = "50%"; // Make it circular
    banner.style.padding = "5px"; // Smaller padding for icon-only
    banner.style.width = "28px"; // Slightly larger for better visibility
    banner.style.height = "28px"; // Slightly larger for better visibility
    banner.style.backgroundColor = status.color || STATUS_TYPES[status.type]?.color || "#ff0000";
    banner.style.backgroundColor = "transparent"; // Remove background color
    banner.style.boxShadow = "none"; // Remove shadow

    const iconContainer = document.createElement("div");
    iconContainer.className = "warning-icon-container";
    const icon = document.createElement("span");
    icon.className = "warning-icon";
    icon.textContent = STATUS_TYPES[status.type]?.icons[0] || "⛔";
    icon.style.fontSize = "20px"; // Adjust size for better visibility
    icon.style.lineHeight = "1"; // Improve vertical centering
    iconContainer.appendChild(icon);

    // Remove text container - icon only
    banner.appendChild(iconContainer);

    // Add tooltip with full details
    const showTooltip = (e) => {
      tooltip.innerHTML = formatTooltipText(status.reason);
      tooltip.style.display = "block";
      updateTooltipPosition(e);
    };

    const hideTooltip = () => {
      tooltip.style.display = "none";
    };

    banner.addEventListener("mouseover", showTooltip);
    banner.addEventListener("mousemove", updateTooltipPosition);
    banner.addEventListener("mouseout", hideTooltip);
    banner.style.cursor = "help";

    // Find the relative div that contains the image
    const imageContainer = modTile.querySelector('.relative');
    if (imageContainer) {
      imageContainer.appendChild(banner);
    } else {
      // Fallback to appending to the tile itself if the new structure isn't found
      modTile.appendChild(banner);
    }
  }

  // Function to replace download buttons with report button
  function addReportButton() {
    const modActions = document.querySelector(".modactions.clearfix");
    if (!modActions) return;

    // Remove download label and buttons
    const downloadLabel = modActions.querySelector(".dllabel");
    if (downloadLabel) downloadLabel.remove();

    const nmmButton = modActions.querySelector("#action-nmm");
    if (nmmButton) nmmButton.remove();

    const manualButton = modActions.querySelector("#action-manual");
    if (manualButton) manualButton.remove();

    // Remove Vote and Add Media buttons
    const voteButton = modActions.querySelector("li a .icon-vote");
    if (voteButton) voteButton.closest("li").remove();

    const addMediaButton = modActions.querySelector("#action-media");
    if (addMediaButton) addMediaButton.remove();

    // Check if report button already exists
    if (modActions.querySelector("#action-report-hq")) return;

    // Create report button
    const reportLi = document.createElement("li");
    reportLi.id = "action-report-hq";

    const reportButton = document.createElement("a");
    reportButton.className = "btn inline-flex";
    reportButton.style.cssText = `
        font-size: 12px;
        background-color: #242A36;
        border: 1px solid #C62D51;
        transition: all 0.3s ease;
        animation: reportButtonPulse 2s infinite;
    `;

    // Create custom icon using the endorse icon but flipped upside down
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon icon-endorse");
    svg.style.transform = "rotate(180deg)"; // Flip the icon upside down
    svg.style.marginRight = "5px";

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      "https://www.nexusmods.com/assets/images/icons/icons.svg#icon-endorse"
    );
    svg.appendChild(use);

    const label = document.createElement("span");
    label.className = "flex-label";
    label.innerHTML = `Report to <span style="color: #F5575D">H</span><span style="color: #3889ED">Q</span>`;

    reportButton.appendChild(svg);
    reportButton.appendChild(label);
    reportButton.addEventListener("click", showReportForm);

    reportLi.appendChild(reportButton);
    modActions.appendChild(reportLi);
  }

  // Modify setupDOMObserver to handle different page types
  function setupDOMObserver() {
    let checkTimeout;
    const observer = new MutationObserver((mutations) => {
      // Clear any pending timeout
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }

      // Check if URL has changed
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        hasCheckedCurrentMod = false;
      }

      // Set a new timeout to run checks after mutations have settled
      checkTimeout = setTimeout(() => {
        // Add report button
        addReportButton();

        // Add copy link buttons to any new comments
        addCopyLinkButtons();
        
        // Add Mod manager download buttons to any new download sections
        addModManagerDownloadButtons();
        
        // Replace file icons in any file lists
        replaceFileIcons();

        // Check if we're on a mod page and haven't checked it yet
        const pageTitle = document.querySelector("#pagetitle");
        if (
          pageTitle &&
          !hasCheckedCurrentMod &&
          !document.querySelector(".mod-warning-banner")
        ) {
          checkModStatus();
          hasCheckedCurrentMod = true;
        }

        // Check for unprocessed mod tiles and process them in batch
        // Updated selector to handle both old and new mod tile structures
        const unprocessedTiles = document.querySelectorAll(
          '.mod-tile:not(.status-processed), div[data-e2eid="mod-tile"]:not(.status-processed)'
        );
        if (unprocessedTiles.length > 0) {
          console.log(`[Debug] Found ${unprocessedTiles.length} unprocessed mod tiles`);
          
          // Get the cached data
          const cachedData = getStoredData("modStatus");
          if (cachedData && isCacheValid()) {
            console.log("[Debug] Using cached mod status data");
            addModStatusToTiles(cachedData);
          } else {
            console.log("[Debug] Fetching fresh mod status data");
            fetchAndStoreJSON(MOD_STATUS_URL, "modStatus", (data) => {
              addModStatusToTiles(data);
            });
          }
        }

        // Check which type of page we're on and run appropriate checks
        if (window.location.href.includes("next.nexusmods.com/profile/")) {
          // Next.js profile page
          addReportButtonToProfile();
          addAuthorStatusToNextProfile();
        } else {
          // Regular pages
          const authorLinks = document.querySelectorAll("a[href*='/users/']");
          const unlabeledAuthors = Array.from(authorLinks).some(
            (link) =>
              !link.nextElementSibling?.classList.contains(
                "author-status-container"
              )
          );

          if (unlabeledAuthors) {
            checkAuthorStatus();
          }
        }
      }, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Function to check if a mod matches any keyword rules
  function checkKeywordRules(modStatusData, gameName, modTitle) {
    // Get global and game-specific rules
    const globalRules = modStatusData["Keyword Rules"]?.["global"];
    const gameRules = modStatusData["Keyword Rules"]?.[gameName];

    // If no rules exist, return null
    if (!globalRules && !gameRules) return null;

    // Get all text from breadcrumb categories
    const breadcrumbText = Array.from(
      document.querySelectorAll("#breadcrumb li a, #breadcrumb li")
    )
      .map((el) => el.textContent.trim())
      .join(" ");

    // Get the mod title
    const h1Title =
      document.querySelector("#pagetitle h1")?.textContent.trim() || "";

    // Get any category text
    const categoryText =
      document.querySelector(".category")?.textContent.trim() || "";

    // Combine all text to search through
    const fullText =
      `${breadcrumbText} ${h1Title} ${modTitle} ${categoryText}`.toLowerCase();

    // Helper function to check rules
    const checkRules = (rules) => {
      for (const [statusType, ruleList] of Object.entries(rules)) {
        for (const rule of ruleList) {
          if (fullText.includes(rule.pattern.toLowerCase())) {
            // Convert CAUTION to INFORMATIVE
            const finalStatusType = statusType === "CAUTION" ? "INFORMATIVE" : statusType;
            return {
              type: finalStatusType,
              reason: rule.reason,
              alternative: rule.alternative,
              color: STATUS_TYPES[finalStatusType]?.color || "#ff0000",
            };
          }
        }
      }
      return null;
    };

    // Check game-specific rules first (they take precedence)
    if (gameRules) {
      const gameMatch = checkRules(gameRules);
      if (gameMatch) return gameMatch;
    }

    // Then check global rules
    if (globalRules) {
      const globalMatch = checkRules(globalRules);
      if (globalMatch) return globalMatch;
    }

    return null;
  }

  // Modify checkModTileStatus to handle the new mod tile structure
  function checkModTileStatus(modTile) {
    // Find the title link in the new structure
    const titleLink = modTile.querySelector('[data-e2eid="mod-tile-title"]');
    if (!titleLink) {
      console.warn("[Debug] Could not find title link in new tile structure");
      return null;
    }

    const match = titleLink.href.match(/nexusmods\.com\/([^\/]+)\/mods\/(\d+)/);
    if (!match) {
      console.warn("[Debug] Could not parse game/mod ID from URL");
      return null;
    }

    const gameId = match[1];
    const modId = match[2];

    return { gameId, modId };
  }

  // Function to clean permission title
  function cleanPermissionTitle(title) {
    return title
      .replace(" permission", "") // Remove standalone "permission"
      .replace(" in mods/files that", " for files that"); // Clean up the "in mods/files that" phrase
  }

  // Function to filter unwanted permissions
  function shouldIncludePermission(title) {
    const excludedPermissions = [
      "Asset use for files that are being sold",
      "Asset use for files that earn donation points",
      "Asset use permission in mods/files that are being sold",
      "Asset use permission in mods/files that earn donation points",
      "Other user's assets",
    ];

    const cleanedTitle = cleanPermissionTitle(title);
    return !excludedPermissions.includes(cleanedTitle);
  }

  // Function to fetch permissions from a specific mod page
  function fetchPermissionsFromModPage(modPageUrl) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: modPageUrl,
        onload: function (response) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(
            response.responseText,
            "text/html"
          );
          const permissionsList = doc.querySelectorAll(
            ".permissions .permission-no, .permissions .permission-maybe, .permissions .permission-yes"
          );
          const closedPermissions = [];
          let openPermissions = [];
          let customPermissions = [];

          permissionsList.forEach((permission) => {
            const titleElement = permission.querySelector(".permissions-title");
            if (titleElement) {
              const title = titleElement.textContent.trim();
              if (shouldIncludePermission(title)) {
                // Treat both 'no' and 'maybe' as closed permissions
                if (
                  permission.classList.contains("permission-no") ||
                  permission.classList.contains("permission-maybe")
                ) {
                  closedPermissions.push(cleanPermissionTitle(title));
                } else if (permission.classList.contains("permission-yes")) {
                  openPermissions.push(cleanPermissionTitle(title));
                }
              }
            }
          });

          resolve({ closedPermissions, openPermissions, customPermissions });
        },
        onerror: function () {
          resolve({
            closedPermissions: [],
            openPermissions: [],
            customPermissions: [],
          });
        },
      });
    });
  }

  // Function to check if current page is a mod page
  function isModPage() {
    return /nexusmods\.com\/[^\/]+\/mods\/\d+/.test(window.location.href);
  }

  // Function to check mod permissions
  async function checkModPermissions() {
    // Only check permissions on mod pages
    if (!isModPage()) {
      return null;
    }

    // Check if the mod has id="nofeature"
    const noFeatureElement = document.getElementById("nofeature");

    // First try to get permissions from current page
    const permissionsList = document.querySelectorAll(
      ".permissions .permission-no, .permissions .permission-maybe, .permissions .permission-yes"
    );
    let closedPermissions = [];
    let openPermissions = [];
    let customPermissions = [];

    if (permissionsList.length === 0) {
      // If no permissions found on current page, fetch from the current mod's description tab
      const currentUrl = window.location.href;
      const descriptionUrl = currentUrl.split("?")[0] + "?tab=description";
      const {
        closedPermissions: fetchedClosedPermissions,
        openPermissions: fetchedOpenPermissions,
        customPermissions: fetchedCustomPermissions,
      } = await fetchPermissionsFromModPage(descriptionUrl);
      closedPermissions = fetchedClosedPermissions;
      openPermissions = fetchedOpenPermissions;
      customPermissions = fetchedCustomPermissions;
    } else {
      // Get permissions from current page
      permissionsList.forEach((permission) => {
        const titleElement = permission.querySelector(".permissions-title");
        if (titleElement) {
          const title = titleElement.textContent.trim();
          if (shouldIncludePermission(title)) {
            // Treat both 'no' and 'maybe' as closed permissions
            if (
              permission.classList.contains("permission-no") ||
              permission.classList.contains("permission-maybe")
            ) {
              closedPermissions.push(cleanPermissionTitle(title));
            } else if (permission.classList.contains("permission-yes")) {
              openPermissions.push(cleanPermissionTitle(title));
            }
          }
        }
      });
    }

    // Add lock icon to permissions header
    const permissionsHeaders = document.querySelectorAll("dt");
    const permissionsHeader = Array.from(permissionsHeaders).find((dt) =>
      dt.textContent.trim().startsWith("Permissions and credits")
    );

    if (permissionsHeader) {
      // Check if we already added a lock icon
      const existingLock = permissionsHeader.querySelector(".permissions-lock");
      if (!existingLock) {
        const lockSpan = document.createElement("span");
        lockSpan.className = "permissions-lock";
        lockSpan.style.marginLeft = "5px";
        lockSpan.style.cursor = "help";

        // Choose icon based on permissions status
        if (closedPermissions.length > 0) {
          lockSpan.textContent = "🔒";
        } else if (
          openPermissions.length > 0 &&
          customPermissions.length === 0 &&
          closedPermissions.length === 0
        ) {
          lockSpan.textContent = "🔓";
        } else {
          lockSpan.textContent = "⚖️";
        }

        // Add tooltip handlers
        const showTooltip = (e) => {
          let tooltipText = "";
          if (closedPermissions.length > 0) {
            tooltipText = `This mod has closed or restricted permissions\n<span style="font-size: 0.85em;">(${closedPermissions.join(
              ", "
            )})</span>`;
          } else if (
            openPermissions.length > 0 &&
            customPermissions.length === 0 &&
            closedPermissions.length === 0
          ) {
            tooltipText = `This mod has open permissions\n<span style="font-size: 0.85em;">(${openPermissions.join(
              ", "
            )})</span>`;
          } else {
            const allPermissions = [...openPermissions, ...customPermissions];
            tooltipText = `This mod has custom permissions\n<span style="font-size: 0.85em;">(${allPermissions.join(
              ", "
            )})</span>`;
          }
          tooltip.innerHTML = formatTooltipText(tooltipText);
          tooltip.style.display = "block";
          updateTooltipPosition(e);
        };

        const hideTooltip = () => {
          tooltip.style.display = "none";
        };

        lockSpan.addEventListener("mouseover", showTooltip);
        lockSpan.addEventListener("mousemove", updateTooltipPosition);
        lockSpan.addEventListener("mouseout", hideTooltip);

        permissionsHeader.insertBefore(
          lockSpan,
          permissionsHeader.querySelector(".acc-status")
        );
      }
    }

    // Always return a permissions status
    if (closedPermissions.length > 0) {
      return {
        type: "CLOSED_PERMISSIONS",
        reason: `This mod has closed or restricted permissions <span style="font-style: italic; font-size: 0.85em;">(${closedPermissions.join(
          ", "
        )})</span>.<br>Please consider bullying and harassing this mod author into being <a href="https://www.youtube.com/watch?v=edea7yMqOY8" target="_blank" style="color: inherit; text-decoration: underline;">Cathedral</a>, and perhaps reupload on ModHQ if you are feeling spiteful.`,
        color: STATUS_TYPES.CLOSED_PERMISSIONS.color,
        skipBanner: noFeatureElement ? true : false,
      };
    } else if (
      openPermissions.length > 0 &&
      customPermissions.length === 0 &&
      closedPermissions.length === 0
    ) {
      return {
        type: "OPEN_PERMISSIONS",
        reason: `This mod has open permissions <span style="font-style: italic; font-size: 0.85em;">(${openPermissions.join(
          ", "
        )})</span>`,
        color: STATUS_TYPES.OPEN_PERMISSIONS.color,
        skipBanner: true,
      };
    } else {
      // Default fallback - always return CUSTOM_PERMISSIONS if not clearly OPEN or CLOSED
      const allPermissions = [...openPermissions, ...customPermissions];
      return {
        type: "CUSTOM_PERMISSIONS",
        reason: `This mod has custom permissions <span style="font-style: italic; font-size: 0.85em;">(${
          allPermissions.length > 0
            ? allPermissions.join(", ")
            : "No permissions specified"
        })</span>`,
        color: STATUS_TYPES.CUSTOM_PERMISSIONS.color,
        skipBanner: true,
      };
    }
  }

  // Function to create warning tag element
  function createWarningTag(status) {
    const tagLi = document.createElement("li");
    tagLi.style.cssText = `
      display: inline-flex;
      margin: 0 4px 4px 0;
    `;

    const tagBtn = document.createElement("a");
    tagBtn.className = "btn inline-flex";

    // Use the same background colors as the warning banners
    let bgColor;
    switch (status.type) {
      case "BROKEN":
      case "LAME":
        bgColor =
          "linear-gradient(45deg, rgba(255, 0, 0, 0.8), rgba(255, 0, 0, 0.9))";
        break;
      case "CLOSED_PERMISSIONS":
        bgColor = "#ffa500";
        break;
      case "CAUTION":
        bgColor =
          "linear-gradient(45deg, rgba(255, 165, 0, 0.8), rgba(255, 165, 0, 0.9))";
        break;
      case "OPEN_PERMISSIONS":
        bgColor =
          "linear-gradient(45deg, rgba(0, 170, 0, 0.8), rgba(0, 170, 0, 0.9))";
        break;
      case "CUSTOM_PERMISSIONS":
        bgColor =
          "linear-gradient(45deg, rgba(136, 136, 136, 0.8), rgba(136, 136, 136, 0.9))";
        break;
      case "INFORMATIVE":
        bgColor =
          "linear-gradient(45deg, rgba(0, 136, 255, 0.8), rgba(0, 136, 255, 0.9))";
        break;
      default:
        bgColor =
          "linear-gradient(45deg, rgba(0, 136, 255, 0.8), rgba(0, 136, 255, 0.9))";
    }

    tagBtn.style.cssText = `
      background: ${bgColor};
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      height: 24px;
      padding: 0 8px;
      font-size: 12px;
      line-height: 24px;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      cursor: help;
    `;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon icon-tag");
    svg.setAttribute("title", "");
    svg.style.cssText = `
      width: 12px;
      height: 12px;
      margin-right: 4px;
    `;

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      "https://www.nexusmods.com/assets/images/icons/icons.svg#icon-tag"
    );
    svg.appendChild(use);

    const label = document.createElement("span");
    label.className = "flex-label";
    label.style.cssText = `
      line-height: 24px;
    `;
    label.textContent = status.type.replace(/_/g, " ");

    tagBtn.appendChild(svg);
    tagBtn.appendChild(label);
    tagLi.appendChild(tagBtn);

    // Add tooltip handlers
    const showTooltip = (e) => {
      tooltip.innerHTML = formatTooltipText(
        `<strong>${status.type.replace(/_/g, " ")}</strong><br><br> ${status.reason}`
      );
      tooltip.style.display = "block";
      updateTooltipPosition(e);
    };

    const hideTooltip = () => {
      tooltip.style.display = "none";
    };

    tagBtn.addEventListener("mouseover", showTooltip);
    tagBtn.addEventListener("mousemove", updateTooltipPosition);
    tagBtn.addEventListener("mouseout", hideTooltip);

    // Add tabindex to match regular tags
    tagBtn.setAttribute("tabindex", "0");

    return tagLi;
  }

  // Update addWarningTags function to match structure
  function addWarningTags(warnings) {
    const tagsContainer = document.querySelector(".sideitem.clearfix .tags");
    if (!tagsContainer) {
      console.warn("[Debug] Tags container not found");
      return;
    }

    // Map CAUTION to INFORMATIVE before creating tags
    warnings = warnings.map((warning) => {
      if (warning && warning.type === "CAUTION") {
        return { ...warning, type: "INFORMATIVE" };
      }
      return warning;
    });

    // Get the first span that contains the visible tags
    let firstSpan = tagsContainer.querySelector("span:first-child");
    if (!firstSpan) {
      // If no span exists, create one
      firstSpan = document.createElement("span");
      tagsContainer.insertBefore(firstSpan, tagsContainer.firstChild);
    }

    // Remove any existing warning tags
    const existingWarningTags = firstSpan.querySelectorAll(
      "li[data-warning-tag]"
    );
    existingWarningTags.forEach((tag) => tag.remove());

    // Check if any author has warnings and add the AUTHOR_SUCKS tag if needed
    if (hasAuthorWarnings()) {
      const badAuthorWarning = {
        type: "AUTHOR_SUCKS",
        reason: "This mod is from an author with warning labels",
        color: "#ff4400",
      };
      warnings.unshift(badAuthorWarning); // Add to beginning of warnings array
    }

    // Add new warning tags at the start of the tags list
    warnings.forEach((warning) => {
      if (!warning || !warning.type) return;

      const warningTag = createWarningTag(warning);
      warningTag.setAttribute("data-warning-tag", warning.type);

      // Insert at the start of the first span
      firstSpan.insertBefore(warningTag, firstSpan.firstChild);
    });
  }

  // Function to add warning icons to page title
  function addWarningIconsToTitle(warnings) {
    const pageTitle = document.querySelector("#pagetitle h1");
    if (!pageTitle) return;

    // Remove any existing warning icons and alternative buttons
    const existingIcons = pageTitle.querySelector(".title-warning-icons");
    if (existingIcons) existingIcons.remove();
    const existingAltButton = pageTitle.querySelector(
      ".title-alternative-button"
    );
    if (existingAltButton) existingAltButton.remove();

    // Create container for icons
    const iconsContainer = document.createElement("span");
    iconsContainer.className = "title-warning-icons";

    // Track if we have an alternative URL to show
    let alternativeUrl = null;

    warnings.forEach((warning) => {
      if (!warning || !warning.type) return;

      // Skip adding icon for OPEN_PERMISSIONS
      if (warning.type === "OPEN_PERMISSIONS") return;

      // Store alternative URL if present
      if (warning.alternative) {
        alternativeUrl = warning.alternative;
      }

      const iconWrapper = document.createElement("span");
      iconWrapper.className = "title-warning-icon";

      // Get icon based on warning type
      let icon = "⚠️";
      switch (warning.type) {
        case "BROKEN":
          icon = "⛔";
          break;
        case "CLOSED_PERMISSIONS":
          icon = "🔒";
          break;
        case "CUSTOM_PERMISSIONS":
          icon = "⚖️";
          break;
        case "LAME":
          icon = "👎";
          break;
        case "AUTHOR_SUCKS":
          icon = "👿";
          break;
        case "INFORMATIVE":
          icon = "ℹ️";
          break;
      }
      iconWrapper.textContent = icon;

      // Format the warning type to be more readable
      const formattedType = warning.type.replace(/_/g, " ");

      // Add tooltip handlers
      const showTooltip = (e) => {
        tooltip.innerHTML = formatTooltipText(
          `<strong>${formattedType}:</strong> ${warning.reason}`
        );
        tooltip.style.display = "block";
        updateTooltipPosition(e);
      };

      const hideTooltip = () => {
        tooltip.style.display = "none";
      };

      iconWrapper.addEventListener("mouseover", showTooltip);
      iconWrapper.addEventListener("mousemove", updateTooltipPosition);
      iconWrapper.addEventListener("mouseout", hideTooltip);

      iconsContainer.appendChild(iconWrapper);
    });

    // Insert icons before the title text
    pageTitle.insertBefore(iconsContainer, pageTitle.firstChild);

    // Add alternative button if we have an alternative URL
    if (alternativeUrl) {
      const altButton = document.createElement("a");
      altButton.href = alternativeUrl;
      altButton.className = "title-alternative-button";
      altButton.target = "_blank";
      altButton.rel = "noopener noreferrer";
      altButton.textContent = "View Alternative";
      altButton.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        margin-left: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: white;
        text-decoration: none;
        font-size: 14px;
        transition: all 0.2s;
        vertical-align: middle;
        border: 1px solid rgba(255, 255, 255, 0.2);
      `;

      // Add hover effect
      altButton.addEventListener("mouseenter", () => {
        altButton.style.background = "rgba(255, 255, 255, 0.2)";
        altButton.style.transform = "translateY(-1px)";
      });

      altButton.addEventListener("mouseleave", () => {
        altButton.style.background = "rgba(255, 255, 255, 0.1)";
        altButton.style.transform = "translateY(0)";
      });

      pageTitle.appendChild(altButton);
    }
  }

  // Function to detect if user is on mobile
  function isMobileDevice() {
    return (
      window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent)
    );
  }

  // Modify addAllWarnings function
  function addAllWarnings(warnings) {
    if (!warnings || warnings.length === 0) return;

    const nofeature = document.querySelector("#nofeature");
    const isMobile = isMobileDevice();

    // Map any CAUTION warnings to INFORMATIVE, especially for nofeature mods
    warnings = warnings.map((warning) => {
      if (warning && warning.type === "CAUTION") {
        return {
          ...warning,
          type: "INFORMATIVE",
          // If it's a nofeature mod, update the class to info
          class: nofeature ? "info" : warning.class,
        };
      }
      return warning;
    });

    // Removed adding warning icons to title as requested
    
    // Apply gradient effect based on most severe warning
    let gradientClass = "";
    if (warnings.some((w) => w.type === "BROKEN" || w.type === "LAME" || w.type === "INFORMATIVE")) {
      gradientClass = "has-severe-warning";
    } else if (
      warnings.some(
        (w) => w.type === "CLOSED_PERMISSIONS"
      ) &&
      !warnings.some((w) => w.type === "INFORMATIVE" && nofeature) // Don't override INFORMATIVE on nofeature
    ) {
      gradientClass = "has-warning";
    } else if (warnings.some((w) => w.type === "OPEN_PERMISSIONS")) {
      gradientClass = "has-info";
    }

    // Apply gradient to either nofeature or featured element
    if (nofeature || isMobile) {
      if (nofeature) {
        nofeature.className = gradientClass;
      } else {
        // If on mobile but no nofeature, apply to featured
        const featured = document.querySelector("#featured");
        if (featured) {
          featured.className = gradientClass;
        }
      }
    } else {
      // Desktop view with featured element
      // Clear any existing warning banners
      const existingBanners = document.querySelector(".mod-warning-banners");
      if (existingBanners) {
        existingBanners.remove();
      }

      // Add banners in order (CLOSED_PERMISSIONS first, then BROKEN/LAME/INFORMATIVE, then others)
      warnings
        .filter((warning) => warning && warning.type && !warning.skipBanner)
        .sort((a, b) => {
          if (a.type === "CLOSED_PERMISSIONS") return -1;
          if (b.type === "CLOSED_PERMISSIONS") return 1;
          if (a.type === "BROKEN" || a.type === "LAME" || a.type === "INFORMATIVE") return -1;
          if (b.type === "BROKEN" || b.type === "LAME" || b.type === "INFORMATIVE") return 1;
          return 0;
        })
        .forEach((warning) => {
          addWarningBanner(warning);
        });

      // Apply gradient to featured element
      const featured = document.querySelector("#featured");
      if (featured) {
        featured.className = gradientClass;
      }
    }

    // Add warning tags for all warnings, including those with skipBanner
    addWarningTags(warnings.filter((warning) => warning && warning.type));
  }

  // Modify checkModStatus to include keyword checking
  async function checkModStatus() {
    const { gameId, modId } = getGameAndModId();
    console.log("[Debug] Checking mod status for game:", gameId, "mod:", modId);

    // Get all text from breadcrumb categories
    const breadcrumbText = Array.from(
      document.querySelectorAll("#breadcrumb li a")
    )
      .map((a) => a.textContent.trim())
      .join(" ");

    // Get the mod title
    const h1Title =
      document.querySelector("#pagetitle h1")?.textContent.trim() || "";

    // Combine all text to search through
    const fullText = `${breadcrumbText} ${h1Title}`;

    // Collect all warnings that apply to this mod
    const warnings = [];

    // Check permissions first
    const permissionsWarning = await checkModPermissions();
    if (permissionsWarning) {
      warnings.push(permissionsWarning);
    }

    // Function to process mod status data
    function processModStatus(modStatusData) {
      if (!modStatusData) {
        return;
      }

      console.log("[Debug] Processing mod status data:", modStatusData);

      // Check explicit mod statuses
      const gameStatuses = modStatusData["Mod Statuses"]?.[gameId];
      let foundStatus = null;

      if (gameStatuses) {
        for (const [statusType, modList] of Object.entries(gameStatuses)) {
          if (modList.includes(modId)) {
            foundStatus = statusType;
            break;
          }
        }
      }

      if (foundStatus) {
        // Create status object
        const status = {
          type: foundStatus === "CAUTION" ? "INFORMATIVE" : foundStatus,
          reason: `This mod is marked as ${foundStatus.toLowerCase()}`,
          color: STATUS_TYPES[foundStatus === "CAUTION" ? "INFORMATIVE" : foundStatus]?.color || "#ff0000",
        };
        
        // Check if we have additional descriptor info
        const modDescriptor = modStatusData["Mod Descriptors"]?.[gameId]?.[modId];
        if (modDescriptor) {
          if (modDescriptor.reason) status.reason = modDescriptor.reason;
          if (modDescriptor.alternative) status.alternative = modDescriptor.alternative;
          if (modDescriptor.url) status.url = modDescriptor.url;
          if (modDescriptor.icon) status.icon = modDescriptor.icon;
        }

        console.log("[Debug] Created indicator status:", status);
        warnings.push(status);
      } else {
        // Check keyword rules if no explicit status was found
        const keywordStatus = checkKeywordRules(
          modStatusData,
          gameId,
          fullText
        );
        if (keywordStatus) {
          console.log("[Debug] Found keyword match:", keywordStatus);
          warnings.push(keywordStatus);
        }
      }

      // First ensure author status is checked
      checkAuthorStatus();

      // Wait a short time for author status to be applied
      setTimeout(() => {
        // Now add all warnings after author status has been checked
        addAllWarnings(warnings);
      }, 100);
    }

    // Always fetch fresh data first
    fetchAndStoreJSON(
      MOD_STATUS_URL,
      STORAGE_KEYS.MOD_STATUS,
      processModStatus
    );
  }

  // Create form HTML
  function createFormHTML() {
    const { gameId, modId } = getGameAndModId();
    const modTitle = document.querySelector("#pagetitle h1")?.textContent.trim() || "Unknown Mod";
    
    return `
      <div class="form-overlay">
        <div class="mod-report-form">
          <button class="close">&times;</button>
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
            </svg>
            Report Mod Status
          </h2>
          
          <div class="form-info">
            <p>Reporting: <strong>${stripEmojis(modTitle)}</strong></p>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Game Shortname</label>
              <div class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M21,6H3A2,2 0 0,0 1,8V16A2,2 0 0,0 3,18H21A2,2 0 0,0 23,16V8A2,2 0 0,0 21,6M21,16H3V8H21M6,15H8V13H10V11H8V9H6V11H4V13H6M14.5,12A1.5,1.5 0 0,1 16,13.5A1.5,1.5 0 0,1 14.5,15A1.5,1.5 0 0,1 13,13.5A1.5,1.5 0 0,1 14.5,12M18.5,9A1.5,1.5 0 0,1 20,10.5A1.5,1.5 0 0,1 18.5,12A1.5,1.5 0 0,1 17,10.5A1.5,1.5 0 0,1 18.5,9Z" />
                </svg>
                <input type="text" id="gameShortname" value="${gameId}" readonly class="readonly-input" disabled>
              </div>
            </div>
            <div class="form-group">
              <label>Mod ID</label>
              <div class="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                </svg>
                <input type="text" id="modId" value="${modId}" readonly class="readonly-input" disabled>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Status</label>
            <div class="status-options">
              <div class="status-option">
                <input type="radio" id="status-broken" name="modStatus" value="BROKEN" checked>
                <label for="status-broken">
                  <span class="status-icon">⛔</span>
                  <span class="status-name">Broken</span>
                  <span class="status-desc">Mod doesn't work properly</span>
                </label>
              </div>
              <div class="status-option">
                <input type="radio" id="status-lame" name="modStatus" value="LAME">
                <label for="status-lame">
                  <span class="status-icon">👎</span>
                  <span class="status-name">Sucks</span>
                  <span class="status-desc">Low quality or problematic</span>
                </label>
              </div>
              <div class="status-option">
                <input type="radio" id="status-info" name="modStatus" value="INFORMATIVE">
                <label for="status-info">
                  <span class="status-icon">ℹ️</span>
                  <span class="status-name">Informative</span>
                  <span class="status-desc">Important info about this mod</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Reason <span style="color: #C62D51;">*</span></label>
            <textarea id="modReason" placeholder="Explain why this mod should be reported..." required></textarea>
          </div>
          
          <div class="form-group">
            <label>Alternative Mod Link (optional)</label>
            <div class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z" />
              </svg>
              <input type="text" id="modAlternative" placeholder="https://www.nexusmods.com/...">
            </div>
          </div>
          
          <div class="buttons">
            <button class="secondary" id="closeForm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
              Cancel
            </button>
            <button class="primary" id="copyToClipboard">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
              </svg>
              Copy to Clipboard
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Function to show form
  function showReportForm() {
    const { gameId, modId } = getGameAndModId();

    // Create and add form if it doesn't exist
    if (!document.querySelector(".form-overlay")) {
      document.body.insertAdjacentHTML("beforeend", createFormHTML());

      // Add event listeners
      document
        .querySelector(".close")
        .addEventListener("click", hideReportForm);
      document
        .querySelector("#closeForm")
        .addEventListener("click", hideReportForm);
      document
        .querySelector("#copyToClipboard")
        .addEventListener("click", copyFormToClipboard);

      // Close form when clicking overlay, but not when clicking the form or readonly inputs
      document.querySelector(".form-overlay").addEventListener("click", (e) => {
        if (
          e.target.classList.contains("form-overlay") &&
          !e.target.closest(".readonly-input")
        ) {
          hideReportForm();
        }
      });

      // Prevent form closure when clicking readonly inputs
      document.querySelectorAll(".readonly-input").forEach((input) => {
        input.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      });
    }

    // Set initial values
    document.querySelector("#gameShortname").value = gameId;
    document.querySelector("#modId").value = modId;

    // Show form
    document.querySelector(".form-overlay").classList.add("active");
    document.querySelector(".mod-report-form").classList.add("active");
  }

  // Function to hide form
  function hideReportForm() {
    document.querySelector(".form-overlay").classList.remove("active");
    document.querySelector(".mod-report-form").classList.remove("active");
  }

  // Function to strip emojis from text
  function stripEmojis(text) {
    return text
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚖️⛔️⚡️⚠️👎🔒🔓👿]/gu,
        ""
      )
      .trim();
  }

  // Function to copy form data to clipboard
  function copyFormToClipboard() {
    const gameShortname = document.querySelector("#gameShortname").value;
    const modId = document.querySelector("#modId").value;
    const status = document.querySelector('input[name="modStatus"]:checked').value;
    const reasonElement = document.querySelector("#modReason");
    const reason = reasonElement.value.trim();
    const alternative = document.querySelector("#modAlternative").value;

    // Validate that reason is provided
    if (!reason) {
      reasonElement.style.borderColor = "#C62D51";
      reasonElement.style.boxShadow = "0 0 0 2px rgba(198, 45, 81, 0.25)";
      reasonElement.focus();
      return;
    }

    const modTitle = stripEmojis(
      document.querySelector("#pagetitle h1")?.textContent.trim() ||
        "Unknown Mod"
    );

    // Create BBCode formatted message with list
    const bbCodeMessage = `[b]Mod Report:[/b] [url=https://www.nexusmods.com/${gameShortname}/mods/${modId}]${modTitle}[/url]
[list]
[*] [size=85][b]Game:[/b] ${gameShortname}[/size]
[*] [size=85][b]Status:[/b] ${status}[/size]${
      reason ? `\n[*] [size=85][b]Reason:[/b] ${reason}[/size]` : ""
    }${
      alternative
        ? `\n[*] [size=85][b]Alternative:[/b] ${alternative}[/size]`
        : ""
    }
[/list]

[code]
Game Shortname: ${gameShortname}
Mod ID: ${modId}
Status: ${status}${reason ? `\nReason: ${reason}` : ""}${
      alternative ? `\nAlternative: ${alternative}` : ""
    }
[/code]`;

    // Create JSON data without quotes in values
    let jsonData = {
      "Mod Statuses": {
        [gameShortname]: {
          [status]: [modId],
        },
      },
    };

    if (reason || alternative) {
      jsonData["Mod Descriptors"] = {
        [gameShortname]: {
          [modId]: {
            reason: reason || undefined,
            alternative: alternative || undefined,
          },
        },
      };
    }

    const jsonString = JSON.stringify(jsonData, null, 2);

    // Copy BBCode to clipboard
    navigator.clipboard
      .writeText(bbCodeMessage)
      .then(() => {
        // Store JSON data in localStorage for later use
        localStorage.setItem("lastModReportJson", jsonString);

        // Open the forum thread in a new tab
        const forumWindow = window.open(
          "https://rpghq.org/forums/posting.php?mode=reply&t=3511",
          "_blank"
        );

        // Wait for the forum page to load and then paste the content
        if (forumWindow) {
          forumWindow.onload = function () {
            const messageBox = forumWindow.document.querySelector("#message");
            if (messageBox) {
              messageBox.value = bbCodeMessage;
              alert("Copied to clipboard and pasted to forum!");
            } else {
              alert(
                "Copied to clipboard but couldn't paste to forum - please paste manually"
              );
            }
          };
        } else {
          alert(
            "Copied to clipboard but popup was blocked - please enable popups and try again"
          );
        }
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard");
      });
  }

  // Function to check if any author has warning labels
  function hasAuthorWarnings() {
    // Get the mod author links from the file information section
    const authorLinks = document.querySelectorAll(
      '#fileinfo .sideitem a[href*="/users/"]'
    );
    let hasWarnings = false;

    // Find the "Created by" heading and its parent div
    const createdByHeading = Array.from(
      document.querySelectorAll("#fileinfo .sideitem h3")
    ).find((h3) => h3.textContent.trim() === "Created by");

    if (createdByHeading) {
      // Get the text content of the "Created by" div
      const createdByDiv = createdByHeading.parentElement;
      if (createdByDiv) {
        const authors = createdByDiv.textContent
          .replace("Created by", "")
          .trim()
          .split(" and ")
          .map((author) => author.trim());

        // Check if any of these authors have warning containers
        authors.forEach((author) => {
          const authorElements = document.querySelectorAll(
            `a[href*="/users/"]:not(.comments-link)`
          );
          authorElements.forEach((element) => {
            if (
              element.textContent.trim() === author &&
              element.nextElementSibling?.classList.contains(
                "author-status-container"
              )
            ) {
              hasWarnings = true;
            }
          });
        });
      }
    }

    // Also check the "Uploaded by" author
    authorLinks.forEach((authorLink) => {
      if (
        authorLink.nextElementSibling?.classList.contains(
          "author-status-container"
        )
      ) {
        hasWarnings = true;
      }
    });

    return hasWarnings;
  }

  // Function to create author report button
  function createAuthorReportButton() {
    const button = document.createElement("button");
    button.className = "author-report-button";
    button.type = "button";

    button.innerHTML = `
      <span>
        <span class="typography-body-lg grow text-left leading-5">Report to <span style="color: #F5575D">H</span><span style="color: #3889ED">Q</span></span>
      </span>
    `;

    button.addEventListener("click", showAuthorReportForm);
    return button;
  }

  // Function to create author report form HTML
  function createAuthorReportFormHTML() {
    // Get the labels from author-status.json
    const authorStatusData = getStoredData(STORAGE_KEYS.AUTHOR_STATUS);
    
    let labels = {};
    
    // If we have author status data, use the Labels from it
    if (authorStatusData && authorStatusData.Labels) {
      // Convert the Labels from author-status.json to the format expected by the form
      Object.entries(authorStatusData.Labels).forEach(([name, labelData]) => {
        labels[name] = {
          icon: labelData.icon,
          defaultLabel: labelData.label
        };
      });
    } else {
      // Fallback to hardcoded labels if author status data is not available
      labels = {
        "Pride Flag Modder": {
          icon: "https://f.rpghq.org/0BfQ7ahUIA7b.png",
          defaultLabel: "Pride Flag Modder",
        },
        Troon: {
          icon: "https://f.rpghq.org/b1PMDDCK0hrc.png",
          defaultLabel: "Troon",
        },
        "Flight Risk": {
          icon: "https://f.rpghq.org/nD9rLv9rzAZY.png",
          defaultLabel:
            "Flight risk! (Will throw fit and leave if criticized too much)",
        },
        "Bug Ignorer": {
          icon: "https://f.rpghq.org/H8CVupxrNCt3.png",
          defaultLabel: "Ignores bugs. Will deny they exist and not fix them",
        },
        Paywaller: {
          icon: "https://f.rpghq.org/ehg06weLrysL.png",
          defaultLabel: "Paywaller",
        },
        Copystriker: {
          icon: "https://f.rpghq.org/JxQfA8F2nAnr.png",
          defaultLabel:
            "Viciously gets patches and reuploads of mods taken down. Retardedly believes they own their mod legally.",
        },
        Incident: {
          icon: "https://f.rpghq.org/xjhpiEPNoOV6.png",
          defaultLabel: "Incident:",
        },
      };
    }

    // Create image grid for selection (without text labels)
    const imageGrid = Object.entries(labels)
      .map(
        ([name, info]) => `
        <div class="label-image-item" data-label="${name}">
          <img src="${info.icon}" alt="${name}" class="label-icon">
        </div>
      `
      )
      .join("");

    // Create hidden label rows for form submission
    const labelRows = Object.entries(labels)
      .map(
        ([name, info]) => `
        <div class="label-row" data-label="${name}" style="display: none;">
          <div class="label-header">
            <input type="checkbox" id="label-${name
              .toLowerCase()
              .replace(/ /g, "-")}" value="${name}">
            <label for="label-${name.toLowerCase().replace(/ /g, "-")}">
              <img src="${info.icon}" alt="${name}" class="label-icon">
              ${name}
            </label>
          </div>
          <div class="label-details">
            <input type="text" class="label-text" placeholder="Custom label override (optional)" value="">
            <input type="text" class="reference-link" placeholder="Reference link (optional)">
          </div>
        </div>
      `
      )
      .join("");

    return `
      <div class="form-overlay">
        <div class="mod-report-form author-report-form">
          <button class="close">&times;</button>
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
</svg>
            Report Author to HQ
          </h2>
          
          <div class="form-group">
            <label>Author Username</label>
            <input type="text" id="authorUsername" readonly class="readonly-input" disabled>
          </div>
          
          <div class="form-group">
            <div class="label-image-grid">
              ${imageGrid}
            </div>
          </div>
          
          <div class="form-group">
            <label>Selected Labels</label>
            <div class="label-selections">
              ${labelRows}
            </div>
          </div>
          
          <div class="buttons">
            <button class="primary" id="copyAuthorReport">Copy to Clipboard</button>
            <button id="closeForm">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  // Function to show author report form
  function showAuthorReportForm() {
    // Get author username from the profile page URL by splitting on slashes and taking the username part
    const urlParts = window.location.pathname.split("/");
    const usernameIndex = urlParts.indexOf("profile") + 1;
    const username =
      usernameIndex < urlParts.length ? urlParts[usernameIndex] : "";

    // Create and add form if it doesn't exist
    if (!document.querySelector(".form-overlay")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        createAuthorReportFormHTML()
      );

      // Add event listeners
      document
        .querySelector(".close")
        .addEventListener("click", hideReportForm);
      document
        .querySelector("#closeForm")
        .addEventListener("click", hideReportForm);
      document
        .querySelector("#copyAuthorReport")
        .addEventListener("click", copyAuthorReportToClipboard);

      // Setup label details toggle
      setupLabelDetailsToggle();

      // Close form when clicking overlay
      document.querySelector(".form-overlay").addEventListener("click", (e) => {
        if (e.target.classList.contains("form-overlay")) {
          hideReportForm();
        }
      });
    }

    // Set initial values
    document.querySelector("#authorUsername").value = username;

    // Show form
    document.querySelector(".form-overlay").classList.add("active");
    document.querySelector(".mod-report-form").classList.add("active");
  }

  // Function to copy author report to clipboard
  function copyAuthorReportToClipboard() {
    const username = document.querySelector("#authorUsername").value;

    // Collect all selected labels and their details
    const selectedLabels = Array.from(document.querySelectorAll(".label-row"))
      .filter((row) => row.querySelector('input[type="checkbox"]').checked)
      .map((row) => ({
        type: row.querySelector('input[type="checkbox"]').value,
        label: row.querySelector(".label-text").value.trim(),
        referenceLink: row.querySelector(".reference-link").value.trim(),
        icon: row.querySelector(".label-icon").src,
      }));

    // Create BBCode formatted message with nested lists
    const bbCodeMessage = `[b]Author Report:[/b] [url=https://next.nexusmods.com/profile/${username}]${username}[/url]
[list]
${selectedLabels
  .map(
    (l) => `[*] [b]${l.type}[/b]
[list]
[*] [size=85][b]Reason:[/b] ${l.label || "-"}[/size]
[*] [size=85][b]Reference:[/b] ${l.referenceLink || "-"}[/size]
[/list]`
  )
  .join("\n")}
[/list]

[code]
Username: ${username}
Labels: ${selectedLabels.map((l) => l.type).join(", ")}
${selectedLabels
  .map(
    (l) => `
${l.type}:
  Label: ${l.label || "-"}
  Reference: ${l.referenceLink || "-"}`
  )
  .join("\n")}
[/code]`;

    // Rest of the function remains the same...
    const jsonString = JSON.stringify(
      {
        "Author Labels": {},
        "Author Tooltips": {
          [username]: {},
        },
      },
      null,
      2
    );

    navigator.clipboard
      .writeText(bbCodeMessage)
      .then(() => {
        localStorage.setItem("lastAuthorReportJson", jsonString);

        const forumWindow = window.open(
          "https://rpghq.org/forums/posting.php?mode=reply&t=3511",
          "_blank"
        );

        if (forumWindow) {
          forumWindow.onload = function () {
            const messageBox = forumWindow.document.querySelector("#message");
            if (messageBox) {
              messageBox.value = bbCodeMessage;
              alert("Copied to clipboard and pasted to forum!");
            } else {
              alert(
                "Copied to clipboard but couldn't paste to forum - please paste manually"
              );
            }
          };
        } else {
          alert(
            "Copied to clipboard but popup was blocked - please enable popups and try again"
          );
        }
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy to clipboard");
      });
  }

  // Function to add report button to profile page
  function addReportButtonToProfile() {
    // Check if we're on a profile page
    if (!window.location.href.includes("/profile/")) return;

    // Find the button container
    const buttonContainer = document.querySelector(
      ".flex.flex-col.gap-y-3.sm\\:flex-row.sm\\:flex-wrap.sm\\:gap-4"
    );
    if (!buttonContainer) return;

    // Check if button already exists
    if (buttonContainer.querySelector(".author-report-button")) return;

    // Add the report button
    const reportButton = createAuthorReportButton();
    buttonContainer.appendChild(reportButton);
  }

  // Update the setupLabelDetailsToggle function
  function setupLabelDetailsToggle() {
    // Set up image grid selection
    document.querySelectorAll(".label-image-item").forEach((item) => {
      const labelName = item.getAttribute("data-label");
      
      item.addEventListener("click", () => {
        // Toggle selected state
        item.classList.toggle("selected");
        
        // Find corresponding label row
        const labelRow = document.querySelector(`.label-row[data-label="${labelName}"]`);
        if (labelRow) {
          const checkbox = labelRow.querySelector('input[type="checkbox"]');
          
          // Toggle checkbox and show/hide details
          checkbox.checked = item.classList.contains("selected");
          
          // Show the row if selected
          labelRow.style.display = checkbox.checked ? "flex" : "none";
        }
      });
    });
    
    // Set up label rows for editing details
    document.querySelectorAll(".label-row").forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const details = row.querySelector(".label-details");
      
      // Prevent clicks in the details section from toggling the checkbox
      details.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    });
  }

  // Add new function to handle next.nexusmods.com profile layout
  function addAuthorStatusToNextProfile() {
    // Check if we're on next.nexusmods.com profile page
    if (!window.location.href.includes("next.nexusmods.com/profile/")) return;

    // Find the container div that holds the profile info
    const profileContainer = document.querySelector(
      ".flex.flex-col.items-center.gap-y-3.sm\\:flex-row.sm\\:items-center.sm\\:gap-x-6"
    );
    if (!profileContainer) return;

    // Find the div containing the username
    const usernameContainer = profileContainer.querySelector("h1");
    if (!usernameContainer) return;

    // Ensure the username container has the right display style for inline badges
    usernameContainer.style.display = "flex";
    usernameContainer.style.alignItems = "center";
    usernameContainer.style.flexWrap = "wrap";

    // More thorough check for existing status indicators
    const existingContainers = usernameContainer.querySelectorAll(
      ".author-status-container"
    );
    if (existingContainers.length > 0) {
      // Remove any duplicate containers if they exist
      Array.from(existingContainers)
        .slice(1)
        .forEach((container) => container.remove());
      return;
    }

    const username = usernameContainer.textContent.trim();

    // Function to process author status data
    function processAuthorStatus(authorStatus) {
      if (!authorStatus) return;

      // Create container for status indicators
      const container = document.createElement("div");
      container.className =
        "author-status-container flex gap-1 items-center";
      container.style.cssText = `
        display: inline-flex;
        gap: 4px;
        align-items: center;
        vertical-align: middle;
        line-height: 1;
        height: 24px;
        margin-left: 10px;
        margin-top: 5px;
      `;

      let hasLabels = false;

      // Check each label to see if this author is included
      for (const [labelKey, labelData] of Object.entries(authorStatus.Labels)) {
        if (labelData.authors.includes(username)) {
          hasLabels = true;

          const wrapper = document.createElement("span");
          wrapper.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 24px;
            vertical-align: middle;
            margin: 0 1px;
          `;

          const indicator = document.createElement("span");
          indicator.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 24px;
            cursor: help;
            vertical-align: middle;
            line-height: 1;
          `;

          // Create either an image or fallback text icon
          if (labelData.icon && labelData.icon.startsWith("http")) {
            const img = document.createElement("img");
            img.style.cssText = `
              width: 24px;
              height: 24px;
              vertical-align: middle;
              object-fit: contain;
              display: block;
            `;
            img.src = labelData.icon;

            // Fallback to emoji if image fails to load
            img.onerror = () => {
              indicator.textContent = DEFAULT_ICONS[labelData.type] || "⚠️";
              indicator.style.color = labelData.color || "orange";
              indicator.style.fontSize = "20px";
            };

            indicator.appendChild(img);
          } else {
            indicator.textContent = DEFAULT_ICONS[labelData.type] || "⚠️";
            indicator.style.color = labelData.color || "orange";
            indicator.style.fontSize = "20px";
          }

          // Add hover effect
          indicator.style.transition = "transform 0.2s";

          // Add tooltip
          const tooltipText =
            authorStatus.Tooltips?.[username]?.[labelKey]?.label ||
            labelData.label;
          const referenceLink =
            authorStatus.Tooltips?.[username]?.[labelKey]?.referenceLink;

          // Update cursor style if there's a reference link
          if (referenceLink && referenceLink !== null) {
            indicator.style.cursor = "pointer";
          }

          const showTooltip = (e) => {
            indicator.style.transform = "scale(1.3)";
            tooltip.innerHTML = formatTooltipText(
              tooltipText === null ? labelData.label : tooltipText,
              referenceLink && referenceLink !== null ? "\nClick to learn more" : ""
            );
            tooltip.style.display = "block";
            updateTooltipPosition(e);
          };

          const hideTooltip = () => {
            indicator.style.transform = "scale(1)";
            tooltip.style.display = "none";
          };

          indicator.addEventListener("mouseover", showTooltip);
          indicator.addEventListener("mousemove", updateTooltipPosition);
          indicator.addEventListener("mouseout", hideTooltip);

          if (referenceLink && referenceLink !== null) {
            const link = document.createElement("a");
            link.href = referenceLink;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.textDecoration = "none";
            link.style.display = "inline-flex";
            link.style.alignItems = "center";
            link.style.height = "24px";
            link.style.verticalAlign = "middle";
            link.style.cursor = "pointer";
            link.appendChild(indicator);
            wrapper.appendChild(link);
          } else {
            wrapper.appendChild(indicator);
          }

          container.appendChild(wrapper);
        }
      }

      if (hasLabels) {
        // Insert the container after the username
        usernameContainer.appendChild(container);
        
        // No need to change the username container's display style
        // as we want to keep everything on the same line
      }
    }

    // Always fetch fresh data first
    fetchAndStoreJSON(
      AUTHOR_STATUS_URL,
      STORAGE_KEYS.AUTHOR_STATUS,
      processAuthorStatus
    );
  }

  // Function to add copy link buttons to comments
  function addCopyLinkButtons() {
    // Find all comment action lists
    const commentActions = document.querySelectorAll(
      ".comment-actions .actions"
    );

    commentActions.forEach((actionList) => {
      // Skip if copy link button already exists
      if (actionList.querySelector(".copy-link-btn")) return;

      // Get the comment ID from the parent comment element
      const commentElement = actionList.closest(".comment");
      if (!commentElement) return;

      const commentId = commentElement.id.replace("comment-", "");
      if (!commentId) return;

      // Create the copy link button
      const li = document.createElement("li");
      const button = document.createElement("a");
      button.className = "btn inline-flex copy-link-btn";
      button.href = "#";
      button.setAttribute("data-comment-id", commentId);

      // Create icon
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "icon icon-link");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        "https://www.nexusmods.com/assets/images/icons/icons.svg#icon-link"
      );
      svg.appendChild(use);

      // Create label
      const label = document.createElement("span");
      label.className = "flex-label";
      label.textContent = "Copy Link";

      button.appendChild(svg);
      button.appendChild(label);
      li.appendChild(button);

      // Add click handler
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("jump_to_comment", commentId);

        // Copy to clipboard
        navigator.clipboard
          .writeText(url.toString())
          .then(() => {
            button.classList.add("copy-success");
            label.textContent = "Copied!";

            // Reset after animation
            setTimeout(() => {
              button.classList.remove("copy-success");
              label.textContent = "Copy Link";
            }, 1500);
          })
          .catch((err) => {
            console.error("Failed to copy:", err);
            label.textContent = "Failed to copy";

            setTimeout(() => {
              label.textContent = "Copy Link";
            }, 1500);
          });
      });

      // Insert before the last item (usually collapse button)
      const lastItem = actionList.lastElementChild;
      if (lastItem) {
        actionList.insertBefore(li, lastItem);
      } else {
        actionList.appendChild(li);
      }
    });
  }

  // Add new function to process all mod tiles at once
  function addModStatusToTiles(modStatusData) {
    if (!modStatusData) {
      console.warn("[Debug] No mod status data available");
      return;
    }

    console.log("[Debug] Adding mod status to all tiles");
    
    // Get all mod tiles that haven't been processed yet
    // Updated selector to match the new mod tile structure
    const modTiles = document.querySelectorAll('div[data-e2eid="mod-tile"]:not(.status-processed)');
    if (modTiles.length === 0) {
      console.log("[Debug] No unprocessed mod tiles found");
      return;
    }
    
    console.log(`[Debug] Found ${modTiles.length} unprocessed mod tiles`);
    
    // For each tile, extract the mod ID and check if it has a status
    modTiles.forEach(tile => {
      // Get game and mod ID from the tile
      const modInfo = checkModTileStatus(tile);
      if (!modInfo) {
        // Mark tile as processed even if we couldn't get mod info
        tile.classList.add('status-processed');
        return;
      }
      
      const { gameId, modId } = modInfo;
      
      // Look for an explicit status for this mod
      const gameStatuses = modStatusData["Mod Statuses"]?.[gameId];
      let foundStatus = null;
      let statusType = null;
      
      if (gameStatuses) {
        for (const [type, modList] of Object.entries(gameStatuses)) {
          if (modList.includes(modId)) {
            foundStatus = type;
            statusType = type;
            break;
          }
        }
      }
      
      if (foundStatus) {
        // Create status object
        const status = {
          type: foundStatus === "CAUTION" ? "INFORMATIVE" : foundStatus,
          reason: `This mod is marked as ${foundStatus.toLowerCase()}`,
          color: STATUS_TYPES[foundStatus === "CAUTION" ? "INFORMATIVE" : foundStatus]?.color || "#ff0000",
        };
        
        // Check if we have additional descriptor info
        const modDescriptor = modStatusData["Mod Descriptors"]?.[gameId]?.[modId];
        if (modDescriptor) {
          if (modDescriptor.reason) status.reason = modDescriptor.reason;
          if (modDescriptor.alternative) status.alternative = modDescriptor.alternative;
          if (modDescriptor.url) status.url = modDescriptor.url;
          if (modDescriptor.icon) status.icon = modDescriptor.icon;
        }
        
        // Add warning banner to the tile
        addWarningBannerToTile(tile, status);
      } else {
        // If no explicit status was found, check keyword rules
        const titleElement = tile.querySelector('[data-e2eid="mod-tile-title"]');
        if (titleElement) {
          const modTitle = titleElement.textContent.trim();
          
          // Check keyword rules
          const keywordStatus = checkKeywordRules(modStatusData, gameId, modTitle);
          if (keywordStatus) {
            console.log("[Debug] Found keyword match for tile:", keywordStatus);
            // Ensure CAUTION is converted to INFORMATIVE
            if (keywordStatus.type === "CAUTION") {
              keywordStatus.type = "INFORMATIVE";
              keywordStatus.color = STATUS_TYPES["INFORMATIVE"]?.color || "#0088ff";
            }
            addWarningBannerToTile(tile, keywordStatus);
          } else {
            // Mark tile as processed even if no status was found
            tile.classList.add('status-processed');
          }
        } else {
          // Mark tile as processed even if no title element was found
          tile.classList.add('status-processed');
        }
      }
    });
    
    console.log("[Debug] Finished processing mod tiles");
  }

  // Function to add Mod manager download buttons when they don't exist
  function addModManagerDownloadButtons() {
    // Helper function to create and add a Mod manager download button
    function createModManagerButton(manualDownloadButton) {
      if (!manualDownloadButton) return;
      
      // Get the href from the manual download button
      const manualDownloadHref = manualDownloadButton.getAttribute('href');
      
      // Create the Mod manager download button based on the manual download button
      const modManagerButton = document.createElement('a');
      modManagerButton.className = manualDownloadButton.className;
      modManagerButton.href = manualDownloadHref + (manualDownloadHref.includes('?') ? '&' : '?') + 'nmm=1';
      
      // Copy data attributes
      Array.from(manualDownloadButton.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          modManagerButton.setAttribute(attr.name, attr.value);
        }
      });
      
      // Update tracking data if present
      if (modManagerButton.hasAttribute('data-tracking')) {
        try {
          const trackingData = JSON.parse(modManagerButton.getAttribute('data-tracking'));
          if (Array.isArray(trackingData) && trackingData.length > 2) {
            trackingData[2] = "Mod manager download";
            modManagerButton.setAttribute('data-tracking', JSON.stringify(trackingData));
          }
        } catch (e) {
          console.error("[Debug] Error updating tracking data:", e);
        }
      }
      
      // Create the inner content for the button
      modManagerButton.innerHTML = `
        <svg class="icon icon-nmm">
            <use xlink:href="/assets/images/icons/icons.svg#icon-nmm"></use>
        </svg>
        <span class="flex-label">Mod manager download</span>
      `;
      
      // Create a new list item
      const listItem = document.createElement('li');
      listItem.appendChild(modManagerButton);
      
      // Insert the new button before the manual download button list item
      manualDownloadButton.closest('li').before(listItem);
      
      console.log("[Debug] Added Mod manager download button");
    }
    
    // Look for accordion-downloads sections which contain download buttons
    const downloadSections = document.querySelectorAll('.accordion-downloads');
    if (!downloadSections.length) return;
    
    console.log("[Debug] Found download sections:", downloadSections.length);
    
    downloadSections.forEach(section => {
      // Check if this section already has a Mod manager download button
      const hasModManagerButton = Array.from(section.querySelectorAll('.btn')).some(btn => 
        btn.textContent.trim().includes('Mod manager download'));
      
      // If it doesn't have a mod manager button, we need to add one
      if (!hasModManagerButton) {
        // Find the manual download button
        const manualDownloadButton = Array.from(section.querySelectorAll('.btn')).find(btn => 
          btn.textContent.trim().includes('Manual download'));
        
        createModManagerButton(manualDownloadButton);
      }
    });
    
    // Also set up click handlers for accordion headers to process newly revealed download sections
    const accordionHeaders = document.querySelectorAll('.file-expander-header:not(.mod-manager-processed)');
    accordionHeaders.forEach(header => {
      header.classList.add('mod-manager-processed');
      
      header.addEventListener('click', () => {
        // Short timeout to allow the accordion to expand
        setTimeout(() => {
          // Find the associated download section and process it
          const downloadSection = header.nextElementSibling?.querySelector('.accordion-downloads');
          if (downloadSection) {
            // Check if this section already has a Mod manager download button
            const hasModManagerButton = Array.from(downloadSection.querySelectorAll('.btn')).some(btn => 
              btn.textContent.trim().includes('Mod manager download'));
            
            // If it doesn't have a mod manager button, we need to process this section
            if (!hasModManagerButton) {
              const manualDownloadButton = Array.from(downloadSection.querySelectorAll('.btn')).find(btn => 
                btn.textContent.trim().includes('Manual download'));
              
              createModManagerButton(manualDownloadButton);
            }
          }
        }, 100);
      });
    });
  }

  // Function to get appropriate icon for file based on extension
  function getFileIcon(fileName) {
    // Default icons
    const DEFAULT_FILE_ICON = "📄";
    const DEFAULT_DIR_ICON = "📁";
    
    // Check if it's a directory
    if (!fileName.includes(".")) {
      return DEFAULT_DIR_ICON;
    }
    
    // Extract extension
    const extension = fileName.split(".").pop().toLowerCase();
    
    // Map extensions to icons
    const extensionIcons = {
      // Documents
      "txt": "📝",
      "md": "📝",
      "pdf": "📕",
      "doc": "📘",
      "docx": "📘",
      "rtf": "📝",
      
      // Web
      "html": "🌐",
      "htm": "🌐",
      "css": "🎨",
      "js": "📜",
      "json": "🔧",
      "xml": "📋",
      
      // Images
      "jpg": "🖼️",
      "jpeg": "🖼️",
      "png": "🖼️",
      "gif": "🖼️",
      "bmp": "🖼️",
      "svg": "🖼️",
      "webp": "🖼️",
      "dds": "🖼️",
      
      // Audio/Video
      "mp3": "🎵",
      "wav": "🎵",
      "ogg": "🎵",
      "mp4": "🎬",
      "avi": "🎬",
      "mov": "🎬",
      "mkv": "🎬",
      
      // Archives
      "zip": "📦",
      "rar": "📦",
      "7z": "📦",
      "tar": "📦",
      "gz": "📦",
      "pak": "📦",
      "bsa": "📦",
      
      // Code
      "py": "🐍",
      "java": "☕",
      "c": "🔧",
      "cpp": "🔧",
      "h": "🔧",
      "cs": "🔧",
      "php": "🔧",
      "rb": "💎",
      
      // Game/Mod files
      "esp": "🎮",
      "esm": "🎮",
      "ini": "⚙️",
      "modgroups": "🎮",
    };
    
    return extensionIcons[extension] || DEFAULT_FILE_ICON;
  }
  
  // Function to replace emojis in file lists
  function replaceFileIcons() {
    // Find all file-list divs
    const fileLists = document.querySelectorAll('.file-list');
    if (!fileLists.length) return;
    
    console.log("[Debug] Found file lists:", fileLists.length);
    
    fileLists.forEach(fileList => {
      // Process all file items in this list
      const fileItems = fileList.querySelectorAll('.file');
      
      fileItems.forEach(fileItem => {
        // Get the text content (filename)
        const originalText = fileItem.textContent.trim();
        if (!originalText) return;
        
        // Extract file name from the text (remove emoji and size info)
        let fileName = originalText;
        
        // Remove emoji at the beginning
        fileName = fileName.replace(/^[^\w]*/, '').trim();
        
        // Remove size info at the end if present (e.g., (123 KB))
        fileName = fileName.replace(/\s*\([\d.]+\s*[KMG]?B\)\s*$/, '').trim();
        
        // Get appropriate icon for this file
        let icon;
        if (fileItem.classList.contains('dir-expand')) {
          icon = "📁"; // Directory that can be expanded
        } else {
          icon = getFileIcon(fileName);
        }
        
        // Replace the beginning emoji
        fileItem.textContent = fileItem.textContent.replace(/^[^\w]*/, icon + ' ');
      });
    });
  }
})();
