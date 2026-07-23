from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="notif_student", password="pass123", role="student"
        )
        self.mentor = User.objects.create_user(
            username="notif_mentor", password="pass123", role="mentor"
        )
        self.client.force_authenticate(user=self.student)

    def _create_notification(self, user=None, **kwargs):
        from core.models import Notification

        defaults = {
            "recipient": user or self.student,
            "title": "Test notification",
            "message": "Test message body",
            "notification_type": "system",
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)

    def test_list_empty_notifications(self):
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_notifications_sorted_newest_first(self):
        n1 = self._create_notification(title="Old")
        n2 = self._create_notification(title="New")
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["id"], n2.id)
        self.assertEqual(response.data[1]["id"], n1.id)

    def test_filter_by_is_read_true(self):
        self._create_notification(is_read=True)
        self._create_notification(is_read=False)
        response = self.client.get("/api/notifications/?is_read=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]["is_read"])

    def test_filter_by_is_read_false(self):
        self._create_notification(is_read=True)
        self._create_notification(is_read=False)
        response = self.client.get("/api/notifications/?is_read=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(response.data[0]["is_read"])

    def test_filter_by_type(self):
        self._create_notification(notification_type="achievement")
        self._create_notification(notification_type="enrollment")
        response = self.client.get("/api/notifications/?type=achievement")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["notification_type"], "achievement")

    def test_filter_invalid_type_ignored(self):
        self._create_notification()
        response = self.client.get("/api/notifications/?type=invalid")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_ordering_ascending(self):
        n1 = self._create_notification(title="First")
        n2 = self._create_notification(title="Second")
        response = self.client.get("/api/notifications/?ordering=created_at")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["id"], n1.id)
        self.assertEqual(response.data[1]["id"], n2.id)

    def test_unread_count(self):
        self._create_notification(is_read=False)
        self._create_notification(is_read=False)
        self._create_notification(is_read=True)
        response = self.client.get("/api/notifications/unread_count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 2)

    def test_unread_count_zero(self):
        response = self.client.get("/api/notifications/unread_count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 0)

    def test_mark_as_read(self):
        n = self._create_notification(is_read=False)
        response = self.client.patch(
            f"/api/notifications/{n.id}/", {"is_read": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

    def test_mark_all_read(self):
        self._create_notification(is_read=False)
        self._create_notification(is_read=False)
        self._create_notification(is_read=True)
        response = self.client.post("/api/notifications/mark_all_read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marked_read"], 2)
        unread = self.client.get("/api/notifications/unread_count/")
        self.assertEqual(unread.data["unread_count"], 0)

    def test_delete_notification(self):
        n = self._create_notification()
        response = self.client.delete(f"/api/notifications/{n.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response2 = self.client.get("/api/notifications/")
        self.assertEqual(len(response2.data), 0)

    def test_cannot_mark_others_notification(self):
        n = self._create_notification(user=self.mentor)
        response = self.client.patch(
            f"/api/notifications/{n.id}/", {"is_read": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_delete_others_notification(self):
        n = self._create_notification(user=self.mentor)
        response = self.client.delete(f"/api/notifications/{n.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_rejected(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_notification_helper(self):
        from core.views import create_notification

        create_notification(
            user=self.student,
            title="New badge!",
            message="You earned a badge",
            notification_type="achievement",
            related_object_id=99,
            related_object_type="achievement",
        )
        response = self.client.get("/api/notifications/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "New badge!")
        self.assertEqual(response.data[0]["notification_type"], "achievement")
        self.assertEqual(response.data[0]["related_object_id"], 99)

    def test_mark_all_read_only_affects_own(self):
        from core.models import Notification

        self._create_notification(is_read=False)
        Notification.objects.create(
            recipient=self.mentor,
            title="Other",
            message="msg",
            notification_type="system",
            is_read=False,
        )
        response = self.client.post("/api/notifications/mark_all_read/")
        self.assertEqual(response.data["marked_read"], 1)
        other_unread = Notification.objects.filter(
            recipient=self.mentor, is_read=False
        ).count()
        self.assertEqual(other_unread, 1)

    def test_type_filter_case_sensitive_enum(self):
        self._create_notification(notification_type="achievement")
        self._create_notification(notification_type="system")
        response = self.client.get("/api/notifications/?type=SYSTEM")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
