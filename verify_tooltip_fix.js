const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/timeline.html');
  
  // Wait for the timeline to be fully rendered
  await page.waitForSelector('.vis-timeline');
  
  // Find a specific timeline item to hover over (e.g., the first one)
  const itemToHover = await page.waitForSelector('.vis-item');
  
  // Hover over the item to trigger the tooltip
  await itemToHover.hover();
  
  // Add a small delay to ensure the tooltip is fully visible
  await page.waitForTimeout(500);
  
  // Take a screenshot of the timeline container
  const timelineContainer = await page.$('#timeline-container');
  await timelineContainer.screenshot({ path: '/home/jules/verification/timeline_tooltip_fix.png' });
  
  await browser.close();
})();
