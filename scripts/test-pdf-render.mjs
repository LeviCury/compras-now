#!/usr/bin/env node
/**
 * Smoke test: abre o app, clica em Exportar -> Baixar PDF, salva o PDF,
 * tira print do componente ExecutiveSummaryPDF que esta no DOM e exporta
 * tanto o PDF baixado quanto o screenshot do componente em alta resolucao.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'test-output');

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  console.log('[pwt] navegando para http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Aguarda o card de KPIs aparecer (sinal que data foi carregada)
  await page.waitForSelector('text=Cabecas compradas', { timeout: 10_000 });
  console.log('[pwt] dashboard carregado');

  // Tira print do PresentationPdf antes (que esta off-screen) reaplicando
  // estilos para a captura. Localizamos via data attribute.
  const pdfElement = page.locator('[data-pdf-page="1"]').first();
  await pdfElement.waitFor({ state: 'attached', timeout: 5_000 });

  console.log('[pwt] capturando screenshot do componente ExecutiveSummaryPDF...');
  // Forca o componente a ficar visivel temporariamente
  await page.evaluate(() => {
    const wrapper = document.querySelector('[data-pdf-page="1"]')?.parentElement?.parentElement;
    if (wrapper instanceof HTMLElement) {
      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.opacity = '1';
      wrapper.style.zIndex = '999999';
      wrapper.style.background = 'white';
      wrapper.style.pointerEvents = 'auto';
    }
  });

  await page.waitForTimeout(400);

  const screenshotPath = path.join(OUT_DIR, 'pdf-component.png');
  await pdfElement.screenshot({ path: screenshotPath, scale: 'css' });
  console.log(`[pwt] screenshot salvo em ${screenshotPath}`);

  // Crop especifico do badge de spread pra inspecionar
  const spreadCells = page.locator('[data-pdf-page="1"] tbody tr td:last-child');
  const count = await spreadCells.count();
  console.log(`[pwt] ${count} celulas de spread encontradas`);

  // Tira screenshot dedicada da regiao das tabelas
  const tables = page.locator('[data-pdf-page="1"] table');
  const tableCount = await tables.count();
  for (let i = 0; i < tableCount; i++) {
    const tablePath = path.join(OUT_DIR, `pdf-table-${i + 1}.png`);
    await tables.nth(i).screenshot({ path: tablePath, scale: 'css' });
    console.log(`[pwt]   tabela ${i + 1} -> ${tablePath}`);
  }

  // Verifica o conteudo de texto dos badges
  const badges = await page.evaluate(() => {
    const cells = Array.from(
      document.querySelectorAll('[data-pdf-page="1"] tbody tr td:last-child'),
    );
    return cells.map((c) => ({
      text: c.textContent?.trim() ?? '',
      innerHTML: (c.innerHTML ?? '').slice(0, 220),
    }));
  });
  console.log('[pwt] conteudo dos badges:');
  for (const b of badges) {
    console.log(`  - "${b.text}"`);
  }

  // Agora reverte e tenta o download de verdade
  await page.evaluate(() => {
    const wrapper = document.querySelector('[data-pdf-page="1"]')?.parentElement?.parentElement;
    if (wrapper instanceof HTMLElement) {
      wrapper.style.position = '';
      wrapper.style.left = '-10000px';
      wrapper.style.opacity = '0';
      wrapper.style.zIndex = '';
      wrapper.style.background = '';
      wrapper.style.pointerEvents = 'none';
    }
  });

  console.log('[pwt] clicando em Exportar...');
  await page.getByRole('button', { name: /exportar/i }).click();
  await page.waitForSelector('text=/Baixar Resumo Executivo|Baixar PDF/i', { timeout: 5_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: /Baixar Resumo Executivo/i }).click();

  const download = await downloadPromise;
  const pdfPath = path.join(OUT_DIR, 'compras-now.pdf');
  await download.saveAs(pdfPath);
  console.log(`[pwt] PDF salvo em ${pdfPath}`);

  await browser.close();
  console.log('[pwt] OK');
}

main().catch((err) => {
  console.error('[pwt] ERRO:', err);
  process.exit(1);
});
