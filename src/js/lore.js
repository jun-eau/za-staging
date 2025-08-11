export function initLorePage() {
    let isMapInitialized = false;

    // --- Tabbed Interface Logic ---
    const tabsContainer = document.querySelector('.lore-tabs');
    if (tabsContainer) {
        // Determine the tab to show: saved tab or default to 'map-view'.
        const tabIdToShow = localStorage.getItem('loreLastTab') || 'map-view';

        // Apply 'active' to the determined tab and its content.
        const tabLinkToShow = document.querySelector(`.tab-link[data-tab="${tabIdToShow}"]`);
        const contentToShow = document.getElementById(tabIdToShow);
        if (tabLinkToShow) tabLinkToShow.classList.add('active');
        if (contentToShow) contentToShow.classList.add('active');

        // Check if the map is the active tab on load (either default or from storage) and initialize it
        const initialActiveContent = document.querySelector('.tab-content.active');
        if (initialActiveContent) {
            if (initialActiveContent.id === 'map-view' && !isMapInitialized) {
                initializeMap();
            }
            // Add 'show' class to make it visible with fade-in effect
            setTimeout(() => initialActiveContent.classList.add('show'), 10);
        }

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab-link');
            if (!clickedTab || clickedTab.classList.contains('active')) {
                return; // Do nothing if not a tab link or if already active
            }
            e.preventDefault();

            const targetTabContentId = clickedTab.dataset.tab;
            localStorage.setItem('loreLastTab', targetTabContentId); // Save selection

            // Initialize map if it's being shown for the first time
            if (targetTabContentId === 'map-view' && !isMapInitialized) {
                initializeMap();
            }

            const targetTabContent = document.getElementById(targetTabContentId);
            const currentActiveTab = tabsContainer.querySelector('.active');
            const currentActiveContent = document.querySelector('.tab-content.active');

            // Switch active state on tabs
            if (currentActiveTab) currentActiveTab.classList.remove('active');
            clickedTab.classList.add('active');

            // Animate content transition
            if (currentActiveContent && targetTabContent) {
                currentActiveContent.classList.remove('show');
                currentActiveContent.addEventListener('transitionend', function handler(event) {
                    if (event.propertyName !== 'opacity') return;
                    currentActiveContent.classList.remove('active');
                    targetTabContent.classList.add('active');
                    setTimeout(() => targetTabContent.classList.add('show'), 10);
                }, { once: true }); // Use { once: true } for cleaner event handling
            }
        });
    }


    const pixelsPerMonthVertical = 22; // Adjusted for better density
    let allGames = [];
    let minDate, maxDate;

    // --- DOM Elements ---
    const timeAxisContainer = document.getElementById('time-axis-container');
    const gameColumnsContainer = document.getElementById('game-columns-container');
    const liberlColumn = document.getElementById('liberl-arc-column').querySelector('.game-entries-area');
    const crossbellColumn = document.getElementById('crossbell-arc-column').querySelector('.game-entries-area');
    const ereboniaColumn = document.getElementById('erebonia-arc-column').querySelector('.game-entries-area');
    const calvardColumn = document.getElementById('calvard-arc-column').querySelector('.game-entries-area');
    
    let monthLinesOverlay; // Will be created and appended to gameColumnsContainer

    // --- Utility Functions ---
    function getDaysInMonth(year, month) { // month is 1-indexed
        return new Date(year, month, 0).getDate();
    }

    // formatDisplayDate and getDayOrdinal are no longer needed as the 'display' string from games.json is used directly.

    function parseTimelineDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            console.warn(`Invalid date string encountered: ${dateStr}`);
            return null;
        }
        return { year, month, day: parts[2] ? parseInt(parts[2], 10) : undefined };
    }

    function dateToTotalMonths(parsedDate) {
        if (!parsedDate) return Infinity;
        return parsedDate.year * 12 + parsedDate.month;
    }

    async function initializeTimeline() {
        try {
            const response = await fetch('src/data/games.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rawGames = await response.json();
            
            allGames = processGameData(rawGames);
            if (allGames.length === 0) {
                console.warn("No valid game data to display.");
                return;
            }

            calculateDateRange(); // This will now use timelinePeriods
            if (!minDate || !maxDate) {
                console.error("Date range not calculated, cannot render timeline.");
                return;
            }
            renderTimeAxis();
            renderGameEntries();

        } catch (error) {
            console.error("Error initializing timeline:", error);
        }
    }

    function processGameData(rawGames) {
        return rawGames.map(game => {
            // Games not intended for the timeline might not have timelinePeriods.
            // We only process periods if they exist.
            if (!game.timelinePeriods || !Array.isArray(game.timelinePeriods)) {
                // If it's a game that *should* have timeline data (e.g., it has a timelineColor)
                // but is missing timelinePeriods, it's an issue.
                // For now, we'll let it pass through and it simply won't render on the timeline.
                // Alternatively, one could log a warning here for games expected on the timeline.
                return { ...game }; // Keep game data, it just won't have parsed periods.
            }

            let parsedPeriods = game.timelinePeriods.map(period => {
                const periodStart = parseTimelineDate(period.start);
                const periodEnd = parseTimelineDate(period.end);

                if (!periodStart || !periodEnd) {
                    console.warn(`Invalid period dates for ${game.englishTitle} (Label: ${period.label || 'N/A'}, Display: ${period.display}). Skipping period.`);
                    return null;
                }
                if (dateToTotalMonths(periodStart) > dateToTotalMonths(periodEnd)) {
                    console.warn(`Period start date after end date for ${game.englishTitle} (Label: ${period.label || 'N/A'}, Display: ${period.display}). Skipping period.`);
                    return null;
                }
                // The `display` key is crucial and should exist as per new schema.
                if (typeof period.display !== 'string') {
                    console.warn(`Missing or invalid 'display' string for period in ${game.englishTitle} (Label: ${period.label || 'N/A'}). Skipping period.`);
                    return null;
                }
                return { ...period, startParsed: periodStart, endParsed: periodEnd };
            }).filter(p => p !== null);

            // If a game was intended for the timeline (had a timelinePeriods array)
            // but all its periods were invalid, it effectively has no timeline data.
            if (game.timelinePeriods.length > 0 && parsedPeriods.length === 0) {
                console.warn(`All timeline periods for ${game.englishTitle} were invalid. Game will not be rendered on timeline.`);
            }
            
            let timelineColor = game.timelineColor;
            // Validate color only if there are valid periods to render
            if (parsedPeriods.length > 0 && (!timelineColor || !/^#[0-9A-F]{6}$/i.test(timelineColor))) {
                console.warn(`Invalid or missing timelineColor for ${game.englishTitle} with valid periods. Using default.`);
                timelineColor = '#808080'; // Default gray
            }

            return { ...game, timelinePeriodsParsed: parsedPeriods, timelineColor };
        }).filter(game => game !== null); // Filter out any games that might have been explicitly nulled (though current logic doesn't do that at game level).
    }

    function calculateDateRange() {
        // Filter games that have at least one valid, parsed timeline period.
        const gamesWithTimeline = allGames.filter(game => game.timelinePeriodsParsed && game.timelinePeriodsParsed.length > 0);

        if (gamesWithTimeline.length === 0) {
            console.warn("No games with valid timeline periods found to calculate date range.");
            minDate = null;
            maxDate = null;
            return;
        }

        let minMonths = Infinity, maxMonths = -Infinity;

        gamesWithTimeline.forEach(game => {
            game.timelinePeriodsParsed.forEach(period => {
                // Ensure startParsed and endParsed exist on the period object
                if (period.startParsed && period.endParsed) {
                    minMonths = Math.min(minMonths, dateToTotalMonths(period.startParsed));
                    maxMonths = Math.max(maxMonths, dateToTotalMonths(period.endParsed));
                } else {
                    // This should not happen if processGameData filters correctly, but good for safety.
                    console.warn(`Period for ${game.englishTitle} (Label: ${period.label}) missing parsed dates during range calculation.`);
                }
            });
        });
        
        if (minMonths === Infinity || maxMonths === -Infinity) {
            console.warn("Could not determine min/max months from timeline periods. This might happen if all periods had issues.");
            minDate = null;
            maxDate = null;
            return;
        }

        // Convert total months back to year/month objects
        // Ensure calculation is correct for month (1-indexed)
        minDate = { year: Math.floor((minMonths - 1) / 12), month: ((minMonths - 1) % 12) + 1 };
        maxDate = { year: Math.floor((maxMonths - 1) / 12), month: ((maxMonths - 1) % 12) + 1 };


        // Apply padding
        let paddedMinMonth = minDate.month - 3;
        let paddedMinYear = minDate.year;
        if (paddedMinMonth <= 0) { paddedMinMonth += 12; paddedMinYear--; }
        minDate = { year: paddedMinYear, month: paddedMinMonth };

        let paddedMaxMonth = maxDate.month + 3;
        let paddedMaxYear = maxDate.year;
        if (paddedMaxMonth > 12) { paddedMaxMonth -= 12; paddedMaxYear++; }
        maxDate = { year: paddedMaxYear, month: paddedMaxMonth };
        // console.log("Timeline Range (Padded):", minDate, "to", maxDate); // Removed for production
    }

    function renderTimeAxis() {
        if (!minDate || !maxDate || !timeAxisContainer || !gameColumnsContainer) return;
        timeAxisContainer.innerHTML = ''; 
        
        if (monthLinesOverlay) monthLinesOverlay.remove();
        monthLinesOverlay = document.createElement('div');
        monthLinesOverlay.id = 'month-lines-overlay';
        gameColumnsContainer.insertBefore(monthLinesOverlay, gameColumnsContainer.firstChild);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labeledMonths = [2, 5, 8]; // Mar, Jun, Sep

        let currentYear = minDate.year, currentMonth = minDate.month, yOffset = 0;
        let firstYearRendered = true;

        while (currentYear < maxDate.year || (currentYear === maxDate.year && currentMonth <= maxDate.month)) {
            if (currentMonth === 1 || firstYearRendered) {
                // Only render year label if it's not S1201
                if (currentYear !== 1201) {
                    const yearLabel = document.createElement('div');
                    yearLabel.classList.add('year-label');
                    yearLabel.textContent = `S${currentYear}`;
                    // Move year labels up by half a step
                    yearLabel.style.top = `${yOffset - (firstYearRendered ? 0 : 8) - (0.5 * pixelsPerMonthVertical)}px`;
                    timeAxisContainer.appendChild(yearLabel);
                }
                firstYearRendered = false;
            }

            // Only render month label if it's one of the designated labeledMonths
            if (labeledMonths.includes(currentMonth - 1)) {
                const monthLabel = document.createElement('div');
                monthLabel.classList.add('month-label');
                monthLabel.textContent = monthNames[currentMonth - 1];
                // Adjust month labels to be centered in their month slot
                monthLabel.style.top = `${yOffset}px`;
                timeAxisContainer.appendChild(monthLabel);
            }
            
            const monthLine = document.createElement('div');
            monthLine.classList.add('month-line');
            if (currentMonth === 1) {
                monthLine.classList.add('month-line-year');
            }
            monthLine.style.top = `${yOffset}px`;
            monthLinesOverlay.appendChild(monthLine);

            yOffset += pixelsPerMonthVertical;
            currentMonth++;
            if (currentMonth > 12) { currentMonth = 1; currentYear++; firstYearRendered = true; }
        }
        
        const totalTimelineHeight = yOffset;
        [timeAxisContainer, liberlColumn, crossbellColumn, ereboniaColumn, calvardColumn, monthLinesOverlay].forEach(el => {
            if (el) el.style.height = `${totalTimelineHeight}px`;
        });
    }

    function renderGameEntries() {
        if (!allGames || allGames.length === 0 || !minDate) {
            console.warn("Cannot render game entries: missing data.");
            return;
        }
        [liberlColumn, crossbellColumn, ereboniaColumn, calvardColumn].forEach(col => { if (col) col.innerHTML = ''; });

        const minTotalMonths = dateToTotalMonths(minDate);

        allGames.forEach(game => {
            // Skip games that don't have timeline data (i.e., no parsed periods)
            if (!game.timelinePeriodsParsed || game.timelinePeriodsParsed.length === 0) {
                // console.log(`Skipping rendering for game without timeline periods: ${game.englishTitle}`);
                return;
            }

            let targetColumn;
            if (game.arc === "Liberl Arc") targetColumn = liberlColumn;
            else if (game.arc === "Crossbell Arc") targetColumn = crossbellColumn;
            else if (game.arc === "Erebonia Arc" || game.englishTitle === "Trails into Reverie") targetColumn = ereboniaColumn;
            else if (game.arc === "Calvard Arc") targetColumn = calvardColumn;
            else {
                console.warn(`Game "${game.englishTitle}" arc "${game.arc}" unassigned. Skipping rendering.`);
                return;
            }

            if (!targetColumn) {
                console.warn(`Target column not found for game "${game.englishTitle}". Skipping rendering.`);
                return;
            }

            // Loop through each period of the game
            game.timelinePeriodsParsed.forEach((period, periodIndex) => {
                const startDate = period.startParsed;
                const endDate = period.endParsed;

                // --- Calculate topPosition with day precision ---
                let topPosition = ((dateToTotalMonths(startDate) - minTotalMonths) * pixelsPerMonthVertical) - (2.5 * pixelsPerMonthVertical);
                if (startDate.day) {
                    const daysInStartMonth = getDaysInMonth(startDate.year, startDate.month);
                    const startDayProportion = (startDate.day - 1) / daysInStartMonth;
                    topPosition += startDayProportion * pixelsPerMonthVertical;
                }

                // --- Calculate entryHeight with day precision ---
                let entryHeight;
                const startYear = startDate.year, startMonth = startDate.month, startDay = startDate.day;
                const endYear = endDate.year, endMonth = endDate.month, endDay = endDate.day;

                if (startYear === endYear && startMonth === endMonth) {
                    const daysInMonth = getDaysInMonth(startYear, startMonth);
                    const daySpan = (endDay ? endDay : daysInMonth) - (startDay ? startDay : 1) + 1;
                    entryHeight = (daySpan / daysInMonth) * pixelsPerMonthVertical;
                } else {
                    let startMonthCoverage = 1.0;
                    if (startDay) {
                        const daysInStartMonth = getDaysInMonth(startYear, startMonth);
                        startMonthCoverage = (daysInStartMonth - startDay + 1) / daysInStartMonth;
                    }
                    let endMonthCoverage = 1.0;
                    if (endDay) {
                        const daysInEndMonth = getDaysInMonth(endYear, endMonth);
                        endMonthCoverage = endDay / daysInEndMonth;
                    }
                    const startTotalMonthsValue = startYear * 12 + startMonth;
                    const endTotalMonthsValue = endYear * 12 + endMonth;
                    let numberOfFullMiddleMonths = (endTotalMonthsValue - startTotalMonthsValue - 1);
                    numberOfFullMiddleMonths = Math.max(0, numberOfFullMiddleMonths);
                    const fractionalMonths = startMonthCoverage + endMonthCoverage + numberOfFullMiddleMonths;
                    entryHeight = fractionalMonths * pixelsPerMonthVertical;
                }

                if (entryHeight > 0 && entryHeight < 1) entryHeight = 1; // Min 1px height

                // Ensure height is at least a small visible amount for very short periods (e.g., 1-day)
                // For example, 1/30th of a month's pixel height for a single day.
                // This ensures even single day events are clickable/visible.
                const minPixelHeightForDay = Math.max(1, pixelsPerMonthVertical / 30);
                entryHeight = Math.max(entryHeight, minPixelHeightForDay);


                if (entryHeight <= 0) {
                    console.warn(`Invalid height for ${game.englishTitle} - ${period.label || `Period ${periodIndex+1}`}. Calculated Height: ${entryHeight}. Skipping period.`);
                    return; // Skip this period
                }

                const gameEntryDiv = document.createElement('div');
                gameEntryDiv.className = 'game-entry-box';
                gameEntryDiv.style.backgroundColor = game.timelineColor;
                gameEntryDiv.style.color = game.englishTitle === "Trails in the Sky SC" || game.englishTitle === "Trails through Daybreak" ? '#000000' : '#FFFFFF';
                gameEntryDiv.style.top = `${topPosition + 2}px`; // -1 for border adjustment, +3 for shift
                gameEntryDiv.style.height = `${entryHeight}px`;
                gameEntryDiv.style.width = '90%';
                gameEntryDiv.style.left = '5%';
                // Add a data attribute to identify boxes for a game, useful for positioning "info-below" text
                gameEntryDiv.dataset.gameTitle = game.englishTitle;
                gameEntryDiv.dataset.periodIndex = periodIndex; // Store period index for targeted text insertion

                // --- Text Display Logic ---
                const isSky3rd = game.englishTitle === "Trails in the Sky the 3rd";
                const isCSII = game.englishTitle === "Trails of Cold Steel II";
                const isReverie = game.englishTitle === "Trails into Reverie";
                const isCSIV = game.englishTitle === "Trails of Cold Steel IV"; // CSIV remains as is

                const isMultiPeriodSpecial = isSky3rd || isCSII || isReverie;

                if (isMultiPeriodSpecial) {
                    gameEntryDiv.classList.add('special-info-below'); // Ensures no text inside these boxes

                    // Create text container for this specific period box, to be placed below it
                    const periodTextContainer = document.createElement('div');
                    periodTextContainer.className = 'game-info-below-text-container individual-period-text';
                    periodTextContainer.style.color = '#FFFFFF'; // Assuming default, adjust if needed
                    periodTextContainer.style.textAlign = 'center';
                    periodTextContainer.style.position = 'absolute';
                    periodTextContainer.style.left = '5%'; // Match box alignment
                    periodTextContainer.style.width = '90%'; // Match box width

                    let textContent = "";
                    if (period.isMain) {
                        periodTextContainer.classList.add('is-main-period-text');
                        const titleEl = document.createElement('div');
                        titleEl.className = 'game-entry-title';
                        titleEl.textContent = game.englishTitle;
                        periodTextContainer.appendChild(titleEl);
                    }

                    const periodDetailEl = document.createElement('div');
                    periodDetailEl.className = 'game-entry-duration'; // Use existing class for similar styling

                    let lineText = "";
                    if (period.label) {
                        lineText += `<strong>${period.label}:</strong> `;
                    }
                    lineText += period.display;
                    periodDetailEl.innerHTML = lineText;
                    periodTextContainer.appendChild(periodDetailEl);

                    // Adjust spacing based on whether it's a main display or not
                    const spacing = period.isMain ? 2 : 1; // 2px for main (tightened), 1px for others
                    periodTextContainer.style.top = `${topPosition + entryHeight + spacing + 3}px`;

                    targetColumn.appendChild(periodTextContainer); // Add text container to the column

                } else if (isCSIV) {
                    // CSIV: Existing special placement logic (single text block below all its boxes)
                    // This will be handled after the loop by the existing CSIV logic block
                    gameEntryDiv.classList.add('special-info-below');
                } else {
                    // Default behavior for single-period games (or games not matching above conditions)
                    // Text (title + first period's display string) inside the first period's box.
                    // Subsequent period boxes for these games (if any, though typically not for default) remain empty.
                    if (periodIndex === 0) { // Only for the first box of such games
                        const titleEl = document.createElement('div');
                        titleEl.className = 'game-entry-title';
                        titleEl.textContent = game.englishTitle;
                        gameEntryDiv.appendChild(titleEl);

                        const dateDisplayEl = document.createElement('div');
                        dateDisplayEl.className = 'game-entry-duration';
                        dateDisplayEl.textContent = period.display; // Uses the period's display string
                        gameEntryDiv.appendChild(dateDisplayEl);

                        if (entryHeight < (pixelsPerMonthVertical * 0.8)) {
                            titleEl.style.display = 'none';
                            dateDisplayEl.style.display = 'none';
                        } else if (entryHeight < (pixelsPerMonthVertical * 1.8)) {
                            dateDisplayEl.style.display = 'none';
                        }
                    }
                }

                // Tooltip for ALL period boxes
                // The tooltip should use the period's specific start/end for precision,
                // potentially formatted differently from the main 'display' string if needed.
                // Tooltip text construction for custom tooltips (if implemented later) or for clarity:
                // The main display information now comes directly from period.display.
                // Example: game.englishTitle + (period.label ? ` (${period.label})` : "") + "\n" + period.display
                // gameEntryDiv.setAttribute('title', SomeTooltipText); // Browser default tooltips are disabled.

                targetColumn.appendChild(gameEntryDiv);
            }); // End of period loop

            // --- Special Placement Text Rendering (Below the Box) FOR CSIV ONLY ---
            // This runs once per game *after* all its period boxes have been created and added to the DOM.
            // This section is now ONLY for Trails of Cold Steel IV.
            // Sky 3rd, CSII, and Reverie have their text rendered individually per period box.
            if (game.englishTitle === "Trails of Cold Steel IV") {
                const infoBelowContainer = document.createElement('div');
                infoBelowContainer.className = 'game-info-below-text-container'; // Keep existing class for potential shared styles
                infoBelowContainer.classList.add('is-main-period-text'); // Add class for spacing refinement
                infoBelowContainer.style.color = '#FFFFFF'; // Default color
                infoBelowContainer.style.textAlign = 'center';

                const titleEl = document.createElement('div');
                titleEl.className = 'game-entry-title';
                titleEl.textContent = game.englishTitle;
                infoBelowContainer.appendChild(titleEl);

                // For CSIV, it's a single period game effectively for this display logic,
                // so we just show its main display string.
                // If CSIV were to have multiple periods needing listing here, this would need game.timelinePeriodsParsed.forEach
                if (game.timelinePeriodsParsed.length > 0) {
                    const periodDetailEl = document.createElement('div');
                    periodDetailEl.className = 'game-entry-duration'; // Re-use class
                    // CSIV only has one period defined in games.json for timeline purposes.
                    // If it had more, and we wanted all listed like old Sky3rd/Reverie, we'd loop.
                    // For now, assuming first period's display is representative for CSIV's single block.
                    let lineText = game.timelinePeriodsParsed[0].display;
                    if (game.timelinePeriodsParsed[0].label) { // Should not happen for CSIV as it's not multi-period in the data
                        lineText = `<strong>${game.timelinePeriodsParsed[0].label}:</strong> ${lineText}`;
                    }
                    periodDetailEl.innerHTML = lineText;
                    infoBelowContainer.appendChild(periodDetailEl);
                }


                // Position the infoBelowContainer below the *lowest* rendered box for this game (CSIV).
                let lowestBoxBottom = 0;
                const gameBoxesInColumn = targetColumn.querySelectorAll(`.game-entry-box[data-game-title="${game.englishTitle}"]`);

                if (gameBoxesInColumn.length > 0) {
                    gameBoxesInColumn.forEach(box => { // Should only be one box for CSIV currently
                        const boxBottom = box.offsetTop + box.offsetHeight;
                        if (boxBottom > lowestBoxBottom) {
                            lowestBoxBottom = boxBottom;
                        }
                    });
                    infoBelowContainer.style.position = 'absolute';
                    infoBelowContainer.style.top = `${lowestBoxBottom + 2}px`; // Tightened spacing to 2px
                    infoBelowContainer.style.left = '5%';
                    infoBelowContainer.style.width = '90%';
                } else {
                     console.warn(`No boxes found for game "${game.englishTitle}" to position its 'infoBelowContainer'.`);
                }
                targetColumn.appendChild(infoBelowContainer);
            }
        }); // End of game loop
    }

    initializeTimeline();

    // --- Map Logic & Data ---
    let mapRegionsData = [];
    let mapGamesData = [];

    /**
     * Renders the HTML for the "Games View" of the infobox.
     * @param {object} region The region data object.
     * @returns {string} The HTML string for the games view.
     */
    function renderGamesView(region) {
        const gameIds = region.games || [];
        const gamesInRegion = mapGamesData.filter(game => gameIds.includes(game.id));

        const gamesGridHtml = gamesInRegion.length > 0
            ? gamesInRegion.map(game => `
                <img src="assets/grid/${game.assetName}.jpg" alt="${game.englishTitle}" title="${game.englishTitle}" class="map-infobox-game-art">
            `).join('')
            : '<p style="font-size: 0.8em; color: #999;">No specific games are primarily set in this region.</p>';

        return `
            <div class="map-infobox-games-view">
                <div class="map-infobox-content">
                    <div class="map-infobox-games-grid">${gamesGridHtml}</div>
                </div>
                <div class="map-infobox-footer">
                    <button class="map-infobox-toggle-btn" data-target-view="lore">View Lore Details</button>
                </div>
            </div>
        `;
    }

    /**
     * Renders the HTML for the "Lore View" of the infobox.
     * @param {object} region The region data object.
     * @returns {string} The HTML string for the lore view.
     */
    function renderLoreView(region) {
        const featuredInGames = mapGamesData.filter(game => (region.featuredIn || []).includes(game.id));
        let featuredInHtml = '';

        if (featuredInGames.length > 0) {
            const featuredInTitle = region.regionType === 'major' ? "Also Featured In" : "Featured In";
            const featuredInList = `<ul>${featuredInGames.map(game => `<li>${game.englishTitle}</li>`).join('')}</ul>`;
            featuredInHtml = `
                <div class="map-infobox-lore-section">
                    <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">${featuredInTitle}</h4>
                    ${featuredInList}
                </div>
            `;
        }

        let footerHtml = '';
        // Only show the "back to game art" button for major regions, as they have a game view.
        if (region.regionType === 'major') {
            footerHtml = `
                <div class="map-infobox-footer">
                    <button class="map-infobox-toggle-btn" data-target-view="games">Show Game Art</button>
                </div>
            `;
        }

        return `
            <div class="map-infobox-lore-view">
                <div class="map-infobox-content">
                    <div class="map-infobox-lore-section">
                        <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">Description</h4>
                        <p>${region.description}</p>
                    </div>
                    <div class="map-infobox-lore-section">
                        <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">History</h4>
                        <p>${region.history}</p>
                    </div>
                    ${featuredInHtml}
                </div>
                ${footerHtml}
            </div>
        `;
    }

    /**
     * Handles the animated transition between infobox views.
     * @param {HTMLElement} contentWrapper The element containing the two views.
     */
    function switchView(contentWrapper) {
        const gamesView = contentWrapper.querySelector('.map-infobox-games-view');
        const loreView = contentWrapper.querySelector('.map-infobox-lore-view');

        // Determine which view is currently visible and which is hidden.
        const isGamesViewVisible = gamesView.style.position !== 'absolute';
        const viewToHide = isGamesViewVisible ? gamesView : loreView;
        const viewToShow = isGamesViewVisible ? loreView : gamesView;

        // 1. Prepare the view-to-show to measure its height.
        // It's moved off-screen, made visible, but kept transparent.
        viewToShow.style.visibility = 'hidden';
        viewToShow.style.display = 'block'; // Make it part of the layout
        const targetHeight = viewToShow.scrollHeight;
        viewToShow.style.display = ''; // Revert display
        viewToShow.style.visibility = ''; // Revert visibility

        // 2. Set the content wrapper's height to the new target height.
        // The CSS transition on the wrapper will handle the smooth height change.
        contentWrapper.style.height = `${targetHeight}px`;

        // 3. Simultaneously fade out the old view.
        viewToHide.classList.add('view-fade-out');
        viewToHide.classList.remove('view-fade-in');

        // 4. After the fade-out is complete, switch the views' positions.
        viewToHide.addEventListener('transitionend', function onFadeOut() {
            viewToHide.style.display = 'none'; // Hide it completely
            viewToHide.style.position = 'absolute'; // Take it out of layout flow
            viewToHide.classList.remove('view-fade-out');

            viewToShow.style.display = 'block';
            viewToShow.style.position = 'relative'; // Put it back in layout flow
            
            // 5. Fade in the new view.
            // A small delay ensures the browser has processed the display change.
            requestAnimationFrame(() => {
                viewToShow.classList.add('view-fade-in');
                viewToShow.classList.remove('view-fade-out');
            });
        }, { once: true });
    }

    /**
     * Creates and displays the infobox, sets up views, and attaches event listeners.
     * @param {string} regionId The ID of the clicked region.
     * @param {number} clickX The horizontal coordinate of the click event.
     * @param {number} clickY The vertical coordinate of the click event.
     */
    function createInfobox(regionId, clickX, clickY) {
        const region = mapRegionsData.find(r => r.id === regionId);
        if (!region) return;

        // Create a new infobox element for each click.
        const infoboxEl = document.createElement('div');
        infoboxEl.className = 'map-infobox';
        infoboxEl.dataset.regionId = regionId; // Tag the infobox with its region ID

        // Dynamically set width for the games view if applicable
        if (region.regionType === 'major' && region.games && region.games.length > 0) {
            const gameArtWidth = 80; // as per .map-infobox-games-grid styles
            const gap = 8;
            const contentPadding = 2 * 12; // .map-infobox-content has 12px padding

            const gamesCount = region.games.length;
            const gridWidth = (gamesCount * gameArtWidth) + ((gamesCount - 1) * gap);
            const totalWidth = gridWidth + contentPadding;

            infoboxEl.style.width = `${totalWidth}px`;
        }

        infoboxEl.innerHTML = `
            <div class="map-infobox-header">
                <img src="assets/logo/${region.emblemAsset}" alt="${region.name} Emblem" class="map-infobox-emblem">
                <div class="map-infobox-title-section">
                    <h3>${region.name}</h3>
                    <p>${region.government}</p>
                </div>
                <div class="map-infobox-stats">
                    <strong>Capital:</strong><br>${region.capital}
                </div>
            </div>
            <div class="map-infobox-content-wrapper"></div>
        `;

        const contentWrapper = infoboxEl.querySelector('.map-infobox-content-wrapper');

        // Render and append both views
        contentWrapper.innerHTML = renderGamesView(region) + renderLoreView(region);

        const gamesView = contentWrapper.querySelector('.map-infobox-games-view');
        const loreView = contentWrapper.querySelector('.map-infobox-lore-view');

        // Set initial view state and calculate initial height
        const isMajorRegion = region.regionType === 'major';
        const initialView = isMajorRegion ? gamesView : loreView;
        const hiddenView = isMajorRegion ? loreView : gamesView;

        // Position the hidden view absolutely so it doesn't affect layout
        hiddenView.style.display = 'none';
        hiddenView.style.position = 'absolute';

        // Make the initial view visible so we can measure it
        initialView.style.display = 'block';
        initialView.style.position = 'relative';
        
        // Set the wrapper to the initial view's height
        contentWrapper.style.height = `${initialView.scrollHeight}px`;

        // Fade in the initial view
        requestAnimationFrame(() => {
            initialView.classList.add('view-fade-in');
        });

        // Add event listeners for view switching
        infoboxEl.querySelectorAll('.map-infobox-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => switchView(contentWrapper));
        });

        // Append to the container and start positioning and animation
        document.getElementById('map-view').appendChild(infoboxEl);
        positionInfobox(infoboxEl, clickX, clickY);
    }

    /**
     * Positions the infobox near the click coordinates, ensuring it stays within the viewport.
     * @param {HTMLElement} infoboxEl The infobox element to position.
     * @param {number} clickX The horizontal coordinate of the click event.
     * @param {number} clickY The vertical coordinate of the click event.
     */
    function positionInfobox(infoboxEl, clickX, clickY) {
        const offsetX = 20;
        const offsetY = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // The infobox is now invisible via CSS (opacity: 0, visibility: hidden)
        // so we don't need to juggle display properties to measure it.
        const rect = infoboxEl.getBoundingClientRect();

        // Determine final position
        let top = clickY + offsetY;
        let left = clickX + offsetX;

        if (left + rect.width > viewportWidth) {
            left = clickX - rect.width - offsetX;
        }
        if (top + rect.height > viewportHeight) {
            top = clickY - rect.height - offsetY;
        }

        // Final position assignment
        infoboxEl.style.left = `${Math.max(5, left)}px`;
        infoboxEl.style.top = `${Math.max(5, top)}px`;

        // Make it visible with a guaranteed animation frame.
        // Using a double requestAnimationFrame is a robust way to ensure the browser
        // has processed the element's initial (invisible) state before the 'active'
        // class is added, which triggers the transition.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                infoboxEl.classList.add('active');
            });
        });
    }

    function initializeMap() {
        if (isMapInitialized) return;

        const svgNS = "http://www.w3.org/2000/svg";
        const mapOverlay = document.getElementById('map-overlay');

        if (!mapOverlay) {
            console.error("Map overlay SVG not found!");
            return;
        }

        /**
         * Converts a hex color string to an rgba string.
         * @param {string} hex The hex color code (e.g., "#RRGGBB").
         * @param {number} alpha The alpha transparency value (0 to 1).
         * @returns {string} The rgba color string.
         */
        function hexToRgba(hex, alpha = 1) {
            hex = hex.replace(/^#/, '');
            let bigint = parseInt(hex, 16);
            let r = (bigint >> 16) & 255;
            let g = (bigint >> 8) & 255;
            let b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // Fetch both regions and games data
        Promise.all([
            fetch('src/data/regions.json').then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            }),
            fetch('src/data/games.json').then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
        ])
        .then(([regions, games]) => {
            mapRegionsData = regions;
            mapGamesData = games;

            const maskGroup = mapOverlay.querySelector('#regions-mask g');
            if (!maskGroup) {
                console.error("SVG mask group for regions not found!");
                return;
            }

            // Create region paths and append them
            mapRegionsData.forEach(region => {
                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', region.svgPathData);
                path.setAttribute('class', 'region-path');
                path.setAttribute('id', `region-${region.id}`);
                path.dataset.regionId = region.id;

                if (region.baseColor) {
                    const highlightColor = hexToRgba(region.baseColor, 0.7);
                    path.style.setProperty('--region-highlight-color', highlightColor);
                }
                mapOverlay.appendChild(path);

                const maskPath = document.createElementNS(svgNS, 'path');
                maskPath.setAttribute('d', region.svgPathData);
                maskPath.setAttribute('fill', 'black');
                maskGroup.appendChild(maskPath);
            });

            // Use event delegation for a single click handler on the overlay
            mapOverlay.addEventListener('click', (e) => {
                const clickedPath = e.target.closest('.region-path');
                const clickedRegionId = clickedPath ? clickedPath.dataset.regionId : null;

                // Find the currently open infobox (if any)
                const openInfobox = document.querySelector('.map-infobox.active');
                const openRegionId = openInfobox ? openInfobox.dataset.regionId : null;

                // Always close what's open.
                if (openInfobox) {
                    openInfobox.classList.remove('active');
                    openInfobox.addEventListener('transitionend', () => openInfobox.remove(), { once: true });
                }

                // Open a new box ONLY if a region was clicked AND it's a DIFFERENT region than the one that was just closed.
                if (clickedRegionId && clickedRegionId !== openRegionId) {
                    createInfobox(clickedRegionId, e.clientX, e.clientY);
                }
            });

            isMapInitialized = true;
        })
        .catch(error => {
            console.error("Error loading or processing map/game data:", error);
        });
    }
}
