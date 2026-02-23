/**
 * Send OTP email. If SMTP is not configured (see env vars), logs OTP to console (for development).
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM to send real emails.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<{ sent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "noreply@disposable-admin.com";

  if (!host || !user || !pass) {
    console.log("[DEV] OTP email not configured. OTP for", to, ":", otp);
    return { sent: true };
  }

  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to,
      subject: "Your password reset OTP - Disposable Admin",
      text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
    return { sent: true };
  } catch (e) {
    console.error("Send OTP email error:", e);
    return { sent: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}
