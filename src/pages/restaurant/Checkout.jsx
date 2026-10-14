import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { getActiveCart } from "@/lib/cart";
import { formatINR, formatDate } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Clock } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default function Checkout() {
  const { restaurant, loading } = useRestaurant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState(null);
  const [settings, setSettings] = useState(null);
  const [slot, setSlot] = useState("05:00 AM - 07:00 AM");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await base44.entities.AppSetting.list();
        setSettings(s[0] || null);
        if (restaurant) {
          const { cart, items } = await getActiveCart(restaurant.id);
          setCart(cart);
          setItems(items);
        }
      } catch (e) {
        /* ignore */
      }
    })();
  }, [restaurant]);

  useEffect(() => {
    if (!settings) return;
    const cutoff = settings.order_cutoff_time || "22:30";
    const now = new Date();
    const [ch, cm] = cutoff.split(":").map(Number);
    const ct = new Date(now);
    ct.setHours(ch, cm, 0, 0);
    const d = new Date(now);
    if (now <= ct) d.setDate(now.getDate() + 1);
    else d.setDate(now.getDate() + 2);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    setDeliveryDate(ds);
  }, [settings]);

  const subtotal = items.reduce((s, i) => s + (i.unit_price || 0) * (i.quantity || 0), 0);
  const tax = settings ? Math.round((subtotal * (settings.tax_rate || 0)) / 100) / 100 : 0;
  const fee = settings?.delivery_fee || 0;
  const total = Math.round((subtotal + tax + fee) * 100) / 100;

  const cutoffPassed = (() => {
    if (!settings) return false;
    const cutoff = settings.order_cutoff_time || "22:30";
    const now = new Date();
    const [ch, cm] = cutoff.split(":").map(Number);
    const ct = new Date(now);
    ct.setHours(ch, cm, 0, 0);
    return now > ct;
  })();

  const place = async () => {
    if (!cart || items.length === 0) {
      toast({ title: "Your cart is empty" });
      return;
    }
    setPlacing(true);
    try {
      const res = await base44.functions.invoke("placeOrder", {
        cart_id: cart.id,
        requested_delivery_date: deliveryDate,
        requested_delivery_slot: slot,
        notes,
        delivery_address: {
          address_line: restaurant.address_line,
          city: restaurant.city,
          state: restaurant.state,
          pincode: restaurant.pincode,
        },
      });
      toast({
        title: "Order placed!",
        description: res.data?.order_number || "Your order has been placed.",
      });
      navigate(`/restaurant/orders/${res.data?.order_id}`);
    } catch (e) {
      toast({
        title: "Could not place order",
        description: e.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  };

  if (loading || !settings) return <PageLoader />;
  if (!restaurant)
    return (
      <EmptyState
        title="Complete your restaurant profile first"
        action={
          <Button asChild>
            <a href="/restaurant/profile">Set up</a>
          </Button>
        }
      />
    );
  if (!cart || items.length === 0)
    return (
      <EmptyState
        title="Your cart is empty"
        action={
          <Button asChild>
            <a href="/restaurant/products">Browse products</a>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      {cutoffPassed && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          <Clock className="w-5 h-5 shrink-0" />
          <p>
            Today's ordering window has closed. Your order will be scheduled for the next
            available delivery date ({formatDate(deliveryDate)}).
          </p>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Delivery details</h2>
              <div className="space-y-1.5">
                <Label>Delivery address</Label>
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                  {restaurant.restaurant_name}
                  <br />
                  {restaurant.address_line}, {restaurant.city}, {restaurant.state} -{" "}
                  {restaurant.pincode}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Delivery date</Label>
                  <Input value={formatDate(deliveryDate)} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Delivery slot</Label>
                  <Select value={slot} onValueChange={setSlot}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="05:00 AM - 07:00 AM">05:00 AM - 07:00 AM</SelectItem>
                      <SelectItem value="07:00 AM - 09:00 AM">07:00 AM - 09:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Order notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3">Order items ({items.length})</h2>
              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between py-2 text-sm">
                    <span>
                      {it.product_name} × {it.quantity} {it.unit}
                    </span>
                    <span>{formatINR((it.unit_price || 0) * (it.quantity || 0))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">Summary</h2>
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label="Tax" value={formatINR(tax)} />
            <Row label="Delivery fee" value={formatINR(fee)} />
            <div className="border-t pt-3 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
            <Button className="w-full" disabled={placing} onClick={place}>
              {placing ? "Placing..." : "Place order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}