# AGENTS.md — AsoBoard MVP

## Project Overview

AsoBoard MVP is an interactive educational platform featuring a real-time collaborative whiteboard, course management, and session recording capabilities. Built with Django REST Framework backend and Angular frontend.

**Tech Stack:** Angular, TypeScript, Tailwind CSS, Konva.js, Django, Django REST Framework, JWT Authentication

## Build Configuration

- **Angular**: v21+
- **Node.js**: v18+ recommended
- **Python**: v3.10+ recommended
- **Database**: SQLite (MVP environment)

## Common Commands

```bash
# Backend
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run start
```

## Architecture

### Backend (Django)

- **Models** — Django ORM models for courses, sessions, and user data
- **Views** — Django REST Framework views with serializers
- **Authentication** — JWT with HTTP-only cookies

### Frontend (Angular)

- **Components** — Angular components for UI rendering
- **Services** — HTTP services for API communication
- **Guards** — Route guards for authentication flow

### Interactive Whiteboard

- **Konva.js** for high-performance canvas rendering
- **Canvas layers** for structured drawing management
- **Recording & Playback** system for session history

## Key Directories

| Path | Purpose |
|------|---------|
| `backend/` | Django backend application |
| `backend/config/` | Django project settings & routing |
| `backend/core/` | Main business logic, models, views |
| `backend/media/` | Uploaded user media (audio/video) |
| `frontend/` | Angular frontend application |
| `frontend/src/app/` | Angular app code (components, guards, services) |
| `frontend/src/assets/` | Static assets (images, icons) |

## Critical Rules

1. **API compatibility**: Align with Django backend API contract
2. **Route guards**: Use Auth/Guest route guards for secure navigation
3. **Canvas performance**: Maintain 60fps rendering with requestAnimationFrame
4. **Recording system**: Sync canvas interactions with audio for playback
5. **Child-friendly UI**: Use vibrant colors, chunky components, intuitive interactions
6. **NO emojis in UI** (Agent Alpha — 2026-07-02): Use FontAwesome icons only (`<i class="fa-solid fa-..."></i>`) for all UI chrome (buttons, headings, labels, notifications, etc.). Only exception: memory game card content which uses emoji characters as game data.
7. **NO gradients** (Agent Alpha — 2026-07-02): Use solid colors from the palette in `.agents/rules/color-theory.md`. No `bg-gradient-to-r`, `linear-gradient()`, or gradient text. **Only exception**: `src/app/components/landing-page/` which intentionally uses gradients for visual impact.

## External References

### Core Documentation
- [README](README.md) - Project overview and setup
- [PLANNING](PLANNING.md) - Business logic and feature roadmaps
- [Architecture](Architecture.md) - System design and components
- [API](API.md) - Backend API contracts
- [Database](Database.md) - Data models and schemas
- [Tech Stack](TechStack.md) - Technology details
- [GUARDRAILS](GUARDRAILS.md) - Critical safety and operational constraints

### Agent-Specific Resources
- [Agent Index](.agents/INDEX.md) - Directory of all agent documentation
- [Agent TODOS](.agents/TODOS.md) - Shared task tracking for agents
- [Manual Tests](.agents/MANUAL_TESTS.md) - Test instructions for agents
- [Frontend README](frontend/README.md) - Frontend-specific setup and details
