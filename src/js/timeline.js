export function initTimelinePage() {
    // DOM element where the Timeline will be attached
    const container = document.getElementById('vis-timeline-container');
    if (!container) {
        console.error('Timeline container not found!');
        return;
    }

    // --- Data Transformation ---
    async function getTimelineData() {
        try {
            const response = await fetch('src/data/games.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const games = await response.json();
            
            const items = [];
            const groups = [];
            const groupSet = new Set();
            let minDate = null;
            let maxDate = null;

            games.forEach(game => {
                if (game.timelinePeriods && Array.isArray(game.timelinePeriods)) {
                    if (game.arc && !groupSet.has(game.arc)) {
                        groups.push({ id: game.arc, content: game.arc });
                        groupSet.add(game.arc);
                    }

                    game.timelinePeriods.forEach((period, index) => {
                        const startDate = new Date(period.start);
                        const endDate = new Date(period.end);

                        if (!minDate || startDate < minDate) {
                            minDate = startDate;
                        }
                        if (!maxDate || endDate > maxDate) {
                            maxDate = endDate;
                        }

                        items.push({
                            id: `${game.id}-${index}`,
                            content: game.englishTitle + (period.label ? `<br><em>${period.label}</em>` : ''),
                            start: period.start,
                            end: period.end,
                            group: game.arc,
                            style: `background-color: ${game.timelineColor}; color: ${getContrastYIQ(game.timelineColor)}; border-color: ${darkenColor(game.timelineColor, 20)};`,
                            title: `${game.englishTitle} (${period.display})`
                        });
                    });
                }
            });
            
            // Add padding to min and max dates
            if (minDate) {
                minDate.setFullYear(minDate.getFullYear() - 1);
            }
            if (maxDate) {
                maxDate.setFullYear(maxDate.getFullYear() + 1);
            }

            return {
                items: new vis.DataSet(items),
                groups: new vis.DataSet(groups),
                minDate: minDate ? minDate.toISOString().split('T')[0] : '1200-01-01',
                maxDate: maxDate ? maxDate.toISOString().split('T')[0] : '1210-01-01'
            };
        } catch (error) {
            console.error("Error fetching or processing game data:", error);
            return { items: new vis.DataSet(), groups: new vis.DataSet(), minDate: '1200-01-01', maxDate: '1210-01-01' };
        }
    }

    // --- Utility Functions for Styling ---
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

        r = (r<255)?r:255;
        g = (g<255)?g:255;
        b = (b<255)?b:255;

        const newHex = [r, g, b].map(x => {
            const hex = x.toString(16);
            return (hex.length == 1) ? "0" + hex : hex;
        }).join('');

        return `#${newHex}`;
    }

    // --- Timeline Initialization ---
    async function initializeTimeline() {
        const { items, groups, minDate, maxDate } = await getTimelineData();

        if (items.length === 0) {
            container.innerHTML = 'No timeline data to display.';
            return;
        }

        const options = {
            // Configuration for the Timeline
            stack: true,
            stackSubgroups: true,
            margin: {
                item: {
                    horizontal: 0,
                    vertical: 5
                }
            },
            min: minDate,
            max: maxDate,
            start: '1202-01-01',
            end: '1207-01-01',
            zoomMin: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 15, // 15 years
            editable: false,
            groupOrder: 'id',
            template: function (item) {
                return `
                    <div class="vis-item-content">
                        <span class="vis-item-title">${item.content.split('<br>')[0]}</span>
                        ${item.content.includes('<br>') ? `<br><em class="vis-item-label">${item.content.split('<br>')[1]}</em>` : ''}
                    </div>
                `;
            },
            onInitialDrawComplete: function() {
                // Fix accessibility issues
                const itemElements = container.querySelectorAll('.vis-item');
                itemElements.forEach(itemEl => {
                    itemEl.setAttribute('role', 'listitem');
                    itemEl.setAttribute('aria-label', itemEl.getAttribute('title'));
                });
                const groupElements = container.querySelectorAll('.vis-group');
                groupElements.forEach(groupEl => {
                    groupEl.setAttribute('role', 'listitem');
                });
                const list = container.querySelector('.vis-center > div');
                list.setAttribute('role', 'list');

                const groupList = container.querySelector('.vis-left > div');
                groupList.setAttribute('role', 'list');
            }
        };

        // Create a Timeline
        const timeline = new vis.Timeline(container, items, groups, options);
    }

    initializeTimeline();
}
