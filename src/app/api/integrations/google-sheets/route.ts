import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scriptUrl, formTitle, responseData, submittedAt, submitterEmail } = body;

    if (!scriptUrl) {
      return NextResponse.json({ error: "Missing Google Apps Script Web App URL" }, { status: 400 });
    }

    const payload = {
      formTitle,
      responseData,
      submittedAt: submittedAt || Date.now(),
      submitterEmail: submitterEmail || "Anonymous",
    };

    // Forward request to Google Apps Script Web App
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Google Sheets Script error: ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Google Sheets integration error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync with Google Sheets" }, { status: 500 });
  }
}
