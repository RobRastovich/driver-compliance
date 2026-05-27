import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.APP_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
})

const FROM_EMAIL = process.env.SES_FROM_EMAIL!
const APP_URL = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export async function sendPasswordResetEmail(
  toEmail: string,
  firstName: string,
  token: string,
  type: 'driver' | 'company'
): Promise<void> {
  const path = type === 'driver' ? '/reset-password' : '/company/reset-password'
  const resetUrl = `${APP_URL}${path}?token=${token}`
  const portalLabel = type === 'driver' ? 'Driver Portal' : 'Company Portal'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr>
          <td style="background:#0284c7;padding:24px 32px;text-align:center">
            <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-weight:700;font-size:18px;padding:8px 16px;border-radius:8px">DC</span>
            <p style="color:#bae6fd;margin:8px 0 0;font-size:13px">Driver Compliance — ${portalLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827">Reset your password</h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Hi ${firstName}, we received a request to reset the password for your account.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#0284c7;color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">Reset Password</a>
            <p style="margin:24px 0 8px;color:#6b7280;font-size:13px">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="margin:0;color:#9ca3af;font-size:12px;word-break:break-all">Or copy this link: ${resetUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">Driver Compliance Portal &mdash; This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `Hi ${firstName},\n\nWe received a request to reset your Driver Compliance password.\n\nReset your password here (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nDriver Compliance Team`

  await ses.send(new SendEmailCommand({
    Destination: { ToAddresses: [toEmail] },
    Source: FROM_EMAIL,
    Message: {
      Subject: { Data: 'Reset your Driver Compliance password', Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' },
      },
    },
  }))
}
