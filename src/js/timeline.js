export function initTimelinePage() {
    const pixelsPerMonthVertical = 22; // Adjusted for better density
    let allGames = [];
    let minDate, maxDate;

    // --- Utility ---
    const isMobile = window.innerWidth <= 900;

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

            calculateDateRange();
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
            if (!game.timelinePeriods || !Array.isArray(game.timelinePeriods)) {
                return { ...game };
            }

            let parsedPeriods = game.timelinePeriods.map(period => {
                const periodStart = parseTimelineDate(period.start);
                const periodEnd = parseTimelineDate(period.end);

                if (!periodStart || !periodEnd || dateToTotalMonths(periodStart) > dateToTotalMonths(periodEnd) || typeof period.display !== 'string') {
                    console.warn(`Invalid period data for ${game.englishTitle}. Skipping period.`);
                    return null;
                }
                return { ...period, startParsed: periodStart, endParsed: periodEnd };
            }).filter(p => p !== null);

            if (game.timelinePeriods.length > 0 && parsedPeriods.length === 0) {
                console.warn(`All timeline periods for ${game.englishTitle} were invalid.`);
            }
            
            let timelineColor = game.timelineColor;
            if (parsedPeriods.length > 0 && (!timelineColor || !/^#[0-9A-F]{6}$/i.test(timelineColor))) {
                console.warn(`Invalid or missing timelineColor for ${game.englishTitle}. Using default.`);
                timelineColor = '#808080';
            }

            return { ...game, timelinePeriodsParsed: parsedPeriods, timelineColor };
        }).filter(game => game !== null);
    }

    function calculateDateRange() {
        const gamesWithTimeline = allGames.filter(game => game.timelinePeriodsParsed && game.timelinePeriodsParsed.length > 0);
        if (gamesWithTimeline.length === 0) return;

        let minMonths = Infinity, maxMonths = -Infinity;

        gamesWithTimeline.forEach(game => {
            game.timelinePeriodsParsed.forEach(period => {
                minMonths = Math.min(minMonths, dateToTotalMonths(period.startParsed));
                maxMonths = Math.max(maxMonths, dateToTotalMonths(period.endParsed));
            });
        });
        
        if (minMonths === Infinity) return;

        minDate = { year: Math.floor((minMonths - 1) / 12), month: ((minMonths - 1) % 12) + 1 };
        maxDate = { year: Math.floor((maxMonths - 1) / 12), month: ((maxMonths - 1) % 12) + 1 };

        let paddedMinMonth = minDate.month - 3;
        let paddedMinYear = minDate.year;
        if (paddedMinMonth <= 0) { paddedMinMonth += 12; paddedMinYear--; }
        minDate = { year: paddedMinYear, month: paddedMinMonth };

        let paddedMaxMonth = maxDate.month + 3;
        let paddedMaxYear = maxDate.year;
        if (paddedMaxMonth > 12) { paddedMaxMonth -= 12; paddedMaxYear++; }
        maxDate = { year: paddedMaxYear, month: paddedMaxMonth };
    }

    function renderTimeAxis() {
        if (!minDate || !maxDate || !timeAxisContainer || !gameColumnsContainer) return;
        timeAxisContainer.innerHTML = ''; 
        
        if (!isMobile) {
            if (monthLinesOverlay) monthLinesOverlay.remove();
            monthLinesOverlay = document.createElement('div');
            monthLinesOverlay.id = 'month-lines-overlay';
            gameColumnsContainer.insertBefore(monthLinesOverlay, gameColumnsContainer.firstChild);
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labeledMonths = [2, 5, 8];

        let currentYear = minDate.year, currentMonth = minDate.month, yOffset = 0;
        let firstYearRendered = true;

        while (currentYear < maxDate.year || (currentYear === maxDate.year && currentMonth <= maxDate.month)) {
            if (currentMonth === 1 || firstYearRendered) {
                if (currentYear !== 1201) {
                    const yearLabel = document.createElement('div');
                    yearLabel.classList.add('year-label');
                    yearLabel.textContent = `S${currentYear}`;
                    yearLabel.style.top = `${yOffset - (firstYearRendered ? 0 : 8) - (0.5 * pixelsPerMonthVertical)}px`;
                    timeAxisContainer.appendChild(yearLabel);
                }
                firstYearRendered = false;
            }

            if (labeledMonths.includes(currentMonth - 1)) {
                const monthLabel = document.createElement('div');
                monthLabel.classList.add('month-label');
                monthLabel.textContent = monthNames[currentMonth - 1];
                monthLabel.style.top = `${yOffset}px`;
                timeAxisContainer.appendChild(monthLabel);
            }
            
            if (!isMobile) {
                const monthLine = document.createElement('div');
                monthLine.classList.add('month-line');
                if (currentMonth === 1) monthLine.classList.add('month-line-year');
                monthLine.style.top = `${yOffset}px`;
                monthLinesOverlay.appendChild(monthLine);
            }

            yOffset += pixelsPerMonthVertical;
            currentMonth++;
            if (currentMonth > 12) { currentMonth = 1; currentYear++; firstYearRendered = true; }
        }
        
        if (!isMobile) {
            const totalTimelineHeight = yOffset;
            [timeAxisContainer, liberlColumn, crossbellColumn, ereboniaColumn, calvardColumn, monthLinesOverlay].forEach(el => {
                if (el) el.style.height = `${totalTimelineHeight}px`;
            });
        }
    }

    function renderGameEntries() {
        if (!allGames || allGames.length === 0 || !minDate) return;
        [liberlColumn, crossbellColumn, ereboniaColumn, calvardColumn].forEach(col => { if (col) col.innerHTML = ''; });

        const minTotalMonths = dateToTotalMonths(minDate);

        allGames.forEach(game => {
            if (!game.timelinePeriodsParsed || game.timelinePeriodsParsed.length === 0) return;

            let targetColumn;
            if (game.arc === "Liberl Arc") targetColumn = liberlColumn;
            else if (game.arc === "Crossbell Arc") targetColumn = crossbellColumn;
            else if (game.arc === "Erebonia Arc" || game.englishTitle === "Trails into Reverie") targetColumn = ereboniaColumn;
            else if (game.arc === "Calvard Arc") targetColumn = calvardColumn;
            else return;

            if (!targetColumn) return;

            let csivCalculatedLowestBottom = 0;

            game.timelinePeriodsParsed.forEach((period, periodIndex) => {
                const startDate = period.startParsed;
                const endDate = period.endParsed;

                let topPosition = ((dateToTotalMonths(startDate) - minTotalMonths) * pixelsPerMonthVertical) - (2.5 * pixelsPerMonthVertical);
                if (startDate.day) {
                    topPosition += ((startDate.day - 1) / getDaysInMonth(startDate.year, startDate.month)) * pixelsPerMonthVertical;
                }

                let entryHeight;
                if (startDate.year === endDate.year && startDate.month === endDate.month) {
                    const daysInMonth = getDaysInMonth(startDate.year, startDate.month);
                    const daySpan = (endDate.day || daysInMonth) - (startDate.day || 1) + 1;
                    entryHeight = (daySpan / daysInMonth) * pixelsPerMonthVertical;
                } else {
                    let startMonthCoverage = startDate.day ? (getDaysInMonth(startDate.year, startDate.month) - startDate.day + 1) / getDaysInMonth(startDate.year, startDate.month) : 1.0;
                    let endMonthCoverage = endDate.day ? endDate.day / getDaysInMonth(endDate.year, endDate.month) : 1.0;
                    let numberOfFullMiddleMonths = Math.max(0, (endDate.year * 12 + endDate.month) - (startDate.year * 12 + startDate.month) - 1);
                    entryHeight = (startMonthCoverage + endMonthCoverage + numberOfFullMiddleMonths) * pixelsPerMonthVertical;
                }
                entryHeight = Math.max(entryHeight, Math.max(1, pixelsPerMonthVertical / 30));
                if (entryHeight <= 0) return;

                if (game.englishTitle === "Trails of Cold Steel IV") {
                    const calculatedBoxBottom = topPosition + 2 + entryHeight;
                    if (calculatedBoxBottom > csivCalculatedLowestBottom) {
                        csivCalculatedLowestBottom = calculatedBoxBottom;
                    }
                }

                const gameEntryDiv = document.createElement('div');
                gameEntryDiv.className = 'game-entry-box';
                gameEntryDiv.style.backgroundColor = game.timelineColor;
                gameEntryDiv.style.color = game.englishTitle === "Trails in the Sky SC" || game.englishTitle === "Trails through Daybreak" ? '#000000' : '#FFFFFF';
                gameEntryDiv.dataset.gameTitle = game.englishTitle;
                gameEntryDiv.dataset.periodIndex = periodIndex;

                if (!isMobile) {
                    gameEntryDiv.style.top = `${topPosition + 2}px`;
                    gameEntryDiv.style.height = `${entryHeight}px`;
                    gameEntryDiv.style.width = '90%';
                    gameEntryDiv.style.left = '5%';
                }

                const isSky3rd = game.englishTitle === "Trails in the Sky the 3rd";
                const isCSII = game.englishTitle === "Trails of Cold Steel II";
                const isReverie = game.englishTitle === "Trails into Reverie";
                const isCSIV = game.englishTitle === "Trails of Cold Steel IV";
                const isMultiPeriodSpecial = isSky3rd || isCSII || isReverie;

                if (isMultiPeriodSpecial) {
                    gameEntryDiv.classList.add('special-info-below');
                    const periodTextContainer = document.createElement('div');
                    periodTextContainer.className = 'game-info-below-text-container individual-period-text';
                    if (period.isMain) periodTextContainer.classList.add('is-main-period-text');

                    let contentHTML = '';
                    if (period.isMain) contentHTML += `<div class="game-entry-title">${game.englishTitle}</div>`;
                    contentHTML += `<div class="game-entry-duration"><strong>${period.label || ''}:</strong> ${period.display}</div>`;
                    periodTextContainer.innerHTML = contentHTML;

                    if (!isMobile) {
                        const spacing = period.isMain ? 2 : 1;
                        periodTextContainer.style.top = `${topPosition + entryHeight + spacing + 3}px`;
                    }
                    targetColumn.appendChild(periodTextContainer);
                } else if (isCSIV) {
                    gameEntryDiv.classList.add('special-info-below');
                } else {
                    if (periodIndex === 0) {
                        const titleEl = document.createElement('div');
                        titleEl.className = 'game-entry-title';
                        titleEl.textContent = game.englishTitle;
                        gameEntryDiv.appendChild(titleEl);

                        const dateDisplayEl = document.createElement('div');
                        dateDisplayEl.className = 'game-entry-duration';
                        dateDisplayEl.textContent = period.display;
                        gameEntryDiv.appendChild(dateDisplayEl);

                        if (!isMobile) {
                            if (entryHeight < (pixelsPerMonthVertical * 0.8)) {
                                titleEl.style.display = 'none';
                                dateDisplayEl.style.display = 'none';
                            } else if (entryHeight < (pixelsPerMonthVertical * 1.8)) {
                                dateDisplayEl.style.display = 'none';
                            }
                        }
                    }
                }
                targetColumn.appendChild(gameEntryDiv);
            });

            if (game.englishTitle === "Trails of Cold Steel IV") {
                const infoBelowContainer = document.createElement('div');
                infoBelowContainer.className = 'game-info-below-text-container is-main-period-text';

                let contentHTML = `<div class="game-entry-title">${game.englishTitle}</div>`;
                if (game.timelinePeriodsParsed.length > 0) {
                    const firstPeriod = game.timelinePeriodsParsed[0];
                    contentHTML += `<div class="game-entry-duration"><strong>${firstPeriod.label || ''}:</strong> ${firstPeriod.display}</div>`;
                }
                infoBelowContainer.innerHTML = contentHTML;

                if (!isMobile && csivCalculatedLowestBottom > 0) {
                    infoBelowContainer.style.top = `${csivCalculatedLowestBottom + 2}px`;
                }
                targetColumn.appendChild(infoBelowContainer);
            }
        });
    }

    initializeTimeline();
}