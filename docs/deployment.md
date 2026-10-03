# Deployment & Operations Guide

## 1. Quick Start with Docker Compose

The simplest way to orchestrate the full stack (MySQL, Redis, FastAPI, Django, Next.js) is using Docker Compose:

```bash
# 1. Clone and enter directory
cd smart-eCommerce-system

# 2. Configure environment file
cp .env.example .env

# 3. Spin up all containers in the background
docker-compose up -d --build

# 4. Apply database migrations
docker-compose exec fastapi alembic upgrade head
docker-compose exec django python manage.py migrate

# 5. Seed initial categories, demo products & admin account
docker-compose exec fastapi python -m scripts.seed_db
```

### Services Map
| Service | Internal Port | Host Port | URL / Notes |
|---|---|---|---|
| **MySQL 8.0** | 3306 | 3306 | Primary relational database |
| **Redis 7.0** | 6379 | 6379 | Cache & Pub/Sub broker |
| **FastAPI Backend** | 8000 | 8000 | `http://localhost:8000` (Swagger at `/docs`) |
| **Django Admin** | 8001 | 8001 | `http://localhost:8001/admin/` |
| **Next.js Web** | 3000 | 3000 | `http://localhost:3000` |

---

## 2. Local Manual Setup (Without Docker)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MySQL 8.0 running locally on port 3306
- Redis running locally on port 6379

### Database Initialization
```sql
CREATE DATABASE smart_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON smart_ecommerce.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

### 1. FastAPI Customer API
```bash
cd backend/fastapi
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run migrations & start server
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Django Operations & Admin
```bash
cd backend/django
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Migrate and run
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8001
```

### 3. Next.js Web Frontend
```bash
cd frontend/web
npm install
npm run dev
# Browse http://localhost:3000
```

---

## 3. Production Readiness Checklist

1. **Secrets**: Set strong, randomly generated keys for `JWT_SECRET_KEY`, `DJANGO_SECRET_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
2. **Database**: Enforce connection pooling (`pool_size=20`, `max_overflow=10`) and SSL connections.
3. **CORS**: Configure `CORS_ORIGINS` to point exclusively to the production domain.
4. **Reverse Proxy**: Place Nginx, Caddy, or AWS ALB in front of services to handle SSL/TLS termination and rate-limiting.
5. **Static Assets**: Configure S3/Cloudflare R2 or CDN storage for product uploads in `UPLOAD_DIR`.
