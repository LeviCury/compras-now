#!/usr/bin/env node
/**
 * Captura screenshot do chart "Preco medio por origem" no dashboard pra validar
 * que a legenda Boi/Vaca esta com as cores corretas (nao preto sobre fundo escuro).
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'test-output');

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  await page.waitForSelector('text=Preco medio por origem', { timeout: 8000 });
  await page.waitForTimeout(800); // aguarda chart animar

  // Captura a area do chart inteira via XPath que sobe ate o card pai
  const chartArea = await page.locator('h2:has-text("Preco medio por origem")').evaluateHandle((el) => {
    let parent = el.parentElement;
    while (parent && !parent.classList.contains('card-padded')) {
      parent = parent.parentElement;
    }
    return parent;
  });
  const chartScreenshot = path.join(OUT_DIR, 'price-chart-legend.png');
  await chartArea.asElement()?.screenshot({ path: chartScreenshot });
  console.log(`[pwt] price chart screenshot -> ${chartScreenshot}`);

  // Also inspect actual color values of the legend text in the DOM
  const legendInfo = await page.evaluate(() => {
    const legendItems = Array.from(
      document.querySelectorAll('.recharts-legend-item-text'),
    );
    return legendItems.slice(0, 8).map((el) => ({
      text: el.textContent?.trim() ?? '',
      computedColor: window.getComputedStyle(el).color,
    }));
  });
  console.log('[pwt] legend items:');
  for (const item of legendInfo) {
    console.log(`  - "${item.text}" -> color: ${item.computedColor}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('[pwt] ERRO:', err);
  process.exit(1);
});
