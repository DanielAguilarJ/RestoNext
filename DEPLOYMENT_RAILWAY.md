# 🚀 Guía de Despliegue en Railway - RestoNext MX

Esta guía detalla los pasos para desplegar la infraestructura completa de RestoNext MX en [Railway.app](https://railway.app/).

## 📋 Arquitectura en Railway

Para un funcionamiento óptimo, desplegaremos 4 servicios:
1.  **RestoNext API (Backend)**: FastAPI + SQLAlchemy.
2.  **RestoNext Web (Frontend)**: Next.js (Standalone mode).
3.  **PostgreSQL**: Base de datos principal.
4.  **Redis**: Para Rate Limiting y Cache.

---

## 🛠 Pasos para el Despliegue

### 1. Preparar el Repositorio
Asegúrate de que los cambios estén en tu repositorio de GitHub. Railway se sincroniza automáticamente con tu rama principal.

### 2. Crear un Nuevo Proyecto en Railway
1.  Ve a [Railway Dashboard](https://railway.app/dashboard).
2.  Haz clic en **"New Project"**.
3.  Selecciona **"Deploy from GitHub repo"** y elige tu repositorio.

### 3. Configurar los Servicios de Bases de Datos
Dentro de tu proyecto de Railway:
1.  Haz clic en **"New"** -> **"Database"** -> **"Add PostgreSQL"**.
2.  Haz clic en **"New"** -> **"Database"** -> **"Add Redis"**.

Railway inyectará automáticamente las variables `DATABASE_URL` y `REDIS_URL`.

### 4. Configurar el Servicio API (Backend)
1.  Haz clic en **"New"** -> **"GitHub Repo"** (el mismo repo).
2.  En la configuración del servicio (**Settings**):
    *   **Service Name**: `restonext-api`
    *   **Root Directory**: `apps/api`
3.  En la pestaña **Variables**, añade las variables necesarias (ver sección de variables abajo).

### 5. Configurar el Servicio Web (Frontend)
1.  Haz clic en **"New"** -> **"GitHub Repo"** (el mismo repo).
2.  En la configuración del servicio (**Settings**):
    *   **Service Name**: `restonext-web`
    *   **Root Directory**: `apps/web`
3.  En la pestaña **Variables**, añade `NEXT_PUBLIC_API_URL` apuntando a la URL pública de tu servicio API.

---

## 🔑 Variables de Entorno Necesarias

### Para el Backend (API)
*   `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Se auto-genera al conectar Postgres).
*   `REDIS_URL`: `${{Redis.REDIS_URL}}` (Se auto-genera al conectar Redis).
*   `SECRET_KEY`: Una cadena aleatoria larga para JWT.
*   `ENVIRONMENT`: `production`
*   `CORS_ORIGINS`: La URL de tu frontend (ej. `https://restonext-web.up.railway.app`).

### Para el Frontend (Web)
*   `NEXT_PUBLIC_API_URL`: La URL pública de tu API (ej. `https://restonext-api.up.railway.app/api`).
*   `NEXT_PUBLIC_WS_URL`: La misma URL pero con protocolo `wss` (ej. `wss://restonext-api.up.railway.app`).

---

## ⚡ Optimizaciones Incluidas

*   **Docker Multi-stage**: Las imágenes están optimizadas para ocupar menos de 200MB.
*   **Next.js Standalone**: El frontend usa el modo standalone de Next.js 14 para máxima velocidad y menor consumo de RAM.
*   **Healthchecks**: Ambos servicios tienen configurados healthchecks para asegurar alta disponibilidad.
*   **PDF Worker**: El API incluye `ReportLab` listo para generar propuestas de catering en producción.

---

## 📝 Comandos Útiles post-despliegue

Si necesitas ejecutar migraciones de base de datos manualmente a través del CLI de Railway:

```bash
railway run --service restonext-api alembic upgrade head
```

Para crear el primer usuario administrador:
```bash
railway run --service restonext-api python cli.py create-tenant "Mi Restaurante" admin@ejemplo.com password123
```
