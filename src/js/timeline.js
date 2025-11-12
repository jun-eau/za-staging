export function initTimelinePage() {
    // Poll for the existence of the 'vis' library on the global window object.
    // This is necessary because the library is loaded from a CDN as a global script,
    // while the site's own JavaScript is loaded as a module. This can lead to
    // race conditions where 'vis' is not yet defined when this module executes.
    const visJsPoll = setInterval(() => {
        if (window.vis) {
            clearInterval(visJsPoll);
            // Once the library is confirmed to be available, initialize the timeline.
            initializeTimeline();
        }
    }, 100); // Check for the library every 100 milliseconds.

    function initializeTimeline() {
        const container = document.getElementById('vis-timeline-container');
        if (!container) {
            console.error('Timeline container not found!');
            return;
        }

        async function createTimeline() {
            try {
                const response = await fetch('src/data/games.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const games = await response.json();

                const items = [];
                const groups = [];
                const groupSet = new Set();
                let minDate = null;
                let maxDate = null;

                const arcOrder = ["Liberl Arc", "Crossbell Arc", "Erebonia Arc", "Calvard Arc"];
                const gamesByArc = {};
                arcOrder.forEach(arc => gamesByArc[arc] = []);

                games.forEach(game => {
                    let arc = game.arc;
                    if (game.englishTitle === "Trails into Reverie") {
                        arc = "Erebonia Arc";
                    }
                    if (arcOrder.includes(arc)) {
                        gamesByArc[arc].push(game);
                    }
                });

                arcOrder.forEach((arc, order) => {
                    groups.push({ id: arc, content: arc, order: order });

                    gamesByArc[arc].forEach(game => {
                        if (game.timelinePeriods && Array.isArray(game.timelinePeriods)) {
                            game.timelinePeriods.forEach((period, index) => {
                                const startDate = new Date(period.start);
                            const endDate = new Date(period.end);

                            if (!minDate || startDate < minDate) minDate = startDate;
                            if (!maxDate || endDate > maxDate) maxDate = endDate;

                            items.push({
                                id: `${game.id}-${index}`,
                                content: game.englishTitle,
                                start: period.start,
                                end: period.end,
                                group: game.arc,
                                gameTitle: game.englishTitle,
                                periodDisplay: period.display,
                                periodLabel: period.label || '',
                                timelineColor: game.timelineColor,
                                style: `background-color: ${game.timelineColor}; color: ${getContrastYIQ(game.timelineColor)}; border-color: ${darkenColor(game.timelineColor, 20)};`
                            });
                        });
                        }
                    });
                });

                if (minDate) minDate.setFullYear(minDate.getFullYear() - 1);
                if (maxDate) maxDate.setFullYear(maxDate.getFullYear() + 1);

                const options = {
                    orientation: 'top',
                    stack: true,
                    min: minDate ? minDate.toISOString().split('T')[0] : '1200-01-01',
                    max: maxDate ? maxDate.toISOString().split('T')[0] : '1210-01-01',
                    start: '1202-01-01',
                    end: '1208-01-01',
                    zoomMin: 1000 * 60 * 60 * 24 * 30 * 6,
                    zoomMax: 1000 * 60 * 60 * 24 * 365 * 15,
                    editable: false,
                    groupOrder: 'order',
                    tooltip: {
                        followMouse: false, // Tooltip will appear below the item
                        overflowMethod: 'flip',
                        template: function(item) {
                            if (!item) { return ''; }
                            const title = `<strong>${item.gameTitle}</strong>`;
                            const label = item.periodLabel ? `<em>${item.periodLabel}</em>` : '';
                            const display = item.periodDisplay;

                            // The entire tooltip will be styled with the game's color
                            const style = `background-color: ${item.timelineColor}; color: ${getContrastYIQ(item.timelineColor)};`;

                            return `<div class="vis-tooltip-content" style="${style}">${title}<br>${label ? `${label}<br>` : ''}${display}</div>`;
                        }
                    }
                };

                const timeline = new vis.Timeline(container, items, groups, options);

                // Set tooltip color dynamically
                timeline.on('show', properties => {
                    const tooltipElement = document.querySelector('.vis-tooltip');
                    if (tooltipElement && properties.item) {
                        const item = items.get(properties.item);
                        tooltipElement.style.setProperty('--tooltip-color', item.timelineColor);
                    }
                });

            } catch (error) {
                console.error("Error initializing timeline:", error);
                container.innerHTML = 'Error initializing timeline. See console for details.';
            }
        }

        // Helper functions for styling
        function getContrastYIQ(hexcolor){
            hexcolor = hexcolor.replace("#", "");
            const r = parseInt(hexcolor.substr(0,2),16);
            const g = parseInt(hexcolor.substr(2,2),16);
            const b = parseInt(hexcolor.substr(4,2),16);
            const yiq = ((r*299)+(g*587)+(b*114))/1000;
            return (yiq >= 128) ? '#000000' : '#FFFFFF';
        }

        function darkenColor(hex, percent) {
            hex = hex.replace('#', '');
            let r = parseInt(hex.substring(0, 2), 16);
            let g = parseInt(hex.substring(2, 4), 16);
            let b = parseInt(hex.substring(4, 6), 16);
            r = parseInt(r * (100 - percent) / 100);
            g = parseInt(g * (100 - percent) / 100);
            b = parseInt(b * (100 - percent) / 100);
            const newHex = [r, g, b].map(x => {
                const hex = x.toString(16);
                return (hex.length == 1) ? "0" + hex : hex;
            }).join('');
            return `#${newHex}`;
        }

        createTimeline();
    }
}
