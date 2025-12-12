# 🔒 Deploy HTTPS - Sphyra Wellness Lab

Questa directory contiene la **configurazione completa per deploy HTTPS** con Traefik e Let's Encrypt.

---

## 📁 Struttura File

```
sphyrawellness/
├── 📘 HTTPS-DEPLOYMENT.md          ← Documentazione completa (LEGGI PRIMA!)
├── 📘 QUICK-START-HTTPS.md         ← Guida rapida 5 minuti
├── 🚀 deploy-https.sh               ← Script deploy automatico
│
├── 🐳 docker-compose.https.yml      ← Compose file HTTPS
├── 🐳 Dockerfile.https              ← Frontend per HTTPS
├── ⚙️  .env.https.example           ← Template configurazione
│
└── 📁 traefik/
    ├── traefik.yml                  ← Config statica Traefik
    └── dynamic/
        └── security.yml             ← Headers e middleware
```

---

## 🚀 Quick Start

### 1. Configura Dominio

Aggiungi record DNS:
```
A     @       YOUR_SERVER_IP
A     www     YOUR_SERVER_IP
```

### 2. Configura Environment

```bash
cp .env.https.example .env
nano .env  # Modifica DOMAIN, EMAIL, PASSWORD
```

### 3. Deploy Automatico

```bash
./deploy-https.sh
```

**Oppure manualmente:**

```bash
docker compose -f docker-compose.https.yml up -d --build
```

### 4. Verifica

```bash
# Browser
https://your-domain.com

# cURL
curl -I https://your-domain.com
```

---

## 📚 Documentazione

- **[HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md)**: Guida completa
  - Architettura
  - Configurazione dettagliata
  - Testing HTTPS
  - Gestione certificati
  - Troubleshooting
  - Sicurezza

- **[QUICK-START-HTTPS.md](./QUICK-START-HTTPS.md)**: Guida rapida
  - Deploy in 5 step
  - Comandi essenziali
  - Troubleshooting rapido

---

## ✅ Funzionalità

✅ **Certificati SSL/TLS automatici** (Let's Encrypt)
✅ **Redirect HTTP → HTTPS** automatico
✅ **TLS 1.2/1.3** configurato
✅ **Security Headers**: HSTS, CSP, X-Frame-Options
✅ **Database privato** (non esposto)
✅ **Rinnovo certificati** automatico
✅ **Health checks** su tutti i servizi
✅ **Logging** centralizzato

---

## 🔧 Comandi Utili

```bash
# Status servizi
docker compose -f docker-compose.https.yml ps

# Logs in tempo reale
docker compose -f docker-compose.https.yml logs -f

# Logs Traefik (certificati)
docker logs sphyra-traefik -f

# Restart servizio
docker compose -f docker-compose.https.yml restart frontend

# Stop tutto
docker compose -f docker-compose.https.yml down
```

---

## 🐛 Troubleshooting

| Problema | Comando |
|----------|---------|
| Certificato non ottenuto | `docker logs sphyra-traefik` |
| DNS non risolve | `nslookup your-domain.com` |
| Porte occupate | `sudo netstat -tlnp \| grep ':80\|:443'` |
| Test configurazione | `docker compose -f docker-compose.https.yml config` |

**Vedi [HTTPS-DEPLOYMENT.md#troubleshooting](./HTTPS-DEPLOYMENT.md#troubleshooting) per soluzioni dettagliate.**

---

## 🔐 Sicurezza

### Checklist

- [ ] Dominio configurato e DNS funzionante
- [ ] File `.env` con password sicure
- [ ] Firewall con solo porte 80/443 aperte
- [ ] Dashboard Traefik disabilitato in production
- [ ] Backup certificati configurato
- [ ] SSL Labs rating A/A+

### Test Sicurezza

```bash
# SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Security Headers
https://securityheaders.com/?q=your-domain.com

# Mozilla Observatory
https://observatory.mozilla.org/analyze/your-domain.com
```

---

## 📊 Architettura

```
                  Internet
                     ↓
              Traefik :443 (HTTPS)
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    Frontend     Backend      CouchDB
    (Nginx)     (Node.js)    (Private)
      :80         :3001        :5984
```

**Rete Interna**: Database NON esposto pubblicamente
**Rete Pubblica**: Solo Frontend e Backend via Traefik

---

## 🎯 Best Practices

1. ✅ Testa con certificati staging prima di production
2. ✅ Backup regolari certificati e database
3. ✅ Monitora scadenza certificati
4. ✅ Aggiorna Docker e immagini regolarmente
5. ✅ Non committare `.env` su Git

---

## 📞 Support

Per problemi:

1. Leggi [HTTPS-DEPLOYMENT.md](./HTTPS-DEPLOYMENT.md)
2. Controlla logs: `docker logs sphyra-traefik -f`
3. Verifica configurazione: `docker compose -f docker-compose.https.yml config`

---

## 🔗 Link Utili

- [Traefik Docs](https://doc.traefik.io/traefik/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

**🎉 Buon deploy!**
