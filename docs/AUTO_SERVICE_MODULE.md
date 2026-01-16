# Auto-Service (Table Ordering) Module - Arquitectura e Implementación

## 📋 Resumen del Módulo

El módulo Auto-Service permite a los clientes ordenar directamente desde tabletas en las mesas sin necesidad de crear una cuenta o iniciar sesión. La seguridad se basa en un **Table Token** rotativo que se valida en cada request.

---

## 🔐 Modelo de Seguridad "Table Token"

### Flujo de Autenticación
```
1. Cliente escanea QR → URL: /dine/{tenant_id}/table/{table_id}?token={qr_secret_token}
2. Frontend envía token en cada request como query parameter
3. Backend valida: tenant activo + add-on habilitado + token válido
4. Si es válido → retorna TableContext con info de tenant/mesa
```

### Campos Nuevos en Model `Table`
```python
qr_secret_token: UUID        # Token rotativo para seguridad
qr_token_generated_at: datetime  # Timestamp de última rotación
self_service_enabled: bool   # Enable/disable por mesa individual
```

### Dependency de FastAPI
```python
async def get_current_table(tenant_id, table_id, token, db) -> TableContext:
    # Valida tenant, add-on, mesa y token
    # Retorna TableContext(tenant, table)
```

---

## 🏷️ Feature Flagging (Add-ons)

### Campos Nuevos en Model `Tenant`
```python
active_addons: JSONB  # {"self_service": true, "delivery": false, "kds_pro": true}
features_config: JSONB  # Configuración granular por módulo
```

### Ejemplo de Configuración
```json
{
  "active_addons": {
    "self_service": true,
    "delivery": false,
    "kds_pro": false
  },
  "features_config": {
    "self_service": {
      "allow_special_requests": true,
      "can_request_bill": true,
      "show_prices": true
    }
  }
}
```

---

## 📦 Flujo de Órdenes Híbrido

### Campo Nuevo en Model `Order`
```python
order_source: OrderSource  # Enum: 'pos', 'self_service', 'delivery_app', 'kiosk'
guest_session_id: str      # Identificador de sesión para self-service
```

### Flujo de Creación de Orden
```
1. Cliente agrega items al carrito (Frontend)
2. Cliente envía orden → POST /dining/{tenant}/table/{table}/order
3. Backend:
   a. Valida token
   b. Crea Order con order_source='self_service'
   c. Crea OrderItems
   d. Actualiza Table.status = 'occupied'
   e. Envía WebSocket a KDS (kitchen:new_order)
   f. Envía WebSocket a POS (table:new_self_service_order)
4. KDS muestra ticket nuevo con sonido
5. POS actualiza vista de mesas con orden activa
```

---

## 📢 Sistema de Service Requests

### Nuevo Model `ServiceRequest`
```python
class ServiceRequest(Base):
    id: UUID
    tenant_id: UUID (FK)
    table_id: UUID (FK)
    request_type: Enum('waiter', 'bill', 'refill', 'custom')
    status: Enum('pending', 'acknowledged', 'resolved')
    message: Text (opcional)
    resolved_by: UUID (FK User)
    resolved_at: datetime
    created_at: datetime
```

### Flujo de Service Request
```
1. Cliente toca "Llamar Mesero" → POST /dining/.../service-request
2. Backend crea ServiceRequest con status='pending'
3. WebSocket notifica a canal "waiter" con evento "service_request:new"
4. POS/Waiter ve popup con detalles (mesa, tipo, mensaje)
5. Staff marca como "acknowledged" al ver
6. Staff marca como "resolved" al atender
```

---

## 🔌 WebSocket Events

### Nuevos Eventos
| Evento | Descripción | Destino |
|--------|-------------|---------|
| `service_request:new` | Nueva solicitud de servicio | waiter, pos |
| `service_request:resolved` | Solicitud resuelta | waiter |
| `table:new_self_service_order` | Orden desde tablet | waiter, pos |
| `table:order_update` | Actualización de orden | waiter, pos |

### Uso en Frontend
```typescript
// Hook para POS/Waiter
const { pendingRequests, clearRequest } = useServiceSocket({
    playSound: true,
    onServiceRequest: (req) => console.log('Nueva solicitud:', req)
});
```

---

## 🌐 API Endpoints

### Públicos (Protegidos por Table Token)
```
GET  /dining/{tenant}/table/{table}/session   → TableSessionInfo
GET  /dining/{tenant}/table/{table}/menu      → PublicMenuResponse
POST /dining/{tenant}/table/{table}/order     → DiningOrderResponse
GET  /dining/{tenant}/table/{table}/order/status → OrderStatusPublic
POST /dining/{tenant}/table/{table}/service-request → ServiceRequestResponse
GET  /dining/{tenant}/table/{table}/service-requests → ActiveServiceRequests
GET  /dining/{tenant}/table/{table}/bill      → BillPublic
POST /dining/validate-token                    → TableTokenValidation
```

---

## 📱 Frontend Structure

```
app/(dining)/
├── layout.tsx           # Layout sin sidebar/navbar admin
└── dine/
    ├── api.ts           # API client para dining
    ├── context.tsx      # DiningProvider con estado
    ├── types.ts         # TypeScript interfaces
    └── components/
        ├── DiningHeader.tsx        # Header con botones
        ├── CategoryTabs.tsx        # Tabs de categorías
        ├── MenuItemCard.tsx        # Card de producto
        ├── ItemDetailModal.tsx     # Modal de modificadores
        ├── FloatingCartButton.tsx  # Botón flotante carrito
        ├── CartModal.tsx           # Modal de carrito
        ├── OrderConfirmationModal.tsx
        └── ServiceRequestModal.tsx
    └── [tenantId]/
        └── [tableId]/
            └── page.tsx  # Página principal
```

---

## 🗄️ Migración de Base de Datos

```bash
# Ejecutar migración
alembic upgrade add_self_service_dining
```

### Cambios en Tablas
- `tables`: +3 columnas (qr_secret_token, qr_token_generated_at, self_service_enabled)
- `tenants`: +2 columnas (active_addons, features_config)
- `orders`: +2 columnas (order_source, guest_session_id)
- Nueva tabla: `service_requests`

---

## 🔄 Sincronización KDS ↔ POS

### Cuando cliente envía orden:
```
[Customer Tablet]
    ↓ POST /order
[API Server]
    ↓ Create Order
    ├─→ ws.broadcast("kitchen") → [KDS] 🔔 "¡Nuevo pedido!"
    └─→ ws.broadcast("waiter")  → [POS] "Mesa 5 tiene orden activa"
```

### Cuando staff actualiza item:
```
[KDS] Staff marca item como "ready"
    ↓ PUT /orders/{id}/items/{item_id}/status
[API Server]
    ↓ Update OrderItem
    └─→ ws.broadcast("waiter") → [POS] "Item listo para servir"
```

---

## 🚀 Próximos Pasos

1. **Rotación de Token**: Implementar endpoint para regenerar `qr_secret_token` cuando mesa se libera
2. **QR Generator**: Crear UI para generar QR codes con URL de mesa
3. **Pagos Online**: Integrar pasarela de pagos para pago desde tablet
4. **Analytics**: Trackear métricas de auto-service vs POS orders
5. **Notificaciones Push**: Notificar al cliente cuando su orden está lista
