# RestoNext MX

Cloud-Native, All-in-One Restaurant Management SaaS for the Mexican market.

## Quick Start

```bash
# Start all services
docker-compose up --build

# Access:
# - Web: http://localhost:3000
# - API Docs: http://localhost:8000/docs
```

## Project Structure

```
restonext-mx/
├── apps/
│   ├── web/          # Next.js 14+ Frontend
│   └── api/          # FastAPI Backend
├── packages/
│   └── shared/       # Shared TypeScript types
└── docker-compose.yml
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy Async
- **Database**: PostgreSQL 16 with JSONB
- **Real-time**: WebSockets + Redis
- **AI**: Facebook Prophet for demand forecasting
