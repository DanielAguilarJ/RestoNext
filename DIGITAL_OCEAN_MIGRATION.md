# DigitalOcean App Platform Migration Guide for RestoNext

## 1. Evaluation: Is DigitalOcean Better?
**Yes, for production readiness.**
- **Pros for RestoNext:**
  - **Path-Based Routing:** You can host both Backend (`/api`) and Frontend (`/`) on the *same* HTTPS domain. **This eliminates CORS issues** and simplifies cookies/auth.
  - **Managed Services:** DO's component system (Database, Redis, Spaces) is tightly integrated and reliable.
  - **Cost Predictability:** Tiered pricing is often clearer than usage-based serverless for high-traffic apps.
  - **Horizontal Scaling:** One-click scaling for your API when traffic grows.

---

## 2. Configuration Strategy (The "Perfect" Setup)
We will configure **one Single "App"** containing 4 components. This keeps everything in a private network (lower latency, higher security).

### Components:
1.  **Database (PostgreSQL)** (Managed)
2.  **Redis** (Managed)
3.  **API Service** (Python/FastAPI) -> Served at `domain.com/api`
4.  **Web Service** (Next.js) -> Served at `domain.com/`

---

## 3. Step-by-Step Implementation

### Step 1: Connect Repository (Current Screen)
1.  **Repository:** `DanielAguilarJ/RestoNext` (Selected)
2.  **Branch:** `main` (Selected)
3.  **Source Directory:** Leave this blank or set to `/` for now (we will override this per service in the next screen).
4.  **Autodeploy:** Checked (Recommended).
5.  **Click Next**.

### Step 2: Configure Resources (The Critical Part)
*DO often attempts to auto-detect. If it detects wrong things, click "Edit" or "Add Resource".*

#### A. Add Backend (API)
Click **Add Resource** -> **Service**.
- **Source Directory:** `apps/api` (CRITICAL)
- **Dockerfile Path:** `Dockerfile` (It will look inside `apps/api`, so just `Dockerfile` is correct).
- **HTTP Request Routes:** `/api` (Crucial for mapping)
- **Name:** `api`

#### B. Add Frontend (Web)
Click **Add Resource** -> **Service**.
- **Source Directory:** `apps/web` (CRITICAL)
- **Dockerfile Path:** `Dockerfile`
- **HTTP Request Routes:** `/` (Root)
- **Name:** `web`

#### C. Add Database
Click **Add Resource** -> **Database**.
- **Engine:** PostgreSQL
- **Name:** `db`
- **Production Mode:** Recommended (for backups/HA). Dev mode is cheaper ($7-12/mo) but no standby.

#### D. Add Redis (Optional but Recommended)
Click **Add Resource** -> **Database**.
- **Engine:** Redis
- **Name:** `redis`

---

### Step 3: Environment Variables
*You can configure these now or after creation.*

#### For `api` Service (Global or Component-level):
| Key | Value | Note |
|-----|-------|------|
| `DATABASE_URL` | `${db.DATABASE_URL}` | Magic variable, select from dropdown |
| `REDIS_URL` | `${redis.rediss_url}` | Note the extra 's' for SSL if required, or simple URL |
| `JWT_SECRET` | *(Your Secret)* | Generate a strong random string |
| `SCHEDULER_ENABLED` | `true` | |
| `POSTGRES_DB` | `restonext` | |

#### For `web` Service:
| Key | Value | Note |
|-----|-------|------|
| `NEXT_PUBLIC_API_URL` | `/api` | **The Magic Trick**: Because they share a domain, use relative path! |
| `NEXT_PUBLIC_WS_URL` | `wss://${APP_URL}/api/ws` | Use system var for domain or hardcode after deploy |

### Step 4: Build Variables (For Next.js)
*Next.js needs specific vars at BUILD time.*
Select the `web` component -> "Build Time Variables":
- `NEXT_PUBLIC_API_URL`: `/api`

---

### Step 5: Review and Launch
1.  Select your **Region** (e.g., NYC or SFO).
2.  Review costs (Plan tiers).
3.  Click **Create Resources**.

### Step 6: Final Polish (After Creation)
1.  **CORS**: Since we are using path-based routing (`domain.com` and `domain.com/api`), you might NOT need strict CORS for the frontend-to-backend communication!
2.  **Health Checks**:
    - API: `/health` (DO usually defaults to TCP, change to HTTP path `/health`).
    - Web: `/` (HTTP).

## Future Proofing
- **Spaces**: Later, adds "Object Storage" for image uploads.
- **CDN**: DO handles this automatically for static assets if configured correctly.
