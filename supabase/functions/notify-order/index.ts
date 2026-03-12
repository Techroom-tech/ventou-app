import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightOrMethod } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const methodResponse = handleCorsPreflightOrMethod(req, "POST");
  if (methodResponse) return methodResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { order_id, shop_id } = await req.json();
    if (!order_id || !shop_id) {
      return new Response(JSON.stringify({ error: "order_id and shop_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch order, shop, and owner email in parallel
    const [orderRes, shopRes] = await Promise.all([
      admin.from("orders").select("*").eq("id", order_id).single(),
      admin.from("shops").select("id, name, slug, owner_id, currency").eq("id", shop_id).single(),
    ]);

    if (orderRes.error || !orderRes.data) {
      console.error("[notify-order] Order not found:", orderRes.error);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shopRes.error || !shopRes.data) {
      console.error("[notify-order] Shop not found:", shopRes.error);
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = orderRes.data;
    const shop = shopRes.data;

    // Get owner email from auth.users
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(shop.owner_id);
    if (userError || !userData?.user?.email) {
      console.error("[notify-order] Owner email not found:", userError);
      return new Response(JSON.stringify({ error: "Owner email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerEmail = userData.user.email;
    const ownerName = userData.user.user_metadata?.first_name || "Vendeur";

    // Format items list
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsList = items
      .map((i: any) => `${i.quantity}x ${i.name}`)
      .join(", ") || "—";

    // Format order ID (short)
    const shortId = order.id.slice(0, 8).toUpperCase();

    // Build variables for template
    const variables: Record<string, string> = {
      name: ownerName,
      store_name: shop.name,
      order_id: shortId,
      customer_name: order.customer_name || "—",
      customer_phone: order.phone || order.customer_phone || "—",
      total: `${order.total} ${shop.currency || "XOF"}`,
      city: order.city || "—",
      quartier: order.quartier ? `, ${order.quartier}` : "",
      payment_method: order.payment_method === "cod" ? "Paiement à la livraison" : "WhatsApp",
      items_list: itemsList,
      dashboard_url: `https://${shop.slug}.ventou.shop/dashboard/orders`,
      platform_name: "Ventou",
    };

    // Call send-email with service role
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        slug: "new_order_vendor",
        variables,
        to: ownerEmail,
        user_id: shop.owner_id,
      }),
    });

    const sendData = await sendRes.json().catch(() => ({}));
    console.log("[notify-order] send-email response:", sendRes.status, sendData);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-order] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
