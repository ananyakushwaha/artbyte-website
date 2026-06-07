const { escapeHtml, isEmail, sendMail } = require("./_mail");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed." });
    return;
  }

  try {
    const email = String((req.body || {}).email || "").trim();

    if (!isEmail(email)) {
      res.status(400).json({ message: "Please enter a valid email address." });
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

    res.status(200).json({ message: "You are subscribed. Thank you." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Email is not configured yet. Please contact us directly." });
  }
};
