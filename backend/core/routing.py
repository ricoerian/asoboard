from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path("ws/canvas/<int:session_id>/", consumers.CanvasSyncConsumer.as_asgi()),
    path("ws/notifications/", consumers.NotificationConsumer.as_asgi()),
]
