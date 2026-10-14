import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { formatINR } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium capitalize mt-0.5">{value}</p>
  </div>
);

export default function RestaurantProfile() {
  const { restaurant, loading, refresh } = useRestaurant();
  const { toast } = useToast();
  const [form, setForm] = useState({
    restaurant_name: "",
    contact_person: "",
    phone: "",
    email: "",
    gst_number: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setForm({
        restaurant_name: restaurant.restaurant_name || "",
        contact_person: restaurant.contact_person || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        gst_number: restaurant.gst_number || "",
        address_line: restaurant.address_line || "",
        city: restaurant.city || "",
        state: restaurant.state || "",
        pincode: restaurant.pincode || "",
      });
    }
  }, [restaurant]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.restaurant_name) {
      toast({ title: "Restaurant name is required", variant: "destructive" });
      return;
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      toast({ title: "Invalid pincode", description: "Enter a 6-digit pincode", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (restaurant) {
        await base44.entities.Restaurant.update(restaurant.id, form);
      } else {
        await base44.entities.Restaurant.create({
          ...form,
          verification_status: "pending",
          status: "active",
          credit_limit: 0,
          available_credit: 0,
        });
      }
      toast({ title: "Profile saved" });
      await refresh();
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Restaurant Profile</h1>
        <p className="text-muted-foreground text-sm">
          Keep your details up to date for accurate deliveries and invoices.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Restaurant name *">
              <Input
                value={form.restaurant_name}
                onChange={(e) => set("restaurant_name", e.target.value)}
              />
            </Field>
            <Field label="Contact person">
              <Input
                value={form.contact_person}
                onChange={(e) => set("contact_person", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="GST number">
              <Input
                value={form.gst_number}
                onChange={(e) => set("gst_number", e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
                placeholder="6 digits"
              />
            </Field>
          </div>
          <Field label="Address">
            <Input
              value={form.address_line}
              onChange={(e) => set("address_line", e.target.value)}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>
      {restaurant && (
        <Card>
          <CardContent className="p-6 grid sm:grid-cols-3 gap-4 text-sm">
            <Info label="Verification" value={restaurant.verification_status} />
            <Info label="Credit limit" value={formatINR(restaurant.credit_limit || 0)} />
            <Info label="Available credit" value={formatINR(restaurant.available_credit || 0)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}