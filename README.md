# 🛒 Smart E-Commerce Platform

A production-ready, full-stack, enterprise-grade e-commerce platform built with **FastAPI**, **Django Admin**, **Next.js 14**, **MySQL 8.0**, **Redis**, **Stripe**, and **Auth0**.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14 Web)                       │
│             React 18 • TypeScript • TailwindCSS • Zustand              │
│       Pages: Catalog, Cart, Checkout, Order Tracking, Notifications   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP (REST) / WebSocket (WSS)
               ┌─────────────────────┴─────────────────────┐
               │                                           │
        ┌──────▼───────┐                            ┌──────▼───────┐
        │   FastAPI    │                            │    Django    │
        │  (Customer)  │                            │   (Admin)    │
        │  Port: 8000  │                            │  Port: 8001  │
        └──────┬───────┘                            └──────┬───────┘
               │                                           │
               ├─────────────────────┬─────────────────────┤
               │                     │                     │
    ┌──────────▼──────────┐ ┌────────▼──────────┐ ┌────────▼──────────┐
    │     MySQL 8.0 DB    │ │      Redis 7      │ │  Stripe / Auth0   │
    │  Normalized Schema  │ │   Cache & PubSub  │ │  Payment & OAuth  │
    │     Port: 3306      │ │     Port: 6379    │ │    Webhooks       │
    └─────────────────────┘ └───────────────────┘ └───────────────────┘
```

### Monorepo Structure
```text
smart-ecommerce/
├── backend/
│   ├── fastapi/            # Asynchronous Customer API & WebSockets
│   │   ├── app/            # Core, Auth, Products, Cart, Orders, Payments, WS
│   │   ├── tests/          # Pytest suite (Auth, Products, Cart, Orders, Payments)
│   │   ├── alembic/        # Async MySQL migrations
│   │   └── requirements.txt
│   └── django/             # Operational Administration & Reporting
│       ├── apps/           # Users, Products, Orders, Analytics, Reports
│       ├── config/         # Django settings, WSGI, URLs
│       ├── manage.py
│       └── requirements.txt
├── frontend/
│   └── web/                # Next.js 14 App Router, Zustand, Tailwind
│       ├── src/app/        # Catalog, Cart, Checkout, Tracking, Notifications
│       ├── src/components/ # Navbar, Footer, UI Cards
│       └── src/lib/api/    # Axios client, auth, products, orders, cart
├── docs/                   # Architecture, Database, API, Security, Deployment
├── postman/                # Complete Postman Collection
├── docker-compose.yml      # Multi-container orchestration
└── README.md
```

---

## 🚀 Quick Start with Docker

The fastest way to spin up the entire platform is with Docker Compose:

```bash
# 1. Copy root environment variables
cp .env.example .env

# 2. Start all services (MySQL, Redis, FastAPI, Django, Next.js)
docker-compose up --build -d

# 3. Apply database migrations
docker-compose exec fastapi alembic upgrade head
docker-compose exec django python manage.py migrate

# 4. Seed demo catalog & admin user
docker-compose exec fastapi python -m scripts.seed_db
```

### Accessing Running Services
| Component | URL | Credentials / Notes |
|---|---|---|
| **Web Storefront** | [http://localhost:3000](http://localhost:3000) | Customer portal |
| **FastAPI Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API explorer |
| **FastAPI ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | OpenAPI specification |
| **Django Admin** | [http://localhost:8001/admin/](http://localhost:8001/admin/) | `admin@smartecommerce.com` / `AdminPass123!` |
| **MySQL DB** | `localhost:3306` | `appuser` / `apppassword` (DB: `smart_ecommerce`) |
| **Redis** | `localhost:6379` | Cache & PubSub |

---

## 💻 Manual Local Development (Without Docker)

### 1. Database (MySQL 8.0)
Ensure MySQL is running on `localhost:3306`:
```sql
CREATE DATABASE smart_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON smart_ecommerce.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

### 2. FastAPI Backend
```bash
cd backend/fastapi
python -m venv venv
# On Windows: venv\Scripts\activate | On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Django Admin Backend
```bash
cd backend/django
python -m venv venv
# On Windows: venv\Scripts\activate | On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Run migrations & create admin superuser
python manage.py migrate
python manage.py createsuperuser

# Start Django server
python manage.py runserver 0.0.0.0:8001
```

### 4. Next.js Web Frontend
```bash
cd frontend/web
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 💳 Stripe Payments Setup

1. Sign up for a free developer account at [stripe.com](https://stripe.com).
2. Obtain your **Test Secret Key** (`sk_test_...`) and **Publishable Key** (`pk_test_...`).
3. Set them in `backend/fastapi/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. For local webhook forwarding, install the Stripe CLI and execute:
   ```bash
   stripe listen --forward-to localhost:8000/payments/webhook
   ```
5. Use test card numbers such as `4242 4242 4242 4242` with any future date and CVC `123`.

---

## 🔐 Auth0 Social Authentication Setup

1. Create a tenant in the [Auth0 Dashboard](https://manage.auth0.com).
2. Create a Regular Web Application and enable Google and/or Facebook connections.
3. Add allowed callback URLs:
   ```text
   http://localhost:3000/auth/callback
   http://localhost:8000/auth/social
   ```
4. Populate credentials in `backend/fastapi/.env`:
   ```env
   AUTH0_DOMAIN=your-tenant.us.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
   ```

---

## 📧 Email Notifications Setup

By default in development, `EMAIL_BACKEND=console` is active, printing formatted email confirmations directly to the application logs.

To connect a live SMTP relay (e.g. SendGrid, Mailgun, Amazon SES, or Gmail):
```env
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM=orders@yourdomain.com
```

---

## 🧪 Comprehensive Automated Test Suites

```bash
# Run all FastAPI backend tests (SQLite in-memory, no external DB needed)
cd backend/fastapi
pytest -v

# Run individual test modules:
pytest tests/test_auth.py -v         # Registration, Login, Token Refresh, Social Auth
pytest tests/test_products.py -v     # Products, Categories, Stock, RBAC
pytest tests/test_cart.py -v         # Cart line totals, Quantity changes, Stock checks
pytest tests/test_orders.py -v       # Taxes, Shipping, Stripe checkout session
pytest tests/test_payments.py -v     # Webhooks, Idempotency, Inventory decrements
pytest tests/test_notifications.py -v# Real-time alerts & Read status

# Run Django Admin test suite
cd ../django
python manage.py test
```

---

## 📮 Postman Collection

Import `postman/smart_ecommerce_collection.json` into Postman to immediately test every API endpoint. Environment variables like `{{base_url}}`, `{{access_token}}`, and IDs are pre-configured with automated test scripts that capture tokens on login.

---

## 📖 In-Depth Technical Documentation

- [System Architecture](docs/architecture.md)
- [Database Schema & ERD](docs/database.md)
- [API Reference Guide](docs/api.md)
- [Security & Compliance](docs/security.md)
- [Deployment & Operations](docs/deployment.md)
- [Testing Strategy](docs/testing.md)

---

## 🛡️ License

This project is licensed under the MIT License.
