"""
Analytics Views - Engagement Metrics
"""

from datetime import timedelta

from django.db.models import Count
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
