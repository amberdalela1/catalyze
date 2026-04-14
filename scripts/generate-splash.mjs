/**
 * Generate iOS splash screen images
 * Usage: node scripts/generate-splash.mjs
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1290 2796">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a3c4a0"/>
      <stop offset="100%" style="stop-color:#6b8e6e"/>
    </linearGradient>
  </defs>
  <rect width="1290" height="2796" fill="url(#bg)"/>
  <text x="645" y="1250" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="280" font-weight="bold" fill="white" letter-spacing="5">C</text>
  <text x="645" y="1520" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="100" font-weight="bold" letter-spacing="8">
    <tspan fill="#ffffff">CATALY</tspan><tspan fill="#d4774a">ZE</tspan>
  </text>
  <text x="645" y="1620" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#f5f0e3" letter-spacing="6">
    CONNECT · COLLABORATE · GROW
  </text>
</svg>`;

// iOS splash screen sizes
const splashSizes = [
  { width: 1290, height: 2796, name: 'splash-2796x1290' },  // iPhone 15 Pro Max
  { width: 1179, height: 2556, name: 'splash-2556x1179' },  // iPhone 15 Pro
  { width: 1170, height: 2532, name: 'splash-2532x1170' },  // iPhone 14
  { width: 1125, height: 2436, name: 'splash-2436x1125' },  // iPhone X/XS/11 Pro
  { width: 1242, height: 2688, name: 'splash-2688x1242' },  // iPhone XS Max/11 Pro Max
  { width: 828, height: 1792, name: 'splash-1792x828' },    // iPhone XR/11
  { width: 750, height: 1334, name: 'splash-1334x750' },    // iPhone 8
  { width: 1536, height: 2048, name: 'splash-2048x1536' },  // iPad
  { width: 2048, height: 2732, name: 'splash-2732x2048' },  // iPad Pro
];

async function generateSplash() {
  const outputDir = join(rootDir, 'resources', 'splash');
  mkdirSync(outputDir, { recursive: true });

  const svgBuffer = Buffer.from(splashSvg);

  for (const { width, height, name } of splashSizes) {
    const filename = `${name}.png`;
    await sharp(svgBuffer)
      .resize(width, height, { fit: 'cover' })
      .png()
      .toFile(join(outputDir, filename));
    console.log(`  ✓ ${filename} (${width}x${height})`);
  }

  console.log(`\nAll splash screens generated in: ${outputDir}`);
}

console.log('Generating iOS splash screens...\n');
generateSplash().catch(console.error);
