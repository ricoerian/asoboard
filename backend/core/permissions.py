"""
Custom permission classes for AsoBoard MVP
"""

from rest_framework.permissions import BasePermission


class IsMentorOrStaff(BasePermission):
    """
    Permission class that allows access only to mentors and staff users
    """

    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Allow access for mentors and staff
        return request.user.role in ["mentor", "staff"]
