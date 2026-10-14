import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { addToCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import PageLoader from "@/components/freshsupply/PageLoader";
import EmptyState from "@/components/freshsupply/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Search, Minus, Plus, ShoppingCart } from "lucide-react";

export default function Products() {
  const { restaurant, loading: restLoading } = useRestaurant();
  const { toast } = useToast();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popularity");
  const [availability, setAvailability] = useState("all");
  const [qty, setQty] = useState({});
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          base44.entities.Product.filter({ status: "active" }, "-popularity", 200),
          base44.entities.Category.filter({ status: "active" }),
        ]);
        setProducts(p);
        setCategories(c);
      } catch (e) {
        setProducts([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products.filter((p) => {
      if (category !== "all" && p.category_id !== category) return false;
      if (availability === "in_stock" && (p.current_stock || 0) <= 0) return false;
      if (availability === "low" && p.stock_status !== "low_stock") return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.sku || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    if (sort === "price_asc") list = [...list].sort((a, b) => a.selling_price - b.selling_price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.selling_price - a.selling_price);
    if (sort === "popularity") list = [...list].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return list;
  }, [products, category, availability, query, sort]);

  const setQuantity = (id, val, min) => {
    const v = Math.max(min, Number(val) || 0);
    setQty((q) => ({ ...q, [id]: v }));
  };

  const handleAdd = async (p) => {
    if (!restaurant) {
      toast({ title: "Complete your restaurant profile first" });
      return;
    }
    const quantity = qty[p.id] || p.minimum_order_quantity || 1;
    if (quantity > (p.current_stock || 0)) {
      toast({ title: "Not enough stock", description: `Only ${p.current_stock} ${p.unit} available`, variant: "destructive" });
      return;
    }
    setAdding(p.id);
    try {
      await addToCart(restaurant.id, p, quantity);
      toast({ title: "Added to order", description: `${p.name} × ${quantity} ${p.unit}` });
    } catch (e) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setAdding(null);
    }
  };

  if (restLoading || products === null) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Product Catalog</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fresh supplies for your kitchen, delivered by morning.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Most popular</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products found"
          description="Try adjusting your filters or search terms."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => {
            const minQ = p.minimum_order_quantity || 1;
            const out = (p.current_stock || 0) <= 0;
            const low = p.stock_status === "low_stock";
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-28 bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center text-5xl">
                  {p.emoji || "🥗"}
                </div>
                <CardContent className="p-4 flex flex-col flex-1">
                  <p className="text-xs text-emerald-600 font-medium">{p.category_name}</p>
                  <h3 className="font-semibold mt-0.5 truncate">{p.name}</h3>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-semibold text-emerald-700">
                      {formatINR(p.selling_price)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {p.unit}</span>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      out ? "text-rose-500" : low ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {out
                      ? "Out of stock"
                      : `Stock: ${p.current_stock} ${p.unit}${low ? " · low" : ""}`}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center border rounded-lg">
                      <button
                        disabled={out}
                        onClick={() =>
                          setQuantity(
                            p.id,
                            Math.max(minQ, (qty[p.id] || minQ) - 1),
                            minQ
                          )
                        }
                        className="px-2 py-1.5 disabled:opacity-40"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        value={qty[p.id] || minQ}
                        onChange={(e) => setQuantity(p.id, e.target.value, minQ)}
                        type="number"
                        min={minQ}
                        className="w-12 text-center text-sm outline-none bg-transparent"
                      />
                      <button
                        disabled={out}
                        onClick={() => setQuantity(p.id, (qty[p.id] || minQ) + 1, minQ)}
                        className="px-2 py-1.5 disabled:opacity-40"
                        aria-label="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={out || adding === p.id}
                      onClick={() => handleAdd(p)}
                    >
                      {adding === p.id ? (
                        "Adding..."
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}