**Disclaimer**  
I am an AI assistant and may make mistakes. This guide is based on typical patterns for Django + Angular projects. Verify each step in your environment and adapt as needed.

---

## 📋 Overview
- **Project**: *AsoBoard* – interactive educational platform (Django REST Framework backend, Angular frontend).  
- **Goal**: Provide a complete deployment guide (Docker, Vercel) and CI/CD pipeline (GitHub Actions).  
- **Scope**: Backend container, frontend container, Docker‑Compose orchestration, automated testing, linting, and production deployment.

---

## ✅ Prerequisites
- **Node.js** ≥ 18 (for Angular)  
- **Python** ≥ 3.10 (for Django)  
- **Docker** ≥ 20.10 and **Docker‑Compose**  
- **GitHub** account (for CI/CD)  
- Access to **Vercel** (frontend) and a container registry (Docker Hub, GHCR, etc.)  

---

## 🐳 Backend Dockerfile (Django)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (optional, for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose Django default port
EXPOSE 8000

# Use Gunicorn as the production server
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**Key points**  
- Uses slim Python image to keep size small.  
- Installs only needed system packages (gcc, libpq-dev) for PostgreSQL drivers if required.  
- Runs `gunicorn` in production mode.

---

## 🎨 Frontend Dockerfile (Angular)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose Angular dev server port (will be used in production via nginx or static server)
EXPOSE 4200

# Start the Angular development server (for production you may replace with `serve` or nginx)
CMD ["npm", "run", "start"]
```

**Key points**  
- Alpine base keeps the image lightweight.  
- `npm ci` ensures reproducible installs.  
- The same image can be used for CI builds; for production you may serve the built files with Nginx.

---

## 🐳 docker‑compose.yml

```yaml
# docker-compose.yml
version: "3.8"

services:
  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings
      - DEBUG=False
    restart: unless-stopped
    volumes:
      - ./backend:/app  # optional for live reload during development

  frontend:
    build:
      context: ./frontend
    ports:
      - "4200:4200"
    depends_on:
      - backend
    restart: unless-stopped
```

**Notes**  
- The `frontend` service depends on `backend` so that API calls succeed after the backend is ready.  
- Volumes are optional; remove for a pure production build.

---

## 🚀 GitHub Actions CI/CD Workflow

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-test-deploy:
    runs-on: ubuntu-latest

    steps:
      # 1️⃣ Checkout repository
      - name: Checkout
        uses: actions/checkout@v3

      # 2️⃣ Set up Python (backend)
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      # 3️⃣ Install backend dependencies & run tests
      - name: Install backend deps
        run: |
          pip install --upgrade pip
          pip install -r backend/requirements.txt

      - name: Run backend tests
        run: |
          cd backend
          python manage.py test

      # 4️⃣ Build Docker images
      - name: Build Docker images
        run: docker compose build

      # 5️⃣ Lint frontend (Angular)
      - name: Lint frontend
        run: |
          cd frontend
          npm run lint

      # 6️⃣ Deploy frontend to Vercel (only on main branch)
      - name: Deploy to Vercel
        if: github.ref == 'refs/heads/main'
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      # 7️⃣ Deploy backend image to Docker registry (only on main branch)
      - name: Deploy backend to Docker Hub
        if: github.ref == 'refs/heads/main'
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/asoboard-backend:latest

      # 8️⃣ Cleanup (stop containers)
      - name: Cleanup
        run: docker compose down

      # 9️⃣ Notification
      - name: Notify
        run: echo "✅ Deployment completed successfully"
```

**Explanation of steps**  
1. **Checkout** – pulls the repository.  
2. **Python setup** – installs the required Python version.  
3. **Backend tests** – runs Django’s test suite; fails the pipeline on any failure.  
4. **Docker build** – builds images for both services.  
5. **Frontend lint** – ensures code style compliance.  
6. **Vercel deploy** – pushes the built Angular app to Vercel (requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets).  
7. **Docker Hub deploy** – pushes the backend image to your registry (requires `DOCKER_USERNAME` secret).  
8. **Cleanup** – stops containers to free resources.  
9. **Notify** – simple echo for visual confirmation.

---

## 📦 Deployment Steps (Manual)

1. **Build & Run Locally**  
   ```bash
   docker compose up --build
   ```
   - Backend will be reachable at `http://localhost:8000/`.  
   - Frontend will be reachable at `http://localhost:4200/`.

2. **Set Environment Variables** (in production)  
   - For backend: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, etc.  
   - For frontend: `NEXT_PUBLIC_API_URL` (or similar) pointing to the backend endpoint.

3. **Deploy Frontend to Vercel**  
   - Push the `frontend` folder to a GitHub repo (or use the existing one).  
   - In Vercel, import the project, set the build command (`npm run build`) and output directory (`dist`).  
   - Add the required environment variables (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).  

4. **Deploy Backend via Docker**  
   - Build the image: `docker build -t youruser/asoboard-backend:latest ./backend`.  
   - Run the container: `docker run -d -p 8000:8000 -e DJANGO_SETTINGS_MODULE=config.settings youruser/asoboard-backend:latest`.  
   - Optionally use Docker‑Compose in production: `docker compose -f production.yml up -d`.

5. **Verify**  
   - Open the Vercel URL → confirm the Angular UI loads.  
   - Hit the backend API (e.g., `curl http://your-server:8000/api/me/`) → ensure JWT authentication works.  

6. **Monitor**  
   - Use Docker logs (`docker logs <container>`).  
   - Set up health checks in your orchestrator (Kubernetes, ECS, etc.) if needed.

---

## 📌 Notes & Best Practices

- **Security**  
  - Keep `DEBUG=False` in production.  
  - Use HTTPS termination at Vercel; backend should also enforce HTTPS.  
  - Store secrets in GitHub Actions (`secrets`) and in your hosting provider, never in code.  

- **Scaling**  
  - For high traffic, consider deploying the backend on a Kubernetes cluster or ECS with auto‑scaling.  
  - Use a CDN (Vercel’s edge network) for static assets and API caching.  

- **Database Migrations**  
  - Run `python manage.py migrate` inside the backend container after any schema change.  
  - Automate migrations in the CI pipeline if desired.  

- **Logging & Monitoring**  
  - Configure Gunicorn to log to stdout; Docker captures it.  
  - Forward logs to a centralized service (e.g., Loki, Datadog).  

- **Versioning**  
  - Tag Docker images with Git SHA or semantic version (`v1.2.3`).  

- **Rollback**  
  - Keep previous Docker images; Vercel allows rolling back to prior deployments.  

---

## 📚 References (for further reading)

- Django documentation – *Deploying Django with Gunicorn & Docker*  
- Angular CLI – *Production Build* (`npm run build`)  
- Vercel – *CI/CD with GitHub Actions* (official guide)  
- Docker Best Practices – *Multi‑stage builds & minimal images*  

---

*End of guide.*

---

[← Back to README](README.md)
