export function initVisTimelinePage() {
    const container = document.getElementById('vis-timeline');
    if (!container) {
        console.error('Timeline container #vis-timeline not found.');
        return;
    }

    async function fetchDataAndCreateTimeline() {
        try {
            const response = await fetch('src/data/games.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const games = await response.json();

            const { items, groups } = processGameData(games);

            const options = getTimelineOptions();

            const timeline = new vis.Timeline(container, items, groups, options);

            addCustomHoverEffects(timeline);

        } catch (error) {
            console.error("Error initializing Vis.js timeline:", error);
            container.innerHTML = '<p style="color: white; text-align: center;">Error loading timeline data. Please try again later.</p>';
        }
    }

    function processGameData(games) {
        const items = new vis.DataSet();
        const groups = new vis.DataSet();

        const arcOrder = ["Liberl Arc", "Crossbell Arc", "Erebonia Arc", "Epilogue", "Calvard Arc"];
        arcOrder.forEach((arcName, index) => {
            groups.add({
                id: arcName,
                content: arcName,
                order: index
            });
        });

        // Special handling for Reverie to assign it to the "Epilogue" group
        const reverieGame = games.find(g => g.id === 'trails-into-reverie');
        if (reverieGame) {
            reverieGame.arc = "Epilogue";
        }

        games.forEach(game => {
            if (game.timelinePeriods && game.arc) {
                game.timelinePeriods.forEach((period, index) => {
                    if (!period.start || !period.end) {
                        return;
                    }
                    const startParts = period.start.split('-').map(Number);
                    const startDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts.length > 2 ? startParts[2] : 1));

                    const endParts = period.end.split('-').map(Number);
                    const endDate = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts.length > 2 ? endParts[2] : 1));
                    endDate.setUTCHours(23, 59, 59, 999);

                    // For single-day events, make sure they have a minimum visual duration on the timeline
                    if (period.start === period.end) {
                        endDate.setDate(endDate.getDate() + 1);
                    }

                    const uniqueId = `${game.id}-${index}`;
                    const titleHtml = `
                        <div class="vis-tooltip-content">
                            <strong>${game.englishTitle}</strong><br>
                            ${period.label ? `<em>${period.label}</em><br>` : ''}
                            <span class="vis-tooltip-date">${period.display}</span>
                        </div>
                    `;

                    items.add({
                        id: uniqueId,
                        group: game.arc,
                        start: startDate,
                        end: endDate,
                        content: `
                            <div class="timeline-item-content" style="background-color: ${game.timelineColor};">
                                <span class="item-title">${game.englishTitle}</span>
                                <span class="item-date">${period.display}</span>
                            </div>
                        `,
                        title: titleHtml,
                        englishTitle: game.englishTitle,
                        displayDate: period.display,
                        periodLabel: period.label || ''
                    });
                });
            }
        });

        return { items, groups };
    }

    function getTimelineOptions() {
        const minDate = new Date("1201-01-01");
        const maxDate = new Date("1210-01-01");

        return {
            stack: false,
            width: '100%',
            height: '600px',
            margin: {
                item: {
                    vertical: 5,
                    horizontal: 2
                },
                axis: 20
            },
            orientation: 'top',
            zoomMin: 1000 * 60 * 60 * 24 * 30, // Approx 1 month
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // Approx 10 years
            min: minDate,
            max: maxDate,
            start: new Date(Date.UTC(1203, 0, 1)),
            end: new Date(Date.UTC(1208, 0, 1)),
            showCurrentTime: false,
            showMajorLabels: true,
            showMinorLabels: true,
            groupOrder: 'order',
            format: {
                majorLabels: {
                    millisecond: 'YYYY',
                    second: 'YYYY',
                    minute: 'YYYY',
                    hour: 'YYYY',
                    weekday: 'YYYY',
                    day: 'YYYY',
                    week: 'YYYY',
                    month: 'YYYY',
                    year: "'S.'YYYY"
                }
            }
        };
    }

    function addCustomHoverEffects(timeline) {
        const customTooltip = document.createElement('div');
        customTooltip.className = 'vis-timeline-custom-tooltip';
        document.body.appendChild(customTooltip);

        function updateItemTextVisibility() {
            const items = timeline.getRenderedItems();
            items.forEach(itemId => {
                const itemElement = timeline.itemSet.items[itemId].dom.frame;
                if (!itemElement) return;

                const content = itemElement.querySelector('.timeline-item-content');
                const title = itemElement.querySelector('.item-title');
                const date = itemElement.querySelector('.item-date');

                // Temporarily make text visible to measure it
                content.classList.remove('text-hidden');

                const isOverflowing = title.scrollWidth > content.clientWidth || date.scrollHeight > (content.clientHeight / 2);

                if (isOverflowing) {
                    content.classList.add('text-hidden');
                    itemElement.classList.add('is-truncated');
                } else {
                    content.classList.remove('text-hidden');
                    itemElement.classList.remove('is-truncated');
                }
            });
        }

        timeline.on('changed', updateItemTextVisibility);

        timeline.on('itemover', function (props) {
            const itemElement = timeline.itemSet.items[props.item].dom.frame;
            if (itemElement && itemElement.classList.contains('is-truncated')) {
                const itemData = timeline.itemsData.get(props.item);
                customTooltip.innerHTML = itemData.title;
                customTooltip.style.display = 'block';
            }
        });

        timeline.on('itemout', function () {
            customTooltip.style.display = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (customTooltip.style.display === 'block') {
                customTooltip.style.left = `${e.pageX + 15}px`;
                customTooltip.style.top = `${e.pageY + 15}px`;
            }
        });

        // Initial check
        updateItemTextVisibility();
    }

    fetchDataAndCreateTimeline();
}
