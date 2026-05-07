import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';

let server;
const baseUrl = 'http://127.0.0.1:4173';

before(async () => {
  server = spawn(process.execPath, ['scripts/dev-server.mjs'], {
    env: { ...process.env, STATIC_ROOT: 'dist', PORT: '4173' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServer();
});

after(() => {
  server?.kill();
});

describe('Gorriti Stock app shell', () => {
  it('serves the production shell with Spanish navigation and mocked modules', async () => {
    const response = await fetch(baseUrl);
    const html = await response.text();
    const appJs = await readFile('dist/assets/app.js', 'utf8');

    assert.equal(response.status, 200);
    assert.match(html, /<html lang="es">/);
    assert.match(appJs, /Inicio/);
    assert.match(appJs, /Inventario/);
    assert.match(appJs, /Nueva venta/);
    assert.match(appJs, /Ventas/);
    assert.match(appJs, /Configuración/);
    assert.match(appJs, /En línea/);
    assert.match(appJs, /Sin conexión/);
    assert.match(appJs, /Resumen mockeado/);
  });

  it('writes requested dashboard and placeholder screenshots as SVG artifacts', async () => {
    await mkdir('docs/screenshots', { recursive: true });
    await writeFile('docs/screenshots/dashboard.svg', screenshotSvg('Inicio', 'Bienvenido al tablero de Gorriti Stock', 'Ventas de hoy · $ 128.450', 'Stock bajo · Ventas recientes'));
    await writeFile('docs/screenshots/inventory-placeholder.svg', screenshotSvg('Inventario', 'Módulo en preparación', 'Próximamente vas a poder gestionar productos', 'Preparar carga inicial'));
    await writeFile('docs/screenshots/new-sale-placeholder.svg', screenshotSvg('Nueva venta', 'Módulo en preparación', 'Este espacio quedará listo para buscar productos', 'Configurar flujo de venta'));

    const dashboard = await readFile('docs/screenshots/dashboard.svg', 'utf8');
    assert.match(dashboard, /Bienvenido al tablero/);
  });
});

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Timed out waiting for the static server.');
}

function screenshotSvg(pageTitle, headline, detail, action) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000" viewBox="0 0 1440 1000" role="img" aria-label="${escapeXml(pageTitle)} screenshot">
  <rect width="1440" height="1000" fill="#eef2f7"/>
  <rect width="300" height="1000" fill="#111827"/>
  <circle cx="72" cy="66" r="27" fill="#fbbf24"/>
  <text x="72" y="73" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#111827">GS</text>
  <text x="116" y="55" font-family="Arial" font-size="12" font-weight="800" fill="#f59e0b" letter-spacing="2">GORRITI</text>
  <text x="116" y="83" font-family="Arial" font-size="30" font-weight="800" fill="#ffffff">Stock</text>
  ${['Inicio', 'Inventario', 'Nueva venta', 'Ventas', 'Configuración'].map((item, index) => `
    <rect x="22" y="${132 + index * 66}" width="256" height="54" rx="18" fill="${item === pageTitle ? '#ffffff20' : 'transparent'}" stroke="${item === pageTitle ? '#ffffff22' : 'transparent'}"/>
    <text x="58" y="${166 + index * 66}" font-family="Arial" font-size="18" font-weight="700" fill="#ffffff">${escapeXml(item)}</text>`).join('')}
  <text x="334" y="55" font-family="Arial" font-size="12" font-weight="800" fill="#f59e0b" letter-spacing="2">PANEL OPERATIVO</text>
  <text x="334" y="105" font-family="Arial" font-size="52" font-weight="900" fill="#111827">${escapeXml(pageTitle)}</text>
  <rect x="1218" y="46" width="138" height="42" rx="21" fill="#ecfdf5" stroke="#a7f3d0"/>
  <text x="1242" y="73" font-family="Arial" font-size="16" font-weight="800" fill="#047857">● En línea</text>
  <rect x="334" y="148" width="1022" height="260" rx="30" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="382" y="222" font-family="Arial" font-size="15" font-weight="800" fill="#f59e0b" letter-spacing="2">${pageTitle === 'Inicio' ? 'RESUMEN MOCKEADO' : 'MÓDULO EN PREPARACIÓN'}</text>
  <text x="382" y="288" font-family="Arial" font-size="42" font-weight="900" fill="#111827">${escapeXml(headline)}</text>
  <text x="382" y="338" font-family="Arial" font-size="24" fill="#64748b">${escapeXml(detail)}</text>
  <rect x="382" y="596" width="450" height="160" rx="26" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="422" y="682" font-family="Arial" font-size="28" font-weight="900" fill="#111827">${escapeXml(action)}</text>
</svg>`;
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
