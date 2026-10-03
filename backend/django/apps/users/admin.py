"""
Django Admin configuration — Professional admin interface for Smart E-Commerce.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Count
from django.http import HttpResponse
from import_export import resources
from import_export.admin import ExportMixin
import csv

from apps.users.models import (
    User, Category, Product, ProductImage,
    Order, OrderItem, Payment, Notification, AuditLog
)


# ─── Site Customization ───────────────────────────────────────────────────────

admin.site.site_header = "🛒 Smart E-Commerce Admin"
admin.site.site_title = "Smart E-Commerce"
admin.site.index_title = "Administration Dashboard"


# ─── Users ────────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "role_badge", "is_active", "is_verified", "auth_provider", "created_at"]
    list_filter = ["role", "is_active", "is_verified", "auth_provider"]
    search_fields = ["name", "email"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login_at", "password_hash", "provider_user_id"]
    list_per_page = 25
    ordering = ["-created_at"]
    fieldsets = (
        ("Identity", {"fields": ("id", "name", "email")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_verified")}),
        ("Authentication", {"fields": ("auth_provider", "provider_user_id", "password_hash")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login_at"), "classes": ("collapse",)}),
    )
    actions = ["activate_users", "deactivate_users"]

    @admin.display(description="Role")
    def role_badge(self, obj):
        colors = {"admin": "red", "staff": "orange", "customer": "green"}
        color = colors.get(obj.role, "gray")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.role.upper()
        )

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} users activated.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} users deactivated.")


# ─── Categories ───────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "product_count", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug"]
    readonly_fields = ["id", "created_at", "updated_at", "slug"]

    @admin.display(description="Products")
    def product_count(self, obj):
        return Product.objects.filter(category=obj, is_active=True).count()


from django import forms

class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = '__all__'

    def _post_clean(self):
        super()._post_clean()
        # Clear errors that happen on hidden/readonly fields
        if hasattr(self, '_errors') and self._errors:
            self._errors.pop('__all__', None)
            self._errors.pop('slug', None)
            self._errors.pop('sku', None)
            self._errors.pop('category', None)

class ProductImageForm(forms.ModelForm):
    class Meta:
        model = ProductImage
        fields = '__all__'

    def _post_clean(self):
        super()._post_clean()
        if hasattr(self, '_errors'):
            self._errors.clear()

# ─── Products ─────────────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    form = ProductImageForm
    extra = 0
    readonly_fields = ["id", "created_at", "image_preview"]
    fields = ["image_preview", "url", "filename", "is_primary", "sort_order"]

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj.url:
            return format_html('<img src="{}" style="height:50px;border-radius:4px">', obj.url)
        return "—"


@admin.register(Product)
class ProductAdmin(ExportMixin, admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ["name", "sku", "category", "price_display", "stock_badge", "is_active", "view_count", "created_at"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "sku", "description"]
    readonly_fields = ["id", "slug", "sku", "view_count", "created_at", "updated_at"]
    list_editable = ["is_active"]
    list_per_page = 25
    inlines = [ProductImageInline]
    ordering = ["-created_at"]
    actions = ["activate_products", "deactivate_products"]
    fieldsets = (
        ("Basic Info", {"fields": ("id", "name", "slug", "sku", "category", "description")}),
        ("Pricing & Stock", {"fields": ("price", "stock", "is_active")}),
        ("Metadata", {"fields": ("view_count", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.action(description="Activate selected products")
    def activate_products(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} products activated.")

    @admin.action(description="Deactivate selected products")
    def deactivate_products(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} products deactivated.")

    def save_model(self, request, obj, form, change):
        from django.utils.text import slugify
        import uuid
        
        if not obj.sku:
            obj.sku = "PRD-" + uuid.uuid4().hex[:8].upper()
            
        if not obj.slug:
            base_slug = slugify(obj.name)
            obj.slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
            
        super().save_model(request, obj, form, change)

    @admin.display(description="Price")
    def price_display(self, obj):
        return f"${obj.price:.2f}"

    @admin.display(description="Stock")
    def stock_badge(self, obj):
        color = "red" if obj.stock < 10 else ("orange" if obj.stock < 20 else "green")
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>', color, obj.stock
        )


# ─── Orders ───────────────────────────────────────────────────────────────────

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["id", "product", "product_name_snapshot", "product_sku_snapshot", "unit_price", "quantity", "subtotal"]
    can_delete = False


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ["id", "amount", "currency", "status", "transaction_id", "stripe_payment_intent_id", "created_at"]
    can_delete = False


VALID_TRANSITIONS = {
    "confirmed": ["processing", "cancelled"],
    "processing": ["shipped", "cancelled"],
    "shipped": ["out_for_delivery"],
    "out_for_delivery": ["delivered"],
}


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number", "user_link", "total_display",
        "order_status_badge", "payment_status_badge", "created_at"
    ]
    list_filter = ["order_status", "payment_status", "created_at"]
    search_fields = ["order_number", "user__email", "user__name"]
    readonly_fields = [
        "id", "order_number", "user", "subtotal", "tax", "shipping_cost",
        "discount", "total", "payment_status", "stripe_session_id",
        "created_at", "updated_at"
    ]
    inlines = [OrderItemInline, PaymentInline]
    list_per_page = 25
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    fieldsets = (
        ("Order Info", {"fields": ("id", "order_number", "user", "shipping_address", "notes")}),
        ("Financials", {"fields": ("subtotal", "tax", "shipping_cost", "discount", "total")}),
        ("Status", {"fields": ("order_status", "payment_status")}),
        ("Stripe", {"fields": ("stripe_session_id",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Customer")
    def user_link(self, obj):
        return format_html('<a href="/admin/users/user/{}/change/">{}</a>', obj.user_id, obj.user.email)

    @admin.display(description="Total")
    def total_display(self, obj):
        return f"${obj.total:.2f}"

    @admin.display(description="Order Status")
    def order_status_badge(self, obj):
        colors = {
            "pending_payment": "#f59e0b",
            "confirmed": "#3b82f6",
            "processing": "#8b5cf6",
            "shipped": "#0891b2",
            "out_for_delivery": "#f97316",
            "delivered": "#22c55e",
            "cancelled": "#ef4444",
            "failed": "#dc2626",
        }
        color = colors.get(obj.order_status, "#6b7280")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px;font-size:11px">{}</span>',
            color, obj.order_status.replace("_", " ").title()
        )

    @admin.display(description="Payment")
    def payment_status_badge(self, obj):
        colors = {"success": "green", "failed": "red", "pending": "orange", "cancelled": "gray"}
        color = colors.get(obj.payment_status, "gray")
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>', color, obj.payment_status.upper()
        )

    def get_readonly_fields(self, request, obj=None):
        fields = list(self.readonly_fields)
        if obj and obj.order_status in ("delivered", "cancelled", "failed"):
            fields.append("order_status")
        return fields


# ─── Notifications ────────────────────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "type", "read", "created_at"]
    list_filter = ["type", "read", "created_at"]
    search_fields = ["title", "message", "user__email"]
    readonly_fields = ["id", "user", "type", "title", "message", "read", "created_at"]

    def has_add_permission(self, request):
        return False


# ─── Audit Logs ───────────────────────────────────────────────────────────────

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "entity", "entity_id", "user", "ip_address", "created_at"]
    readonly_fields = ["id", "user", "action", "entity", "entity_id", "ip_address", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
