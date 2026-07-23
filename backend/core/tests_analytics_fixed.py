"""
Unit Tests for Analytics Views (Fixed for existing models)
"""


import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    Course,
    Session,
    StudentSessionState,
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
def game_session(db, course):
    return Session.objects.create(
        course=course,
        title="Addition Quiz",
        mode="game",
        game_type="math",
        game_config={"questions": []},
    )


@pytest.fixture
def student_state(db, game_session, student_user):
    """Create a student session state for testing"""
    state = StudentSessionState.objects.create(
        session=game_session,
        student=student_user,
        canvas_events=[{"type": "draw", "data": "event_1"}],
    )
    return state


@pytest.mark.django_db
class TestGamePerformanceView:

    def test_game_performance_requires_auth(self, api_client):
        """Test that endpoint requires authentication"""
        url = reverse("game-performance")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_game_performance_mentor_access(
        self, api_client, mentor_user, course, game_session, student_state
    ):
        """Test mentor can access their course analytics"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("game-performance")
        response = api_client.get(url, {"course_id": course.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "data" in response.data

    def test_game_performance_filters_by_game_type(
        self, api_client, mentor_user, game_session, student_state
    ):
        """Test filtering by game type"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("game-performance")
        response = api_client.get(url, {"game_type": "math"})

        assert response.status_code == status.HTTP_200_OK
        for item in response.data["data"]:
            assert item["game_type"] == "math"


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
        self, api_client, mentor_user, student_user, student_state
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

    def test_student_progress_invalid_student(self, api_client, mentor_user):
        """Test 404 for non-existent student"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("analytics-student-progress", kwargs={"student_id": 9999})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["success"] is False


@pytest.mark.django_db
class TestEngagementMetricsView:

    def test_engagement_requires_auth(self, api_client):
        """Test authentication required"""
        url = reverse("engagement-metrics")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_engagement_basic(self, api_client, mentor_user, student_state):
        """Test basic engagement metrics"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("engagement-metrics")
        response = api_client.get(url, {"period": 7})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "engagement_rate" in response.data["data"]


@pytest.mark.django_db
class TestComparisonAnalysisView:

    def test_comparison_requires_student_id(self, api_client, mentor_user):
        """Test student_id parameter is required"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("comparison-analysis")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False

    def test_comparison_basic(
        self, api_client, mentor_user, student_user, student_state
    ):
        """Test basic comparison"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("comparison-analysis")
        response = api_client.get(url, {"student_id": student_user.id})

        assert response.status_code == status.HTTP_200_OK
        assert "student_performance" in response.data["data"]
