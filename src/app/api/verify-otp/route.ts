import { NextResponse } from "next/server";
import { localOtpStore } from "@/lib/otpStore";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const key = email.toLowerCase();
    const otpData = localOtpStore.get(key);

    if (!otpData) {
      return NextResponse.json({ error: "No active verification code found. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > otpData.expiresAt) {
      localOtpStore.delete(key);
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    if (otpData.code !== code.trim()) {
      return NextResponse.json({ error: "Invalid verification code. Please check and try again." }, { status: 400 });
    }

    // Success! Remove the OTP code from store to prevent reuse
    localOtpStore.delete(key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: error.message || "Failed to verify code" }, { status: 500 });
  }
}
