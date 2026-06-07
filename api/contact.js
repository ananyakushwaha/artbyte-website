const { escapeHtml, isEmail, sendMail } = require("./_mail");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  try {
    const { name = "", email = "", company = "", service = "", message = "" } = req.body || {};
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim();
    const cleanCompany = String(company).trim();
    const cleanService = String(service).trim();
    const cleanMessage = String(message).trim();

    if (!cleanName || !cleanEmail || !cleanService || !cleanMessage) {
      res.status(400).json({ message: "Please fill in name, email, service, and message." });
      return;
    }

    if (!isEmail(cleanEmail)) {
      res.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    await sendMail({
      subject: `New website enquiry: ${cleanService}`,
      replyTo: cleanEmail,
      html: `
        <h2>New Artbyte Innovations enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
        <p><strong>Company:</strong> ${escapeHtml(cleanCompany || "Not provided")}</p>
        <p><strong>Service:</strong> ${escapeHtml(cleanService)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(cleanMessage).replace(/\n/g, "<br>")}</p>
      `,
    });

    res.status(200).json({ message: "Message sent. We will get back to you soon." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Email is not configured yet. Please contact us directly." });
  }
};
