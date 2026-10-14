import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatINR, formatDateTime, formatDate } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import StatusBadge from "@/components/freshsupply/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const o = await base44.entities.Order.get(id);
        setOrder(o);
        const it = await base44.entities.OrderItem.filter({ order_id: id });
        setItems(it);
      } catch (e) {
        setOrder(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <PageLoader />;
  if (order === false)
    return (
      <EmptyState
        title="Order not found"
        action={
          <Button asChild>
            <Link to="/restaurant/orders">Back to orders</Link>
          </Button>
        }
      />
    );

  const steps = ["pending", "confirmed", "preparing", "packed", "out_for_delivery", "delivered"];
  const currentStep = steps.indexOf(order.order_status);
  const cancelled = order.order_status === "cancelled";

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/restaurant/orders">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to orders
        </Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.placed_at)} · Delivery {formatDate(order.requested_delivery_date)} ·{" "}
            {order.requested_delivery_slot}
          </p>
        </div>
        <StatusBadge status={order.order_status} />
      </div>

      {!cancelled && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between overflow-x-auto">
              {steps.map((s, i) => (
                <div key={s} className="flex-1 flex items-center min-w-[110px]">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                        i < currentStep
                          ? "bg-emerald-600 text-white"
                          : i === currentStep
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < currentStep ? "✓" : i + 1}
                    </div>
                    <span className="text-xs mt-1 capitalize whitespace-nowrap">
                      {s.replace(/_/g, " ")}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        i < currentStep ? "bg-emerald-600" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">Items</h2>
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{it.product_name_snapshot}</p>
                    <p className="text-muted-foreground">
                      {it.quantity} {it.unit} × {formatINR(it.unit_price)}
                    </p>
                  </div>
                  <span className="font-medium">{formatINR(it.subtotal)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-2">
              <h2 className="font-semibold mb-2">Payment</h2>
              <Row label="Subtotal" value={formatINR(order.subtotal)} />
              <Row label="Tax" value={formatINR(order.tax)} />
              <Row label="Delivery fee" value={formatINR(order.delivery_fee)} />
              {order.discount > 0 && <Row label="Discount" value={`- ${formatINR(order.discount)}`} />}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Payment status</span>
                <StatusBadge status={order.payment_status} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3">Delivery address</h2>
              <p className="text-sm text-muted-foreground">
                {order.delivery_address_line}
                <br />
                {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}
              </p>
              {order.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}