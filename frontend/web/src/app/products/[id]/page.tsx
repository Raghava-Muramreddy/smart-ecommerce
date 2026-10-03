"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ShoppingBag, 
  ShoppingCart, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Sparkles,
  Plus,
  Minus
} from "lucide-react";
import productsApi, { Product } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const { addItem } = useCartStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsApi.get(id)
      .then((data) => {
        setProduct(data);
        if (data.images && data.images.length > 0) {
          const primary = data.images.find((img) => img.is_primary) || data.images[0];
          setSelectedImage(primary.url);
        }
      })
      .catch((err) => {
        console.error("Failed to load product", err);
        setError("Failed to load product details or product does not exist.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleQuantityChange = (delta: number) => {
    if (!product) return;
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= Math.min(product.stock, 50)) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    try {
      setAddingToCart(true);
      await addItem(product.id, quantity);
      toast.success(`Added ${quantity} "${product.name}" to cart! 🛒`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add product to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || product.stock <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    try {
      setAddingToCart(true);
      await addItem(product.id, quantity);
      router.push("/checkout");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to proceed to checkout");
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
          <div className="h-96 sm:h-[450px] bg-slate-200 rounded-3xl"></div>
          <div className="space-y-6">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-slate-500 mb-6">{error || "The requested item is not available."}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all products
          </Link>
          {product.category && (
            <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {product.category.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Product Images Viewport */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center p-8 group">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <ShoppingBag className="w-24 h-24 stroke-[1.2]" />
                  <span className="text-sm font-medium">Product Showcase</span>
                </div>
              )}

              {/* Stock badge overlay */}
              <div className="absolute top-4 left-4">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                    <Check className="w-3.5 h-3.5" /> In Stock ({product.stock} available)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white ${
                      selectedImage === img.url
                        ? "border-indigo-600 ring-2 ring-indigo-500/20"
                        : "border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">SKU: {product.sku}</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {product.name}
              </h1>
              <div className="mt-4 flex items-baseline gap-4">
                <span className="text-4xl font-extrabold text-indigo-600">
                  ₹{Number(product.price).toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-medium">Taxes and shipping calculated at checkout</span>
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-b border-slate-100 py-6">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Product Overview</h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                {product.description || "Precision engineered product with guaranteed high reliability and top-tier build quality."}
              </p>
            </div>

            {/* Quantity and Actions */}
            {inStock ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-700">Quantity</span>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="p-2.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-bold text-slate-900 min-w-[2.5rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="p-2.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    Total: <strong className="text-slate-800">₹{(Number(product.price) * quantity).toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-800 font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                    {addingToCart ? "Adding..." : "Add to Cart"}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={addingToCart}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" />
                    Buy Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                This product is currently out of stock. Please explore our other catalog items.
              </div>
            )}

            {/* Value props */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-[11px] font-semibold text-slate-700">Fast Shipping Worldwide</div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-[11px] font-semibold text-slate-700">100% Authentic Guaranteed</div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <RotateCcw className="w-4 h-4 text-cyan-600 shrink-0" />
                <div className="text-[11px] font-semibold text-slate-700">30-Day Easy Returns</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
