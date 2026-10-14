import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatINR, formatDateTime } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import StatusBadge from "@/components/freshsupply/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "packed",
  "assigned",
  "out_for_delivery",
  "arrived",
  "delivered",
  "cancelled",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const o = await base44.entities.Order.list("-placed_at", 200);
        setOrders(o);
      } catch (e) {
        setOrders([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (status !== "all" && o.order_status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !o.order_number.toLowerCase().includes(s) &&
          !(o.restaurant_name || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [orders, q, status]);

  if (orders === null) return <PageLoader />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">All Orders</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search order number or restaurant..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No orders found" description="Try adjusting your search or filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-2 md:grid-cols-6 gap-2 px-5 py-3 items-center text-sm"
                >
                  <span className="font-semibold">{o.order_number}</span>
                  <span className="text-muted-foreground truncate">{o.restaurant_name}</span>
                  <span className="text-muted-foreground hidden md:block">
                    {formatDateTime(o.placed_at)}
                  </span>
                  <span className="font-medium">{formatINR(o.total_amount)}</span>
                  <StatusBadge status={o.order_status} />
                  <StatusBadge status={o.payment_status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}