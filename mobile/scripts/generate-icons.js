#!/usr/bin/env node

/**
 * Script per generare icone Android da un'immagine sorgente
 * Usa sharp per ridimensionare le immagini
 */

const fs = require('fs');
const path = require('path');

// Configurazione dimensioni icone Android
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const SOURCE_IMAGE = path.join(__dirname, '../../public/Sphyra_logo.png');
const OUTPUT_DIR = path.join(__dirname, '../android/app/src/main/res');

async function generateIcons() {
  console.log('🎨 Generazione icone Android per Sphyra Wellness Lab...\n');

  // Verifica se sharp è disponibile
  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.log('⚠️  sharp non disponibile, installo...');
    console.log('Esegui: npm install --save-dev sharp\n');

    // Alternativa: copia diretta dell'immagine
    console.log('📋 Copio il logo Sphyra nelle cartelle mipmap...\n');
    copyLogoDirectly();
    return;
  }

  // Verifica che l'immagine sorgente esista
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`❌ Immagine sorgente non trovata: ${SOURCE_IMAGE}`);
    process.exit(1);
  }

  console.log(`📷 Immagine sorgente: ${SOURCE_IMAGE}\n`);

  // Genera icone per ogni dimensione
  for (const [folder, size] of Object.entries(ICON_SIZES)) {
    const outputFolder = path.join(OUTPUT_DIR, folder);

    // Crea cartella se non esiste
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const outputFile = path.join(outputFolder, 'ic_launcher.png');

    try {
      await sharp(SOURCE_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputFile);

      console.log(`✅ ${folder}/ic_launcher.png (${size}x${size})`);
    } catch (err) {
      console.error(`❌ Errore generando ${folder}:`, err.message);
    }

    // Genera anche ic_launcher_round.png
    const outputFileRound = path.join(outputFolder, 'ic_launcher_round.png');
    try {
      await sharp(SOURCE_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputFileRound);

      console.log(`✅ ${folder}/ic_launcher_round.png (${size}x${size})`);
    } catch (err) {
      console.error(`❌ Errore generando ${folder} round:`, err.message);
    }
  }

  console.log('\n🎉 Icone Android generate con successo!');
  console.log('\n📱 Le icone sono pronte per il build APK.');
}

function copyLogoDirectly() {
  // Copia diretta del logo in tutte le cartelle mipmap
  for (const folder of Object.keys(ICON_SIZES)) {
    const outputFolder = path.join(OUTPUT_DIR, folder);

    // Crea cartella se non esiste
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const outputFile = path.join(outputFolder, 'ic_launcher.png');
    const outputFileRound = path.join(outputFolder, 'ic_launcher_round.png');

    // Copia logo
    fs.copyFileSync(SOURCE_IMAGE, outputFile);
    fs.copyFileSync(SOURCE_IMAGE, outputFileRound);

    console.log(`✅ ${folder}/ic_launcher.png (copiato)`);
    console.log(`✅ ${folder}/ic_launcher_round.png (copiato)`);
  }

  console.log('\n⚠️  NOTA: Le icone sono state copiate direttamente.');
  console.log('Android le ridimensionerà automaticamente, ma per risultati ottimali');
  console.log('installa sharp: npm install --save-dev sharp');
  console.log('Poi riesegui: node mobile/scripts/generate-icons.js\n');
}

// Esegui
generateIcons().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
