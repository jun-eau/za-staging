# Other Potential Ideas for Zemurian Atlas

This document lists potential improvements and feature ideas that are currently out of scope but could be considered for future development.

## Codebase & Architecture

*   **Refactor `lore.js`**: The `src/js/lore.js` file is currently very large and handles both the timeline and the interactive map. It should be split into smaller, more focused modules (e.g., `timeline.js`, `map.js`, `ui-componenents.js`). This would significantly improve maintainability.
*   **State Management**: The project could benefit from a more structured state management approach instead of relying on module-level variables. For the map, a class or a factory function could encapsulate all map-related state and logic.
*   **Component-Based Rendering**: Instead of building HTML strings and using `innerHTML`, the project could use a more modern approach like creating reusable component functions that return DOM elements. This would make the rendering logic cleaner and less error-prone.
*   **Build Process**: Introduce a simple build process (e.g., using Vite or Parcel) to handle things like minification, and CSS prefixing. This would also allow for using tools like Sass for more organized stylesheets.

## UX & Feature Enhancements

*   **Fully Responsive Mobile View**: The map and timeline are currently designed for desktop. A dedicated mobile-friendly design would greatly improve the user experience on smaller devices. This could involve:
    *   A simplified list-based view for the map on mobile.
    *   A vertically scrolling timeline instead of a horizontal one.
*   **Map Zoom and Pan**: Add controls to zoom and pan the map, allowing users to get a closer look at specific areas.
*   **Search Functionality**: A search bar to quickly find specific games, characters, or locations on the timeline and map.
*   **Deeper Integration Between Views**:
    *   Clicking a game on the map could highlight the corresponding entry in the timeline, and vice-versa.
    *   A global filter for arcs (Liberl, Crossbell, etc.) that affects both the map and the timeline.
*   **More Map Layers**: Add toggleable layers to the map, such as:
    *   Major travel routes (airship routes, railways).
    *   Locations of significant events.
*   **Settings/Preferences**: Allow users to save their preferences, such as the default view (Map or Timeline) or theme (light/dark mode).
*   **Performance Optimization**: For the map, the SVG path data could be simplified or loaded on-demand to improve initial load times, although performance is acceptable with the current amount of data.
