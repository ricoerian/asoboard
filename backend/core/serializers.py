from django.contrib.auth import get_user_model
from rest_framework import serializers

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

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_verified",
            "date_joined",
            "bio",
            "avatar",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "password", "role")
        extra_kwargs = {"password": {"write_only": True}}

    def validate_role(self, value):
        if value not in ["student", "mentor"]:
            raise serializers.ValidationError(  # noqa: E501
                "Invalid role. Only student and mentor are allowed for registration."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            role=validated_data.get("role", "student"),
        )
        return user


class AssetSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source="created_by.username")

    class Meta:
        model = Asset
        fields = [
            "id",
            "title",
            "file",
            "asset_type",
            "animation_config",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_by_username"]


class StudentDiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDiary
        fields = [
            "id",
            "student",
            "title",
            "canvas_events",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["student"]


class SessionSerializer(serializers.ModelSerializer):
    course_mentor_id = serializers.ReadOnlyField(source="course.mentor.id")
    course_mentor_username = serializers.ReadOnlyField(source="course.mentor.username")
    course_mentor_is_verified = serializers.ReadOnlyField(
        source="course.mentor.is_verified"
    )

    class Meta:
        model = Session
        fields = [
            "id",
            "title",
            "audio_file",
            "mode",
            "session_type",
            "game_type",
            "game_config",
            "canvas_events",
            "created_at",
            "course",
            "course_mentor_id",
            "course_mentor_username",
            "course_mentor_is_verified",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and hasattr(request.user, "role") and request.user.role == "student":
            config = data.get("game_config", {})
            if isinstance(config, dict):
                game_type = data.get("game_type")
                import copy

                safe_config = copy.deepcopy(config)
                if game_type == "trivia":
                    safe_config.pop("correctIndex", None)
                elif game_type == "puzzle":
                    import random

                    items = safe_config.get("puzzleItems", [])
                    shuffled = list(items)
                    random.shuffle(shuffled)
                    safe_config["puzzleWords"] = shuffled
                elif game_type == "math":
                    safe_config.pop("correctCombination", None)
                elif game_type == "physics":
                    safe_config.pop("correctIndex", None)
                elif game_type == "color":
                    safe_config.pop("correctCombination", None)
                elif game_type == "chemistry":
                    components = safe_config.get("components", [])
                    decoys = safe_config.get("decoys", [])
                    labels = [c.get("label") for c in components] + decoys
                    import random

                    random.shuffle(labels)
                    safe_config["availableAtoms"] = labels
                    safe_config.pop("components", None)
                    safe_config.pop("decoys", None)
                elif game_type == "memory":
                    import random

                    pairs = safe_config.get("pairs", [])
                    cards = []
                    for i, pair in enumerate(pairs):
                        label = pair.get("label", f"Card {i}")
                        emoji = pair.get("emoji", "")
                        cards.append(
                            {"id": i * 2, "pairId": i, "label": label, "emoji": emoji}
                        )
                        cards.append(
                            {
                                "id": i * 2 + 1,
                                "pairId": i,
                                "label": label,
                                "emoji": emoji,
                            }
                        )
                    random.shuffle(cards)
                    safe_config["shuffledCards"] = cards
                    safe_config.pop("pairs", None)
                elif game_type == "maze":
                    safe_config.pop("solutionPath", None)
                elif game_type == "word_scramble":
                    import random

                    answer = safe_config.get("answer", "")
                    letters = list(answer)
                    random.shuffle(letters)
                    safe_config["scrambledLetters"] = letters
                    safe_config.pop("answer", None)
                elif game_type == "flashcard":
                    safe_config.pop("answer", None)
                data["game_config"] = safe_config
        return data

    def validate(self, data):
        request = self.context.get("request")
        course = data.get("course")
        if course and request and course.mentor != request.user:
            raise serializers.ValidationError(
                "You do not have permission to add a session to this course."
            )
        return data

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long."
            )
        if len(value) > 100:
            raise serializers.ValidationError("Title cannot exceed 100 characters.")
        return value


class StudentSessionStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentSessionState
        fields = [
            "id",
            "session",
            "student",
            "canvas_events",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["student"]


class EnrollmentSerializer(serializers.ModelSerializer):
    student_username = serializers.ReadOnlyField(source="student.username")
    student_avatar = serializers.SerializerMethodField()
    course_title = serializers.ReadOnlyField(source="course.title")

    def get_student_avatar(self, obj):
        if obj.student.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.student.avatar.url)
            return obj.student.avatar.url
        return None

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "course",
            "student_username",
            "student_avatar",
            "course_title",
            "enrolled_at",
        ]
        read_only_fields = ["student", "enrolled_at"]

    def validate(self, data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            student = request.user
            course = data.get("course")
            if (
                course
                and Enrollment.objects.filter(student=student, course=course).exists()
            ):
                raise serializers.ValidationError(
                    {"course": "You are already enrolled in this course."}
                )
        return data


class CourseSerializer(serializers.ModelSerializer):
    sessions = SessionSerializer(many=True, read_only=True)
    mentor_id = serializers.ReadOnlyField(source="mentor.id")
    mentor_username = serializers.ReadOnlyField(source="mentor.username")
    mentor_is_verified = serializers.ReadOnlyField(source="mentor.is_verified")
    mentor_bio = serializers.ReadOnlyField(source="mentor.bio")
    mentor_avatar = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "sessions",
            "created_at",
            "mentor_id",
            "mentor_username",
            "mentor_is_verified",
            "mentor_bio",
            "mentor_avatar",
            "enrollment_count",
        ]

    def get_enrollment_count(self, obj):
        if hasattr(obj, "enrollment_count"):
            return obj.enrollment_count
        try:
            return obj.enrollments.count()
        except Exception:
            return 0

    def get_mentor_avatar(self, obj):
        if obj.mentor and obj.mentor.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.mentor.avatar.url)
            return obj.mentor.avatar.url
        return None

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long."
            )
        if len(value) > 100:
            raise serializers.ValidationError("Title cannot exceed 100 characters.")
        return value


class SessionTemplateSerializer(serializers.ModelSerializer):
    mentor_username = serializers.ReadOnlyField(source="mentor.username")
    mentor_is_verified = serializers.ReadOnlyField(source="mentor.is_verified")

    class Meta:
        model = SessionTemplate
        fields = [
            "id",
            "title",
            "description",
            "template_type",
            "game_config",
            "is_public",
            "usage_count",
            "mentor",
            "mentor_username",
            "mentor_is_verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["mentor", "usage_count"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "bio", "avatar"]

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                "Username must be at least 3 characters long."
            )
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context.get("request").user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        if data["current_password"] == data["new_password"]:
            raise serializers.ValidationError(
                {
                    "new_password": "New password must be different from current password."  # noqa: E501
                }
            )
        return data


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "category",
            "requirement_value",
            "requirement_type",
            "points",
            "is_active",
            "created_at",
        ]


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ["id", "achievement", "earned_at"]


class UserPointsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserPoints
        fields = ["id", "username", "total_points", "last_updated"]


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    role = serializers.CharField()
    is_verified = serializers.BooleanField(default=False)
    total_points = serializers.IntegerField()
    achievements_count = serializers.IntegerField()


class DiaryCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source="author.username")
    author_avatar = serializers.SerializerMethodField()

    def get_author_avatar(self, obj):
        if obj.author.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.author.avatar.url)
            return obj.author.avatar.url
        return None

    class Meta:
        model = DiaryComment
        fields = [
            "id",
            "diary",
            "author",
            "author_username",
            "author_avatar",
            "content",
            "created_at",
        ]
        read_only_fields = ["author", "created_at"]

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Comment cannot be empty.")
        if len(value) > 1000:
            raise serializers.ValidationError("Comment cannot exceed 1000 characters.")
        return value


class UserStreakSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserStreak
        fields = [
            "id",
            "username",
            "current_streak",
            "longest_streak",
            "last_active_date",
            "created_at",
        ]
        read_only_fields = [
            "user",
            "current_streak",
            "longest_streak",
            "last_active_date",
        ]


class UserLevelSerializer(serializers.Serializer):
    level = serializers.IntegerField()
    current_xp = serializers.IntegerField()
    xp_for_next_level = serializers.IntegerField()
    progress_percent = serializers.IntegerField()
    total_points = serializers.IntegerField()


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "id",
            "theme",
            "colorblind_mode",
            "reduced_motion",
            "dyslexic_font",
            "font_size",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    recipient_username = serializers.ReadOnlyField(source="recipient.username")

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "related_object_id",
            "related_object_type",
            "is_read",
            "created_at",
            "recipient",
            "recipient_username",
        ]
        read_only_fields = [
            "recipient",
            "recipient_username",
            "created_at",
        ]


class ChildProfileSerializer(serializers.ModelSerializer):
    total_points = serializers.SerializerMethodField()
    level_info = serializers.SerializerMethodField()
    streak_info = serializers.SerializerMethodField()
    recent_games = serializers.SerializerMethodField()
    activity_stats = serializers.SerializerMethodField()

    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "avatar",
            "total_points",
            "level_info",
            "streak_info",
            "recent_games",
            "activity_stats",
        ]

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_total_points(self, obj):
        try:
            return obj.points.total_points
        except Exception:
            return 0

    def get_level_info(self, obj):
        try:
            total = obj.points.total_points if hasattr(obj, "points") else 0
            xp_per_level = 100
            level = total // xp_per_level + 1
            current_xp = total % xp_per_level
            return {
                "level": level,
                "current_xp": current_xp,
                "xp_for_next_level": xp_per_level,
                "progress_percent": int((current_xp / xp_per_level) * 100),
                "total_points": total,
            }
        except Exception:
            return None

    def get_streak_info(self, obj):
        try:
            return {
                "current_streak": obj.streak.current_streak,
                "longest_streak": obj.streak.longest_streak,
            }
        except Exception:
            return None

    def get_recent_games(self, obj):
        from .models import StudentSessionState

        recent = (
            StudentSessionState.objects.filter(student=obj)
            .select_related("session")
            .order_by("-updated_at")[:5]
        )
        return [
            {
                "game_type": (
                    state.session.game_type
                    if state.session and state.session.game_type
                    else "Unknown"
                ),
                "score": 100,
                "completed_at": state.updated_at,
            }
            for state in recent
        ]

    def get_activity_stats(self, obj):
        from .models import StudentDiary, StudentSessionState

        diaries = StudentDiary.objects.filter(student=obj).count()
        games = StudentSessionState.objects.filter(student=obj).count()
        return {"diaries_created": diaries, "games_played": games}


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent_username = serializers.ReadOnlyField(source="parent.username")
    student_username = serializers.ReadOnlyField(source="student.username")
    parent_email = serializers.ReadOnlyField(source="parent.email")
    student_email = serializers.ReadOnlyField(source="student.email")

    class Meta:
        from .models import ParentStudentLink

        model = ParentStudentLink
        fields = [
            "id",
            "parent",
            "parent_username",
            "parent_email",
            "student",
            "student_username",
            "student_email",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class StaffUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "is_verified",
            "date_joined",
            "bio",
        ]
        read_only_fields = ["date_joined"]


class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    target_username = serializers.CharField(
        source="target_user.username", read_only=True
    )

    class Meta:
        from .models import AuditLog

        model = AuditLog
        fields = [
            "id",
            "user",
            "user_username",
            "target_user",
            "target_username",
            "action",
            "details",
            "ip_address",
            "timestamp",
        ]
        read_only_fields = fields


class ClassGroupSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    mentor_username = serializers.CharField(source="mentor.username", read_only=True)

    class Meta:
        from .models import ClassGroup

        model = ClassGroup
        fields = [
            "id",
            "mentor",
            "mentor_username",
            "name",
            "description",
            "students",
            "student_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["mentor", "created_at", "updated_at"]

    def get_student_count(self, obj):
        return obj.students.count()

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["mentor"] = request.user
        return super().create(validated_data)
