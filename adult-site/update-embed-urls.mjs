/**
 * Update data.js with real working video URLs for first 10 videos
 */
import { readFileSync, writeFileSync } from 'fs';

const REAL_URLS = [
  // Already have URLs for videos 1-3
  4, 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  5, 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  6, 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  7, 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  8, 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  9, 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  10, 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

let content = readFileSync('js/data.js', 'utf-8');
let count = 0;

for (let i = 0; i < REAL_URLS.length; i += 2) {
  const videoId = REAL_URLS[i];
  const newUrl = REAL_URLS[i + 1];
  
  // Find the embedUrl for this video ID and replace it
  const regex = new RegExp(`(id:\\s*${videoId}[\\s\\S]*?embedUrl:\\s*)"[^"]*"`, 'm');
  const match = content.match(regex);
  
  if (match) {
    const oldLine = match[0];
    const newLine = oldLine.replace(/embedUrl:\s*"[^"]*"/, `embedUrl: "${newUrl}"`);
    content = content.replace(oldLine, newLine);
    count++;
    console.log(`Video ${videoId}: URL updated ✓`);
  } else {
    console.log(`Video ${videoId}: Pattern not found ✗`);
  }
}

writeFileSync('js/data.js', content, 'utf-8');
console.log(`\n✅ Complete! Updated ${count} video URLs.`);
