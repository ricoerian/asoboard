#!/bin/bash

# ================================================
# AsoBoard - Docker Quick Start Script
# Production Stack: PostgreSQL + Redis + Gunicorn + Nginx
# ================================================

set -e

echo "🚀 AsoBoard Production Stack - Quick Start"
echo "=========================================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"

# Setup .env
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp backend/.env.example backend/.env
    
    echo "🔑 Generating SECRET_KEY..."
    SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    
    if [ -z "$SECRET_KEY" ]; then
        echo "❌ Failed to generate SECRET_KEY"
        echo "Please install Django: pip install django"
        exit 1
    fi
    
    sed -i.bak "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" backend/.env
    rm backend/.env.bak
    echo "✅ SECRET_KEY generated"
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" backend/.env
    sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" backend/.env
    rm backend/.env.bak
    echo "✅ Database password generated"
    
    echo ""
    echo "⚠️  IMPORTANT: Review backend/.env if needed"
    echo ""
else
    echo "✅ .env file exists"
fi

# Build images
echo ""
echo "🔨 Building Docker images..."
echo "This may take 5-10 minutes on first run"
echo ""

docker-compose build

echo ""
echo "🚀 Starting services..."
echo "- PostgreSQL (database)"
echo "- Redis (cache & sessions)"
echo "- Django + Gunicorn (backend)"
echo "- Nginx (reverse proxy & load balancer)"
echo "- Angular + Nginx (frontend)"
echo ""

docker-compose up -d

# Wait for database
echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

for i in {1..60}; do
    if docker-compose exec -T db pg_isready -U asoboard_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    echo "   PostgreSQL... ($i/60)"
    sleep 2
done

for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is ready"
        break
    fi
    echo "   Redis... ($i/30)"
    sleep 1
done

# Wait for backend
echo "   Backend starting..."
sleep 10

echo ""
echo "✅ All services ready!"
echo ""
echo "=========================================="
echo "🎉 AsoBoard Production Stack is running!"
echo "=========================================="
echo ""
echo "📍 Access Points:"
echo "   Frontend:    http://localhost:4200"
echo "   Backend API: http://localhost:8000/api"
echo "   Admin Panel: http://localhost:8000/admin"
echo ""
echo "🔧 Next Steps:"
echo "   1. Create superuser:"
echo "      docker-compose exec backend python manage.py createsuperuser"
echo ""
echo "   2. View logs:"
echo "      docker-compose logs -f"
echo ""
echo "   3. Stop services:"
echo "      docker-compose down"
echo ""
echo "📚 Documentation:"
echo "   - Production Guide: PRODUCTION_SETUP.md"
echo "   - Docker Guide: DOCKER_SETUP.md"
echo ""
echo "🎯 Features:"
echo "   ✅ Rate limiting (100 req/min)"
echo "   ✅ Redis caching"
echo "   ✅ Load balancing"
echo "   ✅ Gzip compression"
echo "   ✅ Security headers"
echo "   ✅ WebSocket support"
echo ""