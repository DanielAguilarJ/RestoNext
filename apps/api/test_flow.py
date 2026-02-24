import asyncio
from httpx import AsyncClient

BASE_URL = "http://localhost:8000"

async def main():
    async with AsyncClient(base_url=BASE_URL) as client:
        # 1. Login to get token
        response = await client.post("/auth/login", json={"email": "admin@restonext.com", "password": "password123"})
        if response.status_code != 200:
            print("Login failed, trying cashier@restonext.com")
            response = await client.post("/auth/login", json={"email": "cashier@restonext.com", "password": "password123"})
            
        if response.status_code != 200:
            print("Login failed")
            return
            
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Check if shift is open, if so close it
        print("Checking current shift...")
        shift_resp = await client.get("/shift/current", headers=headers)
        if shift_resp.status_code == 200:
            shift = shift_resp.json()
            print(f"Shift open, expected cash: {shift['expected_cash']}")
            await client.post("/shift/close", headers=headers, json={"real_cash": shift["expected_cash"]})
            print("Closed existing shift.")
            
        # 3. Open Shift
        print("Opening new shift...")
        open_resp = await client.post("/shift/open", headers=headers, json={"opening_amount": 1000})
        print("Open Shift:", open_resp.status_code)
        
        # 4. Create an order
        menu_items_resp = await client.get("/menu/items", headers=headers)
        if not menu_items_resp.json():
            print("No menu items found. Exiting.")
            return
            
        item = menu_items_resp.json()[0]
        
        # Fetching a real table
        tables_resp = await client.get("/tables", headers=headers)
        tables = tables_resp.json()
        if not tables:
            print("No tables found")
            return
            
        table_id = tables[0]["id"]
        
        order_resp = await client.post("/orders", headers=headers, json={
            "table_id": table_id, 
            "items": [{"menu_item_id": item["id"], "quantity": 1}]
        })
        print("Create Order:", order_resp.status_code)
        if order_resp.status_code not in [200, 201]:
            print(order_resp.json())
            return
            
        order = order_resp.json()
        order_id = order["id"]
        amount = order["total"]
        tip_amount = 50.0  # Test tip
        
        # 5. Pay order
        print(f"Paying order {order_id} with amount {amount} and tip {tip_amount}...")
        pay_resp = await client.post(f"/orders/{order_id}/pay", headers=headers, json={
            "payment_method": "cash",
            "amount": amount,
            "tip": tip_amount
        })
        print("Pay Order:", pay_resp.status_code)
        print("Response:", pay_resp.json())
        
        # 6. Record Sale in Cashier API
        print("Recording sale to shift...")
        sale_resp = await client.post("/shift/sale", headers=headers, json={
            "order_id": order_id,
            "amount": amount,
            "tip_amount": tip_amount,
            "payment_method": "cash"
        })
        print("Record Sale:", sale_resp.status_code)
        
        # 7. Check Shift Totals
        print("Checking shift totals...")
        shift_resp = await client.get("/shift/current", headers=headers)
        shift = shift_resp.json()
        print("Current Shift Status:")
        print(f"  Expected Cash: {shift['expected_cash']}")
        print(f"  Total Tips: {shift['total_tips']}")
        print(f"  Cash Sales (incl tip): {shift['cash_sales']}")
        
        # 8. Close Shift
        print("Closing shift...")
        close_resp = await client.post("/shift/close", headers=headers, json={"real_cash": shift["expected_cash"]})
        print("Close Shift:", close_resp.status_code)

if __name__ == "__main__":
    asyncio.run(main())
