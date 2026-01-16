# 🏗️ RestoNext MX - Production Infrastructure

Este directorio contiene toda la configuración necesaria para desplegar RestoNext como un SaaS seguro y autónomo.

## 📁 Estructura de Archivos

```
.
├── docker-compose.yml        # Producción: NGINX + SSL + todos los servicios
├── docker-compose.dev.yml    # Desarrollo: Hot reload, sin NGINX
├── nginx/
│   ├── nginx.conf            # Configuración principal de NGINX
│   ├── conf.d/
│   │   └── default.conf      # Virtual host con routing y WebSocket
│   └── ssl/
│       ├── fullchain.pem     # Certificado SSL (Let's Encrypt o self-signed)
│       └── privkey.pem       # Clave privada SSL
├── apps/
│   ├── api/
│   │   ├── Dockerfile        # Multi-stage: builder → development → production
│   │   ├── cli.py            # CLI para tenant onboarding
│   │   └── app/core/
│   │       └── scheduler.py  # APScheduler para tareas automáticas
│   └── web/
│       ├── Dockerfile        # Multi-stage para producción
│       └── Dockerfile.dev    # Desarrollo con hot reload
└── .env.example              # Variables de entorno documentadas
```

## 🚀 Quick Start

### Desarrollo Local

```bash
# 1. Clonar y configurar
cp .env.example .env
# Editar .env con tus valores

# 2. Iniciar servicios de desarrollo
docker-compose -f docker-compose.dev.yml up --build

# 3. Acceder
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
# API Health: http://localhost:8000/health
```

### Producción

```bash
# 1. Configurar variables de entorno
cp .env.example .env
# IMPORTANTE: Cambiar JWT_SECRET, POSTGRES_PASSWORD, etc.

# 2. Generar certificados SSL (opción A: Let's Encrypt)
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com \
  --email admin@your-domain.com \
  --agree-tos

# 2b. O usar certificados self-signed para testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=MX/ST=CDMX/L=Mexico/O=RestoNext/CN=localhost"

# 3. Iniciar todo
docker-compose up -d --build

# 4. Verificar
curl https://localhost/health
```

## 🔧 CLI Tool - Tenant Onboarding

```bash
# Crear un nuevo restaurante (tenant)
docker-compose exec api python cli.py create-tenant \
  --name "Tacos El Patrón" \
  --email "admin@elpatron.mx" \
  --plan enterprise

# Listar todos los tenants
docker-compose exec api python cli.py list-tenants

# Ejecutar un job manualmente
docker-compose exec api python cli.py run-job daily_close

# Ver estado del scheduler
docker-compose exec api python cli.py scheduler-status
```

### Planes Disponibles

| Plan | Descripción | Mesas | Self-Service | KDS Pro | AI Analytics |
|------|-------------|-------|--------------|---------|--------------|
| starter | Pequeños | 10 | ❌ | ❌ | ❌ |
| professional | Medianos | 30 | ✅ | ✅ | ❌ |
| enterprise | Cadenas | 100 | ✅ | ✅ | ✅ |

## 📅 Scheduler - Tareas Automáticas

Las siguientes tareas se ejecutan automáticamente a las 4:00 AM (hora de CDMX):

| Job | Hora | Descripción |
|-----|------|-------------|
| `daily_close_job` | 04:00 | Cierra órdenes abiertas >24h |
| `inventory_snapshot_job` | 04:05 | Snapshot del inventario |
| `expire_loyalty_points_job` | 04:10 | Procesa puntos expirados |

### Configuración

```bash
# Deshabilitar scheduler
SCHEDULER_ENABLED=false docker-compose up -d api

# Ejecutar manualmente
docker-compose exec api python cli.py run-job inventory_snapshot
```

## 🔒 Seguridad

### NGINX Features
- ✅ HTTPS obligatorio (redirect HTTP → HTTPS)
- ✅ TLS 1.2/1.3 únicamente
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Rate limiting por IP
- ✅ WebSocket secure (wss://)

### Rate Limits
- API general: 100 req/min por IP
- Auth endpoints: 10 req/min por IP (anti-bruteforce)
- WebSocket: 10 conexiones por IP

## 📊 Monitoring

### Health Checks

```bash
# API health
curl https://localhost/health

# Scheduler status
curl https://localhost/api/system/scheduler

# System info
curl https://localhost/api/system/info
```

### Logs

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Solo API
docker-compose logs -f api

# Solo NGINX
docker-compose logs -f nginx
```

## 🔄 Updates & Maintenance

```bash
# Actualizar imágenes
docker-compose pull

# Rebuild y restart
docker-compose up -d --build

# Backup de PostgreSQL
docker-compose exec db pg_dump -U restonext restonext > backup.sql

# Restore
cat backup.sql | docker-compose exec -T db psql -U restonext restonext
```

## 🐛 Troubleshooting

### WebSocket no conecta
```bash
# Verificar configuración de NGINX
docker-compose exec nginx nginx -t

# Ver logs de upgrade
docker-compose logs nginx | grep -i upgrade
```

### Scheduler no ejecuta
```bash
# Verificar que esté habilitado
docker-compose exec api python cli.py scheduler-status

# Logs del scheduler
docker-compose logs api | grep -i scheduler
```

### Database connection refused
```bash
# Verificar que PostgreSQL esté healthy
docker-compose ps db

# Conectar manualmente
docker-compose exec db psql -U restonext
```

---

**RestoNext MX** - Cloud-Native Restaurant Management SaaS 🍽️
