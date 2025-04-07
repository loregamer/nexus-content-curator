// ==UserScript==
// @name         Nexus Mods - Search Page Overhaul
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Completely replaces the Nexus Mods search page with a custom design
// @author       loregamer
// @match        https://www.nexusmods.com/games/*
// @match        https://www.nexusmods.com/*/search/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @icon         https://www.nexusmods.com/favicon.ico
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-overhaul.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-overhaul.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Search Page Overhaul Started ===');

    // Global variables to store the extracted data
    let searchResults = [];
    let currentFilters = {};
    let totalResults = 0;
    let currentPage = 1;
    let totalPages = 1;
    let gameInfo = {
        name: '',
        id: ''
    };

    // Custom CSS for our redesigned page
    const customCSS = `
        :root {
            --primary-color: #da8e35;
            --secondary-color: #2a3b56;
            --background-color: #1a202c;
            --surface-color: #242a36;
            --text-color: #ffffff;
            --text-secondary: #a0aec0;
            --success-color: #48bb78;
            --warning-color: #ed8936;
            --danger-color: #f56565;
            --border-radius: 8px;
            --transition: all 0.3s ease;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.5;
        }

        /* Only keep the original header and footer */
        body > *:not(header):not(footer):not(#custom-search-container) {
            display: none !important;
        }

        #custom-search-container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 1rem;
        }

        .search-header {
            background-color: var(--surface-color);
            padding: 1.5rem;
            border-radius: var(--border-radius);
            margin-bottom: 1.5rem;
        }

        .search-title {
            font-size: 1.75rem;
            margin: 0 0 1rem 0;
            display: flex;
            align-items: center;
        }

        .search-title .game-name {
            font-weight: bold;
            color: var(--primary-color);
            margin-right: 0.5rem;
        }

        .search-form {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .search-input {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background-color: rgba(0, 0, 0, 0.2);
            color: var(--text-color);
            border-radius: var(--border-radius);
            font-size: 1rem;
        }

        .search-button {
            padding: 0.75rem 1.5rem;
            background-color: var(--primary-color);
            color: #fff;
            border: none;
            border-radius: var(--border-radius);
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: var(--transition);
        }

        .search-button:hover {
            background-color: #b87726;
        }

        .filters-container {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .filter-group {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: var(--border-radius);
            padding: 1rem;
            flex: 1;
            min-width: 200px;
        }

        .filter-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }

        .filter-options {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .filter-option {
            display: flex;
            align-items: center;
        }

        .filter-option input {
            margin-right: 0.5rem;
        }

        .results-container {
            background-color: var(--surface-color);
            border-radius: var(--border-radius);
            padding: 1.5rem;
        }

        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .results-count {
            font-size: 1.1rem;
            color: var(--text-secondary);
        }

        .sort-options {
            display: flex;
            gap: 0.5rem;
        }

        .sort-option {
            padding: 0.5rem 1rem;
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: var(--transition);
        }

        .sort-option.active {
            background-color: var(--primary-color);
            color: #fff;
        }

        .mod-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .mod-card {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: var(--border-radius);
            overflow: hidden;
            transition: var(--transition);
            position: relative;
        }

        .mod-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .mod-image {
            width: 100%;
            height: 180px;
            object-fit: cover;
        }

        .mod-content {
            padding: 1rem;
        }

        .mod-title {
            font-size: 1.1rem;
            font-weight: bold;
            margin: 0 0 0.5rem 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .mod-author {
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }

        .mod-description {
            font-size: 0.9rem;
            margin-bottom: 1rem;
            color: var(--text-secondary);
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .mod-stats {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }

        .mod-stat {
            display: flex;
            align-items: center;
        }

        .mod-stat i {
            margin-right: 0.25rem;
        }

        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 2rem;
            gap: 0.5rem;
        }

        .page-item {
            width: 40px;
            height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: var(--transition);
        }

        .page-item.active {
            background-color: var(--primary-color);
            color: #fff;
        }

        .page-item:hover:not(.active) {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .page-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Loading spinner */
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 300px;
        }

        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .search-form {
                flex-direction: column;
            }
            
            .mod-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
        }
    `;

    // Function to extract data from the original page
    function extractDataFromOriginalPage() {
        // Extract game information
        const gameNameEl = document.querySelector('h1.game-title');
        if (gameNameEl) {
            gameInfo.name = gameNameEl.textContent.trim();
        } else {
            // Try to get game name from breadcrumbs or URL
            const breadcrumb = document.querySelector('.breadcrumb-item.active');
            if (breadcrumb) {
                gameInfo.name = breadcrumb.textContent.trim();
            } else {
                // Extract from URL
                const urlParts = window.location.pathname.split('/');
                if (urlParts.length > 2) {
                    gameInfo.name = urlParts[2].replace(/^\w/, c => c.toUpperCase());
                }
            }
        }
        
        // Extract game ID if available
        const gameIdMatch = window.location.href.match(/\/games\/(\d+)/);
        if (gameIdMatch && gameIdMatch[1]) {
            gameInfo.id = gameIdMatch[1];
        }
        
        // Extract search results
        const modTiles = document.querySelectorAll('[data-e2eid="mod-tile"]');
        
        modTiles.forEach(tile => {
            const titleEl = tile.querySelector('h3') || tile.querySelector('.text-lg');
            const authorEl = tile.querySelector('a[href*="users"]');
            const imageEl = tile.querySelector('img');
            const descEl = tile.querySelector('p');
            const downloadsEl = tile.querySelector('[title*="Downloads"]');
            const endorsementsEl = tile.querySelector('[title*="Endorsements"]');
            
            const modData = {
                title: titleEl ? titleEl.textContent.trim() : 'Unknown Mod',
                author: authorEl ? authorEl.textContent.trim() : 'Unknown Author',
                image: imageEl ? imageEl.src : '',
                description: descEl ? descEl.textContent.trim() : '',
                downloads: downloadsEl ? downloadsEl.textContent.trim() : '0',
                endorsements: endorsementsEl ? endorsementsEl.textContent.trim() : '0',
                url: titleEl && titleEl.closest('a') ? titleEl.closest('a').href : '#'
            };
            
            searchResults.push(modData);
        });
        
        // Extract total results
        const resultsCountEl = document.querySelector('.showing-x-results');
        if (resultsCountEl) {
            const countMatch = resultsCountEl.textContent.match(/(\d+(?:,\d+)*)/);
            if (countMatch && countMatch[1]) {
                totalResults = parseInt(countMatch[1].replace(/,/g, ''));
            }
        }
        
        // Extract current page and total pages
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) {
            const activePageEl = paginationEl.querySelector('.active');
            if (activePageEl) {
                currentPage = parseInt(activePageEl.textContent) || 1;
            }
            
            const pageItems = paginationEl.querySelectorAll('li:not(.disabled):not(.active)');
            if (pageItems.length > 0) {
                const lastPageEl = pageItems[pageItems.length - 1];
                totalPages = parseInt(lastPageEl.textContent) || 1;
            }
        }
        
        // Extract filters
        const filterGroups = document.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            const titleEl = group.querySelector('.filter-group-title');
            if (titleEl) {
                const filterName = titleEl.textContent.trim();
                currentFilters[filterName] = [];
                
                const activeFilters = group.querySelectorAll('.active');
                activeFilters.forEach(filter => {
                    currentFilters[filterName].push(filter.textContent.trim());
                });
            }
        });
    }

    // Function to create our custom UI
    function createCustomUI() {
        // Create container for our custom search page
        const customContainer = document.createElement('div');
        customContainer.id = 'custom-search-container';
        
        // Create search header
        const searchHeader = document.createElement('div');
        searchHeader.className = 'search-header';
        
        const searchTitle = document.createElement('h1');
        searchTitle.className = 'search-title';
        searchTitle.innerHTML = `<span class="game-name">${gameInfo.name}</span> Mods`;
        
        const searchForm = document.createElement('div');
        searchForm.className = 'search-form';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Search mods...';
        
        const searchButton = document.createElement('button');
        searchButton.className = 'search-button';
        searchButton.textContent = 'Search';
        
        searchForm.appendChild(searchInput);
        searchForm.appendChild(searchButton);
        
        searchHeader.appendChild(searchTitle);
        searchHeader.appendChild(searchForm);
        
        // Create filters container
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'filters-container';
        
        // Sample filter groups - these would be populated based on the extracted data
        const filterGroups = [
            { title: 'Categories', options: ['Gameplay', 'Visuals', 'Audio', 'Characters', 'Items', 'Quests'] },
            { title: 'Tags', options: ['Immersion', 'Performance', 'Bug Fix', 'Lore-Friendly', 'Quality of Life'] },
            { title: 'Endorsements', options: ['Any', '100+', '500+', '1000+', '5000+'] },
            { title: 'Time', options: ['Today', 'This Week', 'This Month', 'This Year', 'All Time'] }
        ];
        
        filterGroups.forEach(group => {
            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            
            const filterTitle = document.createElement('div');
            filterTitle.className = 'filter-title';
            filterTitle.textContent = group.title;
            
            const filterOptions = document.createElement('div');
            filterOptions.className = 'filter-options';
            
            group.options.forEach(option => {
                const filterOption = document.createElement('label');
                filterOption.className = 'filter-option';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                
                const optionText = document.createTextNode(option);
                
                filterOption.appendChild(checkbox);
                filterOption.appendChild(optionText);
                
                filterOptions.appendChild(filterOption);
            });
            
            filterGroup.appendChild(filterTitle);
            filterGroup.appendChild(filterOptions);
            
            filtersContainer.appendChild(filterGroup);
        });
        
        searchHeader.appendChild(filtersContainer);
        
        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';
        
        const resultsHeader = document.createElement('div');
        resultsHeader.className = 'results-header';
        
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.textContent = `Showing ${searchResults.length} of ${totalResults} mods`;
        
        const sortOptions = document.createElement('div');
        sortOptions.className = 'sort-options';
        
        const sortOptionLabels = ['Most Endorsed', 'Most Recent', 'Most Downloaded', 'Last Updated'];
        
        sortOptionLabels.forEach((label, index) => {
            const sortOption = document.createElement('div');
            sortOption.className = 'sort-option' + (index === 0 ? ' active' : '');
            sortOption.textContent = label;
            sortOptions.appendChild(sortOption);
        });
        
        resultsHeader.appendChild(resultsCount);
        resultsHeader.appendChild(sortOptions);
        
        // Create mod grid
        const modGrid = document.createElement('div');
        modGrid.className = 'mod-grid';
        
        // If we have search results, display them
        if (searchResults.length > 0) {
            searchResults.forEach(mod => {
                const modCard = document.createElement('div');
                modCard.className = 'mod-card';
                
                // Create mod image
                const modImage = document.createElement('img');
                modImage.className = 'mod-image';
                modImage.src = mod.image || 'https://staticdelivery.nexusmods.com/images/1704/thumbnails/1.jpg'; // Default image if none available
                modImage.alt = mod.title;
                
                // Create mod content
                const modContent = document.createElement('div');
                modContent.className = 'mod-content';
                
                const modTitle = document.createElement('h3');
                modTitle.className = 'mod-title';
                modTitle.textContent = mod.title;
                
                const modAuthor = document.createElement('div');
                modAuthor.className = 'mod-author';
                modAuthor.textContent = `by ${mod.author}`;
                
                const modDescription = document.createElement('div');
                modDescription.className = 'mod-description';
                modDescription.textContent = mod.description;
                
                const modStats = document.createElement('div');
                modStats.className = 'mod-stats';
                
                const modDownloads = document.createElement('div');
                modDownloads.className = 'mod-stat';
                modDownloads.innerHTML = `<i>↓</i> ${mod.downloads}`;
                
                const modEndorsements = document.createElement('div');
                modEndorsements.className = 'mod-stat';
                modEndorsements.innerHTML = `<i>♥</i> ${mod.endorsements}`;
                
                modStats.appendChild(modDownloads);
                modStats.appendChild(modEndorsements);
                
                modContent.appendChild(modTitle);
                modContent.appendChild(modAuthor);
                modContent.appendChild(modDescription);
                modContent.appendChild(modStats);
                
                // Make the entire card clickable
                const modLink = document.createElement('a');
                modLink.href = mod.url;
                modLink.style.textDecoration = 'none';
                modLink.style.color = 'inherit';
                
                modCard.appendChild(modImage);
                modCard.appendChild(modContent);
                
                modLink.appendChild(modCard);
                modGrid.appendChild(modLink);
            });
        } else {
            // If no results, show a message
            const noResults = document.createElement('div');
            noResults.style.textAlign = 'center';
            noResults.style.padding = '3rem 0';
            noResults.style.color = 'var(--text-secondary)';
            noResults.textContent = 'No mods found matching your criteria.';
            
            modGrid.appendChild(noResults);
        }
        
        // Create pagination
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        // Previous button
        const prevButton = document.createElement('div');
        prevButton.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevButton.innerHTML = '&lt;';
        pagination.appendChild(prevButton);
        
        // Page buttons
        const maxPageButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
        
        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('div');
            pageButton.className = 'page-item' + (i === currentPage ? ' active' : '');
            pageButton.textContent = i;
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('div');
        nextButton.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextButton.innerHTML = '&gt;';
        pagination.appendChild(nextButton);
        
        resultsContainer.appendChild(resultsHeader);
        resultsContainer.appendChild(modGrid);
        resultsContainer.appendChild(pagination);
        
        // Assemble the custom container
        customContainer.appendChild(searchHeader);
        customContainer.appendChild(resultsContainer);
        
        return customContainer;
    }

    // Function to inject our custom CSS
    function injectCustomCSS() {
        GM_addStyle(customCSS);
    }

    // Function to replace the original page with our custom design
    function replaceOriginalPage() {
        // Extract data from the original page first
        extractDataFromOriginalPage();
        
        // Create our custom UI
        const customUI = createCustomUI();
        
        // Find where to insert our custom container
        const mainElement = document.querySelector('main') || document.body;
        
        // If there's a main element, replace its content with our custom UI
        // Otherwise, append it to the body after the header
        const header = document.querySelector('header');
        
        if (mainElement !== document.body) {
            // Clear main content and add our custom UI
            while (mainElement.firstChild) {
                mainElement.removeChild(mainElement.firstChild);
            }
            mainElement.appendChild(customUI);
        } else if (header) {
            // Insert after header
            if (header.nextSibling) {
                document.body.insertBefore(customUI, header.nextSibling);
            } else {
                document.body.appendChild(customUI);
            }
        } else {
            // Just append to body if no header found
            document.body.appendChild(customUI);
        }
    }

    // Add event listener to wait for the page to load
    // We need the DOM to be fully loaded to extract data and replace content
    function initializeScript() {
        // Inject custom CSS as early as possible
        injectCustomCSS();
        
        // Handle different load states
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', replaceOriginalPage);
        } else {
            // DOM already loaded, replace the page
            replaceOriginalPage();
        }
    }

    // Initialize the script
    initializeScript();
    
    // Add a mutation observer to handle dynamic content loading
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // If we detect new mod tiles being added to the page, extract and update our UI
                const hasNewModTiles = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && 
                    ((node.getAttribute && node.getAttribute('data-e2eid') === 'mod-tile') || 
                     node.querySelector && node.querySelector('[data-e2eid="mod-tile"]'))
                );
                
                if (hasNewModTiles) {
                    extractDataFromOriginalPage();
                    replaceOriginalPage();
                }
            }
        });
    });
    
    // Start observing once the page is interactive
    document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
    });
    
    // Handle back/forward navigation or URL changes
    window.addEventListener('popstate', function() {
        // Check if we're still on a search page
        if (window.location.href.match(/nexusmods\.com\/games\//)) {
            setTimeout(function() {
                // Reset our data
                searchResults = [];
                currentFilters = {};
                totalResults = 0;
                
                // Re-extract data and update UI
                extractDataFromOriginalPage();
                replaceOriginalPage();
            }, 500); // Small delay to let the page load
        }
    });
})();