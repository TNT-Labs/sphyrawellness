#!/usr/bin/env node

/**
 * Script per generare il file version.json
 * Questo file viene utilizzato per rilevare nuove versioni dell'app
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leggi la versione dal package.json
function getPackageVersion() {
  const packageJsonPath = join(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

// Genera il file version.json
function generateVersionFile() {
  try {
    const version = getPackageVersion();
    const buildTime = new Date().toISOString();
    const buildTimestamp = Date.now();

    const versionInfo = {
      version,
      buildTime,
      buildTimestamp,
      // Hash del build basato su timestamp per identificare univocamente ogni build
      buildHash: buildTimestamp.toString(36)
    };

    const outputPath = join(__dirname, '../public/version.json');
    writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

    console.log('✓ File version.json generato con successo:');
    console.log(`  Version: ${version}`);
    console.log(`  Build Time: ${buildTime}`);
    console.log(`  Build Hash: ${versionInfo.buildHash}`);
  } catch (error) {
    console.error('✗ Errore nella generazione di version.json:', error);
    process.exit(1);
  }
}

generateVersionFile();
