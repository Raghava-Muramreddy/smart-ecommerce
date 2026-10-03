import React from "react";
import Link from "next/link";
import { ShoppingBag, ShieldCheck, Truck, RefreshCw, Headphones } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600">
      {/* Value Propositions */}
      <div className="border-b border-slate-200/80 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Express Delivery</h4>
                <p className="text-xs text-slate-500">Fast doorstep shipping</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Secure Payments</h4>
                <p className="text-xs text-slate-500">Stripe encrypted & certified</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Easy Returns</h4>
                <p className="text-xs text-slate-500">30-day money back policy</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">24/7 Support</h4>
                <p className="text-xs text-slate-500">Real-time assistance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-slate-900">SmartStore</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enterprise-grade e-commerce ecosystem powered by FastAPI, Django, MySQL 8.0, Next.js 14, and Redis.
            </p>
            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} Smart E-Commerce Platform. All rights reserved.
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Shop Products</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/products" className="hover:text-indigo-600 transition-colors">
                  All Catalog
                </Link>
              </li>
              <li>
                <Link href="/products?category=electronics" className="hover:text-indigo-600 transition-colors">
                  Electronics & Tech
                </Link>
              </li>
              <li>
                <Link href="/products?category=apparel" className="hover:text-indigo-600 transition-colors">
                  Apparel & Clothing
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-indigo-600 transition-colors">
                  My Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Account */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Customer Account</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="hover:text-indigo-600 transition-colors">
                  Customer Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-indigo-600 transition-colors">
                  Register Account
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-indigo-600 transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link href="/notifications" className="hover:text-indigo-600 transition-colors">
                  Notification Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer / Admin Portal */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Portals & APIs</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors font-medium">
                  FastAPI Swagger Docs ↗
                </a>
              </li>
              <li>
                <a href="http://localhost:8000/redoc" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors font-medium">
                  ReDoc API Spec ↗
                </a>
              </li>
              <li>
                <a href="http://localhost:8001/admin/" target="_blank" rel="noreferrer" className="hover:text-amber-600 transition-colors font-semibold text-amber-700">
                  Django Admin Portal ↗
                </a>
              </li>
              <li>
                <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-600 font-mono mt-1 border border-slate-200">
                  MySQL 8.0 • Redis 7.0
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
