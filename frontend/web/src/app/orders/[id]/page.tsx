"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShoppingBag, 
  CreditCard,
  AlertCircle,
  Radio
} from "lucide-react";
import ordersApi, { Order } from "@/lib/api/orders";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/authStore";

const TRACKING_STEPS = [
  { key: "PENDING_PAYMENT", label: "Order Placed", desc: "Awaiting payment verification" },
  { key: "PROCESSING", label: "Processing", desc: "Preparing items for dispatch" },
  { key: "SHIPPED", label: "Shipped", desc: "Package handed over to carrier" },
  { key: "DELIVERED", label: "Delivered", desc: "Delivered to destination" },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveUpdated, setLiveUpdated] = useState(false);

  // Hook into WebSocket for real-time order updates
  useWebSocket({
    onMessage: (msg) => {
      if (
        (msg?.type === "ORDER_STATUS_UPDATED" || msg?.type === "ORDER_UPDATE") &&
        (msg?.order_id === id || msg?.orderId === id)
      ) {
        toast.success(`Live Update: Order status changed to ${msg.status || msg.order_status}!`, {
          icon: "🚀",
        });
        setLiveUpdated(true);
        // Refresh order data
        ordersApi.get(id).then((data) => setOrder(data)).catch(() => {});
        setTimeout(() => setLiveUpdated(false), 3000);
      }
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/orders/${id}`);
      return;
    }

    if (!id) return;
    setLoading(true);
    ordersApi.get(id)
      .then((data) => setOrder(data))
      .catch((err) => {
        console.error("Failed to load order:", err);
        toast.error("Could not find requested order");
      })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, router]);

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const sequence = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
    
    // Normalizing PAID to PROCESSING index
    let currentIdx = sequence.indexOf(currentStatus.toUpperCase());
    if (currentIdx === 1) currentIdx = 2; // Treat PAID as step 2

    let stepIdx = sequence.indexOf(stepKey.toUpperCase());
    if (stepIdx === 1) stepIdx = 2;

    if (currentStatus === "CANCELLED" || currentStatus === "FAILED") {
      return "failed";
    }

    if (currentIdx >= stepIdx) {
      return currentIdx === stepIdx ? "current" : "completed";
    }
    return "pending";
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto mb-6"></div>
        <div className="h-48 bg-white rounded-3xl border border-slate-200 mb-8"></div>
        <div className="h-64 bg-white rounded-3xl border border-slate-200"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <p className="text-slate-600 mb-6">We couldn't retrieve the details for order #{id}.</p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Orders
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <span>Order #{order.order_number}</span>
            {liveUpdated && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 animate-pulse flex items-center gap-1 font-mono">
                <Radio className="w-3 h-3 text-cyan-600 animate-ping" /> LIVE UPDATE
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
            Order: {order.order_status}
          </span>
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            Payment: {order.payment_status}
          </span>
        </div>
      </div>

      {/* Visual Tracking Stepper */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Delivery Progress</h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
          {TRACKING_STEPS.map((step, idx) => {
            const status = getStepStatus(step.key, order.order_status);
            const isCompleted = status === "completed";
            const isCurrent = status === "current";

            return (
              <div key={step.key} className="flex flex-col items-center sm:items-start text-center sm:text-left relative">
                {/* Step Icon Indicator */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold mb-3 transition-all ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : isCurrent
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse shadow-md shadow-indigo-600/30"
                      : "bg-slate-100 border border-slate-200 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span className="text-sm">{idx + 1}</span>
                  )}
                </div>

                <h4 className={`text-sm font-semibold ${isCompleted || isCurrent ? "text-slate-900" : "text-slate-500"}`}>
                  {step.label}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[180px]">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Ordered Items Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
            Ordered Items ({order.items?.length || 0})
          </h3>

          <div className="space-y-3">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{item.product_name_snapshot}</h4>
                    <p className="text-xs text-slate-500">
                      ₹{Number(item.unit_price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">₹{Number(item.subtotal).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">₹{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee</span>
              <span className="font-medium text-slate-900">₹{Number(order.shipping_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes</span>
              <span className="font-medium text-slate-900">₹{Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-3">
              <span>Total Paid</span>
              <span className="text-xl text-indigo-600">₹{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right: Shipping & Delivery Info */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Shipping Destination</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {order.shipping_address || "Standard Address"}
            </p>
            {order.notes && (
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-1">Customer Note:</p>
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">"{order.notes}"</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Tracking</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This page stays connected to our WebSocket gateway to automatically refresh whenever your parcel changes status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
