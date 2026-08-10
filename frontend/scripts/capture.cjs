const puppeteer = require('puppeteer');
const path = require('path');

const url = process.argv[2] || 'http://localhost:5173/saas';
const width = parseInt(process.argv[3] || '375', 10);
const height = parseInt(process.argv[4] || '812', 10);
const outPath = process.argv[5] || '/tmp/test.png';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log(`Captured ${url} at ${width}x${height} -> ${outPath}`);
})();
