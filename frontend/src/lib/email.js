import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD env vars are not set');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Send an OTP verification email.
 *
 * @param {string} to    - Recipient email address
 * @param {string} otp   - The OTP code
 * @param {string} name  - Recipient name
 */
export async function sendOtpEmail(to, otp, name = 'User') {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"VoiceAI Platform" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#fff;border-radius:12px">
        <h2 style="margin:0 0 8px;font-size:22px">Hi ${name},</h2>
        <p style="color:#9ca3af;margin:0 0 24px">Use the code below to verify your email. It expires in 10 minutes.</p>
        <div style="background:#1a1f2e;border-radius:10px;padding:24px;text-align:center;letter-spacing:8px;font-size:36px;font-weight:700;color:#2b6cee">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
