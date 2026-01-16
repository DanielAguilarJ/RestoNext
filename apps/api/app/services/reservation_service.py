
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, not_

from app.models.models import (
    Reservation, Table, ReservationStatus, ReservationPaymentStatus
)

class ReservationService:
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    async def get_available_tables_for_party(
        self, 
        party_size: int, 
        desired_time: datetime,
        duration_minutes: int = 120
    ) -> List[List[Table]]:
        """
        Finds single tables or combinations of adjacent tables that fit the party size.
        Returns a list of table combinations (e.g. [[T1], [T2, T3]]).
        """
        # 1. Get all tables for tenant
        all_tables_res = await self.db.execute(
            select(Table).where(Table.tenant_id == self.tenant_id)
        )
        all_tables = all_tables_res.scalars().all()
        
        # 2. Identify occupied tables in the time slot
        end_time = desired_time + timedelta(minutes=duration_minutes)
        
        # Overlap check: (StartA < EndB) and (EndA > StartB)
        occupied_query = select(Reservation).where(
            Reservation.tenant_id == self.tenant_id,
            Reservation.status.in_([ReservationStatus.CONFIRMED, ReservationStatus.SEATED]),
            Reservation.reservation_time < end_time,
            func.timezone('UTC', Reservation.reservation_time) + timedelta(minutes=duration_minutes) > desired_time
        )
        
        occupied_res = await self.db.execute(occupied_query)
        occupied_reservations = occupied_res.scalars().all()
        
        occupied_table_ids = set()
        for res in occupied_reservations:
            if res.table_id:
                occupied_table_ids.add(res.table_id)
            if res.additional_table_ids:
                for tid in res.additional_table_ids:
                    # JSONB might return string UUIDs
                    occupied_table_ids.add(UUID(tid) if isinstance(tid, str) else tid)

        free_tables = [t for t in all_tables if t.id not in occupied_table_ids]
        
        valid_combinations = []

        # 3. Check single tables
        for t in free_tables:
            if t.capacity >= party_size:
                valid_combinations.append([t])
        
        # 4. Check Pair Combinations (Merging)
        # Build adjacency map
        table_map = {t.id: t for t in free_tables}
        
        seen_pairs = set()
        
        for t in free_tables:
            if not t.adjacent_table_ids:
                continue
                
            for neighbor_id_str in t.adjacent_table_ids:
                neighbor_id = UUID(neighbor_id_str) if isinstance(neighbor_id_str, str) else neighbor_id_str
                
                if neighbor_id in table_map: # Neighbor is also free
                    neighbor = table_map[neighbor_id]
                    
                    # Create unique pair key to avoid duplicates [A,B] vs [B,A]
                    pair_key = tuple(sorted([t.id, neighbor.id]))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)
                    
                    combined_capacity = t.capacity + neighbor.capacity
                    if combined_capacity >= party_size:
                        valid_combinations.append([t, neighbor])

        return valid_combinations

    async def create_reservation(
        self,
        customer_id: UUID,
        party_size: int,
        reservation_time: datetime,
        deposit_amount: float = 0.0,
        notes: Optional[str] = None,
        agent_id: Optional[UUID] = None
    ) -> Reservation:
        
        # 1. Check availability
        options = await self.get_available_tables_for_party(party_size, reservation_time)
        if not options:
            raise ValueError("No matching tables available for this time and party size.")
            
        # Strategy: Pick the "Best Fit" (smallest capacity that fits) to save large tables? 
        # Or just pick the first one? For MVP, picking the first valid option.
        selected_tables = options[0] # List[Table]
        
        main_table = selected_tables[0]
        additional_ids = [str(t.id) for t in selected_tables[1:]]
        
        payment_status = ReservationPaymentStatus.PENDING
        if deposit_amount <= 0:
            payment_status = ReservationPaymentStatus.PAID # Or N/A, but 'paid' is fine if nothing owed
        
        reservation = Reservation(
            tenant_id=self.tenant_id,
            customer_id=customer_id,
            table_id=main_table.id,
            additional_table_ids=additional_ids,
            reservation_time=reservation_time,
            party_size=party_size,
            deposit_amount=deposit_amount,
            payment_status=payment_status,
            status=ReservationStatus.CONFIRMED if deposit_amount == 0 else ReservationStatus.PENDING,
            notes=notes,
            agent_id=agent_id
        )
        
        self.db.add(reservation)
        await self.db.commit()
        await self.db.refresh(reservation)
        
        return reservation
