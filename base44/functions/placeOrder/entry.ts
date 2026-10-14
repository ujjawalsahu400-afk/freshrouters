import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "restaurant" && user.role !== "admin") {
      return Response.json({ error: "Only restaurants can place orders" }, { status: 403 });
    }

    const body = await req.json();
    const cartId = body.cart_id;
    const deliverySlot = body.requested_delivery_slot || "05:00 AM - 07:00 AM";
    const notes = body.notes || "";
    const address = body.delivery_address || {};

    if (!cartId) return Response.json({ error: "Cart is required" }, { status: 400 });

    // Load cart (user-scoped; RLS enforces ownership)
    const cart = await base44.entities.Cart.get(cartId).catch(() => null);
    if (!cart) return Response.json({ error: "Cart not found" }, { status: 404 });
    if (cart.status !== "active")
      return Response.json({ error: "Cart is no longer active" }, { status: 400 });

    const items = await base44.entities.CartItem.filter({ cart_id: cartId });
    if (!items.length)
      return Response.json({ error: "Your cart is empty" }, { status: 400 });

    // Load products (service role for reliable stock reads)
    const productIds = items.map((i) => i.product_id);
    const products = await base44.asServiceRole.entities.Product.filter({
      id: { $in: productIds },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Load restaurant + settings
    const restaurantId = cart.restaurant_id;
    const restaurant = restaurantId
      ? await base44.asServiceRole.entities.Restaurant.get(restaurantId).catch(() => null)
      : null;
    if (!restaurant)
      return Response.json({ error: "Restaurant profile not found" }, { status: 404 });

    const settingsList = await base44.asServiceRole.entities.AppSetting.list();
    const settings = settingsList[0] || {};
    const taxRate = Number(settings.tax_rate) || 0;
    const deliveryFee = Number(settings.delivery_fee) || 0;
    const minOrder = Number(settings.minimum_order_amount) || 0;
    const cutoff = settings.order_cutoff_time || "22:30";

    // Validate products + recompute prices server-side (never trust client prices)
    let subtotal = 0;
    const orderItemsPayload = [];
    const stockUpdates = [];
    const invTxns = [];

    for (const item of items) {
      const p = productMap.get(item.product_id);
      if (!p)
        return Response.json(
          { error: "A product in your cart is no longer available." },
          { status: 400 }
        );
      if (p.status !== "active")
        return Response.json({ error: `${p.name} is no longer available.` }, { status: 400 });

      const qty = Number(item.quantity);
      const minQ = Number(p.minimum_order_quantity) || 1;
      const maxQ = Number(p.maximum_order_quantity) || 9999;
      if (qty < minQ)
        return Response.json(
          { error: `Minimum order for ${p.name} is ${minQ} ${p.unit}.` },
          { status: 400 }
        );
      if (qty > maxQ)
        return Response.json(
          { error: `Maximum order for ${p.name} is ${maxQ} ${p.unit}.` },
          { status: 400 }
        );

      const available = Number(p.current_stock) || 0;
      if (qty > available)
        return Response.json(
          { error: `Only ${available} ${p.unit} of ${p.name} in stock.` },
          { status: 400 }
        );

      const price = round2(Number(p.selling_price));
      const lineSubtotal = round2(price * qty);
      subtotal = round2(subtotal + lineSubtotal);

      orderItemsPayload.push({
        product_id: p.id,
        product_name_snapshot: p.name,
        quantity: qty,
        unit: p.unit,
        unit_price: price,
        subtotal: lineSubtotal,
        image_url: p.emoji || "",
        category_name: p.category_name || "",
      });

      const newAvail = available - qty;
      const newReserved = (Number(p.reserved_stock) || 0) + qty;
      let stockStatus = "in_stock";
      if (newAvail <= 0) stockStatus = "out_of_stock";
      else if (newAvail <= (Number(p.low_stock_threshold) || 10)) stockStatus = "low_stock";
      stockUpdates.push({
        id: p.id,
        current_stock: newAvail,
        reserved_stock: newReserved,
        stock_status: stockStatus,
      });
      invTxns.push({
        product_id: p.id,
        product_name: p.name,
        transaction_type: "reservation",
        quantity: qty,
        reference_id: "",
        notes: "Order reservation",
      });
    }

    if (subtotal < minOrder)
      return Response.json(
        { error: `Minimum order amount is ₹${minOrder}.` },
        { status: 400 }
      );

    const discount = 0;
    const tax = round2((subtotal * taxRate) / 100);
    const total = round2(subtotal + tax + deliveryFee - discount);

    // Credit check
    const creditLimit = Number(restaurant.credit_limit) || 0;
    const availableCredit = Number(restaurant.available_credit) || 0;
    if (creditLimit > 0 && total > availableCredit) {
      return Response.json(
        { error: `Insufficient credit. Available ₹${availableCredit}, order total ₹${total}.` },
        { status: 400 }
      );
    }

    // Server-side cutoff / next delivery date
    const now = new Date();
    const [ch, cm] = cutoff.split(":").map(Number);
    const cutoffToday = new Date(now);
    cutoffToday.setHours(ch, cm, 0, 0);
    const nextDate = new Date(now);
    if (now <= cutoffToday) nextDate.setDate(now.getDate() + 1);
    else nextDate.setDate(now.getDate() + 2);
    const nextDateStr = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(
      nextDate.getDate()
    )}`;
    let requestedDate = body.requested_delivery_date || nextDateStr;
    if (requestedDate < nextDateStr) requestedDate = nextDateStr;

    const orderNumber = `FS-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    // Create order (user-scoped → owned by the restaurant user)
    const order = await base44.entities.Order.create({
      order_number: orderNumber,
      restaurant_id: restaurantId,
      restaurant_name: restaurant.restaurant_name,
      delivery_address_line: address.address_line || restaurant.address_line || "",
      delivery_city: address.city || restaurant.city || "",
      delivery_state: address.state || restaurant.state || "",
      delivery_pincode: address.pincode || restaurant.pincode || "",
      subtotal,
      discount,
      tax,
      delivery_fee: deliveryFee,
      total_amount: total,
      payment_status: "unpaid",
      order_status: "pending",
      delivery_status: "not_assigned",
      requested_delivery_date: requestedDate,
      requested_delivery_slot: deliverySlot,
      notes,
      placed_at: now.toISOString(),
      items_count: orderItemsPayload.length,
    });

    await base44.entities.OrderItem.bulkCreate(
      orderItemsPayload.map((it) => ({ ...it, order_id: order.id }))
    );
    await base44.entities.OrderStatusHistory.create({
      order_id: order.id,
      status: "pending",
      changed_by: user.email || "",
      notes: "Order placed",
    });

    // Reserve stock (service role bypasses product write RLS)
    await base44.asServiceRole.entities.Product.bulkUpdate(stockUpdates);
    await base44.asServiceRole.entities.InventoryTransaction.bulkCreate(
      invTxns.map((t) => ({ ...t, reference_id: order.id }))
    );

    // Decrement available credit
    if (creditLimit > 0) {
      await base44.asServiceRole.entities.Restaurant.update(restaurantId, {
        available_credit: round2(availableCredit - total),
      });
    }

    // Mark cart ordered + clear items
    await base44.entities.Cart.update(cartId, { status: "ordered" });
    await base44.entities.CartItem.deleteMany({ cart_id: cartId });

    // Notify the restaurant user
    await base44.entities.Notification.create({
      user_id: user.id,
      title: "Order Placed",
      message: `Your order ${orderNumber} has been placed and is pending confirmation.`,
      type: "order_placed",
      reference_id: order.id,
      is_read: false,
    });

    return Response.json({
      success: true,
      order_id: order.id,
      order_number: orderNumber,
      total,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to place order" },
      { status: 500 }
    );
  }
}