"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Search, 
  ShoppingCart, 
  Sparkles, 
  Package, 
  ArrowLeft, 
  ArrowRight,
  Filter,
  Check
} from "lucide-react";
import productsApi, { Product, ProductListParams } from "@/lib/api/products";
import { useCartStore } from "@/store/cartStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
  { value: "name_asc", label: "Name A-Z" },
];

export default function ProductsPage() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProductListParams>({
    sort: "newest",
    page_size: 16,
  });
  const [searchInput, setSearchInput] = useState("");

  const fetchProducts = async (params: ProductListParams) => {
    setIsLoading(true);
    try {
      const data = await productsApi.list(params);
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts({ ...filters, page });
  }, [filters, page]);

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      toast.success(`Added "${product.name}" to cart! 🛒`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingId(product.id);
    try {
      await addItem(product.id, 1);
      router.push("/checkout");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to proceed to checkout");
      setAddingId(null);
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters((prev) => ({ ...prev, search: searchInput }));
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Explore Catalog</h1>
            <p className="text-sm text-slate-500 mt-1">
              Showing {total} product{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Search Bar & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <form onSubmit={applySearch} className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </form>

            <select
              value={filters.sort}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, sort: e.target.value }));
              }}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setPage(1);
                setFilters((prev) => ({
                  ...prev,
                  in_stock: prev.in_stock ? undefined : true,
                }));
              }}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all shadow-sm ${
                filters.in_stock
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              In Stock Only
            </button>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-4">
                <div className="aspect-square bg-slate-100 rounded-xl"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-md mx-auto my-8">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No Products Found</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Try adjusting your search query or removing the filters.
            </p>
            <button
              onClick={() => {
                setSearchInput("");
                setFilters({ sort: "newest", page_size: 16 });
                setPage(1);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all"
            >
              Reset Filters
            </button>
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
                        {product.description || "High performance quality built to last."}
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xl font-extrabold text-slate-900">
                          ₹{Number(product.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">SKU: {product.sku}</span>
                      </div>

                      {/* Add to Cart and Buy Now */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={!inStock || isAdding}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isAdding ? "..." : "Add to Cart"}</span>
                        </button>
                        <button
                          onClick={(e) => handleBuyNow(e, product)}
                          disabled={!inStock || isAdding}
                          className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
