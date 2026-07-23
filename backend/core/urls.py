from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .analytics_views_extra import ComparisonAnalysisView, DifficultyAnalysisView

# Fixed Analytics views imports
from .analytics_views_fixed import EngagementMetricsView, GamePerformanceView
from .analytics_views_fixed import StudentProgressView as AnalyticsStudentProgressView
from .views import (
    AchievementViewSet,
    AssetUsageAnalyticsView,
    AssetViewSet,
    AuditLogViewSet,
    CheckAchievementsView,
    ClassGroupViewSet,
    CourseViewSet,
    CSVExportView,
    DiaryCommentViewSet,
    EnrollmentViewSet,
    LeaderboardView,
    MentorAnalyticsView,
    NotificationViewSet,
    ParentChildrenView,
    ParentStudentLinkViewSet,
    SessionTemplateViewSet,
    SessionViewSet,
    StudentDiaryViewSet,
    StudentInsightsView,
    StudentProgressView,
    StudentSessionStateView,
    SystemAnalyticsView,
    TrackAssetUsageView,
    UserAchievementViewSet,
    UserLevelView,
    UserManagementViewSet,
    UserStreakView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"sessions", SessionViewSet, basename="session")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"student-diaries", StudentDiaryViewSet, basename="studentdiary")
router.register(
    r"session-templates", SessionTemplateViewSet, basename="sessiontemplate"
)
router.register(r"achievements", AchievementViewSet, basename="achievement")
router.register(
    r"user-achievements", UserAchievementViewSet, basename="userachievement"
)
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"diary-comments", DiaryCommentViewSet, basename="diarycomment")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"users", UserViewSet, basename="user")
router.register(
    r"parent-student-links", ParentStudentLinkViewSet, basename="parentstudentlink"
)
router.register(r"manage-users", UserManagementViewSet, basename="manage-users")
router.register(r"audit-logs", AuditLogViewSet, basename="audit-logs")
router.register(r"class-groups", ClassGroupViewSet, basename="class-group")

urlpatterns = [
    path(
        "sessions/<int:session_id>/state/",
        StudentSessionStateView.as_view(),
        name="session-state",
    ),
    path(
        "student-progress/",
        StudentProgressView.as_view(),
        name="student-progress",
    ),
    path(
        "check-achievements/",
        CheckAchievementsView.as_view(),
        name="check-achievements",
    ),
    path(
        "leaderboard/",
        LeaderboardView.as_view(),
        name="leaderboard",
    ),
    path(
        "streak/",
        UserStreakView.as_view(),
        name="user-streak",
    ),
    path(
        "level/",
        UserLevelView.as_view(),
        name="user-level",
    ),
    path(
        "parent/children/",
        ParentChildrenView.as_view(),
        name="parent-children",
    ),
    path(
        "analytics/system/",
        SystemAnalyticsView.as_view(),
        name="system-analytics",
    ),
    path(
        "analytics/mentor/",
        MentorAnalyticsView.as_view(),
        name="mentor-analytics",
    ),
    path(
        "analytics/student/<int:pk>/",
        StudentInsightsView.as_view(),
        name="student-insights",
    ),
    path(
        "analytics/assets/",
        AssetUsageAnalyticsView.as_view(),
        name="asset-usage-analytics",
    ),
    path(
        "assets/<int:pk>/track_usage/",
        TrackAssetUsageView.as_view(),
        name="track-asset-usage",
    ),
    path(
        "reports/export/",
        CSVExportView.as_view(),
        name="csv-export",
    ),
    # Advanced Game Analytics Endpoints
    path(
        "analytics/game-performance/",
        GamePerformanceView.as_view(),
        name="game-performance",
    ),
    path(
        "analytics/student-progress/<int:student_id>/",
        AnalyticsStudentProgressView.as_view(),
        name="analytics-student-progress",
    ),
    path(
        "analytics/difficulty-analysis/",
        DifficultyAnalysisView.as_view(),
        name="difficulty-analysis",
    ),
    path(
        "analytics/engagement-metrics/",
        EngagementMetricsView.as_view(),
        name="engagement-metrics",
    ),
    path(
        "analytics/comparison/",
        ComparisonAnalysisView.as_view(),
        name="comparison-analysis",
    ),
    path("", include(router.urls)),
]
