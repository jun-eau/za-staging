const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/timeline.html');
  
  // Wait for the timeline to be fully rendered
  await page.waitForSelector('.vis-timeline');
  
  // Scroll the timeline horizontally to the right
  await page.mouse.move(500, 200);
  await page.mouse.down();
  await page.mouse.move(100, 200, { steps: 10 });
  await page.mouse.up();

  // Add a small delay to ensure scrolling is complete
  await page.waitForTimeout(500);
  
  // Take a screenshot of the timeline container
  const timelineContainer = await page.$('#timeline-container');
  await timelineContainer.screenshot({ path: '/home/jules/verification/timeline_scroll_fix.png' });
  
  await browser.close();
})();
