import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read data.js
const dataPath = join(__dirname, 'js', 'data.js');
let dataContent = readFileSync(dataPath, 'utf-8');

// Count how many videos are in data.js
const videoCount = (dataContent.match(/id:\s*\d+/g) || []).length;
console.log(`📊 data.js has ${videoCount} videos`);

// Read each video HTML page and extract the real embedUrl
const realUrls = [];
for (let i = 1; i <= videoCount; i++) {
  const htmlPath = join(__dirname, 'video', `${i}.html`);
  try {
    const html = readFileSync(htmlPath, 'utf-8');
    // Extract embedUrl from schema.org VideoObject JSON-LD
    const match = html.match(/"embedUrl":\s*"([^"]+)"/);
    if (match) {
      realUrls.push({ id: i, url: match[1] });
    } else {
      console.log(`⚠️  Video ${i}: no embedUrl found in schema`);
      realUrls.push({ id: i, url: null });
    }
  } catch (err) {
    console.log(`⚠️  Video ${i}: file not found`);
    realUrls.push({ id: i, url: null });
  }
}

console.log(`\n📥 Extracted ${realUrls.filter(u => u.url).length} real URLs from HTML pages`);
console.log(`❌ ${realUrls.filter(u => !u.url).length} missing URLs`);

// Now replace embedUrl values in data.js
// We replace them IN ORDER (video 1 gets URL 1, video 2 gets URL 2, etc.)
let updatedContent = dataContent;
let count = 0;

// Use a regex to find each embedUrl line and replace it
// Match: embedUrl: "..." or embedUrl: '...'
let index = 0;
updatedContent = updatedContent.replace(/embedUrl:\s*["'][^"']+["']/g, (match) => {
  const entry = realUrls[index];
  index++;
  if (entry && entry.url) {
    count++;
    return `embedUrl: "${entry.url}"`;
  }
  return match; // keep original if no real URL found
});

// Write back
writeFileSync(dataPath, updatedContent, 'utf-8');
console.log(`\n✅ ${count}/${videoCount} embed URLs updated in data.js`);

// Count real vs fake URLs in updated data.js
const epornerCount = (updatedContent.match(/eporner\.com\/embed\//g) || []).length;
const realPlatformCount = (updatedContent.match(/embedUrl:\s*["']https:\/\/(?:www\.)?(?:eporner|pornhub|xvideos|xhamster|xnxx|redtube)/g) || []).length;
console.log(`🔗 Eporner URLs: ${epornerCount}`);
console.log(`🔗 Real platform URLs: ${realPlatformCount}`);
