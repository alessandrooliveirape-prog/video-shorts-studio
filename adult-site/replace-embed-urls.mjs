/**
 * Substituir TODAS as embedUrls falsas nos 328 videos de data.js
 * e nos schemas JSON-LD de todas as páginas video/*.html
 * 
 * Usa 10 sample videos do Google, fazendo ciclo para todos os 328 videos
 */

import { readFileSync, writeFileSync } from 'fs';

/* ---- SAMPLE VIDEOS DISPONÍVEIS ---- */
const BASE = 'https://storage.googleapis.com/gtv-videos-bucket/sample/';
const SAMPLES = [
  'ForBiggerBlazes.mp4',
  'ForBiggerEscapes.mp4',
  'ForBiggerFun.mp4',
  'ForBiggerJoyrides.mp4',
  'ForBiggerMeltdowns.mp4',
  'BigBuckBunny.mp4',
  'ElephantsDream.mp4',
  'Sintel.mp4',
  'SubaruOutbackOnStreetAndDirt.mp4',
  'TearsOfSteel.mp4',
];

/* ---- Helper: get URL for video ID (cycle through samples) ---- */
function getRealUrl(videoId) {
  return BASE + SAMPLES[(videoId - 1) % SAMPLES.length];
}

/* ============================================
   STEP 1: UPDATE data.js
   ============================================ */
let dataContent = readFileSync('js/data.js', 'utf-8');

// Regex to find embedUrl lines:   embedUrl: "https://..."
const embedUrlRegex = /embedUrl:\s*"[^"]*"/g;
const embedUrlMatches = dataContent.match(embedUrlRegex);

if (embedUrlMatches) {
  for (let i = 0; i < embedUrlMatches.length; i++) {
    const videoId = i + 1;
    const newUrl = getRealUrl(videoId);
    const oldStr = embedUrlMatches[i];
    const newStr = `embedUrl: "${newUrl}"`;
    
    // Replace only the first occurrence (in order)
    dataContent = dataContent.replace(oldStr, newStr);
  }
}

writeFileSync('js/data.js', dataContent, 'utf-8');
console.log(`✅ data.js: ${embedUrlMatches ? embedUrlMatches.length : 0} embedUrls updated`);

/* ============================================
   STEP 2: UPDATE video/*.html pages (schema JSON-LD)
   ============================================ */
let pagesUpdated = 0;
let pagesErrors = 0;

for (let videoId = 1; videoId <= 328; videoId++) {
  const filePath = `video/${videoId}.html`;
  const newUrl = getRealUrl(videoId);
  
  try {
    let html = readFileSync(filePath, 'utf-8');
    
    // Replace the embedUrl in the VideoObject schema JSON-LD
    // Pattern: "embedUrl": "https://something..."
    const schemaRegex = /"embedUrl":\s*"[^"]*"/;
    
    if (schemaRegex.test(html)) {
      html = html.replace(schemaRegex, `"embedUrl": "${newUrl}"`);
      writeFileSync(filePath, html, 'utf-8');
      pagesUpdated++;
    } else {
      pagesErrors++;
    }
    
    if (videoId % 100 === 0) {
      console.log(`Progress: ${videoId} video pages processed...`);
    }
  } catch (err) {
    pagesErrors++;
    console.error(`Error on ${filePath}: ${err.message}`);
  }
}

console.log(`✅ video/*.html: ${pagesUpdated} pages updated, ${pagesErrors} errors`);
console.log('\n✅ Complete! All fake embed URLs replaced with real sample video URLs.');
