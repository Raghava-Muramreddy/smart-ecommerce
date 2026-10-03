# API Reference Documentation

## 1. Base URL & Protocol Conventions

- **Customer API Gateway**: `http://localhost:8000`
- **Interactive Documentation**:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`
- **Django Admin Portal**: `http://localhost:8000/admin/`
- **Frontend Web Portal**: `http://localhost:3000`

---

## 2. Standard Envelope Format

### Successful Response (`200 OK`, `201 CREATED`)
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {}
}
```

### Error Response (`400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "success": false,
  "message": "Validation error or business logic exception",
  "detail": "Descriptive message"
}
```

---

## 3. Endpoints Catalog

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new customer with password |
| `POST` | `/auth/login` | Public | Authenticate with email/password; returns JWT |
| `POST` | `/auth/social` | Public | Exchange Auth0 / Google OAuth token |
| `POST` | `/auth/refresh` | Public | Rotate expired access token using refresh token |
| `GET` | `/auth/me` | Authenticated | Retrieve authenticated user profile |
| `POST` | `/auth/logout` | Authenticated | Invalidate current session |

### Products & Categories (`/products`, `/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/categories` | Public | List all active product categories |
| `POST` | `/categories` | Staff/Admin | Create new product category |
| `GET` | `/products` | Public | Filterable & sortable paginated product list |
| `GET` | `/products/{id}` | Public | Detailed product view with images |
| `POST` | `/products` | Staff/Admin | Create product listing |
| `PATCH` | `/products/{id}` | Staff/Admin | Update product fields or stock |
| `DELETE` | `/products/{id}` | Admin | Soft-delete product |
| `POST` | `/products/{id}/images`| Staff/Admin | Upload product image file |

### Shopping Cart (`/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/cart` | Customer | Fetch current user's active cart |
| `POST` | `/cart/items` | Customer | Add product to cart with quantity validation |
| `PATCH` | `/cart/items/{id}`| Customer | Update item quantity in cart |
| `DELETE` | `/cart/items/{id}`| Customer | Remove item from cart |
| `DELETE` | `/cart` | Customer | Clear all items from cart |

### Checkout & Orders (`/checkout`, `/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/checkout` | Customer | Create pending order & Stripe Checkout Session |
| `GET` | `/orders` | Customer | List current customer's order history |
| `GET` | `/orders/{id}` | Customer/Staff | Get order breakdown & tracking milestones |
| `PATCH` | `/orders/{id}/status`| Staff/Admin | Progress order status (e.g. SHIPPED) |

### Payments & Webhooks (`/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payments/webhook` | Stripe Only | Idempotent webhook listener for `checkout.session.completed` |

### Notifications & WebSockets (`/notifications`, `/ws`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/notifications` | Customer | List notifications with `?unread_only=` toggle |
| `PATCH` | `/notifications/{id}/read` | Customer | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | Customer | Mark all notifications as read |
| `WS` | `/ws/notifications?token={jwt}` | Customer | Authenticated WebSocket stream |

### Analytics & Reports (`/analytics`, `/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/analytics/dashboard`| Staff/Admin | Real-time sales KPIs & revenue trends |
| `GET` | `/reports/sales` | Staff/Admin | Export filtered sales data (CSV/PDF) |
| `GET` | `/reports/inventory` | Staff/Admin | Export low-stock inventory audit |
