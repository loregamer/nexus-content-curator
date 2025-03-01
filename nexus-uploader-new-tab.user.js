// ==UserScript==
// @name         Nexus Mods - Open Uploader Links in New Tab
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Opens uploader links in new tabs and tracks visited links
// @author       You
// @match        https://www.nexusmods.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://www.nexusmods.com/favicon.ico
// @run-at       document-idle
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-uploader-new-tab.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-uploader-new-tab.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Uploader New Tab Script Started ===');

    // Storage key for visited uploader links
    const STORAGE_KEY = 'nexus_visited_uploaders';

    // Get visited uploaders from storage or initialize empty set
    function getVisitedUploaders() {
        const storedData = GM_getValue(STORAGE_KEY);
        const result = storedData ? new Set(JSON.parse(storedData)) : new Set();
        console.log('Retrieved visited uploaders from storage:', result.size);
        return result;
    }

    // Save visited uploaders to storage
    function saveVisitedUploaders(visitedUploaders) {
        console.log('Saving visited uploaders to storage:', visitedUploaders.size);
        GM_setValue(STORAGE_KEY, JSON.stringify([...visitedUploaders]));
    }

    // Add a visual indicator to links that have been visited
    function markVisitedLinks(visitedUploaders) {
        console.log('Marking visited links...');
        // Updated selector to match the exact structure from the example
        const uploaderLinks = document.querySelectorAll('div.author a[href^="https://www.nexusmods.com/users/"]');
        console.log('Found links to mark:', uploaderLinks.length);
        
        let markedCount = 0;
        uploaderLinks.forEach(link => {
            const uploaderId = link.href.split('/users/')[1].split('?')[0];
            
            if (visitedUploaders.has(uploaderId)) {
                // Add visual indicator for visited links
                link.style.textDecoration = 'underline';
                link.style.textDecorationStyle = 'dotted';
                link.style.textDecorationColor = '#5a9e6f';
                link.setAttribute('data-visited', 'true');
                markedCount++;
            }
        });
        console.log(`Marked ${markedCount} links as visited`);
    }
    
    // Open all unvisited uploader links in new tabs
    function openAllNewUploaderLinks() {
        console.log('Opening all new uploader links...');
        const visitedUploaders = getVisitedUploaders();
        
        // Find all uploader links
        const uploaderLinks = document.querySelectorAll('div.author a[href^="https://www.nexusmods.com/users/"]');
        console.log('Found uploader links:', uploaderLinks.length);
        
        // Create a map to store unique uploader IDs and their corresponding links
        const uniqueUploaders = new Map();
        
        // Collect unique uploader links
        uploaderLinks.forEach(link => {
            const uploaderId = link.href.split('/users/')[1].split('?')[0];
            if (!uniqueUploaders.has(uploaderId)) {
                uniqueUploaders.set(uploaderId, link);
            }
        });
        
        console.log('Found unique uploaders:', uniqueUploaders.size);
        
        // Open tabs for unvisited uploaders
        let openedCount = 0;
        uniqueUploaders.forEach((link, uploaderId) => {
            if (!visitedUploaders.has(uploaderId)) {
                console.log('Opening tab for uploader:', uploaderId);
                window.open(link.href, '_blank');
                
                // Mark as visited
                visitedUploaders.add(uploaderId);
                
                // Add visual indicator
                link.style.textDecoration = 'underline';
                link.style.textDecorationStyle = 'dotted';
                link.style.textDecorationColor = '#5a9e6f';
                link.setAttribute('data-visited', 'true');
                
                openedCount++;
            }
        });
        
        // Save the updated visited uploaders
        if (openedCount > 0) {
            saveVisitedUploaders(visitedUploaders);
        }
        
        // Show notification
        showNotification(
            openedCount > 0 
                ? `Opened ${openedCount} new profile tab${openedCount > 1 ? 's' : ''}` 
                : 'No unvisited profile links found'
        );
        
        console.log(`Opened ${openedCount} new profile tabs`);
        return openedCount;
    }
    
    // Show a notification message
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.right = '10px';
        notification.style.backgroundColor = message.includes('No new') ? '#7a2828' : '#5a9e6f';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '10000';
        notification.style.fontWeight = 'bold';
        notification.style.transition = 'opacity 0.5s ease-in-out';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        document.body.appendChild(notification);
        
        // Remove the notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // Set up keyboard shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            // Check if we're in a text input
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
                return;
            }
            
            // Check for backslash key
            if (e.key === "\\") {
                e.preventDefault();
                openAllNewUploaderLinks();
            }
        });
        
        console.log('Keyboard shortcuts set up');
    }

    // Initialize the script
    function init() {
        console.log('Initializing Nexus Uploader New Tab script');
        
        // Log the current page URL
        console.log('Current page URL:', window.location.href);
        
        // Log some information about the DOM
        console.log('Document ready state:', document.readyState);
        console.log('Author divs found:', document.querySelectorAll('div.author').length);
        
        // Set up keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Mark visited links
        markVisitedLinks(getVisitedUploaders());
        
        // Add a small control panel to manage visited links
        addControlPanel();
        
        // Set up observer for dynamically loaded content
        setupObserver();
    }

    // Set up a MutationObserver to handle dynamically loaded content
    function setupObserver() {
        console.log('Setting up MutationObserver...');
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector('div.author a') || 
                                (node.classList && node.classList.contains('author'))) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldProcess) {
                console.log('Processing uploader links due to DOM changes');
                markVisitedLinks(getVisitedUploaders());
            }
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('MutationObserver started');
    }

    // Add a control panel to view and clear visited links
    function addControlPanel() {
        console.log('Adding control panel');
        const panel = document.createElement('div');
        panel.id = 'uploader-links-control';
        panel.style.position = 'fixed';
        panel.style.bottom = '10px';
        panel.style.right = '10px';
        panel.style.backgroundColor = '#2e2e2e';
        panel.style.color = 'white';
        panel.style.padding = '5px 10px';
        panel.style.borderRadius = '5px';
        panel.style.zIndex = '9999';
        panel.style.fontSize = '12px';
        panel.style.cursor = 'pointer';
        panel.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        panel.textContent = 'Uploader Links';
        
        // Create dropdown content
        const dropdown = document.createElement('div');
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.bottom = '100%';
        dropdown.style.right = '0';
        dropdown.style.backgroundColor = '#2e2e2e';
        dropdown.style.padding = '10px';
        dropdown.style.borderRadius = '5px';
        dropdown.style.marginBottom = '5px';
        dropdown.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        dropdown.style.width = '200px';
        
        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.marginBottom = '10px';
        instructions.style.fontSize = '11px';
        instructions.style.lineHeight = '1.3';
        instructions.innerHTML = 'Press <b>\\</b> to open all new uploader links in tabs';
        dropdown.appendChild(instructions);
        
        // Add open all button
        const openAllButton = document.createElement('button');
        openAllButton.textContent = 'Open All New Links';
        openAllButton.style.width = '100%';
        openAllButton.style.padding = '5px';
        openAllButton.style.marginBottom = '10px';
        openAllButton.style.backgroundColor = '#5a9e6f';
        openAllButton.style.color = 'white';
        openAllButton.style.border = 'none';
        openAllButton.style.borderRadius = '3px';
        openAllButton.style.cursor = 'pointer';
        
        openAllButton.addEventListener('click', function() {
            const count = openAllNewUploaderLinks();
            if (count === 0) {
                this.textContent = 'No New Links Found';
                setTimeout(() => {
                    this.textContent = 'Open All New Links';
                }, 2000);
            }
        });
        
        dropdown.appendChild(openAllButton);
        
        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Visited Links';
        clearButton.style.width = '100%';
        clearButton.style.padding = '5px';
        clearButton.style.backgroundColor = '#7a2828';
        clearButton.style.color = 'white';
        clearButton.style.border = 'none';
        clearButton.style.borderRadius = '3px';
        clearButton.style.cursor = 'pointer';
        
        clearButton.addEventListener('click', function() {
            console.log('Clear button clicked');
            if (confirm('Are you sure you want to clear all visited uploader links?')) {
                console.log('Clearing visited links');
                GM_setValue(STORAGE_KEY, JSON.stringify([]));
                visitedCountSpan.textContent = '0';
                
                // Remove visual indicators
                const visitedLinks = document.querySelectorAll('div.author a[data-visited="true"]');
                console.log('Removing visual indicators from', visitedLinks.length, 'links');
                visitedLinks.forEach(link => {
                    link.style.textDecoration = '';
                    link.style.textDecorationStyle = '';
                    link.style.textDecorationColor = '';
                    link.removeAttribute('data-visited');
                });
                console.log('Visited links cleared');
                
                // Update button text
                openAllButton.textContent = 'Open All New Links';
            }
        });
        
        // Add visited count
        const visitedCount = document.createElement('div');
        visitedCount.style.marginBottom = '10px';
        visitedCount.style.marginTop = '10px';
        visitedCount.textContent = 'Visited uploaders: ';
        
        const visitedCountSpan = document.createElement('span');
        const count = getVisitedUploaders().size;
        visitedCountSpan.textContent = count;
        console.log('Control panel shows', count, 'visited uploaders');
        visitedCount.appendChild(visitedCountSpan);
        
        dropdown.appendChild(visitedCount);
        dropdown.appendChild(clearButton);
        panel.appendChild(dropdown);
        
        // Toggle dropdown on click
        panel.addEventListener('click', function() {
            if (dropdown.style.display === 'none') {
                dropdown.style.display = 'block';
                // Update count when opening
                const currentCount = getVisitedUploaders().size;
                visitedCountSpan.textContent = currentCount;
                console.log('Dropdown opened, updated count to', currentCount);
            } else {
                dropdown.style.display = 'none';
                console.log('Dropdown closed');
            }
        });
        
        document.body.appendChild(panel);
        console.log('Control panel added to page');
    }

    // Run the script
    if (document.readyState === 'loading') {
        console.log('Document still loading, adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        console.log('Document already loaded, initializing immediately');
        init();
    }
})(); 