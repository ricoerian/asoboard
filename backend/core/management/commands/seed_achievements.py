from django.core.management.base import BaseCommand

from core.models import Achievement


class Command(BaseCommand):
    help = "Seed initial achievements into the database"

    def handle(self, *args, **kwargs):
        achievements_data = [
            {
                "name": "First Steps",
                "description": "Complete your first session",
                "icon": "🎯",
                "requirement_type": "sessions_completed",
                "requirement_value": 1,
                "points": 10,
                "category": "sessions",
            },
            {
                "name": "Getting Started",
                "description": "Complete 5 sessions",
                "icon": "⭐",
                "requirement_type": "sessions_completed",
                "requirement_value": 5,
                "points": 25,
                "category": "sessions",
            },
            {
                "name": "Dedicated Learner",
                "description": "Complete 10 sessions",
                "icon": "🌟",
                "requirement_type": "sessions_completed",
                "requirement_value": 10,
                "points": 50,
                "category": "sessions",
            },
            {
                "name": "Session Master",
                "description": "Complete 25 sessions",
                "icon": "💫",
                "requirement_type": "sessions_completed",
                "requirement_value": 25,
                "points": 100,
                "category": "sessions",
            },
            {
                "name": "Dear Diary",
                "description": "Create your first diary entry",
                "icon": "📔",
                "requirement_type": "diaries_created",
                "requirement_value": 1,
                "points": 10,
                "category": "diaries",
            },
            {
                "name": "Journal Keeper",
                "description": "Create 5 diary entries",
                "icon": "📚",
                "requirement_type": "diaries_created",
                "requirement_value": 5,
                "points": 25,
                "category": "diaries",
            },
            {
                "name": "Storyteller",
                "description": "Create 10 diary entries",
                "icon": "✨",
                "requirement_type": "diaries_created",
                "requirement_value": 10,
                "points": 50,
                "category": "diaries",
            },
            {
                "name": "Game On!",
                "description": "Complete your first game",
                "icon": "🎮",
                "requirement_type": "games_played",
                "requirement_value": 1,
                "points": 10,
                "category": "games",
            },
            {
                "name": "Game Explorer",
                "description": "Complete 5 games",
                "icon": "🎲",
                "requirement_type": "games_played",
                "requirement_value": 5,
                "points": 25,
                "category": "games",
            },
            {
                "name": "Game Enthusiast",
                "description": "Complete 10 games",
                "icon": "🏆",
                "requirement_type": "games_played",
                "requirement_value": 10,
                "points": 50,
                "category": "games",
            },
            {
                "name": "Quick Learner",
                "description": "Get 5 correct answers",
                "icon": "✅",
                "requirement_type": "perfect_scores",
                "requirement_value": 5,
                "points": 15,
                "category": "engagement",
            },
            {
                "name": "Sharp Mind",
                "description": "Get 20 correct answers",
                "icon": "🧠",
                "requirement_type": "perfect_scores",
                "requirement_value": 20,
                "points": 50,
                "category": "engagement",
            },
            {
                "name": "Genius",
                "description": "Get 50 correct answers",
                "icon": "💡",
                "requirement_type": "perfect_scores",
                "requirement_value": 50,
                "points": 100,
                "category": "engagement",
            },
            {
                "name": "Mastermind",
                "description": "Get 100 correct answers",
                "icon": "🎓",
                "requirement_type": "perfect_scores",
                "requirement_value": 100,
                "points": 200,
                "category": "engagement",
            },
        ]
        created_count = 0
        for data in achievements_data:
            achievement, created = Achievement.objects.get_or_create(
                name=data["name"], defaults=data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created achievement: {achievement.name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Achievement already exists: {achievement.name}"
                    )
                )
        self.stdout.write(
            self.style.SUCCESS(
                f"\nSuccessfully created {created_count} new achievements!"
            )
        )
