"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  Bell, 
  CheckCheck, 
  Check, 
  Clock, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  Info,
  ShieldCheck,
  Radio
} from "lucide-react";
import notificationsApi, { Notification } from "@/lib/api/notifications";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/authStore";

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Real-time WebSocket listener
  useWebSocket({
    onMessage: (msg) => {
      if (msg?.type?.includes("NOTIFICATION") || msg?.type?.includes("ORDER")) {
        const newNotif: Notification = {
          id: msg.id || String(Date.now()),
          type: msg.type,
          title: msg.title || "New Notification",
          message: msg.message || "An update occurred on your account.",
          read: false,
          created_at: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotif, ...prev]);
        toast(newNotif.message, { icon: "🔔" });
      }
    },
  });

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.list({ unread_only: unreadOnly });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/notifications");
      return;
    }
    loadNotifications();
  }, [isAuthenticated, unreadOnly, router]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("PAYMENT")) {
      return <CreditCard className="w-5 h-5 text-emerald-600" />;
    } else if (t.includes("ORDER") || t.includes("SHIPPED")) {
      return <Package className="w-5 h-5 text-indigo-600" />;
    } else if (t.includes("ALERT") || t.includes("FAILED")) {
      return <AlertTriangle className="w-5 h-5 text-rose-600" />;
    }
    return <Info className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-600" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">Real-time alerts and updates on your orders and activity</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              unreadOnly
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {unreadOnly ? "Showing Unread Only" : "Show All"}
          </button>

          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-white rounded-2xl border border-slate-200"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center my-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Notifications</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {unreadOnly ? "You have no unread notifications right now." : "You're all caught up! No notifications have arrived yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                notif.read
                  ? "bg-white border-slate-200 text-slate-500 shadow-sm"
                  : "bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {getNotificationIcon(notif.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase font-mono font-bold tracking-wider text-indigo-600">
                      {notif.type.replace(/_/g, " ")}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">{notif.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {!notif.read && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition-colors shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
