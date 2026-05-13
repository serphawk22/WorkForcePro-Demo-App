import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    name,
    email,
    phone,
    company,
    teamSize,
    role,
    useCase,
    demoDate,
    timeSlot,
    problem,
  } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Always log the demo request for record-keeping
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 NEW DEMO REQUEST RECEIVED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Name:      ${name}`);
  console.log(`  Email:     ${email}`);
  console.log(`  Phone:     ${phone}`);
  console.log(`  Company:   ${company || "—"}`);
  console.log(`  Team Size: ${teamSize || "—"}`);
  console.log(`  Role:      ${role || "—"}`);
  console.log(`  Use Case:  ${useCase || "—"}`);
  console.log(`  Date:      ${demoDate || "—"}`);
  console.log(`  Time:      ${timeSlot || "—"}`);
  console.log(`  Problem:   ${problem || "—"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Attempt email — best effort (success shown to user regardless)
  if (process.env.DEMO_MAIL_USER && process.env.DEMO_MAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.DEMO_MAIL_USER,
          pass: process.env.DEMO_MAIL_PASS,
        },
      });

      const rows = [
        ["Name", name],
        ["Email", email],
        ["Phone", phone],
        ["Company", company || "—"],
        ["Team Size", teamSize || "—"],
        ["Role", role || "—"],
        ["Use Case", useCase || "—"],
        ["Preferred Date", demoDate || "—"],
        ["Preferred Time", timeSlot || "—"],
        ["Problem / Challenge", problem || "—"],
      ];

      const textBody = `New Demo Request Received:\n\n${rows
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}`;

      const htmlBody = `
        <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;background:#faf8f6;border-radius:12px;border:1px solid #e8e0f4;">
          <h2 style="margin:0 0 4px;color:#3d2054;">🚀 New Demo Request</h2>
          <p style="margin:0 0 20px;color:#7a6888;font-size:14px;">WorkForce Pro — someone wants a demo!</p>
          <table style="width:100%;border-collapse:collapse;">
            ${rows
              .map(
                ([k, v]) =>
                  `<tr style="border-bottom:1px solid #ebe5f0;">
                    <td style="padding:10px 8px;font-weight:600;color:#3d2054;font-size:13px;white-space:nowrap;vertical-align:top;">${k}</td>
                    <td style="padding:10px 8px;color:#1a0a2e;font-size:13px;">${v}</td>
                  </tr>`
              )
              .join("")}
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#9a8c9f;">This email was sent automatically from the WorkForce Pro demo request form.</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.DEMO_MAIL_USER,
        to: "saivarshadeoju@gmail.com",
        subject: "🚀 New Demo Request - WorkForce Pro",
        text: textBody,
        html: htmlBody,
      });

      console.log("[Demo Request] ✅ Email sent successfully");
    } catch (error) {
      console.error("[Demo Request] ⚠️ Email failed (request still logged):", error.message);
    }
  } else {
    console.log("[Demo Request] ℹ️ No DEMO_MAIL_USER/DEMO_MAIL_PASS configured — skipping email.");
  }

  // Always return success — the request is logged regardless
  return res.status(200).json({ success: true });
}
