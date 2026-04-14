/**
 * Generate iOS App Icon PNGs from SVG
 * 
 * Prerequisites: npm install sharp
 * Usage: node scripts/generate-icons.mjs
 * 
 * This creates all required iOS icon sizes in the ios app icon asset catalog.
 */

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// iOS requires these icon sizes
const iosSizes = [
  { size: 20, scales: [2, 3], idiom: 'iphone' },
  { size: 29, scales: [2, 3], idiom: 'iphone' },
  { size: 40, scales: [2, 3], idiom: 'iphone' },
  { size: 60, scales: [2, 3], idiom: 'iphone' },
  { size: 20, scales: [1, 2], idiom: 'ipad' },
  { size: 29, scales: [1, 2], idiom: 'ipad' },
  { size: 40, scales: [1, 2], idiom: 'ipad' },
  { size: 76, scales: [1, 2], idiom: 'ipad' },
  { size: 83.5, scales: [2], idiom: 'ipad' },
  { size: 1024, scales: [1], idiom: 'ios-marketing' },
];

// Simple SVG that creates a proper app icon (no rounded corners - iOS adds them)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a3c4a0"/>
      <stop offset="100%" style="stop-color:#6b8e6e"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <text x="512" y="620" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="520" font-weight="bold" fill="white">C</text>
</svg>`;

async function generateIcons() {
  const outputDir = join(rootDir, 'resources', 'icon');
  mkdirSync(outputDir, { recursive: true });

  const svgBuffer = Buffer.from(iconSvg);
  const images = [];
  const contentsImages = [];

  for (const { size, scales, idiom } of iosSizes) {
    for (const scale of scales) {
      const pixels = Math.round(size * scale);
      const filename = `icon-${size}@${scale}x.png`;
      const outputPath = join(outputDir, filename);

      images.push(
        sharp(svgBuffer)
          .resize(pixels, pixels)
          .png()
          .toFile(outputPath)
          .then(() => console.log(`  ✓ ${filename} (${pixels}x${pixels})`))
      );

      contentsImages.push({
        size: `${size}x${size}`,
        idiom,
        filename,
        scale: `${scale}x`,
      });
    }
  }

  await Promise.all(images);

  // Also generate a standalone 1024x1024 for App Store Connect
  await sharp(svgBuffer).resize(1024, 1024).png().toFile(join(outputDir, 'icon-1024.png'));
  console.log('  ✓ icon-1024.png (1024x1024)');

  // Generate Contents.json for Xcode asset catalog
  const contents = {
    images: contentsImages,
    info: { version: 1, author: 'xcode' },
  };
  writeFileSync(join(outputDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('  ✓ Contents.json');

  console.log(`\nAll icons generated in: ${outputDir}`);
  console.log('Copy these into ios/App/App/Assets.xcassets/AppIcon.appiconset/ after running npx cap add ios');
}

console.log('Generating iOS app icons...\n');
generateIcons().catch(console.error);
