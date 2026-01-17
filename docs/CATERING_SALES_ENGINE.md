# Catering Sales Engine - Financial & Visual Management Layer

## Descripción General

Esta implementación transforma el módulo de Catering de RestoNext en una herramienta de ventas de alto rendimiento, añadiendo:

1. **Integración de Pagos Stripe** - Cobro de anticipos en línea
2. **Tablero Kanban de Leads** - CRM visual con drag & drop
3. **Sistema de Paquetes** - Bundles para cotización rápida
4. **Automatización de Correos** - Notificaciones post-firma

---

## 📦 Dependencias a Instalar

### Frontend (apps/web)

```bash
cd apps/web

# @dnd-kit para drag & drop moderno
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Stripe para pagos (opcional si ya está instalado)
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Backend (apps/api)

```bash
cd apps/api

# Stripe Python SDK
pip install stripe

# O agregar a requirements.txt:
# stripe>=7.0.0
```

---

## 🔧 Configuración de Variables de Entorno

### Backend (.env o environment variables)

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # O sk_live_... en producción
STRIPE_PUBLISHABLE_KEY=pk_test_...

# URL del frontend (para emails)
FRONTEND_URL=https://tudominio.com
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📁 Archivos Creados/Modificados

### Backend

| Archivo | Cambio |
|---------|--------|
| `apps/api/app/models/models.py` | + Modelo `CateringPackage`, campos de pago en `CateringQuote`, nuevos estados en `LeadStatus` y `EventStatus` |
| `apps/api/app/api/catering.py` | + Endpoints de pago Stripe, paquetes, actualización de status de leads, automatización de emails |
| `apps/api/app/templates/email/proposal_signed_client.html` | Nuevo - Email al cliente tras firma |
| `apps/api/app/templates/email/event_confirmed_manager.html` | Nuevo - Email al gerente tras firma |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `apps/web/components/catering/LeadsKanban.tsx` | Nuevo - Componente Kanban CRM con @dnd-kit |
| `apps/web/app/catering/leads/page.tsx` | Reemplazo - Usa LeadsKanban en vez de tabla |
| `apps/web/app/portal/proposal/[token]/page.tsx` | Reemplazo - Flujo Firma → Pago con Stripe |
| `apps/web/lib/api.ts` | + Funciones API para leads, paquetes |

---

## 🔄 Migración de Base de Datos

Ejecutar migración de Alembic para los nuevos campos:

```bash
cd apps/api

# Generar migración
alembic revision --autogenerate -m "Add CateringPackage and payment fields"

# Aplicar migración
alembic upgrade head
```

### Campos añadidos a `CateringQuote`:
- `deposit_percentage` (Float, default 50.0)
- `deposit_amount` (Float)
- `deposit_paid` (Boolean)
- `stripe_payment_intent_id` (String)
- `paid_at` (DateTime)
- `signature_data` (JSONB)
- `signed_at` (DateTime)

### Nueva tabla `catering_packages`:
- `id` (UUID, PK)
- `tenant_id` (UUID, FK)
- `name` (String)
- `description` (Text)
- `items` (JSONB)
- `base_price_per_person` (Float)
- `min_guests` (Integer)
- `max_guests` (Integer)
- `category` (String)
- `is_active` (Boolean)
- `created_at` (DateTime)

---

## 🔌 Endpoints API Nuevos

### Pagos (Públicos - para portal del cliente)

```
POST /api/catering/proposals/{token}/pay-deposit
    → Crea PaymentIntent de Stripe
    → Retorna: { client_secret, amount, deposit_percentage }

POST /api/catering/proposals/{token}/confirm-payment
    → Confirma pago y actualiza evento a BOOKED
    → Body: { payment_intent_id }
```

### Paquetes (Autenticados)

```
GET  /api/catering/packages
    → Lista paquetes activos
    → Query: ?category=wedding

POST /api/catering/packages
    → Crea nuevo paquete
    → Body: { name, items, base_price_per_person, ... }

POST /api/catering/events/{id}/apply-package
    → Aplica paquete a evento
    → Body: { package_id }
```

### Leads (Autenticados)

```
PATCH /api/catering/leads/{id}/status
    → Actualiza status (para Kanban drag & drop)
    → Body: { status: "proposal_sent" }

GET /api/catering/leads/{id}
    → Obtiene lead por ID
```

---

## 🎨 Estados del Pipeline

### Lead Status (Columnas Kanban)

| Valor | Etiqueta | Color |
|-------|----------|-------|
| `new` | Nuevo | Azul |
| `contacted` | Contactado | Cyan |
| `proposal_sent` | Propuesta Enviada | Violeta |
| `negotiation` | Negociación | Ámbar |
| `quoting` | Cotizando (legacy) | Gris |
| `won` | Ganado | Verde |
| `lost` | Perdido | Rojo |

### Event Status

| Valor | Descripción |
|-------|-------------|
| `draft` | Borrador |
| `confirmed` | Propuesta firmada |
| `booked` | **Anticipo pagado** ⭐ |
| `in_progress` | Evento en curso |
| `completed` | Completado |
| `cancelled` | Cancelado |

---

## 📧 Automatización de Emails

Tras la firma de propuesta (`POST /proposals/{token}/sign`):

1. **Email al Cliente** (`proposal_signed_client.html`)
   - Confirmación de contrato firmado
   - Detalles del evento
   - Monto del anticipo pendiente
   - CTA: "Pagar Anticipo Ahora"

2. **Email al Gerente** (`event_confirmed_manager.html`)
   - Notificación de nuevo evento
   - Resumen del ingreso esperado
   - Detalles de la firma digital

---

## 🧪 Testing Manual

### 1. Flujo de Firma → Pago

```bash
# 1. Crear evento con quote
# 2. Obtener public_token del quote
# 3. Navegar a /portal/proposal/{token}
# 4. Firmar propuesta
# 5. Pagar anticipo (test card: 4242 4242 4242 4242)
# 6. Verificar status del evento = BOOKED
```

### 2. Kanban de Leads

```bash
# 1. Ir a /catering/leads
# 2. Arrastrar lead entre columnas
# 3. Verificar que el status se actualiza en backend
```

### 3. Paquetes

```bash
# Crear paquete via API
curl -X POST http://localhost:8000/api/catering/packages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paquete Boda Gold",
    "items": [
      {"menu_item_id": "...", "name": "Entrada", "quantity": 1, "unit_price": 150}
    ],
    "base_price_per_person": 650,
    "min_guests": 50,
    "category": "wedding"
  }'
```

---

## ⚠️ Notas Importantes

1. **Stripe en Producción**: Cambiar de `sk_test_` a `sk_live_` y configurar webhooks para eventos de pago.

2. **Emails Asíncronos**: Los emails se envían en background para no bloquear la respuesta. En producción, considera usar Celery o una cola de mensajes.

3. **Stripe Elements Real**: El componente de pago actual es un placeholder. Para producción, implementar con `@stripe/react-stripe-js`:

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Wrapper
<Elements stripe={stripePromise}>
  <CheckoutForm clientSecret={clientSecret} />
</Elements>
```

4. **Webhook de Stripe**: Para confirmar pagos de forma segura, implementar webhook:

```python
@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    
    if event['type'] == 'payment_intent.succeeded':
        # Actualizar quote.deposit_paid = True
        pass
```

---

## 📊 Métricas de Impacto

Esta implementación mejora:

- **Flujo de caja**: Cobro inmediato del anticipo
- **Conversión**: Pipeline visual para seguimiento de leads
- **Velocidad de ventas**: Paquetes predefinidos aceleran cotización
- **Comunicación**: Emails automáticos mantienen informados a todos

---

*Implementado para RestoNext MX - Enero 2026*
