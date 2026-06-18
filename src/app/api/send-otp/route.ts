import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { localOtpStore } from "@/lib/otpStore";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000; // valid for 60 seconds (1 minute)

    // Store OTP in memory
    localOtpStore.set(email.toLowerCase(), { code, expiresAt });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"FormCraft Security" <${smtpUser}>`,
          to: email,
          subject: `${code} is your FormCraft verification code`,
          text: `Your verification code is: ${code}. It will expire in 60 seconds.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 8px;">
              <h2 style="color: #6366f1; text-align: center;">FormCraft Email Verification</h2>
              <p>Hello,</p>
              <p>Thank you for registering with FormCraft. Use the verification code below to complete your registration:</p>
              <div style="background-color: #f4f5f7; padding: 15px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e1b4b; margin: 20px 0;">
                ${code}
              </div>
              <p style="font-size: 12px; color: #6b7280;">This code is valid for 60 seconds. If you did not request this code, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.error("SMTP Mail Send Failed:", mailError);
        // We still return success: false if SMTP failed and it was the only channel
        return NextResponse.json({ error: "Failed to send email verification code. Please check SMTP configuration." }, { status: 500 });
      }
    } else {
      console.warn("SMTP configuration is missing. Unable to send verification email.");
      return NextResponse.json({ error: "Email configuration is incomplete. Contact administrator." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 });
  }
}
