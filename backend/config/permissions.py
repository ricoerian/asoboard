from rest_framework import permissions


class IsMentorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "mentor"
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        from core.models import ClassGroup, Course, Session

        if isinstance(obj, Course):
            return obj.mentor == request.user
        elif isinstance(obj, Session):
            return obj.course.mentor == request.user
        elif isinstance(obj, ClassGroup):
            return obj.mentor == request.user
        return False


class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "staff"
        )


class IsStudentOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )

    def has_object_permission(self, request, view, obj):
        from core.models import StudentDiary

        if isinstance(obj, StudentDiary):
            return obj.student == request.user
        return False
