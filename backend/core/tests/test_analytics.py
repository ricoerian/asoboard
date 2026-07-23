import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Asset, UserPoints

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user():
    return User.objects.create_user(username="staff", password="password", role="staff")


@pytest.fixture
def mentor_user():
    return User.objects.create_user(
        username="mentor", password="password", role="mentor"
    )


@pytest.fixture
def student_user():
    return User.objects.create_user(
        username="student", password="password", role="student"
    )


@pytest.mark.django_db
def test_system_analytics_staff_only(api_client, staff_user, student_user):
    url = reverse("system-analytics")

    # Unauthorized
    response = api_client.get(url)
    assert response.status_code == 401

    # Forbidden (Student)
    api_client.force_authenticate(user=student_user)
    response = api_client.get(url)
    assert response.status_code == 403

    # Success (Staff)
    api_client.force_authenticate(user=staff_user)
    response = api_client.get(url)
    assert response.status_code == 200
    assert "total_users" in response.data


@pytest.mark.django_db
def test_mentor_analytics(api_client, mentor_user):
    url = reverse("mentor-analytics")
    api_client.force_authenticate(user=mentor_user)
    response = api_client.get(url)
    assert response.status_code == 200
    assert "total_sessions" in response.data
    assert "total_students" in response.data


@pytest.mark.django_db
def test_asset_usage_tracking(api_client, staff_user):
    asset = Asset.objects.create(
        title="Test Asset", asset_type="image", created_by=staff_user
    )
    url = reverse("track-asset-usage", args=[asset.id])
    api_client.force_authenticate(user=staff_user)

    response = api_client.post(url)
    assert response.status_code == 200

    asset.refresh_from_db()
    assert asset.usage_count == 1

    # Analytics View
    url_analytics = reverse("asset-usage-analytics")
    response_analytics = api_client.get(url_analytics)
    assert response_analytics.status_code == 200
    assert len(response_analytics.data) > 0
    assert response_analytics.data[0]["usage_count"] == 1


@pytest.mark.django_db
def test_csv_export(api_client, staff_user):
    url = reverse("csv-export") + "?type=users"
    api_client.force_authenticate(user=staff_user)
    response = api_client.get(url)

    assert response.status_code == 200
    assert response["Content-Type"] == "text/csv"
    assert 'attachment; filename="users_report.csv"' in response["Content-Disposition"]


@pytest.mark.django_db
def test_student_insights(api_client, student_user):
    UserPoints.objects.create(user=student_user, total_points=150)
    url = reverse("student-insights", args=[student_user.id])
    api_client.force_authenticate(user=student_user)

    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["total_points"] == 150
    assert response.data["level"] == 2  # (150 // 100) + 1 = 2
