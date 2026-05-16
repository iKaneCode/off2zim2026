"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, Truck, MapPin, Tag } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CompactSectionHeader from "@/components/ui/CompactSectionHeader";

interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string;
  location: string;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  stockQuantity: number;
  offersShipping: boolean;
  shippingFee: number | null;
  vendor: { id: string; companyName: string; isVerified: boolean };
}

const CATEGORIES = [
  "All",
  "crafts",
  "food",
  "clothing",
  "art",
  "souvenirs",
  "beauty",
  "accessories",
  "other",
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadProducts(true);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadProducts(reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category !== "All") params.set("category", category);
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const data = await apiFetch<{ products: Product[]; nextCursor: string | null }>(
        `/api/shop/products?${params}`
      );
      if (reset) {
        setProducts(data.products);
      } else {
        setProducts((prev) => [...prev, ...data.products]);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#8dc9ff]/25 bg-[#8dc9ff]/8 px-3 py-1.5 text-xs font-medium text-[#8dc9ff]">
              <ShoppingCart className="h-3.5 w-3.5" />
              Marketplace
            </div>
            <h1 className="theme-heading mt-3 text-3xl font-semibold">Shop Zimbabwe</h1>
            <p className="theme-muted mt-2 max-w-2xl text-sm leading-6">
              Handcrafted goods, local art, and authentic Zimbabwean products — delivered or
              ready for pick-up.
            </p>
          </div>
          <Link
            href="/cart"
            className="flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            View cart
          </Link>
        </div>
        </div>

        {/* Search + Category filter */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="theme-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  category === cat
                    ? "bg-[#8dc9ff] text-[#0a1628]"
                    : "border border-white/10 text-white/55 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {cat === "All"
                  ? "All categories"
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="theme-panel animate-pulse overflow-hidden rounded-[24px]"
              >
                <div className="h-48 bg-white/5" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/8" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
            <div className="theme-panel rounded-xl p-8 text-center">
            <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="theme-heading font-semibold">No products found</p>
            <p className="theme-muted mt-1 text-sm">
              {search || category !== "All"
                ? "Try adjusting your search or filters."
                : "Products will appear here as vendors list them."}
            </p>
          </div>
        ) : (
          <>
            <CompactSectionHeader title="Available products" count={products.length} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {nextCursor ? (
              <div className="mt-6 text-center">
                <button
                  onClick={() => loadProducts(false)}
                  disabled={loadingMore}
                  className="rounded-xl border border-white/10 px-8 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const inStock = product.stockQuantity > 0;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="theme-panel group overflow-hidden rounded-xl transition hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-white/5">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-white/15" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">
              Out of stock
            </span>
          </div>
        )}
        {product.offersShipping && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#8dc9ff]/15 px-2.5 py-1 text-xs text-[#8dc9ff]">
            <Truck className="h-3 w-3" />
            Ships
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="theme-heading line-clamp-2 text-sm font-semibold leading-snug">
            {product.title}
          </p>
          <span className="shrink-0 text-sm font-bold text-[#8dc9ff]">
            ${product.price}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{product.vendor.companyName}</span>
          {product.vendor.isVerified && <VerifiedBadge size="sm" showLabel={false} />}
        </div>

        {product.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full border border-white/8 px-2 py-0.5 text-xs text-white/40"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/35">
            {inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
          </span>
          {inStock && (
            <span className="rounded-full bg-[#ff5630]/10 px-3 py-1 text-xs font-medium text-[#ff5630]">
              View →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
