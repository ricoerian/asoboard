from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import (
    Achievement,
    Course,
    Session,
    StudentDiary,
    StudentSessionState,
    UserAchievement,
    UserPoints,
)
from core.views import check_and_award_achievements

User = get_user_model()


class AchievementModelTest(TestCase):
    def setUp(self):
        self.achievement = Achievement.objects.create(
            name="First Diary",
            description="Create your first diary",
            icon="🎯",
            category="diaries",
            requirement_type="diaries_created",
            requirement_value=1,
            points=10,
            is_active=True,
        )

    def test_achievement_creation(self):
        self.assertEqual(self.achievement.name, "First Diary")
        self.assertEqual(self.achievement.requirement_type, "diaries_created")
        self.assertEqual(self.achievement.requirement_value, 1)
        self.assertEqual(self.achievement.points, 10)
        self.assertTrue(self.achievement.is_active)

    def test_achievement_str(self):
        expected = "First Diary (diaries)"
        self.assertEqual(str(self.achievement), expected)


class UserAchievementLogicTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student1",
            email="student1@example.com",
            password="testpass123",
            role="student",
        )
        self.mentor = User.objects.create_user(
            username="mentor1",
            email="mentor1@example.com",
            password="testpass123",
            role="mentor",
        )
        self.achievement1 = Achievement.objects.create(
            name="First Diary",
            description="Create 1 diary",
            icon="🎯",
            category="diaries",
            requirement_type="diaries_created",
            requirement_value=1,
            points=10,
            is_active=True,
        )
        self.achievement2 = Achievement.objects.create(
            name="Five Diaries",
            description="Create 5 diaries",
            icon="⭐",
            category="diaries",
            requirement_type="diaries_created",
            requirement_value=5,
            points=50,
            is_active=True,
        )

    def test_check_achievements_no_progress(self):
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 0)

    def test_check_achievements_diary_created(self):
        StudentDiary.objects.create(student=self.student, title="Test Diary")
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 1)
        self.assertEqual(new_achievements[0]["name"], "First Diary")
        self.assertEqual(new_achievements[0]["points_earned"], 10)
        user_achievement = UserAchievement.objects.filter(
            user=self.student, achievement=self.achievement1
        )
        self.assertTrue(user_achievement.exists())
        user_points = UserPoints.objects.get(user=self.student)
        self.assertEqual(user_points.total_points, 10)

    def test_check_achievements_multiple_diaries(self):
        for i in range(5):
            StudentDiary.objects.create(student=self.student, title=f"Diary {i+1}")
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 2)
        user_points = UserPoints.objects.get(user=self.student)
        self.assertEqual(user_points.total_points, 60)

    def test_no_duplicate_achievements(self):
        StudentDiary.objects.create(student=self.student, title="Test Diary")
        check_and_award_achievements(self.student)
        initial_count = UserAchievement.objects.filter(user=self.student).count()
        check_and_award_achievements(self.student)
        final_count = UserAchievement.objects.filter(user=self.student).count()
        self.assertEqual(initial_count, final_count)

    def test_mentor_cannot_earn_achievements(self):
        mentor = User.objects.create_user(
            username="mentor_test",
            email="mentor_test@example.com",
            password="testpass123",
            role="mentor",
        )
        new_achievements = check_and_award_achievements(mentor)
        self.assertEqual(len(new_achievements), 0)

    def test_sessions_completed_achievement(self):
        Achievement.objects.create(
            name="First Session",
            description="Complete 1 session",
            icon="🎯",
            category="sessions",
            requirement_type="sessions_completed",
            requirement_value=1,
            points=20,
            is_active=True,
        )
        course = Course.objects.create(title="Test Course", mentor=self.mentor)
        session = Session.objects.create(title="Test Session", course=course)
        StudentSessionState.objects.create(student=self.student, session=session)
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 1)
        self.assertEqual(new_achievements[0]["name"], "First Session")

    def test_games_played_achievement(self):
        Achievement.objects.create(
            name="First Game",
            description="Play 1 game",
            icon="🎮",
            category="games",
            requirement_type="games_played",
            requirement_value=1,
            points=15,
            is_active=True,
        )
        course = Course.objects.create(title="Test Course", mentor=self.mentor)
        game_session = Session.objects.create(
            title="Test Game", course=course, mode="game"
        )
        StudentSessionState.objects.create(student=self.student, session=game_session)
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 1)
        self.assertEqual(new_achievements[0]["name"], "First Game")

    def test_inactive_achievements_not_awarded(self):
        self.achievement1.is_active = False
        self.achievement1.save()
        StudentDiary.objects.create(student=self.student, title="Test Diary")
        new_achievements = check_and_award_achievements(self.student)
        self.assertEqual(len(new_achievements), 0)


class AchievementAPITest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student_api",
            email="student_api@example.com",
            password="testpass123",
            role="student",
        )
        self.achievement = Achievement.objects.create(
            name="First Diary",
            description="Create 1 diary",
            icon="🎯",
            category="diaries",
            requirement_type="diaries_created",
            requirement_value=1,
            points=10,
            is_active=True,
        )
        self.client = APIClient()

    def test_list_achievements_authenticated(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/achievements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "First Diary")

    def test_list_achievements_unauthenticated(self):
        response = self.client.get("/api/achievements/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_achievements_endpoint(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/user-achievements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
        StudentDiary.objects.create(student=self.student, title="Test")
        check_and_award_achievements(self.student)
        response = self.client.get("/api/user-achievements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_check_achievements_endpoint(self):
        self.client.force_authenticate(user=self.student)
        StudentDiary.objects.create(student=self.student, title="Test")
        response = self.client.post("/api/check-achievements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("new_achievements", response.data)
        self.assertEqual(len(response.data["new_achievements"]), 1)

    def test_only_students_can_earn_achievements(self):
        mentor = User.objects.create_user(
            username="mentor_api",
            email="mentor_api@example.com",
            password="testpass123",
            role="mentor",
        )
        self.client.force_authenticate(user=mentor)
        response = self.client.post("/api/check-achievements/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
