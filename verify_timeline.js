const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/timeline.html');

  // Wait for the timeline to be fully rendered
  await page.waitForSelector('.vis-timeline');

  // Take a screenshot of the timeline container
  const timelineContainer = await page.$('#timeline-container');
  await timelineContainer.screenshot({ path: '/home/jules/verification/timeline_no_stacking.png' });

  await browser.close();
})();
