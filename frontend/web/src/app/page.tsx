"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  ShoppingCart, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Truck, 
  Star,
  CheckCircle2,
  Package
} from "lucide-react";
import productsApi, { Product } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const { addItem } = useCartStore();

  useEffect(() => {
    productsApi.list({ page_size: 8, sort: "newest" })
      .then((data) => {
        setProducts(data.items || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setAddingId(product.id);
      await addItem(product.id, 1);
      toast.success(`Added "${product.name}" to cart! 🛒`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setAddingId(product.id);
      await addItem(product.id, 1);
      router.push("/checkout");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to proceed to checkout");
      setAddingId(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-cyan-50/30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Next-Generation Intelligent Commerce</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Shop the Future of{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Smart Products
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Explore curated electronics, premium apparel, and trending essentials with instant checkout and real-time package delivery tracking.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/cart"
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-slate-500" />
              <span>View Cart</span>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200/80">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">10k+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Active Products</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">99.8%</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">On-Time Delivery</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">24/7</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-Time WebSocket</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">4.9/5</p>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Trending Catalog</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Featured New Arrivals
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors self-start sm:self-auto"
          >
            <span>See all {products.length > 0 ? "products" : ""}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-4">
                <div className="aspect-square bg-slate-100 rounded-xl"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Products Loading</h3>
            <p className="text-sm text-slate-500 mt-1">Visit all products to browse categories.</p>
            <Link href="/products" className="mt-4 inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const inStock = product.stock > 0;
              const isAdding = addingId === product.id;

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group hover:border-slate-300"
                >
                  <Link href={`/products/${product.id}`} className="block relative aspect-square bg-slate-100/70 p-6 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Package className="w-16 h-16 stroke-[1.2]" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      {inStock ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          In Stock ({product.stock})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {product.category && (
                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                          {product.category.name}
                        </span>
                      )}
                      <Link
                        href={`/products/${product.id}`}
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {product.description || "High-grade performance product guaranteed."}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xl font-extrabold text-slate-900">
                          ₹{Number(product.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">SKU: {product.sku}</span>
                      </div>

                      {/* Action Buttons: Add to Cart and Buy Now */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={!inStock || isAdding}
                          className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isAdding ? "Adding..." : "Add to Cart"}</span>
                        </button>
                        <button
                          onClick={(e) => handleBuyNow(e, product)}
                          disabled={!inStock || isAdding}
                          className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
