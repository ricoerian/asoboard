import asyncio
from datetime import datetime, timezone

import pytest
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model

from config.asgi import application
from core.models import Notification

User = get_user_model()

pytestmark = pytest.mark.asyncio


@database_sync_to_async
def create_user(username, role="student"):
    """Helper to create user in async context."""
    return User.objects.create_user(
        username=username,
        password="testpass123",
        role=role,
    )


@database_sync_to_async
def create_notification(user, title, message):
    """Helper to create notification in async context."""
    return Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        notification_type="system",
    )


@database_sync_to_async
def get_notification_count(user, is_read=False):
    """Helper to get notification count in async context."""
    return Notification.objects.filter(
        recipient=user,
        is_read=is_read,
    ).count()


class TestNotificationConsumer:
    pytestmark = pytest.mark.django_db(transaction=True)
    """Test NotificationConsumer WebSocket functionality."""

    async def test_connect_authenticated_user(self):
        """Test that authenticated user can connect."""
        user = await create_user("testuser")

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        connected, _ = await communicator.connect()
        assert connected

        # Should receive connection confirmation
        response = await communicator.receive_json_from()
        assert response["type"] == "connection_established"
        assert response["user_id"] == user.id

        await communicator.disconnect()

    async def test_reject_anonymous_user(self):
        """Test that anonymous user is rejected."""
        from django.contrib.auth.models import AnonymousUser

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = AnonymousUser()

        connected, code = await communicator.connect()
        assert not connected
        assert code == 4001

    async def test_receive_real_time_notification(self):
        """Test receiving notification via WebSocket broadcast."""
        user = await create_user("testuser2")

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        await communicator.connect()
        await communicator.receive_json_from()  # Connection confirmation

        # Broadcast notification via channel layer
        channel_layer = get_channel_layer()
        notification_group = f"notifications_user_{user.id}"

        await channel_layer.group_send(
            notification_group,
            {
                "type": "notification_message",
                "notification_id": 123,
                "title": "Test Notification",
                "message": "This is a test",
                "notification_type": "system",
                "related_object_id": None,
                "related_object_type": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Should receive the notification
        response = await communicator.receive_json_from()
        assert response["type"] == "notification"
        assert response["notification"]["id"] == 123
        assert response["notification"]["title"] == "Test Notification"
        assert response["notification"]["message"] == "This is a test"
        assert response["notification"]["is_read"] is False

        await communicator.disconnect()

    async def test_mark_notification_read(self):
        """Test marking notification as read via WebSocket."""
        user = await create_user("testuser3")
        notification = await create_notification(user, "Test Title", "Test Message")

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        await communicator.connect()
        await communicator.receive_json_from()  # Connection confirmation

        # Send mark_read request
        await communicator.send_json_to(
            {
                "type": "mark_read",
                "notification_id": notification.id,
            }
        )

        # Should receive success response
        response = await communicator.receive_json_from()
        assert response["type"] == "mark_read_response"
        assert response["notification_id"] == notification.id
        assert response["success"] is True

        await communicator.disconnect()

    async def test_mark_all_notifications_read(self):
        """Test marking all notifications as read."""
        user = await create_user("testuser4")

        # Create multiple notifications
        await create_notification(user, "Title 1", "Message 1")
        await create_notification(user, "Title 2", "Message 2")
        await create_notification(user, "Title 3", "Message 3")

        unread_count = await get_notification_count(user, is_read=False)
        assert unread_count == 3

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        await communicator.connect()
        await communicator.receive_json_from()  # Connection confirmation

        # Send mark_all_read request
        await communicator.send_json_to(
            {
                "type": "mark_all_read",
            }
        )

        # Should receive success response
        response = await communicator.receive_json_from()
        assert response["type"] == "mark_all_read_response"
        assert response["marked_count"] == 3

        # Verify all are marked as read
        unread_count = await get_notification_count(user, is_read=False)
        assert unread_count == 0

        await communicator.disconnect()

    async def test_get_unread_count(self):
        """Test getting unread notification count."""
        user = await create_user("testuser5")

        # Create some unread notifications
        await create_notification(user, "Title 1", "Message 1")
        await create_notification(user, "Title 2", "Message 2")

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        await communicator.connect()
        await communicator.receive_json_from()  # Connection confirmation

        # Request unread count
        await communicator.send_json_to(
            {
                "type": "get_unread_count",
            }
        )

        # Should receive count
        response = await communicator.receive_json_from()
        assert response["type"] == "unread_count"
        assert response["count"] == 2

        await communicator.disconnect()

    async def test_invalid_json_handling(self):
        """Test handling of invalid JSON messages."""
        user = await create_user("testuser6")

        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/",
        )
        communicator.scope["user"] = user

        await communicator.connect()
        await communicator.receive_json_from()  # Connection confirmation

        # Send invalid JSON
        await communicator.send_to(text_data="invalid json{}")

        # Should receive error response
        response = await communicator.receive_json_from()
        assert response["type"] == "error"
        assert "Invalid JSON" in response["message"]

        await communicator.disconnect()

    async def test_notification_isolation(self):
        """Test that notifications are isolated per user."""
        user1 = await create_user("user1")
        user2 = await create_user("user2")

        # Connect both users
        comm1 = WebsocketCommunicator(application, "/ws/notifications/")
        comm1.scope["user"] = user1
        await comm1.connect()
        await comm1.receive_json_from()  # Connection confirmation

        comm2 = WebsocketCommunicator(application, "/ws/notifications/")
        comm2.scope["user"] = user2
        await comm2.connect()
        await comm2.receive_json_from()  # Connection confirmation

        # Broadcast notification to user1 only
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"notifications_user_{user1.id}",
            {
                "type": "notification_message",
                "notification_id": 999,
                "title": "For User 1 Only",
                "message": "Private message",
                "notification_type": "system",
                "related_object_id": None,
                "related_object_type": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        # User1 should receive it
        response1 = await comm1.receive_json_from()
        assert response1["type"] == "notification"
        assert response1["notification"]["title"] == "For User 1 Only"

        # User2 should NOT receive it (timeout means no message)
        with pytest.raises(TimeoutError):
            await comm2.receive_json_from(timeout=1)

        await comm1.disconnect()
        try:
            await comm2.disconnect()
        except asyncio.CancelledError:
            pass
