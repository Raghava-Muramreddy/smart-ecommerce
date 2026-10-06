"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CreditCard,
  Lock,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  IndianRupee,
} from "lucide-react";
import ordersApi, { Order } from "@/lib/api/orders";
import { useCartStore } from "@/store/cartStore";
import { tokenStorage } from "@/lib/api/client";
import { useAuthStore } from "@/store/authStore";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const { clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!isAuthenticated && !token) {
      toast.error("Please login to proceed with payment");
      router.push("/login?redirect=/checkout");
      return;
    }

    if (!orderId) {
      toast.error("No order ID provided");
      router.push("/cart");
      return;
    }

    ordersApi
      .get(orderId)
      .then((data) => {
        setOrder(data);
        if (data.payment_status === "paid" || data.order_status === "confirmed") {
          toast.success("Order already paid!");
          router.push(`/checkout/success?order_id=${orderId}`);
        }
      })
      .catch((err) => {
        console.error("Error fetching order:", err);
        toast.error("Failed to load order details");
      })
      .finally(() => setLoading(false));
  }, [orderId, isAuthenticated, router]);

  // Card brand detection
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s+/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (/^5[1-5]/.test(clean)) return "MASTERCARD";
    if (/^3[47]/.test(clean)) return "AMEX";
    if (/^6(?:011|5)/.test(clean)) return "DISCOVER";
    return "CARD";
  }, [cardNumber]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 16);
    let formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCvv(value);
  };

  const fillDemoCard = () => {
    setCardNumber("4242 4242 4242 4242");
    setCardHolder(user?.name || "John Customer");
    setExpiry("12/28");
    setCvv("321");
    toast.success("Demo test card details filled! ✨");
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    const rawNumber = cardNumber.replace(/\s+/g, "");
    if (rawNumber.length < 15) {
      toast.error("Please enter a valid 16-digit card number");
      return;
    }
    if (!cardHolder.trim()) {
      toast.error("Please enter cardholder name");
      return;
    }
    if (expiry.length < 5) {
      toast.error("Please enter expiry in MM/YY format");
      return;
    }
    if (cvv.length < 3) {
      toast.error("Please enter a valid 3-4 digit CVV");
      return;
    }

    try {
      setSubmitting(true);
      await ordersApi.confirmPayment(orderId);
      await clearCart();
      toast.success("Payment processed successfully! 🎉");
      router.push(`/checkout/success?order_id=${orderId}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Payment processing failed";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading secure payment portal...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <p className="text-slate-500 text-sm mb-6">We could not retrieve details for this order.</p>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Payment</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Payment Card & Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Visual Realistic Credit Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 text-white p-7 sm:p-8 shadow-2xl shadow-indigo-900/30 border border-indigo-700/30">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner flex items-center justify-center border border-amber-300">
                    <div className="w-8 h-5 border border-amber-600/30 rounded flex items-center justify-around px-0.5">
                      <div className="w-2 h-full border-r border-amber-600/30" />
                      <div className="w-2 h-full" />
                    </div>
                  </div>
                  <span className="text-[10px] tracking-wider text-slate-400 font-mono">EMV CHIP</span>
                </div>
                <div className="font-extrabold text-lg sm:text-xl tracking-wider text-indigo-300 font-mono">
                  {cardBrand}
                </div>
              </div>

              {/* Card Number display */}
              <div className="mb-6 relative z-10">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Card Number</p>
                <p className="text-xl sm:text-2xl font-mono tracking-widest text-white drop-shadow">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>
              </div>

              {/* Card Footer info */}
              <div className="flex items-center justify-between relative z-10 text-xs sm:text-sm">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-slate-400">Cardholder</p>
                  <p className="font-semibold tracking-wider uppercase text-white truncate max-w-[200px]">
                    {cardHolder || (user?.name || "CARDHOLDER NAME")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest text-slate-400">Expires</p>
                  <p className="font-mono font-semibold text-white">{expiry || "MM/YY"}</p>
                </div>
              </div>
            </div>

            {/* Payment Details Form Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Card Information</h2>
                  <p className="text-xs text-slate-500">Enter your debit or credit card details below</p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Fill Test Card
                </button>
              </div>

              <form onSubmit={handlePayment} className="space-y-4">
                {/* Cardholder name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Customer"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                  />
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      CVV / CVC
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="321"
                        maxLength={4}
                        value={cvv}
                        onChange={handleCvvChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{Number(order.total).toFixed(2)} Securely</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your card information is securely transmitted using end-to-end encryption.</span>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Reference</p>
                <h3 className="text-lg font-bold font-mono text-indigo-600">#{order.order_number}</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                Pending Payment
              </span>
            </div>

            {/* Cart Items in this order */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{item.product_name_snapshot}</p>
                      <p className="text-[11px] text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      ₹{Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost breakdown */}
            <div className="space-y-2.5 text-sm border-t border-slate-100 pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>
                  {order.shipping_cost === 0 ? (
                    <span className="text-emerald-700 font-bold text-xs uppercase">Free</span>
                  ) : (
                    `₹${Number(order.shipping_cost).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (GST 8%)</span>
                <span className="font-bold text-slate-900">₹{Number(order.tax).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total Amount</span>
                <span className="text-2xl text-indigo-600">₹{Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1.5">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Instant Order Fulfillment
              </p>
              <p className="text-[11px]">
                Upon payment confirmation, your order will be automatically booked and stock reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
