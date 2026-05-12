"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";

interface CartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  quantity: number;
  deliveryMethod: string;
  pickupDate: string | null;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    country: string;
  } | null;
  variantKey: string | null;
  lineTotal: number;
  shippingFee: number;
  offersShipping: boolean;
  stockQuantity: number;
  vendor: { id: string; name: string };
}

interface Cart {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  shippingTotal: number;
  total: number;
}

type CheckoutState = "idle" | "loading" | "success" | "error";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderPins, setOrderPins] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoading(true);
    try {
      const data = await apiFetch<{ cart: Cart }>("/api/cart");
      setCart(data.cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setUpdatingId(itemId);
    try {
      const data = await apiFetch<{ cart: Cart }>(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(data.cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update quantity.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId: string) {
    setRemovingId(itemId);
    try {
      const data = await apiFetch<{ cart: Cart }>(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      setCart(data.cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCheckout() {
    setCheckoutState("loading");
    setCheckoutError("");
    try {
      const data = await apiFetch<{
        order: {
          id: string;
          items: { id: string; pickupPin: string | null; deliveryMethod: string }[];
        };
      }>("/api/shop/checkout", { method: "POST", body: JSON.stringify({}) });
      setOrderId(data.order.id);
      const pins: Record<string, string> = {};
      for (const item of data.order.items) {
        if (item.deliveryMethod === "pickup" && item.pickupPin) {
          pins[item.id] = item.pickupPin;
        }
      }
      setOrderPins(pins);
      setCheckoutState("success");
      // Clear the cart display
      setCart({ id: null, items: [], subtotal: 0, shippingTotal: 0, total: 0 });
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Unable to place order.");
      setCheckoutState("error");
    }
  }

  if (checkoutState === "success") {
    const hasPins = Object.keys(orderPins).length > 0;
    return (
      <div className="theme-page flex min-h-screen items-center justify-center px-4 py-16">
        <div className="theme-panel w-full max-w-lg rounded-[28px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4ade80]/15">
            <Check className="h-8 w-8 text-[#4ade80]" />
          </div>
          <h1 className="theme-heading text-2xl font-bold">Order confirmed!</h1>
          <p className="theme-muted mt-2 text-sm">
            Your order has been placed. Order ID:{" "}
            <span className="font-mono text-white/80">{orderId}</span>
          </p>

          {hasPins && (
            <div className="mt-6 rounded-[18px] border border-[#4ade80]/20 bg-[#4ade80]/5 p-4 text-left">
              <p className="mb-3 text-sm font-semibold text-[#4ade80]">
                Pick-up PINs — show these when collecting your order
              </p>
              {Object.entries(orderPins).map(([itemId, pin]) => (
                <div key={itemId} className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Item {itemId.slice(-6)}</span>
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-white">
                    {pin}
                  </span>
                </div>
              ))}
              <p className="mt-2 text-xs text-white/35">
                Keep these safe. They are only shown once.
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Link
              href="/shop"
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60 transition hover:text-white"
            >
              Continue shopping
            </Link>
            <Link
              href="/orders"
              className="flex-1 rounded-xl bg-[#ff5630] py-3 text-sm font-semibold text-white transition hover:bg-[#ff4520]"
            >
              View orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/shop"
            className="flex items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to shop
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="theme-heading text-xl font-semibold">Your cart</h1>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="theme-panel animate-pulse rounded-[20px] p-5 h-24" />
            ))}
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="theme-panel rounded-[28px] p-12 text-center">
            <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="theme-heading font-semibold">Your cart is empty</p>
            <p className="theme-muted mt-1 text-sm">
              Browse the shop and add something you love.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff5630] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ff4520]"
            >
              Browse shop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Items list */}
            <div className="space-y-4 lg:col-span-2">
              {cart.items.map((item) => (
                <div key={item.id} className="theme-panel rounded-[20px] p-5">
                  <div className="flex gap-4">
                    <Link href={`/shop/${item.slug}`}>
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-white/15" />
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/shop/${item.slug}`}
                          className="theme-heading line-clamp-2 text-sm font-semibold leading-snug hover:underline"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={removingId === item.id}
                          className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:text-[#ff5630] disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-0.5 text-xs text-white/40">{item.vendor.name}</p>

                      {/* Delivery badge */}
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        {item.deliveryMethod === "shipping" ? (
                          <span className="flex items-center gap-1 text-[#8dc9ff]">
                            <Truck className="h-3 w-3" />
                            Shipping
                            {item.shippingFee > 0 && ` +$${item.shippingFee}`}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#4ade80]">
                            <MapPin className="h-3 w-3" />
                            Pick up
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {/* Quantity controls */}
                        <div className="flex items-center rounded-xl border border-white/10">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updatingId === item.id || item.quantity <= 1}
                            className="px-2.5 py-1.5 text-white/50 hover:text-white disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm font-medium">
                            {updatingId === item.id ? "…" : item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={
                              updatingId === item.id ||
                              item.quantity >= item.stockQuantity
                            }
                            className="px-2.5 py-1.5 text-white/50 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-[#8dc9ff]">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="theme-panel sticky top-24 rounded-[24px] p-6">
                <h2 className="theme-heading mb-4 text-base font-semibold">Order summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal</span>
                    <span>${cart.subtotal.toFixed(2)}</span>
                  </div>
                  {cart.shippingTotal > 0 && (
                    <div className="flex justify-between text-white/60">
                      <span>Shipping</span>
                      <span>${cart.shippingTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/8 pt-2.5 font-semibold">
                    <span>Total</span>
                    <span className="text-[#8dc9ff]">${cart.total.toFixed(2)}</span>
                  </div>
                </div>

                {checkoutError ? (
                  <div className="mt-4 rounded-xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-xs text-[#ff5630]">
                    {checkoutError}
                  </div>
                ) : null}

                <button
                  onClick={handleCheckout}
                  disabled={checkoutState === "loading" || cart.items.length === 0}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5630] py-3.5 text-sm font-semibold text-white transition hover:bg-[#ff4520] disabled:opacity-50"
                >
                  {checkoutState === "loading" ? (
                    "Placing order…"
                  ) : (
                    <>
                      Place order
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-white/30">
                  Payment collected on delivery or pick-up
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
