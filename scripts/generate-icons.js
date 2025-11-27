import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

// Leggi l'SVG sorgente
const svgContent = readFileSync(join(publicDir, 'icon.svg'), 'utf-8');

// Funzione per creare un PNG placeholder (base64)
function createPNGPlaceholder(size, color = '#db2777') {
  // Crea un SVG semplice da convertire
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#db2777;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size/4}" fill="url(#grad)"/>
  <g fill="white">
    <circle cx="${size/2}" cy="${size*0.35}" r="${size*0.078}" opacity="0.9"/>
    <path d="M${size/2} ${size*0.47} Q${size*0.39} ${size*0.55} ${size*0.35} ${size*0.66} Q${size*0.34} ${size*0.70} ${size*0.35} ${size*0.74} Q${size*0.37} ${size*0.80} ${size*0.43} ${size*0.82} Q${size*0.47} ${size*0.83} ${size/2} ${size*0.82} Q${size*0.53} ${size*0.83} ${size*0.57} ${size*0.82} Q${size*0.63} ${size*0.80} ${size*0.65} ${size*0.74} Q${size*0.66} ${size*0.70} ${size*0.65} ${size*0.66} Q${size*0.61} ${size*0.55} ${size/2} ${size*0.47} Z" opacity="0.9"/>
    <ellipse cx="${size*0.39}" cy="${size*0.39}" rx="${size*0.049}" ry="${size*0.068}" opacity="0.7"/>
    <ellipse cx="${size*0.61}" cy="${size*0.39}" rx="${size*0.049}" ry="${size*0.068}" opacity="0.7"/>
  </g>
  <text x="${size/2}" y="${size*0.94}" font-family="Arial, sans-serif" font-size="${size*0.125}" font-weight="bold" fill="white" text-anchor="middle">SW</text>
</svg>`;

  return svg;
}

// Crea le icone nelle dimensioni richieste
const sizes = [192, 512];

console.log('🎨 Generazione icone PWA...\n');

sizes.forEach(size => {
  const svg = createPNGPlaceholder(size);
  const filename = `pwa-${size}x${size}.svg`;
  const filepath = join(publicDir, filename);

  writeFileSync(filepath, svg);
  console.log(`✓ Creato ${filename}`);
});

// Crea apple-touch-icon
const appleTouchIcon = createPNGPlaceholder(180);
writeFileSync(join(publicDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('✓ Creato apple-touch-icon.svg');

// Crea favicon.ico placeholder (in realtà un SVG)
writeFileSync(join(publicDir, 'favicon.ico'), readFileSync(join(publicDir, 'favicon.svg')));
console.log('✓ Creato favicon.ico');

console.log('\n✨ Icone generate con successo!');
console.log('\nNOTA: Per una produzione ottimale, converti le icone SVG in PNG usando:');
console.log('- Uno strumento online come https://svgtopng.com');
console.log('- Oppure installa sharp: npm install -D sharp');
