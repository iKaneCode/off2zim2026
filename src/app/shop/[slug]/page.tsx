"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  MapPin,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface ProductVariant {
  key: string;
  label: string;
  priceAdjustment: number;
  stockQuantity: number;
}

interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  category: string;
  location: string;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  stockQuantity: number;
  offersShipping: boolean;
  shippingFee: number | null;
  deliveryEstimateDays: number | null;
  pickupLeadTimeHours: number;
  operatingHours: Record<string, string>;
  variants: ProductVariant[];
  vendor: { id: string; companyName: string; isVerified: boolean };
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cart form state
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    apiFetch<{ product: Product }>(`/api/shop/products/${params.slug}`)
      .then(({ product: p }) => {
        setProduct(p);
        if (!p.offersShipping) setDeliveryMethod("pickup");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load product.")
      )
      .finally(() => setLoading(false));
  }, [params.slug]);

  async function handleAddToCart(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setAddingToCart(true);
    setCartError("");
    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantity,
          deliveryMethod,
          variantKey: selectedVariant ?? undefined,
          pickupDate: deliveryMethod === "pickup" && pickupDate ? pickupDate : undefined,
          shippingAddress:
            deliveryMethod === "shipping" && shippingName && shippingLine1 && shippingCity
              ? {
                  fullName: shippingName,
                  line1: shippingLine1,
                  line2: shippingLine2 || undefined,
                  city: shippingCity,
                  country: "ZW",
                }
              : undefined,
        }),
      });
      setAddedToCart(true);
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Unable to add to cart.");
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <div className="theme-page min-h-screen">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="animate-pulse space-y-4">
              <div className="aspect-square rounded-[28px] bg-white/5" />
            </div>
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-3/4 rounded bg-white/10" />
              <div className="h-5 w-1/4 rounded bg-white/8" />
              <div className="h-24 rounded bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="theme-page flex min-h-screen items-center justify-center px-4">
        <div className="theme-panel rounded-[28px] p-8 text-center">
          <p className="theme-heading font-semibold">Product not found</p>
          <p className="theme-muted mt-1 text-sm">{error || "This product is unavailable."}</p>
          <Link
            href="/shop"
            className="mt-5 inline-flex items-center gap-2 text-sm text-[#8dc9ff] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const inStock = product.stockQuantity > 0;
  const effectivePrice =
    product.price +
    (selectedVariant
      ? (product.variants.find((v) => v.key === selectedVariant)?.priceAdjustment ?? 0)
      : 0);
  const shippingCost = deliveryMethod === "shipping" ? (product.shippingFee ?? 0) : 0;
  const total = effectivePrice * quantity + shippingCost;

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/shop"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl bg-white/5">
              {product.images[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ShoppingCart className="h-16 w-16 text-white/15" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === i
                        ? "border-[#8dc9ff]"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info + cart form */}
          <div>
            {/* Vendor */}
            <div className="mb-4 flex items-center gap-2 text-sm text-white/50">
              <MapPin className="h-3.5 w-3.5" />
              <span>{product.vendor.companyName}</span>
              {product.vendor.isVerified && <VerifiedBadge size="sm" showLabel={false} />}
            </div>

            <h1 className="theme-heading text-3xl font-bold">{product.title}</h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#8dc9ff]">
                ${effectivePrice.toFixed(2)}
              </span>
              <span className="text-sm text-white/40">{product.currency}</span>
            </div>

            {product.shortDescription && (
              <p className="theme-muted mt-4 text-sm leading-7">{product.shortDescription}</p>
            )}

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-white/70">Options</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.key}
                      onClick={() =>
                        setSelectedVariant(selectedVariant === v.key ? null : v.key)
                      }
                      className={`rounded-xl border px-4 py-2 text-sm transition ${
                        selectedVariant === v.key
                          ? "border-[#8dc9ff] bg-[#8dc9ff]/10 text-[#8dc9ff]"
                          : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
                      }`}
                    >
                      {v.label}
                      {v.priceAdjustment !== 0 && (
                        <span className="ml-1.5 text-xs text-white/40">
                          {v.priceAdjustment > 0 ? "+" : ""}${v.priceAdjustment}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery method */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-white/70">Delivery</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeliveryMethod("pickup")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                    deliveryMethod === "pickup"
                      ? "border-[#4ade80] bg-[#4ade80]/10 text-[#4ade80]"
                      : "border-white/10 text-white/55 hover:border-white/20"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Pick up
                </button>
                {product.offersShipping && (
                  <button
                    onClick={() => setDeliveryMethod("shipping")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                      deliveryMethod === "shipping"
                        ? "border-[#8dc9ff] bg-[#8dc9ff]/10 text-[#8dc9ff]"
                        : "border-white/10 text-white/55 hover:border-white/20"
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    Ship
                    {product.shippingFee != null && (
                      <span className="text-xs opacity-70">
                        +${product.shippingFee}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Pickup date */}
            {deliveryMethod === "pickup" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Preferred pick-up date{" "}
                  <span className="text-white/35">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="theme-input w-full rounded-xl px-4 py-3 text-sm"
                />
                {product.pickupLeadTimeHours > 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/35">
                    <Clock className="h-3 w-3" />
                    Requires {product.pickupLeadTimeHours}h advance notice
                  </p>
                )}
              </div>
            )}

            {/* Shipping address */}
            {deliveryMethod === "shipping" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-white/70">Shipping address</p>
                <input
                  type="text"
                  placeholder="Full name"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  className="theme-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="text"
                  placeholder="Address line 1"
                  value={shippingLine1}
                  onChange={(e) => setShippingLine1(e.target.value)}
                  className="theme-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="text"
                  placeholder="Address line 2 (optional)"
                  value={shippingLine2}
                  onChange={(e) => setShippingLine2(e.target.value)}
                  className="theme-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="theme-input w-full rounded-xl px-4 py-3 text-sm"
                />
                {product.deliveryEstimateDays && (
                  <p className="flex items-center gap-1.5 text-xs text-white/35">
                    <Truck className="h-3 w-3" />
                    Estimated delivery: {product.deliveryEstimateDays} days
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5 flex items-center gap-3">
              <p className="text-sm font-medium text-white/70">Qty</p>
              <div className="flex items-center rounded-xl border border-white/10">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-white/60 hover:text-white"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stockQuantity, q + 1))
                  }
                  className="px-3 py-2 text-white/60 hover:text-white"
                  disabled={quantity >= product.stockQuantity}
                >
                  +
                </button>
              </div>
              <span className="text-xs text-white/35">
                {product.stockQuantity} in stock
              </span>
            </div>

            {/* Order summary */}
            <div className="mt-5 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="flex justify-between text-sm text-white/60">
                <span>
                  {quantity} × ${effectivePrice.toFixed(2)}
                </span>
                <span>${(effectivePrice * quantity).toFixed(2)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm text-white/60">
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-white/8 pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="text-[#8dc9ff]">${total.toFixed(2)} {product.currency}</span>
              </div>
            </div>

            {cartError ? (
              <div className="mt-3 rounded-xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
                {cartError}
              </div>
            ) : null}

            {addedToCart ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#4ade80]/10 px-4 py-3 text-sm text-[#4ade80]">
                  <Check className="h-4 w-4" />
                  Added to cart
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddedToCart(false)}
                    className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60 hover:text-white"
                  >
                    Continue shopping
                  </button>
                  <Link
                    href="/cart"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff5630] py-3 text-sm font-semibold text-white transition hover:bg-[#ff4520]"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    View cart
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddToCart} className="mt-4">
                <button
                  type="submit"
                  disabled={!inStock || addingToCart}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5630] py-3.5 text-sm font-semibold text-white transition hover:bg-[#ff4520] disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingToCart
                    ? "Adding…"
                    : inStock
                    ? "Add to cart"
                    : "Out of stock"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-14 max-w-2xl">
            <h2 className="theme-heading mb-4 text-xl font-semibold">About this product</h2>
            <p className="theme-muted text-sm leading-8 whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
