import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const rawText = await req.text();
    console.log("🔔 Mtjree Webhook Raw Body:", rawText);

    // Optional HMAC signature check if headers and secret exist
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("X-Webhook-Signature");
    const timestamp = req.headers.get("x-webhook-timestamp") || req.headers.get("X-Webhook-Timestamp");
    const secret = process.env.MTJREE_WEBHOOK_SECRET || "1be9d63768bb60c9bb2628338e19bfbe7771a8d071390006caea15f8758f7d45";

    if (signature && timestamp && secret) {
      try {
        const signingString = `${timestamp}.${rawText}`;
        const expectedSignature = crypto.createHmac("sha256", secret).update(signingString).digest("hex");
        if (crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
          console.log("✅ Mtjree Webhook Signature Verified");
        } else {
          console.warn("⚠️ Mtjree Webhook Signature mismatch, proceeding with payload extraction");
        }
      } catch (sigErr) {
        console.warn("⚠️ Mtjree Webhook Signature validation error:", sigErr);
      }
    }

    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const searchParams = new URLSearchParams(rawText);
      body = Object.fromEntries(searchParams.entries());
    } else {
      try {
        body = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse webhook JSON:", e);
      }
    }
    console.log("🔔 Mtjree Webhook Parsed:", JSON.stringify(body));

    // Parse meta_data if present
    let metaDataObj: any = {};
    try {
      if (typeof body.meta_data === "string") {
        metaDataObj = JSON.parse(body.meta_data);
      } else if (typeof body.meta_data === "object" && body.meta_data) {
        metaDataObj = body.meta_data;
      }
    } catch {
      // ignore
    }

    // Extract booking_id (supporting both v2 and legacy schemas)
    const booking_id = body.order?.merchant_order_id ||
                       body.merchant_order_id ||
                       metaDataObj.booking_id ||
                       body.main_order_id ||
                       body.order_id ||
                       body.customer_id;

    // Extract success status (supporting v2 and legacy)
    const isSuccess = body.event_type === "payment.succeeded" ||
                      body.order?.status === "paid" ||
                      body.new_status === true ||
                      body.new_status === "true" ||
                      body.status === true ||
                      body.status === 1 ||
                      String(body.status).toLowerCase() === "paid" ||
                      String(body.status).toLowerCase() === "completed" ||
                      String(body.status).toLowerCase() === "success" ||
                      String(body.event || "").toLowerCase() === "operation.success";

    console.log("🔔 Webhook extracted - booking_id:", booking_id, "isSuccess:", isSuccess);

    if (!booking_id) {
      console.error("Webhook missing booking_id. Full payload:", JSON.stringify(body));
      return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(String(booking_id));

    let finalBookingId = booking_id;
    if (!isUUID) {
      if (metaDataObj.booking_id && uuidRegex.test(metaDataObj.booking_id)) {
        finalBookingId = metaDataObj.booking_id;
      } else {
        console.error("Cannot find valid booking UUID in webhook payload");
        return NextResponse.json({ error: "Invalid booking_id format" }, { status: 400 });
      }
    }

    // Update booking in Supabase (Race-condition safe)
    const paymentStatus = isSuccess ? "paid" : "failed";

    console.log("🔔 Updating booking:", finalBookingId, "payment_status:", paymentStatus);

    let query = supabase
      .from("bookings")
      .update({
        payment_status: paymentStatus,
      })
      .eq("id", finalBookingId);
      
    if (isSuccess) {
      query = query.neq("payment_status", "paid");
    }

    const { data: booking, error } = await query
      .select(`
        *,
        available_slots (
          slot_date,
          start_time,
          end_time,
          healers ( display_name )
        ),
        services ( name )
      `)
      .maybeSingle();

    if (error) {
      console.error("Error updating booking:", error);
      return NextResponse.json({ error: "Database update failed", details: error?.message }, { status: 500 });
    }

    if (!booking) {
      console.log("🔔 Webhook: Booking already paid or not found. Skipping duplicate email.");
      return NextResponse.json({ success: true, status: "already_paid_or_not_found", booking_id: finalBookingId });
    }

    console.log("🔔 Booking updated successfully.");

    // Emails are now sent by the admin when they confirm the booking.

    return NextResponse.json({ success: true, status: paymentStatus, booking_id: finalBookingId });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
