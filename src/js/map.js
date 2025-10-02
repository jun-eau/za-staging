import { calculateRegionAreaInSelge } from './lib/geometry.js';

export function initMapPage() {
    // --- State ---
    let isMapInitialized = false;
    let mapRegionsData = [];
    let mapGamesData = [];

    // --- DOM Elements ---
    let mapContainer, mapOverlay, mapImage;

    // Desktop-specific
    let infobox1, infobox2, currentInfobox;

    // Mobile-specific
    let mobileInfobox, mobileInfoboxContentWrapper;

    // --- Mobile Interaction State ---
    let mobilePanelTouch = {
        startY: 0,
        currentY: 0,
        isDragging: false,
    };

    // --- Utility ---
    const isMobile = window.innerWidth <= 900;

    function hexToRgba(hex, alpha = 1) {
        hex = hex.replace(/^#/, '');
        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // --- Initialization ---
    function initializeMap() {
        if (isMapInitialized) return;

        mapContainer = document.querySelector('.map-container');
        mapOverlay = document.getElementById('map-overlay');
        mapImage = document.querySelector('.map-image');

        if (!mapContainer || !mapOverlay || !mapImage) {
            console.error("Required map elements not found!");
            return;
        }

        mapContainer.classList.add('is-loading');

        Promise.all([
            fetch('src/data/regions.json').then(res => res.ok ? res.json() : Promise.reject(res.status)),
            fetch('src/data/games.json').then(res => res.ok ? res.json() : Promise.reject(res.status))
        ])
        .then(([regions, games]) => {
            mapGamesData = games;
            mapRegionsData = regions.map(region => ({
                ...region,
                formattedArea: calculateRegionAreaInSelge(region)
            }));

            createRegionPaths();

            if (isMobile) {
                setupMobileView();
            } else {
                setupDesktopView();
            }

            isMapInitialized = true;
            mapContainer.classList.remove('is-loading');
        })
        .catch(error => {
            console.error("Error loading map/game data:", error);
            mapContainer.classList.remove('is-loading');
        });
    }

    function createRegionPaths() {
        const svgNS = "http://www.w3.org/2000/svg";
        const maskGroup = mapOverlay.querySelector('#regions-mask g');
        if (!maskGroup) return;

        mapRegionsData.forEach(region => {
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', region.svgPathData);
            path.setAttribute('class', 'region-path');
            path.id = `region-${region.id}`;
            path.dataset.regionId = region.id;
            if (region.baseColor) {
                path.style.setProperty('--region-highlight-color', hexToRgba(region.baseColor, 0.4));
            }
            mapOverlay.appendChild(path);

            const maskPath = document.createElementNS(svgNS, 'path');
            maskPath.setAttribute('d', region.svgPathData);
            maskPath.setAttribute('fill', 'black');
            maskGroup.appendChild(maskPath);
        });
    }

    // --- Desktop View Logic ---
    function setupDesktopView() {
        infobox1 = document.getElementById('map-infobox-1');
        infobox2 = document.getElementById('map-infobox-2');
        currentInfobox = infobox1;

        if (!infobox1 || !infobox2) {
            console.error("Required desktop infobox elements not found!");
            return;
        }

        mapOverlay.addEventListener('click', (e) => {
            const clickedPath = e.target.closest('.region-path');
            const clickedRegionId = clickedPath ? clickedPath.dataset.regionId : null;
            handleDesktopMapClick(clickedRegionId, e.clientX, e.clientY, e.pageX, e.pageY);
        });
    }

    function handleDesktopMapClick(clickedRegionId, clientX, clientY, pageX, pageY) {
        const outgoingBox = currentInfobox;
        const isInfoboxActive = outgoingBox.classList.contains('active');
        const currentRegionId = outgoingBox.dataset.regionId;

        if (!clickedRegionId || (isInfoboxActive && clickedRegionId === currentRegionId)) {
            if (isInfoboxActive) {
                outgoingBox.classList.remove('active');
                outgoingBox.dataset.regionId = '';
            }
            return;
        }

        const region = mapRegionsData.find(r => r.id === clickedRegionId);
        if (!region) return;

        const incomingBox = (outgoingBox.id === 'map-infobox-1') ? infobox2 : infobox1;
        incomingBox.style.display = 'block';
        updateInfoboxContents(region, incomingBox);

        prepareAndPositionDesktopInfobox(region, incomingBox, clientX, clientY, pageX, pageY).then(() => {
            outgoingBox.classList.remove('active');
            incomingBox.classList.add('active');
            currentInfobox = incomingBox;
        });
    }

    function prepareAndPositionDesktopInfobox(region, infoboxEl, clientX, clientY, pageX, pageY) {
        const bodyEl = infoboxEl.querySelector('.infobox-body');
        const gamesViewEl = infoboxEl.querySelector('.infobox-games-view');
        const loreViewEl = infoboxEl.querySelector('.infobox-lore-view');
        const gamesInRegion = mapGamesData.filter(game => (region.games || []).includes(game.id));

        if (region.regionType === 'major' && gamesInRegion.length > 0) {
            const gridWidth = (gamesInRegion.length * 80) + ((gamesInRegion.length - 1) * 8);
            infoboxEl.style.width = `${gridWidth + 24}px`;
        } else {
            infoboxEl.style.width = '320px';
        }

        const images = gamesViewEl.querySelectorAll('img');
        const imageLoadPromises = [...images].map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });

        return Promise.all([document.fonts.ready, ...imageLoadPromises]).then(() => {
            const initialView = infoboxEl.classList.contains('show-lore-view') ? loreViewEl : gamesViewEl;
            bodyEl.classList.add('no-transition');
            bodyEl.style.height = `${initialView.scrollHeight}px`;
            void bodyEl.offsetHeight;
            bodyEl.classList.remove('no-transition');

            const rect = infoboxEl.getBoundingClientRect();
            const offsetX = 20, offsetY = 20;
            let top = pageY + offsetY;
            let left = pageX + offsetX;

            if (clientX + offsetX + rect.width > window.innerWidth) {
                left = pageX - rect.width - offsetX;
            }
            if (clientY + offsetY + rect.height > window.innerHeight) {
                top = pageY - rect.height - offsetY;
            }

            infoboxEl.style.left = `${Math.max(5, left)}px`;
            infoboxEl.style.top = `${Math.max(5, top)}px`;
            infoboxEl.dataset.regionId = region.id;
        });
    }

    // --- Mobile View Logic ---
    function setupMobileView() {
        document.body.classList.add('map-page-mobile-view');
        mobileInfobox = document.getElementById('mobile-map-infobox');
        mobileInfoboxContentWrapper = mobileInfobox.querySelector('.mobile-infobox-content-wrapper');

        if (!mobileInfobox) {
            console.error("Mobile infobox element not found!");
            return;
        }

        initMobilePanZoom();
        initMobilePanelControls();

        mapOverlay.addEventListener('click', (e) => {
            const clickedPath = e.target.closest('.region-path');
            if (clickedPath) {
                e.stopPropagation(); // Prevent click from bubbling to mapContainer
                handleMobileMapClick(clickedPath.dataset.regionId);
            }
        });
    }

    function handleMobileMapClick(clickedRegionId) {
        const region = mapRegionsData.find(r => r.id === clickedRegionId);
        if (!region) return;

        updateInfoboxContents(region, mobileInfobox);
        mobileInfobox.classList.add('visible');
        mobileInfobox.classList.remove('active'); // Start in peek mode
    }

    function initMobilePanZoom() {
        let isPanning = false;
        let startX, startY, transformX = 0, transformY = 0;
        let scale = 1;
        const minScale = 1;
        const maxScale = 8;
        const panTarget = mapOverlay;

        const updateTransform = () => {
            panTarget.style.transform = `translate(${transformX}px, ${transformY}px) scale(${scale})`;
        };

        mapContainer.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = mapContainer.getBoundingClientRect();
            const oldScale = scale;

            scale *= (1 - e.deltaY / 200);
            scale = Math.max(minScale, Math.min(maxScale, scale));

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            transformX = mouseX - (mouseX - transformX) * (scale / oldScale);
            transformY = mouseY - (mouseY - transformY) * (scale / oldScale);

            updateTransform();
        }, { passive: false });

        const startPan = (e) => {
            isPanning = true;
            const point = e.touches ? e.touches[0] : e;
            startX = point.clientX - transformX;
            startY = point.clientY - transformY;
            mapContainer.style.cursor = 'grabbing';
        };

        const doPan = (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const point = e.touches ? e.touches[0] : e;
            transformX = point.clientX - startX;
            transformY = point.clientY - startY;
            updateTransform();
        };

        const endPan = () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab';
        };

        mapContainer.addEventListener('mousedown', startPan);
        mapContainer.addEventListener('mousemove', doPan);
        mapContainer.addEventListener('mouseup', endPan);
        mapContainer.addEventListener('mouseleave', endPan);

        mapContainer.addEventListener('touchstart', startPan, { passive: false });
        mapContainer.addEventListener('touchmove', doPan, { passive: false });
        mapContainer.addEventListener('touchend', endPan);
        mapContainer.addEventListener('touchcancel', endPan);

        mapContainer.style.cursor = 'grab';
    }

    function initMobilePanelControls() {
        const handleArea = mobileInfobox.querySelector('.mobile-infobox-handle-area');

        handleArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!mobileInfobox.classList.contains('visible')) return;
            mobileInfobox.classList.toggle('active');
        });

        mapContainer.addEventListener('click', () => {
            if (mobileInfobox.classList.contains('visible')) {
                mobileInfobox.classList.remove('visible');
                mobileInfobox.classList.remove('active');
            }
        });

        const onTouchStart = (e) => {
            if (!mobileInfobox.classList.contains('visible')) return;
            mobilePanelTouch.isDragging = true;
            mobilePanelTouch.startY = e.touches[0].clientY;
            mobileInfobox.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!mobilePanelTouch.isDragging) return;
            mobilePanelTouch.currentY = e.touches[0].clientY;
            const deltaY = mobilePanelTouch.currentY - mobilePanelTouch.startY;

            if (mobileInfobox.classList.contains('active')) {
                if (deltaY > 0) {
                    mobileInfobox.style.transform = `translateY(${deltaY}px)`;
                }
            } else {
                if (deltaY < 0) {
                    const peekHeight = 50;
                    mobileInfobox.style.transform = `translateY(calc(100% - ${peekHeight}px + ${deltaY}px))`;
                }
            }
        };

        const onTouchEnd = () => {
            if (!mobilePanelTouch.isDragging) return;
            mobilePanelTouch.isDragging = false;
            mobileInfobox.style.transition = '';
            mobileInfobox.style.transform = '';

            const deltaY = mobilePanelTouch.currentY - mobilePanelTouch.startY;

            if (mobileInfobox.classList.contains('active')) {
                if (deltaY > 100) {
                    mobileInfobox.classList.remove('active');
                }
            } else {
                if (deltaY < -50) {
                    mobileInfobox.classList.add('active');
                }
            }
        };

        handleArea.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    // --- Common Infobox Logic ---
    function updateInfoboxContents(region, infoboxEl) {
        const contentContainer = isMobile ? infoboxEl.querySelector('.mobile-infobox-content-wrapper') : infoboxEl;
        const headerEl = contentContainer.querySelector('.map-infobox-header');
        const gamesViewEl = contentContainer.querySelector('.infobox-games-view');
        const loreViewEl = contentContainer.querySelector('.infobox-lore-view');
        const footerEl = contentContainer.querySelector('.map-infobox-footer');
        const bodyEl = contentContainer.querySelector('.infobox-body');

        const hasEmblem = region.emblemAsset;
        headerEl.style.gridTemplateColumns = hasEmblem ? '40px 1fr auto' : '1fr auto';
        let headerHTML = hasEmblem ? `<img src="assets/logo/${region.emblemAsset}" alt="${region.name} Emblem" class="map-infobox-emblem">` : '';
        headerHTML += `
            <div class="map-infobox-title-section">
                <h3>${region.name}</h3>
                <p>${region.government}</p>
            </div>
            <div class="map-infobox-links">
                <a href="${region.falcomWikiUrl}" target="_blank" rel="noopener noreferrer" title="View on Falcom Wiki">
                    <img src="assets/logo/falcom-wiki.png" alt="Falcom Wiki">
                </a>
            </div>`;
        headerEl.innerHTML = headerHTML;

        const gamesInRegion = mapGamesData.filter(game => (region.games || []).includes(game.id));
        gamesViewEl.innerHTML = gamesInRegion.length > 0
            ? `<div class="map-infobox-games-grid">${gamesInRegion.map(game => {
                let assetName = game.assetName;
                if (game.id === 'trails-in-the-sky' && game.variants && game.variants.length > 0) {
                    assetName = game.variants[0].assetName;
                }
                return `<img src="assets/grid/${assetName}.jpg" alt="${game.englishTitle}" title="${game.englishTitle}" class="map-infobox-game-art">`;
              }).join('')}</div>`
            : '<p style="font-size: 0.8em; color: #999;">No specific games are primarily set in this region.</p>';

        const featuredInGames = mapGamesData.filter(game => (region.featuredIn || []).includes(game.id));
        let featuredInHtml = featuredInGames.length > 0 ? `
            <div class="map-infobox-lore-section">
                <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">${region.regionType === 'major' ? "Also Featured In" : "Featured In"}</h4>
                <ul>${featuredInGames.map(game => `<li>${game.englishTitle}</li>`).join('')}</ul>
            </div>` : '';
        loreViewEl.innerHTML = `
            <div class="map-infobox-lore-section">
                <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">Region Details</h4>
                <p><strong>Capital:</strong> ${region.capital}</p>
                ${region.formattedArea ? `<p><strong>Area:</strong> ${region.formattedArea}</p>` : ''}
            </div>
            <div class="map-infobox-lore-section">
                <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">Description</h4>
                <p>${region.description}</p>
            </div>
            <div class="map-infobox-lore-section">
                <h4 style="color: ${region.baseColor}; border-bottom-color: ${region.baseColor};">History</h4>
                <p>${region.history}</p>
            </div>
            ${featuredInHtml}`;

        const showLoreInitially = region.regionType !== 'major';
        infoboxEl.classList.toggle('show-lore-view', showLoreInitially);

        footerEl.innerHTML = '';
        if (region.regionType === 'major') {
            footerEl.style.display = 'block';
            const toggleButton = document.createElement('button');
            toggleButton.className = 'map-infobox-toggle-btn';

            const updateButtonText = () => {
                toggleButton.textContent = infoboxEl.classList.contains('show-lore-view') ? 'Show Game Art' : 'Show More Details';
            };
            toggleButton.addEventListener('click', (event) => {
                event.stopPropagation();
                infoboxEl.classList.toggle('show-lore-view');
                updateButtonText();
                if (!isMobile) {
                    const targetView = infoboxEl.classList.contains('show-lore-view') ? loreViewEl : gamesViewEl;
                    bodyEl.style.height = `${targetView.scrollHeight}px`;
                }
            });

            footerEl.appendChild(toggleButton);
            updateButtonText();
        } else {
            footerEl.style.display = 'none';
        }
    }

    // --- Start ---
    initializeMap();
}