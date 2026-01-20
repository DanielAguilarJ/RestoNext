# RestoNext SaaS - Guía de Despliegue

## 📋 Resumen de Cambios

Este documento describe los pasos para desplegar las nuevas funcionalidades SaaS de RestoNext:

1. **Landing Page** - Nueva página de ventas en `/`
2. **Checkout Flow** - Integración completa con Stripe
3. **Auto-Provisioning** - Activación automática de módulos tras pago
4. **Middleware de Licencias** - Protección de rutas por módulos

---

## 🔧 Requisitos Previos

### Variables de Entorno Requeridas

#### Backend (`apps/api`)
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Price IDs (crear en Stripe Dashboard)
STRIPE_PRICE_ID_STARTER_MONTHLY=price_xxxx
STRIPE_PRICE_ID_STARTER_ANNUAL=price_xxxx
STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_xxxx
STRIPE_PRICE_ID_PROFESSIONAL_ANNUAL=price_xxxx
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_xxxx
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_xxxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=app-specific-password
SMTP_FROM_EMAIL=noreply@restonext.mx
SMTP_FROM_NAME=RestoNext

# Frontend URL
FRONTEND_URL=https://tu-dominio.com
```

#### Frontend (`apps/web`)
```env
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
```

---

## 🚀 Pasos de Despliegue

### 1. Configurar Stripe

1. **Crear Productos y Precios en Stripe:**
   ```bash
   # En Stripe Dashboard > Products, crear:
   - Starter: $999/mes o $799/mes (anual)
   - Professional: $2499/mes o $1999/mes (anual)
   - Enterprise: $5999/mes o $4999/mes (anual)
   ```

2. **Configurar Webhook en Stripe:**
   - URL: `https://tu-api-url.com/webhook/stripe`
   - Eventos a escuchar:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Guardar el Webhook Secret** (`whsec_xxxx`) en variables de entorno.

### 2. Actualizar Base de Datos

No se requieren migraciones adicionales. El campo `active_addons` (JSONB) ya existe en el modelo `Tenant`.

Si deseas verificar:
```bash
cd apps/api
alembic current
alembic upgrade head  # Solo si hay migraciones pendientes
```

### 3. Desplegar Backend

```bash
# Asegúrate de que los nuevos archivos estén incluidos
cd apps/api

# Verificar que no hay errores de sintaxis
python -c "from app.api.signup import router; print('✅ Signup router OK')"
python -c "from app.services.provisioning_service import ProvisioningService; print('✅ Provisioning OK')"

# Build Docker
docker build -t restonext-api .

# Push a registro
docker push tu-registry/restonext-api:latest
```

### 4. Desplegar Frontend

```bash
cd apps/web

# Verificar build
npm run build

# Si hay errores de TypeScript, revisar:
npm run type-check

# Build Docker
docker build -t restonext-web \
  --build-arg NEXT_PUBLIC_API_URL=https://tu-api-url.com \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx \
  .

# Push a registro
docker push tu-registry/restonext-web:latest
```

### 5. Actualizar DigitalOcean App Platform

```yaml
# En App Spec, agregar variables de entorno:
services:
  - name: api
    envs:
      - key: STRIPE_SECRET_KEY
        scope: RUN_TIME
        value: ${STRIPE_SECRET_KEY}
      - key: STRIPE_WEBHOOK_SECRET
        scope: RUN_TIME
        value: ${STRIPE_WEBHOOK_SECRET}
      # ... resto de variables

  - name: web
    build_command: npm run build
    envs:
      - key: NEXT_PUBLIC_API_URL
        scope: BUILD_TIME
        value: https://tu-api-url.com
      - key: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        scope: BUILD_TIME
        value: ${STRIPE_PUBLISHABLE_KEY}
```

---

## 📁 Estructura de Archivos Nuevos

```
apps/
├── api/
│   └── app/
│       ├── api/
│       │   └── signup.py              # 🆕 Endpoint de registro + checkout
│       ├── services/
│       │   └── provisioning_service.py # 🆕 Lógica de aprovisionamiento
│       └── templates/
│           └── email/
│               ├── welcome_subscription.html  # 🆕
│               ├── payment_failed.html        # 🆕
│               └── subscription_canceled.html # 🆕
│
└── web/
    ├── app/
    │   ├── (landing)/
    │   │   ├── layout.tsx    # 🆕 Layout de landing
    │   │   ├── page.tsx      # 🆕 Landing page
    │   │   └── checkout/
    │   │       └── page.tsx  # 🆕 Página de checkout
    │   └── onboarding/
    │       └── page.tsx      # 🔄 Actualizado con éxito de pago
    └── middleware.ts         # 🔄 Actualizado con verificación de licencias
```

---

## 🧪 Pruebas

### Probar Checkout (Modo Test)

1. Usar tarjeta de prueba: `4242 4242 4242 4242`
2. Fecha: cualquier fecha futura
3. CVC: cualquier 3 dígitos
4. ZIP: cualquier código postal

### Probar Webhook Localmente

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Reenviar webhooks a localhost
stripe listen --forward-to localhost:8000/webhook/stripe

# Esto te dará un webhook secret temporal para desarrollo
```

### Verificar Aprovisionamiento

```bash
# Después de un pago exitoso, verificar en la BD:
SELECT id, name, active_addons, billing_config 
FROM tenants 
WHERE email = 'email-del-test@example.com';
```

---

## 🔒 Checklist de Seguridad

- [ ] Webhook de Stripe verifica firma criptográfica
- [ ] Variables de entorno de producción NO están en el código
- [ ] HTTPS habilitado en todos los endpoints
- [ ] Rate limiting configurado en el API
- [ ] Logs de webhook almacenados para auditoría
- [ ] Backup de BD configurado

---

## 🐛 Troubleshooting

### Error: "Webhook signature verification failed"
- Verifica que `STRIPE_WEBHOOK_SECRET` sea el correcto
- En desarrollo, asegúrate de usar el secret del Stripe CLI

### Error: "Email not sent"
- Verifica configuración SMTP
- Para Gmail, usar App Passwords (no la contraseña normal)
- Verificar que el puerto 587 no esté bloqueado

### Checkout redirige 404
- Verificar `FRONTEND_URL` en el backend
- Asegurar que las rutas `/checkout` y `/onboarding` existan

### Usuario no tiene acceso después del pago
- Verificar que el webhook llegó (logs del backend)
- Verificar que `active_addons` se actualizó en la BD
- Limpiar cookies del usuario y volver a iniciar sesión

---

## 📞 Soporte

Para problemas técnicos durante el despliegue:
- Email: soporte@restonext.mx
- Docs: https://docs.restonext.mx
