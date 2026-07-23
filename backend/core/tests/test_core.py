from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import UserPoints

User = get_user_model()


class GameAnswerValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.mentor = User.objects.create_user(
            username="mentor", password="pass123", role="mentor"
        )
        self.student = User.objects.create_user(
            username="student", password="pass123", role="student"
        )
        self.client.force_authenticate(user=self.mentor)

    def _create_course(self):
        response = self.client.post("/api/courses/", {"title": "Test Course"})
        return response.data["id"]

    def _create_session(self, course_id, game_type, game_config):
        response = self.client.post(
            "/api/sessions/",
            {
                "title": f"Test {game_type}",
                "course": course_id,
                "mode": "game",
                "game_type": game_type,
                "game_config": game_config,
            },
            format="json",
        )
        return response.data["id"]

    def test_trivia_correct_answer(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "trivia",
            {"question": "Q?", "options": ["A", "B", "C"], "correctIndex": 1},
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/", {"answer": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_correct"])

    def test_trivia_wrong_answer(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "trivia",
            {"question": "Q?", "options": ["A", "B"], "correctIndex": 0},
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/", {"answer": 1}, format="json"
        )
        self.assertFalse(response.data["is_correct"])

    def test_puzzle_correct_order(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id, "puzzle", {"puzzleItems": ["Step 1", "Step 2", "Step 3"]}
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": ["Step 1", "Step 2", "Step 3"]},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_puzzle_wrong_order(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id, "puzzle", {"puzzleItems": ["A", "B", "C"]}
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": ["B", "A", "C"]},
            format="json",
        )
        self.assertFalse(response.data["is_correct"])

    def test_math_correct_combination(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "math",
            {
                "leftLabel": "1000g",
                "options": ["500g", "500g", "200g"],
                "correctCombination": ["500g", "500g"],
            },
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": ["500g", "500g"]},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_color_correct_mix(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "color",
            {
                "targetLabel": "Purple",
                "options": ["Red", "Blue", "Yellow"],
                "correctCombination": ["Red", "Blue"],
            },
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": ["Blue", "Red"]},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_memory_correct(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "memory",
            {"pairs": [{"label": "A"}, {"label": "B"}, {"label": "C"}]},
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": [0, 1, 2]},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_maze_correct_path(self):
        course_id = self._create_course()
        grid = [[0, 0, 0], [1, 0, 0], [0, 0, 0]]
        session_id = self._create_session(
            course_id,
            "maze",
            {
                "rows": 3,
                "cols": 3,
                "grid": grid,
                "start": {"row": 0, "col": 0},
                "end": {"row": 2, "col": 2},
                "solutionPath": [
                    {"row": 0, "col": 0},
                    {"row": 0, "col": 1},
                    {"row": 0, "col": 2},
                    {"row": 1, "col": 2},
                    {"row": 2, "col": 2},
                ],
            },
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {
                "answer": [
                    {"row": 0, "col": 0},
                    {"row": 0, "col": 1},
                    {"row": 0, "col": 2},
                    {"row": 1, "col": 2},
                    {"row": 2, "col": 2},
                ]
            },
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_word_scramble_correct(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id, "word_scramble", {"answer": "Elephant", "hint": "Large animal"}
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": "elephant"},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])

    def test_flashcard_correct_answer(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "flashcard",
            {"question": "What is 2+2?", "answer": "4", "hint": "Basic math"},
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": "4"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_correct"])

    def test_flashcard_wrong_answer(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id,
            "flashcard",
            {"question": "Capital of France?", "answer": "Paris"},
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": "London"},
            format="json",
        )
        self.assertFalse(response.data["is_correct"])

    def test_flashcard_case_insensitive(self):
        course_id = self._create_course()
        session_id = self._create_session(
            course_id, "flashcard", {"question": "Largest ocean?", "answer": "Pacific"}
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/sessions/{session_id}/check_answer/",
            {"answer": "pacific"},
            format="json",
        )
        self.assertTrue(response.data["is_correct"])


class ProfileUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="student",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        response = self.client.get("/api/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@example.com")

    def test_update_email(self):
        response = self.client.patch("/api/me/", {"email": "new@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new@example.com")

    def test_update_username(self):
        response = self.client.patch("/api/me/", {"username": "newname"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newname")

    def test_update_username_too_short(self):
        response = self.client.patch("/api/me/", {"username": "ab"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_username_taken(self):
        User.objects.create_user(username="taken", password="pass123")
        response = self.client.patch("/api/me/", {"username": "taken"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="mentor",
        )
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        response = self.client.post(
            "/api/change-password/",
            {"current_password": "testpass123", "new_password": "newpass456"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass456"))

    def test_change_password_wrong_current(self):
        response = self.client.post(
            "/api/change-password/",
            {"current_password": "wrongpassword", "new_password": "newpass456"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_same_as_current(self):
        response = self.client.post(
            "/api/change-password/",
            {"current_password": "testpass123", "new_password": "testpass123"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_too_short(self):
        response = self.client.post(
            "/api/change-password/",
            {"current_password": "testpass123", "new_password": "short"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/change-password/",
            {"current_password": "testpass123", "new_password": "newpass456"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AssetSearchFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="staffuser",
            email="staff@example.com",
            password="pass123",
            role="staff",
        )
        self.mentor = User.objects.create_user(
            username="mentor2",
            email="mentor@example.com",
            password="pass123",
            role="mentor",
        )
        self.client.force_authenticate(user=self.staff_user)
        from core.models import Asset

        Asset.objects.bulk_create(
            [
                Asset(
                    title="Star Sticker", asset_type="image", created_by=self.staff_user
                ),
                Asset(
                    title="Rainbow Image",
                    asset_type="image",
                    created_by=self.staff_user,
                ),
                Asset(
                    title="Background Music",
                    asset_type="audio",
                    created_by=self.staff_user,
                ),
                Asset(
                    title="Click Sound", asset_type="audio", created_by=self.staff_user
                ),
                Asset(
                    title="Bounce Animation",
                    asset_type="animation",
                    created_by=self.staff_user,
                ),
                Asset(
                    title="Sparkle Effect",
                    asset_type="animation",
                    created_by=self.staff_user,
                ),
            ]
        )

    def test_list_all_assets_default(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/assets/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)

    def test_search_by_title_partial(self):
        response = self.client.get("/api/assets/?search=star")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Star Sticker")

    def test_search_by_title_case_insensitive(self):
        response = self.client.get("/api/assets/?search=STAR")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Star Sticker")

    def test_search_by_title_multiple_matches(self):
        response = self.client.get("/api/assets/?search=animation")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in response.data]
        self.assertIn("Bounce Animation", titles)

    def test_search_by_asset_type(self):
        response = self.client.get("/api/assets/?search=audio")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for asset in response.data:
            self.assertIn(asset["asset_type"], ["audio", "image", "animation"])

    def test_search_no_results(self):
        response = self.client.get("/api/assets/?search=nonexistentthing123")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_filter_by_image_type(self):
        response = self.client.get("/api/assets/?asset_type=image")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for asset in response.data:
            self.assertEqual(asset["asset_type"], "image")

    def test_filter_by_audio_type(self):
        response = self.client.get("/api/assets/?asset_type=audio")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for asset in response.data:
            self.assertEqual(asset["asset_type"], "audio")

    def test_filter_by_animation_type(self):
        response = self.client.get("/api/assets/?asset_type=animation")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for asset in response.data:
            self.assertEqual(asset["asset_type"], "animation")

    def test_filter_invalid_type_ignored(self):
        response = self.client.get("/api/assets/?asset_type=invalid_type")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)

    def test_ordering_by_title_asc(self):
        response = self.client.get("/api/assets/?ordering=title")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in response.data]
        self.assertEqual(titles, sorted(titles))

    def test_ordering_by_title_desc(self):
        response = self.client.get("/api/assets/?ordering=-title")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in response.data]
        self.assertEqual(titles, sorted(titles, reverse=True))

    def test_ordering_by_created_at_asc(self):
        response = self.client.get("/api/assets/?ordering=created_at")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dates = [a["created_at"] for a in response.data]
        self.assertEqual(dates, sorted(dates))

    def test_ordering_by_created_at_desc(self):
        response = self.client.get("/api/assets/?ordering=-created_at")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dates = [a["created_at"] for a in response.data]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_ordering_invalid_fallback_default(self):
        response = self.client.get("/api/assets/?ordering=invalid_field")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        dates = [a["created_at"] for a in response.data]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_search_and_filter_combined(self):
        response = self.client.get("/api/assets/?search=sound&asset_type=audio")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Click Sound")
        self.assertEqual(response.data[0]["asset_type"], "audio")

    def test_search_and_ordering_combined(self):
        response = self.client.get("/api/assets/?search=a&ordering=title")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in response.data]
        self.assertEqual(titles, sorted(titles))

    def test_filter_and_ordering_combined(self):
        response = self.client.get("/api/assets/?asset_type=image&ordering=-title")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        titles = [a["title"] for a in response.data]
        self.assertEqual(titles, sorted(titles, reverse=True))
        for asset in response.data:
            self.assertEqual(asset["asset_type"], "image")

    def test_unauthenticated_cannot_list(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/assets/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_search_returns_all(self):
        response = self.client.get("/api/assets/?search=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)


class LeaderboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student1 = User.objects.create_user(
            username="student1", password="pass123", role="student"
        )
        self.student2 = User.objects.create_user(
            username="student2", password="pass123", role="student"
        )
        self.student3 = User.objects.create_user(
            username="student3", password="pass123", role="student"
        )
        self.mentor = User.objects.create_user(
            username="teacher", password="pass123", role="mentor"
        )

    def _set_points(self, user, points):
        from core.models import UserPoints

        up, _ = UserPoints.objects.get_or_create(
            user=user, defaults={"total_points": 0}
        )
        up.total_points = points
        up.save()

    def _add_achievements(self, user, count):
        from core.models import Achievement, UserAchievement

        for i in range(count):
            ach = Achievement.objects.create(
                name=f"Test Achievement {user.id}_{i}",
                description="Test",
                requirement_value=1,
                requirement_type="sessions_completed",
                points=10,
            )
            UserAchievement.objects.create(user=user, achievement=ach)

    def test_returns_ranked_students(self):
        self._set_points(self.student3, 150)
        self._set_points(self.student1, 300)
        self._set_points(self.student2, 0)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["username"], "student1")
        self.assertEqual(response.data[0]["rank"], 1)
        self.assertEqual(response.data[0]["total_points"], 300)
        self.assertEqual(response.data[1]["username"], "student3")
        self.assertEqual(response.data[1]["rank"], 2)
        self.assertEqual(response.data[1]["total_points"], 150)
        self.assertEqual(response.data[2]["username"], "student2")
        self.assertEqual(response.data[2]["rank"], 3)
        self.assertEqual(response.data[2]["total_points"], 0)

    def test_excludes_mentors(self):
        self._set_points(self.student1, 100)
        self._set_points(self.mentor, 500)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        usernames = [e["username"] for e in response.data]
        self.assertNotIn("teacher", usernames)

    def test_user_id_included(self):
        self._set_points(self.student1, 100)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        entry = response.data[0]
        self.assertEqual(entry["user_id"], self.student1.id)

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_achievements_count(self):
        self._set_points(self.student1, 200)
        self._add_achievements(self.student1, 5)
        self._set_points(self.student2, 100)
        self._add_achievements(self.student2, 2)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.data[0]["username"], "student1")
        self.assertEqual(response.data[0]["achievements_count"], 5)
        self.assertEqual(response.data[1]["username"], "student2")
        self.assertEqual(response.data[1]["achievements_count"], 2)

    def test_zero_points_students_included(self):
        self._set_points(self.student1, 0)
        self._set_points(self.student2, 0)
        self._set_points(self.student3, 0)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(len(response.data), 3)
        for entry in response.data:
            self.assertEqual(entry["total_points"], 0)

    def test_response_structure(self):
        self._set_points(self.student1, 42)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        entry = response.data[0]
        self.assertIn("rank", entry)
        self.assertIn("user_id", entry)
        self.assertIn("username", entry)
        self.assertIn("role", entry)
        self.assertIn("total_points", entry)
        self.assertIn("achievements_count", entry)

    def test_period_all_time_default(self):
        self._set_points(self.student1, 100)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_period_weekly(self):
        self._set_points(self.student1, 100)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/?period=weekly")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_period_monthly(self):
        self._set_points(self.student1, 100)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/?period=monthly")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tie_same_points(self):
        self._set_points(self.student1, 50)
        self._set_points(self.student2, 50)
        self._set_points(self.student3, 50)
        self.client.force_authenticate(user=self.student1)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["total_points"], 50)
        self.assertEqual(response.data[1]["total_points"], 50)
        self.assertEqual(response.data[2]["total_points"], 50)

    def test_mentor_can_view_leaderboard(self):
        self._set_points(self.student1, 100)
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/leaderboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)


class UserStreakTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="streakuser", password="pass123", role="student"
        )
        self.client.force_authenticate(user=self.student)

    def test_get_streak_returns_default(self):
        response = self.client.get("/api/streak/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_streak"], 0)
        self.assertEqual(response.data["longest_streak"], 0)
        self.assertIsNone(response.data["last_active_date"])

    def test_update_streak_first_time(self):
        response = self.client.post("/api/streak/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_streak"], 1)
        self.assertEqual(response.data["longest_streak"], 1)
        self.assertFalse(response.data["leveled_up"])

    def test_update_streak_consecutive_day(self):
        from datetime import date, timedelta

        yesterday = date.today() - timedelta(days=1)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=3,
            longest_streak=5,
            last_active_date=yesterday,
        )
        response = self.client.post("/api/streak/")
        self.assertEqual(response.data["current_streak"], 4)
        self.assertEqual(response.data["longest_streak"], 5)

    def test_update_streak_beats_longest(self):
        from datetime import date, timedelta

        yesterday = date.today() - timedelta(days=1)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=5,
            longest_streak=5,
            last_active_date=yesterday,
        )
        response = self.client.post("/api/streak/")
        self.assertEqual(response.data["current_streak"], 6)
        self.assertEqual(response.data["longest_streak"], 6)

    def test_update_streak_missed_day_resets(self):
        from datetime import date, timedelta

        two_days_ago = date.today() - timedelta(days=2)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=10,
            longest_streak=15,
            last_active_date=two_days_ago,
        )
        response = self.client.post("/api/streak/")
        self.assertEqual(response.data["current_streak"], 1)
        self.assertEqual(response.data["longest_streak"], 15)

    def test_update_streak_same_day_no_change(self):
        from datetime import date

        today = date.today()
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=3,
            longest_streak=5,
            last_active_date=today,
        )
        response = self.client.post("/api/streak/")
        self.assertEqual(response.data["current_streak"], 3)

    def test_streak_milestone_day_7(self):
        from datetime import date, timedelta

        yesterday = date.today() - timedelta(days=1)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=6,
            longest_streak=6,
            last_active_date=yesterday,
        )
        response = self.client.post("/api/streak/")
        self.assertTrue(response.data["leveled_up"])
        self.assertEqual(response.data["milestone"], 7)

    def test_streak_milestone_day_30(self):
        from datetime import date, timedelta

        yesterday = date.today() - timedelta(days=1)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=29,
            longest_streak=29,
            last_active_date=yesterday,
        )
        response = self.client.post("/api/streak/")
        self.assertTrue(response.data["leveled_up"])
        self.assertEqual(response.data["milestone"], 30)

    def test_streak_milestone_day_100(self):
        from datetime import date, timedelta

        yesterday = date.today() - timedelta(days=1)
        from core.models import UserStreak

        UserStreak.objects.create(
            user=self.student,
            current_streak=99,
            longest_streak=99,
            last_active_date=yesterday,
        )
        response = self.client.post("/api/streak/")
        self.assertTrue(response.data["leveled_up"])
        self.assertEqual(response.data["milestone"], 100)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/streak/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_streak_response_structure(self):
        response = self.client.post("/api/streak/")
        self.assertIn("current_streak", response.data)
        self.assertIn("longest_streak", response.data)
        self.assertIn("leveled_up", response.data)
        self.assertIn("milestone", response.data)
        self.assertIn("username", response.data)


class EnrollmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.mentor = User.objects.create_user(
            username="mentor_enroll", password="pass123", role="mentor"
        )
        self.student = User.objects.create_user(
            username="student_x", password="pass123", role="student"
        )
        self.student2 = User.objects.create_user(
            username="student_y", password="pass123", role="student"
        )
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post("/api/courses/", {"title": "Cool Course"})
        self.course_id = response.data["id"]
        response2 = self.client.post("/api/courses/", {"title": "Other Course"})
        self.course2_id = response2.data["id"]

    def test_student_can_enroll(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post("/api/enrollments/", {"course": self.course_id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["course"], self.course_id)
        self.assertEqual(response.data["student"], self.student.id)

    def test_student_can_list_own_enrollments(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.post("/api/enrollments/", {"course": self.course2_id})
        response = self.client.get("/api/enrollments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_student_cannot_see_other_enrollments(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.student2)
        response = self.client.get("/api/enrollments/")
        self.assertEqual(len(response.data), 0)

    def test_mentor_can_see_course_enrollments(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.student2)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get(f"/api/enrollments/?course_id={self.course_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_student_can_unenroll(self):
        self.client.force_authenticate(user=self.student)
        enroll_response = self.client.post(
            "/api/enrollments/", {"course": self.course_id}
        )
        enrollment_id = enroll_response.data["id"]
        response = self.client.delete(f"/api/enrollments/{enrollment_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        list_response = self.client.get("/api/enrollments/")
        self.assertEqual(len(list_response.data), 0)

    def test_duplicate_enrollment_rejected(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        response = self.client.post("/api/enrollments/", {"course": self.course_id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mentor_cannot_enroll(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post("/api/enrollments/", {"course": self.course_id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_enroll(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/enrollments/", {"course": self.course_id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_enrollment_count_on_course_list(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.student2)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/courses/")
        data = response.data
        course_data = next((c for c in data if c["id"] == self.course_id), None)
        self.assertIsNotNone(course_data)
        self.assertEqual(course_data["enrollment_count"], 2)

    def test_course_filter_by_enrolled(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        response = self.client.get("/api/courses/?enrolled=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.course_id)

    def test_student_enrolled_sees_only_own(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.student2)
        self.client.post("/api/enrollments/", {"course": self.course2_id})
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/courses/?enrolled=true")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.course_id)

    def test_enrollment_count_zero_by_default(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/courses/")
        for course in response.data:
            self.assertEqual(course["enrollment_count"], 0)

    def test_course_detail_includes_enrollment_count(self):
        self.client.force_authenticate(user=self.student)
        self.client.post("/api/enrollments/", {"course": self.course_id})
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get(f"/api/courses/{self.course_id}/")
        self.assertEqual(response.data["enrollment_count"], 1)


class DiaryCommentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="diary_student", password="pass123", role="student"
        )
        self.mentor = User.objects.create_user(
            username="diary_mentor", password="pass123", role="mentor"
        )
        from core.models import Course, Enrollment

        self.course = Course.objects.create(
            title="Mentor's Course", description="Test Course", mentor=self.mentor
        )
        Enrollment.objects.create(student=self.student, course=self.course)

        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/student-diaries/",
            {"title": "My Sketchbook", "canvas_events": []},
            format="json",
        )
        self.diary_id = response.data["id"]

    def test_mentor_can_add_comment(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Great work!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Great work!")
        self.assertEqual(response.data["author_username"], "diary_mentor")
        self.assertEqual(response.data["diary"], self.diary_id)

    def test_student_can_add_comment_on_own_diary(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Self note"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_comments_for_diary(self):
        self.client.force_authenticate(user=self.mentor)
        self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Nice"},
            format="json",
        )
        self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Keep it up"},
            format="json",
        )
        response = self.client.get(f"/api/diary-comments/?diary_id={self.diary_id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_empty_comment_rejected(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comment_author_can_delete(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Nice"},
            format="json",
        )
        comment_id = response.data["id"]
        delete_response = self.client.delete(f"/api/diary-comments/{comment_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_unauthenticated_cannot_comment(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mentor_can_view_student_diary(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get(f"/api/student-diaries/{self.diary_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "My Sketchbook")

    def test_comment_ordering_is_chronological(self):
        self.client.force_authenticate(user=self.mentor)
        self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "First"},
            format="json",
        )
        self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Second"},
            format="json",
        )
        response = self.client.get(f"/api/diary-comments/?diary_id={self.diary_id}")
        contents = [c["content"] for c in response.data]
        self.assertEqual(contents, ["First", "Second"])

    def test_comment_includes_author_username(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(
            "/api/diary-comments/",
            {"diary": self.diary_id, "content": "Hi"},
            format="json",
        )
        self.assertIn("author_username", response.data)
        self.assertEqual(response.data["author_username"], "diary_mentor")


class UserLevelTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username="level_student", password="pass123", role="student"
        )
        self.mentor = User.objects.create_user(
            username="level_mentor", password="pass123", role="mentor"
        )

    def _set_points(self, user, points):
        up, _ = UserPoints.objects.get_or_create(user=user)
        up.total_points = points
        up.save()

    def test_default_level_one(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["level"], 1)
        self.assertEqual(response.data["current_xp"], 0)
        self.assertEqual(response.data["progress_percent"], 0)
        self.assertEqual(response.data["total_points"], 0)

    def test_level_boundary_99_points(self):
        self._set_points(self.student, 99)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 1)
        self.assertEqual(response.data["current_xp"], 99)
        self.assertEqual(response.data["progress_percent"], 99)

    def test_level_boundary_100_points(self):
        self._set_points(self.student, 100)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 2)
        self.assertEqual(response.data["current_xp"], 0)
        self.assertEqual(response.data["progress_percent"], 0)

    def test_level_two_partial(self):
        self._set_points(self.student, 150)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 2)
        self.assertEqual(response.data["current_xp"], 50)
        self.assertEqual(response.data["progress_percent"], 50)

    def test_level_five(self):
        self._set_points(self.student, 450)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 5)
        self.assertEqual(response.data["current_xp"], 50)

    def test_level_ten(self):
        self._set_points(self.student, 900)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 10)
        self.assertEqual(response.data["current_xp"], 0)

    def test_unauthenticated(self):
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mentor_cannot_see_level(self):
        self._set_points(self.mentor, 250)
        self.client.force_authenticate(user=self.mentor)
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["error"], "Level system is only available for students"
        )

    def test_staff_cannot_see_level(self):
        staff = User.objects.create_user(
            username="staff_level", password="pass123", role="staff"
        )
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_cannot_see_level(self):
        parent = User.objects.create_user(
            username="parent_level", password="pass123", role="parent"
        )
        self.client.force_authenticate(user=parent)
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_xp_for_next_level_constant(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["xp_for_next_level"], 100)

    def test_response_structure(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        keys = {
            "level",
            "current_xp",
            "xp_for_next_level",
            "progress_percent",
            "total_points",
        }
        self.assertTrue(keys.issubset(set(response.data.keys())))

    def test_auto_creates_userpoints(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["level"], 1)
        self.assertTrue(UserPoints.objects.filter(user=self.student).exists())

    def test_zero_points_level_one(self):
        self._set_points(self.student, 0)
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/level/")
        self.assertEqual(response.data["level"], 1)
        self.assertEqual(response.data["total_points"], 0)
