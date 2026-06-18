import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isFirebaseConfigured, getFirebase } from "@/lib/firebase";

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

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env variable.");
    return NextResponse.json({ error: "Webhook secret configuration is missing" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as "bronze" | "silver" | "gold";

    if (userId && plan) {
      // Calculate subscription duration
      let durationDays = 30; // default Bronze
      if (plan === "silver") durationDays = 90;
      if (plan === "gold") durationDays = 365;

      const proExpiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;

      console.log(`[Stripe Webhook] Successful payment for User: ${userId}, Plan: ${plan}. Expires: ${new Date(proExpiresAt).toLocaleString()}`);

      // Update in Firestore if Firebase is active
      if (isFirebaseConfigured()) {
        try {
          const fb = await getFirebase();
          if (fb && fb.db) {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(
              doc(fb.db, "users", userId),
              {
                tier: plan,
                proExpiresAt,
              },
              { merge: true }
            );
            console.log(`[Stripe Webhook] Updated user profile in Firestore successfully.`);
          }
        } catch (dbErr) {
          console.error("Failed to update user profile in Firestore via webhook:", dbErr);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

