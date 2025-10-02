import os
import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    # Use the local server URLs
    map_url = 'http://localhost:8080/map.html'
    timeline_url = 'http://localhost:8080/timeline.html'

    browser = playwright.chromium.launch(headless=True)
    # Define a mobile viewport
    context = browser.new_context(
        viewport={'width': 375, 'height': 812},  # iPhone X
        is_mobile=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
    )
    page = context.new_page()

    # --- Verify Map Page ---
    print("Verifying map page...")
    page.goto(map_url, wait_until='networkidle')

    # Wait for the map to be initialized by checking for a region path
    expect(page.locator('.region-path').first).to_be_visible(timeout=15000)
    print("Map initialized.")

    # Click on a region to trigger the mobile info panel
    page.locator('#region-crossbell').click()

    # Wait for the panel to get the 'visible' class, which is the trigger for the animation
    mobile_panel = page.locator('#mobile-map-infobox')
    expect(mobile_panel).to_have_class(re.compile(r"visible"))
    print("Mobile panel has the 'visible' class.")

    # Give the CSS transition time to finish before taking the screenshot
    page.wait_for_timeout(500)

    # Take a screenshot of the map with the panel peeking
    page.screenshot(path="jules-scratch/verification/map_mobile_view.png")
    print("Screenshot of map page taken.")

    # --- Verify Timeline Page ---
    print("\nVerifying timeline page...")
    page.goto(timeline_url, wait_until='networkidle')

    # Wait for the timeline to render by checking for a game entry
    expect(page.locator('.game-entry-box').first).to_be_visible(timeout=10000)
    print("Timeline initialized.")

    # The mobile layout should be a single column, so the scroll wrapper should not be scrollable
    scroll_wrapper = page.locator('.lore-timeline-scroll-wrapper')
    scroll_width = scroll_wrapper.evaluate('(element) => element.scrollWidth')
    client_width = scroll_wrapper.evaluate('(element) => element.clientWidth')
    assert scroll_width == client_width, f"Timeline should not be scrollable on mobile. scrollWidth: {scroll_width}, clientWidth: {client_width}"
    print("Timeline is in single-column layout as expected.")

    # Take a screenshot of the timeline
    page.screenshot(path="jules-scratch/verification/timeline_mobile_view.png")
    print("Screenshot of timeline page taken.")

    browser.close()
    print("\nVerification script finished successfully.")

with sync_playwright() as playwright:
    run(playwright)