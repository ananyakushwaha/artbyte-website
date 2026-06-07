# Artbyte Innovations Backend Setup

This backend sends contact form messages and newsletter signups to:

`artbyteinnovations@gmail.com`

## 1. Install dependencies

```bash
npm install
```

## 2. Create your environment file

Copy `.env.example` to `.env`, then fill in the Gmail app password:

```env
PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=artbyteinnovations@gmail.com
SMTP_PASS=your_gmail_app_password_here
MAIL_TO=artbyteinnovations@gmail.com
```

Use a Gmail App Password, not your normal Gmail password. In Google Account settings, enable 2-Step Verification, then create an App Password for Mail.

## 3. Run the website with backend

```bash
npm start
```

Open:

`http://localhost:3000`

The contact form submits to `/api/contact`, and the newsletter form submits to `/api/newsletter`.
