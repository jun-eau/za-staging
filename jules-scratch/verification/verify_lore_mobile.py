import os
from playwright.sync_api import sync_playwright, Page, expect

def verify_lore_mobile(page: Page):
    """
    This test verifies that the mobile interface for the Lore page
    renders correctly and that tab navigation works.
    """
    # 1. Arrange: Go to the lore page.
    # The path needs to be absolute.
    file_path = f"file://{os.getcwd()}/lore.html"
    page.goto(file_path)

    # 2. Set viewport to a mobile size.
    page.set_viewport_size({"width": 375, "height": 812})

    # 3. Assert: Check that the mobile map view is visible by default.
    # Wait for the region list to be populated, which indicates rendering is complete.
    expect(page.locator(".mobile-region-list")).to_be_visible()

    # The title of the map view should be visible.
    mobile_map_title = page.locator(".mobile-map-title")
    expect(mobile_map_title).to_be_visible()
    expect(mobile_map_title).to_have_text("Map of Zemuria")

    # Take a screenshot of the map view.
    page.screenshot(path="jules-scratch/verification/verification_map.png")

    # 4. Act: Find the "Timeline" link and click it.
    timeline_link = page.get_by_role("link", name="Timeline")
    timeline_link.click()

    # 5. Assert: Check that the mobile timeline view is visible.
    # The first arc title should be visible.
    mobile_timeline_title = page.locator(".mobile-arc-title").first
    expect(mobile_timeline_title).to_be_visible()
    expect(mobile_timeline_title).to_have_text("Liberl Arc")

    # Take a screenshot of the timeline view.
    page.screenshot(path="jules-scratch/verification/verification_timeline.png")


# Boilerplate to run the test
if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_lore_mobile(page)
        browser.close()
