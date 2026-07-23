from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class UserPreferenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="pref_student", password="pass123", role="student"
        )
        self.mentor = User.objects.create_user(
            username="pref_mentor", password="pass123", role="mentor"
        )
        self.client.force_authenticate(user=self.student)

    def test_get_default_preferences(self):
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme"], "light")
        self.assertEqual(response.data["colorblind_mode"], "none")
        self.assertEqual(response.data["reduced_motion"], False)

    def test_get_preferences_creates_if_missing(self):
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)

    def test_update_theme_to_high_contrast(self):
        response = self.client.patch(
            "/api/user-preferences/", {"theme": "high-contrast"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme"], "high-contrast")

    def test_update_colorblind_mode(self):
        response = self.client.patch(
            "/api/user-preferences/", {"colorblind_mode": "deuteranopia"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["colorblind_mode"], "deuteranopia")

    def test_update_reduced_motion(self):
        response = self.client.patch(
            "/api/user-preferences/", {"reduced_motion": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["reduced_motion"])

    def test_update_multiple_fields(self):
        response = self.client.patch(
            "/api/user-preferences/",
            {
                "theme": "high-contrast",
                "colorblind_mode": "protanopia",
                "reduced_motion": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme"], "high-contrast")
        self.assertEqual(response.data["colorblind_mode"], "protanopia")
        self.assertTrue(response.data["reduced_motion"])

    def test_partial_update_preserves_other_fields(self):
        self.client.patch(
            "/api/user-preferences/",
            {
                "theme": "high-contrast",
                "colorblind_mode": "tritanopia",
                "reduced_motion": True,
            },
            format="json",
        )
        response = self.client.patch(
            "/api/user-preferences/", {"reduced_motion": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme"], "high-contrast")
        self.assertEqual(response.data["colorblind_mode"], "tritanopia")
        self.assertFalse(response.data["reduced_motion"])

    def test_invalid_theme_rejected(self):
        response = self.client.patch(
            "/api/user-preferences/", {"theme": "dark"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_colorblind_mode_rejected(self):
        response = self.client.patch(
            "/api/user-preferences/", {"colorblind_mode": "invalid"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_preferences_isolated_per_user(self):
        self.client.patch(
            "/api/user-preferences/", {"theme": "high-contrast"}, format="json"
        )
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.data["theme"], "light")

    def test_preferences_persist_after_fetch(self):
        self.client.patch(
            "/api/user-preferences/",
            {"theme": "high-contrast", "reduced_motion": True},
            format="json",
        )
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.data["theme"], "high-contrast")
        self.assertTrue(response.data["reduced_motion"])

    def test_default_dyslexic_font_is_false(self):
        response = self.client.get("/api/user-preferences/")
        self.assertFalse(response.data["dyslexic_font"])

    def test_update_dyslexic_font(self):
        response = self.client.patch(
            "/api/user-preferences/", {"dyslexic_font": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["dyslexic_font"])

    def test_default_font_size_is_normal(self):
        response = self.client.get("/api/user-preferences/")
        self.assertEqual(response.data["font_size"], "normal")

    def test_update_font_size(self):
        response = self.client.patch(
            "/api/user-preferences/", {"font_size": "large"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["font_size"], "large")

    def test_update_font_size_to_x_large(self):
        response = self.client.patch(
            "/api/user-preferences/", {"font_size": "x-large"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["font_size"], "x-large")

    def test_invalid_font_size_rejected(self):
        response = self.client.patch(
            "/api/user-preferences/", {"font_size": "huge"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_dyslexic_and_font_size_together(self):
        response = self.client.patch(
            "/api/user-preferences/",
            {"dyslexic_font": True, "font_size": "large"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["dyslexic_font"])
        self.assertEqual(response.data["font_size"], "large")
