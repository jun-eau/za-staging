export function initTimelinePage() {
    const container = document.getElementById('timeline-container');
    if (!container) {
        console.error('Timeline container not found!');
        return;
    }

    // Fetch the game data
    fetch('src/data/games.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(games => {
            // --- 1. Define Groups ---
            const groups = new vis.DataSet([
                { id: 'Liberl Arc', content: 'Liberl Arc' },
                { id: 'Crossbell Arc', content: 'Crossbell Arc' },
                { id: 'Erebonia Arc', content: 'Erebonia Arc' },
                { id: 'Calvard Arc', content: 'Calvard Arc' }
            ]);

            // --- 2. Process Game Data into Timeline Items ---
            const items = new vis.DataSet();
            let idCounter = 1;
            let minDate = null;
            let maxDate = null;

            games.forEach(game => {
                if (!game.timelinePeriods) return;

                game.timelinePeriods.forEach(period => {
                    const start = new Date(period.start);
                    let end = new Date(period.end);

                    // Update min/max dates by finding the earliest start and latest end
                    if (minDate === null || start < minDate) {
                        minDate = start;
                    }
                    if (maxDate === null || end > maxDate) {
                        maxDate = end;
                    }

                    // Add one day to the end date to make it inclusive for vis-timeline
                    end.setDate(end.getDate() + 1);

                    let group;
                    switch (game.arc) {
                        case 'Liberl Arc':
                            group = 'Liberl Arc';
                            break;
                        case 'Crossbell Arc':
                            group = 'Crossbell Arc';
                            break;
                        case 'Erebonia Arc':
                        case 'Epilogue': // As per instruction
                            group = 'Erebonia Arc';
                            break;
                        case 'Calvard Arc':
                            group = 'Calvard Arc';
                            break;
                        default:
                            group = 'Unknown';
                    }

                     // Determine text color
                    const textColor = (game.id === 'trails-in-the-sky-sc' || game.id === 'trails-through-daybreak') ? '#000000' : '#FFFFFF';

                    // Create custom HTML content for the item - now using shortTitle and bolding it
                    const contentHtml = `<div style="color: ${textColor};"><strong>${game.shortTitle}</strong></div>`;

                    items.add({
                        id: idCounter++,
                        group: group,
                        start: period.start,
                        end: end.toISOString().split('T')[0], // Format as YYYY-MM-DD
                        title: `${game.englishTitle}: ${period.label ? period.label + ' - ' : ''}${period.display}`,
                        content: contentHtml,
                        style: `background-color: ${game.timelineColor}; border-color: ${game.timelineColor};`
                    });
                });
            });

            // --- 3. Calculate Date Range with Padding ---
            let paddedMinDate = new Date(minDate);
            paddedMinDate.setMonth(paddedMinDate.getMonth() - 3);

            let paddedMaxDate = new Date(maxDate);
            paddedMaxDate.setMonth(paddedMaxDate.getMonth() + 3);

            // --- 4. Configure Timeline Options ---
            const options = {
                min: paddedMinDate.toISOString().split('T')[0],
                max: paddedMaxDate.toISOString().split('T')[0],
                start: paddedMinDate.toISOString().split('T')[0],
                end: paddedMaxDate.toISOString().split('T')[0],
                orientation: 'top',
                stack: false,
                stackSubgroups: false,
                moveable: true,
                zoomable: true,
                tooltip: {
                    followMouse: true
                },
                format: {
                    majorLabels: {
                        year: 'S.YYYY' // Custom format for the year
                    }
                },
                zoomMax: 1000 * 60 * 60 * 24 * 365 * 8, // 8 years
                zoomMin: 1000 * 60 * 60 * 24 * 30 * 6   // 6 months
            };

            // --- 5. Instantiate Timeline ---
            new vis.Timeline(container, items, groups, options);

        })
        .catch(error => {
            console.error('Error loading timeline data:', error);
            container.innerHTML = '<p style="color: var(--text-primary); text-align: center;">Error: Could not load timeline data. Please try refreshing the page.</p>';
        });
}
