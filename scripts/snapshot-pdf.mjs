#!/usr/bin/env node
/**
 * Abre o PDF gerado e tira print da primeira pagina pra validacao visual.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'test-output');

async function main() {
  const pdfPath = path.join(OUT_DIR, 'compras-now.pdf');
  const fileUrl = 'file:///' + pdfPath.replace(/\\/g, '/');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1300 },
  });
  const page = await context.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const screenshotPath = path.join(OUT_DIR, 'pdf-rendered.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[pwt] PDF renderizado em ${screenshotPath}`);
  await browser.close();
}

main().catch((err) => {
  console.error('[pwt] ERRO:', err);
  process.exit(1);
});
