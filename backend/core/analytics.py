import csv
from datetime import timedelta

from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    Asset,
    Course,
    Enrollment,
    Session,
    StudentDiary,
    StudentSessionState,
    User,
)


def get_system_analytics():
    """
    Returns high-level system analytics for Staff users.
    """
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    # Active users in last 30 days (using last_login for approximation)
    active_users_30d = (
        User.objects.filter(last_login__gte=thirty_days_ago).distinct().count()
    )

    total_students = User.objects.filter(role="student").count()
    total_mentors = User.objects.filter(role="mentor").count()
    total_parents = User.objects.filter(role="parent").count()
    total_users = User.objects.count()
    total_courses = Course.objects.count()
    total_sessions = Session.objects.count()
    total_games = StudentSessionState.objects.count()
    total_diaries = StudentDiary.objects.count()

    # Most popular courses
    popular_courses = Course.objects.annotate(
        enrollment_count=Count("enrollments")
    ).order_by("-enrollment_count")[:5]

    popular_data = [
        {
            "title": c.title,
            "mentor": c.mentor.username if c.mentor else "Unknown",
            "students": c.enrollment_count,
        }
        for c in popular_courses
    ]

    # 7-day DAU trend
    dau_trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)
        count = User.objects.filter(
            last_login__gte=day_start, last_login__lt=day_end
        ).count()
        dau_trend.append({"date": day_start.strftime("%Y-%m-%d"), "count": count})

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_mentors": total_mentors,
        "total_parents": total_parents,
        "total_courses": total_courses,
        "total_sessions": total_sessions,
        "total_games": total_games,
        "total_diaries": total_diaries,
        "active_users_30d": active_users_30d,
        "popular_courses": popular_data,
        "dau_trend": dau_trend,
    }


def get_mentor_analytics(mentor_user):
    """
    Returns analytics specific to a Mentor's courses and students.
    """
    # Total sessions created by this mentor
    total_sessions = Session.objects.filter(course__mentor=mentor_user).count()

    # Total unique students enrolled in mentor's courses
    total_students_enrolled = (
        Enrollment.objects.filter(course__mentor=mentor_user).distinct().count()
    )

    # Calculate average game score across all student states for mentor's courses
    # Since we don't have a direct game_score field, we approximate engagement via canvas_events length  # noqa: E501
    student_states = StudentSessionState.objects.filter(
        session__course__mentor=mentor_user
    )

    total_engagement = 0
    valid_states = 0
    for state in student_states:
        if isinstance(state.canvas_events, list):
            total_engagement += len(state.canvas_events)
            valid_states += 1

    avg_engagement = round(total_engagement / valid_states) if valid_states > 0 else 0

    # Recent sessions
    recent = Session.objects.filter(course__mentor=mentor_user).order_by("-created_at")[
        :5
    ]
    recent_activity = [
        {
            "title": s.title,
            "mode": s.mode,
            "course": s.course.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in recent
    ]

    return {
        "total_courses": mentor_user.courses.count(),
        "total_students_enrolled": total_students_enrolled,
        "total_students": total_students_enrolled,
        "total_sessions": total_sessions,
        "student_engagement": avg_engagement,
        "recent_activity": recent_activity,
    }


def get_student_insights(student_user):
    """
    Returns deep learning insights for a particular student.
    """
    points = getattr(student_user, "points", None)
    total_points = points.total_points if points else 0
    level = (total_points // 100) + 1

    states = StudentSessionState.objects.filter(student=student_user).order_by(
        "created_at"
    )

    # Activity over time (Last 7 states)
    activity_history = []
    for state in states[:7]:
        events_count = (
            len(state.canvas_events) if isinstance(state.canvas_events, list) else 0
        )
        activity_history.append(
            {
                "date": state.updated_at.strftime("%Y-%m-%d"),
                "session": state.session.title,
                "interactions": events_count,
            }
        )

    achievements = (
        student_user.achievements.all()
        .select_related("achievement")
        .order_by("-earned_at")[:5]
    )
    achievements_data = [
        {"name": a.achievement.name, "date": a.earned_at.strftime("%Y-%m-%d")}
        for a in achievements
    ]

    return {
        "total_points": total_points,
        "level": level,
        "activity_history": activity_history,
        "recent_achievements": achievements_data,
    }


def get_asset_usage_analytics():
    """
    Returns the top 10 most used assets.
    """
    assets = Asset.objects.order_by("-usage_count")[:10]
    return [
        {
            "id": a.id,
            "title": a.title,
            "type": a.asset_type,
            "usage_count": a.usage_count,
        }
        for a in assets
    ]


def export_csv_report(report_type, user):
    """
    Generates a CSV HttpResponse based on the report type.
    """
    response = HttpResponse(content_type="text/csv")

    if report_type == "users" and user.role == "staff":
        response["Content-Disposition"] = 'attachment; filename="users_report.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Username", "Role", "Email", "Date Joined"])
        for u in User.objects.all():
            writer.writerow(
                [u.id, u.username, u.role, u.email, u.date_joined.strftime("%Y-%m-%d")]
            )

    elif report_type == "courses" and user.role == "staff":
        response["Content-Disposition"] = 'attachment; filename="courses_report.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Title", "Mentor", "Created At", "Enrollments"])
        for c in Course.objects.annotate(enc=Count("enrollments")):
            writer.writerow(
                [
                    c.id,
                    c.title,
                    c.mentor.username if c.mentor else "None",
                    c.created_at.strftime("%Y-%m-%d"),
                    c.enc,
                ]
            )

    elif report_type == "students" and user.role == "mentor":
        response["Content-Disposition"] = 'attachment; filename="students_report.csv"'
        writer = csv.writer(response)
        writer.writerow(["Student Username", "Course", "Enrolled At"])
        for e in Enrollment.objects.filter(course__mentor=user):
            writer.writerow(
                [e.student.username, e.course.title, e.enrolled_at.strftime("%Y-%m-%d")]
            )

    else:
        # Fallback empty CSV
        response["Content-Disposition"] = 'attachment; filename="empty.csv"'
        writer = csv.writer(response)
        writer.writerow(["Unauthorized or Invalid Report Type"])

    return response
