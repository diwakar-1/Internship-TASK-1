import { NextResponse } from "next/server";
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe Secret Key is missing in your .env.local file. Please add STRIPE_SECRET_KEY to proceed.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-06-20" as any,
    });
  }
  return stripeInstance;
}

export async function GET(req: Request) {
  try {
    const stripe = getStripe();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id query parameter" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const plan = session.metadata?.plan || "free";
      const userId = session.metadata?.userId;

      let durationDays = 30; // default Bronze
      if (plan === "silver") durationDays = 90;
      if (plan === "gold") durationDays = 365;

      const proExpiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

      return NextResponse.json({
        success: true,
        paymentStatus: session.payment_status,
        plan,
        userId,
        proExpiresAt,
      });
    }

    return NextResponse.json({
      success: false,
      paymentStatus: session.payment_status,
    });
  } catch (error: any) {
    console.error("Stripe Session Verification Error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify Stripe session" }, { status: 500 });
  }
}
