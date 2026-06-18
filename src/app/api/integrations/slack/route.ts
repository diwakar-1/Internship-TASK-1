import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, channel, formTitle, responseData, isTest, submittedAt, submitterEmail } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing webhook URL" }, { status: 400 });
    }

    let payload: any = {};

    if (isTest) {
      payload = {
        channel: channel || "#general",
        text: "🚨 *Test Notification from FormCraft* 🚨\nYour Slack integration is connected and working successfully!",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "FormCraft Integration Test",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Hello! You have successfully connected *Slack Alerts* for your FormCraft account.\n\n*Target Channel:* \`${channel}\`\n*Status:* Connected & Active ✅`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Sent on ${new Date().toLocaleString()}`
              }
            ]
          }
        ]
      };
    } else {
      // Build response fields formatted as bullet points or block sections
      const fieldsText = Object.entries(responseData || {})
        .map(([key, val]) => `• *${key}*: ${Array.isArray(val) ? val.join(", ") : val}`)
        .join("\n");

      payload = {
        channel: channel || "#general",
        text: `New submission received for form "${formTitle}"`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `New Form Submission: ${formTitle}`,
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Date & Time:*\n${new Date(submittedAt || Date.now()).toLocaleString()}`
              },
              {
                type: "mrkdwn",
                text: `*Submitter Email:*\n${submitterEmail || "Anonymous"}`
              }
            ]
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: fieldsText ? `*Response Details:*\n${fieldsText}` : "_No data submitted._"
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Powered by *FormCraft*"
              }
            ]
          }
        ]
      };
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Slack API error: ${errorText}` }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Slack alert error:", error);
    return NextResponse.json({ error: error.message || "Failed to send Slack alert" }, { status: 500 });
  }
}
