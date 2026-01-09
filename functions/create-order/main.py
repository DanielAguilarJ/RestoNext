"""
RestoNext MX - Create Order Cloud Function
Handles order creation and automatic inventory decrement based on recipes.

Trigger: HTTP POST
Endpoint: /v1/functions/{functionId}/executions

Environment Variables:
- APPWRITE_ENDPOINT: Appwrite API endpoint
- APPWRITE_FUNCTION_PROJECT_ID: Project ID (auto-injected)
- APPWRITE_API_KEY: API key with database permissions
- DATABASE_ID: Database ID (default: restonext_db)
"""

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from appwrite.id import ID
import json
import os
from datetime import datetime, timezone


def main(context):
    """
    Appwrite Cloud Function entry point.
    
    Expected payload:
    {
        "restaurant_id": "rest_001",
        "table_id": "table_5",
        "table_number": 5,
        "waiter_id": "user_123",
        "waiter_name": "Carlos",
        "order_type": "dine_in",
        "items": [
            {
                "menu_item_id": "mi_tacos",
                "quantity": 2,
                "selected_modifiers": [
                    {"group": "Extras", "option": "Guacamole", "option_id": "opt_guac", "price_delta": 18}
                ],
                "seat_number": 1,
                "notes": "Sin cebolla"
            }
        ],
        "notes": "Mesa de cumpleaños"
    }
    """
    
    # Initialize Appwrite client with API key for server-side operations
    client = Client()
    client.set_endpoint(os.environ.get('APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'))
    client.set_project(os.environ.get('APPWRITE_FUNCTION_PROJECT_ID'))
    client.set_key(os.environ.get('APPWRITE_API_KEY'))
    
    databases = Databases(client)
    DATABASE_ID = os.environ.get('DATABASE_ID', 'restonext_db')
    
    # Collection IDs
    MENU_ITEMS = 'menu_items'
    ORDERS = 'orders'
    RECIPES = 'recipes'
    INVENTORY = 'inventory_items'
    
    try:
        # ===== Parse Request =====
        payload = json.loads(context.req.body)
        
        restaurant_id = payload['restaurant_id']
        table_id = payload.get('table_id')
        table_number = payload.get('table_number')
        waiter_id = payload['waiter_id']
        waiter_name = payload.get('waiter_name', '')
        order_items = payload['items']
        order_type = payload.get('order_type', 'dine_in')
        notes = payload.get('notes', '')
        
        context.log(f"Processing order for restaurant {restaurant_id}, {len(order_items)} items")
        
        # ===== STEP 1: Build Order Items =====
        processed_items = []
        subtotal = 0.0
        inventory_decrements = {}  # {inventory_id: {"quantity": float, "name": str}}
        
        for idx, item in enumerate(order_items):
            menu_item_id = item['menu_item_id']
            quantity = item['quantity']
            selected_modifiers = item.get('selected_modifiers', [])
            item_notes = item.get('notes', '')
            seat_number = item.get('seat_number')
            
            # Fetch menu item from database
            try:
                menu_item = databases.get_document(
                    database_id=DATABASE_ID,
                    collection_id=MENU_ITEMS,
                    document_id=menu_item_id
                )
            except Exception as e:
                return context.res.json({
                    'success': False,
                    'error': f"Menu item not found: {menu_item_id}"
                }, 404)
            
            # Validate availability
            if not menu_item.get('is_available', True):
                return context.res.json({
                    'success': False,
                    'error': f"Item '{menu_item['name']}' is not currently available"
                }, 400)
            
            # Calculate line total with modifiers
            unit_price = menu_item['price']
            modifier_delta = sum(m.get('price_delta', 0) for m in selected_modifiers)
            line_total = (unit_price + modifier_delta) * quantity
            subtotal += line_total
            
            # Build order item
            order_item = {
                'id': f"oi_{ID.unique()[:8]}",
                'menu_item_id': menu_item_id,
                'name': menu_item['name'],
                'quantity': quantity,
                'unit_price': unit_price,
                'selected_modifiers': selected_modifiers,
                'line_total': round(line_total, 2),
                'seat_number': seat_number,
                'status': 'pending',
                'notes': item_notes,
                'route_to': menu_item.get('route_to', 'kitchen')
            }
            processed_items.append(order_item)
            
            # ===== STEP 2: Get Recipe for Inventory Decrement =====
            try:
                recipes = databases.list_documents(
                    database_id=DATABASE_ID,
                    collection_id=RECIPES,
                    queries=[Query.equal('menu_item_id', menu_item_id)]
                )
                
                if recipes['total'] > 0:
                    recipe = recipes['documents'][0]
                    ingredients = recipe.get('ingredients', [])
                    
                    for ingredient in ingredients:
                        inv_id = ingredient['inventory_id']
                        decrement_qty = ingredient['quantity'] * quantity
                        
                        if inv_id in inventory_decrements:
                            inventory_decrements[inv_id]['quantity'] += decrement_qty
                        else:
                            inventory_decrements[inv_id] = {
                                'quantity': decrement_qty,
                                'name': ingredient.get('name', 'Unknown')
                            }
            except Exception as e:
                context.log(f"Recipe lookup skipped for {menu_item_id}: {str(e)}")
        
        # ===== STEP 3: Validate Inventory Availability =====
        insufficient_stock = []
        
        for inv_id, data in inventory_decrements.items():
            try:
                inv_item = databases.get_document(
                    database_id=DATABASE_ID,
                    collection_id=INVENTORY,
                    document_id=inv_id
                )
                
                available = inv_item.get('quantity_on_hand', 0)
                required = data['quantity']
                
                if available < required:
                    insufficient_stock.append({
                        'item': data['name'],
                        'available': available,
                        'required': required,
                        'unit': inv_item.get('unit', 'unidad')
                    })
            except Exception as e:
                context.log(f"Inventory validation skipped for {inv_id}: {str(e)}")
        
        if insufficient_stock:
            items_str = ", ".join([f"{s['item']} ({s['available']}/{s['required']} {s['unit']})" for s in insufficient_stock])
            return context.res.json({
                'success': False,
                'error': f"Insufficient stock: {items_str}",
                'insufficient_items': insufficient_stock
            }, 400)
        
        # ===== STEP 4: Create Order Document =====
        tax_rate = 0.16  # Mexico IVA 16%
        tax = subtotal * tax_rate
        total = subtotal + tax
        
        now = datetime.now(timezone.utc).isoformat()
        
        order_data = {
            'restaurant_id': restaurant_id,
            'table_id': table_id,
            'table_number': table_number,
            'waiter_id': waiter_id,
            'waiter_name': waiter_name,
            'status': 'pending',
            'order_type': order_type,
            'items': processed_items,
            'subtotal': round(subtotal, 2),
            'tax': round(tax, 2),
            'tip': 0,
            'total': round(total, 2),
            'notes': notes,
            'created_at': now
        }
        
        # Create with team-based permissions
        order = databases.create_document(
            database_id=DATABASE_ID,
            collection_id=ORDERS,
            document_id=ID.unique(),
            data=order_data,
            permissions=[
                f'read("team:{restaurant_id}")',
                f'update("team:{restaurant_id}")',
                f'delete("team:{restaurant_id}")'
            ]
        )
        
        context.log(f"Order {order['$id']} created with {len(processed_items)} items")
        
        # ===== STEP 5: Decrement Inventory =====
        inventory_updates = []
        low_stock_alerts = []
        
        for inv_id, data in inventory_decrements.items():
            try:
                inv_item = databases.get_document(
                    database_id=DATABASE_ID,
                    collection_id=INVENTORY,
                    document_id=inv_id
                )
                
                previous_qty = inv_item['quantity_on_hand']
                new_qty = previous_qty - data['quantity']
                
                databases.update_document(
                    database_id=DATABASE_ID,
                    collection_id=INVENTORY,
                    document_id=inv_id,
                    data={'quantity_on_hand': round(new_qty, 4)}
                )
                
                update_result = {
                    'inventory_id': inv_id,
                    'name': data['name'],
                    'previous': previous_qty,
                    'decremented': data['quantity'],
                    'new': round(new_qty, 4)
                }
                inventory_updates.append(update_result)
                
                # Check reorder level
                reorder_level = inv_item.get('reorder_level', 10)
                if new_qty <= reorder_level:
                    alert = {
                        'item': data['name'],
                        'current_stock': round(new_qty, 4),
                        'reorder_level': reorder_level,
                        'unit': inv_item.get('unit', 'unidad')
                    }
                    low_stock_alerts.append(alert)
                    context.log(f"⚠️ LOW STOCK: {data['name']} at {new_qty} (reorder at {reorder_level})")
                    
            except Exception as e:
                context.error(f"Failed to decrement {inv_id}: {str(e)}")
        
        # ===== STEP 6: Return Success Response =====
        response = {
            'success': True,
            'order_id': order['$id'],
            'order_number': order.get('table_number', 'N/A'),
            'items_count': len(processed_items),
            'subtotal': round(subtotal, 2),
            'tax': round(tax, 2),
            'total': round(total, 2),
            'inventory_updated': len(inventory_updates),
            'created_at': now
        }
        
        if low_stock_alerts:
            response['low_stock_alerts'] = low_stock_alerts
        
        return context.res.json(response, 201)
        
    except KeyError as e:
        return context.res.json({
            'success': False,
            'error': f'Missing required field: {str(e)}'
        }, 400)
        
    except json.JSONDecodeError as e:
        return context.res.json({
            'success': False,
            'error': f'Invalid JSON payload: {str(e)}'
        }, 400)
        
    except Exception as e:
        context.error(f"Order creation failed: {str(e)}")
        return context.res.json({
            'success': False,
            'error': f'Internal error: {str(e)}'
        }, 500)
