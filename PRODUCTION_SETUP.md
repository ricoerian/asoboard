# 🚀 AsoBoard Production Setup Guide

## 🏗️ Architecture Overview

### Production Stack:
```
┌─────────────────────────────────────────────────────────┐
│                    Internet Traffic                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Nginx Frontend (Port 4200)                  │
│  • Static file serving                                   │
│  • Aggressive caching                                    │
│  • Gzip compression                                      │
│  • Security headers                                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           Nginx Backend Proxy (Port 8000)                │
│  • Rate limiting (100 req/min general)                   │
│  • Rate limiting (5 req/min auth)                        │
│  • Request caching                                       │
│  • Load balancing                                        │
│  • WebSocket support                                     │
│  • Static/Media serving                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Django + Gunicorn Backend                   │
│  • Multiple workers (4 default)                          │
│  • WSGI application server                               │
│  • Auto-reload on code changes                           │
│  • Health checks                                         │
└─────────────────────────────────────────────────────────┘
            ↓                           ↓
┌────────────────────┐      ┌─────────────────────┐
│  PostgreSQL 15     │      │     Redis Cache     │
│  • Persistent data │      │  • Session store    │
│  • Health checks   │      │  • Channel layer    │
│  • Auto backup     │      │  • API cache        │
└────────────────────┘      └─────────────────────┘
```

---

## ⚡ Key Features

### 1. **Rate Limiting**
- General API: 100 requests/minute per IP
- Authentication endpoints: 5 requests/minute per IP
- File uploads: 10 requests/minute per IP
- Connection limit: 10 concurrent connections per IP

### 2. **Caching**
- Redis-backed session storage
- API response caching (60 minutes)
- Static file caching (7 days)
- Media file caching (30 days)

### 3. **Performance Optimization**
- Gzip compression (level 6)
- Static file serving by Nginx (not Django)
- Connection keep-alive
- Request buffering
- Worker process optimization

### 4. **Security**
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- HSTS headers
- Content Security Policy
- Secure session cookies

### 5. **Load Balancing**
- Least connection algorithm
- Health checks for backends
- Automatic failover
- Connection pooling

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- 8GB RAM recommended
- 20GB disk space

### Setup

```bash
# 1. Clone repository
git clone <your-repo>
cd asoboard

# 2. Configure environment
cp backend/.env.example backend/.env

# 3. Generate SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# 4. Edit .env and add SECRET_KEY
nano backend/.env

# 5. Start all services
docker-compose up -d

# 6. Wait for services to be ready (30 seconds)
sleep 30

# 7. Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### Access Points
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx_backend
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
docker-compose logs -f db
```

### Check Service Health
```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Database health
docker-compose exec db pg_isready -U asoboard_user

# Redis health
docker-compose exec redis redis-cli ping
```

---

## 🔧 Configuration

### Nginx Configuration Files
- `nginx/nginx.conf` - Main Nginx config (performance, security)
- `nginx/conf.d/backend.conf` - Backend proxy, rate limiting
- `nginx/conf.d/frontend.conf` - Frontend optimization

### Django Configuration
- `backend/config/settings.py` - Django settings
- `backend/gunicorn.conf.py` - Gunicorn WSGI server
- `backend/.env` - Environment variables

### Tuning Parameters

**Gunicorn Workers** (backend/.env):
```bash
GUNICORN_WORKERS=4  # Recommended: (2 * CPU cores) + 1
```

**Rate Limits** (nginx/conf.d/backend.conf):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

**Redis Memory** (docker-compose.yml):
```yaml
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

---

## 🔐 Security Checklist

### Before Production:
- [ ] Generate strong SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS
- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Review rate limit settings
- [ ] Enable monitoring/alerting
- [ ] Configure log rotation

---

## 📈 Performance Optimization

### Horizontal Scaling

Add more Django workers in `docker-compose.yml`:

```yaml
backend2:
  extends: backend
  container_name: asoboard_backend_2

backend3:
  extends: backend
  container_name: asoboard_backend_3
```

Update nginx upstream:
```nginx
upstream django_backend {
    least_conn;
    server backend:8000 weight=1;
    server backend2:8000 weight=1;
    server backend3:8000 weight=1;
}
```

### Database Optimization
```bash
# Enable connection pooling
# Add to backend/.env
DB_CONN_MAX_AGE=600
```

---

## 🔄 Deployment

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### Zero-Downtime Deployment
```bash
# Build new images
docker-compose build

# Scale up new containers
docker-compose up -d --scale backend=2

# Wait for health checks
sleep 10

# Stop old containers
docker-compose stop backend_old
```

---

## 💾 Backup & Recovery

### Database Backup
```bash
# Manual backup
docker-compose exec db pg_dump -U asoboard_user asoboard > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U asoboard_user asoboard < backup_20260723.sql
```

### Automated Backups
Add to crontab:
```bash
0 2 * * * cd /path/to/asoboard && docker-compose exec db pg_dump -U asoboard_user asoboard > backup_$(date +\%Y\%m\%d).sql
```

---

## 🐛 Troubleshooting

### High CPU Usage
```bash
# Check which container
docker stats

# Reduce Gunicorn workers
# Edit backend/.env
GUNICORN_WORKERS=2
```

### Memory Issues
```bash
# Check memory usage
docker stats

# Reduce Redis memory
# Edit docker-compose.yml
command: redis-server --maxmemory 128mb
```

### Rate Limit Hit
```bash
# Check Nginx logs
docker-compose logs nginx_backend | grep "limiting requests"

# Adjust rate limits in nginx/conf.d/backend.conf
```

---

## 📞 Support

**Documentation:**
- Architecture: See diagram above
- Docker Guide: `DOCKER_SETUP.md`
- Quick Start: `README.md`

**Health Checks:**
- Backend: http://localhost:8000/health/
- Database: `docker-compose exec db pg_isready`
- Redis: `docker-compose exec redis redis-cli ping`

---

*Production setup completed on 2026-07-23*  
*Full stack: PostgreSQL + Redis + Gunicorn + Nginx*

---

[← Back to README](README.md)
