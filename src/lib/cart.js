import { base44 } from "@/api/base44Client";

export async function getActiveCart(restaurantId) {
  if (!restaurantId) return { cart: null, items: [] };
  let carts = await base44.entities.Cart.filter({
    restaurant_id: restaurantId,
    status: "active",
  });
  let cart = carts[0];
  if (!cart) {
    cart = await base44.entities.Cart.create({
      restaurant_id: restaurantId,
      status: "active",
    });
  }
  const items = await base44.entities.CartItem.filter({ cart_id: cart.id });
  return { cart, items };
}

export async function addToCart(restaurantId, product, quantity) {
  if (!restaurantId) throw new Error("Restaurant profile required");
  let carts = await base44.entities.Cart.filter({
    restaurant_id: restaurantId,
    status: "active",
  });
  let cart = carts[0];
  if (!cart) {
    cart = await base44.entities.Cart.create({
      restaurant_id: restaurantId,
      status: "active",
    });
  }
  const existing = await base44.entities.CartItem.filter({
    cart_id: cart.id,
    product_id: product.id,
  });
  if (existing[0]) {
    await base44.entities.CartItem.update(existing[0].id, {
      quantity: (existing[0].quantity || 0) + quantity,
      unit_price: product.selling_price,
    });
  } else {
    await base44.entities.CartItem.create({
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      unit_price: product.selling_price,
      quantity,
      image_url: product.emoji || "",
      category_name: product.category_name || "",
    });
  }
  return getActiveCart(restaurantId);
}