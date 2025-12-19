#!/usr/bin/env node

/**
 * Quick Tunnel URL Monitor
 * Monitora l'URL del Quick Tunnel e invia notifiche email quando cambia
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

// Configurazione
const URL_FILE = '/app/.quicktunnel-url';
const CHECK_INTERVAL = 30000; // 30 secondi
const CONTAINER_NAME = 'sphyra-quicktunnel';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const NOTIFY_EMAIL = process.env.QUICKTUNNEL_NOTIFY_EMAIL;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@sphyrawellness.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Sphyra Wellness Lab';

console.log('🔍 Quick Tunnel URL Monitor - Avviato');
console.log('========================================');
console.log(`📧 Notifiche email: ${NOTIFY_EMAIL ? 'ATTIVE' : 'DISATTIVATE'}`);
console.log(`⏱️  Intervallo controllo: ${CHECK_INTERVAL / 1000}s`);
console.log('========================================\n');

let lastKnownUrl = null;
let monitorStartTime = new Date();

/**
 * Legge l'ultimo URL salvato
 */
function getLastSavedUrl() {
  try {
    if (fs.existsSync(URL_FILE)) {
      return fs.readFileSync(URL_FILE, 'utf8').trim();
    }
  } catch (error) {
    console.error(`❌ Errore lettura file URL: ${error.message}`);
  }
  return null;
}

/**
 * Salva l'URL nel file
 */
function saveUrl(url) {
  try {
    fs.writeFileSync(URL_FILE, url);
    console.log(`💾 URL salvato: ${url}`);
  } catch (error) {
    console.error(`❌ Errore salvataggio URL: ${error.message}`);
  }
}

/**
 * Ottiene l'URL corrente dal container cloudflared
 */
function getCurrentUrl() {
  try {
    const logs = execSync(
      `docker logs ${CONTAINER_NAME} 2>&1 | grep -o 'https://[a-z0-9-]*\\.trycloudflare\\.com' | head -1`,
      { encoding: 'utf8' }
    ).trim();

    return logs || null;
  } catch (error) {
    // Container non ancora pronto o non disponibile
    return null;
  }
}

/**
 * Invia email tramite SendGrid
 */
function sendEmail(subject, htmlContent, textContent) {
  return new Promise((resolve, reject) => {
    if (!SENDGRID_API_KEY) {
      console.log('⚠️  SendGrid API Key non configurata, skip email');
      return resolve();
    }

    if (!NOTIFY_EMAIL) {
      console.log('⚠️  Email destinatario non configurata, skip email');
      return resolve();
    }

    const data = JSON.stringify({
      personalizations: [{
        to: [{ email: NOTIFY_EMAIL }],
        subject: subject
      }],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      content: [
        {
          type: 'text/plain',
          value: textContent
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 202) {
        console.log('✅ Email inviata con successo');
        resolve();
      } else {
        console.error(`❌ Errore invio email: ${res.statusCode}`);
        reject(new Error(`Status code: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      console.error(`❌ Errore rete: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Invia notifica di nuovo URL
 */
async function notifyUrlChange(oldUrl, newUrl) {
  const timestamp = new Date().toLocaleString('it-IT');

  console.log('\n========================================');
  console.log('🚨 CAMBIO URL RILEVATO!');
  console.log('========================================');
  console.log(`🕐 Data/Ora: ${timestamp}`);
  console.log(`📍 Vecchio URL: ${oldUrl || 'N/A'}`);
  console.log(`🆕 Nuovo URL: ${newUrl}`);
  console.log('========================================\n');

  // Email HTML
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .url-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
    .url { color: #667eea; font-size: 18px; font-weight: bold; word-break: break-all; }
    .old-url { color: #999; text-decoration: line-through; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Quick Tunnel URL Cambiato</h1>
      <p>Sphyra Wellness Lab</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚠️ Attenzione:</strong> L'URL del tuo Quick Tunnel è cambiato!
      </div>

      <p><strong>🕐 Data/Ora:</strong> ${timestamp}</p>

      ${oldUrl ? `
      <h3>📍 Vecchio URL (non più valido):</h3>
      <div class="url-box">
        <div class="url old-url">${oldUrl}</div>
      </div>
      ` : ''}

      <h3>🆕 Nuovo URL (attivo ora):</h3>
      <div class="url-box">
        <div class="url">${newUrl}</div>
        <a href="${newUrl}" class="button">🌐 Apri Applicazione</a>
      </div>

      <div class="alert-box">
        <strong>💡 Suggerimento:</strong> Aggiorna tutti i collegamenti salvati con il nuovo URL.
        Per un URL permanente che non cambia, considera di passare al Named Tunnel con dominio personalizzato.
      </div>

      <h3>📋 Informazioni:</h3>
      <ul>
        <li>Il Quick Tunnel genera automaticamente URL casuali</li>
        <li>L'URL cambia ad ogni riavvio del container</li>
        <li>Questo è normale e previsto dal servizio</li>
      </ul>

      <div class="footer">
        <p>Questo è un messaggio automatico dal sistema di monitoraggio Quick Tunnel</p>
        <p>Sphyra Wellness Lab - Gestione Centro Estetico</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Email Text
  const textContent = `
QUICK TUNNEL URL CAMBIATO
========================

Data/Ora: ${timestamp}

${oldUrl ? `Vecchio URL (non più valido):
${oldUrl}

` : ''}Nuovo URL (attivo ora):
${newUrl}

⚠️ IMPORTANTE:
- Aggiorna tutti i collegamenti salvati con il nuovo URL
- Il Quick Tunnel genera URL casuali ad ogni riavvio
- Per un URL permanente, usa il Named Tunnel con dominio personalizzato

---
Sphyra Wellness Lab
Questo è un messaggio automatico dal sistema di monitoraggio
  `;

  try {
    await sendEmail(
      `🚨 Quick Tunnel URL Cambiato - ${new Date().toLocaleDateString('it-IT')}`,
      htmlContent,
      textContent
    );
  } catch (error) {
    console.error('❌ Errore invio notifica email:', error.message);
  }
}

/**
 * Invia notifica di primo avvio
 */
async function notifyFirstStart(url) {
  const timestamp = new Date().toLocaleString('it-IT');

  console.log('\n========================================');
  console.log('🎉 QUICK TUNNEL ATTIVO!');
  console.log('========================================');
  console.log(`🕐 Data/Ora: ${timestamp}`);
  console.log(`🌐 URL: ${url}`);
  console.log('========================================\n');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .url-box { background: white; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
    .url { color: #10b981; font-size: 18px; font-weight: bold; word-break: break-all; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Quick Tunnel Attivo!</h1>
      <p>Sphyra Wellness Lab</p>
    </div>
    <div class="content">
      <p><strong>🕐 Data/Ora:</strong> ${timestamp}</p>

      <h3>🌐 Il tuo sito è ora accessibile pubblicamente:</h3>
      <div class="url-box">
        <div class="url">${url}</div>
        <a href="${url}" class="button">🌐 Apri Applicazione</a>
      </div>

      <div class="info-box">
        <strong>ℹ️ Informazioni:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Questo URL è TEMPORANEO</li>
          <li>Cambierà ad ogni riavvio del container</li>
          <li>Riceverai una email quando l'URL cambia</li>
        </ul>
      </div>

      <h3>🔐 Primo Accesso:</h3>
      <ul>
        <li><strong>Username:</strong> admin</li>
        <li><strong>Password:</strong> admin123</li>
        <li>⚠️ Cambia la password subito dopo il login!</li>
      </ul>

      <div class="footer">
        <p>Questo è un messaggio automatico dal sistema di monitoraggio Quick Tunnel</p>
        <p>Sphyra Wellness Lab - Gestione Centro Estetico</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
QUICK TUNNEL ATTIVO!
===================

Data/Ora: ${timestamp}

Il tuo sito è ora accessibile pubblicamente:
${url}

ℹ️ INFORMAZIONI:
- Questo URL è TEMPORANEO
- Cambierà ad ogni riavvio del container
- Riceverai una email quando l'URL cambia

🔐 PRIMO ACCESSO:
Username: admin
Password: admin123
⚠️ Cambia la password subito dopo il login!

---
Sphyra Wellness Lab
Questo è un messaggio automatico dal sistema di monitoraggio
  `;

  try {
    await sendEmail(
      `🎉 Quick Tunnel Attivo - ${new Date().toLocaleDateString('it-IT')}`,
      htmlContent,
      textContent
    );
  } catch (error) {
    console.error('❌ Errore invio notifica email:', error.message);
  }
}

/**
 * Ciclo principale di monitoraggio
 */
async function monitorLoop() {
  const currentUrl = getCurrentUrl();

  if (currentUrl) {
    // URL rilevato
    if (lastKnownUrl === null) {
      // Primo rilevamento dall'avvio del monitor
      const savedUrl = getLastSavedUrl();

      if (savedUrl && savedUrl !== currentUrl) {
        // URL diverso da quello salvato = cambio URL
        await notifyUrlChange(savedUrl, currentUrl);
      } else if (!savedUrl) {
        // Primo avvio assoluto
        await notifyFirstStart(currentUrl);
      } else {
        console.log(`✅ URL confermato: ${currentUrl}`);
      }

      lastKnownUrl = currentUrl;
      saveUrl(currentUrl);
    } else if (currentUrl !== lastKnownUrl) {
      // URL cambiato durante il monitoraggio
      await notifyUrlChange(lastKnownUrl, currentUrl);
      lastKnownUrl = currentUrl;
      saveUrl(currentUrl);
    } else {
      // Tutto OK, nessun cambio
      const uptime = Math.floor((new Date() - monitorStartTime) / 1000);
      console.log(`✓ URL stabile (uptime: ${uptime}s)`);
    }
  } else {
    console.log('⏳ Attendo generazione URL...');
  }
}

/**
 * Gestione graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n👋 Ricevuto SIGTERM, arresto graceful...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Ricevuto SIGINT, arresto graceful...');
  process.exit(0);
});

/**
 * Avvio monitoraggio
 */
console.log('🚀 Avvio monitoraggio URL...\n');

// Carica ultimo URL salvato
lastKnownUrl = getLastSavedUrl();
if (lastKnownUrl) {
  console.log(`📋 Ultimo URL salvato: ${lastKnownUrl}\n`);
}

// Primo check immediato
monitorLoop();

// Loop continuo
setInterval(monitorLoop, CHECK_INTERVAL);
