from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the lore page
        page.goto("http://localhost:8080/lore.html")

        # Ensure the map tab is active
        map_tab = page.get_by_role("link", name="Map")
        map_tab.click()

        # 2. Click on the Liberl Kingdom region
        liberl_region = page.locator("#region-liberl")
        liberl_region.click()

        # 3. Wait for the infobox to become visible and animation to complete
        infobox = page.locator("#map-infobox")
        expect(infobox).to_be_visible()
        page.wait_for_timeout(500) # Wait for animation to look nice in the screenshot

        # 4. Take a screenshot
        page.screenshot(path="jules-scratch/verification/infobox-open-1.png")

        # 5. Click on the Erebonian Empire region to close the first and open the second
        erebonia_region = page.locator("#region-erebonia")
        erebonia_region.click()

        # 6. Wait for the infobox to move and animation to complete
        expect(infobox).to_be_visible()
        page.wait_for_timeout(500) # Wait for animation

        # 7. Take another screenshot
        page.screenshot(path="jules-scratch/verification/infobox-open-2.png")

        print("Successfully opened infoboxes and took screenshots.")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
