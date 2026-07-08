/**
 * Batch update all video/*.html pages with the new professional player
 * 
 * Changes:
 * 1. Replace ▶ text play button with SVG play button
 * 2. Update "Click to play the video" → "Click to play"
 * 3. Update EMBED.loadIntoPlayer call with autoplay option
 */

import { readFileSync, writeFileSync } from 'fs';

// The SVG play button HTML (minified, single line)
const SVG_PLAY_BTN = `<svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>`;

// Old patterns to replace
const OLD_PLAY_BTN = /<div class="big-play-btn" id="playBtn">▶<\/div>/g;
const NEW_PLAY_BTN = `<div class="big-play-btn" id="playBtn">\n                  ${SVG_PLAY_BTN}\n                </div>`;

const OLD_CLICK_TEXT = /Click to play the video/g;
const NEW_CLICK_TEXT = 'Click to play';

const OLD_EMBED_CALL = /EMBED\.loadIntoPlayer\('playerPlaceholder', video\.embedUrl, video\.title\);/g;
const NEW_EMBED_CALL = `EMBED.loadIntoPlayer('playerPlaceholder', video.embedUrl, video.title, { autoplay: true });`;

let updatedCount = 0;
let errorCount = 0;

// Process all video pages
for (let i = 2; i <= 328; i++) {
  const filePath = `video/${i}.html`;
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let original = content;
    
    // Replace play button
    content = content.replace(OLD_PLAY_BTN, NEW_PLAY_BTN);
    
    // Replace click text
    content = content.replace(OLD_CLICK_TEXT, NEW_CLICK_TEXT);
    
    // Replace embed call
    content = content.replace(OLD_EMBED_CALL, NEW_EMBED_CALL);
    
    if (content !== original) {
      writeFileSync(filePath, content, 'utf-8');
      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log(`Progress: ${updatedCount} files updated...`);
      }
    }
  } catch (err) {
    errorCount++;
    console.error(`Error updating ${filePath}: ${err.message}`);
  }
}

console.log(`\n✅ Complete! Updated ${updatedCount} files. Errors: ${errorCount}`);
