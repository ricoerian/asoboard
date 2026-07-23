# AsoBoard API Contract Documentation
*Enterprise-Level API Documentation for Indonesian Educational Platform*

---

## 📋 Document Overview

**Document ID**: ASO-API-CONTRACT-001  
**Version**: 1.0  
**Last Updated**: 2026-07-01  
**Target Audience**: Backend Developers, API Consumers, DevOps Engineers  
**Compliance**: Indonesian Personal Data Protection Law (PDPL), Kominfo Regulations, ISO 27001

---

## 🔐 Authentication & Authorization

### 1. User Login
```http
POST /api/v1/auth/login/
```

#### Request Payload
```json
{
  "username": "string",
  "password": "string",
  "role": "mentor|student|staff|parent"
}
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "username": "student_john",
      "email": "john@example.com",
      "role": "student",
      "is_active": true,
      "date_joined": "2026-01-15T10:30:00Z",
      "profile": {
        "full_name": "John Doe",
        "avatar_url": null
      }
    },
    "preferences": {
      "theme": "light",
      "language": "id-ID",
      "notifications_enabled": true
    }
  }
}
```

#### Response (Error - 401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error_code": "INVALID_CREDENTIALS",
  "details": {
    "username": ["Invalid username or password"],
    "password": ["Invalid username or password"]
  }
}
```

---

### 2. User Registration
```http
POST /api/v1/auth/register/
```

#### Request Payload
```json
{
  "username": "string (min 3, max 50)",
  "email": "string (valid email format)",
  "password": "string (min 8 chars)",
  "role": "mentor|student|staff|parent",
  "full_name": "string",
  "phone_number": "string (Indonesian format: +62...)"
}
```

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "username": "new_user",
    "role": "student",
    "email_verified": false,
    "requires_verification": true
  }
}
```

---

### 3. Token Refresh
```http
POST /api/v1/auth/refresh/
```

#### Request Payload
```json
{
  "refresh_token": "string"
}
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "access_token": "string",
    "expires_in": 3600,
    "token_type": "Bearer"
  }
}
```

---

## 📚 Course Management

### 4. Create Course
```http
POST /api/v1/courses/
```

#### Request Payload (Mentor Only)
```json
{
  "title": "string (3-100 chars)",
  "description": "string (0-500 chars)",
  "category": "math|science|language|art|music",
  "level": "beginner|intermediate|advanced",
  "thumbnail_url": "string (optional)",
  "is_public": true,
  "enrollment_key": "string (optional, for private courses)",
  "schedule": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "timezone": "Asia/Jakarta"
  }
}
```

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course_id": "uuid",
    "title": "Introduction to Mathematics",
    "slug": "intro-math-2026",
    "mentor_id": 1,
    "status": "active",
    "created_at": "2026-07-01T10:30:00Z",
    "enrollment_count": 0
  }
}
```

---

### 5. List Courses
```http
GET /api/v1/courses/?page=1&limit=10&category=math&level=beginner&search=algebra
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": {
    "courses": [
      {
        "course_id": "uuid1",
        "title": "Introduction to Mathematics",
        "slug": "intro-math-2026",
        "description": "Basic mathematics concepts...",
        "mentor": {
          "mentor_id": 1,
          "full_name": "Dr. Sarah Johnson",
          "avatar_url": null
        },
        "category": "math",
        "level": "beginner",
        "enrollment_count": 25,
        "is_enrolled": false,
        "thumbnail_url": "https://storage.example.com/thumbnails/math101.jpg",
        "status": "active",
        "created_at": "2026-07-01T10:30:00Z",
        "last_updated": "2026-07-01T15:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total_items": 150,
      "total_pages": 15,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

## 🎯 Session Management

### 6. Create Session
```http
POST /api/v1/sessions/
```

#### Request Payload (Mentor Only)
```json
{
  "course_id": "uuid",
  "title": "string (3-100 chars)",
  "description": "string (0-500 chars)",
  "mode": "freedom|game",
  "game_type": "puzzle|trivia|math|physics|color|chemistry",
  "game_config": {
    "time_limit": 300,
    "passing_score": 70,
    "difficulty": "easy|medium|hard",
    "questions": [
      {
        "question": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "correct_answer": 1,
        "explanation": "Basic addition"
      }
    ]
  },
  "audio_file_url": "string (optional)",
  "thumbnail_url": "string (optional)",
  "is_recordable": true,
  "max_participants": 50
}
```

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session_id": "uuid",
    "course_id": "uuid",
    "title": "Math Quiz - Addition",
    "slug": "math-quiz-addition-2026",
    "mentor_id": 1,
    "mode": "game",
    "game_type": "trivia",
    "status": "draft",
    "created_at": "2026-07-01T10:30:00Z",
    "participant_count": 0,
    "recording_available": true
  }
}
```

---

### 7. Submit Game Answer
```http
POST /api/v1/sessions/{session_id}/answers/
```

#### Request Payload (Student Only)
```json
{
  "answer": "string|number|object",
  "time_taken": 45,
  "attempt_number": 1
}
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Answer submitted",
  "data": {
    "answer_id": "uuid",
    "session_id": "uuid",
    "student_id": 2,
    "answer": "4",
    "is_correct": true,
    "score_earned": 25,
    "time_taken": 45,
    "submitted_at": "2026-07-01T11:00:00Z",
    "feedback": "Excellent! You got it right."
  }
}
```

---

## 📦 Asset Management

### 8. Upload Asset
```http
POST /api/v1/assets/upload/
```

#### Request Payload (Staff Only)
```json
{
  "title": "string (3-100 chars)",
  "description": "string (0-500 chars)",
  "asset_type": "image|audio|animation",
  "file": "multipart/form-data",
  "category": "sticker|effect|animation",
  "tags": ["tag1", "tag2"],
  "is_public": true,
  "animation_config": {
    "type": "gravity|harmonic|angular|friction|manual|seeds|float|heartbeat|swing|bounce-bounds|orbit-mouse|flee-mouse|attract-mouse|drift|zigzag|swirl|spring-mouse|fade-pulse|shake|wavy|flip|slide-in|drop-bounce|orbit-center|pop",
    "parameters": {
      "g": 9.8,
      "restitution": 0.7,
      "frequency": 1.0,
      "damping": 0.5,
      "amplitude": 10
    }
  }
}
```

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "Asset uploaded successfully",
  "data": {
    "asset_id": "uuid",
    "title": "Magic Sparkle",
    "file_url": "https://storage.example.com/assets/sparkle.gif",
    "thumbnail_url": "https",
    "asset_type": "animation",
    "category": "animation",
    "uploaded_by": 1,
    "created_at": "2026-07-01T10:30:00Z",
    "is_approved": true,
    "usage_count": 0
  }
}
```

---

## 📓 Student Diary Management

### 9. Create Diary Entry
```http
POST /api/v1/diaries/
```

#### Request Payload (Student Only)
```json
{
  "title": "string (default: 'Untitled Diary')",
  "canvas_events": [
    {
      "id": "uuid",
      "type": "line|rect|circle|text|image|audio|animation",
      "tool": "pen|eraser|text|rect|circle|triangle|hexagon|star|arrow|straight-line|ellipse|ring|arc|wedge|path|textpath|label|image|sprite|audio|animation",
      "x": 100,
      "y": 200,
      "width": 50,
      "height": 30,
      "radius": 25,
      "text": "Hello World",
      "fontSize": 16,
      "fontFamily": "Arial",
      "stroke": "#FF0000",
      "strokeWidth": 2,
      "timestamp": 1672531200000,
      "asset_id": "uuid (optional)",
      "asset_url": "string (optional)",
      "audio_asset_url": "string (optional)",
      "animation_type": "string (optional)",
      "animation_config": {
        "type": "gravity",
        "parameters": {}
      },
      "scale": 1,
      "angle": 0,
      "zIndex": 1
    }
  ],
  "tags": ["drawing", "math"],
  "is_private": false
}
```

#### Response (Success - 201 Created)
```json
{
  "success": true,
  "message": "Diary entry created successfully",
  "data": {
    "diary_id": "uuid",
    "title": "My First Drawing",
    "student_id": 2,
    "canvas_events": [],
    "tags": ["drawing", "math"],
    "is_private": false,
    "created_at": "2026-07-01T10:30:00Z",
    "updated_at": "2026-07-01T10:30:00Z",
    "event_count": 1
  }
}
```

---

## 🔍 Student Session State

### 10. Get Student Session State
```http
GET /api/v1/sessions/{session_id}/state/?student_id=2
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Session state retrieved",
  "data": {
    "session_id": "uuid",
    "student_id": 2,
    "canvas_events": [
      {
        "id": "uuid1",
        "type": "line",
        "tool": "pen",
        "x": 100,
        "y": 200,
        "width": 50,
        "height": 30,
        "stroke": "#000000",
        "strokeWidth": 2,
        "timestamp": 1672531200000,
        "zIndex": 1
      }
    ],
    "last_updated": "2026-07-01T11:00:00Z",
    "is_completed": false,
    "score": 85
  }
}
```

---

## 📊 Achievement System

### 11. Check and Award Achievements
```http
POST /api/v1/achievements/check/
```

#### Request Payload
```json
{
  "user_id": 2,
  "activity_type": "session_completed|diary_created|game_completed|perfect_score",
  "activity_data": {
    "session_id": "uuid",
    "score": 100,
    "game_type": "math",
    "time_taken": 120
  }
}
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Achievements checked",
  "data": {
    "new_achievements": [
      {
        "achievement_id": "uuid",
        "name": "First Steps",
        "description": "Complete your first session",
        "icon": "🎯",
        "category": "sessions",
        "points": 50,
        "tier": "bronze"
      }
    ],
    "total_points_earned": 50,
    "user_total_points": 125
  }
}
```

---

## 🔧 Utility Endpoints

### 12. Get User Profile
```http
GET /api/v1/users/me/
```

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "user_id": 2,
    "username": "student_john",
    "email": "john@example.com",
    "role": "student",
    "full_name": "John Doe",
    "phone_number": "+62 812-3456-7890",
    "date_joined": "2026-01-15T10:30:00Z",
    "last_login": "2026-07-01T09:15:00Z",
    "is_active": true,
    "preferences": {
      "theme": "light",
      "language": "id-ID",
      "notifications_enabled": true,
      "privacy_level": "friends_only"
    },
    "statistics": {
      "courses_enrolled": 3,
      "sessions_completed": 12,
      "diaries_created": 5,
      "total_points": 250,
      "achievements_earned": 8
    }
  }
}
```

---

## ⚡ Error Handling Standards

### Common Error Responses

#### Validation Errors (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field_name": ["Error message 1", "Error message 2"],
    "another_field": ["Error message"]
  }
}
```

#### Authentication Errors (401 Unauthorized)
```json
{
  "success": false,
  "message": "Authentication required",
  "error_code": "AUTHENTICATION_REQUIRED",
  "details": {
    "token": ["Invalid or expired token"]
  }
}
```

#### Authorization Errors (403 Forbidden)
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error_code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "action": ["You don't have permission to perform this action"]
  }
}
```

#### Not Found Errors (404 Not Found)
```json
{
  "success": false,
  "message": "Resource not found",
  "error_code": "RESOURCE_NOT_FOUND",
  "details": {
    "resource": ["The requested resource could not be found"]
  }
}
```

#### Rate Limit Errors (429 Too Many Requests)
```json
{
  "success": false,
  "message": "Too many requests",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retry_after": 60
  }
}
```

---

## 🔒 Security & Compliance

### Indonesian Compliance Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **Personal Data Protection Law (PDPL)** | Data minimization, purpose limitation | Implemented in all serializers |
| **Kominfo Regulation No. 5/2014** | Data center localization | All data stored in Indonesia |
| **LOI No. 11/2008** | Electronic signatures | JWT tokens with HTTP-only cookies |
| **Kominfo Security Guidelines** | Encryption at rest and in transit | AES-256 encryption, HTTPS only |

### Security Headers
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📈 API Versioning

### Current Version
- **Base URL**: `/api/v1/`
- **Next Version**: `/api/v2/` (planned for 2026 Q4)

### Versioning Strategy
1. **Backward Compatibility**: All changes maintain existing API contracts
2. **Deprecation Policy**: 6-month notice before breaking changes
3. **Migration Path**: Clear migration guides for version upgrades

---

## 📚 Documentation Standards

### Request/Response Format
- **Request**: JSON in body for POST/PUT/PATCH
- **Response**: JSON in body for all endpoints
- **Authentication**: JWT in `Authorization: Bearer <token>` header
- **Error Codes**: Standard HTTP status codes with custom error codes

### Rate Limiting
- **Standard**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Premium**: Unlimited requests (enterprise plans)

### Caching
- **Public Endpoints**: 5 minutes cache
- **Private Endpoints**: No caching
- **CDN**: Enabled for static assets

---

## 🚀 Deployment & Monitoring

### Health Check
```http
GET /api/v1/health/
```

#### Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2026-07-01T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected",
    "auth_service": "healthy"
  }
}
```

### Metrics Endpoint
```http
GET /api/v1/metrics/
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "requests_per_minute": 145,
    "active_users": 234,
    "error_rate": 0.02,
    "average_response_time_ms": 245,
    "cache_hit_rate": 0.85
  }
}
```

---

## 📝 API Usage Guidelines

### Best Practices
1. **Always include authentication** for protected endpoints
2. **Validate input data** before processing
3. **Implement proper error handling** for all API calls
4. **Use pagination** for list endpoints
5. **Cache responses** where appropriate
6. **Monitor API usage** for anomalies

### Indonesian Business Considerations
- **Working Hours**: Consider timezone `Asia/Jakarta` for scheduled tasks
- **Payment Processing**: Integrate with Indonesian payment gateways (Midtrans, Doku)
- **Tax Compliance**: Implement PPnBM (Value Added Tax) for educational services
- **Data Residency**: All student data must remain within Indonesian data centers

---

## 🔄 API Lifecycle Management

### Version Support Matrix
| Version | Status | End of Support | Migration Required |
|---------|--------|----------------|-------------------|
| v1.x | Active | 2026-12-31 | No |
| v2.x | Planned | 2027-12-31 | Yes |
| v3.x | Future | 2028-12-31 | Yes |

### Deprecation Policy
1. **Notice Period**: 180 days before deprecation
2. **Migration Guide**: Provided with deprecation notice
3. **Support Period**: 90 days after deprecation for legacy clients

---

## 📊 SLA & Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | Monthly availability |
| **Response Time** | < 500ms (95th percentile) | API endpoint testing |
| **Database Query** | < 100ms | Slow query monitoring |
| **Cache Hit Rate** | > 80% | Redis metrics |
| **Error Rate** | < 0.1% | Application monitoring |

---

## 🛡️ Security Checklist

### Pre-Deployment Checklist
- [ ] All API endpoints tested with security scanner
- [ ] Input validation implemented for all endpoints
- [ ] Authentication and authorization verified
- [ ] Error handling tested for all scenarios
- [ ] Rate limiting configured
- [ ] Logging and monitoring enabled
- [ ] Data encryption verified
- [ ] Compliance requirements met

### Post-Deployment Monitoring
- [ ] API response times monitored
- [ ] Error rates tracked
- [ ] Security incidents logged
- [ ] User authentication attempts monitored
- [ ] Data access patterns analyzed

---

## 📞 Support & Contact

### Technical Support
- **Email**: api-support@asoboard.com
- **Phone**: +62 21 1234 5678
- **Support Hours**: 24/7 (Indonesian timezone)
- **Response SLA**: < 4 hours for critical issues

### Developer Support
- **GitHub**: github.com/asoboard/api-docs
- **Documentation**: https://docs.asoboard.com/api
- **API Playground**: https://api.asoboard.com/v1/docs
- **Community**: discord.gg/asoboard-dev

---

## 📋 Appendix

### Indonesian Legal References
1. **Law No. 11 of 2008**: Information and Electronic Transactions
2. **Government Regulation No. 71 of 2019**: Electronic Systems and Transactions
3. **Kominfo Regulation No. 5 of 2014**: Information Security Management
4. **LOI No. 11 of 2008**: Electronic Signatures

### Data Processing Principles
- **Lawfulness, Fairness, and Transparency**
- **Purpose Limitation**
- **Data Minimization**
- **Accuracy**
- **Storage Limitation**
- **Integrity and Confidentiality**
- **Accountability**

---

*Document prepared by AsoBoard Development Team*  
*Last reviewed: 2026-07-01*  
*Next review: 2026-12-01*

---

[← Back to README](README.md)
