# Let's Encrypt Setup Guide for Sphyra Wellness

## Quick Start

### Prerequisites

1. **Public domain** (e.g., `example.com`)
2. **DNS configured** to point to your server's public IP
3. **Ports 80 and 443** open and reachable
4. **Docker** and **Docker Compose** installed

### Setup

#### 1. Configure Environment

```bash
cp .env.letsencrypt.example .env
```

Edit `.env` and set:

```bash
DOMAIN=example.com
EMAIL=your@email.com
STAGING=0  # 0 = production, 1 = staging (test)

# Database credentials
COUCHDB_USER=admin
COUCHDB_PASSWORD=your-secure-password

# JWT Secret
JWT_SECRET=your-random-secret-string
```

#### 2. Generate Certificates

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

#### 3. Start Services

```bash
docker-compose -f docker-compose.letsencrypt.yml up -d
```

#### 4. Verify

Open your browser and navigate to:

```
https://your-domain.com
```

You should see a valid HTTPS connection with no warnings.

## Features

✅ **Free** SSL/TLS certificates from Let's Encrypt
✅ **Automatic renewal** every 12 hours
✅ **Valid certificates** (no browser warnings)
✅ **90-day validity** with auto-renewal
✅ **TLS 1.2 & 1.3** support
✅ **A+ SSL rating** configuration

## Certificate Management

### Check Certificate Info

```bash
docker-compose -f docker-compose.letsencrypt.yml run --rm certbot certificates
```

### Manual Renewal (Optional)

```bash
chmod +x scripts/renew-certificates.sh
./scripts/renew-certificates.sh
```

### Check Expiration

```bash
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### DNS Not Resolving

```bash
nslookup your-domain.com
```

Make sure it returns your server's public IP.

### Port 80/443 Not Reachable

```bash
# Check firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Test connectivity
telnet your-public-ip 80
```

### Challenge Failed

Check Nginx logs:

```bash
docker-compose -f docker-compose.letsencrypt.yml logs nginx
```

Test ACME challenge path:

```bash
curl http://your-domain.com/.well-known/acme-challenge/test
```

### View All Logs

```bash
docker-compose -f docker-compose.letsencrypt.yml logs -f
```

## Testing with Staging

Before generating production certificates, test with staging:

```bash
# In .env
STAGING=1
```

Then run the init script. Once confirmed working:

```bash
# Stop services
docker-compose -f docker-compose.letsencrypt.yml down

# Remove staging certificates
rm -rf certbot/

# Switch to production in .env
STAGING=0

# Re-run init
./scripts/init-letsencrypt.sh
```

## Rate Limits

Let's Encrypt has rate limits:
- **50 certificates per domain per week**
- Use staging for testing to avoid limits
- See: https://letsencrypt.org/docs/rate-limits/

## Complete Documentation

For the complete Italian guide, see: [LETSENCRYPT_SETUP_IT.md](LETSENCRYPT_SETUP_IT.md)

## Support

- Let's Encrypt Docs: https://letsencrypt.org/docs/
- Certbot Docs: https://certbot.eff.org/
- Community: https://community.letsencrypt.org/

---

**Happy secure browsing! 🔒**
