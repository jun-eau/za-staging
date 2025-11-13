const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/timeline.html');
  
  // Wait for the timeline to be fully rendered
  await page.waitForSelector('.vis-timeline');
  
  // Find the first timeline item to hover over
  const itemToHover = await page.waitForSelector('.vis-item');
  
  // Hover over the item to trigger the tooltip
  await itemToHover.hover();
  
  // Take a screenshot of the timeline container
  const timelineContainer = await page.$('#timeline-container');
  await timelineContainer.screenshot({ path: '/home/jules/verification/timeline_final_fixes.png' });
  
  await browser.close();
})();
