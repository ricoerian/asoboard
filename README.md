# AsoBoard MVP

A modern, child-friendly, interactive educational platform featuring a real-time collaborative whiteboard, course management, and session recording capabilities. This MVP is built with a robust Django REST Framework backend and a highly engaging Angular frontend equipped with interactive rendering via Konva. 

## Features

- **Role-Based Access Control**: Dedicated roles for Mentors (instructors) and Students. Mentors can create and manage courses and sessions, while Students access materials securely.
- **Engaging & Playful User Interface**: Built specifically for a child-friendly learning environment with vibrant colors, chunky UI components, and intuitive interactions.
- **Interactive Whiteboard Engine**: 
  - Powered by HTML5 Canvas & Konva.js
  - High-performance 60fps rendering using `requestAnimationFrame`.
  - Supports versatile drawing tools (Pen, Eraser, Interactive Text tool).
  - Drag-and-drop support, element resizing, and canvas layers.
- **Session Recording & Playback**: Mentors can record whiteboard activities, sync them with uploaded audio, or opt for canvas-only recordings. Later playback reconstructs the session drawing history smoothly to the student.
- **Course & Session Management**: Comprehensive tools for Mentors to create courses, add individual sessions, and associate them with multimedia content.
- **Authentication**: Secure JWT-based authentication using HTTP-only cookies to protect endpoints while providing a seamless user experience. Route guards automatically handle redirecting authenticated/unauthenticated users securely.

## Tech Stack

### Frontend
- **Framework**: Angular (v21+)
- **Styling**: Tailwind CSS (v4) with Custom PostCSS configuration
- **Interactive Canvas Engine**: Konva.js
- **Routing**: Angular Router (with advanced Guest & Auth route guards)
- **Language**: TypeScript

### Backend
- **Framework**: Django
- **API Engine**: Django REST Framework (DRF)
- **Database**: SQLite (default for MVP environment)
- **Authentication**: JWT (JSON Web Tokens) with `httponly` cookie delivery

---

## Project Structure

```
interactive-board-mvp/
├── backend/            # Django backend application
│   ├── config/         # Django project settings & URL routing
│   ├── core/           # Main business logic, models, views, serializers
│   ├── media/          # Uploaded user media (audio/video for sessions)
│   ├── manage.py       # Django CLI entrypoint
│   └── venv/           # Python Virtual Environment
│
└── frontend/           # Angular frontend application
    ├── src/            
    │   ├── app/        # Angular application code (Components, Guards, Services)
    │   ├── assets/     # Static assets (images, icons)
    │   └── index.html  # Main HTML entry
    ├── package.json    # Node dependencies and scripts
    └── tailwind.config # Tailwind CSS configuration
```

## Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Angular CLI**

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Activate the virtual environment:**
   - On macOS/Linux: `source venv/bin/activate`
   - On Windows: `venv\Scripts\activate`
3. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```
4. **Create a superuser (Optional, for admin panel access):**
   ```bash
   python manage.py createsuperuser
   ```
5. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```
   The API will be accessible at `http://127.0.0.1:8000/`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```
2. **Install Node dependencies:**
   ```bash
   npm install
   ```
3. **Start the Angular development server:**
   ```bash
   npm run start
   ```
   The application will be accessible at `http://localhost:4200/`.

## Application Flow

1. **Landing Page**: Unauthenticated users are greeted with a beautiful, kid-friendly landing page with a mini Interactive Board demo.
2. **Authentication**: Users can register as Mentors or Students, and log in securely.
3. **Dashboard**: 
   - Mentors see an interface to create/edit courses and add structured sessions.
   - Students see their available courses and can view details.
4. **Session View**: Opens the full-screen interactive board, letting users draw, record, and playback recorded interactive lessons.

## Recent Architectural Improvements
- Substituted native browser confirm prompts with custom UI Modals for improved UX consistency.
- Overhauled canvas text tools to allow robust, inline input directly situated on the drawn whiteboard.
- Fixed complex recording edge-cases to ensure canvas interactions stay visible over audio-only/video-sync recording permutations.
- Introduced strict Angular Route Guard implementations (Guest/Unauth guards) intercepting already-authenticated users out of the login funnel immediately into the core dashboard app.

## Project Documentation

**Core Technical Docs:**
- [Architecture](Architecture.md) - High-level system architecture and component interactions
- [API](API.md) - Backend API contracts and endpoint documentation
- [Database](Database.md) - Database schemas and ORM relationships
- [Tech Stack](TechStack.md) - Detailed technology stack choices and libraries
- [Deployment](Deployment.md) - Infrastructure and deployment configurations
- [PRD](PRD.md) - Product Requirements Document

**Operations & Setup:**
- [Docker Setup Guide](DOCKER_SETUP.md) - Comprehensive Docker documentation
- [Production Setup](PRODUCTION_SETUP.md) - Production deployment checklist
- [Dual Remote Guide]() - Working with multiple git remotes

**Legal & Compliance:**
- [Privacy Policy](PrivacyPolicy.md)
- [Terms of Service](TermsOfService.md)

## License
MIT License.

---

## 🐳 Docker Setup (Recommended)

**Quick Start with Docker:**

```bash
# Automated setup (5 minutes)
./docker-quickstart.sh

# Access the application
# Frontend: http://localhost:4200
# Backend:  http://localhost:8000/api
# Admin:    http://localhost:8000/admin
```

**What you get:**
- ✅ PostgreSQL database (production-ready)
- ✅ Django backend with auto-migrations
- ✅ Angular frontend with Nginx
- ✅ All services containerized
- ✅ Development & production configurations

**Full Documentation:**
- [Docker Setup Guide](DOCKER_SETUP.md) - Comprehensive Docker documentation

**Common Commands:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

**Requirements:**
- Docker Desktop
- 4GB RAM available
- 10GB disk space

