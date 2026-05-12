"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingBag, Clock, CheckCircle2, XCircle, Truck, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  deliveryMethod: string;
  pickupDate: string | null;
  shippingFee: number;
  status: string;
  pickupPin: string | null;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  shippingTotal: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pending:    { label: "Pending",    icon: Clock,         color: "text-[#ffc247]",  bg: "bg-[#2a1f00]" },
  confirmed:  { label: "Confirmed",  icon: CheckCircle2,  color: "text-[#4ade80]",  bg: "bg-[#0f2a1e]" },
  processing: { label: "Processing", icon: Package,       color: "text-[#8dc9ff]",  bg: "bg-[#13283a]" },
  shipped:    { label: "Shipped",    icon: Truck,         color: "text-[#c4b5fd]",  bg: "bg-[#2d1f38]" },
  delivered:  { label: "Delivered",  icon: CheckCircle2,  color: "text-[#4ade80]",  bg: "bg-[#0f2a1e]" },
  cancelled:  { label: "Cancelled",  icon: XCircle,       color: "text-[#ff8a78]",  bg: "bg-[#2a0f0a]" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: Clock, color: "text-white/50", bg: "bg-white/8" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="theme-panel rounded-[24px] overflow-hidden">
      {/* Order header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8">
            <ShoppingBag className="h-4 w-4 text-white/50" />
          </div>
          <div>
            <p className="theme-heading text-sm font-semibold">
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="theme-subtle text-xs mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("en-ZW", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <StatusBadge status={order.status} />
          <span className="theme-heading text-sm font-semibold">
            {order.currency} {order.totalAmount.toFixed(2)}
          </span>
          <ArrowRight className={`h-4 w-4 text-white/30 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Order items (expanded) */}
      {expanded && (
        <div className="border-t border-white/[0.07]">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-b-0">
              {/* Thumbnail */}
              <div className="h-14 w-14 shrink-0 rounded-[10px] overflow-hidden bg-white/8">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-6 w-6 text-white/20" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/marketplace/${item.slug}`} className="theme-heading text-sm font-medium hover:text-[#ff7352] transition-colors">
                  {item.title}
                </Link>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs theme-subtle">
                  <span>Qty: {item.quantity}</span>
                  <span>{order.currency} {item.unitPrice.toFixed(2)} ea.</span>
                  <span className="capitalize">{item.deliveryMethod}</span>
                  {item.pickupDate && (
                    <span>Pickup: {new Date(item.pickupDate).toLocaleDateString()}</span>
                  )}
                </div>
                {item.pickupPin && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#13283a] px-2.5 py-0.5 text-xs text-[#8dc9ff]">
                    PIN: <span className="font-bold tracking-widest">{item.pickupPin}</span>
                  </div>
                )}
              </div>

              {/* Item status */}
              <StatusBadge status={item.status} />
            </div>
          ))}

          {/* Totals */}
          <div className="px-5 py-4 bg-white/[0.02] space-y-1">
            {order.shippingTotal > 0 && (
              <div className="flex justify-between text-xs theme-subtle">
                <span>Shipping</span>
                <span>{order.currency} {order.shippingTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold theme-heading pt-1 border-t border-white/[0.06] mt-1">
              <span>Total</span>
              <span>{order.currency} {order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersShell() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    apiFetch<{ orders: Order[] }>("/api/shop/orders")
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="theme-page min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8dc9ff]/25 bg-[#13283a] px-4 py-2 text-sm font-medium text-[#8dc9ff]">
            <Package className="h-4 w-4" />
            Shop
          </div>
          <h1 className="theme-heading mt-4 text-4xl font-semibold">Your Orders</h1>
          <p className="theme-muted mt-2 text-sm leading-6">
            Track deliveries, view pickup PINs, and manage your shop purchases.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#ff5630]/30 bg-[#ff5630]/8 px-4 py-3 text-sm text-[#ff5630]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[24px] border border-white/[0.07] bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/[0.08]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded-xl bg-white/[0.08]" />
                    <div className="h-3 w-1/4 rounded-xl bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="theme-panel rounded-[28px] p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
              <ShoppingBag className="h-7 w-7 text-white/30" />
            </div>
            <h3 className="theme-heading font-semibold">No orders yet</h3>
            <p className="theme-muted mt-2 text-sm">Your purchases from the shop will appear here.</p>
            <Link
              href="/shop"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff5630] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ff7352] transition-colors"
            >
              Browse the shop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersShell />
    </ProtectedRoute>
  );
}
