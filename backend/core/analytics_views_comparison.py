"""
Analytics Views - Comparison Analysis
"""

from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, GameSession
from .permissions import IsMentorOrStaff


class ComparisonAnalysisView(APIView):
    """
    Compare student performance against class average
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

        # Get student's performance
        student_sessions = GameSession.objects.filter(user_id=student_id)

        if course_id:
            student_sessions = student_sessions.filter(session__course_id=course_id)

        student_stats = student_sessions.aggregate(
            total_games=Count("id"),
            avg_score=Avg("score"),
            correct_count=Count("id", filter=Q(is_correct=True)),
        )

        # Get class average
        class_sessions = GameSession.objects.all()

        if course_id:
            class_sessions = class_sessions.filter(session__course_id=course_id)

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            class_sessions = class_sessions.filter(
                session__course_id__in=mentor_courses
            )

        class_stats = class_sessions.aggregate(
            total_games=Count("id"),
            avg_score=Avg("score"),
            correct_count=Count("id", filter=Q(is_correct=True)),
        )

        # Calculate percentile rank
        student_avg = student_stats["avg_score"] or 0
        better_count = (
            GameSession.objects.filter(score__gt=student_avg)
            .values("user")
            .distinct()
            .count()
        )

        total_students = GameSession.objects.values("user").distinct().count()
        percentile = round(
            (better_count / total_students * 100) if total_students > 0 else 0, 2
        )

        return Response(
            {
                "success": True,
                "data": {
                    "student_performance": {
                        "total_games": student_stats["total_games"] or 0,
                        "avg_score": round(student_stats["avg_score"] or 0, 2),
                        "correct_rate": round(
                            (
                                (
                                    student_stats["correct_count"]
                                    / student_stats["total_games"]
                                    * 100
                                )
                                if student_stats["total_games"]
                                else 0
                            ),
                            2,
                        ),
                    },
                    "class_average": {
                        "total_games": class_stats["total_games"] or 0,
                        "avg_score": round(class_stats["avg_score"] or 0, 2),
                        "correct_rate": round(
                            (
                                (
                                    class_stats["correct_count"]
                                    / class_stats["total_games"]
                                    * 100
                                )
                                if class_stats["total_games"]
                                else 0
                            ),
                            2,
                        ),
                    },
                    "comparison": {
                        "percentile_rank": percentile,
                        "above_average": student_avg > (class_stats["avg_score"] or 0),
                    },
                },
            }
        )
