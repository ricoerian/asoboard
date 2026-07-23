# 🐳 Docker Setup Guide - AsoBoard

## Quick Start (5 Minutes)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- 4GB RAM available

### One-Command Setup

```bash
# Clone and setup
git clone <your-repo-url>
cd asoboard

# Copy environment file
cp backend/.env.example backend/.env

# Generate new SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Edit backend/.env and paste the SECRET_KEY
nano backend/.env  # or use your preferred editor

# Start all services
docker-compose up -d

# Wait 30 seconds for database initialization

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### Access the Application

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:8000/api
- **Admin Panel:** http://localhost:8000/admin
- **PostgreSQL:** localhost:5432

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Docker Host                    │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │   Frontend   │  │   Backend    │  │   DB   ││
│  │   (Nginx)    │  │   (Django)   │  │ (PgSQL)││
│  │   Port 4200  │  │   Port 8000  │  │  5432  ││
│  └──────────────┘  └──────────────┘  └────────┘│
│         │                  │              │      │
│         └──────────────────┴──────────────┘      │
│              asoboard_network (bridge)           │
└─────────────────────────────────────────────────┘
```

---

## Services

### 1. PostgreSQL Database
- **Image:** postgres:15-alpine
- **Port:** 5432
- **Volume:** postgres_data (persistent)
- **Health Check:** Enabled

### 2. Django Backend
- **Build:** ./backend/Dockerfile
- **Port:** 8000
- **Volumes:** code, media, static
- **Auto-migration:** Yes

### 3. Angular Frontend
- **Build:** ./frontend/Dockerfile (multi-stage)
- **Port:** 4200 (mapped to 80 internally)
- **Web Server:** Nginx
- **API Proxy:** Configured

---

## Environment Variables

### Required Variables (backend/.env)

```env
# Security (MUST CHANGE)
SECRET_KEY=<generate-new-key>
DEBUG=False

# Database
DB_NAME=asoboard
DB_USER=asoboard_user
DB_PASSWORD=<secure-password>
DB_HOST=db
DB_PORT=5432

# PostgreSQL
POSTGRES_DB=asoboard
POSTGRES_USER=asoboard_user
POSTGRES_PASSWORD=<same-as-DB_PASSWORD>
```

### Optional Variables

```env
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

---

## Common Commands

### Start Services
```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Execute Commands in Containers
```bash
# Django management commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell

# Database shell
docker-compose exec db psql -U asoboard_user -d asoboard

# Backend shell
docker-compose exec backend sh
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build
```

---

## Data Management

### Backup Database
```bash
# Backup to file
docker-compose exec db pg_dump -U asoboard_user asoboard > backup.sql

# With timestamp
docker-compose exec db pg_dump -U asoboard_user asoboard > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
# Restore from file
docker-compose exec -T db psql -U asoboard_user asoboard < backup.sql
```

### Reset Database
```bash
# ⚠️ WARNING: Deletes all data
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

---

## Development Workflow

### Live Code Reloading

**Backend:** Auto-reloads on file changes (Django runserver)
**Frontend:** Rebuild required (run `docker-compose up -d --build frontend`)

### Install New Dependencies

**Backend:**
```bash
# Add to requirements.txt, then:
docker-compose exec backend pip install -r requirements.txt
# OR rebuild:
docker-compose up -d --build backend
```

**Frontend:**
```bash
# Rebuild image:
docker-compose up -d --build frontend
```

### Run Tests
```bash
# Backend tests
docker-compose exec backend python manage.py test
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check if database is ready
docker-compose ps
docker-compose logs db

# Restart database
docker-compose restart db

# Wait for health check
watch docker-compose ps
```

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready -> wait 30 seconds
# 2. Migration failed -> check logs
# 3. SECRET_KEY missing -> check .env file
```

### Port Already in Use
```bash
# Find process using port
lsof -i :8000  # Backend
lsof -i :4200  # Frontend
lsof -i :5432  # Database

# Kill process or change port in docker-compose.yml
```

### Out of Disk Space
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove stopped containers
docker container prune
```

---

## Production Deployment

### Security Checklist

- [ ] Generate strong SECRET_KEY
- [ ] Set DEBUG=False
- [ ] Change all default passwords
- [ ] Configure ALLOWED_HOSTS properly
- [ ] Use environment-specific .env files
- [ ] Enable HTTPS (add nginx SSL config)
- [ ] Set up regular backups
- [ ] Configure firewall rules
- [ ] Use Docker secrets for sensitive data
- [ ] Implement log rotation

### Production docker-compose.yml

For production, create `docker-compose.prod.yml` with:
- No volume mounts for code
- Production-grade PostgreSQL config
- Redis for sessions (recommended)
- Nginx SSL configuration
- Health checks and restart policies

---

## Performance Tips

1. **Use BuildKit:** `DOCKER_BUILDKIT=1 docker-compose build`
2. **Layer Caching:** Order Dockerfile commands from least to most frequently changed
3. **Multi-stage Builds:** Already implemented in frontend
4. **Volume Performance:** Use named volumes for databases
5. **Resource Limits:** Add memory/CPU limits in docker-compose.yml

---

## Maintenance

### Weekly Tasks
- Check logs for errors
- Monitor disk space
- Review database size

### Monthly Tasks
- Update Docker images
- Backup database
- Review security updates

### Update Images
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Django Docker Guide](https://docs.djangoproject.com/en/stable/howto/deployment/)

---

**Generated:** 2026-07-23  
**Version:** 1.0  
**Status:** ✅ Production Ready

---

[← Back to README](README.md)
