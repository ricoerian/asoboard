"""
Unit Tests for Analytics Views - Part 2
Additional test cases for DifficultyAnalysis, EngagementMetrics, and Comparison views
"""


import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from .models import GameSession

User = get_user_model()


@pytest.mark.django_db
class TestDifficultyAnalysisView:

    def test_difficulty_analysis_requires_auth(self, api_client):
        """Test authentication required"""
        url = reverse("difficulty-analysis")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_difficulty_analysis_basic(
        self, api_client, mentor_user, course, session, game_sessions
    ):
        """Test basic difficulty analysis"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("difficulty-analysis")
        response = api_client.get(url, {"course_id": course.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "hardest_questions" in response.data["data"]

    def test_difficulty_analysis_filters(self, api_client, staff_user, game_sessions):
        """Test filtering by game type"""
        api_client.force_authenticate(user=staff_user)
        url = reverse("difficulty-analysis")
        response = api_client.get(url, {"game_type": "math"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["filters"]["game_type"] == "math"

    def test_difficulty_analysis_error_rate(
        self, api_client, mentor_user, session, student_user, db
    ):
        """Test error rate calculation"""
        # Create sessions with known error rates
        for i in range(10):
            GameSession.objects.create(
                session=session,
                user=student_user,
                game_type="trivia",
                score=50,
                is_correct=i < 3,  # 30% correct, 70% error
                answer={"answer": str(i)},
                completed_at=timezone.now(),
            )

        api_client.force_authenticate(user=mentor_user)
        url = reverse("difficulty-analysis")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        questions = response.data["data"]["hardest_questions"]
        if len(questions) > 0:
            assert "error_rate" in questions[0]


@pytest.mark.django_db
class TestEngagementMetricsView:

    def test_engagement_metrics_requires_auth(self, api_client):
        """Test authentication required"""
        url = reverse("engagement-metrics")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_engagement_metrics_basic(self, api_client, mentor_user, game_sessions):
        """Test basic engagement metrics"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("engagement-metrics")
        response = api_client.get(url, {"period": 7})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        data = response.data["data"]
        assert "engagement_rate" in data
        assert "daily_activity" in data
        assert "peak_activity_hours" in data

    def test_engagement_metrics_period_filter(
        self, api_client, staff_user, game_sessions
    ):
        """Test period filtering"""
        api_client.force_authenticate(user=staff_user)
        url = reverse("engagement-metrics")
        response = api_client.get(url, {"period": 30})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["period_days"] == 30

    def test_engagement_metrics_course_filter(
        self, api_client, mentor_user, course, game_sessions
    ):
        """Test course filtering"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("engagement-metrics")
        response = api_client.get(url, {"course_id": course.id})

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestComparisonAnalysisView:

    def test_comparison_requires_auth(self, api_client):
        """Test authentication required"""
        url = reverse("comparison-analysis")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_comparison_requires_student_id(self, api_client, mentor_user):
        """Test student_id parameter is required"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("comparison-analysis")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["success"] is False

    def test_comparison_basic(
        self, api_client, mentor_user, student_user, game_sessions
    ):
        """Test basic comparison analysis"""
        api_client.force_authenticate(user=mentor_user)
        url = reverse("comparison-analysis")
        response = api_client.get(url, {"student_id": student_user.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        data = response.data["data"]
        assert "student_performance" in data
        assert "class_average" in data
        assert "comparison" in data

    def test_comparison_percentile_rank(
        self, api_client, staff_user, student_user, game_sessions
    ):
        """Test percentile rank calculation"""
        api_client.force_authenticate(user=staff_user)
        url = reverse("comparison-analysis")
        response = api_client.get(url, {"student_id": student_user.id})

        assert response.status_code == status.HTTP_200_OK
        comparison = response.data["data"]["comparison"]
        assert "percentile_rank" in comparison
        assert "above_average" in comparison
        assert isinstance(comparison["percentile_rank"], float)
