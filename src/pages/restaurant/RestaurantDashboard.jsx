import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { formatINR, formatDateTime } from "@/lib/format";
import StatCard from "@/components/freshsupply/StatCard";
import StatusBadge from "@/components/freshsupply/StatusBadge";
import EmptyState from "@/components/freshsupply/EmptyState";
import PageLoader from "@/components/freshsupply/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  ClipboardList,
  Truck,
  FileText,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function RestaurantDashboard() {
  const { restaurant, loading: restLoading } = useRestaurant();
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      try {
        const o = await base44.entities.Order.list("-placed_at", 10);
        setOrders(o);
      } catch (e) {
        setOrders([]);
      }
    })();
    (async () => {
      try {
        const p = await base44.entities.Product.filter({ status: "active" }, "-popularity", 6);
        setProducts(p);
      } catch (e) {
        setProducts([]);
      }
    })();
  }, [restaurant]);

  if (restLoading) return <PageLoader />;
  if (!restaurant) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={Package}
          title="Complete your restaurant profile"
          description="Add your restaurant details to start placing orders for fresh morning delivery."
          action={
            <Button asChild>
              <Link to="/restaurant/profile">Set up profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const allOrders = orders || [];
  const todaysOrders = allOrders.filter((o) => (o.placed_at || "").slice(0, 10) === today);
  const todaysSpend = todaysOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const pendingDeliveries = allOrders.filter(
    (o) => !["delivered", "cancelled"].includes(o.order_status)
  ).length;
  const outstanding = allOrders
    .filter((o) => o.payment_status === "unpaid")
    .reduce((s, o) => s + (o.total_amount || 0), 0);
  const activeOrder = allOrders.find(
    (o) => !["delivered", "cancelled"].includes(o.order_status)
  );

  const quickActions = [
    { label: "Place New Order", icon: ShoppingCart, to: "/restaurant/products" },
    { label: "Repeat Last Order", icon: RefreshCw, to: "/restaurant/orders" },
    { label: "View Catalog", icon: Package, to: "/restaurant/products" },
    { label: "Track My Order", icon: Truck, to: "/restaurant/orders" },
    { label: "View Invoices", icon: FileText, to: "/restaurant/orders" },
  ];

  const steps = ["pending", "confirmed", "preparing", "packed", "out_for_delivery", "delivered"];
  const currentStep = activeOrder ? steps.indexOf(activeOrder.order_status) : -1;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-green-600 text-white p-6 sm:p-8 shadow-sm">
        <p className="text-emerald-100 text-sm">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-1">
          Good Morning, {restaurant.restaurant_name} 👋
        </h1>
        <p className="text-emerald-50/90 mt-1">
          Here's what's happening with your restaurant today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Orders" value={todaysOrders.length} icon={ClipboardList} tone="emerald" />
        <StatCard label="Today's Spend" value={formatINR(todaysSpend)} icon={TrendingUp} tone="blue" />
        <StatCard label="Pending Deliveries" value={pendingDeliveries} icon={Truck} tone="amber" />
        <StatCard label="Outstanding Amount" value={formatINR(outstanding)} icon={FileText} tone="rose" />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} className="group">
              <Card className="h-full hover:border-emerald-300 hover:shadow-md transition-all">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="font-semibold">Recent Orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/restaurant/orders">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          <CardContent>
            {orders === null ? (
              <PageLoader />
            ) : allOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Place your first order to see it here."
                action={
                  <Button asChild>
                    <Link to="/restaurant/products">Browse products</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y">
                {allOrders.map((o) => (
                  <Link
                    key={o.id}
                    to={`/restaurant/orders/${o.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(o.placed_at)} · {o.items_count || 0} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{formatINR(o.total_amount)}</span>
                      <StatusBadge status={o.order_status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 pt-6">
            <h2 className="font-semibold">Today's Order Summary</h2>
          </div>
          <CardContent>
            {activeOrder ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Order {activeOrder.order_number}
                </p>
                <div className="space-y-3">
                  {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                          i <= currentStep
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i <= currentStep ? "✓" : i + 1}
                      </div>
                      <span
                        className={`text-sm capitalize ${
                          i <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {s.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="w-full mt-5">
                  <Link to={`/restaurant/orders/${activeOrder.id}`}>Track order</Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={Truck}
                title="No active order"
                description="Your order progress will appear here once you place an order."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-semibold">Top Products</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/restaurant/products">
              View catalog <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
        <CardContent>
          {products === null ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {products.map((p) => (
                <div key={p.id} className="rounded-xl border p-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-2xl mb-2">
                    {p.emoji || "🥗"}
                  </div>
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatINR(p.selling_price)} / {p.unit}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {p.current_stock > 0
                      ? `${p.current_stock} ${p.unit} in stock`
                      : "Out of stock"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}