const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const routes = [
  { name: 'home', path: 'http://localhost:5173/saas' },
  { name: 'features', path: 'http://localhost:5173/features' },
  { name: 'solutions', path: 'http://localhost:5173/solutions' },
  { name: 'pricing', path: 'http://localhost:5173/pricing' },
  { name: 'about', path: 'http://localhost:5173/about' },
  { name: 'faq', path: 'http://localhost:5173/faq' },
  { name: 'contact', path: 'http://localhost:5173/contact' },
  { name: 'login_saas', path: 'http://localhost:5173/saas/login' },
  { name: 'register', path: 'http://localhost:5173/register' },
  { name: 'reset_password', path: 'http://localhost:5173/reset-password' },
  { name: 'login_tenant', path: 'http://localhost:5173/login' },
];

const viewports = [
  { name: 'mobile_375', width: 375, height: 812 },
  { name: 'desktop_1440', width: 1440, height: 900 }
];

const outDir = '/home/ubuntu/.gemini/antigravity-cli/brain/f7e21ed6-0a57-431b-adde-08050914889d/scratch/audit_batch';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const vp of viewports) {
    for (const r of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });
      try {
        await page.goto(r.path, { waitUntil: 'networkidle0', timeout: 10000 });
        const filePath = path.join(outDir, `${r.name}_${vp.name}.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Saved ${r.name} (${vp.name}) -> ${filePath}`);
      } catch (err) {
        console.error(`Failed ${r.name} (${vp.name}):`, err.message);
      }
      await page.close();
    }
  }

  await browser.close();
  console.log('Batch audit completed.');
})();
