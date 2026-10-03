# System Architecture Documentation

## 1. Overview & High-Level Architecture

The **Smart E-Commerce Platform** is structured as an enterprise-grade, high-throughput monorepo architecture separating customer-facing high-concurrency workloads from internal administrative and operational workflows.

```mermaid
graph TD
    Client["Next.js Web Client<br/>(React 18 / TypeScript / Tailwind)"]
    AdminUser["Admin / Staff User<br/>(Browser)"]
    
    subgraph "Edge / Ingress"
        CORS["CORS & Rate Limiter Middleware"]
        SSL["SSL / TLS Termination"]
    end
    
    subgraph "Backend Tier"
        FastAPI["FastAPI Customer API<br/>(Asynchronous ASGI / Python 3.11)"]
        Django["Django Operations Portal<br/>(WSGI / Django Admin / DRF)"]
        WS["WebSocket Notification Gateway<br/>(Real-Time Connection Manager)"]
    end
    
    subgraph "Data & Messaging Tier"
        MySQL[("MySQL 8.0 Database<br/>(Normalized Schema / InnoDB / Row Locks)")]
        Redis[("Redis 7.0<br/>(Cache & Pub/Sub Gateway)")]
    end
    
    subgraph "External Integrations"
        Stripe["Stripe Payments & Webhooks"]
        Auth0["Auth0 Social Identity Provider"]
        SMTP["Email Gateway (SMTP / Console)"]
    end
    
    Client --> CORS --> FastAPI
    Client -.-> WS
    AdminUser --> Django
    
    FastAPI --> MySQL
    FastAPI --> Redis
    Django --> MySQL
    Django --> Redis
    WS --> Redis
    
    FastAPI --> Stripe
    FastAPI --> Auth0
    FastAPI --> SMTP
```

---

## 2. Responsibilities Separation

### Customer API Tier: FastAPI (Python 3.11 ASGI)
- **High Concurrency & Async I/O**: Asynchronous SQLAlchemy 2.0 with `aiomysql`.
- **Customer Endpoints**: Authentication, catalog search, multi-factor filtering, cart synchronization, transactional checkout, Stripe integration.
- **Real-Time Push Notifications**: WebSocket manager with heartbeat ping/pong, connection lifetime management, and per-user subscription channels.

### Administration & Operations Tier: Django (Python 3.11)
- **Django Admin Portal**: Comprehensive administrative data management (Users, Roles, Inventory, Products, Categories, Orders, Audit Logs).
- **Executive Analytics Dashboard**: Real-time sales metrics, revenue curves, top products, payment distribution calculated directly via database aggregation.
- **Operational Reporting**: Filterable CSV and PDF exports for sales, orders, and inventory audits.

---

## 3. Real-Time WebSocket Event Routing

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Next.js)
    participant WS as WebSocket Gateway (/ws/notifications)
    participant API as FastAPI Backend
    participant DB as MySQL DB
    participant Stripe as Stripe Webhook

    Customer->>WS: Connect with JWT Bearer Token
    WS->>WS: Authenticate user & register channel
    Note over Customer,WS: Connection Active & Listening
    
    Stripe->>API: POST /payments/webhook (checkout.session.completed)
    API->>API: Verify cryptographic signature & idempotency
    API->>DB: Update Order Status -> PAID, Decrement Stock
    API->>Customer: Email order receipt
    API->>WS: Broadcast ORDER_STATUS_UPDATED (orderId, PAID)
    WS-->>Customer: Real-time update packet
    Note over Customer: UI updates badge & delivery progress instantly!
```

---

## 4. Payment Flow & Transaction Boundaries

1. **Initiation**: Customer submits checkout request with destination address.
2. **Server-Side Validation**: Stock availability is checked and server-side pricing/taxes/shipping are computed (preventing client-side tampering).
3. **Session Creation**: Order is inserted with status `PENDING_PAYMENT` and Stripe Checkout Session is initialized.
4. **Fulfillment**: Upon customer payment, Stripe dispatches a cryptographically signed webhook to `/payments/webhook`.
5. **Idempotent Completion**: The webhook verifies the signature, verifies `stripe_event_id` against previously completed payments, locks rows with database transactions (`SELECT ... FOR UPDATE`), decrements inventory, and dispatches WebSocket + email notifications.
