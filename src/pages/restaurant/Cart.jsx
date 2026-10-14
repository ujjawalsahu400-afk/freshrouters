import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { getActiveCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react";

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default function Cart() {
  const { restaurant, loading } = useRestaurant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);

  const load = async () => {
    if (!restaurant) return;
    const { cart, items } = await getActiveCart(restaurant.id);
    setCart(cart);
    setItems(items);
  };

  useEffect(() => {
    if (restaurant) load();
  }, [restaurant]);

  useEffect(() => {
    (async () => {
      try {
        const s = await base44.entities.AppSetting.list();
        setSettings(s[0] || null);
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  const subtotal = items.reduce((s, i) => s + (i.unit_price || 0) * (i.quantity || 0), 0);
  const tax = settings ? Math.round((subtotal * (settings.tax_rate || 0)) / 100) / 100 : 0;
  const fee = settings?.delivery_fee || 0;
  const total = Math.round((subtotal + tax + fee) * 100) / 100;

  const updateQty = async (item, delta) => {
    const newQ = Math.max(1, (item.quantity || 1) + delta);
    try {
      await base44.entities.CartItem.update(item.id, { quantity: newQ });
      await load();
    } catch (e) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (item) => {
    try {
      await base44.entities.CartItem.delete(item.id);
      await load();
      toast({ title: "Removed from order" });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <PageLoader />;
  if (!restaurant)
    return (
      <EmptyState
        title="Complete your restaurant profile first"
        action={
          <Button asChild>
            <Link to="/restaurant/profile">Set up profile</Link>
          </Button>
        }
      />
    );
  if (!cart || items.length === 0)
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Browse the catalog and add products to your order."
        action={
          <Button asChild>
            <Link to="/restaurant/products">Browse products</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Your Order</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0">
                  {it.image_url || "🥗"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{it.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatINR(it.unit_price)} / {it.unit}
                  </p>
                </div>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => updateQty(it, -1)}
                    className="px-2 py-1.5"
                    aria-label="Decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm">{it.quantity}</span>
                  <button
                    onClick={() => updateQty(it, 1)}
                    className="px-2 py-1.5"
                    aria-label="Increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right w-24">
                  <p className="font-semibold">
                    {formatINR((it.unit_price || 0) * (it.quantity || 0))}
                  </p>
                  <button
                    onClick={() => remove(it)}
                    className="text-xs text-rose-500 hover:underline mt-1 flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit lg:sticky lg:top-6">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold">Order Summary</h2>
            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label={`Tax (${settings?.tax_rate || 0}%)`} value={formatINR(tax)} />
            <Row label="Delivery fee" value={formatINR(fee)} />
            <div className="border-t pt-3 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
            <Button className="w-full" onClick={() => navigate("/restaurant/checkout")}>
              Proceed to checkout <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/restaurant/products">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}