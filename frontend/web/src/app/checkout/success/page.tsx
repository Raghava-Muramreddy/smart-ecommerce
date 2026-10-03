"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  ShoppingBag, 
  Calendar, 
  MapPin, 
  FileText,
  Clock
} from "lucide-react";
import ordersApi, { Order } from "@/lib/api/orders";
import { useCartStore } from "@/store/cartStore";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { fetchCart } = useCartStore();

  useEffect(() => {
    // Refresh cart in store so navbar badge updates
    fetchCart().catch(() => {});

    if (orderId) {
      ordersApi.get(orderId)
        .then((data) => setOrder(data))
        .catch((err) => console.error("Error loading order:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId, fetchCart]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center space-y-4 mb-10">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Order Confirmed!</h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
          Thank you for your purchase. We have received your order and are getting it ready for shipment.
        </p>
      </div>

      {order && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Reference</p>
              <h2 className="text-xl font-bold font-mono text-indigo-600">#{order.order_number}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                {order.order_status}
              </span>
              <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {order.payment_status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-indigo-600" /> Shipping Destination
              </div>
              <p className="text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {order.shipping_address || "Standard Customer Address on File"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-emerald-600" /> Placed On
              </div>
              <p className="text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Items Ordered ({order.items?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">₹{Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total summary */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">₹{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="font-medium text-slate-900">₹{Number(order.shipping_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span className="font-medium text-slate-900">₹{Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 border-t border-slate-200 pt-3">
              <span>Total Paid</span>
              <span className="text-indigo-600">₹{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {order && (
          <Link
            href={`/orders/${order.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Package className="w-4 h-4" /> Track Order Status
          </Link>
        )}
        <Link
          href="/products"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold rounded-xl border border-slate-300 shadow-sm transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>
    </div>
  );
}
