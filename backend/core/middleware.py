from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        validated_token = UntypedToken(token)
        user_id = validated_token.get("user_id")
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Respect user already set in scope (e.g. by tests)
        existing_user = scope.get("user")
        if existing_user is not None and not isinstance(existing_user, AnonymousUser):
            return await self.inner(scope, receive, send)

        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode("utf-8")
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        token = None
        if "access_token" in cookie:
            token = cookie["access_token"].value
        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
