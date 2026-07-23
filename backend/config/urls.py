from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    ChangePasswordView,
    CookieTokenObtainPairView,
    LogoutView,
    RegisterView,
    UserPreferenceView,
    UserView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/me/", UserView.as_view(), name="user_profile"),
    path("api/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path(
        "api/user-preferences/", UserPreferenceView.as_view(), name="user_preferences"
    ),
    path("api/logout/", LogoutView.as_view(), name="logout"),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
