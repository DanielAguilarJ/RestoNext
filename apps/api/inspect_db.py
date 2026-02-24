import asyncio
from sqlalchemy import inspect
from app.core.database import engine
from app.models.cash_management import CashShift, CashTransaction
import app.models.models

async def main():
    def sync_inspect(conn):
        inspector = inspect(conn)
        
        # Get DB columns
        db_shift_cols = [c["name"] for c in inspector.get_columns("cash_shifts")]
        db_txn_cols = [c["name"] for c in inspector.get_columns("cash_transactions")]
        
        # Get Model columns
        model_shift_cols = [c.key for c in CashShift.__table__.columns]
        model_txn_cols = [c.key for c in CashTransaction.__table__.columns]
        
        print("Missing in cash_shifts DB table:")
        print(set(model_shift_cols) - set(db_shift_cols))
        print("Missing in cash_transactions DB table:")
        print(set(model_txn_cols) - set(db_txn_cols))

    async with engine.connect() as conn:
        await conn.run_sync(sync_inspect)

if __name__ == "__main__":
    asyncio.run(main())
