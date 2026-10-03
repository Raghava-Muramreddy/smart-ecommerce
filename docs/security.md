# Security & Compliance Specification

## 1. Authentication & Token Management

- **Password Hashing**: Passwords are never stored in plain text. Hashing is performed using `bcrypt` / `argon2` with salt rounds adhering to OWASP recommendations.
- **JWT Signature**: Tokens are signed using HMAC-SHA256 (`HS256`) with a cryptographically secure 256-bit secret key stored in environment variables.
- **Token Expiry**:
  - `access_token`: Short-lived (30 minutes) to minimize impact of compromised tokens.
  - `refresh_token`: Long-lived (7 days) with token rotation on refresh to invalidate previous sessions.
- **Social Auth (Auth0 / OAuth2)**: Validates incoming tokens against the Auth0 JWKS endpoint or Google OAuth verification endpoint, verifying issuer, audience, and signature before mapping to the internal `users` record.

---

## 2. Role-Based Access Control (RBAC)

The platform enforces three strict access tiers:

| Capability | Customer | Staff | Admin |
|---|:---:|:---:|:---:|
| Browse active catalog & categories | ✅ | ✅ | ✅ |
| Manage own shopping cart & checkout | ✅ | ❌ | ❌ |
| View own order history & live tracking | ✅ | ✅ (All) | ✅ (All) |
| Create / Update product listings & inventory | ❌ | ✅ | ✅ |
| Change order delivery status | ❌ | ✅ | ✅ |
| View operational analytics & KPIs | ❌ | ✅ | ✅ |
| Export sales / audit reports (CSV/PDF) | ❌ | ✅ | ✅ |
| Manage staff roles & permissions | ❌ | ❌ | ✅ |
| Deactivate / purge customer accounts | ❌ | ❌ | ✅ |

FastAPI uses declarative dependency injection (`Depends(require_role(["admin", "staff"]))`) to enforce permissions at the route handler level before controller logic executes.

---

## 3. Defense-in-Depth Mechanisms

### SQL Injection Prevention
- All database queries are executed through SQLAlchemy 2.0 and Django ORM using parameterized statements.
- String concatenation into SQL queries is strictly prohibited.

### Cross-Site Scripting (XSS) & Content Security
- React / Next.js auto-escapes rendered variables by default.
- HTTP security headers are injected:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Cross-Origin Resource Sharing (CORS)
- Allowed origins are explicitly whitelisted via `CORS_ORIGINS` in `.env` (e.g. `http://localhost:3000`).
- Wildcards (`*`) with credentials enabled are forbidden in production.

### Stripe Webhook Verification & Idempotency
- Incoming Stripe webhooks are verified against `STRIPE_WEBHOOK_SECRET` using `stripe.Webhook.construct_event(payload, sig_header, secret)`.
- Replay attacks are mitigated by validating the event timestamp and checking `stripe_event_id` against the database to guarantee idempotency.

### Secure File Uploads
- Product image uploads enforce strict whitelist verification:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
  - Max file size limit: 5MB.
  - Random UUID filenames generated server-side to prevent directory traversal attacks.

---

## 4. Audit Logging & Compliance

All administrative actions (inventory modifications, price changes, role reassignments, order status transitions) trigger asynchronous records in the `audit_logs` table:

```json
{
  "user_id": "usr_948a...",
  "action": "PRODUCT_PRICE_UPDATED",
  "entity": "Product",
  "entity_id": "prod_128b...",
  "old_value": "{\"price\": 129.99}",
  "new_value": "{\"price\": 99.99}",
  "timestamp": "2026-10-02T22:20:00Z",
  "ip_address": "192.168.1.50"
}
```
