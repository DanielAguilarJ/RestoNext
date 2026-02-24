import asyncio
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.models import User

async def main():
    async with SessionLocal() as session:
        result = await session.execute(select(User))
        user = result.scalars().first()
        if user:
            print(f"User email: {user.email}")
            print(f"User ID: {user.id}")
            print(f"Password hash: (cannot use directly to login, but email is known)")

if __name__ == "__main__":
    asyncio.run(main())
