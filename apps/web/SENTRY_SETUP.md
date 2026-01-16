# Configuración de Sentry para Frontend (Next.js)

Este documento describe cómo configurar **@sentry/nextjs** para monitoreo de errores y transacciones lentas en el frontend de RestoNext MX.

## 1. Instalación

```bash
cd apps/web
npm install --save @sentry/nextjs
```

## 2. Inicialización con Wizard

Ejecutar el wizard de Sentry (recomendado):

```bash
npx @sentry/wizard@latest -i nextjs
```

El wizard:
- Creará `sentry.client.config.ts`
- Creará `sentry.server.config.ts`  
- Creará `sentry.edge.config.ts`
- Modificará `next.config.js`
- Te pedirá el DSN de Sentry

## 3. Configuración Manual (Alternativa)

### 3.1 `sentry.client.config.ts`

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment settings
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% in dev, reduce in production
  
  // Session Replay (opcional - requiere plan de pago)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    // Capture Slow Transactions
    Sentry.browserTracingIntegration(),
    // Capture Session Replay
    Sentry.replayIntegration(),
  ],
  
  // Filter sensitive data
  beforeSend(event) {
    // Don't send errors from development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Sentry] Error captured (dev mode):', event.message);
      return null; // Don't send in development
    }
    return event;
  },
  
  // Add RestoNext metadata
  release: "restonext-web@1.0.0",
});
```

### 3.2 `sentry.server.config.ts`

```typescript
// apps/web/sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Not NEXT_PUBLIC_ for server
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Don't send in development
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
```

### 3.3 `next.config.js` (Actualizar)

```javascript
// apps/web/next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing config...
  reactStrictMode: true,
  output: 'standalone',
};

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  
  // Suppresses source map uploading logs during build
  silent: true,
  
  // Use the SENTRY_AUTH_TOKEN env variable
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  org: "your-org-name",
  project: "restonext-web",
  
  // Hide source maps from production
  hideSourceMaps: true,
};

// Wrap config with Sentry
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
```

## 4. Variables de Entorno

Agregar al archivo `.env`:

```bash
# Sentry Configuration (Frontend)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Organization and Project for source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=restonext-web
```

## 5. Verificar Instalación

### Test de Error Boundary

El `GlobalErrorBoundary.tsx` ya captura errores a Sentry:

```tsx
// En GlobalErrorBoundary.tsx
if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
        extra: {
            componentStack: errorInfo.componentStack,
            errorId: this.state.errorId,
        },
    });
}
```

### Test Manual

Agregar un botón de test temporal:

```tsx
<button onClick={() => { throw new Error('Sentry Test Error'); }}>
  Test Sentry
</button>
```

## 6. Dashboard de Transacciones Lentas

Para ver las "transacciones lentas" en el dashboard de Sentry:

1. Ve a **Performance** en el sidebar de Sentry
2. Revisa **Web Vitals** (LCP, FID, CLS)
3. Filtra por **Slow Transactions**
4. Revisa el **Waterfall** de cada transacción

### Transacciones Importantes a Monitorear:

| Transacción | Descripción | Threshold Recomendado |
|------------|-------------|----------------------|
| `/pos` | Carga del POS | < 2s |
| `/analytics` | Dashboard analítico | < 3s |
| `/inventory` | Listado de inventario | < 1.5s |
| `POST /api/orders` | Crear órden | < 500ms |

## 7. Alertas Recomendadas

Configurar en Sentry > Alerts:

1. **Critical Error Rate**: > 1% errores en 1 hora
2. **P95 Performance**: Transacción > 3s
3. **LCP Regression**: LCP aumenta > 500ms

## 8. Estructura de Archivos Final

```
apps/web/
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── next.config.js (modificado)
├── .env (con DSN)
└── components/
    └── ui/
        └── GlobalErrorBoundary.tsx (ya integrado)
```

## 9. Producción

En producción, asegúrate de:

1. Subir source maps (automático con el plugin)
2. Reducir `tracesSampleRate` a 0.1-0.2 (10-20%)
3. Configurar filtros para ignorar errores de terceros
4. Revisar el dashboard semanalmente

---

**Nota**: El `GlobalErrorBoundary.tsx` ya está integrado en `AppShell.tsx` y capturará todos los errores de React a Sentry automáticamente.
