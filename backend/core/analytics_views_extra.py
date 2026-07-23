"""
Additional Analytics Views - Difficulty & Comparison Analysis
"""

from django.db.models import Avg, Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Course,
    Session,
    StudentDiary,
    StudentSessionState,
    UserAchievement,
)
from .permissions import IsMentorOrStaff


class DifficultyAnalysisView(APIView):
    """
    Analyze session difficulty based on student participation
    GET /api/analytics/difficulty-analysis/?course_id=1&game_type=trivia
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        game_type = request.query_params.get("game_type")

        # Get game sessions
        queryset = Session.objects.filter(mode="game")

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(course_id__in=mentor_courses)

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        if game_type:
            queryset = queryset.filter(game_type=game_type)

        # Calculate participation rate as difficulty indicator
        difficulty_data = (
            queryset.annotate(
                total_attempts=Count("student_states"),
                students_participated=Count("student_states__student", distinct=True),
                avg_events=Avg("student_states__canvas_events__len"),
            )
            .values(
                "id",
                "title",
                "game_type",
                "total_attempts",
                "students_participated",
                "avg_events",
            )
            .order_by("-total_attempts")[:20]
        )

        return Response(
            {
                "success": True,
                "data": {
                    "sessions_by_participation": list(difficulty_data),
                    "filters": {"course_id": course_id, "game_type": game_type},
                },
            }
        )


class ComparisonAnalysisView(APIView):
    """
    Compare student participation against class average
    GET /api/analytics/comparison/?student_id=2&course_id=1
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        course_id = request.query_params.get("course_id")

        if not student_id:
            return Response(
                {"success": False, "message": "student_id is required"}, status=400
            )

        # Get student's participation
        student_states = StudentSessionState.objects.filter(student_id=student_id)

        if course_id:
            student_states = student_states.filter(session__course_id=course_id)

        student_stats = {
            "total_sessions": student_states.count(),
            "diaries": (
                StudentDiary.objects.filter(student_id=student_id).count()
                if hasattr(self, "StudentDiary")
                else 0
            ),
            "achievements": UserAchievement.objects.filter(user_id=student_id).count(),
        }

        # Get class average
        class_states = StudentSessionState.objects.all()

        if course_id:
            class_states = class_states.filter(session__course_id=course_id)

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            class_states = class_states.filter(session__course_id__in=mentor_courses)

        total_students = class_states.values("student").distinct().count()
        avg_sessions_per_student = (
            class_states.count() / total_students if total_students > 0 else 0
        )

        class_stats = {
            "total_students": total_students,
            "avg_sessions": round(avg_sessions_per_student, 2),
        }

        # Calculate student rank
        students_with_more = (
            StudentSessionState.objects.values("student")
            .annotate(session_count=Count("id"))
            .filter(session_count__gt=student_stats["total_sessions"])
            .count()
        )

        percentile = round(
            (students_with_more / total_students * 100) if total_students > 0 else 0, 2
        )

        return Response(
            {
                "success": True,
                "data": {
                    "student_performance": student_stats,
                    "class_average": class_stats,
                    "comparison": {
                        "percentile_rank": percentile,
                        "above_average": student_stats["total_sessions"]
                        > avg_sessions_per_student,
                    },
                },
            }
        )
