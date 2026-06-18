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

const PLANS = {
  bronze: {
    name: "FormCraft Bronze Pass (1 Month)",
    amount: 19900, // ₹199.00 (in paise)
  },
  silver: {
    name: "FormCraft Silver Pass (3 Months)",
    amount: 49900, // ₹499.00 (in paise)
  },
  gold: {
    name: "FormCraft Gold VIP Pass (1 Year)",
    amount: 99900, // ₹999.00 (in paise)
  },
};

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { plan, userId, email } = await req.json();

    if (!plan || !userId || !email) {
      return NextResponse.json({ error: "Missing required parameters: plan, userId, email" }, { status: 400 });
    }

    const planInfo = PLANS[plan as keyof typeof PLANS];
    if (!planInfo) {
      return NextResponse.json({ error: "Invalid plan type. Must be bronze, silver, or gold" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create a checkout session using one-time payment mode (allows UPI payments)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "upi"],
      mode: "payment",
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: planInfo.name,
              description: `One-time payment for premium access key. Starts immediately.`,
            },
            unit_amount: planInfo.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
      },
      success_url: `${appUrl}/forms?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/forms?checkout_cancel=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Session Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
