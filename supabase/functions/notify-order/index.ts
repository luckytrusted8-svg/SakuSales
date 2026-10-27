// Supabase Edge Function: notify-order
// Triggered by Database Webhook on INSERT to public.orders

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function formatRupiah(amount: number): string {
  return "Rp " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

serve(async (req: Request) => {
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return new Response("Metode tidak diizinkan", { status: 405 });
  }

  // 1. Verifikasi header x-webhook-secret
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");

  if (webhookSecret && providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized: Secret webhook salah" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const record = payload.record || payload;

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Payload tidak valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Ambil data dari payload webhook
    const buyerName = record.buyer_name || "Pelanggan";
    const total = record.total || 0;
    const payment = record.payment === "qris" ? "QRIS" : "Cash";
    const orderId = record.id;

    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const androidChannelId = Deno.env.get("ONESIGNAL_ANDROID_CHANNEL_ID") || "pesanan_baru";

    if (!onesignalAppId || !onesignalApiKey) {
      return new Response(
        JSON.stringify({
          error: "Konfigurasi OneSignal belum lengkap di secret Edge Function",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Kirim notifikasi ke OneSignal
    const notificationBody = {
      app_id: onesignalAppId,
      included_segments: ["Total Subscriptions"],
      headings: { en: "Pesanan baru" },
      contents: { en: `${buyerName}, total ${formatRupiah(total)}, ${payment}` },
      android_channel_id: androidChannelId,
      data: { order_id: orderId },
    };

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${onesignalApiKey}`,
      },
      body: JSON.stringify(notificationBody),
    });

    const resData = await res.json();

    return new Response(JSON.stringify({ success: true, onesignal: resData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
