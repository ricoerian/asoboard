# AsoBoard - Local Production Setup dengan Docker

## Overview

Setup ini menggunakan **production-ready configuration** yang berjalan di environment local. Semua komponen menggunakan konfigurasi production:

- ✅ **PostgreSQL 15** - Production database
- ✅ **Redis 7** - Caching & session store
- ✅ **Django + Gunicorn** - Production WSGI server
- ✅ **Angular Production Build** - Optimized bundle
- ✅ **Nginx** - Reverse proxy, rate limiting, caching
- ✅ **Multi-stage builds** - Optimized Docker images
- ✅ **Health checks** - Container monitoring
- ✅ **Named volumes** - Data persistence

## Architecture

```
Client
   ↓
[Nginx Frontend:80] → [Angular Production Build]
   ↓
[Nginx Backend:8000] → [Gunicorn:8000] → [Django Backend]
   ↓                        ↓
[PostgreSQL:5432]      [Redis:6379]
```

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

## Quick Start

### 1. Clone & Setup

```bash
cd asoboard
```

### 2. Environment Variables (Optional)

Buat file `.env` jika ingin customize:

```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=asoboard
POSTGRES_USER=asoboard_user
POSTGRES_PASSWORD=your-strong-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Gunicorn
GUNICORN_WORKERS=4
```

### 3. Build & Run

```bash
# Build images
docker-compose build

# Start all services
docker-compose up

# Or run in background
docker-compose up -d
```

### 4. Access Application

- **Frontend**: http://localhost:80 (atau http://localhost)
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 5. Default Credentials

```
Username: admin
Password: admin
```

*Dibuat otomatis oleh entrypoint script untuk local development*

## Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx_backend

# Rebuild images
docker-compose build --no-cache

# Execute commands in containers
docker-compose exec backend python manage.py shell
docker-compose exec db psql -U asoboard_user -d asoboard
```

## Services

### PostgreSQL (db)
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Volume**: postgres_data
- **Health check**: pg_isready

### Redis (redis)
- **Image**: redis:7-alpine
- **Port**: 6379
- **Volume**: redis_data
- **Max Memory**: 256MB (LRU eviction)

### Backend (backend)
- **Build**: ./backend/Dockerfile
- **Server**: Gunicorn with 4 workers
- **Port**: 8000 (internal)
- **Volumes**: 
  - Source code: ./backend:/app
  - Media files: media_files:/app/media
  - Static files: static_files:/app/staticfiles

### Nginx Backend (nginx_backend)
- **Image**: nginx:alpine
- **Port**: 8000 (external)
- **Config**: nginx/conf.d/backend.conf
- **Features**:
  - Reverse proxy to Gunicorn
  - Static/media file serving
  - Request buffering
  - Timeout handling

### Frontend (frontend)
- **Build**: ./frontend/Dockerfile (multi-stage)
- **Port**: 80 (internal)
- **Build**: Production Angular bundle
- **Stage 1**: Node 18 - npm build
- **Stage 2**: Nginx - serve static files

### Nginx Frontend (nginx_frontend)
- **Image**: nginx:alpine  
- **Port**: 4200 (external)
- **Config**: nginx/conf.d/frontend.conf
- **Features**:
  - SPA routing support
  - Gzip compression
  - Security headers
  - Asset caching

## Development Workflow

### 1. Backend Development

```bash
# Django shell
docker-compose exec backend python manage.py shell

# Create migrations
docker-compose exec backend python manage.py makemigrations

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

### 2. Database Management

```bash
# Access PostgreSQL
docker-compose exec db psql -U asoboard_user -d asoboard

# Backup database
docker-compose exec db pg_dump -U asoboard_user asoboard > backup.sql

# Restore database
docker-compose exec -T db psql -U asoboard_user asoboard < backup.sql
```

### 3. Frontend Development

```bash
# Access container
docker-compose exec frontend sh

# Rebuild frontend
docker-compose build frontend
```

### 4. Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Check cache keys
KEYS *

# Clear cache
FLUSHDB
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :8000
lsof -i :5432
lsof -i :6379

# Kill the process or change port in docker-compose.yml
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Recreate containers
docker-compose down
docker-compose up --force-recreate
```

### Database Connection Issues

```bash
# Wait for database health check
docker-compose logs db

# Test connection
docker-compose exec backend python manage.py check --database default
```

### Static Files Not Loading

```bash
# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Check nginx logs
docker-compose logs nginx_backend
```

## Production Deployment

Untuk deploy ke production:

1. **Environment Variables**: Ganti semua default values
2. **SECRET_KEY**: Generate yang baru dan aman
3. **ALLOWED_HOSTS**: Set ke domain production
4. **DEBUG**: Set ke False
5. **Database**: Gunakan managed PostgreSQL service
6. **Redis**: Gunakan managed Redis service
7. **Static Files**: Upload ke CDN
8. **SSL/TLS**: Setup HTTPS dengan Let's Encrypt
9. **Monitoring**: Setup logging & monitoring

## Performance Tuning

### Gunicorn Workers

```bash
# Formula: (2 x CPU cores) + 1
GUNICORN_WORKERS=4
```

### PostgreSQL

```sql
-- Check connections
SELECT count(*) FROM pg_stat_activity;

-- Optimize queries
EXPLAIN ANALYZE SELECT ...;
```

### Redis

```bash
# Monitor Redis
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory
```

## Security Checklist

- [ ] Change default passwords
- [ ] Set strong SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Rate limiting
- [ ] CORS configuration

## Support

Jika ada masalah:

1. Check logs: `docker-compose logs`
2. Check health: `docker-compose ps`
3. Restart services: `docker-compose restart`
4. Clean rebuild: `docker-compose down -v && docker-compose build --no-cache`