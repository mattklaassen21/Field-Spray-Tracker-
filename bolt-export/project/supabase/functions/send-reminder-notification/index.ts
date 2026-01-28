import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushToken {
  token: string;
  user_id: string;
}

interface Order {
  id: string;
  operation: string;
  account_description: string;
  seed_type: string;
  variety: string;
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: unviewedOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .is("viewed_by", null)
      .eq("view_notified", false)
      .lt("created_at", tenMinutesAgo);

    if (ordersError) {
      throw ordersError;
    }

    if (!unviewedOrders || unviewedOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unviewed orders needing reminders" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, user_id");

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens registered" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pushTokens = (tokens as PushToken[]).map((t) => t.token);

    const messages = (unviewedOrders as Order[]).flatMap((order) =>
      pushTokens.map((pushToken) => ({
        to: pushToken,
        sound: "default",
        title: "⏰ Reminder: Unviewed Order",
        body: `${order.operation} - ${order.account_description} (${Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} min ago)`,
        data: { order, type: "reminder" },
        priority: "high",
      }))
    );

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    const orderIds = (unviewedOrders as Order[]).map((o) => o.id);
    await supabase
      .from("orders")
      .update({ view_notified: true })
      .in("id", orderIds);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: unviewedOrders.length,
        result: pushResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
