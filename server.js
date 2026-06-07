const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MAIL_TO = process.env.MAIL_TO || "artbyteinnovations@gmail.com";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const rateLimits = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

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

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
}

function checkRateLimit(req, action) {
  const key = `${getClientIp(req)}:${action}`;
  const now = Date.now();
  const existing = rateLimits.get(key) || { count: 0, start: now };

  if (now - existing.start > 10 * 60 * 1000) {
    rateLimits.set(key, { count: 1, start: now });
    return true;
  }

  existing.count += 1;
  rateLimits.set(key, existing);
  return existing.count <= 5;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
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

async function handleContact(req, res) {
  if (!checkRateLimit(req, "contact")) {
    sendJson(res, 429, { message: "Too many messages. Please try again later." });
    return;
  }

  const data = await readRequestBody(req);
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const company = String(data.company || "").trim();
  const service = String(data.service || "").trim();
  const message = String(data.message || "").trim();

  if (!name || !email || !service || !message) {
    sendJson(res, 400, { message: "Please fill in name, email, service, and message." });
    return;
  }

  if (!isEmail(email)) {
    sendJson(res, 400, { message: "Please enter a valid email address." });
    return;
  }

  await sendMail({
    subject: `New website enquiry: ${service}`,
    replyTo: email,
    html: `
      <h2>New Artbyte Innovations enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p>
      <p><strong>Service:</strong> ${escapeHtml(service)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  });

  sendJson(res, 200, { message: "Message sent. We will get back to you soon." });
}

async function handleNewsletter(req, res) {
  if (!checkRateLimit(req, "newsletter")) {
    sendJson(res, 429, { message: "Too many signups. Please try again later." });
    return;
  }

  const data = await readRequestBody(req);
  const email = String(data.email || "").trim();

  if (!isEmail(email)) {
    sendJson(res, 400, { message: "Please enter a valid email address." });
    return;
  }

  await sendMail({
    subject: "New newsletter signup",
    replyTo: email,
    html: `
      <h2>New Artbyte Innovations newsletter signup</h2>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    `,
  });

  sendJson(res, 200, { message: "You are signed up. Thank you." });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(ROOT, requestedFile);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/contact") {
      await handleContact(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/newsletter") {
      await handleNewsletter(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { message: "Method not allowed." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { message: "Email is not configured yet. Please contact us directly." });
  }
});

server.listen(PORT, () => {
  console.log(`Artbyte Innovations website running at http://localhost:${PORT}`);
});
