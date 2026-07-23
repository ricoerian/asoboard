import json
from datetime import datetime, timezone

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class CanvasSyncConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group_name = f"canvas_session_{self.session_id}"
        self.cursor_position = {"x": 0, "y": 0}
        if isinstance(self.user, AnonymousUser) or self.user.id is None:
            await self.close(code=4001)
            return
        has_access = await self.check_session_access()
        if not has_access:
            await self.close(code=4003)
            return
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined",
                "username": self.user.username,
                "user_id": self.user.id,
                "role": self.user.role,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    async def disconnect(self, close_code):
        if isinstance(self.user, AnonymousUser) or self.user.id is None:
            return
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_left",
                "username": self.user.username,
                "user_id": self.user.id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Invalid JSON format",
                    }
                )
            )
            return
        event_type = data.get("type")
        timestamp = datetime.now(timezone.utc).isoformat()
        if event_type == "canvas_event":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "canvas_event_broadcast",
                    "event": data.get("event"),
                    "sender_channel": self.channel_name,
                    "username": self.user.username,
                },
            )
        elif event_type == "cursor_move":
            self.cursor_position = data.get("position", {"x": 0, "y": 0})
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "cursor_update",
                    "position": self.cursor_position,
                    "username": self.user.username,
                    "user_id": self.user.id,
                    "sender_channel": self.channel_name,
                },
            )
        elif event_type == "chat_message":
            message = (data.get("message") or "").strip()[:500]
            if message:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_broadcast",
                        "message": message,
                        "username": self.user.username,
                        "user_id": self.user.id,
                        "role": self.user.role,
                        "timestamp": timestamp,
                    },
                )
        elif event_type == "hand_raise":
            is_raised = data.get("raised", True)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "hand_raise_broadcast",
                    "raised": is_raised,
                    "username": self.user.username,
                    "user_id": self.user.id,
                    "timestamp": timestamp,
                },
            )
        elif event_type == "permission_update":
            if self.user.role != "mentor":
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "error",
                            "message": "Only mentors can update permissions",
                        }
                    )
                )
                return
            can_draw = data.get("canDraw", True)
            target_user_id = data.get("targetUserId")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "permission_update_broadcast",
                    "canDraw": can_draw,
                    "targetUserId": target_user_id,
                    "sender_channel": self.channel_name,
                },
            )
        elif event_type == "mentor_broadcast":
            if self.user.role != "mentor":
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "error",
                            "message": "Only mentors can send broadcast messages",
                        }
                    )
                )
                return
            message = (data.get("message") or "").strip()[:500]
            canvas_state = data.get("canvas_state")
            if message or canvas_state:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "mentor_message_broadcast",
                        "message": message,
                        "username": self.user.username,
                        "timestamp": timestamp,
                        "canvas_state": canvas_state,
                        "targetUserId": data.get("targetUserId"),
                        "canvas_width": data.get("canvas_width"),
                        "canvas_height": data.get("canvas_height"),
                    },
                )
        elif event_type == "canvas_state_request":
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "canvas_state_response",
                        "message": "Request canvas state from server via REST API",
                    }
                )
            )
        elif event_type == "presence_sync":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_sync_broadcast",
                    "username": self.user.username,
                    "user_id": self.user.id,
                    "role": self.user.role,
                    "timestamp": timestamp,
                    "hand_raised": data.get("hand_raised", False),
                    "recent_chats": data.get("recent_chats", []),
                },
            )
        elif event_type == "webrtc_signal":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "webrtc_signal_broadcast",
                    "payload": data.get("payload"),
                    "sender_id": self.user.id,
                    "target_id": data.get("target_id"),
                    "sender_channel": self.channel_name,
                },
            )

    @database_sync_to_async
    def check_session_access(self):
        from .models import Enrollment, Session

        try:
            session = Session.objects.select_related("course").get(pk=self.session_id)
        except Session.DoesNotExist:
            return False
        if self.user.role == "mentor":
            return session.course.mentor_id == self.user.id or self.user.role == "staff"
        elif self.user.role == "student":
            return Enrollment.objects.filter(
                student=self.user, course=session.course
            ).exists()
        elif self.user.role == "staff":
            return True
        return False

    async def user_joined(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_joined",
                    "username": event["username"],
                    "user_id": event["user_id"],
                    "role": event["role"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def user_left(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_left",
                    "username": event["username"],
                    "user_id": event["user_id"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def canvas_event_broadcast(self, event):
        if event["sender_channel"] != self.channel_name:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "canvas_event",
                        "event": event["event"],
                        "username": event["username"],
                    }
                )
            )

    async def cursor_update(self, event):
        if event["sender_channel"] != self.channel_name:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "cursor_move",
                        "position": event["position"],
                        "username": event["username"],
                        "user_id": event["user_id"],
                    }
                )
            )

    async def chat_broadcast(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat_message",
                    "message": event["message"],
                    "username": event["username"],
                    "user_id": event["user_id"],
                    "role": event["role"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def hand_raise_broadcast(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "hand_raise",
                    "raised": event["raised"],
                    "username": event["username"],
                    "user_id": event["user_id"],
                    "timestamp": event["timestamp"],
                }
            )
        )

    async def permission_update_broadcast(self, event):
        payload = {
            "type": "permission_update",
            "canDraw": event["canDraw"],
        }
        if event.get("targetUserId") is not None:
            payload["targetUserId"] = event["targetUserId"]

        await self.send(text_data=json.dumps(payload))

    async def mentor_message_broadcast(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "mentor_broadcast",
                    "message": event["message"],
                    "username": event["username"],
                    "timestamp": event["timestamp"],
                    "canvas_state": event.get("canvas_state"),
                    "targetUserId": event.get("targetUserId"),
                    "canvas_width": event.get("canvas_width"),
                    "canvas_height": event.get("canvas_height"),
                }
            )
        )

    async def presence_sync_broadcast(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "presence_sync",
                    "username": event["username"],
                    "user_id": event["user_id"],
                    "role": event["role"],
                    "timestamp": event["timestamp"],
                    "hand_raised": event.get("hand_raised", False),
                    "recent_chats": event.get("recent_chats", []),
                }
            )
        )

    async def webrtc_signal_broadcast(self, event):
        if event["sender_channel"] != self.channel_name:
            if not event.get("target_id") or event["target_id"] == self.user.id:
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "webrtc_signal",
                            "payload": event["payload"],
                            "sender_id": event["sender_id"],
                        }
                    )
                )


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications."""

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or self.user.id is None:
            await self.close(code=4001)
            return

        self.notification_group_name = f"notifications_user_{self.user.id}"

        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name,
        )

        await self.accept()

        await self.send(
            text_data=json.dumps(
                {
                    "type": "connection_established",
                    "message": "Connected to notification channel",
                    "user_id": self.user.id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        )

    async def disconnect(self, close_code):
        if isinstance(self.user, AnonymousUser) or self.user.id is None:
            return

        await self.channel_layer.group_discard(
            self.notification_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "message": "Invalid JSON format",
                    }
                )
            )
            return

        event_type = data.get("type")

        if event_type == "mark_read":
            notification_id = data.get("notification_id")
            if notification_id:
                success = await self.mark_notification_read(notification_id)
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "mark_read_response",
                            "notification_id": notification_id,
                            "success": success,
                        }
                    )
                )

        elif event_type == "mark_all_read":
            count = await self.mark_all_notifications_read()
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "mark_all_read_response",
                        "marked_count": count,
                    }
                )
            )

        elif event_type == "get_unread_count":
            count = await self.get_unread_count()
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "unread_count",
                        "count": count,
                    }
                )
            )

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from .models import Notification

        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user,
            )
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def mark_all_notifications_read(self):
        from .models import Notification

        updated = Notification.objects.filter(
            recipient=self.user,
            is_read=False,
        ).update(is_read=True)
        return updated

    @database_sync_to_async
    def get_unread_count(self):
        from .models import Notification

        return Notification.objects.filter(
            recipient=self.user,
            is_read=False,
        ).count()

    async def notification_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "notification": {
                        "id": event["notification_id"],
                        "title": event["title"],
                        "message": event["message"],
                        "notification_type": event["notification_type"],
                        "related_object_id": event.get("related_object_id"),
                        "related_object_type": event.get("related_object_type"),
                        "is_read": False,
                        "created_at": event["created_at"],
                    },
                }
            )
        )
