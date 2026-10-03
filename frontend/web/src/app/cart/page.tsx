"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  ShoppingBag,
  RefreshCw
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, fetchCart, updateItem, removeItem, clearCart } = useCartStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  const handleQuantityChange = async (itemId: string, currentQty: number, delta: number, maxStock: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      handleRemoveItem(itemId);
      return;
    }
    if (newQty > maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }

    try {
      setUpdatingId(itemId);
      await updateItem(itemId, newQty);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update quantity");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdatingId(itemId);
      await removeItem(itemId);
      toast.success("Item removed from cart");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove item");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = async () => {
    setShowClearConfirm(false);
    try {
      await clearCart();
      toast.success("Cart cleared");
    } catch (err: any) {
      toast.error("Failed to clear cart");
    }
  };

  if (isLoading && !cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading your cart items...</p>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || items.reduce((acc, item) => acc + item.line_total, 0) || 0;
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99;
  const estimatedTax = subtotal * 0.08;
  const total = subtotal + shipping + estimatedTax;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-6 text-slate-400 shadow-md">
          <ShoppingCart className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Cart is Empty</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          You haven't added any products to your shopping bag yet. Explore our catalog and grab what you need!
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" /> Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Shopping Cart</h1>
            <p className="text-sm text-slate-500 mt-1">
              You have {items.length} unique item{items.length > 1 ? "s" : ""} in your cart
            </p>
          </div>
          <button
            onClick={handleClearCart}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Product Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <Link
                      href={`/products/${item.product_id}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                    >
                      {item.product_name}
                    </Link>
                    <p className="text-sm text-indigo-600 font-bold mt-0.5">
                      ₹{Number(item.product_price).toFixed(2)} each
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {item.stock_available > 0 ? (
                        <span className="text-emerald-700">● {item.stock_available} in stock</span>
                      ) : (
                        <span className="text-rose-600">● Out of stock</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quantity Controls & Line Price */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity, -1, item.stock_available)}
                      disabled={updatingId === item.id}
                      className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-bold text-slate-900 min-w-[2rem] text-center">
                      {updatingId === item.id ? "..." : item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity, 1, item.stock_available)}
                      disabled={updatingId === item.id || item.quantity >= item.stock_available}
                      className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[5rem]">
                    <span className="text-base font-bold text-slate-900">
                      ₹{Number(item.line_total).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={updatingId === item.id}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Estimated Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase text-xs">Free</span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-slate-900">₹{estimatedTax.toFixed(2)}</span>
              </div>

              {subtotal < 100 && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
                  Add ₹{(100 - subtotal).toFixed(2)} more to qualify for <strong className="text-indigo-950 font-bold">FREE Express Shipping</strong>!
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 flex justify-between text-base font-extrabold text-slate-900">
                <span>Total</span>
                <span className="text-2xl text-indigo-600">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Guaranteed Safe & Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 mb-2">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Empty your cart?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to remove all items from your cart? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearCart}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition-colors"
              >
                Empty Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
