/**
 * Generate iOS App Icon PNGs from source icon
 * 
 * Prerequisites: npm install sharp
 * Usage: node scripts/generate-icons.mjs
 * 
 * Resizes resources/icon/icon-1024.png to all required iOS icon sizes.
 */

import sharp from 'sharp';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
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

async function generateIcons() {
  const outputDir = join(rootDir, 'resources', 'icon');
  const sourceIcon = join(outputDir, 'icon-1024.png');

  if (!existsSync(sourceIcon)) {
    console.error('Source icon not found: ' + sourceIcon);
    console.error('Place a 1024x1024 PNG at resources/icon/icon-1024.png first.');
    process.exit(1);
  }

  const source = sharp(sourceIcon).flatten({ background: '#ffffff' });

  const images = [];
  const contentsImages = [];

  for (const { size, scales, idiom } of iosSizes) {
    for (const scale of scales) {
      const pixels = Math.round(size * scale);
      const filename = `icon-${size}@${scale}x.png`;
      const outputPath = join(outputDir, filename);

      images.push(
        source
          .clone()
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

  // Generate Contents.json for Xcode asset catalog
  const contents = {
    images: contentsImages,
    info: { version: 1, author: 'xcode' },
  };
  writeFileSync(join(outputDir, 'Contents.json'), JSON.stringify(contents, null, 2));
  console.log('  ✓ Contents.json');

  // Copy 1024x1024 to iOS asset catalog
  const xcodeIconDir = join(rootDir, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  if (existsSync(xcodeIconDir)) {
    await source.clone().resize(1024, 1024).png().toFile(join(xcodeIconDir, 'AppIcon-512@2x.png'));
    console.log('  ✓ Copied to ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  }

  console.log(`\nAll icons generated from: ${sourceIcon}`);
}

console.log('Generating iOS app icons from source PNG...\n');
generateIcons().catch(console.error);
