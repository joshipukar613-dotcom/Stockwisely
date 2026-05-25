# Real Email Setup (SMTP)

This guide helps you enable real email sending for registration verification, password resets, and welcome emails.

## Overview
- Backend uses Nodemailer and reads SMTP settings from environment variables.
- When credentials are missing or placeholders, a mock transporter is used (emails logged in console).
- To send real emails, configure SMTP credentials and restart the backend.

## Gmail (Recommended: App Password)
Gmail no longer supports “Less secure apps”. Use an App Password:

1. Enable 2‑Step Verification on your Google account.
2. Create an App Password:
   - Google Account → Security → App passwords → Select “Mail” on “Windows Computer”.
   - Copy the generated 16‑character password (no spaces).
3. Update backend `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Stock Wisely
CLIENT_URL=http://localhost:3001
```

Notes:
- Use `SMTP_PORT=465` with `secure=true` only if your network requires it; default is `587` with STARTTLS.
- The code auto-detects 465 as `secure` and other ports as non-secure. 

## Other Providers (optional)
You can use any SMTP provider:
- Mailgun: `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`
- SendGrid: `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`, `SMTP_PASS=<api-key>`
- Outlook/Office365: `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`

## Restart Backend
After updating `.env`:
- Stop the running backend and start it again (`npm start` in `backend`).
- On startup and first email send, logs will show whether real SMTP is used.

## Troubleshooting
- 535 Authentication failed: Check `SMTP_USER/PASS` and App Password.
- Timeouts: Verify firewall/network allows SMTP ports (587/465).
- Emails landing in Spam: Set `FROM_NAME` and keep content clean; consider DKIM/SPF if using a custom domain.
- Links incorrect: Ensure `CLIENT_URL` matches your frontend URL.

## What the Backend Uses
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` to create the transporter.
- `FROM_EMAIL`, `FROM_NAME` for the email sender identity.
- `CLIENT_URL` for password reset and post‑verify links.

Once configured, registration will send a real verification code email, and verification will send a welcome email.