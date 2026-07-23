import json

import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser

from core.consumers import CanvasSyncConsumer
from core.models import Course, Enrollment, Session, User


@pytest.fixture
def setup_data(transactional_db):
    mentor, _ = User.objects.get_or_create(
        username="mentor1", defaults={"role": "mentor"}
    )
    mentor.set_password("pass")
    mentor.save()
    student, _ = User.objects.get_or_create(
        username="student1", defaults={"role": "student"}
    )
    student.set_password("pass")
    student.save()
    student2, _ = User.objects.get_or_create(
        username="student2", defaults={"role": "student"}
    )
    student2.set_password("pass")
    student2.save()
    course, _ = Course.objects.get_or_create(
        title="Test Course", defaults={"mentor": mentor}
    )
    session, _ = Session.objects.get_or_create(
        title="Test Session", course=course, defaults={"mode": "freedom"}
    )
    Enrollment.objects.get_or_create(student=student, course=course)
    Enrollment.objects.get_or_create(student=student2, course=course)
    return {
        "mentor": mentor,
        "student": student,
        "student2": student2,
        "course": course,
        "session": session,
    }


def _comm(session_id, user=None):
    communicator = WebsocketCommunicator(
        CanvasSyncConsumer.as_asgi(),
        f"/ws/canvas/{session_id}/",
    )
    communicator.scope["url_route"] = {"kwargs": {"session_id": session_id}}
    if user is not None:
        communicator.scope["user"] = user
    return communicator


async def test_anonymous_user_rejected(setup_data):
    comm = _comm(setup_data["session"].id, AnonymousUser())
    connected, _ = await comm.connect()
    assert not connected


async def test_enrolled_student_can_connect(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    connected, code = await comm.connect()
    assert connected, f"Connection failed with code {code}"
    msg = await comm.receive_json_from()
    assert msg["type"] == "user_joined"
    assert msg["username"] == setup_data["student"].username
    assert msg["role"] == "student"
    await comm.disconnect()


async def test_mentor_can_connect(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["mentor"])
    connected, _ = await comm.connect()
    assert connected
    msg = await comm.receive_json_from()
    assert msg["type"] == "user_joined"
    assert msg["role"] == "mentor"
    await comm.disconnect()


async def test_unenrolled_student_rejected(setup_data):
    outsider = await database_sync_to_async(User.objects.create_user)(
        username="outsider", password="pass", role="student"
    )
    comm = _comm(setup_data["session"].id, outsider)
    connected, _ = await comm.connect()
    assert not connected


async def test_nonexistent_session_rejected(setup_data):
    comm = _comm(999999, setup_data["student"])
    connected, _ = await comm.connect()
    assert not connected


async def test_cursor_move_broadcast(setup_data):
    s1, s2 = setup_data["student"], setup_data["student2"]
    comm1 = _comm(setup_data["session"].id, s1)
    await comm1.connect()
    await comm1.receive_json_from()
    comm2 = _comm(setup_data["session"].id, s2)
    await comm2.connect()
    await comm2.receive_json_from()
    await comm1.receive_json_from()
    await comm1.send_to(
        text_data=json.dumps({"type": "cursor_move", "position": {"x": 100, "y": 200}})
    )
    cursor = await comm2.receive_json_from()
    assert cursor["type"] == "cursor_move"
    assert cursor["position"] == {"x": 100, "y": 200}
    assert cursor["username"] == s1.username
    await comm1.disconnect()
    await comm2.disconnect()


async def test_chat_message_broadcast(setup_data):
    comm1 = _comm(setup_data["session"].id, setup_data["student"])
    await comm1.connect()
    await comm1.receive_json_from()
    comm2 = _comm(setup_data["session"].id, setup_data["mentor"])
    await comm2.connect()
    await comm2.receive_json_from()
    await comm1.receive_json_from()
    await comm1.send_to(
        text_data=json.dumps({"type": "chat_message", "message": "Hello all!"})
    )
    _ = await comm1.receive_json_from()
    msg = await comm2.receive_json_from()
    assert msg["type"] == "chat_message"
    assert msg["message"] == "Hello all!"
    assert msg["username"] == setup_data["student"].username
    assert msg["role"] == "student"
    await comm1.disconnect()
    await comm2.disconnect()


async def test_hand_raise_broadcast(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    await comm.connect()
    await comm.receive_json_from()
    await comm.send_to(text_data=json.dumps({"type": "hand_raise", "raised": True}))
    msg = await comm.receive_json_from()
    assert msg["type"] == "hand_raise"
    assert msg["raised"] is True
    assert msg["username"] == setup_data["student"].username
    await comm.disconnect()


async def test_mentor_broadcast_allowed(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["mentor"])
    await comm.connect()
    await comm.receive_json_from()
    await comm.send_to(
        text_data=json.dumps({"type": "mentor_broadcast", "message": "Attention!"})
    )
    msg = await comm.receive_json_from()
    assert msg["type"] == "mentor_broadcast"
    assert msg["message"] == "Attention!"
    await comm.disconnect()


async def test_student_cannot_mentor_broadcast(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    await comm.connect()
    await comm.receive_json_from()
    await comm.send_to(
        text_data=json.dumps({"type": "mentor_broadcast", "message": "fail"})
    )
    msg = await comm.receive_json_from()
    assert msg["type"] == "error"
    assert "Only mentors" in msg["message"]
    await comm.disconnect()


async def test_user_left_on_disconnect(setup_data):
    comm1 = _comm(setup_data["session"].id, setup_data["student"])
    await comm1.connect()
    await comm1.receive_json_from()
    comm2 = _comm(setup_data["session"].id, setup_data["mentor"])
    await comm2.connect()
    await comm2.receive_json_from()
    await comm1.receive_json_from()
    await comm1.disconnect()
    msg = await comm2.receive_json_from()
    assert msg["type"] == "user_left"
    assert msg["username"] == setup_data["student"].username
    await comm2.disconnect()


async def test_invalid_json_returns_error(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    await comm.connect()
    await comm.receive_json_from()
    await comm.send_to(text_data="not valid json")
    msg = await comm.receive_json_from()
    assert msg["type"] == "error"
    assert msg["message"] == "Invalid JSON format"
    await comm.disconnect()


async def test_canvas_event_broadcast(setup_data):
    comm1 = _comm(setup_data["session"].id, setup_data["student"])
    await comm1.connect()
    await comm1.receive_json_from()
    comm2 = _comm(setup_data["session"].id, setup_data["mentor"])
    await comm2.connect()
    await comm2.receive_json_from()
    await comm1.receive_json_from()
    await comm1.send_to(
        text_data=json.dumps(
            {
                "type": "canvas_event",
                "event": {"tool": "pen", "points": [10, 20], "color": "#f00"},
            }
        )
    )
    msg = await comm2.receive_json_from()
    assert msg["type"] == "canvas_event"
    assert msg["event"]["tool"] == "pen"
    assert msg["username"] == setup_data["student"].username
    await comm1.disconnect()
    await comm2.disconnect()


async def test_user_joined_includes_timestamp(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    await comm.connect()
    msg = await comm.receive_json_from()
    assert "timestamp" in msg
    import re

    assert re.match(r"\d{4}-\d{2}-\d{2}T", msg["timestamp"])
    await comm.disconnect()


async def test_empty_chat_message_not_broadcast(setup_data):
    comm = _comm(setup_data["session"].id, setup_data["student"])
    await comm.connect()
    await comm.receive_json_from()
    await comm.send_to(text_data=json.dumps({"type": "chat_message", "message": ""}))
    import asyncio

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            comm.receive_from(),
            timeout=0.3,
        )
    await comm.disconnect()
