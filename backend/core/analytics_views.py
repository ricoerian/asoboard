"""
Analytics Views for AsoBoard MVP
Provides aggregated game performance data for mentor insights
"""


from django.db.models import Avg, Case, Count, F, IntegerField, Q, When
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Course,
    GameSession,
    User,
    UserAchievement,
)
from .permissions import IsMentorOrStaff


class GamePerformanceView(APIView):
    """
    Aggregate game performance metrics per game type.
    GET /api/analytics/game-performance/
        ?course_id=1&date_from=2026-01-01&date_to=2026-12-31
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        # Get query parameters
        course_id = request.query_params.get("course_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        game_type = request.query_params.get("game_type")

        # Base queryset
        queryset = GameSession.objects.all()

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(session__course_id__in=mentor_courses)

        # Apply filters
        if course_id:
            queryset = queryset.filter(session__course_id=course_id)

        if date_from:
            queryset = queryset.filter(completed_at__gte=date_from)

        if date_to:
            queryset = queryset.filter(completed_at__lte=date_to)

        if game_type:
            queryset = queryset.filter(game_type=game_type)

        # Aggregate by game type
        performance_data = (
            queryset.values("game_type")
            .annotate(
                total_attempts=Count("id"),
                total_correct=Count("id", filter=Q(is_correct=True)),
                total_incorrect=Count("id", filter=Q(is_correct=False)),
                avg_score=Avg("score"),
                unique_students=Count("user", distinct=True),
                completion_rate=Case(
                    When(total_attempts=0, then=0),
                    default=F("total_correct") * 100.0 / F("total_attempts"),
                    output_field=IntegerField(),
                ),
            )
            .order_by("-total_attempts")
        )

        return Response(
            {
                "success": True,
                "data": list(performance_data),
                "filters": {
                    "course_id": course_id,
                    "date_from": date_from,
                    "date_to": date_to,
                    "game_type": game_type,
                },
            }
        )


class StudentProgressView(APIView):
    """
    Individual student progress timeline with achievements
    GET /api/analytics/student-progress/{student_id}/?course_id=1
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request, student_id):
        course_id = request.query_params.get("course_id")

        # Verify student exists
        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "Student not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get game sessions
        game_sessions = GameSession.objects.filter(user=student)

        if course_id:
            game_sessions = game_sessions.filter(session__course_id=course_id)

        # Check permission (mentor can only view their own students)
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            game_sessions = game_sessions.filter(session__course_id__in=mentor_courses)

        # Aggregate progress data
        progress_timeline = (
            game_sessions.values("completed_at__date")
            .annotate(
                games_completed=Count("id"),
                avg_score=Avg("score"),
                correct_answers=Count("id", filter=Q(is_correct=True)),
            )
            .order_by("completed_at__date")
        )

        # Get achievements
        achievements = (
            UserAchievement.objects.filter(user=student)
            .select_related("achievement")
            .order_by("-earned_at")[:10]
        )

        achievement_data = [
            {
                "name": ua.achievement.name,
                "description": ua.achievement.description,
                "icon": ua.achievement.icon,
                "points": ua.achievement.points,
                "earned_at": ua.earned_at,
            }
            for ua in achievements
        ]

        # Get overall stats
        total_games = game_sessions.count()
        total_correct = game_sessions.filter(is_correct=True).count()
        avg_score = game_sessions.aggregate(Avg("score"))["score__avg"] or 0

        return Response(
            {
                "success": True,
                "data": {
                    "student": {
                        "id": student.id,
                        "username": student.username,
                        "email": student.email,
                    },
                    "overall_stats": {
                        "total_games": total_games,
                        "total_correct": total_correct,
                        "avg_score": round(avg_score, 2),
                        "completion_rate": round(
                            (
                                (total_correct / total_games * 100)
                                if total_games > 0
                                else 0
                            ),
                            2,
                        ),
                    },
                    "timeline": list(progress_timeline),
                    "recent_achievements": achievement_data,
                },
            }
        )


class DifficultyAnalysisView(APIView):
    """
    Analyze question difficulty across all games
    GET /api/analytics/difficulty-analysis/?course_id=1&game_type=trivia
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        game_type = request.query_params.get("game_type")

        # Base queryset
        queryset = GameSession.objects.all()

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(session__course_id__in=mentor_courses)

        if course_id:
            queryset = queryset.filter(session__course_id=course_id)

        if game_type:
            queryset = queryset.filter(game_type=game_type)

        # Aggregate by session (each session represents a question/game)
        difficulty_data = (
            queryset.values("session_id", "session__title", "game_type")
            .annotate(
                total_attempts=Count("id"),
                correct_attempts=Count("id", filter=Q(is_correct=True)),
                error_rate=Case(
                    When(total_attempts=0, then=0),
                    default=(F("total_attempts") - F("correct_attempts"))
                    * 100.0
                    / F("total_attempts"),
                    output_field=IntegerField(),
                ),
                avg_score=Avg("score"),
            )
            .order_by("-error_rate")[:20]
        )  # Top 20 hardest questions

        return Response(
            {
                "success": True,
                "data": {
                    "hardest_questions": list(difficulty_data),
                    "filters": {"course_id": course_id, "game_type": game_type},
                },
            }
        )
