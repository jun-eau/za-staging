export function initTimelinePage() {
    // --- DOM Element ---
    const container = document.getElementById('vis-timeline');
    if (!container) {
        console.error("Timeline container #vis-timeline not found.");
        return;
    }

    // --- Data Processing ---
    async function initializeTimeline() {
        try {
            const response = await fetch('src/data/games.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const gamesData = await response.json();

            const { items, groups } = processDataForVis(gamesData);

            if (items.get().length === 0) {
                console.warn("No valid timeline data to display.");
                return;
            }

            renderTimeline(items, groups);

        } catch (error) {
            console.error("Error initializing timeline:", error);
        }
    }

    function processDataForVis(games) {
        const visItems = [];
        const visGroups = new Map();
        let itemId = 1;

        games.forEach(game => {
            if (!game.timelinePeriods || game.timelinePeriods.length === 0) {
                return; // Skip games without timeline data
            }

            // Create a group for the game's arc if it doesn't exist
            if (!visGroups.has(game.arc)) {
                visGroups.set(game.arc, {
                    id: visGroups.size + 1,
                    content: game.arc,
                    className: `vis-group-${game.arc.toLowerCase().replace(/\s+/g, '-')}`
                });
            }
            const groupId = visGroups.get(game.arc).id;

            game.timelinePeriods.forEach(period => {
                const start = parseDate(period.start);
                // For single-day events, Vis.js needs a 'point' type. For ranges, it needs an 'end'.
                // If start and end are the same, we'll treat it as a point.
                const end = parseDate(period.end);

                let itemType = 'range';
                if (!end || start.getTime() === end.getTime()) {
                    itemType = 'box';
                }

                visItems.push({
                    id: itemId++,
                    content: game.englishTitle,
                    start: start,
                    end: end,
                    group: groupId,
                    type: itemType,
                    // Custom data for the template
                    title: `${game.englishTitle}${period.label ? `: ${period.label}` : ''}<br>${period.display}`,
                    className: game.id,
                    style: `background-color: ${game.timelineColor}; border-color: ${darkenColor(game.timelineColor, 25)};`,
                    // Storing original data for the template
                    gameData: {
                        title: game.englishTitle,
                        display: period.display,
                        label: period.label || null
                    }
                });
            });
        });

        return {
            items: new vis.DataSet(visItems),
            groups: new vis.DataSet(Array.from(visGroups.values()))
        };
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;
        // The dates are like "YYYY-MM-DD". We can create a Date object directly.
        // Appending 'T00:00:00' ensures it's parsed as local time at midnight.
        return new Date(`${dateStr}T00:00:00`);
    }

    function darkenColor(color, percent) {
        let num = parseInt(color.replace("#", ""), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) - amt,
            B = (num >> 8 & 0x00FF) - amt,
            G = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
    }


    // --- Timeline Rendering ---
    function renderTimeline(items, groups) {
        const options = {
            // Sane defaults for min/max zoom
            zoomMin: 1000 * 60 * 60 * 24 * 30, // One month
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // Ten years

            // Visual stacking and orientation
            stack: true,
            stackSubgroups: false,
            orientation: 'top',

            // Make it responsive
            width: '100%',
            height: '600px', // A decent default height

            // Usability
            editable: false,
            zoomable: true,
            moveable: true,

            // Start and end dates (optional, Vis.js calculates this but setting it can be good)
            // Let Vis.js auto-determine start/end from the data set.

            // Custom item template
            template: function(item, element, data) {
                if (!item.gameData) return '';
                let content = `<div class="vis-item-title">${item.gameData.title}</div>`;
                if (item.gameData.label) {
                    content += `<div class="vis-item-label">${item.gameData.label}</div>`;
                }
                content += `<div class="vis-item-display">${item.gameData.display}</div>`;
                return content;
            },

            // Set initial visible window (optional, but nice for focus)
            start: new Date('1200-01-01T00:00:00'),
            end: new Date('1210-01-01T00:00:00'),
        };

        const timeline = new vis.Timeline(container, items, groups, options);
    }

    // --- Initialize ---
    initializeTimeline();
}
