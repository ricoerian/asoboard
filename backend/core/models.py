from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ("mentor", "Mentor"),
        ("student", "Student"),
        ("staff", "Staff"),
        ("parent", "Parent"),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="student")
    is_verified = models.BooleanField(default=False)
    bio = models.TextField(
        blank=True, null=True, help_text="A short biography or description of the user"
    )
    avatar = models.ImageField(
        upload_to="avatars/", blank=True, null=True, help_text="User profile picture"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class Course(models.Model):
    mentor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="courses",
        limit_choices_to={"role": "mentor"},
        null=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Session(models.Model):
    MODE_CHOICES = (
        ("freedom", "Freedom Canvas"),
        ("game", "Game Creation"),
    )
    course = models.ForeignKey(
        Course, related_name="sessions", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=200)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="freedom")

    SESSION_TYPE_CHOICES = (
        ("recorded", "Recorded Lesson"),
        ("live", "Live Collaboration"),
    )
    session_type = models.CharField(
        max_length=20, choices=SESSION_TYPE_CHOICES, default="recorded"
    )

    GAME_CHOICES = (
        ("puzzle", "Puzzle"),
        ("trivia", "Trivia"),
        ("math", "Math"),
        ("physics", "Physics"),
        ("color", "Color Mix"),
        ("chemistry", "Chemistry"),
        ("memory", "Memory Match"),
        ("maze", "Maze"),
        ("word_scramble", "Word Scramble"),
        ("flashcard", "Flashcard"),
    )
    game_type = models.CharField(
        max_length=50, choices=GAME_CHOICES, blank=True, null=True
    )
    game_config = models.JSONField(default=dict, blank=True)
    audio_file = models.FileField(upload_to="session_audio/", blank=True, null=True)
    canvas_events = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class StudentSessionState(models.Model):
    session = models.ForeignKey(
        Session, related_name="student_states", on_delete=models.CASCADE
    )
    student = models.ForeignKey(
        User, related_name="session_states", on_delete=models.CASCADE
    )
    canvas_events = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("session", "student")

    def __str__(self):
        return f"State: {self.student.username} for {self.session.title}"


class Achievement(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default="trophy")
    category = models.CharField(
        max_length=50,
        choices=[
            ("courses", "Course Completion"),
            ("sessions", "Session Participation"),
            ("diaries", "Diary Creation"),
            ("games", "Game Performance"),
            ("engagement", "User Engagement"),
        ],
    )
    requirement_value = models.IntegerField(
        help_text="Required count to earn achievement"
    )
    requirement_type = models.CharField(
        max_length=50,
        choices=[
            ("courses_completed", "Courses Completed"),
            ("sessions_completed", "Sessions Completed"),
            ("diaries_created", "Diaries Created"),
            ("games_won", "Games Won"),
            ("games_played", "Games Played"),
            ("perfect_scores", "Perfect Scores"),
            ("consecutive_days", "Consecutive Days Active"),
        ],
    )
    points = models.IntegerField(default=10, help_text="Points awarded when earned")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.category})"


class UserAchievement(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="achievements"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "achievement"]

    def __str__(self):
        return f"{self.user.username} earned {self.achievement.name}"


class UserPoints(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="points")
    total_points = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}: {self.total_points} points"


class Asset(models.Model):
    ASSET_TYPES = (
        ("image", "Image (PNG/SVG/GIF)"),
        ("audio", "Audio Effect"),
        ("animation", "Animation Option"),
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to="assets/", null=True, blank=True)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPES, default="image")
    animation_config = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_assets"
    )
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_asset_type_display()})"


class StudentDiary(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="diaries")
    title = models.CharField(max_length=200, default="Untitled Diary")
    canvas_events = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} by {self.student.username}"


class Enrollment(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments"
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.username} enrolled in {self.course.title}"


class DiaryComment(models.Model):
    diary = models.ForeignKey(
        StudentDiary, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="diary_comments"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username} on {self.diary.title}"


class SessionTemplate(models.Model):
    TEMPLATE_TYPES = (
        ("trivia", "Trivia"),
        ("puzzle", "Puzzle"),
        ("math", "Math"),
        ("physics", "Physics"),
        ("color", "Color Mix"),
        ("chemistry", "Chemistry"),
        ("memory", "Memory Match"),
        ("maze", "Maze"),
        ("word_scramble", "Word Scramble"),
        ("flashcard", "Flashcard"),
    )
    mentor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="templates",
        limit_choices_to={"role": "mentor"},
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES)
    game_config = models.JSONField(default=dict, blank=True)
    is_public = models.BooleanField(default=False)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.get_template_type_display()})"


class UserStreak(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="streak")
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.current_streak} day streak"


class UserPreference(models.Model):
    THEME_CHOICES = (
        ("light", "Light (Default)"),
        ("high-contrast", "High Contrast"),
    )
    COLORBLIND_CHOICES = (
        ("none", "None"),
        ("protanopia", "Protanopia (Red-blind)"),
        ("deuteranopia", "Deuteranopia (Green-blind)"),
        ("tritanopia", "Tritanopia (Blue-blind)"),
    )
    FONT_SIZE_CHOICES = (
        ("normal", "Normal"),
        ("large", "Large"),
        ("x-large", "Extra Large"),
    )
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="preferences"
    )
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default="light")
    colorblind_mode = models.CharField(
        max_length=20, choices=COLORBLIND_CHOICES, default="none"
    )
    reduced_motion = models.BooleanField(default=False)
    dyslexic_font = models.BooleanField(default=False)
    font_size = models.CharField(
        max_length=10, choices=FONT_SIZE_CHOICES, default="normal"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.username}"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("achievement", "Achievement Earned"),
        ("enrollment", "Course Enrollment"),
        ("diary_comment", "Diary Comment"),
        ("system", "System"),
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, choices=NOTIFICATION_TYPES, default="system"
    )
    related_object_id = models.IntegerField(null=True, blank=True)
    related_object_type = models.CharField(max_length=50, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username}"


class ParentStudentLink(models.Model):
    parent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="children_links",
        limit_choices_to={"role": "parent"},
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="parent_links",
        limit_choices_to={"role": "student"},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("parent", "student")

    def __str__(self):
        return f"Parent {self.parent.username} -> Student {self.student.username}"


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("deactivate", "Deactivate"),
        ("reactivate", "Reactivate"),
    )

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_actions"
    )
    target_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_events",
        blank=True,
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    details = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return (
            f"{self.user} did {self.action} on {self.target_user} at {self.timestamp}"
        )


class ClassGroup(models.Model):
    mentor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="class_groups"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    students = models.ManyToManyField(
        User, related_name="enrolled_classes", limit_choices_to={"role": "student"}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} (by {self.mentor.username})"
