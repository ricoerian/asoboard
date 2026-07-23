"""
Analytics Views Part 2 - Engagement Metrics
"""

from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, GameSession, User
from .permissions import IsMentorOrStaff


class EngagementMetricsView(APIView):
    """
    Track student engagement patterns
    GET /api/analytics/engagement-metrics/?course_id=1&period=7
    """

    permission_classes = [IsAuthenticated, IsMentorOrStaff]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        period_days = int(request.query_params.get("period", 30))

        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)

        # Base queryset
        queryset = GameSession.objects.filter(
            completed_at__gte=start_date, completed_at__lte=end_date
        )

        # Filter by mentor's courses
        if request.user.role == "mentor":
            mentor_courses = Course.objects.filter(mentor=request.user).values_list(
                "id", flat=True
            )
            queryset = queryset.filter(session__course_id__in=mentor_courses)

        if course_id:
            queryset = queryset.filter(session__course_id=course_id)

        # Daily activity heatmap
        daily_activity = (
            queryset.extra(
                select={
                    "day": "DATE(completed_at)",
                    "hour": "EXTRACT(hour FROM completed_at)",
                }
            )
            .values("day", "hour")
            .annotate(activity_count=Count("id"))
            .order_by("day", "hour")
        )

        # Active students per day
        active_students = (
            queryset.values("completed_at__date")
            .annotate(active_count=Count("user", distinct=True))
            .order_by("completed_at__date")
        )

        # Peak activity times
        peak_hours = (
            queryset.extra(select={"hour": "EXTRACT(hour FROM completed_at)"})
            .values("hour")
            .annotate(total_activities=Count("id"))
            .order_by("-total_activities")[:5]
        )

        # Student engagement rate
        total_students = User.objects.filter(role="student").count()
        engaged_students = queryset.values("user").distinct().count()
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
                    "daily_activity": list(daily_activity),
                    "active_students_timeline": list(active_students),
                    "peak_activity_hours": list(peak_hours),
                    "period_days": period_days,
                },
            }
        )


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
