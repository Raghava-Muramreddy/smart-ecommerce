# Testing Strategy & Execution Guide

## 1. Testing Philosophy

The platform embraces a comprehensive testing pyramid ensuring reliability, zero data leakage, and correctness across financial and inventory operations:

1. **Unit Tests**: Test password hashing, token validation, price calculations, tax computation, and stock validations in isolation.
2. **Integration Tests**: Verify full request/response lifecycles, database persistence, and API contracts.
3. **Payment & Webhook Tests**: Test Stripe session creation, webhook signature checking, idempotency guards, and automatic inventory decrements.
4. **Permission & RBAC Tests**: Verify strict role isolation (`customer != staff != admin`).

---

## 2. Test Execution Commands

### Running Backend FastAPI Tests
FastAPI tests use `pytest` and `pytest-asyncio` with an in-memory SQLite database, requiring no external dependencies to run:

```bash
cd backend/fastapi
pytest -v
```

To run a specific test suite:
```bash
# Auth tests
pytest tests/test_auth.py -v

# Products & Category tests
pytest tests/test_products.py -v

# Cart calculation tests
pytest tests/test_cart.py -v

# Orders & Checkout tests
pytest tests/test_orders.py -v

# Payment & Webhook tests
pytest tests/test_payments.py -v

# Notifications tests
pytest tests/test_notifications.py -v
```

### Running Django Admin Tests
```bash
cd backend/django
python manage.py test
```

### Running Frontend Tests
```bash
cd frontend/web
npm test
```

---

## 3. End-to-End Automated Verification Flow

The end-to-end customer journey is verified without manual database intervention:

```text
1. Register Customer -> POST /auth/register
2. Authenticate -> POST /auth/login (stores access_token)
3. Browse Catalog -> GET /products?in_stock=true
4. Add to Cart -> POST /cart/items (verifies server-side stock check)
5. Initiate Checkout -> POST /checkout (validates taxes, shipping, pending order creation)
6. Simulate Stripe Webhook -> POST /payments/webhook (checkout.session.completed)
7. Stock Decrement -> Product stock decreases atomically via row lock
8. Live Notification -> Dispatched via WebSocket & saved to notifications table
9. Verify Tracking -> GET /orders/{id} displays order in PAID state
```
