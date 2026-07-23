from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from config.permissions import IsMentorOrReadOnly, IsStaffOrReadOnly, IsStudentOwner

from .analytics import (
    export_csv_report,
    get_asset_usage_analytics,
    get_mentor_analytics,
    get_student_insights,
    get_system_analytics,
)
from .models import (
    Achievement,
    Asset,
    Course,
    DiaryComment,
    Enrollment,
    Notification,
    Session,
    SessionTemplate,
    StudentDiary,
    StudentSessionState,
    UserAchievement,
    UserPoints,
    UserPreference,
    UserStreak,
)
from .serializers import (
    AchievementSerializer,
    AssetSerializer,
    ChangePasswordSerializer,
    CourseSerializer,
    DiaryCommentSerializer,
    EnrollmentSerializer,
    LeaderboardEntrySerializer,
    NotificationSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    SessionSerializer,
    SessionTemplateSerializer,
    StudentDiarySerializer,
    StudentSessionStateSerializer,
    UserAchievementSerializer,
    UserLevelSerializer,
    UserPreferenceSerializer,
    UserSerializer,
    UserStreakSerializer,
)

User = get_user_model()


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.pop("access", None)
            refresh_token = response.data.pop("refresh", None)
            try:
                user = User.objects.get(username=request.data.get("username"))
                response.set_cookie(
                    "access_token",
                    access_token,
                    max_age=int(
                        settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()
                    ),
                    httponly=True,
                    samesite="Lax",
                )
                response.set_cookie(
                    "refresh_token",
                    refresh_token,
                    max_age=int(
                        settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
                    ),
                    httponly=True,
                    samesite="Lax",
                )
                response.data.update(
                    {
                        "message": "Login successful",
                        "username": user.username,
                        "role": user.role,
                    }
                )
            except User.DoesNotExist:
                pass
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"message": "Logout successful"})
        response.delete_cookie("access_token", samesite="Lax")
        response.delete_cookie("refresh_token", samesite="Lax")
        return response


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                UserSerializer(request.user, context={"request": request}).data
            )
        return Response(serializer.errors, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data["new_password"])
            request.user.save()
            return Response({"message": "Password changed successfully."})
        return Response(serializer.errors, status=400)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsMentorOrReadOnly]

    def get_queryset(self):
        queryset = Course.objects.annotate(
            session_count=Count("sessions"),
            enrollment_count=Count("enrollments"),
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        mentor_id = self.request.query_params.get("mentor_id")
        if mentor_id:
            try:
                queryset = queryset.filter(mentor_id=int(mentor_id))
            except (ValueError, TypeError):
                pass
        enrolled = self.request.query_params.get("enrolled")
        if enrolled == "true" and self.request.user.is_authenticated:
            queryset = queryset.filter(enrollments__student=self.request.user)

        student_id = self.request.query_params.get("student_id")
        if student_id and self.request.user.role == "parent":
            from .models import ParentStudentLink

            if ParentStudentLink.objects.filter(
                parent=self.request.user, student_id=student_id
            ).exists():
                queryset = queryset.filter(enrollments__student_id=student_id)
        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed_ordering = {
            "title",
            "-title",
            "created_at",
            "-created_at",
            "session_count",
            "-session_count",
            "enrollment_count",
            "-enrollment_count",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"
        return queryset.order_by(ordering)

    def perform_create(self, serializer):
        serializer.save(mentor=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def student_progress(self, request, pk=None):
        course = self.get_object()

        if request.user.role not in ["mentor", "staff"] or (
            request.user.role == "mentor" and course.mentor != request.user
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only the course mentor can view student progress.")

        from .models import Enrollment, Session, StudentSessionState

        enrollments = Enrollment.objects.filter(course=course).select_related("student")

        course_sessions = Session.objects.filter(course=course)
        total_sessions = course_sessions.count()
        total_games = course_sessions.filter(mode="game").count()

        results = []
        for enrollment in enrollments:
            student = enrollment.student
            student_states = StudentSessionState.objects.filter(
                student=student, session__course=course
            )

            sessions_completed = student_states.count()
            games_played = student_states.filter(session__mode="game").count()

            correct_answers = 0
            total_answers = 0
            for state in student_states:
                events = state.canvas_events or []
                for ev in events:
                    if isinstance(ev, dict) and ev.get("type") == "trivia_answer":
                        total_answers += 1
                        if ev.get("is_correct"):
                            correct_answers += 1

            accuracy_rate = 0
            if total_answers > 0:
                accuracy_rate = round((correct_answers / total_answers) * 100)

            last_active = student_states.order_by("-updated_at").first()
            last_active_date = (
                last_active.updated_at.isoformat() if last_active else None
            )

            completion_rate = 0
            if total_sessions > 0:
                completion_rate = round((sessions_completed / total_sessions) * 100)

            results.append(
                {
                    "student_id": student.id,
                    "username": student.username,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "sessions_completed": sessions_completed,
                    "total_sessions": total_sessions,
                    "completion_rate": completion_rate,
                    "games_played": games_played,
                    "total_games": total_games,
                    "accuracy_rate": accuracy_rate,
                    "last_active": last_active_date,
                }
            )

        return Response(results)


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [IsMentorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Session.objects.none()

        qs = Session.objects.all().order_by("-created_at")
        if user.role == "student" or user.role == "staff":
            return qs
        elif user.role == "mentor":
            return qs.filter(course__mentor=user)
        elif user.role == "parent":
            from .models import ParentStudentLink

            student_ids = ParentStudentLink.objects.filter(parent=user).values_list(
                "student_id", flat=True
            )
            return qs.filter(course__enrollments__student_id__in=student_ids).distinct()
        return Session.objects.none()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def check_answer(self, request, pk=None):
        session = self.get_object()
        answer = request.data.get("answer")
        game_type = session.game_type
        config = session.game_config
        is_correct = False
        if game_type == "trivia":
            is_correct = int(answer) == int(config.get("correctIndex", 0))
        elif game_type == "puzzle":
            expected = config.get("puzzleItems", [])
            is_correct = answer == expected
        elif game_type == "math":
            expected = sorted(
                [str(x).strip() for x in config.get("correctCombination", [])]
            )
            student_ans = sorted([str(x).strip() for x in answer])
            is_correct = student_ans == expected
        elif game_type == "physics":
            is_correct = int(answer) == int(config.get("correctIndex", 0))
        elif game_type == "color":
            expected = sorted(
                [str(x).strip() for x in config.get("correctCombination", [])]
            )
            student_ans = sorted([str(x).strip() for x in answer])
            is_correct = student_ans == expected
        elif game_type == "chemistry":
            expected_components = config.get("components", [])
            is_correct = True
            student_counts = answer if isinstance(answer, dict) else {}
            expected_counts = {}
            for comp in expected_components:
                expected_counts[comp.get("label")] = int(comp.get("count", 0))
            for label, count in expected_counts.items():
                if int(student_counts.get(label, 0)) != count:
                    is_correct = False
                    break
            for label, count in student_counts.items():
                if int(count) > 0 and int(expected_counts.get(label, 0)) != int(count):
                    is_correct = False
                    break
        elif game_type == "memory":
            matched_pairs = answer if isinstance(answer, list) else []
            pairs = config.get("pairs", [])
            is_correct = len(matched_pairs) == len(pairs) and all(
                p in [pp.get("pairId") for pp in pairs] or True for p in matched_pairs
            )
            expected_pair_ids = sorted([i for i in range(len(pairs))])
            is_correct = sorted(matched_pairs) == expected_pair_ids
        elif game_type == "maze":
            grid = config.get("grid", [])
            end = config.get("end", {})
            path = answer if isinstance(answer, list) else []
            if not path or not grid:
                is_correct = False
            else:
                last = path[-1]
                is_correct = (
                    isinstance(last, dict)
                    and last.get("row") == end.get("row")
                    and last.get("col") == end.get("col")
                )
                if is_correct:
                    start = config.get("start", {})
                    if path[0].get("row") != start.get("row") or path[0].get(
                        "col"
                    ) != start.get("col"):
                        is_correct = False
                    rows = len(grid)
                    cols = len(grid[0]) if rows > 0 else 0
                    for step in path:
                        r = step.get("row", -1)
                        c = step.get("col", -1)
                        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == 1:
                            is_correct = False
                            break
                    if is_correct:
                        for i in range(len(path) - 1):
                            r1, c1 = path[i].get("row"), path[i].get("col")
                            r2, c2 = path[i + 1].get("row"), path[i + 1].get("col")
                            if abs(r1 - r2) + abs(c1 - c2) != 1:
                                is_correct = False
                                break
        elif game_type == "word_scramble":
            expected = str(config.get("answer", "")).strip().lower()
            student_ans = str(answer).strip().lower()
            is_correct = student_ans == expected
        elif game_type == "flashcard":
            expected = str(config.get("answer", "")).strip().lower()
            student_ans = str(answer).strip().lower()
            is_correct = student_ans == expected
        return Response({"is_correct": is_correct})


class StudentSessionStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        from django.contrib.auth import get_user_model

        User = get_user_model()

        if request.user.role == "parent":
            student_id = request.query_params.get("student_id")
            if not student_id:
                return Response(
                    {"error": "student_id is required for parents"}, status=400
                )
            from .models import ParentStudentLink

            if not ParentStudentLink.objects.filter(
                parent=request.user, student_id=student_id
            ).exists():
                return Response(
                    {"error": "You do not have permission to view this student"},
                    status=403,
                )
            student = get_object_or_404(User, id=student_id)
        elif request.user.role in ["mentor", "staff"]:
            student_id = request.query_params.get("student_id")
            if not student_id:
                return Response(
                    {"error": f"student_id is required for {request.user.role}"},
                    status=400,
                )
            student = get_object_or_404(User, id=student_id)
            if request.user.role == "mentor" and session.course.mentor != request.user:
                return Response(
                    {"error": "You do not have permission to view this session state"},
                    status=403,
                )
        elif request.user.role == "student":
            student = request.user
        else:
            return Response(
                {"error": "Unauthorized role"},
                status=403,
            )

        try:
            state = StudentSessionState.objects.get(session=session, student=student)
            serializer = StudentSessionStateSerializer(state)
            return Response(serializer.data)
        except StudentSessionState.DoesNotExist:
            return Response({"canvas_events": []})

    def post(self, request, session_id):
        if request.user.role != "student":
            return Response(
                {"error": "Only students can save session state"}, status=403
            )

        session = get_object_or_404(Session, id=session_id)
        state, created = StudentSessionState.objects.get_or_create(
            session=session, student=request.user
        )
        events = request.data.get("canvas_events", [])
        state.canvas_events = events
        state.save()
        serializer = StudentSessionStateSerializer(state)
        return Response(serializer.data)


class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        queryset = Asset.objects.all()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(asset_type__icontains=search)
            )
        asset_type = self.request.query_params.get("asset_type", "").strip()
        if asset_type and asset_type in ("image", "audio", "animation"):
            queryset = queryset.filter(asset_type=asset_type)
        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed_ordering = {
            "title",
            "-title",
            "created_at",
            "-created_at",
            "asset_type",
            "-asset_type",
        }
        if ordering not in allowed_ordering:
            ordering = "-created_at"
        return queryset.order_by(ordering)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StudentDiaryViewSet(viewsets.ModelViewSet):
    serializer_class = StudentDiarySerializer
    permission_classes = [IsAuthenticated, IsStudentOwner]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return StudentDiary.objects.none()
        if user.role == "mentor":
            from django.db.models import Q

            return (
                StudentDiary.objects.filter(
                    Q(student__enrollments__course__mentor=user)
                    | Q(student__enrolled_classes__mentor=user)
                )
                .distinct()
                .order_by("-updated_at")
            )
        if user.role == "student":
            return StudentDiary.objects.filter(student=user).order_by("-updated_at")
        if user.role == "parent":
            student_id = self.request.query_params.get("student_id")
            if student_id:
                from .models import ParentStudentLink

                if ParentStudentLink.objects.filter(
                    parent=user, student_id=student_id
                ).exists():
                    return StudentDiary.objects.filter(student_id=student_id).order_by(
                        "-updated_at"
                    )
        return StudentDiary.objects.none()

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsStudentOwner()]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class SessionTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = SessionTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "mentor":
            return SessionTemplate.objects.filter(
                Q(mentor=user) | Q(is_public=True)
            ).order_by("-updated_at")
        return SessionTemplate.objects.filter(is_public=True).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(mentor=self.request.user)


class StudentProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == "parent":
            student_id = request.query_params.get("student_id")
            if not student_id:
                return Response(
                    {"error": "student_id is required for parents"}, status=400
                )
            from .models import ParentStudentLink, User

            if not ParentStudentLink.objects.filter(
                parent=request.user, student_id=student_id
            ).exists():
                return Response(
                    {"error": "You do not have permission to view this student"},
                    status=403,
                )
            student = get_object_or_404(User, id=student_id)
        elif request.user.role == "student":
            student = request.user
        else:
            return Response(
                {"error": "Only students or parents can access progress data"},
                status=403,
            )

        now = timezone.now()
        now - timedelta(days=7)
        total_sessions = (
            Session.objects.filter(student_states__student=student).distinct().count()
        )
        total_canvas_time = 0
        canvas_events = StudentSessionState.objects.filter(student=student).values_list(
            "canvas_events", flat=True
        )
        for events in canvas_events:
            if isinstance(events, list):
                for ev in events:
                    if isinstance(ev, dict) and ev.get("timestamp"):
                        total_canvas_time += 1
        total_games = (
            Session.objects.filter(student_states__student=student, mode="game")
            .distinct()
            .count()
        )
        correct_answers = 0
        total_answers = 0
        session_states = StudentSessionState.objects.filter(student=student)
        for state in session_states:
            events = state.canvas_events or []
            for ev in events:
                if isinstance(ev, dict) and ev.get("type") == "trivia_answer":
                    total_answers += 1
                    if ev.get("is_correct"):
                        correct_answers += 1
        accuracy_rate = 0
        if total_answers > 0:
            accuracy_rate = round((correct_answers / total_answers) * 100)
        weekly_activity = []
        for i in range(7):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = StudentSessionState.objects.filter(
                student=student, updated_at__gte=day_start, updated_at__lt=day_end
            ).count()
            weekly_activity.append({"label": day.strftime("%a"), "value": count})
        weekly_activity.reverse()
        recent_sessions = []
        sessions = (
            Session.objects.filter(student_states__student=student)
            .distinct()
            .order_by("-created_at")[:5]
        )
        for session in sessions:
            session_states_for_session = StudentSessionState.objects.filter(
                session=session, student=student
            ).first()
            is_correct = None
            if session_states_for_session:
                events = session_states_for_session.canvas_events or []
                for ev in events:
                    if isinstance(ev, dict) and ev.get("type") == "trivia_answer":
                        is_correct = ev.get("is_correct")
            recent_sessions.append(
                {
                    "id": session.id,
                    "title": session.title,
                    "mode": session.mode,
                    "created_at": session.created_at.isoformat(),
                    "is_correct": is_correct,
                }
            )
        achievements = (
            UserAchievement.objects.filter(user=student)
            .select_related("achievement")
            .order_by("-earned_at")
        )
        achievements_list = []
        for user_achievement in achievements:
            achievements_list.append(
                {
                    "id": user_achievement.achievement.id,
                    "name": user_achievement.achievement.name,
                    "description": user_achievement.achievement.description,
                    "icon": user_achievement.achievement.icon,
                    "category": user_achievement.achievement.category,
                    "earned_at": user_achievement.earned_at.isoformat(),
                }
            )
        user_points_obj, _ = UserPoints.objects.get_or_create(
            user=student, defaults={"total_points": 0}
        )
        return Response(
            {
                "total_sessions": total_sessions,
                "total_canvas_time": total_canvas_time,
                "total_games": total_games,
                "accuracy_rate": accuracy_rate,
                "max_activity": (
                    max([a["value"] for a in weekly_activity]) if weekly_activity else 0
                ),
                "weekly_activity": weekly_activity,
                "recent_sessions": recent_sessions,
                "achievements": achievements_list,
                "total_points": user_points_obj.total_points,
            }
        )


class AchievementViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all().order_by("-created_at")
    serializer_class = AchievementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "student":
            return Achievement.objects.filter(is_active=True).order_by("-created_at")
        return Achievement.objects.all().order_by("-created_at")


class UserAchievementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserAchievementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "student":
            return (
                UserAchievement.objects.filter(user=self.request.user)
                .select_related("achievement")
                .order_by("-earned_at")
            )
        student_id = self.request.query_params.get("student_id")
        if student_id:
            return (
                UserAchievement.objects.filter(user_id=student_id)
                .select_related("achievement")
                .order_by("-earned_at")
            )
        return UserAchievement.objects.none()


def check_and_award_achievements(user):
    if user.role != "student":
        return []
    new_achievements = []
    sessions_completed = (
        Session.objects.filter(student_states__student=user).distinct().count()
    )
    diaries_created = StudentDiary.objects.filter(student=user).count()
    courses_completed = Enrollment.objects.filter(student=user).count()
    games_played = (
        Session.objects.filter(student_states__student=user, mode="game")
        .distinct()
        .count()
    )
    correct_answers = 0
    games_won = 0
    session_states = StudentSessionState.objects.filter(student=user)
    for state in session_states:
        events = state.canvas_events or []
        session_correct = 0
        for ev in events:
            if isinstance(ev, dict) and ev.get("is_correct") is True:
                correct_answers += 1
                session_correct += 1
        if session_correct > 0:
            games_won += 1
    from .models import UserStreak

    try:
        streak = UserStreak.objects.get(user=user)
        consecutive_days = streak.current_streak
    except UserStreak.DoesNotExist:
        consecutive_days = 0
    earned_ids = set(
        UserAchievement.objects.filter(user=user).values_list(
            "achievement_id", flat=True
        )
    )
    active_achievements = Achievement.objects.filter(is_active=True)
    progress_map = {
        "courses_completed": courses_completed,
        "sessions_completed": sessions_completed,
        "diaries_created": diaries_created,
        "games_won": games_won,
        "games_played": games_played,
        "perfect_scores": correct_answers,
        "consecutive_days": consecutive_days,
    }
    for achievement in active_achievements:
        if achievement.id in earned_ids:
            continue
        req_type = achievement.requirement_type
        req_value = achievement.requirement_value
        if req_type in progress_map and progress_map[req_type] >= req_value:
            UserAchievement.objects.create(user=user, achievement=achievement)
            user_points, _ = UserPoints.objects.get_or_create(
                user=user, defaults={"total_points": 0}
            )
            user_points.total_points += achievement.points
            user_points.save()
            new_achievements.append(
                {
                    "id": achievement.id,
                    "name": achievement.name,
                    "description": achievement.description,
                    "icon": achievement.icon,
                    "points_earned": achievement.points,
                }
            )
    return new_achievements


class CheckAchievementsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "student":
            return Response(
                {"error": "Only students can earn achievements"},
                status=403,
            )
        new_achievements = check_and_award_achievements(request.user)
        for ach in new_achievements:
            create_notification(
                user=request.user,
                title="Achievement earned!",
                message=f"You earned '{ach['name']}': {ach['description']} (+{ach['points_earned']} points)",  # noqa: E501
                notification_type="achievement",
                related_object_id=ach["id"],
                related_object_type="achievement",
            )
        return Response(
            {
                "message": f"Awarded {len(new_achievements)} new achievement(s)",
                "new_achievements": new_achievements,
            }
        )


class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get("period", "all_time")
        students = User.objects.filter(role="student")
        if period == "weekly":
            week_ago = timezone.now() - timedelta(days=7)
            students = students.filter(
                Q(session_states__updated_at__gte=week_ago)
                | Q(points__last_updated__gte=week_ago)
            ).distinct()
        elif period == "monthly":
            month_ago = timezone.now() - timedelta(days=30)
            students = students.filter(
                Q(session_states__updated_at__gte=month_ago)
                | Q(points__last_updated__gte=month_ago)
            ).distinct()
        entries = []
        for student in students:
            points, _ = UserPoints.objects.get_or_create(
                user=student, defaults={"total_points": 0}
            )
            achievements_count = UserAchievement.objects.filter(user=student).count()
            entries.append(
                {
                    "user_id": student.id,
                    "username": student.username,
                    "role": student.role,
                    "total_points": points.total_points,
                    "achievements_count": achievements_count,
                }
            )
        entries.sort(key=lambda e: e["total_points"], reverse=True)
        for index, entry in enumerate(entries):
            entry["rank"] = index + 1
        serializer = LeaderboardEntrySerializer(entries, many=True)
        return Response(serializer.data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "student":
            queryset = Enrollment.objects.filter(student=user)
        elif user.role == "mentor":
            queryset = Enrollment.objects.filter(course__mentor=user)
        elif user.role == "parent":
            from .models import ParentStudentLink

            student_ids = ParentStudentLink.objects.filter(parent=user).values_list(
                "student_id", flat=True
            )
            queryset = Enrollment.objects.filter(student_id__in=student_ids)
        elif user.role == "staff":
            queryset = Enrollment.objects.all()
        else:
            return Enrollment.objects.none()

        course_id = self.request.query_params.get("course_id")
        if course_id:
            try:
                queryset = queryset.filter(course_id=int(course_id))
            except (ValueError, TypeError):
                pass
        student_id = self.request.query_params.get("student_id")
        if student_id:
            try:
                queryset = queryset.filter(student_id=int(student_id))
            except (ValueError, TypeError):
                pass
        return queryset.select_related("student", "course").order_by("-enrolled_at")

    def perform_create(self, serializer):
        course_id = self.request.data.get("course")
        if not course_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"course": "Course ID is required."})
        if self.request.user.role == "mentor":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Mentors cannot enroll themselves in courses.")
        enrollment = serializer.save(
            student=self.request.user, course_id=int(course_id)
        )
        create_notification(
            user=self.request.user,
            title="New course enrolled!",
            message=f"You have successfully enrolled in {enrollment.course.title}.",
            notification_type="enrollment",
            related_object_id=enrollment.course.id,
            related_object_type="course",
        )
        if enrollment.course.mentor:
            create_notification(
                user=enrollment.course.mentor,
                title="New student enrolled",
                message=f"{self.request.user.username} has enrolled in your course '{enrollment.course.title}'.",  # noqa: E501
                notification_type="enrollment",
                related_object_id=enrollment.course.id,
                related_object_type="course",
            )


class DiaryCommentViewSet(viewsets.ModelViewSet):
    serializer_class = DiaryCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.action in ("retrieve", "update", "partial_update", "destroy"):
            return (
                DiaryComment.objects.all()
                .select_related("author")
                .order_by("created_at")
            )
        diary_id = self.request.query_params.get("diary_id")
        if not diary_id:
            return DiaryComment.objects.none()
        return (
            DiaryComment.objects.filter(diary_id=int(diary_id))
            .select_related("author")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        diary_id = self.request.data.get("diary")
        if not diary_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"diary": "Diary ID is required."})
        diary = get_object_or_404(StudentDiary, id=int(diary_id))
        serializer.save(author=self.request.user, diary=diary)
        if diary.student and diary.student != self.request.user:
            create_notification(
                user=diary.student,
                title="New comment on your diary!",
                message=f"{self.request.user.username} commented on your diary '{diary.title}'.",  # noqa: E501
                notification_type="diary_comment",
                related_object_id=diary.id,
                related_object_type="diary",
            )


class UserStreakView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _today = timezone.now().date()  # noqa: F841
        streak, created = UserStreak.objects.get_or_create(
            user=request.user,
            defaults={
                "current_streak": 0,
                "longest_streak": 0,
                "last_active_date": None,
            },
        )
        leveled_up = False
        milestone = None
        milestone_days = [7, 14, 30, 60, 100]
        for m in milestone_days:
            if streak.current_streak == m:
                leveled_up = True
                milestone = m
                break
        serializer = UserStreakSerializer(streak)
        return Response(
            {
                **serializer.data,
                "leveled_up": leveled_up,
                "milestone": milestone,
            }
        )

    def post(self, request):
        today = timezone.now().date()
        streak, created = UserStreak.objects.get_or_create(
            user=request.user,
            defaults={
                "current_streak": 0,
                "longest_streak": 0,
                "last_active_date": None,
            },
        )
        leveled_up = False
        milestone = None
        if streak.last_active_date is None:
            streak.current_streak = 1
            streak.longest_streak = 1
            streak.last_active_date = today
        elif streak.last_active_date == today - timedelta(days=1):
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
            streak.last_active_date = today
        elif streak.last_active_date == today:
            pass
        else:
            streak.current_streak = 1
            streak.last_active_date = today
        streak.save()
        milestone_days = [7, 14, 30, 60, 100]
        for m in milestone_days:
            if streak.current_streak == m:
                leveled_up = True
                milestone = m
                break
        serializer = UserStreakSerializer(streak)
        return Response(
            {
                **serializer.data,
                "leveled_up": leveled_up,
                "milestone": milestone,
            }
        )


class UserLevelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "student":
            return Response(
                {"error": "Level system is only available for students"},
                status=status.HTTP_403_FORBIDDEN,
            )
        points_obj, _ = UserPoints.objects.get_or_create(
            user=request.user,
            defaults={"total_points": 0},
        )
        total = points_obj.total_points
        xp_per_level = 100
        level = total // xp_per_level + 1
        current_xp = total % xp_per_level
        progress_percent = current_xp
        data = {
            "level": level,
            "current_xp": current_xp,
            "xp_for_next_level": xp_per_level,
            "progress_percent": progress_percent,
            "total_points": total,
        }
        serializer = UserLevelSerializer(data)
        return Response(serializer.data)


class UserPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _ = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={
                "theme": "light",
                "colorblind_mode": "none",
                "reduced_motion": False,
            },
        )
        serializer = UserPreferenceSerializer(pref)
        return Response(serializer.data)

    def patch(self, request):
        pref, _ = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={
                "theme": "light",
                "colorblind_mode": "none",
                "reduced_motion": False,
            },
        )
        serializer = UserPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")
        notif_type = self.request.query_params.get("type")
        if notif_type:
            valid_types = dict(Notification.NOTIFICATION_TYPES).keys()
            if notif_type in valid_types:
                queryset = queryset.filter(notification_type=notif_type)
        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed = {"created_at", "-created_at"}
        if ordering not in allowed:
            ordering = "-created_at"
        return queryset.order_by(ordering)

    def perform_create(self, serializer):
        serializer.save(recipient=self.request.user)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})


def create_notification(
    user,
    title,
    message,
    notification_type,
    related_object_id=None,
    related_object_type=None,
):
    try:
        notification = Notification.objects.create(
            recipient=user,
            title=title[:200],
            message=message,
            notification_type=notification_type,
            related_object_id=related_object_id,
            related_object_type=related_object_type,
        )

        # Broadcast notification via WebSocket
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer:
            notification_group = f"notifications_user_{user.id}"
            async_to_sync(channel_layer.group_send)(
                notification_group,
                {
                    "type": "notification_message",
                    "notification_id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "notification_type": notification.notification_type,
                    "related_object_id": notification.related_object_id,
                    "related_object_type": notification.related_object_type,
                    "created_at": notification.created_at.isoformat(),
                },
            )
    except Exception:
        pass


class ParentChildrenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "parent":
            return Response(
                {"error": "Only parents can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .models import ParentStudentLink
        from .serializers import ChildProfileSerializer

        links = ParentStudentLink.objects.filter(parent=request.user).select_related(
            "student"
        )
        children = [link.student for link in links]
        serializer = ChildProfileSerializer(
            children, many=True, context={"request": request}
        )
        return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    from .serializers import UserSerializer

    serializer_class = UserSerializer

    def get_queryset(self):
        User = get_user_model()
        qs = User.objects.all()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs


class ParentStudentLinkViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    from .serializers import ParentStudentLinkSerializer

    serializer_class = ParentStudentLinkSerializer

    def get_queryset(self):
        from .models import ParentStudentLink

        if self.request.user.role == "staff" or self.request.user.is_superuser:
            return ParentStudentLink.objects.all()
        return ParentStudentLink.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != "staff" and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Only staff can link parents and students.")
        serializer.save()


class UserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    from .serializers import StaffUserSerializer

    serializer_class = StaffUserSerializer

    def get_queryset(self):
        User = get_user_model()
        if self.request.user.role == "staff" or self.request.user.is_superuser:
            return User.objects.all().order_by("-date_joined")
        return User.objects.none()

    def perform_update(self, serializer):
        from .models import AuditLog

        original_user = self.get_object()
        updated_user = serializer.save()

        def get_client_ip(request):
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip = x_forwarded_for.split(",")[0]
            else:
                ip = request.META.get("REMOTE_ADDR")
            return ip

        action = "update"
        if original_user.is_active != updated_user.is_active:
            action = "deactivate" if not updated_user.is_active else "reactivate"

        AuditLog.objects.create(
            user=self.request.user,
            target_user=updated_user,
            action=action,
            ip_address=get_client_ip(self.request),
            details=f"Staff updated user {updated_user.username}",
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffOrReadOnly]
    from .serializers import AuditLogSerializer

    serializer_class = AuditLogSerializer

    def get_queryset(self):
        from .models import AuditLog

        if self.request.user.role == "staff" or self.request.user.is_superuser:
            qs = AuditLog.objects.all().select_related("user", "target_user")
            target_id = self.request.query_params.get("target_user")
            if target_id:
                qs = qs.filter(target_user_id=target_id)
            return qs
        return AuditLog.objects.none()


class ClassGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsMentorOrReadOnly]
    from .serializers import ClassGroupSerializer

    serializer_class = ClassGroupSerializer

    def get_queryset(self):
        from .models import ClassGroup

        if self.request.user.role == "mentor":
            return ClassGroup.objects.filter(mentor=self.request.user).prefetch_related(
                "students"
            )
        return ClassGroup.objects.none()

    @action(detail=True, methods=["post"])
    def import_students_csv(self, request, pk=None):
        import csv
        import io

        from django.contrib.auth.hashers import make_password

        class_group = self.get_object()
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided"}, status=400)

        try:
            csv_file = io.TextIOWrapper(file_obj.file, encoding="utf-8")
            reader = csv.DictReader(csv_file)
            added_count = 0

            for row in reader:
                username = row.get("username", "").strip()
                email = row.get("email", "").strip()
                if username and email:
                    user, created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            "email": email,
                            "role": "student",
                            "password": make_password("asoboard123!"),
                        },
                    )
                    if user.role == "student":
                        class_group.students.add(user)
                        added_count += 1

            return Response(
                {"message": f"Successfully processed {added_count} students"},
                status=200,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=400)


# Analytics & Reporting API Views


class SystemAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "staff":
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return Response(get_system_analytics())


class MentorAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "mentor":
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return Response(get_mentor_analytics(request.user))


class StudentInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        student = get_object_or_404(User, pk=pk, role="student")

        # Access control
        if request.user.role == "student" and request.user.id != student.id:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == "parent":
            from .models import ParentStudentLink

            if not ParentStudentLink.objects.filter(
                parent=request.user, student=student
            ).exists():
                return Response(
                    {"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN
                )
        if request.user.role == "mentor":
            from .models import Enrollment

            if not Enrollment.objects.filter(
                course__mentor=request.user, student=student
            ).exists():
                return Response(
                    {"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN
                )

        return Response(get_student_insights(student))


class AssetUsageAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "staff":
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return Response(get_asset_usage_analytics())


class TrackAssetUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        asset.usage_count += 1
        asset.save(update_fields=["usage_count"])
        return Response({"status": "success", "usage_count": asset.usage_count})


class CSVExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get("type")
        if not report_type:
            return Response(
                {"error": "No type specified"}, status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role not in ["staff", "mentor"]:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        return export_csv_report(report_type, request.user)
