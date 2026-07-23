"""
Unit Tests for Analytics Views
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    Course,
    GameSession,
    Session,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mentor_user(db):
    return User.objects.create_user(
        username="mentor1", password="testpass123", role="mentor"
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        username="student1", password="testpass123", role="student"
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staff1", password="testpass123", role="staff"
    )


@pytest.fixture
def course(db, mentor_user):
    return Course.objects.create(
        mentor=mentor_user, title="Math Course", description="Basic mathematics"
    )


@pytest.fixture
def session(db, course):
    return Session.objects.create(
        course=course,
        title="Addition Quiz",
        mode="game",
        game_type="math",
        game_config={"questions": []},
    )


@pytest.fixture
def game_sessions(db, session, student_user):
    """Create multiple game sessions for testing"""
    sessions = []
    for i in range(5):
        gs = GameSession.objects.create(
            session=session,
            user=student_user,
            game_type="math",
            score=70 + i * 5,
            is_correct=i % 2 == 0,
            answer={"answer": str(i)},
            completed_at=timezone.now() - timedelta(days=i),
        )
        sessions.append(gs)
    return sessions


@pytest.mark.django_db
class TestGamePerformanceView:

    def test_game_performance_requires_auth(self, api_client):
        """Test that endpoint requires authentication"""
        url = reverse("game-performance")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_game_performance_mentor_access(
        self, api_client, mentor_user, course, session, game_sessions
    ):
        """Test mentor can access their course analytics"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("game-performance")
        response = api_client.get(url, {"course_id": course.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert len(response.data["data"]) > 0

    def test_game_performance_filters_by_game_type(
        self, api_client, mentor_user, game_sessions
    ):
        """Test filtering by game type"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("game-performance")
        response = api_client.get(url, {"game_type": "math"})

        assert response.status_code == status.HTTP_200_OK
        for item in response.data["data"]:
            assert item["game_type"] == "math"

    def test_game_performance_aggregation(self, api_client, staff_user, game_sessions):
        """Test aggregation calculations"""
        api_client.force_authenticate(user=staff_user)
        url = reverse("game-performance")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"][0]
        assert "total_attempts" in data
        assert "avg_score" in data
        assert "completion_rate" in data
        assert data["total_attempts"] == 5


@pytest.mark.django_db
class TestStudentProgressView:

    def test_student_progress_requires_auth(self, api_client, student_user):
        """Test authentication required"""
        url = reverse(
            "analytics-student-progress", kwargs={"student_id": student_user.id}
        )
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_student_progress_valid_student(
        self, api_client, mentor_user, student_user, game_sessions
    ):
        """Test retrieving progress for valid student"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse(
            "analytics-student-progress", kwargs={"student_id": student_user.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["student"]["id"] == student_user.id
        assert "overall_stats" in response.data["data"]
        assert "timeline" in response.data["data"]

    def test_student_progress_invalid_student(self, api_client, mentor_user):
        """Test 404 for non-existent student"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("analytics-student-progress", kwargs={"student_id": 9999})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["success"] is False
