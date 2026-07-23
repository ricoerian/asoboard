from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Asset, Course, ParentStudentLink, Session, StudentDiary, User


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("role", "is_verified")}),
    )
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "role",
        "is_verified",
    )


admin.site.register(User, CustomUserAdmin)
admin.site.register(Course)
admin.site.register(Session)
admin.site.register(Asset)
admin.site.register(StudentDiary)
admin.site.register(ParentStudentLink)
