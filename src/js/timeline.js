export function initTimelinePage() {
    const container = document.getElementById('vis-timeline');
    if (!container) {
        console.error('Timeline container #vis-timeline not found!');
        return;
    }

    /**
     * Parses a date string from the format "YYYY-MM-DD" or "YYYY-MM".
     * @param {string} dateString - The date string to parse.
     * @returns {Date|null} - A Date object or null if the format is invalid.
     */
    function parseCustomDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('-');
        if (parts.length < 2 || parts.length > 3) {
            console.warn(`Invalid date format: ${dateString}`);
            return null;
        }
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
        const day = parts.length === 3 ? parseInt(parts[2], 10) : 1;

        if (isNaN(year) || isNaN(month)) {
            console.warn(`Could not parse date: ${dateString}`);
            return null;
        }
        return new Date(year, month, day);
    }

    /**
     * Determines if text should be black or white based on the background color's brightness.
     * @param {string} hexColor - The background color in hex format (e.g., "#RRGGBB").
     * @returns {string} - The recommended text color, either '#000000' or '#FFFFFF'.
     */
    function getTextColorForBackground(hexColor) {
        if (!hexColor || hexColor.length < 7) return '#FFFFFF'; // Default to white for invalid colors
        try {
            const r = parseInt(hexColor.substr(1, 2), 16);
            const g = parseInt(hexColor.substr(3, 2), 16);
            const b = parseInt(hexColor.substr(5, 2), 16);
            // Calculate YIQ value to determine color brightness
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? '#000000' : '#FFFFFF';
        } catch (e) {
            console.warn(`Could not parse color: ${hexColor}. Defaulting to white text.`, e);
            return '#FFFFFF';
        }
    }

    async function drawTimeline() {
        try {
            const response = await fetch('src/data/games.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const games = await response.json();

            // Use a predefined order for story arcs to ensure logical grouping
            const arcOrder = ["Liberl Arc", "Crossbell Arc", "Erebonia Arc", "Epilogue", "Calvard Arc"];
            const arcMap = new Map(arcOrder.map((arc, index) => [arc, index]));

            // Create vis.js groups from the predefined arc order
            const groups = new vis.DataSet(
                arcOrder.map((arc, index) => ({
                    id: index,
                    content: arc,
                    className: 'vis-group-custom'
                }))
            );

            const items = new vis.DataSet();
            let minDate = null;
            let maxDate = null;

            games.forEach(game => {
                // Skip games that don't have timeline data
                if (!game.timelinePeriods || game.timelinePeriods.length === 0) return;

                const groupId = arcMap.get(game.arc);
                // Skip games with an unrecognized arc
                if (groupId === undefined) return;

                game.timelinePeriods.forEach(period => {
                    const startDate = parseCustomDate(period.start);
                    if (!startDate) return; // Skip if start date is invalid

                    // If end date is missing or invalid, it's a single-day event
                    let endDate = parseCustomDate(period.end || period.start);
                    if (!endDate) return;

                    // For 'range' items, Vis.js treats the end date as exclusive, so add a day
                    endDate.setDate(endDate.getDate() + 1);

                    // Track the overall date range for the timeline view
                    if (!minDate || startDate < minDate) minDate = startDate;
                    if (!maxDate || endDate > maxDate) maxDate = endDate;

                    // Create the HTML content for the timeline item
                    let itemContent = `<div class="game-title">${game.englishTitle}</div>`;
                    if (period.label) {
                        itemContent += `<div class="period-label">${period.label}</div>`;
                    }
                    itemContent += `<div class="period-display">${period.display}</div>`;

                    const textColor = getTextColorForBackground(game.timelineColor);

                    items.add({
                        id: `${game.id}-${period.start}`,
                        group: groupId,
                        content: itemContent,
                        start: startDate,
                        end: endDate,
                        type: 'range',
                        className: 'game-timeline-item',
                        style: `background-color: ${game.timelineColor}; border-color: ${game.timelineColor}20; color: ${textColor};`,
                        title: `<strong>${game.englishTitle}</strong><br>${period.display}` // Rich HTML tooltip
                    });
                });
            });

            if (!minDate || !maxDate) {
                throw new Error("No valid date range could be determined from the data.");
            }

            // Add some padding to the start and end dates for a better initial view
            const paddedMinDate = new Date(minDate.getFullYear(), minDate.getMonth() - 3, 1);
            const paddedMaxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 3, 1);

            // Configuration options for the timeline
            const options = {
                width: '100%',
                height: 'calc(100vh - 250px)', // Responsive height
                stack: true,
                horizontalScroll: true,
                verticalScroll: false,
                zoomable: true,
                zoomMin: 1000 * 60 * 60 * 24 * 30 * 3,  // Min zoom: ~3 months
                zoomMax: 1000 * 60 * 60 * 24 * 365 * 12, // Max zoom: ~12 years
                start: paddedMinDate,
                end: paddedMaxDate,
                editable: false,
                orientation: { axis: 'top' },
                groupOrder: 'id', // Ensure groups follow the predefined order
                format: {
                    majorLabels: {
                        month: 'YYYY',
                        year: "'S.'YYYY" // Custom format for Septian Calendar years
                    }
                },
                xss: {
                    disabled: true // Allow HTML in item content and tooltips
                },
                tooltip: {
                    followMouse: true,
                    overflowMethod: 'flip'
                }
            };

            // Create and render the timeline
            const timeline = new vis.Timeline(container, items, groups, options);

        } catch (error) {
            console.error('Failed to initialize timeline:', error);
            container.innerHTML = '<p style="color: red; text-align: center;">Error: Could not load timeline data. Please try again later.</p>';
        }
    }

    drawTimeline();
}
