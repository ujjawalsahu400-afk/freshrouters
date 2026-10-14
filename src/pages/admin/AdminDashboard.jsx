import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatINR, formatDateTime } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import StatCard from "@/components/freshsupply/StatCard";
import StatusBadge from "@/components/freshsupply/StatusBadge";
import EmptyState from "@/components/freshsupply/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  ClipboardList,
  Store,
  Truck,
  AlertTriangle,
  Wallet,
} from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [orders, restaurants, products] = await Promise.all([
          base44.entities.Order.list("-placed_at", 100),
          base44.entities.Restaurant.list(),
          base44.entities.Product.list(),
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const todays = orders.filter((o) => (o.placed_at || "").slice(0, 10) === today);
        const revenue = todays.reduce((s, o) => s + (o.total_amount || 0), 0);
        const pendingDeliveries = orders.filter((o) =>
          ["confirmed", "preparing", "packed", "assigned", "out_for_delivery"].includes(
            o.order_status
          )
        ).length;
        const lowStock = products.filter(
          (p) =>
            p.stock_status === "low_stock" ||
            p.stock_status === "out_of_stock" ||
            (p.current_stock || 0) <= (p.low_stock_threshold || 10)
        );
        const outstanding = orders
          .filter((o) => o.payment_status === "unpaid" && o.order_status === "delivered")
          .reduce((s, o) => s + (o.total_amount || 0), 0);
        setData({
          orders,
          restaurants,
          todays,
          revenue,
          pendingDeliveries,
          lowStock,
          outstanding,
        });
      } catch (e) {
        setData({});
      }
    })();
  }, []);

  if (!data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">FreshSupply operations overview.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Today's Revenue" value={formatINR(data.revenue || 0)} icon={IndianRupee} tone="emerald" />
        <StatCard label="Today's Orders" value={data.todays?.length || 0} icon={ClipboardList} tone="blue" />
        <StatCard label="Active Restaurants" value={data.restaurants?.length || 0} icon={Store} tone="violet" />
        <StatCard label="Pending Deliveries" value={data.pendingDeliveries || 0} icon={Truck} tone="amber" />
        <StatCard label="Low Stock Products" value={data.lowStock?.length || 0} icon={AlertTriangle} tone="rose" />
        <StatCard label="Outstanding Payments" value={formatINR(data.outstanding || 0)} icon={Wallet} tone="rose" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold">Recent Orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/orders">View all</Link>
            </Button>
          </div>
          {data.orders?.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="divide-y">
              {data.orders.slice(0, 8).map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-2 md:grid-cols-5 gap-2 px-5 py-3 items-center text-sm"
                >
                  <span className="font-semibold">{o.order_number}</span>
                  <span className="text-muted-foreground truncate">{o.restaurant_name}</span>
                  <span className="text-muted-foreground hidden md:block">
                    {formatDateTime(o.placed_at)}
                  </span>
                  <span className="font-medium">{formatINR(o.total_amount)}</span>
                  <StatusBadge status={o.order_status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}