// ==UserScript==
// @name         Nexus Mods - Open Uploader Links in New Tab
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Opens uploader links in new tabs and tracks visited links
// @author       You
// @match        https://www.nexusmods.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://www.nexusmods.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Uploader New Tab Script Started ===');

    // Storage key for visited uploader links
    const STORAGE_KEY = 'nexus_visited_uploaders';
    
    // Flag to track if the script is in active mode
    let isActive = false;
    
    // Currently highlighted uploader link
    let currentHighlightedLink = null;

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
    
    // Toggle active mode for opening uploader links
    function toggleActiveMode() {
        isActive = !isActive;
        
        // Remove highlight from current link if any
        if (!isActive && currentHighlightedLink) {
            currentHighlightedLink.style.outline = '';
            currentHighlightedLink = null;
        }
        
        // Show status message
        const statusMessage = document.createElement('div');
        statusMessage.textContent = isActive ? 'Uploader Link Mode: ACTIVE' : 'Uploader Link Mode: INACTIVE';
        statusMessage.style.position = 'fixed';
        statusMessage.style.top = '10px';
        statusMessage.style.right = '10px';
        statusMessage.style.backgroundColor = isActive ? '#5a9e6f' : '#7a2828';
        statusMessage.style.color = 'white';
        statusMessage.style.padding = '5px 10px';
        statusMessage.style.borderRadius = '5px';
        statusMessage.style.zIndex = '10000';
        statusMessage.style.fontWeight = 'bold';
        statusMessage.style.transition = 'opacity 0.5s ease-in-out';
        
        document.body.appendChild(statusMessage);
        
        // Remove the status message after 2 seconds
        setTimeout(() => {
            statusMessage.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(statusMessage);
            }, 500);
        }, 2000);
        
        console.log('Active mode toggled:', isActive);
        
        // If active mode is enabled, highlight the first uploader link
        if (isActive) {
            highlightFirstUploaderLink();
        }
    }
    
    // Highlight the first uploader link on the page
    function highlightFirstUploaderLink() {
        const uploaderLinks = document.querySelectorAll('div.author a[href^="https://www.nexusmods.com/users/"]');
        if (uploaderLinks.length > 0) {
            highlightLink(uploaderLinks[0]);
        }
    }
    
    // Highlight a specific link
    function highlightLink(link) {
        // Remove highlight from current link if any
        if (currentHighlightedLink) {
            currentHighlightedLink.style.outline = '';
        }
        
        // Highlight the new link
        link.style.outline = '2px solid #ff9900';
        link.style.outlineOffset = '2px';
        
        // Scroll to the link if it's not in view
        const rect = link.getBoundingClientRect();
        if (
            rect.top < 0 ||
            rect.left < 0 ||
            rect.bottom > (window.innerHeight || document.documentElement.clientHeight) ||
            rect.right > (window.innerWidth || document.documentElement.clientWidth)
        ) {
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        currentHighlightedLink = link;
        console.log('Highlighted link:', link.href);
    }
    
    // Open the currently highlighted link in a new tab
    function openHighlightedLink() {
        if (!currentHighlightedLink) return;
        
        const visitedUploaders = getVisitedUploaders();
        const uploaderId = currentHighlightedLink.href.split('/users/')[1].split('?')[0];
        
        console.log('Opening highlighted link in new tab:', currentHighlightedLink.href);
        window.open(currentHighlightedLink.href, '_blank');
        
        // If we haven't visited this uploader before, mark as visited
        if (!visitedUploaders.has(uploaderId)) {
            visitedUploaders.add(uploaderId);
            saveVisitedUploaders(visitedUploaders);
            
            // Mark as visited
            currentHighlightedLink.style.textDecoration = 'underline';
            currentHighlightedLink.style.textDecorationStyle = 'dotted';
            currentHighlightedLink.style.textDecorationColor = '#5a9e6f';
            currentHighlightedLink.setAttribute('data-visited', 'true');
            
            console.log('Marked link as visited:', uploaderId);
        }
        
        // Move to the next link
        const uploaderLinks = Array.from(document.querySelectorAll('div.author a[href^="https://www.nexusmods.com/users/"]'));
        const currentIndex = uploaderLinks.indexOf(currentHighlightedLink);
        
        if (currentIndex < uploaderLinks.length - 1) {
            highlightLink(uploaderLinks[currentIndex + 1]);
        } else {
            // If we're at the last link, disable active mode
            toggleActiveMode();
        }
    }
    
    // Navigate between uploader links
    function navigateLinks(direction) {
        if (!isActive || !currentHighlightedLink) return;
        
        const uploaderLinks = Array.from(document.querySelectorAll('div.author a[href^="https://www.nexusmods.com/users/"]'));
        const currentIndex = uploaderLinks.indexOf(currentHighlightedLink);
        
        if (direction === 'next' && currentIndex < uploaderLinks.length - 1) {
            highlightLink(uploaderLinks[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            highlightLink(uploaderLinks[currentIndex - 1]);
        }
    }
    
    // Set up keyboard shortcuts
    function setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            // Check if we're in a text input
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
                return;
            }
            
            // Check for backslash key to toggle active mode
            if (e.key === "\\") {
                e.preventDefault();
                toggleActiveMode();
                return;
            }
            
            // Only process these keys if in active mode
            if (!isActive) return;
            
            // Enter key to open the highlighted link
            if (e.key === "Enter") {
                e.preventDefault();
                openHighlightedLink();
                return;
            }
            
            // Arrow keys to navigate between links
            if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                navigateLinks('next');
                return;
            }
            
            if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                navigateLinks('prev');
                return;
            }
            
            // Escape key to exit active mode
            if (e.key === "Escape") {
                e.preventDefault();
                if (isActive) {
                    toggleActiveMode();
                }
                return;
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
        instructions.innerHTML = 'Press <b>\\</b> to activate link mode<br>Use <b>arrow keys</b> to navigate<br>Press <b>Enter</b> to open link<br>Press <b>Esc</b> to exit';
        dropdown.appendChild(instructions);
        
        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Visited Links';
        clearButton.style.width = '100%';
        clearButton.style.padding = '5px';
        clearButton.style.marginTop = '10px';
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
            }
        });
        
        // Add visited count
        const visitedCount = document.createElement('div');
        visitedCount.style.marginBottom = '5px';
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