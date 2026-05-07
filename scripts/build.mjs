import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const distDir = 'dist';
await mkdir(join(distDir, 'assets'), { recursive: true });

const html = await readFile('index.html', 'utf8');
const productionHtml = html
  .replace('/src/styles.css', './assets/styles.css')
  .replace('/src/app.ts', './assets/app.js');

await writeFile(join(distDir, 'index.html'), productionHtml);
await copyFile('src/styles.css', join(distDir, 'assets', 'styles.css'));
await mkdir(dirname(join(distDir, '.gitkeep')), { recursive: true });
