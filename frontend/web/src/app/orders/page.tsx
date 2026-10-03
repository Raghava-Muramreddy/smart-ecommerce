"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  ShoppingBag, 
  CheckCircle,
  Truck,
  RotateCcw,
  Search,
  Filter
} from "lucide-react";
import ordersApi, { Order } from "@/lib/api/orders";
import { useAuthStore } from "@/store/authStore";

const STATUS_FILTERS = [
  { label: "All Orders", value: "" },
  { label: "Pending", value: "PENDING_PAYMENT" },
  { label: "Paid", value: "PAID" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/orders");
      return;
    }

    setLoading(true);
    ordersApi.list({
      status: selectedStatus || undefined,
      page: currentPage,
      page_size: 10,
    })
      .then((data) => {
        // Backend returns array or paginated object
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (data && data.items) {
          setOrders(data.items);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, selectedStatus, currentPage, router]);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SHIPPED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PROCESSING":
      case "PAID":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "PENDING_PAYMENT":
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CANCELLED":
      case "FAILED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-600 mt-1">Track, manage and view history for all your orders</p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-semibold rounded-xl transition-all self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4" /> Shop New Items
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setSelectedStatus(f.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
              selectedStatus === f.value
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-200"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Orders Found</h3>
          <p className="text-sm text-slate-500 mb-6">
            {selectedStatus ? "No orders found matching this filter." : "You haven't placed any orders yet."}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            Start Browsing
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl p-5 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            >
              {/* Order Info */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-indigo-600 text-sm">
                    #{order.order_number}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                      order.order_status
                    )}`}
                  >
                    {order.order_status}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  {order.items?.length || 0} product{(order.items?.length || 0) > 1 ? "s" : ""}:{" "}
                  <span className="text-slate-500">
                    {order.items?.map((it) => it.product_name_snapshot).slice(0, 3).join(", ")}
                    {(order.items?.length || 0) > 3 ? "..." : ""}
                  </span>
                </div>
              </div>

              {/* Price & Action */}
              <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="text-lg font-bold text-slate-900">₹{Number(order.total).toFixed(2)}</p>
                </div>

                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <span>Track & Details</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
