// ==UserScript==
// @name         Nexus Mods - Old Search Page Renderer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Replaces Nexus Mods search page with a classic-style design
// @author       loregamer
// @match        https://www.nexusmods.com/games/*
// @match        https://www.nexusmods.com/*/search/*
// @match        https://www.nexusmods.com/*/mods/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @icon         https://www.nexusmods.com/favicon.ico
// @updateURL    https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-overhaul.user.js
// @downloadURL  https://github.com/loregamer/nexus-content-curator/raw/refs/heads/main/nexus-search-overhaul.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('=== Nexus Search Page - Old Style Renderer Started ===');

    // Custom CSS to mimic the Nexus Mods search page design
    const customCSS = `
        /* Reset and base styles */
        #classic-search-container * {
            box-sizing: border-box;
        }

        /* General Layout */
        body {
            margin: 0;
            padding: 0;
            font-family: 'Open Sans', sans-serif;
            background-color: #181818;
            color: #c8c8c8;
            line-height: 1.5;
            overflow-x: hidden;
        }
        
        body::before {
            content: " ";
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
        }

        /* Only keep the original header and footer */
        body > *:not(header):not(footer):not(#classic-search-container) {
            display: none !important;
        }

        #classic-search-container {
            max-width: 1300px;
            margin: 2rem auto;
            padding: 0 1rem;
            position: relative;
            z-index: 1;
        }

        /* Game Header */
        .game-header {
            display: flex;
            align-items: center;
            margin-bottom: 2rem;
        }

        .game-logo {
            width: 64px;
            height: 64px;
            margin-right: 1rem;
            border-radius: 6px;
        }

        .game-info h1 {
            margin: 0;
            font-size: 1.8rem;
            color: #da8e35;
        }

        .game-info .mods-count {
            font-size: 0.9rem;
            color: #a0a0a0;
        }

        /* Search and Filters Section */
        .search-filters {
            background-color: rgba(36, 36, 36, 0.95);
            border-radius: 6px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .search-form {
            display: flex;
            margin-bottom: 1rem;
            gap: 0.5rem;
        }

        .search-input {
            flex-grow: 1;
            padding: 0.5rem 1rem;
            border: 1px solid #3a3a3a;
            background-color: #333;
            color: #fff;
            border-radius: 4px;
            font-size: 1rem;
        }

        .search-button {
            padding: 0.5rem 1.5rem;
            background-color: #da8e35;
            border: none;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .filter-tabs {
            display: flex;
            border-bottom: 1px solid #3a3a3a;
            margin-bottom: 1rem;
        }

        .filter-tab {
            padding: 0.5rem 1rem;
            cursor: pointer;
            margin-right: 0.5rem;
            border-bottom: 2px solid transparent;
            color: #a0a0a0;
        }

        .filter-tab.active {
            color: #da8e35;
            border-bottom: 2px solid #da8e35;
        }

        .filter-options {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .filter-group {
            flex: 1;
            min-width: 200px;
        }

        .filter-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #d0d0d0;
        }

        .filter-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .filter-item {
            margin-bottom: 0.25rem;
        }

        .filter-checkbox {
            margin-right: 0.5rem;
        }

        /* Results Count and Sort */
        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background-color: rgba(42, 42, 42, 0.95);
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .results-count {
            font-size: 0.9rem;
            color: #a0a0a0;
        }

        .sort-options {
            display: flex;
            align-items: center;
        }

        .sort-label {
            margin-right: 0.5rem;
            font-size: 0.9rem;
        }

        .sort-dropdown {
            padding: 0.25rem 0.5rem;
            background-color: #333;
            border: 1px solid #3a3a3a;
            color: #d0d0d0;
            border-radius: 4px;
        }

        /* Mod Listing */
        .mod-list.tile-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .mod-tile {
            display: flex;
            flex-direction: column;
            background-color: rgba(42, 42, 42, 0.95);
            border-radius: 4px;
            overflow: hidden;
            transition: background-color 0.2s ease;
            height: 100%;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .mod-tile:hover {
            background-color: rgba(51, 51, 51, 0.98);
        }

        .mod-header {
            padding: 10px 15px;
            border-bottom: 1px solid #333;
        }
        
        .mod-title {
            margin: 0 0 5px 0;
            font-size: 1.2rem;
        }
        
        .mod-title a {
            color: #da8e35;
            text-decoration: none;
        }
        
        .mod-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 0.8rem;
            color: #a0a0a0;
        }
        
        .mod-category,
        .mod-date,
        .mod-updated,
        .mod-author {
            display: flex;
            align-items: center;
        }
        
        .mod-category a,
        .mod-author a {
            color: #a0a0a0;
            text-decoration: none;
        }
        
        .mod-category a:hover,
        .mod-author a:hover {
            color: #da8e35;
        }
        
        .mod-desc {
            padding: 10px 15px;
            font-size: 0.9rem;
            color: #c8c8c8;
        }
        
        .mod-staff-note {
            padding: 5px 15px;
            background-color: #333;
            font-size: 0.9rem;
            color: #da8e35;
        }
        
        .mod-stats {
            padding: 10px 15px;
            border-top: 1px solid #333;
            display: flex;
            gap: 15px;
            background-color: #222;
        }
        
        .mod-stats .stat {
            display: flex;
            align-items: center;
            color: #a0a0a0;
            font-size: 0.9rem;
        }
        
        .mod-stats svg {
            width: 16px;
            height: 16px;
            margin-right: 4px;
            fill: #a0a0a0;
        }

        .mod-image img, .tile-image img {
            width: 100%;
            height: 150px;
            object-fit: cover;
        }

        .tile-data {
            padding: 0.5rem;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .tile-data ul {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: space-between;
        }

        .tile-data li {
            display: flex;
            align-items: center;
            font-size: 0.8rem;
            color: #a0a0a0;
        }

        .tile-data svg {
            width: 14px;
            height: 14px;
            margin-right: 0.25rem;
            fill: #a0a0a0;
        }

        .tile-content .tile-name {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
        }

        .tile-content .tile-name a {
            color: #da8e35;
            text-decoration: none;
        }

        .tile-content .meta {
            display: flex;
            margin-bottom: 0.5rem;
            font-size: 0.8rem;
            color: #a0a0a0;
        }

        .tile-content .category {
            margin-right: 1rem;
        }

        .tile-content .category a {
            color: #a0a0a0;
            text-decoration: none;
        }

        .tile-content .author {
            margin-right: 1rem;
        }

        .tile-content .author a {
            color: #a0a0a0;
            text-decoration: none;
        }

        .tile-content .desc {
            font-size: 0.9rem;
            color: #c8c8c8;
            margin-bottom: 0.5rem;
            max-height: 60px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Pagination */
        .pagination {
            display: flex;
            justify-content: flex-start;
            margin: 2rem 0;
        }

        .pagination-item {
            margin: 0 0.25rem;
            width: 35px;
            height: 35px;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(42, 42, 42, 0.95);
            border-radius: 4px;
            cursor: pointer;
            color: #c8c8c8;
            text-decoration: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .pagination-item.active {
            background-color: #da8e35;
            color: #fff;
        }

        .pagination-item:hover:not(.active) {
            background-color: rgba(51, 51, 51, 0.98);
        }
    `;

    // Placeholder game data
    const gameData = {
        name: 'Baldur\'s Gate 3',
        logoUrl: 'https://staticdelivery.nexusmods.com/Images/games/4_3/tile_3474.jpg',
        modCount: '11,627'
    };

    // Sample categories for filters
    const categories = [
        'Gameplay', 'Visuals', 'Audio', 'UI', 'Characters', 'Items', 'Bug Fixes',
        'Utilities', 'Cheats', 'Save Games', 'Modders Resources'
    ];

    // Sample tags for filters
    const tags = [
        'Immersion', 'Lore-Friendly', 'Quality of Life', 'Overhaul',
        'New Content', 'Performance', 'Tweaks', 'Balance'
    ];

    // Sample placeholder mods
    const placeholderMods = [
        {
            id: 1,
            title: 'Enhanced Character Creation',
            author: 'ModAuthor1',
            category: 'Gameplay',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/45488/45488-1617348039-1105079674.jpeg',
            description: 'Adds new character creation options including hairstyles, faces, and more customization options.',
            fileSize: '1.2GB',
            endorsements: '23.4k',
            downloads: '240k',
            uploadDate: '2021-04-02'
        },
        {
            id: 2,
            title: 'Better UI Overhaul',
            author: 'ModAuthor2',
            category: 'UI',
            image: 'https://staticdelivery.nexusmods.com/Images/games/1/12/3474/75.jpg',
            description: 'Completely redesigns the user interface for better usability and immersion.',
            fileSize: '450MB',
            endorsements: '15.2k',
            downloads: '180k',
            uploadDate: '2021-05-15'
        },
        {
            id: 3,
            title: 'Expanded Combat Options',
            author: 'ModAuthor3',
            category: 'Gameplay',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/21507/21507-1623501663-1883258139.png',
            description: 'Adds new combat abilities, spells, and tactical options for all character classes.',
            fileSize: '850MB',
            endorsements: '19.8k',
            downloads: '210k',
            uploadDate: '2021-06-10'
        },
        {
            id: 4,
            title: 'Enhanced Textures Pack',
            author: 'ModAuthor4',
            category: 'Visuals',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/9875/9875-1629382425-1531946453.jpeg',
            description: 'High-resolution texture pack that improves the visual quality of environments, characters, and items.',
            fileSize: '2.5GB',
            endorsements: '28.1k',
            downloads: '320k',
            uploadDate: '2021-08-20'
        },
        {
            id: 5,
            title: 'Immersive Sound Overhaul',
            author: 'ModAuthor5',
            category: 'Audio',
            image: 'https://staticdelivery.nexusmods.com/Images/1704/thumbnails/1.jpg',
            description: 'Enhances the audio experience with new sound effects, ambient sounds, and music.',
            fileSize: '750MB',
            endorsements: '12.5k',
            downloads: '150k',
            uploadDate: '2021-09-05'
        },
        {
            id: 6,
            title: 'New Companion NPCs',
            author: 'ModAuthor6',
            category: 'Characters',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/38562/38562-1635787225-83559139.png',
            description: 'Adds several new fully voiced companion NPCs with unique questlines and dialogue.',
            fileSize: '1.8GB',
            endorsements: '22.7k',
            downloads: '260k',
            uploadDate: '2021-11-01'
        },
        {
            id: 7,
            title: 'Expanded Weapons Collection',
            author: 'ModAuthor7',
            category: 'Items',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/52697/52697-1641568425-590446745.jpeg',
            description: 'Adds hundreds of new weapons with unique models, effects, and enchantments.',
            fileSize: '980MB',
            endorsements: '17.3k',
            downloads: '190k',
            uploadDate: '2022-01-07'
        },
        {
            id: 8,
            title: 'Advanced Bug Fixes',
            author: 'ModAuthor8',
            category: 'Bug Fixes',
            image: 'https://staticdelivery.nexusmods.com/Images/1704/thumbnails/1.jpg',
            description: 'Comprehensive collection of bug fixes addressing various issues in the base game.',
            fileSize: '320MB',
            endorsements: '31.5k',
            downloads: '420k',
            uploadDate: '2022-02-18'
        },
        {
            id: 9,
            title: 'Performance Optimization Suite',
            author: 'ModAuthor9',
            category: 'Utilities',
            image: 'https://staticdelivery.nexusmods.com/Images/1704/thumbnails/1.jpg',
            description: 'Tools and tweaks to improve game performance, reduce loading times, and optimize memory usage.',
            fileSize: '180MB',
            endorsements: '35.2k',
            downloads: '480k',
            uploadDate: '2022-03-22'
        },
        {
            id: 10,
            title: 'New Quests and Adventures',
            author: 'ModAuthor10',
            category: 'Gameplay',
            image: 'https://staticdelivery.nexusmods.com/Images/3474/67435/67435-1649173825-2076431596.jpeg',
            description: 'Expands the game with new questlines, locations, and adventures for high-level characters.',
            fileSize: '2.2GB',
            endorsements: '25.9k',
            downloads: '280k',
            uploadDate: '2022-04-05'
        }
    ];

    // Create the classic search page HTML
    function createClassicSearchPage() {
        const container = document.createElement('div');
        container.id = 'classic-search-container';
        container.className = 'static resultpage';
        
        // Game header
        const gameHeader = document.createElement('div');
        gameHeader.className = 'game-header';
        
        const gameLogo = document.createElement('img');
        gameLogo.className = 'game-logo';
        gameLogo.src = gameData.logoUrl;
        gameLogo.alt = gameData.name;
        
        const gameInfo = document.createElement('div');
        gameInfo.className = 'game-info';
        
        const gameTitle = document.createElement('h1');
        gameTitle.textContent = gameData.name + ' Mods';
        
        const modsCount = document.createElement('div');
        modsCount.className = 'mods-count';
        modsCount.textContent = `Browse ${gameData.modCount} mods for ${gameData.name}`;
        
        gameInfo.appendChild(gameTitle);
        gameInfo.appendChild(modsCount);
        
        gameHeader.appendChild(gameLogo);
        gameHeader.appendChild(gameInfo);
        container.appendChild(gameHeader);
        
        // Search and filters section
        const searchFilters = document.createElement('div');
        searchFilters.className = 'search-filters';
        
        // Search form
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
        searchFilters.appendChild(searchForm);
        
        // Filter tabs
        const filterTabs = document.createElement('div');
        filterTabs.className = 'filter-tabs';
        
        const tabNames = ['Mods', 'Categories', 'Tags', 'Advanced'];
        tabNames.forEach((tab, index) => {
            const filterTab = document.createElement('div');
            filterTab.className = 'filter-tab' + (index === 0 ? ' active' : '');
            filterTab.textContent = tab;
            filterTabs.appendChild(filterTab);
        });
        
        searchFilters.appendChild(filterTabs);
        
        // Filter options
        const filterOptions = document.createElement('div');
        filterOptions.className = 'filter-options';
        
        // Categories filter group
        const categoriesGroup = document.createElement('div');
        categoriesGroup.className = 'filter-group';
        
        const categoriesTitle = document.createElement('div');
        categoriesTitle.className = 'filter-title';
        categoriesTitle.textContent = 'Categories';
        
        const categoriesList = document.createElement('ul');
        categoriesList.className = 'filter-list';
        
        categories.forEach(category => {
            const listItem = document.createElement('li');
            listItem.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'filter-checkbox';
            checkbox.id = 'category-' + category.toLowerCase().replace(/\s+/g, '-');
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = category;
            
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            categoriesList.appendChild(listItem);
        });
        
        categoriesGroup.appendChild(categoriesTitle);
        categoriesGroup.appendChild(categoriesList);
        filterOptions.appendChild(categoriesGroup);
        
        // Tags filter group
        const tagsGroup = document.createElement('div');
        tagsGroup.className = 'filter-group';
        
        const tagsTitle = document.createElement('div');
        tagsTitle.className = 'filter-title';
        tagsTitle.textContent = 'Tags';
        
        const tagsList = document.createElement('ul');
        tagsList.className = 'filter-list';
        
        tags.forEach(tag => {
            const listItem = document.createElement('li');
            listItem.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'filter-checkbox';
            checkbox.id = 'tag-' + tag.toLowerCase().replace(/\s+/g, '-');
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = tag;
            
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            tagsList.appendChild(listItem);
        });
        
        tagsGroup.appendChild(tagsTitle);
        tagsGroup.appendChild(tagsList);
        filterOptions.appendChild(tagsGroup);
        
        // Time period filter group
        const timeGroup = document.createElement('div');
        timeGroup.className = 'filter-group';
        
        const timeTitle = document.createElement('div');
        timeTitle.className = 'filter-title';
        timeTitle.textContent = 'Time Period';
        
        const timeList = document.createElement('ul');
        timeList.className = 'filter-list';
        
        const timePeriods = ['Today', 'This Week', 'This Month', 'This Year', 'All Time'];
        timePeriods.forEach(period => {
            const listItem = document.createElement('li');
            listItem.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'filter-checkbox';
            checkbox.id = 'time-' + period.toLowerCase().replace(/\s+/g, '-');
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = period;
            
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            timeList.appendChild(listItem);
        });
        
        timeGroup.appendChild(timeTitle);
        timeGroup.appendChild(timeList);
        filterOptions.appendChild(timeGroup);
        
        searchFilters.appendChild(filterOptions);
        container.appendChild(searchFilters);
        
        // Results header
        const resultsHeader = document.createElement('div');
        resultsHeader.className = 'results-header';
        
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.textContent = `Showing ${placeholderMods.length} of ${gameData.modCount} mods`;
        
        const sortOptions = document.createElement('div');
        sortOptions.className = 'sort-options';
        
        const sortLabel = document.createElement('span');
        sortLabel.className = 'sort-label';
        sortLabel.textContent = 'Sort by:';
        
        const sortDropdown = document.createElement('select');
        sortDropdown.className = 'sort-dropdown';
        
        const sortCriteria = ['Most Endorsed', 'Most Recent', 'Most Downloaded', 'Last Updated'];
        sortCriteria.forEach(criteria => {
            const option = document.createElement('option');
            option.value = criteria.toLowerCase().replace(/\s+/g, '-');
            option.textContent = criteria;
            sortDropdown.appendChild(option);
        });
        
        sortOptions.appendChild(sortLabel);
        sortOptions.appendChild(sortDropdown);
        
        resultsHeader.appendChild(resultsCount);
        resultsHeader.appendChild(sortOptions);
        container.appendChild(resultsHeader);
        
        // Mod list
        const modList = document.createElement('ul');
        modList.className = 'mod-list tile-list';
        
        placeholderMods.forEach(mod => {
            const modTile = document.createElement('li');
            modTile.className = 'mod-tile';
            modTile.setAttribute('data-mod-id', mod.id);
            modTile.setAttribute('data-game-id', '3474');
            
            // Header section with title and metadata
            const modHeader = document.createElement('div');
            modHeader.className = 'mod-header';
            
            const modTitle = document.createElement('h3');
            modTitle.className = 'mod-title';
            
            const titleLink = document.createElement('a');
            titleLink.href = `https://www.nexusmods.com/baldursgate3/mods/${mod.id}`;
            titleLink.textContent = mod.title;
            modTitle.appendChild(titleLink);
            
            const modMeta = document.createElement('div');
            modMeta.className = 'mod-meta';
            
            // Category
            const modCategory = document.createElement('div');
            modCategory.className = 'mod-category';
            
            const categoryLink = document.createElement('a');
            categoryLink.href = `https://www.nexusmods.com/baldursgate3/mods/categories/${categories.indexOf(mod.category) + 1}/`;
            categoryLink.textContent = mod.category;
            modCategory.appendChild(categoryLink);
            
            // Upload date
            const modUploaded = document.createElement('div');
            modUploaded.className = 'mod-date';
            modUploaded.innerHTML = `Uploaded: <time datetime="${mod.uploadDate}">${mod.uploadDate}</time>`;
            
            // Last updated
            const modUpdated = document.createElement('div');
            modUpdated.className = 'mod-updated';
            // Using uploadDate as a placeholder, in a real implementation this would be lastUpdated
            modUpdated.innerHTML = `Last Update: <time datetime="${mod.uploadDate}">${mod.uploadDate}</time>`;
            
            // Author
            const modAuthor = document.createElement('div');
            modAuthor.className = 'mod-author';
            
            const authorLink = document.createElement('a');
            authorLink.href = `https://www.nexusmods.com/baldursgate3/users/${mod.author.toLowerCase()}`;
            authorLink.textContent = mod.author;
            modAuthor.innerHTML = 'Author: ';
            modAuthor.appendChild(authorLink);
            
            // Add all meta elements
            modMeta.appendChild(modCategory);
            modMeta.appendChild(modUploaded);
            modMeta.appendChild(modUpdated);
            modMeta.appendChild(modAuthor);
            
            // Add title and meta to header
            modHeader.appendChild(modTitle);
            modHeader.appendChild(modMeta);
            
            // Description section (optional staff note)
            const modStaffNote = document.createElement('div');
            modStaffNote.className = 'mod-staff-note';
            // Only add for the first item as an example
            if (mod.id === 1) {
                modStaffNote.innerHTML = 'Nexus Mods Staff edit: This mod is now the de-facto Mod Fixer for Baldur\'s Gate 3 and works with the Full Release. This pak forces the story to recompile, allowing pak mods to work with the Full...';
            }
            
            // Regular description
            const modDesc = document.createElement('div');
            modDesc.className = 'mod-desc';
            modDesc.textContent = mod.description;
            
            // Stats section (bottom)
            const modStats = document.createElement('div');
            modStats.className = 'mod-stats';
            
            const fileSize = document.createElement('div');
            fileSize.className = 'stat filesize';
            fileSize.innerHTML = `<svg title="" class="icon icon-filesize"><use xlink:href="https://www.nexusmods.com/assets/images/icons/icons.svg#icon-filesize"></use></svg><span>${mod.fileSize}</span>`;
            
            const endorsements = document.createElement('div');
            endorsements.className = 'stat endorsements';
            endorsements.innerHTML = `<svg title="" class="icon icon-endorse"><use xlink:href="https://www.nexusmods.com/assets/images/icons/icons.svg#icon-endorse"></use></svg><span>${mod.endorsements}</span>`;
            
            const downloads = document.createElement('div');
            downloads.className = 'stat downloads';
            downloads.innerHTML = `<svg title="" class="icon icon-downloads"><use xlink:href="https://www.nexusmods.com/assets/images/icons/icons.svg#icon-downloads"></use></svg><span>${mod.downloads}</span>`;
            
            modStats.appendChild(fileSize);
            modStats.appendChild(endorsements);
            modStats.appendChild(downloads);
            
            // Assemble the tile
            modTile.appendChild(modHeader);
            
            // Only add staff note if it has content
            if (mod.id === 1) {
                modTile.appendChild(modStaffNote);
            }
            
            modTile.appendChild(modDesc);
            modTile.appendChild(modStats);
            
            modList.appendChild(modTile);
        });
        
        container.appendChild(modList);
        
        // Pagination
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        const pages = ['<', '1', '2', '3', '4', '5', '...', '42', '>'];
        pages.forEach((page, index) => {
            const pageLink = document.createElement('a');
            pageLink.className = 'pagination-item' + (page === '1' ? ' active' : '');
            pageLink.href = page === '<' || page === '>' || page === '...' ? 'javascript:void(0)' : `https://www.nexusmods.com/baldursgate3/mods/?page=${page}`;
            pageLink.textContent = page;
            pagination.appendChild(pageLink);
        });
        
        container.appendChild(pagination);
        
        return container;
    }

    // Function to inject custom CSS
    function injectCustomCSS() {
        GM_addStyle(customCSS);
    }

    // Function to completely clear the DOM and rebuild the page
    function replaceOriginalPage() {
        // Create our custom search page
        const classicSearchPage = createClassicSearchPage();
        
        // Save the original page title
        const originalTitle = document.title;
        
        // Save any necessary scripts and stylesheets
        const importantScripts = Array.from(document.querySelectorAll('script')).map(script => {
            return {
                src: script.src,
                content: script.innerHTML,
                type: script.type,
                id: script.id
            };
        });
        
        const importantStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(style => {
            if (style.tagName === 'LINK') {
                return {
                    href: style.href,
                    rel: style.rel,
                    type: style.type,
                    id: style.id
                };
            } else {
                return {
                    content: style.innerHTML,
                    id: style.id
                };
            }
        });
        
        // Extract favicon information
        const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        const faviconData = favicon ? {
            href: favicon.href,
            type: favicon.type
        } : null;
        
        // Clear document
        document.open();
        document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body></body></html>');
        document.close();
        
        // Restore title
        document.title = originalTitle;
        
        // Add favicon back
        if (faviconData) {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = faviconData.href;
            if (faviconData.type) newFavicon.type = faviconData.type;
            document.head.appendChild(newFavicon);
        }
        
        // Add our custom CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = customCSS;
        document.head.appendChild(styleElement);
        
        // Add essential scripts and styles back
        importantScripts.forEach(scriptData => {
            if (scriptData.src && scriptData.src.includes('jquery')) {
                const script = document.createElement('script');
                script.src = scriptData.src;
                if (scriptData.type) script.type = scriptData.type;
                if (scriptData.id) script.id = scriptData.id;
                document.head.appendChild(script);
            }
        });
        
        // Create basic layout structure
        const header = document.createElement('header');
        header.className = 'nexus-header';
        header.innerHTML = `
            <div class="header-container">
                <div class="logo">
                    <a href="https://www.nexusmods.com/">
                        <img src="https://www.nexusmods.com/assets/images/brand/NexusMods/Horizontal-lockups/NM_Primary-Emblem-Color_Dark-Background.svg" alt="Nexus Mods">
                    </a>
                </div>
                <nav class="main-nav">
                    <ul>
                        <li><a href="https://www.nexusmods.com/">Home</a></li>
                        <li><a href="https://www.nexusmods.com/games">Games</a></li>
                        <li><a href="https://www.nexusmods.com/about/vortex/">Vortex</a></li>
                        <li><a href="https://forums.nexusmods.com/">Forums</a></li>
                    </ul>
                </nav>
                <div class="user-controls">
                    <a href="https://users.nexusmods.com/account/signin" class="login-button">Login</a>
                    <a href="https://users.nexusmods.com/account/register" class="register-button">Register</a>
                </div>
            </div>
        `;
        
        // Create footer
        const footer = document.createElement('footer');
        footer.className = 'nexus-footer';
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-links">
                    <div class="footer-column">
                        <h3>About</h3>
                        <ul>
                            <li><a href="https://www.nexusmods.com/about">About Us</a></li>
                            <li><a href="https://www.nexusmods.com/about/team">Team</a></li>
                            <li><a href="https://www.nexusmods.com/jobs">Jobs</a></li>
                        </ul>
                    </div>
                    <div class="footer-column">
                        <h3>Support</h3>
                        <ul>
                            <li><a href="https://help.nexusmods.com">Help Center</a></li>
                            <li><a href="https://forums.nexusmods.com">Community</a></li>
                            <li><a href="https://www.nexusmods.com/about/terms">Terms of Service</a></li>
                            <li><a href="https://www.nexusmods.com/about/privacy">Privacy Policy</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2024 Nexus Mods. All rights reserved.</p>
                </div>
            </div>
        `;
        
        // Add our content to the body
        document.body.appendChild(header);
        document.body.appendChild(classicSearchPage);
        document.body.appendChild(footer);
        
        // Add additional CSS for header and footer
        GM_addStyle(`
            .nexus-header {
                background-color: #1a1a1a;
                padding: 1rem;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                position: relative;
                z-index: 1;
            }
            
            .header-container {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .logo img {
                height: 40px;
            }
            
            .main-nav ul {
                display: flex;
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .main-nav li {
                margin: 0 1rem;
            }
            
            .main-nav a {
                color: #d0d0d0;
                text-decoration: none;
                font-weight: bold;
                transition: color 0.2s ease;
            }
            
            .main-nav a:hover {
                color: #da8e35;
            }
            
            .user-controls {
                display: flex;
                gap: 1rem;
            }
            
            .login-button, .register-button {
                padding: 0.5rem 1rem;
                border-radius: 4px;
                text-decoration: none;
                font-weight: bold;
            }
            
            .login-button {
                background-color: transparent;
                border: 1px solid #da8e35;
                color: #da8e35;
            }
            
            .register-button {
                background-color: #da8e35;
                border: 1px solid #da8e35;
                color: #fff;
            }
            
            .nexus-footer {
                background-color: #1a1a1a;
                padding: 2rem 1rem;
                margin-top: 3rem;
                color: #a0a0a0;
                position: relative;
                z-index: 1;
            }
            
            .footer-container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .footer-links {
                display: flex;
                flex-wrap: wrap;
                gap: 2rem;
                margin-bottom: 2rem;
            }
            
            .footer-column h3 {
                color: #d0d0d0;
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }
            
            .footer-column ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-column li {
                margin-bottom: 0.5rem;
            }
            
            .footer-column a {
                color: #a0a0a0;
                text-decoration: none;
                transition: color 0.2s ease;
            }
            
            .footer-column a:hover {
                color: #da8e35;
            }
            
            .footer-bottom {
                border-top: 1px solid #333;
                padding-top: 1rem;
                text-align: center;
                font-size: 0.9rem;
            }
        `);
    }

    // Initialize the script
    function initializeScript() {
        // We'll completely rebuild the DOM, so we just need to wait for a minimal amount of page load
        
        // Check if we need to wait for the document to be in a ready state
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(replaceOriginalPage, 100); // Small delay to ensure page has finished basic loading
            });
        } else {
            // DOM already in interactive or complete state
            setTimeout(replaceOriginalPage, 100);
        }
    }

    // Start the script
    initializeScript();
    
    // Add a failsafe in case the script doesn't run in time
    setTimeout(function() {
        if (!document.getElementById('classic-search-container')) {
            console.log('Failsafe triggered - applying custom search page');
            replaceOriginalPage();
        }
    }, 2000);
})();