const nodemailer = require("nodemailer");

const MAIL_TO = process.env.MAIL_TO || "artbyteinnovations@gmail.com";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function createTransporter() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing email settings: ${missing.join(", ")}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ subject, html, replyTo }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Artbyte Website" <${process.env.SMTP_USER}>`,
    to: MAIL_TO,
    replyTo,
    subject,
    html,
  });
}

module.exports = {
  escapeHtml,
  isEmail,
  sendMail,
};
