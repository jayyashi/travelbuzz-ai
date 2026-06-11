import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox'],
});
const filePath = 'file:///' + path.join(__dirname, 'public', 'icon-preview.html').replace(/\\/g, '/');

// 512x512
const page512 = await browser.newPage();
await page512.setViewport({ width: 512, height: 512 });
await page512.goto(filePath, { waitUntil: 'networkidle0' });
await page512.screenshot({ path: path.join(__dirname, 'public', 'icon-512.png'), clip: { x: 0, y: 0, width: 512, height: 512 }, type: 'png' });

// 192x192
const page192 = await browser.newPage();
await page192.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 });
await page192.goto(filePath, { waitUntil: 'networkidle0' });
await page192.screenshot({ path: path.join(__dirname, 'public', 'icon-192.png'), clip: { x: 0, y: 0, width: 192, height: 192 }, type: 'png' });

await browser.close();
console.log('done');
