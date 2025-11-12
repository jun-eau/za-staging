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
        let groupOrder = 0;

        // Determine a consistent order for the arcs
        const arcOrder = ["Liberl Arc", "Crossbell Arc", "Erebonia Arc", "Calvard Arc", "Epilogue"];
        arcOrder.forEach(arcName => {
            visGroups.set(arcName, {
                id: arcName,
                content: arcName,
                order: groupOrder++,
            });
        });

        games.forEach(game => {
            if (!game.timelinePeriods || game.timelinePeriods.length === 0) {
                return; // Skip games without timeline data
            }

            const arcName = game.arc;
             if (!visGroups.has(arcName)) {
                visGroups.set(arcName, {
                    id: arcName,
                    content: arcName,
                    order: groupOrder++,
                });
            }

            game.timelinePeriods.forEach(period => {
                const start = parseDate(period.start);
                let end = parseDate(period.end);

                // For single-day events, ensure they have a minimum visible duration on the timeline
                if (!end || start.getTime() === end.getTime()) {
                    end = new Date(start.getTime() + (1000 * 60 * 60 * 24 * 5)); // Give it a 5-day visual width
                }

                visItems.push({
                    id: itemId++,
                    content: ' ', // Content is handled by the tooltip
                    start: start,
                    end: end,
                    group: arcName,
                    type: 'range',
                    title: `
                        <div class="timeline-tooltip">
                            <div class="tooltip-title">${game.englishTitle}</div>
                            ${period.label ? `<div class="tooltip-label">${period.label}</div>` : ''}
                            <div class="tooltip-display">${period.display}</div>
                        </div>
                    `,
                    className: game.id,
                    style: `background-color: ${game.timelineColor}; border-color: ${darkenColor(game.timelineColor, 20)};`
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
        return new Date(`${dateStr}T00:00:00`);
    }

    function darkenColor(color, percent) {
        let num = parseInt(color.replace("#", ""), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) - amt,
            B = (num >> 8 & 0x00FF) - amt,
            G = (num & 0x0000FF) - amt;
        R = Math.max(0, R);
        B = Math.max(0, B);
        G = Math.max(0, G);
        return "#" + (0x1000000 + R * 0x10000 + B * 0x100 + G).toString(16).slice(1);
    }

    // --- Timeline Rendering ---
    function renderTimeline(items, groups) {
        const options = {
            // Sane defaults for min/max zoom
            zoomMin: 1000 * 60 * 60 * 24 * 30, // One month
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 15, // Fifteen years

            // Stacking and orientation
            stack: true,
            groupOrder: 'order',
            orientation: 'top',

            // Make it responsive
            width: '100%',
            height: '70vh',

            // Usability
            editable: false,
            zoomable: true,
            moveable: true,

            // Set initial visible window
            start: new Date('1202-01-01T00:00:00'),
            end: new Date('1209-01-01T00:00:00'),

            // No template, as content is in the tooltip
            template: (item) => item.content,

            // Configure tooltips
            showTooltips: true,
            tooltip: {
                followMouse: true,
                overflowMethod: 'flip'
            },
            // Allow HTML in tooltips
            xss: {
                disabled: true
            }
        };

        const timeline = new vis.Timeline(container, items, groups, options);
    }

    // --- Initialize ---
    initializeTimeline();
}
