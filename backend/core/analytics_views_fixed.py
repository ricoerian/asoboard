"""
Analytics Views for AsoBoard MVP (Fixed for existing models)
Provides aggregated performance data using StudentSessionState
"""

from datetime import timedelta

from django.db.models import Avg, Case, Count, IntegerField, When
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Course,
    Session,
    StudentDiary,
    StudentSessionState,
    User,
    UserAchievement,
)
from .permissions import IsMentorOrStaff


class GamePerformanceView(APIView):
    """
    Aggregate game performance metrics per game type
    GET /api/analytics/game-performance/?course_id=1&date_from=2026-01-01
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        game_type = request.query_params.get("game_type")

        # Get sessions with game mode
        queryset = Session.objects.filter(mode="game")

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(course_id__in=mentor_courses)

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        if game_type:
            queryset = queryset.filter(game_type=game_type)

        # Aggregate session participation
        performance_data = (
            queryset.values("game_type")
            .annotate(
                total_sessions=Count("id"),
                unique_students=Count("student_states__student", distinct=True),
                total_attempts=Count("student_states"),
                avg_completion=Avg(
                    Case(
                        When(student_states__canvas_events__len__gt=0, then=1),
                        default=0,
                        output_field=IntegerField(),
                    )
                ),
            )
            .order_by("-total_sessions")
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
    Individual student progress timeline
    GET /api/analytics/student-progress/{student_id}/?course_id=1
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request, student_id):
        course_id = request.query_params.get("course_id")

        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "Student not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get student session states
        session_states = StudentSessionState.objects.filter(student=student)

        if course_id:
            session_states = session_states.filter(session__course_id=course_id)

        # Check permission
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            session_states = session_states.filter(
                session__course_id__in=mentor_courses
            )

        # Timeline aggregation
        progress_timeline = (
            session_states.values("updated_at__date")
            .annotate(sessions_worked=Count("id"), total_events=Count("canvas_events"))
            .order_by("updated_at__date")
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

        # Overall stats
        total_sessions = session_states.count()
        diaries_count = StudentDiary.objects.filter(student=student).count()

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
                        "total_sessions": total_sessions,
                        "diaries_created": diaries_count,
                        "achievements_earned": achievements.count(),
                    },
                    "timeline": list(progress_timeline),
                    "recent_achievements": achievement_data,
                },
            }
        )


class EngagementMetricsView(APIView):
    """
    Track student engagement patterns
    GET /api/analytics/engagement-metrics/?course_id=1&period=30
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        period_days = int(request.query_params.get("period", 30))

        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)

        queryset = StudentSessionState.objects.filter(
            updated_at__gte=start_date, updated_at__lte=end_date
        )

        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(session__course_id__in=mentor_courses)

        if course_id:
            queryset = queryset.filter(session__course_id=course_id)

        # Active students per day
        active_students = (
            queryset.values("updated_at__date")
            .annotate(active_count=Count("student", distinct=True))
            .order_by("updated_at__date")
        )

        # Total engagement
        total_students = User.objects.filter(role="student").count()
        engaged_students = queryset.values("student").distinct().count()
        engagement_rate = round(
            (engaged_students / total_students * 100) if total_students > 0 else 0, 2
        )

        return Response(
            {
                "success": True,
                "data": {
                    "engagement_rate": engagement_rate,
                    "total_students": total_students,
                    "engaged_students": engaged_students,
                    "active_students_timeline": list(active_students),
                    "period_days": period_days,
                },
            }
        )
