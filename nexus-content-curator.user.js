// ==UserScript==
// @name         Nexus Mods - Content Curator
// @namespace    http://tampermonkey.net/
// @version      1.3
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
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function (response) {
        try {
          const data = JSON.parse(response.responseText);
          storeData(storageKey, data);
          callback(data);
        } catch (error) {
          console.error(
            `[Debug] Error fetching/parsing JSON from ${url}:`,
            error
          );
          // Fall back to cached data
          const cachedData = getStoredData(storageKey);
          if (cachedData) {
            console.log(`[Debug] Using cached data for ${storageKey}`);
            callback(cachedData);
          }
        }
      },
      onerror: function (error) {
        console.error(`[Debug] Error fetching ${url}:`, error);
        // Fall back to cached data
        const cachedData = getStoredData(storageKey);
        if (cachedData) {
          console.log(`[Debug] Using cached data for ${storageKey}`);
          callback(cachedData);
        }
      },
    });
  }

  // Enhanced warning styles
  const styles = `
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

    .mod-tile.has-broken-warning .mod-image {
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
      gap: 4px !important;
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
  `;

  // Add form styles
  const formStyles = `
    .mod-report-form {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      width: 500px;
      max-width: 90vw;
      color: white;
      font-size: 13px;
    }

    .mod-report-form.active {
      display: block;
    }

    .mod-report-form h2 {
      margin: 0 0 20px;
      color: white;
      font-size: 16px;
    }

    .mod-report-form .form-group {
      margin-bottom: 15px;
    }

    .mod-report-form label {
      display: block;
      margin-bottom: 5px;
      color: #ddd;
      font-size: 12px;
    }

    .mod-report-form input[type="text"],
    .mod-report-form select,
    .mod-report-form textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #333;
      color: white;
      font-family: monospace;
      font-size: 12px;
    }

    .mod-report-form .buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .mod-report-form button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #4a4a4a;
      color: white;
      transition: background 0.2s;
    }

    .mod-report-form button:hover {
      background: #5a5a5a;
    }

    .mod-report-form button.primary {
      background: #007bff;
    }

    .mod-report-form button.primary:hover {
      background: #0056b3;
    }

    .mod-report-form .close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
    }

    .mod-report-form .close:hover {
      color: white;
    }

    .form-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    }

    .form-overlay.active {
      display: block;
    }

    .mod-report-form .readonly-input {
      background: #222;
      cursor: default;
      user-select: all;
    }

    .mod-report-form .readonly-input:focus {
      outline: 1px solid #444;
    }

    .mod-report-form textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #333;
      color: white;
      font-family: monospace;
      font-size: 12px;
      min-height: 80px;
      resize: vertical;
      white-space: pre;
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
      background: #C62D51;
      color: white;
      border: none;
    }

    .author-report-button:hover {
      background: #A02442;
    }

    .author-report-button span {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .author-report-form {
      width: 600px;
      max-width: 90vw;
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
      max-height: 300px;
      overflow-y: auto;
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
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
  `;

  // Add styles to document
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles + formStyles + authorReportStyles;

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
    background: #2a2a2a;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 3px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    pointer-events: none;
    border: 1px solid #444;
    line-height: 1.4;
    white-space: pre-line;
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
    setupDOMObserver();
  }

  // Run init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Helper function to format tooltip text
  function formatTooltipText(text, additionalInfo = "") {
    const formattedText = text
      .replace(/\\n/g, "\n")
      .replace(/\((.*?)\)/g, '<span style="font-size: 0.65em;">($1)</span>');
    return `<div style="font-size: 14px; margin-bottom: 6px;">${formattedText}</div>${
      additionalInfo
        ? `<div style="font-size: 12px; color: #aaa; margin-top: 4px;">${additionalInfo}</div>`
        : ""
    }`;
  }

  // Handle tooltip positioning
  function updateTooltipPosition(e) {
    const offset = 15; // Distance from cursor
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // Check if tooltip would go off screen and adjust if needed
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + tooltipRect.width > viewportWidth) {
      x = e.clientX - tooltipRect.width - offset;
    }

    if (y + tooltipRect.height > viewportHeight) {
      y = e.clientY - tooltipRect.height - offset;
    }

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
    CAUTION: "⚠️",
  };

  // Add status indicator to author name
  function addAuthorStatusIndicator(authorElement, authorInfo) {
    const container = document.createElement("span");
    container.style.cssText = `
      margin-left: 5px;
      display: inline-flex;
      gap: 2px;
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
        height: 16px;
        cursor: ${label.url ? "pointer" : "help"};
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
              label.tooltip = tooltip.label;
              label.url = tooltip.referenceLink;
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
      color: "#ffa500",
      class: "warning",
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
    CAUTION: {
      icons: ["⚠️"],
      color: "#ffa500",
      class: "warning",
    },
  };

  // Create warning banner
  function createWarningBanner(status) {
    console.log("[Debug] Creating warning banner with status:", status);
    const banner = document.createElement("div");
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
    // Format parenthetical text in warning banner
    const formattedReason = status.reason.replace(
      /\((.*?)\)/g,
      '<span style="font-size: 0.85em;">($1)</span>'
    );
    // Replace underscores with spaces in status type
    const formattedType = status.type.replace(/_/g, " ");
    textContainer.innerHTML = `<strong>${formattedType}:</strong> ${formattedReason}`;

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

    if (status.url) {
      const moreInfoLink = document.createElement("a");
      moreInfoLink.href = status.url;
      moreInfoLink.className = "warning-button";
      moreInfoLink.textContent = "More Info";
      moreInfoLink.target = "_blank";
      actionsContainer.appendChild(moreInfoLink);
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

    // If this is a BROKEN status, make all banners severe and update Featured class
    if (status.type === "BROKEN") {
      featured.className = "has-severe-warning";
      bannerContainer.insertBefore(textContainer, bannerContainer.firstChild);
    }
    // Insert CLOSED_PERMISSIONS after BROKEN but before others
    else if (status.type === "CLOSED_PERMISSIONS") {
      if (!featured.className.includes("has-severe-warning")) {
        featured.className = "has-warning";
      }
      const brokenBanner = bannerContainer.querySelector(
        ".warning-text-container"
      );
      if (brokenBanner) {
        bannerContainer.insertBefore(textContainer, brokenBanner.nextSibling);
      } else {
        bannerContainer.insertBefore(textContainer, bannerContainer.firstChild);
      }
    } else {
      if (!featured.className.includes("has-severe-warning")) {
        featured.className =
          status.type === "CAUTION" ? "has-caution" : "has-warning";
      }
      bannerContainer.appendChild(textContainer);
    }

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

    // Create a simplified banner for tiles
    const banner = document.createElement("div");
    banner.className = `mod-warning-banner ${status.type.toLowerCase()}`;

    const iconContainer = document.createElement("div");
    iconContainer.className = "warning-icon-container";
    const icon = document.createElement("span");
    icon.className = "warning-icon";
    icon.textContent = STATUS_TYPES[status.type]?.icons[0] || "⛔";
    iconContainer.appendChild(icon);

    const textContainer = document.createElement("div");
    textContainer.className = "warning-text";
    textContainer.textContent = status.type;

    banner.appendChild(iconContainer);
    banner.appendChild(textContainer);

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

    // Add banner to tile's image
    modTile.querySelector(".mod-image")?.appendChild(banner);

    // Add warning class to tile for highlighting
    if (status.type === "BROKEN") {
      modTile.classList.add("has-broken-warning");
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
    const gameRules = modStatusData["Keyword Rules"]?.[gameName];
    if (!gameRules) return null;

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

    for (const [statusType, rules] of Object.entries(gameRules)) {
      for (const rule of rules) {
        if (fullText.includes(rule.pattern.toLowerCase())) {
          return {
            type: statusType,
            reason: rule.reason,
            color: STATUS_TYPES[statusType]?.color || "#ff0000",
          };
        }
      }
    }
    return null;
  }

  // Modify checkModTileStatus to do nothing for now
  function checkModTileStatus(modTile) {
    // Temporarily disabled
    return;
    /* 
    const titleLink = modTile.querySelector(".tile-name a");
    if (!titleLink) {
      console.warn("[Debug] Could not find title link in tile");
      return;
    }

    const match = titleLink.href.match(/nexusmods\.com\/([^\/]+)\/mods\/(\d+)/);
    if (!match) {
      console.warn("[Debug] Could not parse game/mod ID from URL");
      return;
    }

    // Rest of the function...
    */
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
            tooltipText = `This mod has closed or restricted permissions <span style="font-size: 0.85em;">(${closedPermissions.join(
              ", "
            )})</span>`;
          } else if (
            openPermissions.length > 0 &&
            customPermissions.length === 0 &&
            closedPermissions.length === 0
          ) {
            tooltipText = `This mod has open permissions <span style="font-size: 0.85em;">(${openPermissions.join(
              ", "
            )})</span>`;
          } else {
            const allPermissions = [...openPermissions, ...customPermissions];
            tooltipText = `This mod has custom permissions <span style="font-size: 0.85em;">(${allPermissions.join(
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
        bgColor =
          "linear-gradient(45deg, rgba(255, 0, 0, 0.8), rgba(255, 0, 0, 0.9))";
        break;
      case "CLOSED_PERMISSIONS":
      case "LAME":
        bgColor =
          "linear-gradient(45deg, rgba(255, 165, 0, 0.8), rgba(255, 165, 0, 0.9))";
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
        `<strong>${status.type.replace(/_/g, " ")}:</strong> ${status.reason}`
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

  // Modify addAllWarnings function
  function addAllWarnings(warnings) {
    if (!warnings || warnings.length === 0) return;

    const nofeature = document.querySelector("#nofeature");

    // Add warning icons to title only if nofeature is present
    if (nofeature) {
      addWarningIconsToTitle(warnings);
    }

    // Apply gradient effect based on most severe warning
    let gradientClass = "";
    if (warnings.some((w) => w.type === "BROKEN")) {
      gradientClass = "has-severe-warning";
    } else if (
      warnings.some((w) => w.type === "CLOSED_PERMISSIONS" || w.type === "LAME")
    ) {
      gradientClass = "has-warning";
    } else if (warnings.some((w) => w.type === "CAUTION")) {
      gradientClass = "has-caution";
    } else if (warnings.some((w) => w.type === "OPEN_PERMISSIONS")) {
      gradientClass = "has-info";
    }

    // Apply gradient to either nofeature or featured element
    if (nofeature) {
      nofeature.className = gradientClass;
    } else {
      // Clear any existing warning banners
      const existingBanners = document.querySelector(".mod-warning-banners");
      if (existingBanners) {
        existingBanners.remove();
      }

      // Add banners in order (BROKEN first, then CLOSED_PERMISSIONS, then others)
      warnings
        .filter((warning) => warning && warning.type && !warning.skipBanner)
        .sort((a, b) => {
          if (a.type === "BROKEN") return -1;
          if (b.type === "BROKEN") return 1;
          if (a.type === "CLOSED_PERMISSIONS") return -1;
          if (b.type === "CLOSED_PERMISSIONS") return 1;
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
        addAllWarnings(warnings);
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
        // Create base status object
        const indicatorStatus = {
          type: foundStatus,
          reason: `This mod is marked as ${foundStatus.toLowerCase()}`,
          color: STATUS_TYPES[foundStatus]?.color || "#ff0000",
        };

        // Check if we have additional descriptor info
        const modDescriptor =
          modStatusData["Mod Descriptors"]?.[gameId]?.[modId];
        if (modDescriptor) {
          if (modDescriptor.reason)
            indicatorStatus.reason = modDescriptor.reason;
          if (modDescriptor.alternative)
            indicatorStatus.alternative = modDescriptor.alternative;
          if (modDescriptor.url) indicatorStatus.url = modDescriptor.url;
          if (modDescriptor.icon) indicatorStatus.icon = modDescriptor.icon;
        }

        console.log("[Debug] Created indicator status:", indicatorStatus);
        warnings.push(indicatorStatus);
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

      // Add all collected warnings after we've gathered everything
      addAllWarnings(warnings);
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
    return `
      <div class="form-overlay">
        <div class="mod-report-form">
          <button class="close">&times;</button>
          <h2>Report Mod Status</h2>
          <div class="form-group">
            <label>Game Shortname</label>
            <input type="text" id="gameShortname" readonly class="readonly-input" disabled>
          </div>
          <div class="form-group">
            <label>Mod ID</label>
            <input type="text" id="modId" readonly class="readonly-input" disabled>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="modStatus">
              <option value="BROKEN">Broken</option>
              <option value="LAME">Sucks</option>
              <option value="CAUTION">Caution</option>
            </select>
          </div>
          <div class="form-group">
            <label>Reason (optional)</label>
            <textarea id="modReason" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Alternative Mod Link (optional)</label>
            <input type="text" id="modAlternative">
          </div>
          <div class="buttons">
            <button class="primary" id="copyToClipboard">Copy to Clipboard</button>
            <button id="closeForm">Close</button>
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
    const status = document.querySelector("#modStatus").value;
    const reason = document.querySelector("#modReason").value;
    const alternative = document.querySelector("#modAlternative").value;

    const modTitle = stripEmojis(
      document.querySelector("#pagetitle h1")?.textContent.trim() ||
        "Unknown Mod"
    );

    // Create BBCode formatted message without quotes
    const bbCodeMessage = `[b]Mod Report:[/b] [url=https://www.nexusmods.com/${gameShortname}/mods/${modId}]${modTitle}[/url]

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
          "https://rpghq.org/forums/posting.php?mode=reply&t=3504",
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
        <svg viewBox="0 0 24 24" style="width:1.25rem;height:1.25rem" role="presentation" class="shrink-0 -ml-0.5">
          <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" style="fill:currentColor"/>
        </svg>
        <span class="typography-body-lg grow text-left leading-5">Report to HQ</span>
      </span>
    `;

    button.addEventListener("click", showAuthorReportForm);
    return button;
  }

  // Function to create author report form HTML
  function createAuthorReportFormHTML() {
    // Get the labels from author-status.json
    const labels = {
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
        icon: "https://f.rpghq.org/RPCaQVvTOu2c.png?n=pasted-file.png",
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

    const labelRows = Object.entries(labels)
      .map(
        ([name, info]) => `
        <div class="label-row" data-label="${name}">
          <div class="label-header">
            <input type="checkbox" id="label-${name
              .toLowerCase()
              .replace(/ /g, "-")}" value="${name}">
            <label for="label-${name.toLowerCase().replace(/ /g, "-")}">
              <img src="${info.icon}" alt="${name}" class="label-icon">
              ${name}
            </label>
          </div>
          <div class="label-details" style="display: none;">
            <input type="text" class="label-text" placeholder="Custom label text (optional)">
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
          <h2>Report Author to HQ</h2>
          
          <div class="form-group">
            <label>Author Username</label>
            <input type="text" id="authorUsername" readonly class="readonly-input" disabled>
          </div>
          
          <div class="form-group">
            <label>Labels</label>
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
    // Get author username from the profile page
    const username = window.location.pathname.split("/").pop();

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

    // Create BBCode formatted message
    const bbCodeMessage = `[b]Author Report:[/b] [url=https://www.nexusmods.com/users/${username}]${username}[/url]

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
          "https://rpghq.org/forums/posting.php?mode=reply&t=3504",
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
    document.querySelectorAll(".label-row").forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const details = row.querySelector(".label-details");
      const labelHeader = row.querySelector(".label-header");

      // Function to handle state change
      const toggleState = (checked) => {
        checkbox.checked = checked;
        details.style.display = checked ? "flex" : "none";
      };

      // Handle label header click (the main row area)
      labelHeader.addEventListener("click", (e) => {
        // Don't toggle if clicking directly on the checkbox (let its native behavior work)
        if (e.target === checkbox) {
          return;
        }

        toggleState(!checkbox.checked);
        e.preventDefault();
        e.stopPropagation();
      });

      // Handle checkbox change
      checkbox.addEventListener("change", (e) => {
        toggleState(e.target.checked);
      });

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
        "author-status-container flex gap-1 items-center mt-1";
      container.style.cssText = `
        display: inline-flex;
        gap: 2px;
        align-items: center;
        vertical-align: middle;
        line-height: 1;
        height: 16px;
        margin-left: 5px;
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
            height: 16px;
            vertical-align: middle;
          `;

          const indicator = document.createElement("span");
          indicator.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 16px;
            cursor: help;
            vertical-align: middle;
            line-height: 1;
          `;

          // Create either an image or fallback text icon
          if (labelData.icon && labelData.icon.startsWith("http")) {
            const img = document.createElement("img");
            img.style.cssText = `
              width: 16px;
              height: 16px;
              vertical-align: middle;
              object-fit: contain;
              display: block;
            `;
            img.src = labelData.icon;

            // Fallback to emoji if image fails to load
            img.onerror = () => {
              indicator.textContent = DEFAULT_ICONS[labelData.type] || "⚠️";
              indicator.style.color = labelData.color || "orange";
              indicator.style.fontSize = "14px";
            };

            indicator.appendChild(img);
          } else {
            indicator.textContent = DEFAULT_ICONS[labelData.type] || "⚠️";
            indicator.style.color = labelData.color || "orange";
            indicator.style.fontSize = "14px";
          }

          // Add hover effect
          indicator.style.transition = "transform 0.2s";

          // Add tooltip
          const tooltipText =
            authorStatus.Tooltips?.[username]?.[labelKey]?.label ||
            labelData.label;
          const referenceLink =
            authorStatus.Tooltips?.[username]?.[labelKey]?.referenceLink;

          const showTooltip = (e) => {
            indicator.style.transform = "scale(1.2)";
            tooltip.innerHTML = formatTooltipText(
              tooltipText,
              referenceLink ? "Click to learn more" : ""
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

          if (referenceLink) {
            const link = document.createElement("a");
            link.href = referenceLink;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.textDecoration = "none";
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
      }
    }

    // Always fetch fresh data first
    fetchAndStoreJSON(
      AUTHOR_STATUS_URL,
      STORAGE_KEYS.AUTHOR_STATUS,
      processAuthorStatus
    );
  }
})();
