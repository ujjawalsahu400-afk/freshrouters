import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { addToCart } from "@/lib/cart";
import { formatINR, formatDateTime } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import StatusBadge from "@/components/freshsupply/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardList, Repeat, ArrowRight } from "lucide-react";

export default function Orders() {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await base44.entities.Order.list("-placed_at", 50);
        setOrders(o);
      } catch (e) {
        setOrders([]);
      }
    })();
  }, []);

  const repeat = async (o) => {
    if (!restaurant) {
      toast({ title: "Complete your profile first" });
      return;
    }
    try {
      const items = await base44.entities.OrderItem.filter({ order_id: o.id });
      const productIds = items.map((i) => i.product_id);
      const products = productIds.length
        ? await base44.entities.Product.filter({ id: { $in: productIds } })
        : [];
      const pmap = new Map(products.map((p) => [p.id, p]));
      const unavailable = [];
      for (const it of items) {
        const p = pmap.get(it.product_id);
        if (!p || p.status !== "active" || (p.current_stock || 0) < it.quantity) {
          unavailable.push(it.product_name_snapshot);
        } else {
          await addToCart(restaurant.id, p, it.quantity);
        }
      }
      toast({
        title: unavailable.length ? "Order copied with warnings" : "Order copied to cart",
        description: unavailable.length
          ? `Unavailable: ${unavailable.join(", ")}`
          : "Review your cart and checkout.",
        variant: unavailable.length ? "destructive" : "default",
      });
      navigate("/restaurant/cart");
    } catch (e) {
      toast({ title: "Failed to repeat order", description: e.message, variant: "destructive" });
    }
  };

  if (orders === null) return <PageLoader />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {orders.length === 0 ? (
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
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:grid grid-cols-6 px-5 py-3 text-xs font-medium text-muted-foreground border-b">
              <span>Order</span>
              <span>Date &amp; Time</span>
              <span>Items</span>
              <span>Total</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-2 md:grid-cols-6 gap-2 px-5 py-4 items-center text-sm"
                >
                  <Link
                    to={`/restaurant/orders/${o.id}`}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  <span className="text-muted-foreground">{formatDateTime(o.placed_at)}</span>
                  <span>{o.items_count || 0}</span>
                  <span className="font-medium">{formatINR(o.total_amount)}</span>
                  <StatusBadge status={o.order_status} />
                  <div className="flex gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => repeat(o)}>
                      <Repeat className="w-3.5 h-3.5 mr-1" /> Repeat
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/restaurant/orders/${o.id}`}>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}